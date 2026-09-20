import {createActor} from '../life/actors.mjs';
import {crossingPhase} from './tokyo-activity.mjs';

const SPEED=.23,PAUSE=.35;

export function createResident(route,index,building,seed,options={}){
 if(route.length<3)return null;
 const lengths=[0];
 for(let i=1;i<route.length;i++)lengths.push(lengths.at(-1)+Math.hypot(route[i][0]-route[i-1][0],route[i][2]-route[i-1][2]));
 if(!lengths.at(-1))return null;
 // Reuse the game's articulated person, including its original skin/clothing
 // material. Landscape saturation and vegetation deformation do not apply.
 const rig=createActor('person',{seed:seed+index*31,item:options.item,appearance:options.appearance}),g=rig.root;
 g.name='resident-'+index;
 const resident={g,rig,route,lengths,building,index,moving:false,distance:0,options,action:'idle'};
 updateResident(resident,0);
 return resident;
}

export function updateResident(a,elapsed){
 if(a.options.crosswalk){
  const phase=crossingPhase(elapsed,a.options.crosswalk.group),start=a.route[0],end=a.route.at(-1);
  a.g.position.set(...start.map((v,i)=>v+(end[i]-v)*phase.t));
  a.g.rotation.y=Math.atan2(end[0]-start[0],end[2]-start[2])+(phase.returning?Math.PI:0);
  a.distance=phase.distance*a.lengths.at(-1);a.moving=phase.moving;a.action='idle';
  a.rig.pose(elapsed,{moving:a.moving,distance:a.distance,action:a.action});return;
 }
 const pause=a.options.workSeconds?SPEED*a.options.workSeconds:PAUSE,length=a.lengths.at(-1),cycle=length*2+pause+PAUSE,total=Math.max(0,elapsed)*SPEED+a.index*.51,raw=total%cycle;
 const returning=raw>=length+pause;
 const s=raw<length?raw:!returning?length:raw<length*2+pause?length*2+pause-raw:0;
 a.moving=raw<length||(returning&&raw<length*2+pause);
 // Pause time must not advance the stride; legs stop when the person stops.
 a.distance=Math.floor(total/cycle)*length*2+(raw<length?raw:!returning?length:raw<length*2+pause?raw-pause:length*2);
 let i=1;while(i<a.lengths.length-1&&a.lengths[i]<s)i++;
 const t=Math.max(0,Math.min(1,(s-a.lengths[i-1])/(a.lengths[i]-a.lengths[i-1]||1))),start=a.route[i-1],end=a.route[i];
 a.g.position.set(start[0]+(end[0]-start[0])*t,start[1]+(end[1]-start[1])*t,start[2]+(end[2]-start[2])*t);
 a.g.rotation.y=Math.atan2(end[0]-start[0],end[2]-start[2])+(returning?Math.PI:0);
 a.action=!a.moving&&!returning?(a.options.action||'idle'):a.options.item?'carry':'idle';
 a.rig.pose(elapsed,{moving:a.moving,distance:a.distance,action:a.action});
}
