import {turn} from './town-plan.mjs';
import {hash} from '../model.mjs';

export const LAUNDRY_HOMES=new Set(['farmhouse','canal-home','harbor-inn','mountain-lodge','trail-refuge','ryokan']);
const distance=(a,b)=>Math.hypot(a[0]-b[0],a[2]-b[2]);
export function routeLength(route){return route.slice(1).reduce((sum,p,i)=>sum+distance(p,route[i]),0);}
export function routePoint(route,fraction){
 let remaining=routeLength(route)*Math.max(0,Math.min(1,fraction));
 for(let i=1;i<route.length;i++){
  const a=route[i-1],b=route[i],length=distance(a,b);
  if(remaining<=length||i===route.length-1){const t=length?remaining/length:0;return{position:a.map((v,j)=>v+(b[j]-v)*t),yaw:Math.atan2(b[0]-a[0],b[2]-a[2])};}remaining-=length;
 }
 return{position:route[0],yaw:0};
}
export function makeDomesticPlan(plan,life){
 const chimneys=[],laundry=[],notes=[],reserved=[...life.zones];
 for(const [building,b]of plan.buildings.entries()){
  for(const c of b.bp.audit?.chimneys||[]){
   // Snow and later roof edits may add surface cells over a vent. Use the
   // actual highest cell at this chimney, never a guessed roof coordinate.
   const top=Math.max(c.top,...b.bp.cells.filter(v=>Math.abs(v.x-c.x)<=c.width/2&&Math.abs(v.z-c.z)<=c.width/2).map(v=>v.y+.5));
   const [x,z]=turn(c.x*b.u,c.z*b.u,b.rot);chimneys.push({building,x:b.x+x,y:b.y+top*b.u,z:b.z+z,kind:b.kind});
  }
  if(!LAUNDRY_HOMES.has(b.kind)||plan.id==='snow')continue;
  const blocked=(x,z,r)=>reserved.some(q=>Math.hypot(q.x-x,q.z-z)<q.r+r+.08);
  const free=(x,z,r=.18)=>life.clear(x,z,r)&&!blocked(x,z,r);
  const start=[...b.entrance.outside],front=[start[0]-b.x,start[1]-b.z],length=Math.hypot(...front)||1;
  const direction=[start[0]-b.entrance.start[0],start[1]-b.entrance.start[1]],directionLength=Math.hypot(...direction)||1;
  for(let n=0;n<6&&!free(...start);n++){start[0]+=direction[0]/directionLength*.10;start[1]+=direction[1]/directionLength*.10;}
  const candidates=[];
  for(let ix=-12;ix<=12;ix++)for(let iz=-12;iz<=12;iz++){
   const x=b.x+ix*.32,z=b.z+iz*.32,r=.9;
   if(!free(x,z,r)||[[0,0],[r,0],[-r,0],[0,r],[0,-r]].some(([a,c])=>plan.onPath(x+a,z+c)))continue;
   // A side yard, never a clothesline in front of the entrance.
   const projection=((x-b.x)*front[0]+(z-b.z)*front[1])/length;
   const side=Math.abs((x-b.x)*front[1]-(z-b.z)*front[0])/length;
   if(side<1.2||projection>length*.7)continue;
   candidates.push({x,z,r,y:plan.surface(x,z),score:Math.hypot(x-start[0],z-start[1])});
  }
  candidates.sort((a,b)=>a.score-b.score);
  function pathTo(end){
   const step=.25,key=(i,j)=>i+','+j,queue=[[0,0]],seen=new Map([[key(0,0),null]]);
   const point=([i,j])=>[start[0]+i*step,plan.surface(start[0]+i*step,start[1]+j*step),start[1]+j*step];
   const segment=(a,b)=>{const n=Math.ceil(distance(a,b)/.10);for(let i=0;i<=n;i++){const t=n?i/n:0,x=a[0]+(b[0]-a[0])*t,z=a[2]+(b[2]-a[2])*t;if(!free(x,z)||Math.abs(plan.surface(x,z)-a[1])>.08)return false;}return true;};
   for(let cursor=0;cursor<queue.length&&cursor<4500;cursor++){
    const ij=queue[cursor],p=point(ij);
    if(distance(p,end)<.4&&segment(p,end)){
     const result=[end];let at=ij;while(at){result.push(point(at));at=seen.get(key(...at));}return result.reverse();
    }
    for(const [di,dj]of [[1,0],[-1,0],[0,1],[0,-1]]){
     const next=[ij[0]+di,ij[1]+dj],k=key(...next);if(seen.has(k)||Math.abs(next[0])>40||Math.abs(next[1])>40)continue;
     if(segment(p,point(next))){seen.set(k,ij);queue.push(next);}
    }
   }
   return null;
  }
  let chosen;
  for(const site of candidates.slice(0,8)){
   const route=pathTo([site.x,site.y,site.z+.24]);if(!route)continue;
   // Follow the actual threshold/porch tops, not the ground underneath them.
   const door=b.bp.audit.entrances.find(e=>e.access==='ground')||b.bp.audit.entrances[0],doorFloor=b.y+((door?.y??2)-.5)*b.u;
   const begin=b.entrance.start,steps=Math.ceil(Math.hypot(start[0]-begin[0],start[1]-begin[1])/.12),approach=[];
   for(let i=0;i<steps;i++){
    const t=i/steps,x=begin[0]+(start[0]-begin[0])*t,z=begin[1]+(start[1]-begin[1])*t,[lx,lz]=turn(x-b.x,z-b.z,-b.rot);
    const floor=b.bp.cells.filter(c=>Math.abs(c.x*b.u-lx)<=b.u*.51&&Math.abs(c.z*b.u-lz)<=b.u*.51&&b.y+(c.y+.5)*b.u<=doorFloor+.001);
    approach.push([x,Math.max(plan.surface(x,z),...floor.map(c=>b.y+(c.y+.5)*b.u)),z]);
   }
   route.unshift(...approach);
   chosen={...site,building,route,approachCount:approach.length,offset:hash(plan.seed,building,911)*.7};break;
  }
  if(chosen){laundry.push(chosen);reserved.push(chosen);}
  else notes.push(b.kind+': no accessible side yard for laundry');
 }
 // Remove ground plants from the route and yard before creating their meshes.
 plan.plants=plan.plants.filter(p=>!laundry.some(q=>Math.hypot(p.x-q.x,p.z-q.z)<q.r+.2||q.route.some(v=>Math.hypot(p.x-v[0],p.z-v[2])<.35)));
 return{chimneys,laundry,notes};
}
