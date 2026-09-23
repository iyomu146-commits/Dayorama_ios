import * as THREE from 'three';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {RoundedBoxGeometry} from 'three/addons/geometries/RoundedBoxGeometry.js';
import {CELL,COLORS,partVisible,scheduleParts,visibleCells,cellKey} from './design.mjs';
const colorCache=new Map();
function mergeGeometries(geometries){const g=new THREE.BufferGeometry();for(const key of ['position','normal','color','surface']){const first=geometries[0].attributes[key],all=new Float32Array(geometries.reduce((n,x)=>n+x.attributes[key].array.length,0));let offset=0;for(const item of geometries){all.set(item.attributes[key].array,offset);offset+=item.attributes[key].array.length;}g.setAttribute(key,new THREE.BufferAttribute(all,first.itemSize));}g.computeBoundingSphere();return g;}
function color(name){if(!colorCache.has(name))colorCache.set(name,new THREE.Color(COLORS[name]));return colorCache.get(name);}
export function partGeometry(p){
 let g;const [w,h,d]=p.s;
 if(p.shape==='box')g=p.bevel?new RoundedBoxGeometry(w,h,d,2,Math.min(p.bevel,w*.2,h*.2,d*.2)):new THREE.BoxGeometry(w,h,d);
 else if(p.shape==='ellipsoid'){g=new THREE.IcosahedronGeometry(1,p.foliage?1:2);g.scale(w,h,d);}
 else if(p.shape==='cylinder'){g=new THREE.CylinderGeometry(1,p.taper??1,h,16);g.scale(w,1,d);}
 else if(p.shape==='segment'){
  const a=new THREE.Vector3(...p.p),b=new THREE.Vector3(...p.end),delta=b.clone().sub(a),len=delta.length();g=new THREE.CylinderGeometry(w*(p.taper??1),w,len,8);g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0,1,0),delta.normalize()));g.translate(...a.add(b).multiplyScalar(.5).toArray());return g;
 }else if(p.shape==='hip'){
  const t=p.thickness,r=p.ridge,V=[[-w,0,-d],[w,0,-d],[w,0,d],[-w,0,d],[-r,h,0],[r,h,0]],faces=[[0,4,5,1],[3,2,5,4],[0,3,4],[1,5,2]],pos=[];
  function tri(a,b,c){pos.push(...a,...b,...c);}
  for(const f of faces){for(let i=1;i<f.length-1;i++){tri(V[f[0]],V[f[i]],V[f[i+1]]);tri(V[f[0]].map((v,k)=>k===1?v-t:v),V[f[i+1]].map((v,k)=>k===1?v-t:v),V[f[i]].map((v,k)=>k===1?v-t:v));}}
  for(let i=0;i<4;i++){const a=V[i],b=V[(i+1)%4],aa=a.map((v,k)=>k===1?v-t:v),bb=b.map((v,k)=>k===1?v-t:v);tri(a,b,bb);tri(a,bb,aa);}
  g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));g.computeVertexNormals();
 }
 g.applyQuaternion(new THREE.Quaternion().setFromEuler(new THREE.Euler(...p.r)));g.translate(...p.p);return g;
}
function decorate(g,p){
 if(g.index){const old=g;g=g.toNonIndexed();old.dispose();}
 if(!g.attributes.normal)g.computeVertexNormals();
 g.deleteAttribute('uv');const n=g.attributes.position.count,C=new Float32Array(n*3),M=new Float32Array(n*2),c=color(p.color),rough=p.color.startsWith('glass')?.35:p.color.startsWith('roof')?.64:.9;
 for(let i=0;i<n;i++){C.set([c.r,c.g,c.b],i*3);M.set([p.emission?1:0,rough],i*2);}
 g.setAttribute('color',new THREE.BufferAttribute(C,3));g.setAttribute('surface',new THREE.BufferAttribute(M,2));return g;
}
const faceDefs=[{n:[1,0,0],v:[[1,0,0],[1,1,0],[1,1,1],[1,0,1]]},{n:[-1,0,0],v:[[0,0,1],[0,1,1],[0,1,0],[0,0,0]]},{n:[0,1,0],v:[[0,1,1],[1,1,1],[1,1,0],[0,1,0]]},{n:[0,-1,0],v:[[0,0,0],[1,0,0],[1,0,1],[0,0,1]]},{n:[0,0,1],v:[[1,0,1],[1,1,1],[0,1,1],[0,0,1]]},{n:[0,0,-1],v:[[0,0,0],[0,1,0],[1,1,0],[1,0,0]]}];
export function voxelGeometry(cells){
 const map=new Map(cells.map(c=>[cellKey(c),c])),P=[],N=[],C=[],M=[],faces=[];
 for(const c of cells){const base=color(c.color);for(const f of faceDefs){const [nx,ny,nz]=f.n;if(map.has(`${c.x+nx},${c.y+ny},${c.z+nz}`))continue;
  // Per-corner local occupancy creates real contact shading, not a painted image.
  const axes=nx?[1,2]:ny?[0,2]:[0,1],origin=[c.x,c.y,c.z],cornerColors=[];
  for(const v of f.v){const sign=axes.map(a=>v[a]===0?-1:1),side=axes.map((axis,i)=>{const q=origin.map((o,j)=>o+f.n[j]);q[axis]+=sign[i];return map.has(q.join(','));}),q=origin.map((o,j)=>o+f.n[j]);axes.forEach((axis,i)=>q[axis]+=sign[i]);const ao=side[0]&&side[1]?3:Number(side[0])+Number(side[1])+Number(map.has(q.join(',')));cornerColors.push(1-ao*.095);}
  for(const i of [0,1,2,0,2,3]){const v=f.v[i];P.push((c.x+v[0])*CELL,(c.y+v[1])*CELL,(c.z+v[2])*CELL);N.push(...f.n);const a=cornerColors[i];C.push(base.r*a,base.g*a,base.b*a);M.push(c.emission?1:0,c.color.startsWith('glass')?.35:c.color.startsWith('roof')?.64:.9);}
  faces.push({cell:c,normal:f.n});
 }}
 const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(P,3));g.setAttribute('normal',new THREE.Float32BufferAttribute(N,3));g.setAttribute('color',new THREE.Float32BufferAttribute(C,3));g.setAttribute('surface',new THREE.Float32BufferAttribute(M,2));g.computeBoundingSphere();return{geometry:g,faces};
}
export function createView(host,mode,{onCamera,onPick,onStats}={}){
 const renderer=new THREE.WebGLRenderer({antialias:true,preserveDrawingBuffer:true});renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.05;renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFShadowMap;renderer.shadowMap.autoUpdate=false;host.append(renderer.domElement);
 const scene=new THREE.Scene(),background=new THREE.Color('#e7e7dd');scene.background=background;
 const camera=new THREE.OrthographicCamera(-8,8,7,-7,.1,90);camera.position.set(12,9,16);
 const controls=new OrbitControls(camera,renderer.domElement);controls.target.set(-.6,2.6,.1);controls.enableDamping=true;controls.enablePan=false;controls.minZoom=.65;controls.maxZoom=4;controls.maxPolarAngle=1.47;controls.minPolarAngle=.14;controls.update();
 const hemi=new THREE.HemisphereLight('#e8f1f3','#958765',1.75),sun=new THREE.DirectionalLight('#ffe8cb',3.1),fill=new THREE.DirectionalLight('#bfd4e1',.65);
 sun.position.set(-5,11,9);sun.castShadow=true;sun.shadow.mapSize.set(2048,2048);Object.assign(sun.shadow.camera,{left:-9,right:9,top:9,bottom:-9,near:.5,far:38});sun.shadow.normalBias=.018;sun.shadow.bias=-.00013;sun.shadow.radius=4;fill.position.set(8,4,-8);scene.add(hemi,sun,fill);
 const floor=new THREE.Mesh(new THREE.PlaneGeometry(100,100),new THREE.MeshStandardMaterial({color:'#e7e7dd',roughness:1}));floor.rotation.x=-Math.PI/2;floor.position.y=-.38;floor.receiveShadow=true;scene.add(floor);
 const uniforms={night:{value:0}},material=new THREE.MeshStandardMaterial({vertexColors:true,roughness:.9,side:THREE.DoubleSide});
 material.onBeforeCompile=shader=>{
  shader.uniforms.uNight=uniforms.night;
  shader.vertexShader='attribute vec2 surface; varying vec2 vSurface; varying vec3 vLocal;\n'+shader.vertexShader;
  shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nvSurface=surface; vLocal=position;');
  shader.fragmentShader='uniform float uNight; varying vec2 vSurface; varying vec3 vLocal;\n'+shader.fragmentShader;
  shader.fragmentShader=shader.fragmentShader.replace('#include <color_fragment>','#include <color_fragment>\nfloat grain=sin(vLocal.x*81.7+sin(vLocal.z*38.1))*sin(vLocal.y*113.7+vLocal.z*19.0); diffuseColor.rgb*=1.0+grain*0.019;');
  shader.fragmentShader=shader.fragmentShader.replace('#include <roughnessmap_fragment>','#include <roughnessmap_fragment>\nroughnessFactor=vSurface.y;');
  shader.fragmentShader=shader.fragmentShader.replace('#include <emissivemap_fragment>','#include <emissivemap_fragment>\ntotalEmissiveRadiance += vec3(1.0,0.66,0.27)*vSurface.x*uNight*0.8;');
 };
 const lamp=new THREE.PointLight('#ffd09c',0,7,2);lamp.position.set(1.5,2.3,2);scene.add(lamp);
 const root=new THREE.Group();scene.add(root);root.userData.sculptRuntime={mode,parts:[],editable:mode==='voxel'};
 let design,parts=[],cells=[],mesh,faces=[],ranges=[],steps=20000,focus='all',explode=false,syncing=false,dirty=true,lastFrame=0,edit=false,pointerDown;
 const raycaster=new THREE.Raycaster(),pointer=new THREE.Vector2(),hover=new THREE.Mesh(new THREE.BoxGeometry(CELL*1.025,CELL*1.025,CELL*1.025),new THREE.MeshBasicMaterial({color:'#ffffff',transparent:true,opacity:.5,depthTest:false,wireframe:true}));hover.renderOrder=5;hover.visible=false;scene.add(hover);
 function clear(){if(mesh){root.remove(mesh);mesh.geometry.dispose();mesh=null;}}
 function allowed(p){
  if(focus==='all')return true;
  if(focus==='cafe')return ['cafe','terrace'].includes(p.group);
  if(focus==='plants'){const x=p.p?.[0]??(p.x+.5)*CELL,z=p.p?.[2]??(p.z+.5)*CELL;return p.group==='plants'&&Math.hypot(x-1.48,z-1.95)<.65;}
  return p.group===focus;
 }
 function rebuild(){
  clear();ranges=[];
  if(mode==='voxel'){
   const shown=visibleCells(cells,steps).filter(allowed),v=voxelGeometry(shown);mesh=new THREE.Mesh(v.geometry,material);faces=v.faces;
  }else{
   const geoms=[];let offset=0;
   for(const p of parts){if(!partVisible(p,steps)||!allowed(p))continue;const g=decorate(partGeometry(p),p);
    if(explode){const center=new THREE.Vector3();g.computeBoundingBox();g.boundingBox.getCenter(center);center.sub(new THREE.Vector3(-.7,2,-.5)).multiplyScalar(.32);g.translate(...center.toArray());}
    const count=g.attributes.position.count/3;ranges.push({start:offset,end:offset+count,part:p});offset+=count;geoms.push(g);
   }
   if(!geoms.length){dirty=true;return;}
   const merged=mergeGeometries(geoms);geoms.forEach(g=>g.dispose());mesh=new THREE.Mesh(merged,material);
  }
  mesh.castShadow=true;mesh.receiveShadow=true;mesh.name=mode+'-visible-surface';root.add(mesh);root.userData.sculptRuntime.parts=parts.map(p=>({id:p.id,name:p.name,group:p.group,phase:p.phase}));dirty=true;
 }
 function resize(){const r=host.getBoundingClientRect();if(!r.width||!r.height)return;renderer.setSize(r.width,r.height,false);const aspect=r.width/r.height,[height,width]={all:[5.6,7.5],cafe:[3.8,4.8],tree:[3.8,2.7],bench:[1.1,1.55],plants:[.9,.85]}[focus],half=Math.max(height,width/aspect);camera.left=-half*aspect;camera.right=half*aspect;camera.top=half;camera.bottom=-half;camera.updateProjectionMatrix();dirty=true;}
 const observer=new ResizeObserver(resize);observer.observe(host);
 controls.addEventListener('change',()=>{dirty=true;if(!syncing)onCamera?.(getCamera());});
 const getCamera=()=>({position:camera.position.toArray(),target:controls.target.toArray(),zoom:camera.zoom});
 function setCamera(p){syncing=true;camera.position.fromArray(p.position);controls.target.fromArray(p.target);camera.zoom=p.zoom;camera.updateProjectionMatrix();controls.update();syncing=false;dirty=true;}
 function pick(event){if(!mesh)return null;const r=renderer.domElement.getBoundingClientRect();pointer.set((event.clientX-r.left)/r.width*2-1,-(event.clientY-r.top)/r.height*2+1);raycaster.setFromCamera(pointer,camera);const hit=raycaster.intersectObject(mesh)[0];if(!hit)return null;
  return mode==='voxel'?{...faces[Math.floor(hit.faceIndex/2)],point:hit.point}:ranges.find(r=>hit.faceIndex>=r.start&&hit.faceIndex<r.end);
 }
 renderer.domElement.addEventListener('pointerdown',e=>pointerDown={x:e.clientX,y:e.clientY,time:performance.now()});
 renderer.domElement.addEventListener('pointermove',e=>{if(!edit)return;const hit=pick(e);if(hit?.cell){hover.position.set((hit.cell.x+.5)*CELL,(hit.cell.y+.5)*CELL,(hit.cell.z+.5)*CELL);hover.visible=true;dirty=true;}else hover.visible=false;});
 renderer.domElement.addEventListener('pointerleave',()=>{hover.visible=false;dirty=true;});
 renderer.domElement.addEventListener('pointerup',e=>{if(!pointerDown||Math.hypot(e.clientX-pointerDown.x,e.clientY-pointerDown.y)>5)return;const hit=pick(e);if(hit)onPick?.(hit,edit);pointerDown=null;});
 renderer.setAnimationLoop(now=>{
  if(document.hidden)return;controls.update();if(!dirty&&now-lastFrame<500)return;renderer.shadowMap.needsUpdate=dirty;renderer.render(scene,camera);lastFrame=now;dirty=false;
  onStats?.({triangles:mesh?mesh.geometry.attributes.position.count/3:0,draws:renderer.info.render.calls,cells:cells.length,parts:parts.length});
 });
 return{
  set(d,c){design=d;parts=scheduleParts(d.parts);cells=c;rebuild();resize();},
  progress(n){steps=n;rebuild();},
  cells(c){cells=c;rebuild();},
  focus(value){focus=value;controls.target.set(...(value==='tree'?[-4.9,3.1,-1.2]:value==='bench'?[-3.6,.85,2.1]:value==='plants'?[1.48,.8,1.95]:value==='cafe'?[-.3,2,-.2]:[-.6,2.6,.1]));camera.zoom=1;floor.position.y=['bench','plants'].includes(value)?.15:value==='tree'?-.03:-.38;rebuild();resize();controls.update();dirty=true;},
  night(enabled){uniforms.night.value=enabled?1:0;scene.background.set(enabled?'#253446':'#e7e7dd');floor.material.color.set(enabled?'#253446':'#e7e7dd');hemi.intensity=enabled?.65:1.75;sun.intensity=enabled?.65:3.1;sun.color.set(enabled?'#abc5ee':'#ffe8cb');fill.intensity=enabled?.2:.65;lamp.intensity=enabled?9:0;dirty=true;},
  exploded(value){explode=value;rebuild();},
  edit(value){edit=value;controls.enableRotate=!value;hover.visible=false;dirty=true;renderer.domElement.style.cursor=value?'crosshair':'grab';},
  angle(value){const t=controls.target,dir=value==='back'?[-12,8,-16]:value==='front'?[0,5,20]:value==='top'?[.001,20,0]:[12,9,16];camera.position.copy(t).add(new THREE.Vector3(...dir));camera.zoom=1;controls.update();dirty=true;},
  getCamera,setCamera,
  snapshot(){hover.visible=false;renderer.shadowMap.needsUpdate=true;renderer.render(scene,camera);return renderer.domElement.toDataURL('image/png');},
  get manifest(){return parts.map(p=>({id:p.id,name:p.name,group:p.group,phase:p.phase}));}
 };
}
