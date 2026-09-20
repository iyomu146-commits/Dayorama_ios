export const SHIBUYA_CROSSING={x:-7.55,z:-4.15,half:1.68};
// Opposite diagonal flows take turns. Waiting groups stay at separate
// corners, so people do not pass through one another at the centre.
export function crossingPhase(elapsed,group=0){
 const period=64,t=((elapsed%period)+period)%period,start=group*16,back=start+32;
 const forward=Math.max(0,Math.min(1,(t-start)/14)),reverse=Math.max(0,Math.min(1,(t-back)/14));
 const moving=t>=start&&t<start+14||t>=back&&t<back+14;
 return{t:forward-reverse,moving,returning:t>=back,distance:Math.floor(Math.max(0,elapsed)/period)*2+forward+reverse};
}
export function crossingWalkers(plan,firstIndex){
 if(plan.id!=='tokyo')return[];
 const building=plan.buildings.findIndex(b=>b.kind==='tokyo-highrise'),workers=[];
 for(let group=0;group<2;group++)for(let lane=0;lane<3;lane++){
  const d=group?1:-1,offset=(lane-1)*.42,ox=-d*offset/Math.SQRT2,oz=offset/Math.SQRT2;
  const route=[-1.48,0,1.48].map(v=>[SHIBUYA_CROSSING.x+v+ox,.34,SHIBUYA_CROSSING.z+d*v+oz]);
  workers.push({route,index:firstIndex+workers.length,building,options:{label:'交差点を渡る人',action:'idle',crosswalk:{group},appearance:{regional:true,shirt:['#698d99','#b97863','#9b9a78'][lane],pants:'#586474',trim:'#c6b599',longSleeves:true,tie:false,hat:null,apron:false}}});
 }
 return workers;
}
