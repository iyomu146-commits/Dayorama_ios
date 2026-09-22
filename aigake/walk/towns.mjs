// Viewing a town is separate from the active construction ledger.
export const townKey=town=>[town.start,town.region,town.seed].join(':');
export function unlockedTowns(state){
 return[{region:state.region,seed:state.seed,start:state.townStart,construction:state.construction,availableSteps:Math.max(0,state.total-state.townStart),current:true},...state.album.slice().reverse().map(t=>({...t,availableSteps:Infinity,current:false}))];
}
export function townToView(state,key=null){
 const archived=key&&state.album.find(t=>townKey(t)===key);
 return archived?{...archived,availableSteps:Infinity,current:false}:{region:state.region,seed:state.seed,start:state.townStart,construction:state.construction,availableSteps:Math.max(0,state.total-state.townStart),current:true};
}
export function townViewProgress(town,plan,total){
 return town.current?Math.max(0,Math.min(1,(total-town.start)/plan.walkBudget)):1;
}
