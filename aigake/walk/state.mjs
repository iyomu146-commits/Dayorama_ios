import {completionStep} from './construction.mjs';
export const VERSION=1;
export const dayKey=(date=new Date())=>`${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;
export function shiftDay(key,n){const d=new Date(key+'T12:00:00');d.setDate(d.getDate()+n);return dayKey(d);}
export function daysEnding(end,count){return Array.from({length:count},(_,i)=>shiftDay(end,i-count+1));}
const finite=n=>Number.isSafeInteger(n)&&n>=0;
export function initialState(source='health',today=dayKey()){
 return{version:VERSION,source,startDay:today,records:{},total:0,seen:0,lastSync:null,lastDataSync:null,permissionRequested:false,region:'grove',seed:741,townStart:0,album:[],events:[],recap:null,motion:true,construction:null};
}
export function restore(raw,source='health'){
 if(!raw)return initialState(source);
 const s=typeof raw==='string'?JSON.parse(raw):raw;
 if(s.version!==VERSION||s.source!==source||!finite(s.total)||!finite(s.seen)||s.seen>s.total||!finite(s.townStart)||s.townStart>s.total||!s.records||!Array.isArray(s.album)||!Array.isArray(s.events))throw Error('保存データを読み込めません');
 for(const [day,r] of Object.entries(s.records))if(!/^\d{4}-\d{2}-\d{2}$/.test(day)||!finite(r.steps)||!finite(r.credited))throw Error('歩数の保存データを読み込めません');
 if(s.construction){const c=s.construction;if(!finite(c.stepsPerBuilding)||!Array.isArray(c.buildings)||!c.buildings.length||c.buildings.some(b=>typeof b.id!=='string'||!Number.isSafeInteger(b.startStep)||!finite(b.endStep)||b.endStep<=b.startStep))throw Error('建築予定を読み込めません');if(c.sceneryAnchor&&(!(c.sceneryAnchor.before>0&&c.sceneryAnchor.before<=1)||!finite(c.sceneryAnchor.steps)))throw Error('植生の進捗を読み込めません');}
 return{...initialState(source),...s,legacyPace:s.legacyPace||!Object.hasOwn(s,'construction')};
}
// Health totals are authoritative for the diary. Construction has a separate
// high-water mark per date, so repeated reads and downward corrections never
// award the same steps twice or dismantle a completed building.
export function applySnapshot(previous,rows,at=new Date().toISOString()){
 const s=structuredClone(previous),today=dayKey(new Date(at)),merged=new Map();
 for(const row of rows){if(!/^\d{4}-\d{2}-\d{2}$/.test(row.day)||row.day>today||!finite(row.steps))throw Error('歩数データの形式が正しくありません');merged.set(row.day,row.steps);}
 for(const [day,steps] of merged){const old=s.records[day],credited=day>=s.startDay?Math.max(old?.credited||0,steps):0;s.total+=credited-(old?.credited||0);s.records[day]={steps,credited};}
 s.lastSync=at;if(merged.size)s.lastDataSync=at;return s;
}
export const townSteps=s=>Math.max(0,s.total-s.townStart);
export function pendingRecap(s){return s.total>s.seen?{from:Math.max(s.townStart,s.seen),to:s.total,at:s.lastSync}:null;}
export function acknowledge(s,recap=pendingRecap(s)){return{...s,seen:s.total,recap:recap||s.recap};}
export function recordCompletions(s,buildings,budget){
 const events=[...s.events];
 for(const b of buildings){
  const threshold=completionStep(b,budget),id=[s.townStart,s.region,b.id].join(':');
  if(townSteps(s)<threshold||events.some(e=>e.id===id))continue;
  let cumulative=0,date=dayKey(new Date(s.lastSync||Date.now()));
  for(const [day,r] of Object.entries(s.records).sort(([a],[b])=>a.localeCompare(b))){cumulative+=r.credited;if(cumulative>=s.townStart+threshold){date=day;break;}}
  events.push({id,day:date,region:s.region,kind:b.kind,name:b.name||null});
 }
 return{...s,events};
}
export function nextTown(s,region,budget){
 if(townSteps(s)<budget)throw Error('町の完成後に選べます');
 return{...s,album:[...s.album,{region:s.region,seed:s.seed,start:s.townStart,completed:dayKey(),construction:s.construction}],region,seed:(s.seed*73+19)%99991,townStart:s.townStart+budget,seen:s.townStart+budget,recap:null,construction:null,legacyPace:false};
}
export function demoState(today=dayKey()){
 let s=initialState('demo',shiftDay(today,-6));
 s=applySnapshot(s,daysEnding(today,7).map((day,i)=>({day,steps:[820,1540,960,1340,740,2100,1720][i]})));
 s.seen=s.total-2400;s.permissionRequested=true;return s;
}
