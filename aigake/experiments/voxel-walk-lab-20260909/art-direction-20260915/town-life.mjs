import * as THREE from 'three';
import {createActor,ACTORS} from '../life/actors.mjs';
import {REGION_LIFE,regionalWorkers,regionalFamily} from './region-life.mjs';
import {inRect} from './town-plan.mjs';
import {insideLoop} from '../tokyo/city.mjs';
import {crossingWalkers,SHIBUYA_CROSSING} from './tokyo-activity.mjs';

const distance=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z);
export function makeLifePlan(plan){
 const config=REGION_LIFE[plan.id],zones=[],workers=[],animals=[],fixtures=[],notes=[];
 if(plan.id==='tokyo')zones.push({...SHIBUYA_CROSSING,y:.34,r:2.65,mode:'land',building:0});
 const obstacles=plan.boxes.filter(b=>!['land','base','water','bridge','pier'].includes(b.kind));
 const ownerFor=kind=>Math.max(0,plan.buildings.findIndex(b=>b.kind===kind));
 function clear(x,z,r,mode='land'){
  const sea=['water','sea-air'].includes(mode),y=sea?plan.waterY:plan.surface(x,z);
  for(let i=0;i<17;i++){
   const angle=i/16*Math.PI*2,xx=x+(i===16?0:Math.cos(angle)*r),zz=z+(i===16?0:Math.sin(angle)*r);
   if(!plan.inside(xx,zz))return false;
   if(sea){if(!plan.wet(xx,zz)||plan.deck(xx,zz)!==null)return false;}
   else if(plan.wet(xx,zz)||Math.abs(plan.surface(xx,zz)-y)>.015)return false;
   if(plan.id==='tokyo'&&!insideLoop(xx,zz,.9,plan.rail))return false;
  }
  if(plan.buildings.some(b=>inRect(x,z,b.bounds,r+.08)))return false;
  if(obstacles.some(b=>Math.abs(b.x-x)<b.w/2+r&&Math.abs(b.z-z)<b.d/2+r&&b.y+b.h/2>y+.04))return false;
  if(plan.trees.some(t=>Math.hypot(t.x-x,t.z-z)<r+.28))return false;
  return true;
 }
 function findZone(building,r,mode='land',avoidRoad=false,widePathClearance=false){
  const b=plan.buildings[building],anchor=b.entrance.outside;let best=null;
  const limit=plan.id==='tokyo'?plan.half.map(h=>Math.floor((h-.8)/.32)):[28,22];
  for(let ix=-limit[0];ix<=limit[0];ix++)for(let iz=-limit[1];iz<=limit[1];iz++){
   const x=ix*.32,z=iz*.32;
   if(zones.some(q=>Math.hypot(q.x-x,q.z-z)<q.r+r+.12)||!clear(x,z,r,mode))continue;
   if(avoidRoad&&[[0,0],[-r,0],[r,0],[0,-r],[0,r]].some(([dx,dz])=>plan.onPath(x+dx,z+dz)))continue;
   // A large animal's turning space can straddle a path between the five
   // usual samples. Check the whole disk, with margin for the sample spacing.
   if(widePathClearance){
    let blocked=false;
    for(let dx=-r-.08;dx<=r+.08&&!blocked;dx+=.16)for(let dz=-r-.08;dz<=r+.08;dz+=.16){
     if(Math.hypot(dx,dz)<=r+.10&&plan.onPath(x+dx,z+dz)){blocked=true;break;}
    }
    if(blocked)continue;
   }
   const score=Math.hypot(x-anchor[0],z-anchor[1])+(z< b.z?1.4:0);
   if(!best||score<best.score)best={x,z,y:['water','sea-air'].includes(mode)?plan.waterY:plan.surface(x,z),r,mode,score,building};
  }
  if(best)zones.push(best);return best;
 }
 function fixture(zone,boxes){fixtures.push({building:zone.building,boxes});}
 const box=(x,y,z,w,h,d,color)=>({x,y,z,w,h,d,color,kind:'life'});
 function pen(zone,type,count){
  const {x,y,z}=zone,w=zone.r===1.9?3.10:zone.r<1.5?1.65:2.1,d=zone.r<1.5?1.65:2.15,wood=plan.p.palette.wood,parts=[];
  for(const sx of [-1,1])for(const sz of [-1,1])parts.push(box(x+sx*w/2,y+.30,z+sz*d/2,.065,.6,.065,wood));
  for(const height of [.22,.46]){
   for(const sx of [-1,1])parts.push(box(x+sx*w/2,y+height,z,.045,.045,d,wood));
   parts.push(box(x,y+height,z-d/2,w,.045,.045,wood));
   for(const sx of [-1,1])parts.push(box(x+sx*(w+.62)/4,y+height,z+d/2,(w-.62)/2,.045,.045,wood));
  }
  for(const sx of [-1,1])parts.push(box(x+sx*.31,y+.3,z+d/2,.065,.6,.065,wood));
  const h=type==='reindeer'?.50:type==='goat'?.33:.28,tw=count>1?1.95:.95,tz=z+.67;
  for(const sx of [-1,1])for(const sz of [-1,1])parts.push(box(x+sx*(tw/2-.08),y+(h-.08)/2,tz+sz*.1,.05,h-.08,.05,wood));
  parts.push(box(x,y+h-.06,tz,tw,.06,.29,wood),box(x,y+h-.018,tz,tw-.07,.025,.20,'#b3ad74'));
  for(const sz of [-1,1])parts.push(box(x,y+h-(sz<0?.038:.015),tz+sz*.15,tw,sz<0?.055:.1,.035,wood));
  fixture(zone,parts);zone.pen={width:w,depth:d};
  for(let i=0;i<count;i++)animals.push({type,building:zone.building,zone,x:x+(count>1?(i?1:-1)*.65:0),y,z:z-.12,span:zone.r<1.5?.10:.18,mode:'pen',phase:i*1.9});
 }
 for(const def of config.animals){
  const building=ownerFor(def.kind);
  if(def.mode==='pen'){
   let zone=findZone(building,1.9,'land',true),count=def.count;
   if(!zone){zone=findZone(building,1.55,'land',true);count=1;}
   if(!zone){zone=findZone(building,1.2,'land',true);count=1;}
   if(zone)pen(zone,def.type,count);else notes.push(def.type+': no clear paddock');
   continue;
  }
  for(let i=0;i<def.count;i++){
   const r=def.type==='camel'?1.3:def.type==='dog'?.70:def.type==='cat'?.56:def.type==='turtle'?.58:def.type==='gull'?.6:.45,zone=findZone(building,r,def.mode,def.type==='camel',def.type==='camel');
   if(!zone){notes.push(def.type+': no clear habitat');continue;}
   let y=zone.y;
   if(def.mode==='perch'){fixture(zone,[box(zone.x,y+.38,zone.z,.11,.76,.11,plan.p.palette.wood),box(zone.x,y+.78,zone.z,.3,.04,.22,plan.p.palette.wood)]);y+=.8;}
   else if(['air','sea-air'].includes(def.mode))y+=def.mode==='sea-air'?1.15:.72;
   else if(def.mode==='water')y-=def.type==='duck'?.038:.055;
   animals.push({type:def.type,building,zone,x:zone.x,y,z:zone.z,span:def.mode==='perch'?0:def.type==='camel'?.35:.20,mode:def.mode,phase:i*2.2});
  }
 }
 for(const [index,def] of regionalWorkers(plan.id).entries()){
  const building=ownerFor(def.kind),b=plan.buildings[building];
  const paddock=def.action==='care'?zones.find(z=>z.building===building&&z.pen):null;
  if(paddock){
   const gate=paddock.z+paddock.pen.depth/2,stop=Math.max(gate+.04,paddock.z+1.10),route=[.46,.23,0].map(offset=>[paddock.x,paddock.y,stop+offset]);
   // Approach the opening while leaving stride clearance before the trough.
   // The gate is wider than the clothed person's shoulders and hands.
   if(route.every(([x,,z])=>clear(x,z,.20))){const zone={x:paddock.x,y:paddock.y,z:stop+.23,r:.46,mode:'land',building,gate:true};zones.push(zone);workers.push({route,index,building,options:def,zone});continue;}
  }
  let zone=findZone(building,.85);
  if(!zone)zone=findZone(building,.48);
  if(!zone){notes.push(def.label+': no clear work area');continue;}
  const dx=b.entrance.outside[0]-b.x,dz=b.entrance.outside[1]-b.z,yaw=Math.abs(dx)>Math.abs(dz)?Math.sign(dx)*Math.PI/2:dz<0?Math.PI:0,sx=Math.sin(yaw),sz=Math.cos(yaw),span=zone.r>.5?.35:.11;
  const route=[-span,0,span].map(d=>[zone.x+sx*d,zone.y,zone.z+sz*d]);
  const end=route.at(-1),px=end[0]+sx*.36,pz=end[2]+sz*.36,wood=plan.p.palette.wood,parts=[];
  if(zone.r>.5){
   if(def.action==='water')parts.push(box(px,zone.y+.09,pz,.20,.18,.20,'#ab7e5f'),box(px,zone.y+.23,pz,.025,.15,.025,'#698159'),box(px,zone.y+.30,pz,.17,.08,.14,plan.p.palette.leaf));
   if(def.item==='firewood')for(const offset of [-.10,0,.10])parts.push(box(px+offset,zone.y+.075,pz,.09,.15,.27,wood));
   if(def.item==='parcel'||def.item==='basket'&&def.action==='work')parts.push(box(px,zone.y+.1,pz,.27,.2,.25,'#b18d63'),box(px,zone.y+.205,pz,.035,.01,.255,'#e0cea8'));
   if(def.action==='shovel')parts.push(box(px,zone.y+.035,pz,.28,.07,.24,'#dce3e6'));
  }
  if(parts.length)fixture(zone,parts);
  workers.push({route,index,building,options:def,zone});
 }
 // A parent and child share a clear walking area and the same travel clock.
 // Parallel routes keep them together without ever passing through each other.
 const homeKinds=['mushroom-house','canal-home','farmhouse','harbor-inn','mountain-lodge','ryokan','caravanserai','island-cabin','tokyo-residence'];
 const home=Math.max(0,plan.buildings.findIndex(b=>homeKinds.includes(b.kind)));
 const familyZone=findZone(home,1.15)||findZone(home,.9);
 if(familyZone){
  const span=familyZone.r>1?.6:.36;
  for(const [i,options]of regionalFamily(plan.id,plan.seed).entries()){
   const route=[-span,0,span].map(d=>[familyZone.x+(i?1:-1)*.32,familyZone.y,familyZone.z+d]);
   workers.push({route,index:workers.length,building:home,options,zone:familyZone});
  }
 }else notes.push('family: no clear walking area');
 // Reserve movement areas before vegetation instances are built. Airborne
 // wildlife keeps the flowers below it; other routes have visible footing.
 const cleared=zones.filter(z=>!['air','sea-air','water','perch'].includes(z.mode));
 plan.plants=plan.plants.filter(p=>!cleared.some(z=>Math.hypot(p.x-z.x,p.z-z.z)<z.r+.28));
 workers.push(...crossingWalkers(plan,workers.length));
 return{workers,animals,fixtures,zones,notes,config,clear};
}

export function createLifeAnimal(def,index,seed){
 const rig=createActor(def.type,{seed:seed+index*31}),g=rig.root;
 g.position.set(def.x,def.y,def.z);g.name='animal-'+index;
 const route=[[def.x,def.y,def.z-def.span],[def.x,def.y,def.z],[def.x,def.y,def.z+def.span]];
 return{...def,rig,g,index,route,label:ACTORS[def.type],action:'idle',distance:0};
}
export function updateLifeAnimal(a,elapsed){
 const speed=a.type==='turtle'?.035:.10,length=a.span*2,wait=a.type==='camel'?6:a.mode==='pen'?7:3,travel=length/speed,cycle=travel*2+wait*2,time=(elapsed+a.phase)%cycle;
 const back=time>=travel+wait,moving=a.span>0&&(time<travel||back&&time<travel*2+wait),s=time<travel?time*speed:!back?length:time<travel*2+wait?length-(time-travel-wait)*speed:0;
 a.distance=Math.floor((elapsed+a.phase)/cycle)*length*2+(time<travel?s:!back?length:time<travel*2+wait?length+(length-s):length*2);
 a.g.position.set(a.x,a.y,a.z-a.span+s);a.g.rotation.y=back?Math.PI:0;
 a.action=a.mode==='water'?'swim':['air','sea-air'].includes(a.mode)?'fly':!moving&&(a.mode==='pen'||['bird','pigeon'].includes(a.type))?'eat':!moving&&['cat','camel'].includes(a.type)?'rest':moving?'walk':'idle';
 if(a.type==='camel'){
  const turn=back?(time-travel*2-wait):time-travel,u=Math.max(0,Math.min(1,(turn-wait+1.8)/1.8));
  a.g.rotation.y=(back?Math.PI:0)+Math.PI*u*u*(3-2*u);
 }
 if(a.mode==='pen'&&!moving)a.g.rotation.y=0;
 a.rig.pose(elapsed,{moving,distance:a.distance,action:a.action});
 if(['air','sea-air'].includes(a.mode))a.g.position.y+=Math.sin(elapsed*1.3+a.phase)*.045;
 a.moving=moving;
}
