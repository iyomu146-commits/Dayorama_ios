import {test} from 'node:test';
import assert from 'node:assert/strict';
import {initialState,applySnapshot,recordCompletions,nextTown,restore} from './state.mjs';
import {prepareConstruction,constructionPlan} from './construction.mjs';
import {replayTowns,replayTownPlan,replayClips,replayFrame,advanceTimelapse} from './timelapse.mjs';
const base={walkBudget:20000,buildings:[{id:'a',kind:'books',start:0,end:.6},{id:'b',kind:'tea',start:.4,end:1}],trees:[{birth:0},{birth:.5}],plants:[{birth:.2},{birth:.8}]};
const fresh=steps=>prepareConstruction(applySnapshot(initialState('health','2026-09-16'),[{day:'2026-09-16',steps}],'2026-09-16T12:00:00+09:00'),base);

test('only earned completions unlock building and whole-town timelapses',()=>{
 for(const [steps,expected]of [[19999,[false,false,false]],[20000,[false,true,false]],[39999,[false,true,false]],[40000,[true,true,true]]]){
  const s=fresh(steps),town=replayTowns(s)[0],plan=replayTownPlan(base,town);
  assert.deepEqual(replayClips(town,plan).map(c=>c.ready),expected);
 }
});
test('archived towns keep their own seed, pace and completed playback after changing regions',()=>{
 let s=fresh(42400),plan=constructionPlan(base,s.construction);s=recordCompletions(s,plan.buildings,plan.walkBudget);
 s=restore(JSON.stringify(nextTown(s,'oasis',plan.walkBudget)));s=prepareConstruction(s,base);
 const [current,previous]=replayTowns(s);assert.equal(current.region,'oasis');assert.equal(current.availableSteps,2400);assert.equal(previous.region,'grove');assert.equal(previous.seed,741);
 assert.equal(replayTownPlan(base,previous).walkBudget,40000);assert.ok(replayClips(previous,replayTownPlan(base,previous)).every(c=>c.ready));
 const legacy={...previous,construction:null};assert.equal(replayTownPlan(base,legacy).walkBudget,20000);
});
test('single-building playback always runs from no blocks to completion, including migrated negative starts',()=>{
 const plan={...base,buildings:[{...base.buildings[0],start:-.12,end:.7}]},clip={kind:'building',id:'a'};
 assert.deepEqual(replayFrame(clip,plan,0),{progress:1,focus:{buildingId:'a',buildingProgress:0},phase:'基礎'});
 assert.equal(replayFrame(clip,plan,.2).phase,'骨組み');assert.equal(replayFrame(clip,plan,.6).phase,'壁・屋根');assert.equal(replayFrame(clip,plan,.9).phase,'仕上げ');
 assert.equal(replayFrame(clip,plan,1).focus.buildingProgress,1);assert.equal(replayFrame(clip,plan,1).phase,'完成');
 assert.equal(replayFrame({kind:'town'},base,0).phase,'0 / 2 棟');assert.equal(replayFrame({kind:'town'},base,1).phase,'2 / 2 棟');
});
test('pause, speed, completion and replay do not alter saved steps, completion events or seen position',()=>{
 const s=fresh(40000),saved=JSON.stringify(s),town=replayTowns(s)[0],plan=replayTownPlan(base,town),clip=replayClips(town,plan)[1];
 let p={clip,position:0,playing:true,speed:1};p=advanceTimelapse(p,3000);assert.equal(p.position,.25);
 p={...p,playing:false};assert.equal(advanceTimelapse(p,9000),p);
 p=advanceTimelapse({...p,playing:true,speed:2},3000);assert.equal(p.position,.75);
 p=advanceTimelapse(p,3000);assert.equal(p.position,1);assert.equal(p.playing,false);
 p=advanceTimelapse({...p,position:0,playing:true,speed:4},3000);assert.equal(p.position,1);
 replayFrame(clip,plan,p.position);assert.equal(JSON.stringify(s),saved);
});
