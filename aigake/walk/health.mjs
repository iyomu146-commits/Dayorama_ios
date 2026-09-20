import {dayKey,shiftDay} from './state.mjs';
// The bridge is loaded only inside Capacitor. The browser never fabricates a
// HealthKit connection, asks for permission, or falls back to demo data.
export function platform(){return window.Capacitor?.getPlatform?.()||'web';}
let bridge;
async function health(){
 if(platform()!=='ios')throw Error('歩数の連携はiPhoneアプリで利用できます');
 if(!bridge){const {registerPlugin}=await import('./capacitor-core.js');bridge=registerPlugin('Health');}
 return bridge;
}
export async function requestHealth(){const h=await health(),a=await h.availability();if(a.status!=='available')throw Error('この端末では歩数を読み取れません');await h.requestPermission();}
export async function readHealth(state){
 const h=await health(),today=dayKey(),from=state.lastDataSync?shiftDay(dayKey(new Date(state.lastDataSync)),-7):state.startDay<shiftDay(today,-29)?state.startDay:shiftDay(today,-29);
 const rows=[];
 // Query bounded chunks after a long absence, without losing intervening days.
 for(let start=from;start<=today;){const end=shiftDay(start,89)<today?shiftDay(start,89):today,result=await h.dailySteps({from:start,to:end});if(!Array.isArray(result.days))throw Error('歩数を読み込めませんでした');rows.push(...result.days);start=shiftDay(end,1);}
 return rows;
}
