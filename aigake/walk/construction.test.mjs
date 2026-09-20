import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {registerHooks} from 'node:module';
import {STEPS_PER_BUILDING,completionStep,prepareConstruction,constructionPlan} from './construction.mjs';
import {initialState,restore,applySnapshot,recordCompletions,nextTown,townSteps} from './state.mjs';
registerHooks({resolve(s,c,next){return s==='three'?{url:new URL('../vendor/three/three.module.js',import.meta.url).href,shortCircuit:true}:next(s,c);}});
const {makeTown,buildingProgress}=await import('../experiments/voxel-walk-lab-20260909/art-direction-20260915/town-plan.mjs');
const profiles=JSON.parse(readFileSync(new URL('../experiments/voxel-walk-lab-20260909/art-direction-20260915/profiles.json',import.meta.url))).regions;
const base={walkBudget:20000,buildings:Array.from({length:5},(_,i)=>({id:'b'+i,kind:'books',start:i/5.4,end:(i+1.4)/5.4})),trees:[{birth:0},{birth:.3},{birth:.7}],plants:[{birth:.1},{birth:.4},{birth:.9}]};
const fresh=()=>initialState('health','2026-09-16');
const withSteps=(s,steps)=>applySnapshot(s,[{day:'2026-09-16',steps}],'2026-09-16T12:00:00+09:00');

test('every region gives each new building exactly 20,000 steps in sequence',()=>{
 for(const profile of profiles){
  const raw=makeTown(profile,741),s=prepareConstruction(fresh(),raw),plan=constructionPlan(raw,s.construction);
  assert.equal(plan.walkBudget,plan.buildings.length*20000,profile.id);
  for(const [i,b]of plan.buildings.entries()){
   assert.equal(b.endStep-b.startStep,20000);
   assert.equal(b.startStep,i*20000);
   assert.equal(buildingProgress(b,b.start),0);
   assert.ok(buildingProgress(b,(b.endStep-1)/plan.walkBudget)<1);
   assert.equal(buildingProgress(b,b.end),1);
  }
  assert.equal(raw.walkBudget,profile.id==='tokyo'?80000:20000,'art previews keep their own pace');
 }
});

test('completion, remaining steps and overflow agree at exact building boundaries',()=>{
 let s=prepareConstruction(fresh(),base),plan=constructionPlan(base,s.construction);
 for(const steps of [19999,20000,39999,40000,99999,100000,102400]){
  s=recordCompletions(withSteps(s,steps),plan.buildings,plan.walkBudget);
  assert.equal(s.events.length,Math.min(5,Math.floor(steps/20000)));
  if(steps<100000){const b=plan.buildings[Math.floor(steps/20000)];assert.equal(completionStep(b,plan.walkBudget)-steps,20000-steps%20000);assert.throws(()=>nextTown(s,'oasis',plan.walkBudget));}
 }
 s=nextTown(s,'oasis',plan.walkBudget);assert.equal(townSteps(s),2400);assert.equal(s.construction,null);
 s=prepareConstruction(s,base);plan=constructionPlan(base,s.construction);
 assert.equal(plan.walkBudget,100000);assert.equal(s.events.length,5);assert.equal(buildingProgress(plan.buildings[0],townSteps(s)/plan.walkBudget),.12);
});

test('legacy saves keep completed buildings, partial work, plants and actual steps',()=>{
 const old=withSteps(fresh(),9220);delete old.construction;
 const restored=restore(old),before=recordCompletions(restored,base.buildings,base.walkBudget);
 const s=prepareConstruction(before,base),plan=constructionPlan(base,s.construction),progress=townSteps(s)/plan.walkBudget;
 assert.equal(s.total,old.total);assert.deepEqual(s.records,old.records);assert.deepEqual(s.events,before.events);
 for(const [i,b]of plan.buildings.entries()){
  const previous=buildingProgress(base.buildings[i],old.total/base.walkBudget),now=buildingProgress(b,progress);
  assert.ok(now>=previous-1e-10);assert.ok(now-previous<1/STEPS_PER_BUILDING+1e-10);
  if(previous===0)assert.equal(b.endStep-b.startStep,20000);
 }
 for(const kind of ['trees','plants'])assert.deepEqual(plan[kind].map(p=>p.birth<=progress),base[kind].map(p=>p.birth<=old.total/base.walkBudget));
 assert.equal(recordCompletions(s,plan.buildings,plan.walkBudget).events.length,before.events.length);
 const reloaded=restore(JSON.stringify(s));assert.equal(prepareConstruction(reloaded,base),reloaded);
 assert.deepEqual(constructionPlan(base,reloaded.construction).buildings,plan.buildings);
});

test('legacy completed towns keep excess steps; zero-step saves use the new pace',()=>{
 for(const steps of [0,22400]){
  const old=withSteps(fresh(),steps);delete old.construction;
  const s=prepareConstruction(restore(old),base),plan=constructionPlan(base,s.construction);
  if(steps===0)assert.equal(plan.walkBudget,100000);
  else{assert.equal(plan.walkBudget,20000);assert.equal(townSteps(nextTown(s,'oasis',plan.walkBudget)),2400);assert.ok(plan.plants.every(p=>Number.isFinite(p.birth)));}
 }
});
