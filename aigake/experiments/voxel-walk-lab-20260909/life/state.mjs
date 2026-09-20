import {BY_ID} from '../content/catalog.mjs';

export const DEFAULT_SETTINGS={motion:true,quiet:false,pets:'none'};
export const facilityKey=(d,i)=>`${d.id}:${d.seed}:${i}`;
export const finishedLots=d=>[...(d.completed||[]),...(d.steps>=(d.budget||4800)?[d]:[])];
export function cleanLife(value){
  const clock=Number.isFinite(value?.clock)?Math.max(0,value.clock):0,opened={};
  for(const [id,at] of Object.entries(value?.opened||{}).slice(0,3000))if(/^\d+:-?\d+:\d+$/.test(id)&&Number.isFinite(at)&&at>=0&&at<=clock)opened[id]=at;
  return{version:1,clock,opened,settings:{motion:value?.settings?.motion!==false,quiet:value?.settings?.quiet===true,pets:['none','cat','dog','both'].includes(value?.settings?.pets)?value.settings.pets:'none'}};
}
export function reconcileLife(state,life=cleanLife(state.life)){
  const opened={...life.opened};
  for(const d of [...(state.archive||[]),state.active])if(d?.layout==='neighborhood')finishedLots(d).forEach((b,i)=>{const key=facilityKey(d,i);if(opened[key]===undefined)opened[key]=life.clock;});
  return{...state,life:{...life,opened}};
}
export function advanceLife(before,after,amount=0){
  const life=cleanLife(before.life),clock=life.clock+Math.max(0,amount),opened={...life.opened};
  const d=after.active,prev=before.active;
  if(d?.layout==='neighborhood')finishedLots(d).forEach((b,i)=>{
    const key=facilityKey(d,i);if(opened[key]!==undefined)return;
    // A completion partway through one imported walk keeps the remainder of
    // that walk. Spending the bank later contributes no second walking credit.
    const needed=Math.max(0,(prev.budget||4800)-prev.steps-(before.bank||0));
    opened[key]=life.clock+Math.min(Math.max(0,amount),needed);
  });
  return{...after,life:{...life,clock,opened}};
}
const drink=new Set(['tea','crab-shack','mountain-lodge','fruit-bar','noodle-shop','harbor-inn','ryokan','sauna','bathhouse']);
const read=new Set(['books','woodland-library','star-map-library','sea-museum']);
const garden=new Set(['flowers','herbalist','bonsai-nursery','winter-greenhouse','butterfly-dome','apiary']);
const patrol=new Set(['ranger','bell-tower','pagoda','shrine','canal-lock','bridge-house','grain-silo','acorn-store','balloon-port','aurora-station','avalanche-station','irrigation-house','trail-refuge']);
export function roleFor(kind){
  if(kind==='tokyo-apartment')return{label:'住人',action:'rest',item:null};
  if(kind==='tokyo-station'||kind==='tokyo-tower')return{label:'管理担当',action:'inspect',item:'book'};
  if(kind==='tokyo-office')return{label:'働く人',action:'work',item:'parcel'};
  if(kind==='tokyo-cafe')return{label:'店員',action:'serve',item:'cup'};
  if(drink.has(kind))return{label:'店員',action:'serve',item:'cup'};
  if(read.has(kind))return{label:kind==='books'?'店主':'司書',action:'read',item:'book'};
  if(garden.has(kind))return{label:'手入れをする人',action:'water',item:'can'};
  if(['stable','shepherd-lodge','reindeer-stable','turtle-rescue'].includes(kind))return{label:'飼育担当',action:'care',item:'basket'};
  if(patrol.has(kind))return{label:'管理担当',action:'inspect',item:'book'};
  if(['mushroom-house','stilt-house','sundial-house','igloo'].includes(kind))return{label:'住人',action:'rest',item:null};
  return{label:/工房|所|庫|蔵|納屋/.test(BY_ID[kind]?.name||'')?'職人':'店主',action:'work',item:'parcel'};
}
export function lifePlan(d,life=cleanLife(),visibleCount=finishedLots(d).length){
  const lots=finishedLots(d).slice(0,visibleCount).map((b,i)=>({id:facilityKey(d,i),kind:b.kind,slot:i,age:Math.max(0,life.clock-(life.opened[facilityKey(d,i)]??life.clock)),role:roleFor(b.kind)}));
  const age=Math.max(0,...lots.map(b=>b.age)),settings={...DEFAULT_SETTINGS,...life.settings};
  return{lots,settings,visitor:age>=400,dog:age>=800&&['dog','both'].includes(settings.pets),cat:lots.length>0&&['cat','both'].includes(settings.pets),cart:age>=1200&&lots.some(b=>!patrol.has(b.kind)),bird:lots.length>0,flowers:lots.some(b=>['flowers','apiary','bonsai-nursery','winter-greenhouse','butterfly-dome'].includes(b.kind)),next:!lots.length?'建物が完成すると、使う人が訪れます。':age<400?`最初の来客まで、あと${Math.ceil(400-age)}歩。`:age<1200?`配達が始まるまで、あと${Math.ceil(1200-age)}歩。`:'来客と配達が始まりました。歩くと次の建物と草花も育ちます。'};
}
