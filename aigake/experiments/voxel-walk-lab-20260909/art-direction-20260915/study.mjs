import * as THREE from 'three';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {contentBlueprint} from '../content/blueprints.mjs';
import {REGIONS} from '../content/catalog.mjs';
import {COLORS} from '../voxels.mjs';
import {countsAt,hash,phaseAt} from '../model.mjs';

const faces=[
 {n:[1,0,0],q:[[1,0,0],[1,1,0],[1,1,1],[1,0,1]],shade:.97},
 {n:[-1,0,0],q:[[0,0,1],[0,1,1],[0,1,0],[0,0,0]],shade:.94},
 {n:[0,1,0],q:[[0,1,1],[1,1,1],[1,1,0],[0,1,0]],shade:1},
 {n:[0,-1,0],q:[[0,0,0],[1,0,0],[1,0,1],[0,0,1]],shade:.86},
 {n:[0,0,1],q:[[1,0,1],[1,1,1],[0,1,1],[0,0,1]],shade:.98},
 {n:[0,0,-1],q:[[0,0,0],[0,1,0],[1,1,0],[1,0,0]],shade:.93}
];
const hex=c=>'#'+c.getHexString(),mix=(a,b,t)=>hex(new THREE.Color(a).lerp(new THREE.Color(b),t));
function mappedCells(bp,p,mode){
  if(mode==='current')return bp.cells;
  const C=p.palette,target={stone:mix(C.ground,C.wall,.45),floor:mix(C.ground,C.wall,.28),wall:C.wall,trim:mix(C.wall,'#fff7e2',.25),wood:C.wood,woodLight:mix(C.wood,C.wall,.30),dark:C.shadow,glass:C.glass,light:C.accent,sage:C.roof,clay:C.roof,blue:C.roof,leaf:C.leaf,flower:C.accent,roof:C.roof,water:C.water,ground:C.ground,accent:C.accent};
  const source={...COLORS,...REGIONS[p.id]},map=new Map();for(const[k,v]of Object.entries(source))if(target[k])map.set(v,target[k]);
  return bp.cells.map(c=>({...c,color:map.get(c.color)||c.color}));
}
export function geometry(cells,mode){
  const lookup=new Set(cells.map(c=>[c.x,c.y,c.z].join(','))),positions=[],normals=[],colors=[];
  for(const c of cells){const color=new THREE.Color(c.color).multiplyScalar(mode==='current'?.94+hash(741,c.x,c.y,c.z)*.12:.99+hash(741,Math.floor(c.x/5),Math.floor(c.y/5),Math.floor(c.z/5))*.02);
    for(const f of faces){if(lookup.has([c.x+f.n[0],c.y+f.n[1],c.z+f.n[2]].join(',')))continue;for(const i of [0,1,2,0,2,3]){const q=f.q[i];positions.push((c.x+q[0]-.5)*.1,(c.y+q[1]-.5)*.1,(c.z+q[2]-.5)*.1);normals.push(...f.n);colors.push(color.r*f.shade,color.g*f.shade,color.b*f.shade);}}
  }
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));g.setAttribute('normal',new THREE.Float32BufferAttribute(normals,3));g.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));g.computeBoundingSphere();return g;
}
export function createStudy(host){
  const renderer=new THREE.WebGLRenderer({antialias:true,preserveDrawingBuffer:true});renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFShadowMap;host.appendChild(renderer.domElement);
  const scene=new THREE.Scene(),camera=new THREE.OrthographicCamera(-5,5,5,-5,.1,100),controls=new OrbitControls(camera,renderer.domElement);controls.enablePan=false;controls.enableDamping=false;controls.minPolarAngle=.15;controls.maxPolarAngle=1.45;controls.minZoom=.45;controls.maxZoom=5;
  const hemi=new THREE.HemisphereLight('#edf3ee','#768374',1.8);scene.add(hemi);
  const sun=new THREE.DirectionalLight('#fff1d3',2.8);sun.position.set(-9,15,11);sun.castShadow=true;sun.shadow.mapSize.set(1024,1024);Object.assign(sun.shadow.camera,{left:-9,right:9,top:9,bottom:-9,near:.1,far:45});sun.shadow.normalBias=.016;sun.shadow.bias=-.00025;scene.add(sun);
  const material=new THREE.MeshStandardMaterial({vertexColors:true,roughness:.92,metalness:0});
  const ground=new THREE.Mesh(new THREE.PlaneGeometry(100,100),new THREE.MeshStandardMaterial({color:'#e9ede5',roughness:1}));ground.rotation.x=-Math.PI/2;ground.receiveShadow=true;scene.add(ground);
  let profile,bp,shown,mode='proposal',percent=100,mesh,viewName='front';
  function lights(){if(!profile)return;const night=profile.light==='night',dusk=profile.light==='dusk',sunset=profile.light==='sunset',bg=night?'#536270':dusk?'#c4c9d5':sunset?'#eae4da':'#e9ede5';scene.background=new THREE.Color(bg);ground.material.color.set(bg);hemi.color.set(night||dusk?'#c8d7ed':'#edf3ee');hemi.intensity=night?1.35:1.8;sun.color.set(sunset?'#f2cb9b':night?'#ccd6e5':'#fff1d3');sun.intensity=night?.8:dusk?1.8:2.8;renderer.toneMappingExposure=mode==='current'?1.17:1.02;}
  function render(){renderer.render(scene,camera);}
  function draw(){
    if(mesh){scene.remove(mesh);mesh.geometry.dispose();}const counts=countsAt(bp.counts,percent*48),seen=[0,0,0,0];shown=mappedCells(bp,profile,mode).filter(c=>seen[c.phase]++<counts[c.phase]);
    mesh=new THREE.Mesh(geometry(shown,mode),material);mesh.castShadow=true;mesh.receiveShadow=true;scene.add(mesh);render();
  }
  function view(name='front'){
    if(!bp)return;viewName=name;const b=bp.bounds,min=new THREE.Vector3(...b.min.map(v=>(v-.5)*.1)),max=new THREE.Vector3(...b.max.map(v=>(v+.5)*.1));controls.target.copy(min).add(max).multiplyScalar(.5);
    const offset=name==='back'?[-16,15,-22]:name==='top'?[.1,25,.1]:[16,15,22];camera.position.copy(controls.target).add(new THREE.Vector3(...offset));camera.zoom=1;camera.lookAt(controls.target);controls.update();camera.updateMatrixWorld(true);camera.updateProjectionMatrix();
    let extent=0;for(const x of [min.x,max.x])for(const y of [min.y,max.y])for(const z of [min.z,max.z]){const p=new THREE.Vector3(x,y,z).project(camera);extent=Math.max(extent,Math.abs(p.x),Math.abs(p.y));}camera.zoom=Math.min(4,1/(Math.max(.1,extent)*1.20));camera.updateProjectionMatrix();render();
  }
  function resize(){const r=host.getBoundingClientRect();if(!r.width||!r.height)return;renderer.setSize(r.width,r.height);const a=r.width/r.height;camera.left=-4.6*a;camera.right=4.6*a;camera.top=4.6;camera.bottom=-4.6;camera.updateProjectionMatrix();if(bp)view(viewName);else render();}
  function show(p){profile=p;bp=contentBlueprint(p.building,741);ground.position.y=(bp.bounds.min[1]-.5)*.1;percent=100;lights();draw();view('front');return bp;}
  controls.addEventListener('change',render);new ResizeObserver(resize).observe(host);resize();
  return{show,view,material(value){mode=value;lights();draw();},progress(value){percent=Math.max(0,Math.min(100,Number(value)));draw();return percent===100?'完成':phaseAt(percent*48).name;},stats:()=>({region:profile?.id,building:profile?.building,mode,percent,cells:shown?.length||0,total:bp?.cells.length||0,phases:bp?.counts,positionChecksum:bp?.cells.reduce((n,c)=>n+c.x*7+c.y*11+c.z*13,0),drawCalls:renderer.info.render.calls,geometries:renderer.info.memory.geometries}),snapshot:()=>{render();return renderer.domElement.toDataURL('image/png');}};
}
