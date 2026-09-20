import {initialState,applySnapshot,dayKey,townSteps} from './state.mjs';
import {completionStep} from './construction.mjs';

export function walkMode({native=false,buildDebug=false,hostname='',search=''}){
 const params=new URLSearchParams(search),debugTools=buildDebug||(!native&&['localhost','127.0.0.1','[::1]'].includes(hostname));
 const debug=debugTools&&params.get('debug')==='1',demo=!debug&&!native&&params.get('demo')==='1',source=debug?'debug':demo?'demo':'health';
 return{debugTools,debug,demo,simulated:debug||demo,source,key:`komorebi-walk-${debug?'debug':demo?'preview':'health'}-v1`,starbookKey:debug?'komorebi-walk-starbook-debug-v1':demo?'komorebi-walk-starbook-demo-v1':'komorebi-walk-starbook-v1'};
}
function requireDebug(state){if(state.source!=='debug')throw Error('歩数の操作はデバッグモードで利用できます');}
export function createDebugState(template=null,today=dayKey()){
 const state=template?structuredClone(template):initialState('debug',today);
 return{...state,source:'debug',permissionRequested:false,seen:state.total,recap:null};
}
export function addDebugSteps(state,amount,at=new Date().toISOString()){
 requireDebug(state);
 if(!Number.isSafeInteger(amount)||amount<1||amount>1000000)throw Error('追加する歩数を1〜1,000,000の整数で入力してください');
 const day=dayKey(new Date(at)),record=state.records[day],steps=Math.max(record?.steps||0,record?.credited||0)+amount;
 if(!Number.isSafeInteger(steps)||!Number.isSafeInteger(state.total+amount))throw Error('歩数が上限を超えています');
 return applySnapshot(state,[{day,steps}],at);
}
export function debugStepsToFinish(state,plan,target){
 requireDebug(state);const current=townSteps(state);
 if(target==='town')return Math.max(0,plan.walkBudget-current);
 if(target!=='building')throw Error('建築の操作を確認してください');
 const ends=plan.buildings.map(b=>completionStep(b,plan.walkBudget)).filter(end=>end>current);
 return ends.length?Math.min(...ends)-current:0;
}
export function resetDebugState(state,today=dayKey()){
 requireDebug(state);return{...initialState('debug',today),region:state.region,seed:state.seed,motion:state.motion};
}
