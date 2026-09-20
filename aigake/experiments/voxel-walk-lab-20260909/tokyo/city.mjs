import {workshop} from '../content/kit.mjs';
import {tokyoBlueprint} from '../content/tokyo.mjs';
import {ROUTES} from './model.mjs';

// World-space dimensions are shared by the track, bogies and clearance tests.
export const RAIL={a:8.4,b:6.6,r:2.2,gauge:.4,bedWidth:1.02,top:.34};
export const CAR={length:1.40,width:.54,bogie:.86,spacing:1.58,count:3};
export const loopLength=(rail=RAIL)=>4*(rail.a+rail.b-2*rail.r)+2*Math.PI*rail.r;
export const LOOP_LENGTH=loopLength();
const wrap=(n,max)=>((n%max)+max)%max;

// Start on the front straight and follow the same continuous path on every lap.
export function railPoint(distance,rail=RAIL){
  let s=wrap(distance,loopLength(rail));
  const {a,b,r}=rail,ax=a-r,bz=b-r,straightX=2*ax,straightZ=2*bz,arc=Math.PI*r/2;
  const pieces=[
    [straightX,t=>[-ax+t,b,1,0]],
    [arc,t=>{const q=Math.PI/2-t/r;return[ax+r*Math.cos(q),bz+r*Math.sin(q),Math.sin(q),-Math.cos(q)];}],
    [straightZ,t=>[a,bz-t,0,-1]],
    [arc,t=>{const q=-t/r;return[ax+r*Math.cos(q),-bz+r*Math.sin(q),Math.sin(q),-Math.cos(q)];}],
    [straightX,t=>[ax-t,-b,-1,0]],
    [arc,t=>{const q=-Math.PI/2-t/r;return[-ax+r*Math.cos(q),-bz+r*Math.sin(q),Math.sin(q),-Math.cos(q)];}],
    [straightZ,t=>[-a,-bz+t,0,1]],
    [arc,t=>{const q=-Math.PI-t/r;return[-ax+r*Math.cos(q),bz+r*Math.sin(q),Math.sin(q),-Math.cos(q)];}],
  ];
  for(const [length,point]of pieces){if(s<=length){const[x,z,tx,tz]=point(s);return{x,z,tx,tz,nx:-tz,nz:tx,yaw:-Math.atan2(tz,tx)};}s-=length;}
  throw Error('Invalid railway distance');
}
export function carPose(distance,rail=RAIL){
  const rear=railPoint(distance-CAR.bogie/2,rail),front=railPoint(distance+CAR.bogie/2,rail);
  return{x:(front.x+rear.x)/2,z:(front.z+rear.z)/2,yaw:-Math.atan2(front.z-rear.z,front.x-rear.x),bogies:[rear,front]};
}
export function railDistance(x,z,rail=RAIL){
  const qx=Math.abs(x)-(rail.a-rail.r),qz=Math.abs(z)-(rail.b-rail.r);
  return Math.abs(Math.hypot(Math.max(qx,0),Math.max(qz,0))+Math.min(Math.max(qx,qz),0)-rail.r);
}
export function insideLoop(x,z,margin=0,rail=RAIL){
  const qx=Math.abs(x)-(rail.a-rail.r),qz=Math.abs(z)-(rail.b-rail.r);
  return Math.hypot(Math.max(qx,0),Math.max(qz,0))+Math.min(Math.max(qx,qz),0)<rail.r-margin;
}

export function stationBlueprint(seed=741){
  const k=workshop('tokyo',seed),{box,paint,C}=k;
  box(-28,0,-7,28,0,9,'#bfc1ba',0);
  box(-27,1,-6,27,2,9,'#b2b7b4',0);
  for(const x of [-24,-8,8,24])box(x,3,-3,x,16,-3,'#78817f',1);
  for(const x of [-24,24])box(x,3,6,x,16,6,'#78817f',1);
  box(-25,15,-3,25,15,-3,'#78817f',1);
  k.roof(0,1,55,13,16,1,'flat','#909b98',0);
  // Platform edge faces the loop. Wide treads on the right reach the inner city.
  paint(-27,3,8,27,3,8,'#d2bd77',3);
  for(let i=0;i<3;i++)box(28+i*5,0,-3,32+i*5,2-i,3,C.trim,0);
  k.bench(-17,3,0,9);k.bench(10,3,0,9);
  for(const x of [-8,8])box(x,3,-5,x+1,8,-4,'#778d84',3);
  k.sign(-17,11,-3,9,3);for(const x of [-20,-14])box(x,14,-3,x,16,-3,'#78817f',1);
  k.accessPoint(26,3,0,'station entrance');
  k.opening('platform','環状線に面した開放ホーム');
  const bp=k.finish('tokyo-station-loop');bp.audit.entrances[0].normal=[1,0];return bp;
}

export function infillBlueprint({floors=3,w=17,d=15,tone=0},seed=41){
  const k=workshop('tokyo',seed),{C,box,paint}=k,h=floors*10+2,hx=Math.floor(w/2),hz=Math.floor(d/2);
  const walls=['#c8c5bc','#aaaead','#d2ccbf','#aab8b6','#bcb3a9','#b4babe'],accent=['#899e8e','#b58e77','#818e9d','#c1b49a'][tone%4];
  k.house({w,d,h,floors,rise:1,shape:'flat',color:walls[tone%walls.length],roofColor:'#a2aaa6',roofOverhang:0,foundationMargin:0,windows:false});
  for(let f=0;f<floors;f++){
    const y=4+f*10;
    for(const z of [-hz,hz])for(let x=-hx+2;x<=hx-2;x++){
      if(f===0&&z>0&&Math.abs(x)<=3)continue;
      if((x+hx)%5!==0)paint(x,y,z,x,y+4,z,f===0?'#9eafb0':'#a7bfbe',3);
    }
    for(const x of [-hx,hx])for(let z=-hz+2;z<=hz-2;z++)if((z+hz)%5!==0)paint(x,y,z,x,y+4,z,'#acbebc',3);
    for(const z of [-hz,hz])paint(-hx+1,y+5,z,hx-1,y+5,z,tone%2?C.trim:'#969f9c',3);
  }
  // Small attached shop fascia and supported rooftop air conditioning.
  if(floors<=4){box(-hx+1,10,hz+1,hx-1,12,hz+1,accent,3);for(let x=-hx+3;x<hx-1;x+=3)paint(x,11,hz+1,x+1,11,hz+1,C.trim,3);}
  box(-hx+2,h+2,-hz+2,-hx+6,h+4,-hz+5,'#929a96',3);
  for(const x of [-hx+3,-hx+5])paint(x,h+5,-hz+2,x,h+5,-hz+3,C.trim,3);
  box(hx-4,h+2,hz-5,hx-1,h+3,hz-2,'#b8bcb4',3);
  // Recolor structural beams to concrete/metal instead of timber.
  for(const c of k.v.list())if(c.color===C.wood||c.color===C.woodLight)k.put(c.x,c.y,c.z,'#919b97',c.phase,true);
  return k.finish('tokyo-infill');
}

export const STATION={x:-2.55,z:5.44,u:.09};
export function footprint(entry){
  const {bounds:b}=entry.bp,{x,z,u}=entry;
  return{min:[x+(b.min[0]-.5)*u,z+(b.min[2]-.5)*u],max:[x+(b.max[0]+.5)*u,z+(b.max[2]+.5)*u]};
}
export function overlap(a,b,margin=.12){return a.min[0]<b.max[0]+margin&&a.max[0]>b.min[0]-margin&&a.min[1]<b.max[1]+margin&&a.max[1]>b.min[1]-margin;}
export function cityPlan(route='center',seed=741){
  const sites=route==='center'?[STATION,{x:-1.25,z:-1.65,u:.10},{x:3.3,z:-1.35,u:.105}]:[{x:-4.8,z:-1.2,u:.09},{x:-1.65,z:-1.7,u:.095},{x:3.15,z:-1.6,u:.09}];
  const buildings=ROUTES[route].ids.map((id,slot)=>({id:'main-'+slot,kind:id,slot,main:true,...sites[slot],bp:id==='tokyo-station'?stationBlueprint(seed):tokyoBlueprint(id,seed+slot*101)}));
  if(route==='street')buildings.push({id:'station',kind:'tokyo-station',slot:0,main:false,...STATION,bp:stationBlueprint(seed)});
  const candidates=[
    [-5.7,-4.1,3,18,17],[-3.45,-4.2,5,17,15],[-1.15,-4.25,6,17,15],[1.2,-4.25,4,17,15],[3.5,-4.4,5,18,17],[6.2,-4.25,3,17,17],
    [-5.7,-1.55,4,18,17],[-5.7,.75,3,18,15],[6,-1.1,4,13,17],[6,1.45,2,15,15],
    [-4.4,2.5,2,17,15],[-2.15,2.5,3,17,15],[.15,2.5,2,17,15],[2.45,2.5,4,17,15],[4.75,3.6,2,17,15],
  ];
  for(const [i,[x,z,floors,w,d]]of candidates.entries()){
    const bp=infillBlueprint({floors:route==='street'?Math.max(2,floors-1):floors,w,d,tone:i},seed+i*31);
    const entry={id:'infill-'+i,kind:'tokyo-infill',slot:i%3,main:false,x,z,u:.10,bp},rect=footprint(entry);
    if(buildings.some(b=>overlap(rect,footprint(b),.20)))continue;
    if(![rect.min,[rect.min[0],rect.max[1]],rect.max,[rect.max[0],rect.min[1]]].every(([x,z])=>insideLoop(x,z,.79)))continue;
    buildings.push(entry);
  }
  return{route,buildings,station:buildings.find(b=>b.kind==='tokyo-station'),treeCount:0};
}

export function buildProgress(entry,completed,progress){
  if(entry.slot<completed)return 1;if(entry.slot>completed)return 0;
  if(entry.main)return progress;
  const offset=entry.id==='station'?0:Number(entry.id.split('-')[1])%3*.055;
  return Math.max(0,Math.min(1,(progress-offset)/(1-offset)));
}

export function pavementColor(x,z){
  const ring=railDistance(x,z);
  if(ring<.58)return '#9b9c98';
  const main=Math.abs(z-1.15)<.53&&x>-4.5&&x<5;
  const stationRoad=Math.abs(z-4)<.31&&x>-6&&x<3.7;
  if(main||stationRoad){
    if(main&&Math.abs(x)<.5&&Math.floor((z+.02)*12)%2===0)return '#e2e0d4';
    if(stationRoad&&x>-.7&&x<.2&&Math.floor(z*12)%2===0)return '#e2e0d4';
    return '#858c8d';
  }
  return '#c5c6bf';
}
