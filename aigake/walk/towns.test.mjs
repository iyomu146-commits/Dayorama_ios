import {test} from 'node:test';
import assert from 'node:assert/strict';
import {initialState,applySnapshot,nextTown,pendingRecap,restore,recordCompletions} from './state.mjs';
import {prepareConstruction,constructionPlan} from './construction.mjs';
import {unlockedTowns,townKey,townToView,townViewProgress} from './towns.mjs';
import {replayTownPlan,replayClips,replayFrame} from './timelapse.mjs';
const date='2026-09-22',at=date+'T12:00:00+09:00';
const base={walkBudget:12000,buildings:[{id:'a',kind:'books',start:0,end:.5},{id:'b',kind:'tea',start:.5,end:1}],trees:[{birth:0},{birth:.5}],plants:[]};
const sync=(s,steps)=>applySnapshot(s,[{day:date,steps}],at);
const fresh=()=>prepareConstruction(initialState('health',date),base);
const completed=()=>{
 const s=sync(fresh(),43000),plan=constructionPlan(base,s.construction);
 return recordCompletions(s,plan.buildings,plan.walkBudget);
};
test('only the active town and earned archived towns can be viewed',()=>{
 const s=fresh(),saved=JSON.stringify(s);
 assert.equal(unlockedTowns(s).length,1);
 assert.equal(townToView(s,'0:tokyo:741').region,'grove');
 assert.equal(townToView(s).current,true);
 assert.equal(JSON.stringify(s),saved);
});
test('revisiting preserves seed, construction, completions and unviewed surplus steps across reloads',()=>{
 let s=prepareConstruction(nextTown(completed(),'oasis',40000),base);
 s=restore(JSON.stringify(s));const saved=JSON.stringify(s),[current,old]=unlockedTowns(s),key=townKey(old);
 const archived=townToView(s,key),oldPlan=replayTownPlan(base,archived),activePlan=replayTownPlan(base,current);
 assert.equal(archived.seed,741);assert.equal(archived.region,'grove');assert.equal(oldPlan.walkBudget,40000);
 assert.equal(townViewProgress(archived,oldPlan,s.total),1);
 assert.equal(townViewProgress(current,activePlan,s.total),3000/40000);
 assert.deepEqual(pendingRecap(s),{from:40000,to:43000,at:s.lastSync});
 // Both current and archived timelapses can run while this town is being visited.
 for(const town of unlockedTowns(s)){
  const plan=replayTownPlan(base,town);
  for(const clip of replayClips(town,plan).filter(c=>c.ready)){replayFrame(clip,plan,.5);replayFrame(clip,plan,1);}
 }
 assert.equal(townKey(townToView(s,key)),key);assert.equal(JSON.stringify(s),saved);
});
test('steps synced during a visit advance only the active town and remain pending on return',()=>{
 let s=prepareConstruction(nextTown(completed(),'oasis',40000),base);
 const old=unlockedTowns(s)[1],key=townKey(old),album=JSON.stringify(s.album),events=JSON.stringify(s.events);
 s=sync(s,48000);
 assert.equal(townViewProgress(townToView(s,key),replayTownPlan(base,old),s.total),1);
 assert.equal(townToView(s).availableSteps,8000);
 assert.deepEqual(pendingRecap(s),{from:40000,to:48000,at});
 assert.equal(JSON.stringify(s.album),album);assert.equal(JSON.stringify(s.events),events);
 assert.equal(s.region,'oasis');assert.equal(s.townStart,40000);
});
test('multiple towns in the same region stay distinct and older construction formats remain viewable',()=>{
 let s=prepareConstruction(nextTown(completed(),'grove',40000),base);
 s=prepareConstruction(nextTown(sync(s,84000),'grove',40000),base);
 s.album[0].construction=null;
 const towns=unlockedTowns(s);
 assert.equal(towns.length,3);assert.equal(new Set(towns.map(townKey)).size,3);
 for(const town of towns){assert.equal(townKey(townToView(s,townKey(town))),townKey(town));}
 const old=towns.at(-1);assert.equal(replayTownPlan(base,old).walkBudget,12000);assert.equal(townViewProgress(old,base,s.total),1);
 assert.equal(townToView(fresh(),townKey(towns[1])).current,true);
});
