import test from 'node:test';
import assert from 'node:assert/strict';
import {register} from 'node:module';

// Exercise the installed Capacitor proxy, including its thenable behavior,
// against a fake OS transport. Nothing reads a real person's health data.
const core=import.meta.resolve('@capacitor/core');
register('data:text/javascript,'+encodeURIComponent(`export function resolve(s,c,next){return s==='./capacitor-core.js'?{shortCircuit:true,url:${JSON.stringify(core)}}:next(s,c);}`),import.meta.url);
const calls=[];
let respond=()=>({});
globalThis.window=globalThis;
globalThis.webkit={messageHandlers:{bridge:{}}};
globalThis.Capacitor={getPlatform:()=>'ios',PluginHeaders:[{name:'Health',methods:['availability','requestPermission','dailySteps'].map(name=>({name,rtype:'promise'}))}],nativePromise:async(name,method,args)=>{calls.push({method,args});return respond(method,args);}};
const {requestHealth,readHealth,healthErrorMessage}=await import('../../walk/health.mjs');

test('request reaches the native permission method without awaiting the plugin proxy',{timeout:2000},async()=>{
 calls.length=0;respond=method=>method==='availability'?{status:'available'}:{granted:true};
 await requestHealth();assert.deepEqual(calls.map(c=>c.method),['availability','requestPermission']);
});
test('missing signing entitlement is reported without marking permission complete',async()=>{
 calls.length=0;respond=method=>{if(method==='availability')return{status:'available'};throw Object.assign(Error('Missing com.apple.developer.healthkit entitlement.'),{code:'HEALTH_ENTITLEMENT_MISSING'});};
 await assert.rejects(requestHealth(),e=>{assert.match(healthErrorMessage(e),/HealthKit設定/);return true;});
 assert.deepEqual(calls.map(c=>c.method),['availability','requestPermission']);
});
test('incomplete authorization flow and unavailable devices are not accepted',async()=>{
 respond=method=>method==='availability'?{status:'available'}:{granted:false};
 await assert.rejects(requestHealth(),/完了できません/);
 calls.length=0;respond=()=>({status:'unsupported'});
 await assert.rejects(requestHealth(),/この端末/);assert.equal(calls.length,1);
});
test('daily readings reach the native transport and reject malformed responses',{timeout:2000},async()=>{
 calls.length=0;respond=(method,args)=>({days:[{day:args.to,steps:1234}]});
 const rows=await readHealth({startDay:'2026-01-01',lastDataSync:new Date().toISOString()});
 assert.equal(rows[0].steps,1234);assert.ok(calls.every(c=>c.method==='dailySteps'));
 respond=()=>({});await assert.rejects(readHealth({startDay:'2026-01-01',lastDataSync:new Date().toISOString()}),/読み込めません/);
});
test('native registration failure gets a useful message instead of a raw plugin error',()=>{
 assert.match(healthErrorMessage({code:'UNIMPLEMENTED'}),/最新版/);
 assert.match(healthErrorMessage({message:'permission_error: Missing com.apple.developer.healthkit entitlement.'}),/HealthKit設定/);
});
