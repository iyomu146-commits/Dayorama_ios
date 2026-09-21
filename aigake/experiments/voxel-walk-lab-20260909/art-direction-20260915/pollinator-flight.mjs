import {turn} from './town-plan.mjs';
import {vegetationShape,vegetationHitsBox} from './vegetation-layout.mjs';
const distance=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z);
const lerp=(a,b,t)=>a.map((v,i)=>v+(b[i]-v)*t);
export function flightClearance(plan,point,r=.19){
 const [x,y,z]=point,low=y-.025,high=y+.19;
 for(const b of plan.buildings){
  if(x<b.bounds.min[0]-r||x>b.bounds.max[0]+r||z<b.bounds.min[1]-r||z>b.bounds.max[1]+r)continue;
  const [lx,lz]=turn(x-b.x,z-b.z,-b.rot),half=b.u/2;
  if(b.bp.cells.some(c=>b.y+c.y*b.u+half>low&&b.y+c.y*b.u-half<high&&Math.hypot(Math.max(0,Math.abs(c.x*b.u-lx)-half),Math.max(0,Math.abs(c.z*b.u-lz)-half))<r))return false;
 }
 return !plan.boxes.some(b=>b.y+b.h/2>low&&b.y-b.h/2<high&&Math.hypot(Math.max(0,Math.abs(b.x-x)-b.w/2),Math.max(0,Math.abs(b.z-z)-b.d/2))<r);
}
export function flowerFlights(plan,building,count,clear,zones){
 const b=plan.buildings[building],anchor={x:b.entrance.outside[0],z:b.entrance.outside[1]};
 // Hover at the front edge of each flower, clear of the taller row behind it.
 const heads=(b.bp.audit.flowerHeads||[]).map(f=>{const [x,z]=turn(f.x*b.u,f.z*b.u+.10,b.rot);return{x:b.x+x,z:b.z+z,y:b.y+f.y*b.u+.065,birth:0,shop:true};});
 const flowers=[...heads,...plan.plants.filter(p=>p.kind.startsWith('wildflower-')&&distance(p,anchor)<5&&clear(p.x,p.z,.27)).map(p=>({...p,y:p.y+(Math.max(...plan.prototypes[p.kind].map(v=>v.y))+1)*p.u+.065}))];
 const trees=plan.trees.map(t=>({...t,shape:vegetationShape(plan.treePrototypes[t.variant],t.u)}));
 const safe=point=>flightClearance(plan,point)&&!trees.some(t=>vegetationHitsBox(t,{min:[point[0]-.19,point[1]-.025,point[2]-.19],max:[point[0]+.19,point[1]+.19,point[2]+.19]}));
 flowers.sort((a,c)=>(a.shop?0:10)+(a.birth>b.end?5:0)+distance(a,anchor)-(c.shop?0:10)-(c.birth>b.end?5:0)-distance(c,anchor));
 const flights=[];
 for(const a of flowers){
  if(flights.length>=count)break;
  for(const c of flowers){
   const d=distance(a,c);if(d<.38||d>1.25)continue;
   const zone={x:(a.x+c.x)/2,z:(a.z+c.z)/2,y:Math.min(a.y,c.y),r:d/2+.27,building,mode:'air'};
   if(zones.some(z=>(z.mode==='air'||zone.y<z.y+.95)&&distance(z,zone)<z.r+zone.r+.05))continue;
   const flight={from:[a.x,a.y,a.z],to:[c.x,c.y,c.z]};
   if(!Array.from({length:73},(_,i)=>i/4).every(t=>safe(flowerFlightPose(flight,t).position)))continue;
   flights.push({type:'butterfly',building,zone,x:a.x,y:a.y,z:a.z,span:0,mode:'air',phase:flights.length*4.7,birth:Math.max(a.birth,c.birth),flight});
   zones.push(zone);break;
  }
 }
 return flights;
}
export function flowerFlightPose(flight,elapsed,phase=0){
 const period=18,time=((elapsed+phase)%period+period)%period,back=time>=9,local=time%9;
 const a=back?flight.to:flight.from,b=back?flight.from:flight.to,dx=b[0]-a[0],dz=b[2]-a[2],length=Math.hypot(dx,dz),yaw=Math.atan2(dx,dz);
 if(local<3){
  const turn=Math.max(0,Math.min(1,local-2)),position=[...a];position[1]+=.008*Math.sin((elapsed+phase)*2);
  return{position,yaw:yaw-Math.PI*(1-turn*turn*(3-2*turn)),bank:0,moving:false,action:'nectar',distance:Math.floor((elapsed+phase)/9)*length};
 }
 const t=(local-3)/6,u=t*t*(3-2*t),position=lerp(a,b,u),arc=Math.sin(Math.PI*u);
 position[0]+=(length?-dz/length:0)*arc*.05;position[2]+=(length?dx/length:0)*arc*.05;position[1]+=arc*.24;
 return{position,yaw,bank:Math.sin(Math.PI*u*2)*.13,moving:true,action:'fly',distance:(Math.floor((elapsed+phase)/9)+u)*length};
}
