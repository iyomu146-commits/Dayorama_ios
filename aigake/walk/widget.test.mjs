import {test} from 'node:test';
import assert from 'node:assert/strict';
import {initialState,applySnapshot} from './state.mjs';
import {widgetSnapshot,widgetSignature} from './widget.mjs';
const plan={p:{name:'森'},walkBudget:40000,buildings:[{id:'a',kind:'books',startStep:0,endStep:20000},{id:'b',kind:'tea',startStep:20000,endStep:40000}]};
const now=new Date('2026-09-16T12:00:00'),initial=()=>initialState('health','2026-09-16');
test('widget uses confirmed construction and actual daily steps, never seen or recap position',()=>{
 const s=applySnapshot(initial(),[{day:'2026-09-16',steps:22400}],now.toISOString());s.seen=12000;s.recap={from:0,to:6000};const before=JSON.stringify(s),w=widgetSnapshot(s,plan,now);
 assert.equal(w.todaySteps,22400);assert.equal(w.completedBuildings,1);assert.equal(w.remainingSteps,17600);assert.equal(w.progress,.12);assert.equal(JSON.stringify(s),before);
});
test('demo data is never published and missing today data is not zero',()=>{assert.equal(widgetSnapshot({...initial(),source:'demo'},plan,now),null);assert.equal(widgetSnapshot(initial(),plan,now).todaySteps,null);assert.equal(widgetSnapshot(initial(),plan,now).syncedAt,null);});
test('widget snapshot and signature change at midnight without relabelling yesterday',()=>{
 const s=applySnapshot(initial(),[{day:'2026-09-16',steps:4000}],now.toISOString()),a=widgetSnapshot(s,plan,now),same=widgetSnapshot(s,plan,new Date(now.getTime()+1000)),tomorrow=widgetSnapshot(s,plan,new Date('2026-09-17T00:01:00'));
 assert.equal(widgetSignature(a,741),widgetSignature(same,741));assert.notEqual(widgetSignature(a,741),widgetSignature(tomorrow,741));assert.equal(tomorrow.todaySteps,null);assert.equal(tomorrow.remainingSteps,a.remainingSteps);
});
test('finished town snapshot stops at 100 percent and keeps correction separate',()=>{
 let s=applySnapshot(initial(),[{day:'2026-09-16',steps:42400}],now.toISOString());s=applySnapshot(s,[{day:'2026-09-16',steps:42000}],now.toISOString());const w=widgetSnapshot(s,plan,now);assert.equal(w.progress,1);assert.equal(w.remainingSteps,0);assert.equal(w.completedBuildings,2);assert.equal(w.todaySteps,42000);
});
