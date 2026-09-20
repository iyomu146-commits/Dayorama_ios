import test from 'node:test';
import assert from 'node:assert/strict';
import {walkMode,createDebugState,addDebugSteps,debugStepsToFinish,resetDebugState} from './debug.mjs';
import {initialState,applySnapshot,recordCompletions,restore,nextTown} from './state.mjs';
import {widgetSnapshot} from './widget.mjs';
const day='2026-09-20',at='2026-09-20T12:00:00+09:00';
const plan={walkBudget:40000,buildings:[{id:'one',kind:'tea',endStep:20000},{id:'two',kind:'books',endStep:40000}]};
test('production native builds cannot enable debug through localhost or query parameters',()=>{
 const production=walkMode({native:true,hostname:'localhost',search:'?debug=1&demo=1'});
 assert.equal(production.debugTools,false);assert.equal(production.source,'health');assert.equal(production.simulated,false);
 const side=walkMode({native:true,buildDebug:true,search:'?debug=1'});assert.equal(side.source,'debug');assert.equal(side.simulated,true);
});
test('debug, preview and real data have distinct storage and star books',()=>{
 const health=walkMode({native:true}),debug=walkMode({native:true,buildDebug:true,search:'?debug=1'}),demo=walkMode({search:'?demo=1'});
 assert.equal(new Set([health.key,debug.key,demo.key]).size,3);assert.equal(new Set([health.starbookKey,debug.starbookKey,demo.starbookKey]).size,3);
 assert.equal(walkMode({hostname:'127.0.0.1',search:'?debug=1'}).debug,true);
 assert.equal(walkMode({hostname:'example.com',search:'?debug=1'}).debug,false);
});
test('debug starts from a detached copy and never edits real records',()=>{
 const real=applySnapshot(initialState('health',day),[{day,steps:1000}],at),before=JSON.stringify(real);
 let debug=createDebugState(real);debug=addDebugSteps(debug,5000,at);
 assert.equal(debug.total,6000);assert.equal(debug.records[day].steps,6000);assert.equal(debug.seen,1000);
 assert.equal(JSON.stringify(real),before);assert.equal(debug.permissionRequested,false);assert.equal(widgetSnapshot(debug,plan),null);
 assert.equal(restore(JSON.stringify(debug),'debug').total,6000);assert.throws(()=>restore(debug,'health'));
});
test('one-building and district actions add exactly the missing steps and record completions once',()=>{
 let s=addDebugSteps(createDebugState(null,day),7100,at);
 assert.equal(debugStepsToFinish(s,plan,'building'),12900);
 s=addDebugSteps(s,debugStepsToFinish(s,plan,'building'),at);s=recordCompletions(s,plan.buildings,plan.walkBudget);
 assert.equal(s.total,20000);assert.equal(s.events.length,1);
 s=addDebugSteps(s,debugStepsToFinish(s,plan,'town'),at);s=recordCompletions(s,plan.buildings,plan.walkBudget);
 assert.equal(s.total,40000);assert.equal(s.events.length,2);assert.equal(recordCompletions(s,plan.buildings,plan.walkBudget).events.length,2);
 assert.equal(debugStepsToFinish(s,plan,'building'),0);assert.equal(debugStepsToFinish(s,plan,'town'),0);
});
test('district actions respect overflow and the next district offset',()=>{
 let s=addDebugSteps(createDebugState(null,day),45000,at);assert.equal(debugStepsToFinish(s,plan,'town'),0);
 s=nextTown(s,'oasis',40000);assert.equal(debugStepsToFinish(s,plan,'building'),15000);assert.equal(debugStepsToFinish(s,plan,'town'),35000);
});
test('debug reset clears only debug progress and keeps the selected scenery',()=>{
 let s={...createDebugState(null,day),region:'oasis',seed:123,motion:false};s=addDebugSteps(s,10000,at);
 const reset=resetDebugState(s,day);assert.equal(reset.source,'debug');assert.equal(reset.total,0);assert.deepEqual(reset.records,{});assert.deepEqual(reset.events,[]);
 assert.equal(reset.region,'oasis');assert.equal(reset.seed,123);assert.equal(reset.motion,false);assert.equal(s.total,10000);
});
test('invalid input and attempts to modify real or preview data are rejected',()=>{
 const debug=createDebugState(null,day);
 for(const n of [0,-1,1.5,NaN,Infinity,1000001])assert.throws(()=>addDebugSteps(debug,n,at));
 for(const source of ['health','demo']){const s=initialState(source,day);assert.throws(()=>addDebugSteps(s,100,at));assert.throws(()=>resetDebugState(s));assert.throws(()=>debugStepsToFinish(s,plan,'town'));}
});
test('debug additions advance by the requested amount even after a copied downward correction',()=>{
 let real=applySnapshot(initialState('health',day),[{day,steps:2000}],at);real=applySnapshot(real,[{day,steps:1500}],at);
 const debug=addDebugSteps(createDebugState(real),100,at);assert.equal(debug.total,2100);assert.equal(real.total,2000);
});
