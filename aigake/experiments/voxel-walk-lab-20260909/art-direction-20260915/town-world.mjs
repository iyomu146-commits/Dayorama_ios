import * as THREE from 'three';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {createLooks,voxelSurface,plainSurface,constructionSurface,surfaceRole} from './town-look.mjs';
import {Voxels} from '../voxels.mjs';
import {countsAt,hash,clamp} from '../model.mjs';
import {makeTown,buildingProgress,blend} from './town-plan.mjs';
import {createResident,updateResident} from './town-resident.mjs';
import {makeLifePlan,createLifeAnimal,updateLifeAnimal} from './town-life.mjs';
import {RAIL,CAR,loopLength,railPoint,carPose} from '../tokyo/city.mjs';
import {crossingPhase,SHIBUYA_CROSSING} from './tokyo-activity.mjs';

function compact(boxes){
 const groups=new Map(),other=[];
 for(const b of boxes){if(Math.abs(b.w-.32)>.001||Math.abs(b.d-.32)>.001){other.push(b);continue;}const k=[b.y.toFixed(5),b.z.toFixed(5),b.h.toFixed(5),b.color,b.kind].join('|');if(!groups.has(k))groups.set(k,[]);groups.get(k).push(b);}
 for(const row of groups.values()){row.sort((a,b)=>a.x-b.x);let run;for(const b of row){if(run&&Math.abs(b.x-b.w/2-(run.x+run.w/2))<.00001){const left=run.x-run.w/2;run.w+=b.w;run.x=left+run.w/2;}else{run={...b};other.push(run);}}}
 return other;
}
function boxesGeometry(input,p){
 const boxes=compact(input);
 const source=new THREE.BoxGeometry(1,1,1).toNonIndexed(),pos=source.attributes.position.array,nor=source.attributes.normal.array,P=[],N=[],C=[],K=[];
 for(const b of boxes){const c=new THREE.Color(b.color),kind=b.kind==='water'?7:p&&['land','base'].includes(b.kind)?p.id==='snow'?5:1:p?surfaceRole(b.color,p):0;for(let i=0;i<pos.length;i+=3){P.push(pos[i]*b.w+b.x,pos[i+1]*b.h+b.y,pos[i+2]*b.d+b.z);N.push(nor[i],nor[i+1],nor[i+2]);const f=nor[i+1]>.5?1:nor[i+1]<-.5?.87:.98;C.push(c.r*f,c.g*f,c.b*f);K.push(kind);}}
 source.dispose();const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(P,3));g.setAttribute('normal',new THREE.Float32BufferAttribute(N,3));g.setAttribute('color',new THREE.Float32BufferAttribute(C,3));plainSurface(g);g.setAttribute('townKind',new THREE.Float32BufferAttribute(K,1));g.computeBoundingSphere();return g;
}
export function createTownWorld(host){
 const renderer=new THREE.WebGLRenderer({antialias:true,preserveDrawingBuffer:true});renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.04;renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFShadowMap;renderer.shadowMap.autoUpdate=false;host.append(renderer.domElement);
 const scene=new THREE.Scene(),camera=new THREE.OrthographicCamera(-12,12,10,-10,.1,150),controls=new OrbitControls(camera,renderer.domElement);controls.enableDamping=true;controls.enablePan=false;controls.minPolarAngle=.12;controls.maxPolarAngle=1.37;controls.minZoom=.4;controls.maxZoom=4;
 const looks=createLooks(renderer),material=looks.material(),waterMaterial=looks.material({water:true}),buildingMaterial=looks.material({building:true}),constructionMaterial=looks.material({cells:true}),nightUniform=looks.uniforms.uNight;
 looks.set(0,'');
 const hemi=new THREE.HemisphereLight('#e6f0ee','#8a937d',1.7);scene.add(hemi);
 const sun=new THREE.DirectionalLight('#ffe8c5',2.8);sun.position.set(-14,22,9);sun.castShadow=true;sun.shadow.mapSize.set(2048,2048);Object.assign(sun.shadow.camera,{left:-17,right:17,top:17,bottom:-17,near:.5,far:65});sun.shadow.bias=-.00015;sun.shadow.normalBias=.022;sun.shadow.radius=3;scene.add(sun);
 const fill=new THREE.DirectionalLight('#d8e3e7',.5);fill.position.set(15,8,-15);scene.add(fill);
 const floor=new THREE.Mesh(new THREE.PlaneGeometry(200,200),new THREE.MeshStandardMaterial({color:'#e8e5dc',roughness:1}));floor.rotation.x=-Math.PI/2;floor.position.y=-1.11;floor.receiveShadow=true;scene.add(floor);
 const cube=new THREE.BoxGeometry(1,1,1);cube.setAttribute('color',new THREE.Float32BufferAttribute(new Float32Array(cube.attributes.position.count*3).fill(1),3));
 const focusIndex={people:0,animals:0};
 const matrix=new THREE.Matrix4(),white=new THREE.Color('#ffffff');let root,plan,lifePlan,buildings=[],vegetation=[],actors=[],pets=[],lifeFixtures=[],boats=[],train=[],couplers=[],signals=[],progress=1,elapsed=0,last=null,dirty=true,lastShadow=0,motion=!matchMedia('(prefers-reduced-motion: reduce)').matches,evening=false,viewName='home',starPoints,lookMode=0,colorStrength=.7;
 function mesh(parent,g,mat=material){if(!g.attributes.townAO)plainSurface(g);const m=new THREE.Mesh(g,mat);m.castShadow=true;m.receiveShadow=true;parent.add(m);return m;}
 function surface(parent,cells,u=.1){const m=mesh(parent,voxelSurface(cells,plan.p));m.scale.setScalar(u/.1);return m;}
 function clear(){if(!root)return;scene.remove(root);const geometries=new Set(),materials=new Set();root.traverse(o=>{if(o.geometry&&o.geometry!==cube)geometries.add(o.geometry);if(o.isInstancedMesh)o.dispose();if(o.userData.ownMaterial)materials.add(o.material);});geometries.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());}
 function lights(){
  if(!plan)return;const night=plan.id==='stars'||evening,dusk=plan.id==='snow',warm=plan.p.light==='sunset';
  const bg=night?'#485966':dusk?'#c6cfd7':warm?'#e6e0d4':'#e4e6dc';scene.background=new THREE.Color(bg);floor.material.color.set(bg);
  hemi.color.set(night?'#bfcfe2':'#e8efeb');hemi.intensity=night?1.55:1.7;sun.color.set(night?'#dddacb':warm?'#ffdbad':'#ffe8c5');sun.intensity=night?1.1:dusk?1.8:2.8;fill.intensity=night?.38:.45;renderer.toneMappingExposure=night?1.05:1.04;nightUniform.value=night?.65:dusk?.3:0;
  sun.position.set(-14,22,9);sun.shadow.radius=3;fill.color.set('#d8e3e7');
  if(lookMode>0){
   const snow=plan.id==='snow',oasis=plan.id==='oasis',background=night?'#344b60':snow?'#d7e1e8':oasis?'#e9dfce':'#e2e6dc';
   scene.background.set(background);floor.material.color.set(background);
   hemi.color.set(night?'#a8c7ea':snow?'#c6dff4':'#c9e3e8');hemi.groundColor.set(snow?'#a5b7c9':oasis?'#bda37b':'#879b7d');hemi.intensity=night?.93:snow?1.12:1.02;
   sun.color.set(night?'#c7d8ee':snow?'#ffdfbd':oasis?'#ffe0b2':'#fff0d7');sun.intensity=night?1.0:snow?2.3:3.05;sun.position.set(-12,20,13);sun.shadow.radius=2.5;
   fill.color.set('#c3d9eb');fill.intensity=night?.25:.48;renderer.toneMappingExposure=night?1.05:1.02;nightUniform.value=night?.85:snow?.48:0;
   if(!night&&!snow&&!oasis){sun.color.lerp(new THREE.Color('#fff8ee'),colorStrength*.65);renderer.toneMappingExposure-=colorStrength*.04;}
  }else hemi.groundColor.set('#8a937d');
  if(lookMode>0&&plan.id==='tokyo'&&!night){
   scene.background.set('#dbd7d1');floor.material.color.set('#dbd7d1');
   hemi.groundColor.set('#958c96');fill.color.set('#b8cbe5');sun.color.set('#ffe5c6');sun.intensity=2.8;renderer.toneMappingExposure=.98;
  }
  looks.set(lookMode,plan.id);
  floor.material.envMapIntensity=lookMode>0?.18:0;
  if(starPoints)starPoints.visible=night;dirty=true;
 }
 function makeBuilding(b){
  const g=new THREE.Group();g.name=b.kind;g.position.set(b.x,b.y,b.z);g.rotation.y=b.rot*Math.PI/2;root.add(g);
  const full=surface(g,b.bp.cells,b.u);
  const color=full.geometry.attributes.color,warmth=new Float32Array(color.count);for(let i=0;i<color.count;i++){const r=color.getX(i),green=color.getY(i),blue=color.getZ(i);warmth[i]=r>.64&&r/green>1.26&&r/blue>2.1?1:0;}full.geometry.setAttribute('warmth',new THREE.Float32BufferAttribute(warmth,1));full.material=buildingMaterial;
  const construction=constructionSurface(b.bp.phases,cube,plan.p);
  const phases=b.bp.phases.map((cells,phase)=>{const m=new THREE.InstancedMesh(construction.geometries[phase],constructionMaterial,cells.length);cells.forEach((c,i)=>{matrix.makeScale(b.u,b.u,b.u);matrix.setPosition(c.x*b.u,c.y*b.u,c.z*b.u);m.setMatrixAt(i,matrix);m.setColorAt(i,new THREE.Color(c.color));});m.castShadow=true;m.receiveShadow=true;m.count=0;m.visible=false;m.frustumCulled=false;g.add(m);return m;});
  const contact=['oasis','snow'].includes(plan.id)?looks.contact(b.bounds,b.base):null;if(contact)root.add(contact);
  return{...b,g,full,phases,construction,contact,progress:1};
 }
 function instances(items,cells,u,name){
  if(!items.length)return;const sorted=[...items].sort((a,b)=>a.birth-b.birth),g=voxelSurface(cells,plan.p,{wind:true,tree:name==='trees',snow:plan.id==='snow'&&name==='trees'}),m=new THREE.InstancedMesh(g,material,items.length);
  sorted.forEach((p,i)=>{const q=new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0,1,0),hash(plan.seed,i,21)*Math.PI*2);matrix.compose(new THREE.Vector3(p.x,p.y+u/2,p.z),q,new THREE.Vector3(u/.1,u/.1,u/.1));m.setMatrixAt(i,matrix);});m.name=name;m.castShadow=name==='trees';m.customDepthMaterial=looks.depth;m.receiveShadow=true;root.add(m);vegetation.push({mesh:m,items:sorted,kind:name});
 }
 function person(route,index,building,options){
  const a=createResident(route,index,building,plan.seed,options);
  if(a){
   root.add(a.g);actors.push(a);
   if(options?.action==='water'){const drops=new THREE.InstancedMesh(cube,new THREE.MeshStandardMaterial({color:'#83b4bb',roughness:.6}),3);drops.userData.ownMaterial=true;drops.frustumCulled=false;a.g.add(drops);a.drops=drops;}
  }
 }
 function makeBoat(x,z,phase=0){
  const v=new Voxels();for(let zz=-9;zz<=9;zz++){const r=Math.max(1,Math.round(3.5*(1-Math.abs(zz)/12)));for(let y=0;y<4;y++)for(let xx=-r;xx<=r;xx++)if(y===0||Math.abs(xx)===r||Math.abs(zz)===9)v.put(xx,y,zz,y===3?'#c9b58c':'#8a7760');for(const xx of [-r+1,r-1])if(Math.abs(zz)===3)v.put(xx,2,zz,'#b5a383');}
  const g=new THREE.Group();root.add(g);surface(g,v.list(),.065);boats.push({g,x,z,phase});
 }
 function rails(){
  const rail=plan.rail||RAIL,LOOP_LENGTH=loopLength(rail),point=d=>railPoint(d,rail);
  function strip(offset,width,bottom,top,color){
   const P=[],I=[],n=768;for(let i=0;i<=n;i++){const p=point(i/n*LOOP_LENGTH);for(const y of [bottom,top])for(const s of [-1,1])P.push(p.x+p.nx*(offset+s*width/2),y,p.z+p.nz*(offset+s*width/2));if(i){const a=(i-1)*4,b=i*4;for(const[l,r]of [[0,1],[1,3],[3,2],[2,0]])I.push(a+l,b+l,b+r,a+l,b+r,a+r);}}
   const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(P,3));g.setIndex(I);g.computeVertexNormals();const c=new THREE.Color(color),colors=new Float32Array(P.length);for(let i=0;i<P.length;i+=3){colors[i]=c.r;colors[i+1]=c.g;colors[i+2]=c.b;}g.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));return mesh(root,g);
  }
  strip(0,rail.bedWidth,.32,.39,'#878e8b');for(const off of [-rail.gauge/2,rail.gauge/2])strip(off,.048,.445,.51,'#849090');
  const tieCount=Math.ceil(LOOP_LENGTH/.26),ties=new THREE.InstancedMesh(cube,material,tieCount);for(let i=0;i<tieCount;i++){const p=point(i/tieCount*LOOP_LENGTH);matrix.compose(new THREE.Vector3(p.x,.415,p.z),new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0,1,0),p.yaw),new THREE.Vector3(.095,.05,.78));ties.setMatrixAt(i,matrix);ties.setColorAt(i,new THREE.Color('#676f6b'));}ties.receiveShadow=true;root.add(ties);
  const v=new Voxels();v.box(-9,0,-3,9,6,3,'#c8d0cc');v.box(-9,7,-3,9,7,3,'#9da8a4');for(const z of [-3,3])for(let x=-8;x<=8;x++){v.put(x,1,z,'#769b69',0,true);if(x%5!==0)for(let y=3;y<=5;y++)v.put(x,y,z,'#809a9c',0,true);}for(const x of [-9,9])for(let z=-2;z<=2;z++)for(let y=3;y<=5;y++)v.put(x,y,z,'#819c9e',0,true);
  v.box(-8,-1,-2,8,-1,2,'#63736e');
  for(let i=0;i<3;i++){const g=new THREE.Group();root.add(g);surface(g,v.list(),.07);const bogies=[];for(let b=0;b<2;b++){const q=new THREE.Group();root.add(q);mesh(q,boxesGeometry([{x:0,y:0,z:0,w:.30,h:.10,d:.42,color:'#4f5d5d'}]));for(const x of [-.1,.1])for(const z of [-.2,.2])mesh(q,boxesGeometry([{x,y:-.03,z,w:.12,h:.15,d:.05,color:'#475252'}]));bogies.push(q);}train.push({g,bogies});if(i)couplers.push(mesh(root,boxesGeometry([{x:0,y:0,z:0,w:1,h:.05,d:.065,color:'#556463'}])));}
 }
 function crossingSignals(){
  const {x:cx,z:cz}=SHIBUYA_CROSSING;
  for(const sx of [-1,1])for(const sz of [-1,1]){
   const x=cx+sx*1.9,z=cz+sz*1.8;
   mesh(root,boxesGeometry([{x,y:.94,z,w:.06,h:1.24,d:.06,color:'#65777b'},{x,y:1.62,z,w:.17,h:.34,d:.13,color:'#46585f'}]));
   const lights=['#d65f49','#7bbd94'].map((color,i)=>{
    const mat=new THREE.MeshStandardMaterial({color,emissive:color,emissiveIntensity:.6,roughness:.7});
    const light=mesh(root,new THREE.BoxGeometry(.085,.085,.018),mat);
    light.position.set(x,1.70-i*.16,z+.074);light.userData.ownMaterial=true;return light;
   });
   signals.push({group:sx===sz?1:0,lights});
  }
 }
 let showcase=null,showcaseVisibility=null;
 function build(p,seed=741,{townPlan}={}){
  showcase=null;showcaseVisibility=null;floor.position.y=-1.11;
  clear();plan=townPlan||makeTown(p,seed);lifePlan=makeLifePlan(plan);root=new THREE.Group();root.name='town-'+p.id;scene.add(root);buildings=[];vegetation=[];actors=[];pets=[];lifeFixtures=[];boats=[];train=[];couplers=[];signals=[];elapsed=0;last=null;focusIndex.people=0;focusIndex.animals=0;
  const shadowExtent=p.id==='tokyo'?30:17;Object.assign(sun.shadow.camera,{left:-shadowExtent,right:shadowExtent,top:shadowExtent,bottom:-shadowExtent,far:p.id==='tokyo'?90:65});sun.shadow.camera.updateProjectionMatrix();controls.minZoom=p.id==='tokyo'?.18:.4;
  mesh(root,boxesGeometry(plan.boxes.filter(b=>b.kind!=='water'),p));
  const wet=plan.boxes.filter(b=>b.kind==='water');if(wet.length){const m=mesh(root,boxesGeometry(wet,p),waterMaterial);m.castShadow=false;}
  buildings=plan.buildings.map(makeBuilding);
  for(let i=0;i<4;i++)instances(plan.trees.filter(t=>t.variant===i),plan.treePrototypes[i],plan.trees.find(t=>t.variant===i)?.u||.12,'trees');
  for(const [kind,cells]of Object.entries(plan.prototypes))instances(plan.plants.filter(t=>t.kind===kind),cells,.075,'plants');
  lifePlan.workers.forEach(w=>person(w.route,w.index,w.building,w.options));
  lifePlan.animals.forEach((def,i)=>{const a=createLifeAnimal(def,i,seed);root.add(a.g);pets.push(a);});
  lifePlan.fixtures.forEach(f=>lifeFixtures.push({...f,g:mesh(root,boxesGeometry(f.boxes,p))}));
  if(plan.id==='canal'){makeBoat(0,0);makeBoat(0,0,Math.PI);}
  if(plan.id==='harbor'){makeBoat(-1.3,4.5);makeBoat(3.5,5.4,2);}
  if(plan.id==='tropical'){makeBoat(-7,5);makeBoat(7,5.6,2);}
  if(plan.id==='tokyo'){rails();crossingSignals();}
  const starPositions=[];for(let i=0;i<90;i++)starPositions.push((hash(seed,i,821)*2-1)*38,11+hash(seed,i,823)*22,-10-hash(seed,i,824)*28);
  const sg=new THREE.BufferGeometry();sg.setAttribute('position',new THREE.Float32BufferAttribute(starPositions,3));starPoints=new THREE.Points(sg,new THREE.PointsMaterial({size:.065,color:'#dfe4dc',sizeAttenuation:true}));starPoints.userData.ownMaterial=true;root.add(starPoints);
  lights();setProgress(progress);view('home');dirty=true;render();return plan;
 }
 function setProgress(value,focus=null){
  progress=clamp(Number(value)||0,0,1);
  for(const b of buildings){b.progress=focus?.buildingId===b.id?clamp(focus.buildingProgress,0,1):buildingProgress(b,progress);b.full.visible=b.progress===1;const counts=countsAt(b.bp.counts,b.progress*4800);b.phases.forEach((m,i)=>{m.count=counts[i];m.visible=b.progress>0&&b.progress<1;});if(lookMode>0&&b.progress>0&&b.progress<1)b.construction.update(counts);if(b.contact){b.contact.visible=lookMode>0&&b.progress>.08;b.contact.material.uniforms.uOpacity.value=.15*clamp((b.progress-.08)/.1,0,1);}}
  for(const v of vegetation)v.mesh.count=v.items.filter(p=>p.birth<=progress).length;
  actors.forEach(a=>a.g.visible=buildings[a.building].progress===1);
  pets.forEach(a=>a.g.visible=buildings[a.building].progress===1);
  lifeFixtures.forEach(a=>a.g.visible=buildings[a.building].progress===1);
  if(viewName==='people'&&!actors.some(a=>a.g.visible))view('home');
  if(viewName==='animals'&&!pets.some(a=>a.g.visible))view('home');
  const waterFacility=buildings.find(b=>['boathouse','island-cabin','clockmaker'].includes(b.kind));boats.forEach(b=>b.g.visible=waterFacility?.progress===1);
  const station=buildings.find(b=>b.kind==='tokyo-station');for(const t of train){t.g.visible=station?.progress===1;t.bogies.forEach(g=>g.visible=t.g.visible);}couplers.forEach(c=>c.visible=station?.progress===1);
  applyShowcase();dirty=true;render();
 }
 function applyShowcase(){
  if(!showcase)return;
  for(const child of root.children)if(child!==showcase.g&&child!==showcase.contact)child.visible=false;
 }
 function setShowcase(id=null){
  if(showcaseVisibility)for(const [child,visible]of showcaseVisibility)child.visible=visible;
  showcase=buildings.find(b=>b.id===id)||null;
  showcaseVisibility=showcase?root.children.map(child=>[child,child.visible]):null;
  floor.position.y=showcase?showcase.y+(showcase.bp.bounds.min[1]-.5)*showcase.u:-1.11;
  applyShowcase();dirty=true;view(showcase?'building:'+showcase.id:'home');
 }
 function animate(){
  for(const a of actors)if(a.g.visible){
   updateResident(a,elapsed);
   if(a.drops){a.drops.visible=a.action==='water';if(a.drops.visible){const start=new THREE.Vector3(.11,.06,0).applyQuaternion(a.rig.carry.quaternion).add(a.rig.carry.position).add(a.rig.hips.position),end=new THREE.Vector3(0,.33,.36);for(let i=0;i<3;i++){const point=start.clone().lerp(end,(elapsed*.9+i/3)%1);matrix.makeScale(.012,.026,.012);matrix.setPosition(point);a.drops.setMatrixAt(i,matrix);}a.drops.instanceMatrix.needsUpdate=true;}}
  }
  for(const a of pets)if(a.g.visible)updateLifeAnimal(a,elapsed);
  const crossingOpen=actors.some(a=>a.options.crosswalk&&a.g.visible);
  for(const s of signals){const green=crossingOpen&&crossingPhase(elapsed,s.group).moving;s.lights[0].visible=!green;s.lights[1].visible=green;}
  for(const b of boats){const t=elapsed*.075+b.phase;if(plan.id==='canal'){b.g.position.set(Math.cos(t)*.57,plan.waterY+.035,Math.sin(t)*5.7);b.g.rotation.y=Math.atan2(-Math.sin(t)*.57,Math.cos(t)*5.7);}else{b.g.position.set(b.x,plan.waterY+.035+Math.sin(t*3)*.018,b.z);b.g.rotation.z=Math.sin(t*2)*.025;b.g.rotation.y=.3+b.phase*.15;}}
  const poses=train.map((t,i)=>{const p=carPose(5.1+elapsed*.85-i*CAR.spacing,plan.rail);t.g.position.set(p.x,.75,p.z);t.g.rotation.y=p.yaw;t.bogies.forEach((g,j)=>{const b=p.bogies[j];g.position.set(b.x,.61,b.z);g.rotation.y=b.yaw;});return p;});
  couplers.forEach((m,i)=>{const a=poses[i],b=poses[i+1],x0=a.x-Math.cos(a.yaw)*CAR.length/2,z0=a.z+Math.sin(a.yaw)*CAR.length/2,x1=b.x+Math.cos(b.yaw)*CAR.length/2,z1=b.z-Math.sin(b.yaw)*CAR.length/2;m.position.set((x0+x1)/2,.72,(z0+z1)/2);m.scale.x=Math.hypot(x1-x0,z1-z0);m.rotation.y=-Math.atan2(z1-z0,x1-x0);});
 }
 function render(now=0){
  if(now&&last!==null&&motion)elapsed+=Math.min(.10,Math.max(0,(now-last)/1000));if(now)last=now;looks.tick(elapsed);animate();controls.update();
  if(dirty||(motion&&now-lastShadow>300)){renderer.shadowMap.needsUpdate=true;dirty=false;lastShadow=now;}
  renderer.render(scene,camera);
 }
 function view(name='home',next=true){
  if(name==='people'||name==='animals'){
   // Pick an open sightline rather than placing the camera inside a nearby
   // building. Orthographic zoom needs no short camera-to-person distance.
   const obstacles=buildings.filter(b=>b.progress>0).map(b=>new THREE.Box3(new THREE.Vector3(b.bounds.min[0],b.base,b.bounds.min[1]),new THREE.Vector3(b.bounds.max[0],b.y+(b.bp.bounds.max[1]+.5)*b.u,b.bounds.max[1])));
   const crowns=plan.treePrototypes.map(cells=>({r:Math.max(...cells.map(c=>Math.hypot(c.x,c.z)))+.5,h:Math.max(...cells.map(c=>c.y))+.5}));
   for(const tree of plan.trees.filter(t=>t.birth<=progress)){const shape=crowns[tree.variant],r=shape.r*tree.u,h=shape.h*tree.u;obstacles.push(new THREE.Box3(new THREE.Vector3(tree.x-r,tree.y+h*.30,tree.z-r),new THREE.Vector3(tree.x+r,tree.y+h,tree.z+r)),new THREE.Box3(new THREE.Vector3(tree.x-.17,tree.y,tree.z-.17),new THREE.Vector3(tree.x+.17,tree.y+h*.65,tree.z+.17)));}
   let best=null;const ray=new THREE.Ray(),hit=new THREE.Vector3(),visible=(name==='animals'?pets:actors).filter(a=>a.g.visible);
   if(next)focusIndex[name]=viewName===name?(focusIndex[name]+1)%Math.max(1,visible.length):0;
   const focused=visible[focusIndex[name]%Math.max(1,visible.length)];
   for(const a of focused?[focused]:[]){
    const start=a.route[0],end=a.route.at(-1),outward=Math.atan2(end[0]-start[0],end[2]-start[2]),target=a.g.position.clone().add(new THREE.Vector3(0,a.rig.body.height*.45,0));
    for(const elevation of [.62,1.05])for(const angle of [.35,-.35,0,Math.PI/2,-Math.PI/2,Math.PI]){
     const direction=new THREE.Vector3(0,elevation,1).applyAxisAngle(new THREE.Vector3(0,1,0),outward+angle).normalize();
     let blocked=0;
     for(const height of [-.32,0,.34]){ray.set(target.clone().add(new THREE.Vector3(0,height,0)),direction);blocked+=obstacles.filter(box=>ray.intersectBox(box,hit)).length;}
     const score=-blocked*10-Math.abs(angle-.35)*.3-(elevation-.62)*.5;
     if(!best||score>best.score)best={target,direction,score};
    }
   }
   if(best){viewName=name;controls.target.copy(best.target);camera.position.copy(best.target).addScaledVector(best.direction,42);camera.zoom=controls.maxZoom;camera.lookAt(controls.target);controls.update();camera.updateProjectionMatrix();dirty=true;render();return (focused.options?.label||focused.label)+' · '+(focusIndex[name]+1)+' / '+visible.length;}
   name='home';
  }
  const focusedBuilding=plan?.buildings.find(b=>'building:'+b.id===name);
  const tile=plan?.tiles.find(t=>'district-'+t.id===name),cx=focusedBuilding?.x??tile?.x??0,cz=focusedBuilding?.z??tile?.z??0;
  const tileAngle=tile?.id==='station'?[7,36,30]:tile?.id==='office'?[9,28,38]:tile?.id==='shops'?[10,28,38]:tile?[20,32,38]:null;
  viewName=name;const targetY=focusedBuilding?focusedBuilding.y+(focusedBuilding.bp.bounds.min[1]+focusedBuilding.bp.bounds.max[1])*focusedBuilding.u/2:plan?.id==='tokyo'?2.6:plan?.id==='stars'?2:1.8;controls.target.set(cx,targetY,cz);camera.position.copy(controls.target).add(new THREE.Vector3(...(tileAngle||(name==='back'?[-24,23,-31]:name==='top'?[.01,42,.01]:name==='front'?[0,24,37]:plan?.id==='tokyo'?[12,34,44]:[22,25,33]))));camera.zoom=1;camera.lookAt(controls.target);controls.update();camera.updateMatrixWorld(true);camera.updateProjectionMatrix();
  const selected=focusedBuilding?[focusedBuilding]:tile?plan.buildings.filter(b=>b.district===tile.id):plan?.buildings,maxY=selected?Math.max(focusedBuilding?0:4,...selected.map(b=>b.y+(b.bp.bounds.max[1]+.5)*b.u)):8;
  const bounds=focusedBuilding?.bounds||tile?.bounds||{min:[-(plan?.half[0]||10.24)-.55,-(plan?.half[1]||8.32)-.48],max:[(plan?.half[0]||10.24)+.55,(plan?.half[1]||8.32)+.48]};let extent=0;
  for(const x of [bounds.min[0],bounds.max[0]])for(const y of [focusedBuilding?floor.position.y:-1.1,maxY])for(const z of [bounds.min[1],bounds.max[1]]){const p=new THREE.Vector3(x,y,z).project(camera);extent=Math.max(extent,Math.abs(p.x),Math.abs(p.y));}
  camera.zoom=1/(extent*(tile?1.02:1.09));camera.updateProjectionMatrix();dirty=true;render();return tile?tile.name+' · '+tile.description:'';
 }
 function resize(){const r=host.getBoundingClientRect();if(!r.width||!r.height)return;renderer.setSize(r.width,r.height);const a=r.width/r.height;camera.left=-10*a;camera.right=10*a;camera.top=10;camera.bottom=-10;camera.updateProjectionMatrix();view(viewName,false);}
 function widgetSnapshots(value,buildingId){
  if(showcase)throw Error('再生中の画像はウィジェットに使用できません');
  const saved={progress,viewName,position:camera.position.clone(),target:controls.target.clone(),zoom:camera.zoom};
  const capture=()=>{render();const source=renderer.domElement,canvas=document.createElement('canvas'),scale=Math.min(1,512/Math.max(source.width,source.height));canvas.width=Math.max(1,Math.round(source.width*scale));canvas.height=Math.max(1,Math.round(source.height*scale));canvas.getContext('2d').drawImage(source,0,0,canvas.width,canvas.height);return canvas.toDataURL('image/png');};
  try{
   setProgress(value);view('home');const town=capture();
   if(buildingId){setShowcase(buildingId);setProgress(value);}
   return{town,building:buildingId?capture():town};
  }finally{
   setShowcase(null);setProgress(saved.progress);viewName=saved.viewName;controls.target.copy(saved.target);camera.position.copy(saved.position);camera.zoom=saved.zoom;camera.lookAt(controls.target);controls.update();camera.updateProjectionMatrix();dirty=true;render();
  }
 }
 new ResizeObserver(resize).observe(host);controls.addEventListener('change',()=>dirty=true);resize();
 function setLook(value){lookMode=clamp(Math.round(Number(value)||0),0,2);lights();setProgress(progress);}
 function setColor(value){colorStrength=clamp(Number(value)||0,0,1);looks.setColor(colorStrength);lights();render();}
 const life=()=>({clothes:lifePlan?.config.clothes,workers:actors.map(a=>({label:a.options.label,action:a.action,item:a.options.item,building:a.building,visible:a.g.visible,position:a.g.position.toArray()})),animals:pets.map(a=>({type:a.type,label:a.label,action:a.action,building:a.building,visible:a.g.visible,position:a.g.position.toArray()})),notes:lifePlan?.notes||[]});
 return{widgetSnapshots,build,setProgress,setShowcase,view,render,setLook,setColor,life,setMotion:v=>{motion=!!v;last=null;},setEvening:v=>{evening=!!v;lights();render();},snapshot:()=>{render();return renderer.domElement.toDataURL('image/png');},advance:seconds=>{if(motion)elapsed+=seconds;render();},stats:()=>({id:plan?.id,seed:plan?.seed,progress,signature:plan?.signature,walkBudget:plan?.walkBudget,tiles:plan?.tiles.map(t=>({...t,progress:clamp(progress*4-t.index,0,1)})),look:lookMode,color:colorStrength,camera:{position:camera.position.toArray(),target:controls.target.toArray(),zoom:camera.zoom},buildings:buildings.map(b=>({id:b.id,kind:b.kind,name:b.name,district:b.district,progress:b.progress,position:[b.x,b.base,b.z],scale:b.g.scale.toArray(),cells:countsAt(b.bp.counts,b.progress*4800).reduce((a,b)=>a+b,0),total:b.bp.cells.length,connected:b.entrance.connected})),trees:vegetation.filter(v=>v.kind==='trees').reduce((n,v)=>n+v.mesh.count,0),plants:vegetation.filter(v=>v.kind==='plants').reduce((n,v)=>n+v.mesh.count,0),totalPlants:plan?.plants.length,residents:actors.filter(a=>a.g.visible).map(a=>a.g.position.toArray()),life:life(),boats:boats.filter(b=>b.g.visible).map(b=>b.g.position.toArray()),trains:train.filter(t=>t.g.visible).map(t=>t.g.position.toArray()),motion,elapsed,evening,drawCalls:renderer.info.render.calls,triangles:renderer.info.render.triangles,geometries:renderer.info.memory.geometries}),plan:()=>plan};
}
