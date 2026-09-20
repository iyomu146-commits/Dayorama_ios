import {test} from 'node:test';
import assert from 'node:assert/strict';
import {initialState,restore,connectStepSource,applySnapshot,pendingRecap,acknowledge,recordCompletions,nextTown,townSteps,shiftDay,daysEnding} from './state.mjs';
const day='2026-09-16',at='2026-09-16T12:00:00+09:00',fresh=()=>initialState('health',day),read=(s,steps)=>applySnapshot(s,[{day,steps}],at);
test('same HealthKit total is credited only once',()=>{const a=read(fresh(),2400),b=read(a,2400);assert.equal(b.total,2400);assert.equal(read(b,2600).total,2600);});
test('a corrected diary never rebuilds or removes earned construction',()=>{let s=read(fresh(),2400);s=read(s,1800);assert.equal(s.records[day].steps,1800);assert.equal(s.total,2400);assert.equal(read(s,2200).total,2400);assert.equal(read(s,2500).total,2500);});
test('historical records are readable but only enrollment onward builds',()=>{const s=applySnapshot(fresh(),[{day:'2026-09-15',steps:12000},{day,steps:400}],at);assert.equal(s.total,400);assert.equal(s.records['2026-09-15'].steps,12000);assert.equal(s.records['2026-09-15'].credited,0);});
test('midnight and late arriving yesterday data are each reconciled',()=>{let s=read(fresh(),2400);s=applySnapshot(s,[{day,steps:2600},{day:'2026-09-17',steps:800}],'2026-09-17T12:00:00+09:00');assert.equal(s.total,3400);assert.equal(applySnapshot(s,[{day,steps:2600}],'2026-09-17T12:00:00+09:00').total,3400);});
test('unavailable HealthKit data does not erase cached records or advance the data cursor',()=>{const s=read(fresh(),2400),next=applySnapshot(s,[],'2026-09-20T12:00:00+09:00');assert.equal(next.total,s.total);assert.deepEqual(next.records,s.records);assert.equal(next.lastDataSync,s.lastDataSync);});
test('credit is persisted before presentation, including an interrupted recap',()=>{let s=read(fresh(),2400);assert.equal(s.seen,0);s=restore(JSON.stringify(s));assert.deepEqual(pendingRecap(s),{from:0,to:2400,at:s.lastSync});s.seen=900;const resumed=restore(JSON.stringify(s));assert.equal(pendingRecap(resumed).from,900);const done=acknowledge(resumed);assert.equal(done.total,2400);assert.equal(pendingRecap(done),null);assert.equal(done.recap.from,900);});
test('recap replay keeps the same total and completion awards',()=>{const s=acknowledge(read(fresh(),2400));assert.equal(acknowledge(s,s.recap).total,s.total);assert.deepEqual(acknowledge(s,s.recap).records,s.records);});
test('completed town overflow is preserved for the next region',()=>{const s=read(fresh(),24500),next=nextTown(s,'oasis',20000);assert.equal(townSteps(next),4500);assert.equal(next.album.length,1);assert.equal(next.album[0].region,'grove');assert.equal(pendingRecap(next).from,20000);assert.throws(()=>nextTown(next,'snow',20000));});
test('completion events are dated by credited days and deduplicated',()=>{let s=initialState('health','2026-09-15');s=applySnapshot(s,[{day:'2026-09-15',steps:7000},{day,steps:3000}],at);const buildings=[{id:'one',kind:'books',end:.25},{id:'two',kind:'tea',end:.45}];s=recordCompletions(s,buildings,20000);assert.deepEqual(s.events.map(e=>e.day),['2026-09-15','2026-09-16']);assert.equal(recordCompletions(s,buildings,20000).events.length,2);});
test('source separation, corrupt saves and invalid step values fail closed',()=>{assert.throws(()=>restore({...fresh(),source:'demo'},'health'));assert.throws(()=>restore({...fresh(),total:-1}));for(const steps of [-1,NaN,Infinity,1.4])assert.throws(()=>read(fresh(),steps));assert.throws(()=>applySnapshot(fresh(),[{day:'2026-09-18',steps:1}],at));});
test('calendar iteration crosses month, year and leap-day boundaries',()=>{assert.equal(shiftDay('2026-01-01',-1),'2025-12-31');assert.equal(shiftDay('2024-02-28',1),'2024-02-29');assert.equal(daysEnding('2026-03-01',30).length,30);});
test('old saves keep HealthKit and Motion selection survives restart',()=>{
 const old=fresh();delete old.stepSource;assert.equal(restore(old).stepSource,'healthkit');
 const saved=restore(JSON.stringify(connectStepSource(old,'pedometer')));assert.equal(saved.stepSource,'pedometer');assert.equal(saved.permissionRequested,true);
 assert.throws(()=>restore({...old,stepSource:'unknown'}));assert.throws(()=>connectStepSource(old,'unknown'));
});
test('switching step sources preserves the town and prevents double credit',()=>{
 let s=acknowledge(read(fresh(),2400));const savedRecords=structuredClone(s.records);
 s=connectStepSource(s,'pedometer');assert.equal(s.lastDataSync,null);assert.equal(s.seen,2400);assert.deepEqual(s.records,savedRecords);
 s=read(s,1800);assert.equal(s.total,2400);assert.equal(s.records[day].steps,1800);
 s=read(s,2500);assert.equal(s.total,2500);
 s=read(connectStepSource(s,'healthkit'),3000);assert.equal(s.total,3000);
});
