import {dayKey,shiftDay} from './state.mjs';
// The bridge is loaded only inside Capacitor. The browser never fabricates a
// HealthKit connection, asks for permission, or falls back to demo data.
export function platform(){return window.Capacitor?.getPlatform?.()||'web';}
let bridge;
async function prepareHealth(){
 if(platform()!=='ios')throw Error('歩数の連携はiPhoneアプリで利用できます');
 if(!bridge){const {registerPlugin}=await import('./capacitor-core.js');bridge=registerPlugin('Health');}
 // Capacitor proxies also expose a `then` property. Returning one from an
 // async function makes Promise resolution call Health.then() and hang.
 // Only await initialization, then invoke methods on the stored proxy.
}
function timedRead(promise){
 let timer;
 return Promise.race([promise,new Promise((_,reject)=>{timer=setTimeout(()=>reject(Object.assign(Error('歩数の読み取りが応答しません。アプリを開き直してお試しください。'),{code:'HEALTH_TIMEOUT'})),20000);})]).finally(()=>clearTimeout(timer));
}
export function healthErrorMessage(error){
 const code=error?.code||'',message=error?.message||'';
 if(code==='HEALTH_ENTITLEMENT_MISSING'||/missing.*healthkit.*entitlement|missing.*entitlement.*healthkit/i.test(message))return 'このインストールでは歩数の読み取り権限が不足しています。署名のHealthKit設定を確認してください。';
 if(code==='UNIMPLEMENTED')return '歩数連携の機能を読み込めませんでした。アプリを最新版に更新してください。';
 return message||'歩数を同期できませんでした。もう一度お試しください。';
}
export function isHealthSigningError(error){return error?.code==='HEALTH_ENTITLEMENT_MISSING'||/missing.*healthkit.*entitlement|missing.*entitlement.*healthkit/i.test(error?.message||'');}
function sourceOptions(source){if(!['healthkit','pedometer'].includes(source))throw Error('歩数の連携先を確認してください');return{source};}
export async function requestHealth(source='healthkit'){
 const options=sourceOptions(source);await prepareHealth();const a=await timedRead(bridge.availability(options));if(a.status!=='available')throw Error('この端末では歩数を読み取れません');
 // Do not time out the authorization sheet while the person is reading it.
 const result=await bridge.requestPermission(options);if(!result?.granted)throw Error('歩数の連携設定を完了できませんでした。もう一度お試しください。');
}
export async function readHealth(state){
 if(state.source&&state.source!=='health')throw Error('デバッグやプレビューでは端末歩数を読み取りません');
 const options=sourceOptions(state.stepSource||'healthkit');await prepareHealth();const today=dayKey(),from=options.source==='pedometer'?shiftDay(today,-6):state.lastDataSync?shiftDay(dayKey(new Date(state.lastDataSync)),-7):state.startDay<shiftDay(today,-29)?state.startDay:shiftDay(today,-29);
 const rows=[];
 // Query bounded chunks after a long absence, without losing intervening days.
 for(let start=from;start<=today;){const end=shiftDay(start,89)<today?shiftDay(start,89):today,result=await timedRead(bridge.dailySteps({...options,from:start,to:end}));if(!Array.isArray(result.days))throw Error('歩数を読み込めませんでした');rows.push(...result.days);start=shiftDay(end,1);}
 return rows;
}
