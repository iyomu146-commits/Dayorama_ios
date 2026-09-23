import * as THREE from 'three';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {CELL} from './design.mjs';
import {WORKBENCH_SIZE,workbenchBounds,layerCell} from './density-core.mjs';
export const PLOTS=[[-13,-6],[0,-6],[13,-6],[-6.5,6],[6.5,6]];
function geometry(m){const g=new THREE.BufferGeometry();for(const [key,data,size] of [['position',m.positions,3],['normal',m.normals,3],['color',m.colors,3],['surface',m.surfaces,2]])g.setAttribute(key,new THREE.BufferAttribute(data,size));g.computeBoundingSphere();return g;}
function merged(items){const list=items.filter(i=>i.mesh).map(i=>i.mesh),m={};for(const name of ['positions','normals','colors','surfaces']){m[name]=new Float32Array(list.reduce((s,v)=>s+v[name].length,0));let offset=0;for(const g of list){m[name].set(g[name],offset);offset+=g[name].length;}}return geometry(m);}
function residents(scene){
 const count=12,parts=9,mesh=new THREE.InstancedMesh(new THREE.BoxGeometry(1,1,1),new THREE.MeshStandardMaterial({roughness:1}),count*parts),dummy=new THREE.Object3D();mesh.castShadow=true;mesh.receiveShadow=true;mesh.frustumCulled=false;scene.add(mesh);
 const shirts=['#526f84','#be896b','#b9a054','#d3c0a3','#6e9075','#ab8190'],skin=['#d6b394','#ad8264','#ecd0af'];
 for(let i=0;i<count;i++)for(let p=0;p<parts;p++)mesh.setColorAt(i*parts+p,new THREE.Color(p===0?skin[i%3]:p===1?'#594a3b':p===2||p===3||p===4?shirts[i%6]:p===7||p===8?'#453e34':'#66675e'));
 function update(t){
  for(let i=0;i<count;i++){
   const child=i%4===0,scale=child?.68:1,dist=(t*.55+i*100/count)%100;let x,z,heading;
   if(dist<40){x=-20+dist;z=.65;heading=Math.PI/2;}else if(dist<50){x=20;z=.65+dist-40;heading=0;}else if(dist<90){x=20-(dist-50);z=10.65;heading=-Math.PI/2;}else{x=-20;z=10.65-(dist-90);heading=Math.PI;}
   const wave=Math.sin(t*4+i)*.42,body=[{p:[0,1.4,0],s:[.25,.29,.23]},{p:[0,1.56,-.025],s:[.28,.1,.26]},{p:[0,1.02,0],s:[.34,.47,.2]},{p:[-.23,1.08,0],s:[.12,.45,.13],swing:-wave},{p:[.23,1.08,0],s:[.12,.45,.13],swing:wave},{p:[-.105,.39,0],s:[.14,.68,.15],swing:wave},{p:[.105,.39,0],s:[.14,.68,.15],swing:-wave},{p:[-.105,.055,.035],s:[.16,.11,.26],leg:wave},{p:[.105,.055,.035],s:[.16,.11,.26],leg:-wave}];
   body.forEach((part,j)=>{const p=[...part.p];if(part.swing&&j>=5){p[1]=.73-Math.cos(part.swing)*.34;p[2]=-Math.sin(part.swing)*.34;}if(part.leg!==undefined){p[1]=.73-Math.cos(part.leg)*.675;p[2]=.035-Math.sin(part.leg)*.675;}
    const cos=Math.cos(heading),sin=Math.sin(heading);dummy.position.set(x+(p[0]*cos+p[2]*sin)*scale,.02+p[1]*scale,z+(-p[0]*sin+p[2]*cos)*scale);dummy.rotation.set(0,heading,0);dummy.rotateX(part.swing||0);dummy.scale.set(...part.s.map(v=>v*scale));dummy.updateMatrix();mesh.setMatrixAt(i*parts+j,dummy.matrix);});
  }mesh.instanceMatrix.needsUpdate=true;
 }
 return {mesh,update};
}
export function createDensityView(host,{onPick,onFrame}){
 const renderer=new THREE.WebGLRenderer({antialias:true});renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));renderer.setClearColor('#e7e7dd');renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.05;renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFShadowMap;renderer.shadowMap.autoUpdate=false;host.append(renderer.domElement);
 const scene=new THREE.Scene(),camera=new THREE.OrthographicCamera(-8,8,7,-7,.1,180),controls=new OrbitControls(camera,renderer.domElement);controls.enableDamping=true;controls.enablePan=false;controls.minZoom=.6;controls.maxZoom=4;controls.minPolarAngle=.12;controls.maxPolarAngle=1.49;
 const hemi=new THREE.HemisphereLight('#e8f1f3','#958765',1.75),sun=new THREE.DirectionalLight('#ffe8cb',3.1),fill=new THREE.DirectionalLight('#bfd4e1',.65);sun.position.set(-15,30,22);sun.castShadow=true;sun.shadow.mapSize.set(2048,2048);sun.shadow.normalBias=.018;sun.shadow.bias=-.00013;fill.position.set(15,10,-20);scene.add(hemi,sun,fill);
 const uniform={value:0},mat=new THREE.MeshStandardMaterial({vertexColors:true,roughness:.9});mat.onBeforeCompile=s=>{s.uniforms.uNight=uniform;s.vertexShader='attribute vec2 surface; varying vec2 vSurface; varying vec3 vLocal;\n'+s.vertexShader;s.vertexShader=s.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nvSurface=surface; vLocal=position;');s.fragmentShader='uniform float uNight; varying vec2 vSurface; varying vec3 vLocal;\n'+s.fragmentShader;s.fragmentShader=s.fragmentShader.replace('#include <color_fragment>','#include <color_fragment>\nfloat grain=sin(vLocal.x*81.7+sin(vLocal.z*38.1))*sin(vLocal.y*113.7+vLocal.z*19.0);diffuseColor.rgb*=1.0+grain*0.019;');s.fragmentShader=s.fragmentShader.replace('#include <roughnessmap_fragment>','#include <roughnessmap_fragment>\nroughnessFactor=vSurface.y;');s.fragmentShader=s.fragmentShader.replace('#include <emissivemap_fragment>','#include <emissivemap_fragment>\ntotalEmissiveRadiance+=vec3(1.,.66,.27)*vSurface.x*uNight*.8;');};
 const floor=new THREE.Mesh(new THREE.PlaneGeometry(200,200),new THREE.MeshStandardMaterial({color:'#e7e7dd',roughness:1}));floor.rotation.x=-Math.PI/2;floor.position.y=-.27;floor.receiveShadow=true;scene.add(floor);
 const workbench=new THREE.Group();scene.add(workbench);
 const board=new THREE.Mesh(new THREE.BoxGeometry(WORKBENCH_SIZE,.08,WORKBENCH_SIZE),new THREE.MeshStandardMaterial({color:'#d9d9ca',roughness:1}));board.position.y=-.04;board.receiveShadow=true;workbench.add(board);let grid;
 const majorGrid=new THREE.GridHelper(WORKBENCH_SIZE,8,0x768b82,0xb1b8aa);majorGrid.position.y=.003;workbench.add(majorGrid);
 function updateGrid(){if(grid){workbench.remove(grid);grid.geometry.dispose();grid.material.dispose();}grid=new THREE.GridHelper(WORKBENCH_SIZE,workbenchBounds(factor).width,0x8c9d91,0xc0c4b7);grid.position.y=.002;workbench.add(grid);}
 const townBase=new THREE.Group();scene.add(townBase);
 const base=new THREE.Mesh(new THREE.BoxGeometry(43.5,.22,23),new THREE.MeshStandardMaterial({color:'#899861',roughness:1}));base.position.set(-.75,-.11,.5);base.receiveShadow=true;townBase.add(base);
 const pathMaterial=new THREE.MeshStandardMaterial({color:'#c8b99a',roughness:1});for(const [x,z,w,d] of [[0,.65,42,1.65],[0,10.65,42,1.65],[-20,5.65,1.65,11],[20,5.65,1.65,11]]){const road=new THREE.Mesh(new THREE.BoxGeometry(w,.04,d),pathMaterial);road.position.set(x,0,z);road.receiveShadow=true;townBase.add(road);}
 const people=residents(scene),completeGroup=new THREE.Group(),activeGroup=new THREE.Group();scene.add(completeGroup,activeGroup);const active=new Map();let completeGeometry,scope='building',factor=2,night=false,steps=20000,dirty=true,shadowDirty=true,rotating=false,editing=false,lastTime=0,lastShadow=0,down;
 const selection=new THREE.Box3Helper(new THREE.Box3(new THREE.Vector3(),new THREE.Vector3()),0xbd794e);selection.visible=false;selection.material.depthTest=false;selection.renderOrder=10;scene.add(selection);
 const previewRoot=new THREE.Group(),previewGeometry=new THREE.BoxGeometry(1,1,1);scene.add(previewRoot);
 const previewMaterials=[new THREE.MeshBasicMaterial({color:'#539879',transparent:true,opacity:.38,depthWrite:false}),new THREE.MeshBasicMaterial({color:'#bb6555',transparent:true,opacity:.24,depthWrite:false})];
 function preview(data){
  for(const mesh of previewRoot.children)mesh.dispose();previewRoot.clear();
  if(data){const matrix=new THREE.Matrix4(),size=CELL*factor;for(const [points,index] of [[data.points,data.tool==='erase'?1:0],[data.blocked,1]]){
   if(!points?.length)continue;const mesh=new THREE.InstancedMesh(previewGeometry,previewMaterials[index],points.length);mesh.renderOrder=7;
   points.forEach((q,i)=>{matrix.makeScale(size*.98,size*.98,size*.98);matrix.setPosition(...q.map(v=>(v+.5)*size));mesh.setMatrixAt(i,matrix);});mesh.instanceMatrix.needsUpdate=true;previewRoot.add(mesh);
  }}dirty=true;
 }
 const hover=new THREE.Box3Helper(new THREE.Box3(new THREE.Vector3(),new THREE.Vector3()),0x678e75);hover.visible=false;hover.material.depthTest=false;hover.renderOrder=9;scene.add(hover);let editTool='view',brush=1,lastHover=0,editLayer=null,layerBounds,layerGrid,layerGridKey='';
 const layerGuide=new THREE.Group();layerGuide.visible=false;scene.add(layerGuide);
 const layerSurface=new THREE.Mesh(new THREE.PlaneGeometry(1,1),new THREE.MeshBasicMaterial({color:'#d3a766',transparent:true,opacity:.07,side:THREE.DoubleSide,depthWrite:false,depthTest:false}));layerSurface.rotation.x=-Math.PI/2;layerSurface.renderOrder=5;layerGuide.add(layerSurface);
 function updateLayerGuide(){
  layerGuide.visible=editing&&editLayer!==null&&scope!=='district';if(!layerGuide.visible)return;
  const cell=CELL*factor;let half=workbenchBounds(factor).width/2;
  if(scope!=='blank')for(const mesh of active.values()){mesh.geometry.computeBoundingBox();const b=mesh.geometry.boundingBox;half=Math.max(half,Math.ceil(Math.max(Math.abs(b.min.x),Math.abs(b.max.x),Math.abs(b.min.z),Math.abs(b.max.z))/cell)+1);}
  half=Math.min(160,half);layerBounds=scope==='blank'?workbenchBounds(factor):{min:[-half,0,-half],max:[half-1,160,half-1]};
  const width=half*2,key=`${factor}:${half}`;if(key!==layerGridKey){if(layerGrid){layerGuide.remove(layerGrid);layerGrid.geometry.dispose();layerGrid.material.dispose();}layerGrid=new THREE.GridHelper(width*cell,width,0xb18249,0xb9a27e);layerGrid.material.transparent=true;layerGrid.material.opacity=.45;layerGrid.material.depthWrite=false;layerGrid.material.depthTest=false;layerGrid.renderOrder=6;layerGuide.add(layerGrid);layerGridKey=key;}
  layerSurface.scale.set(width*cell,width*cell,1);layerGuide.position.y=(editLayer-1)*cell+.004;
 }

 const light=new THREE.PointLight('#ffd09c',0,7,2);scene.add(light);
 function cameraAngle(angle='corner'){
  // Stop leftover orbit inertia before snapping to a touch view preset.
  controls.enableDamping=false;controls.update();
  let height=0;if(scope==='blank')for(const mesh of active.values()){mesh.geometry.computeBoundingBox();height=Math.max(height,mesh.geometry.boundingBox.max.y);}
  const district=scope==='district',target=district?[-.7,1.5,0]:scope==='blank'?[0,height/2,0]:[-.3,2.2,.2];controls.target.set(...target);const dir=angle==='front'?[0,7,24]:angle==='back'?[-16,12,-22]:angle==='top'?[.001,25,0]:[16,12,22];camera.position.copy(controls.target).add(new THREE.Vector3(...dir).multiplyScalar(district?2:1));camera.zoom=scope==='blank'?Math.min(1,6/(height*.85+3.6)):1;camera.updateProjectionMatrix();controls.update();controls.enableDamping=true;dirty=true;
 }
 function resize(){const {width,height}=host.getBoundingClientRect();if(!width||!height)return;renderer.setSize(width,height,false);const aspect=width/height,half=scope==='district'?Math.max(13.5,26/aspect):scope==='blank'?Math.max(3.1,4/aspect):Math.max(3.7,4.8/aspect);camera.left=-half*aspect;camera.right=half*aspect;camera.top=half;camera.bottom=-half;camera.updateProjectionMatrix();dirty=true;}
 new ResizeObserver(resize).observe(host);controls.addEventListener('change',()=>dirty=true);
 function setupComplete(){completeGroup.clear();if(!completeGeometry)return;PLOTS.forEach(([x,z],i)=>{const mesh=new THREE.Mesh(completeGeometry,mat);mesh.position.set(x,0,z);mesh.castShadow=mesh.receiveShadow=true;mesh.userData.plot=i;completeGroup.add(mesh);});}
 function visibility(){const district=scope==='district';townBase.visible=people.mesh.visible=district&&!night;townBase.visible=district;workbench.visible=scope==='blank';completeGroup.visible=district;completeGroup.children.forEach((m,i)=>m.visible=i<4||steps===20000);activeGroup.visible=!district||steps<20000;activeGroup.position.set(...(district?[PLOTS[4][0],0,PLOTS[4][1]]:[0,0,0]));light.position.set((district?PLOTS[4][0]:0)+1.5,2.3,(district?PLOTS[4][1]:0)+2);floor.position.y=district?-.29:scope==='blank'?-.14:.075;}
 function load(data){const oldScope=scope,oldFactor=factor;scope=data.scope;factor=data.factor;steps=data.steps;hover.visible=false;controls.enableRotate=scope==='blank'||!editing;controls.enablePan=scope==='blank';controls.maxZoom=scope==='blank'?8:4;if(scope==='blank'&&(!grid||oldFactor!==factor))updateGrid();
  if(data.complete){completeGeometry?.dispose();completeGeometry=scope==='district'?merged(data.complete.items):null;setupComplete();for(const m of active.values()){activeGroup.remove(m);m.geometry.dispose();}active.clear();}
  for(const {key,mesh} of data.active.items){const old=active.get(key);if(old){activeGroup.remove(old);old.geometry.dispose();active.delete(key);}if(mesh){const m=new THREE.Mesh(geometry(mesh),mat);m.castShadow=m.receiveShadow=true;activeGroup.add(m);active.set(key,m);}}
  const size=scope==='district'?31:9;Object.assign(sun.shadow.camera,{left:-size,right:size,top:size,bottom:-size,near:.5,far:90});sun.shadow.camera.updateProjectionMatrix();sun.position.set(scope==='district'?-15:-5,scope==='district'?30:11,scope==='district'?22:9);visibility();updateLayerGuide();if(oldScope!==scope){cameraAngle();resize();}dirty=shadowDirty=true;
 }
 const ray=new THREE.Raycaster(),pointer=new THREE.Vector2();
 function hitCell(e){const r=renderer.domElement.getBoundingClientRect();pointer.set((e.clientX-r.left)/r.width*2-1,-(e.clientY-r.top)/r.height*2+1);ray.setFromCamera(pointer,camera);
  if(editing&&editLayer!==null){const point=ray.ray.intersectPlane(new THREE.Plane(new THREE.Vector3(0,1,0),-(editLayer-1)*CELL*factor),new THREE.Vector3());const q=point&&layerCell(point.toArray(),factor,editLayer,layerBounds);return q?{q,n:[0,1,0],floor:false}:null;}
  let hit=ray.intersectObjects([...active.values()],false)[0];
  if(!hit&&scope==='blank'){hit=ray.intersectObject(board,false).find(h=>h.face.normal.y>.5);if(hit){const q=hit.point.toArray().map(v=>Math.floor(v/(CELL*factor)));q[1]=-1;const bounds=workbenchBounds(factor);if(q[0]<bounds.min[0]||q[0]>bounds.max[0]||q[2]<bounds.min[2]||q[2]>bounds.max[2])return null;return {q,n:[0,1,0],floor:true};}}
  if(!hit)return null;const n=hit.face.normal.clone(),p=hit.point.clone().addScaledVector(n,-CELL*factor*.01),q=p.toArray().map(v=>Math.floor(v/(CELL*factor)));return {q,n:n.toArray().map(Math.round),floor:false};
 }
 const pointers=new Set();let gesture=false,dragged=false,downHit;
 host.addEventListener('pointerdown',e=>{pointers.add(e.pointerId);if(pointers.size>1){gesture=true;return;}dragged=false;down=[e.clientX,e.clientY];downHit=editing?hitCell(e):null;});
 host.addEventListener('pointermove',e=>{if(down&&Math.hypot(e.clientX-down[0],e.clientY-down[1])>(e.pointerType==='touch'?10:5))dragged=true;});
 host.addEventListener('pointerup',e=>{pointers.delete(e.pointerId);const cancelled=gesture||dragged,hit=downHit;if(!pointers.size)gesture=false;down=null;downHit=null;if(!editing||cancelled||e.button!==0)return;if(hit)onPick?.(hit.q,hit.n,hit.floor);});
 host.addEventListener('pointercancel',e=>{pointers.delete(e.pointerId);down=null;downHit=null;gesture=pointers.size>0;dragged=true;});
 host.addEventListener('pointermove',e=>{if(!editing||(scope!=='blank'&&editLayer===null)||e.timeStamp-lastHover<30)return;lastHover=e.timeStamp;const hit=hitCell(e);hover.visible=false;if(hit&&(['place','extrude'].includes(editTool)||!hit.floor)){
   const add=['place','extrude'].includes(editTool),q=hit.q.map((v,i)=>v+(add?hit.n[i]:0)),radius=add?(brush-1)/2:0,bounds=editLayer!==null?layerBounds:workbenchBounds(factor),lo=q.map((v,i)=>Math.max(bounds.min[i],v-(hit.n[i]?0:radius))),hi=q.map((v,i)=>Math.min(bounds.max[i],v+(hit.n[i]?0:radius)));
   if(lo.every((v,i)=>v<=hi[i])){hover.box.set(new THREE.Vector3(...lo.map(v=>v*CELL*factor)),new THREE.Vector3(...hi.map(v=>(v+1)*CELL*factor)));hover.visible=true;}
  }dirty=true;
 });host.addEventListener('pointerleave',()=>{hover.visible=false;dirty=true;});
 renderer.setAnimationLoop(now=>{if(document.hidden){lastTime=0;return;}const dt=lastTime?now-lastTime:0;lastTime=now;const moving=scope==='district'&&!night;
  if(rotating){const v=camera.position.clone().sub(controls.target);v.applyAxisAngle(new THREE.Vector3(0,1,0),Math.min(dt,50)*.00016);camera.position.copy(controls.target).add(v);dirty=true;}controls.update();if(moving)people.update(now/1000);
  if(!dirty&&!moving&&!rotating){onFrame?.({now,dt,rendered:false});return;}
  renderer.shadowMap.needsUpdate=shadowDirty||(moving&&now-lastShadow>100);if(renderer.shadowMap.needsUpdate)lastShadow=now;shadowDirty=false;
  const cpuStart=performance.now();renderer.render(scene,camera);const cpuMs=performance.now()-cpuStart;onFrame?.({now,dt,rendered:true,cpuMs,triangles:renderer.info.render.triangles,draws:renderer.info.render.calls,geometries:renderer.info.memory.geometries,width:renderer.domElement.width,height:renderer.domElement.height});dirty=false;
 });
 cameraAngle();resize();visibility();
 return {load,preview,angle:cameraAngle,rotate(v){rotating=v;dirty=true;},zoom(multiplier){camera.zoom=Math.max(controls.minZoom,Math.min(controls.maxZoom,camera.zoom*multiplier));camera.updateProjectionMatrix();dirty=true;},edit(v,tool='view',size=1,layer=null){editing=v;editTool=tool;brush=size;editLayer=layer;controls.enableRotate=scope==='blank'||!v;hover.visible=false;updateLayerGuide();dirty=true;},select(a,b){selection.visible=!!a;if(a){const lo=a.map((v,i)=>Math.min(v,(b||a)[i])*CELL*factor),hi=a.map((v,i)=>(Math.max(v,(b||a)[i])+1)*CELL*factor);selection.box.set(new THREE.Vector3(...lo),new THREE.Vector3(...hi));}dirty=true;},night(v){night=v;uniform.value=v?1:0;renderer.setClearColor(v?'#253446':'#e7e7dd');floor.material.color.set(v?'#253446':'#e7e7dd');hemi.intensity=v?.65:1.75;sun.intensity=v?.65:3.1;sun.color.set(v?'#abc5ee':'#ffe8cb');fill.intensity=v?.2:.65;light.intensity=v?9:0;visibility();dirty=shadowDirty=true;},get viewport(){return {width:renderer.domElement.width,height:renderer.domElement.height,pixelRatio:renderer.getPixelRatio()};}};
}
