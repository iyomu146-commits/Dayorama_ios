import {initialState,chooseBuilding,walk,restore,townSteps} from '../neighborhood.mjs';
export const TOKYO_SAVE='komorebi-tokyo-prototype-v1';
export const ROUTES={
  street:{name:'商店街',description:'環状線の内側に、店舗住宅・集合住宅・喫茶店と小さなビルが集まる街区。',ids:['tokyo-shop','tokyo-apartment','tokyo-cafe']},
  center:{name:'ビル街',description:'環状線が囲むビル街。駅と電波塔のまわりに、高さの違うビルが密集します。',ids:['tokyo-station','tokyo-office','tokyo-tower']}
};
export function freshRoute(route){
  const state=initialState();Object.assign(state.active,{biome:'tokyo',kind:ROUTES[route].ids[0],collection:true,seed:741});
  return state;
}
export function completeRoute(route){
  let state=freshRoute(route);
  for(const id of ROUTES[route].ids){state=chooseBuilding(state,id);state=walk(state,1600);}
  return state;
}
export function loadTokyo(raw){
  let value;try{value=JSON.parse(raw);}catch{}
  const states={};
  for(const route of Object.keys(ROUTES)){
    const source=value?.states?.[route],s=source?restore(source):freshRoute(route),kinds=[...s.active.completed.map(b=>b.kind),s.active.kind];
    const valid=s.active.collection&&s.active.biome==='tokyo'&&kinds.every((id,i)=>id===ROUTES[route].ids[i]);
    states[route]=valid?s:freshRoute(route);
  }
  return{route:Object.hasOwn(ROUTES,value?.route)?value.route:'center',preview:value?.preview!==false,states};
}
export const totalWalked=states=>Object.values(states).reduce((n,s)=>n+townSteps(s.active),0);
