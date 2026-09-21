import {completionStep} from './construction.mjs';

export const COMPLETION_HOLD_MS=1600;
export function recapPlayback(recap,plan,townStart){
 const from=Math.max(townStart,recap.from),to=Math.max(from,recap.to),duration=Math.min(9000,Math.max(4000,(to-from)*1.6));
 const stops=plan.buildings.map(b=>({id:b.id,total:townStart+completionStep(b,plan.walkBudget)})).filter(s=>s.total>from&&s.total<=to).sort((a,b)=>a.total-b.total);
 return{from,to,value:from,speed:(to-from)/duration,stops,index:0,hold:0,done:to===from,completed:[]};
}
export function advanceRecap(playback,deltaMs){
 const p={...playback,completed:[]};let remaining=Math.max(0,Number(deltaMs)||0);
 if(!Number.isFinite(remaining))return p;
 while(remaining>0&&!p.done){
  if(p.hold>0){const used=Math.min(remaining,p.hold);p.hold-=used;remaining-=used;if(p.hold>0)break;}
  const stop=p.stops[p.index],target=stop?.total??p.to,needed=(target-p.value)/p.speed;
  if(remaining<needed){p.value+=remaining*p.speed;break;}
  p.value=target;remaining-=needed;
  if(stop){p.completed.push(stop.id);p.index++;p.hold=COMPLETION_HOLD_MS;}
  else p.done=true;
 }
 return p;
}
