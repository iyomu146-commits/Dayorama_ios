import * as THREE from 'three';
import {createActor} from '../life/actors.mjs';
import {regionalWorkers} from './region-life.mjs';
import {laundryState,laundryWork,smokeActivity,smooth} from './town-clock.mjs';
import {routePoint,routeLength} from './town-domestic-plan.mjs';
import {turn} from './town-plan.mjs';
import {windowLighting} from './window-lighting.mjs';

export function createDomestic(root,plan,defs){
 const smoke=[],yards=[],glows=[],pointLights=[],cube=defs.laundry.length?new THREE.BoxGeometry(1,1,1):null,matrix=new THREE.Matrix4();
 function box(group,x,y,z,w,h,d,color){const m=new THREE.Mesh(cube,new THREE.MeshStandardMaterial({color,roughness:.95}));m.userData.ownMaterial=true;m.position.set(x,y,z);m.scale.set(w,h,d);m.castShadow=true;m.receiveShadow=true;group.add(m);return m;}
 const smokeGeometry=defs.chimneys.length?new THREE.IcosahedronGeometry(1,1):null,smokeMaterial=defs.chimneys.length?new THREE.MeshBasicMaterial({color:'#d6d4d0',transparent:true,opacity:.16,depthWrite:false}):null;
 for(const def of defs.chimneys){const mesh=new THREE.InstancedMesh(smokeGeometry,smokeMaterial,7);mesh.frustumCulled=false;mesh.userData.ownMaterial=true;root.add(mesh);smoke.push({...def,mesh});}
 for(const def of defs.laundry){
  const g=new THREE.Group();g.position.set(def.x,def.y,def.z);root.add(g);
  for(const x of [-.64,.64])box(g,x,.40,0,.035,.80,.035,plan.p.palette.wood);
  box(g,0,.77,0,1.30,.012,.012,'#9c9780');
  const cloth=['#ebe3ce','#9eb7bc','#c99a87'].map((color,i)=>{
   const pivot=new THREE.Group();pivot.position.set((i-1)*.34,.77,0);g.add(pivot);box(pivot,0,-.15,0,.24,.30,.016,color);
   for(const x of [-.075,.075])box(pivot,x,-.012,.014,.02,.046,.021,plan.p.palette.wood);
   return pivot;
  });
  const appearance={...regionalWorkers(plan.id)[0].appearance,backpack:false,apron:false,gender:def.building%2?'woman':'man',hairStyle:def.building%2?'ponytail':'short',shirt:'#a18e7f'};
  const rig=createActor('person',{seed:plan.seed+def.building*17,item:'basket',appearance});root.add(rig.root);
  yards.push({...def,g,cloth,rig,trip:Math.max(8,routeLength(def.route)/.35)});
 }
 // Surface-following light pools avoid floating discs on steps or sloped land.
 function pool(x,z,r,owner,window=null){
  const P=[],UV=[],n=8;
  for(let i=0;i<n;i++)for(let j=0;j<n;j++){
   const points=[[i,j],[i+1,j],[i+1,j+1],[i,j],[i+1,j+1],[i,j+1]].map(([a,b])=>[x+(a/n*2-1)*r,z+(b/n*2-1)*r,a/n,b/n]);
   if(points.some(([xx,zz])=>!plan.inside(xx,zz)||plan.wet(xx,zz)))continue;
   points.forEach(([xx,zz,u,v])=>{P.push(xx,plan.surface(xx,zz)+.017,zz);UV.push(u,v);});
  }
  const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(P,3));geometry.setAttribute('uv',new THREE.Float32BufferAttribute(UV,2));
  const material=new THREE.ShaderMaterial({transparent:true,depthWrite:false,uniforms:{uGlow:{value:0}},vertexShader:'varying vec2 vUv; void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}',fragmentShader:'varying vec2 vUv; uniform float uGlow; void main(){float a=pow(max(0.0,1.0-length(vUv-.5)*2.0),2.0)*uGlow*.30; gl_FragColor=vec4(1.0,.69,.32,a);\n#include <colorspace_fragment>\n}'});
  const mesh=new THREE.Mesh(geometry,material);mesh.userData.ownMaterial=true;root.add(mesh);glows.push({mesh,owner,window});
 }
 plan.lamps.forEach((lamp,i)=>{
  pool(lamp.x,lamp.z,1.25,null);
  // Fixed upper bound: no per-window shadow maps or growing light count.
  if(i%Math.max(1,Math.ceil(plan.lamps.length/4))===0&&pointLights.length<4){const light=new THREE.PointLight('#ffd49a',0,3.8,2);light.position.set(lamp.x,lamp.y+1.42,lamp.z);root.add(light);pointLights.push({light,owner:null});}
 });
 for(const [owner,b]of plan.buildings.entries()){
  const pane=b.bp.cells.filter(c=>c.surface===3).sort((a,c)=>c.z-a.z||a.y-c.y)[0];if(!pane)continue;
  const [dx,dz]=turn(pane.x*b.u,pane.z*b.u+.28,b.rot),x=b.x+dx,z=b.z+dz;
  const window=windowLighting(b.bp.cells,plan.seed+Math.round(b.x*100+b.z*37)).get([pane.x,pane.y,pane.z].join(','));
  pool(x,z,.85,owner,window);
  if(pointLights.length<6){const light=new THREE.PointLight('#ffc889',0,2.3,2);light.position.set(x,b.y+(pane.y+1)*b.u,z);root.add(light);pointLights.push({light,owner,window});}
 }
 return{update(clock,elapsed,buildings,{showcase=false,previewLaundry=false}={}){
  const complete=i=>!showcase&&(i===null||buildings[i]?.progress===1);
  for(const s of smoke){
   const strength=smokeActivity(s.kind,plan.id,clock.hour);s.mesh.visible=complete(s.building)&&strength>.02;
   if(!s.mesh.visible)continue;
   for(let i=0;i<7;i++){const t=(elapsed*.075+i/7+s.building*.13)%1,size=(.035+Math.sin(t*Math.PI)*.14)*strength;matrix.makeScale(size,size*.7,size);matrix.setPosition(s.x+t*.45+Math.sin(t*6+s.building)*.025,s.y+.035+t*1.2,s.z+t*.12);s.mesh.setMatrixAt(i,matrix);}s.mesh.instanceMatrix.needsUpdate=true;
  }
  for(const yard of yards){
   const hour=previewLaundry?16.7+yard.offset+Math.min(elapsed,yard.trip*2+19)/3600:clock.hour;
   const activity=laundryState(hour,yard.offset,yard.trip),done=complete(yard.building);yard.g.visible=done;
   yard.cloth.forEach((cloth,i)=>{cloth.visible=activity.cloth>(i+.5)/3;cloth.rotation.x=Math.sin(elapsed*1.4+i)*.07;});
   yard.rig.root.visible=done&&activity.phase!=='idle';
   if(!yard.rig.root.visible)continue;
   const pose=routePoint(yard.route,activity.travel),moving=activity.phase!=='work';
   yard.rig.root.position.set(...pose.position);yard.rig.root.rotation.y=moving?pose.yaw+(activity.phase==='home'?Math.PI:0):Math.PI;
   yard.rig.pose(elapsed,{moving,distance:routeLength(yard.route)*(activity.phase==='home'?2-activity.travel:activity.travel),action:moving?'carry':'laundry'});
   if(!moving){const work=laundryWork(activity.collect?1-activity.cloth:activity.cloth,activity.collect);yard.rig.root.position.x=yard.x+work.x;yard.rig.root.rotation.y=work.moving?work.yaw:Math.PI;yard.rig.pose(elapsed,{moving:work.moving,distance:routeLength(yard.route)+work.distance,action:work.moving?'idle':'laundry'});yard.rig.carry.visible=false;}
  }
  const roomLight=window=>window?smooth(window.switch-.07,window.switch+.07,clock.rooms)*window.strength:1;
  for(const {mesh,owner,window}of glows){mesh.visible=complete(owner)&&clock.lamps>.01;mesh.material.uniforms.uGlow.value=clock.lamps*roomLight(window);}
  for(const {light,owner,window}of pointLights){light.visible=complete(owner);light.intensity=clock.lamps*roomLight(window)*(window?.12:.9);}
 },focus:()=>yards[0],stats:()=>({chimneys:smoke.length,laundry:yards.length,lights:pointLights.length,notes:defs.notes})};
}
