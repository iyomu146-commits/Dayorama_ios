import {completionStep,constructionPlan} from './construction.mjs';

// Playback descriptors are independent of the step ledger and never award progress.
export function replayTowns(state){
 return[{region:state.region,seed:state.seed,start:state.townStart,construction:state.construction,availableSteps:Math.max(0,state.total-state.townStart),current:true},...state.album.slice().reverse().map(t=>({...t,availableSteps:Infinity,current:false}))];
}
export const replayTownPlan=(base,town)=>town.construction?constructionPlan(base,town.construction):base;
export function replayClips(town,plan){
 return[{kind:'town',id:'town',ready:town.availableSteps>=plan.walkBudget,duration:Math.min(60000,Math.max(24000,plan.buildings.length*2400))},...plan.buildings.map(b=>({kind:'building',id:b.id,ready:town.availableSteps>=completionStep(b,plan.walkBudget),duration:12000}))];
}
export function replayFrame(clip,plan,position){
 const progress=Math.max(0,Math.min(1,position));
 if(clip.kind==='building'){
  const building=plan.buildings.find(b=>b.id===clip.id);
  if(!building)throw Error('建物を読み込めません');
  return{progress:1,focus:{buildingId:building.id,buildingProgress:progress},phase:progress===1?'完成':['基礎','骨組み','壁・屋根','仕上げ'][progress<.14?0:progress<.39?1:progress<.86?2:3]};
 }
 return{progress,focus:null,phase:plan.buildings.filter(b=>progress>=b.end).length+' / '+plan.buildings.length+' 棟'};
}
export function advanceTimelapse(player,delta){
 if(!player.playing)return player;
 const position=Math.min(1,player.position+Math.max(0,delta)*player.speed/player.clip.duration);
 return{...player,position,playing:position<1};
}
