import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {registerHooks} from 'node:module';
import {recapPlayback,advanceRecap,COMPLETION_HOLD_MS} from './recap-playback.mjs';
import {constructionPlan} from './construction.mjs';
registerHooks({resolve(s,c,next){return s==='three'?{url:new URL('../vendor/three/three.module.js',import.meta.url).href,shortCircuit:true}:next(s,c);}});
const THREE=await import('three');
const {makeTown}=await import('../experiments/voxel-walk-lab-20260909/art-direction-20260915/town-plan.mjs');
const {createCompletionEffects,COMPLETION_SECONDS}=await import('../experiments/voxel-walk-lab-20260909/art-direction-20260915/completion-effects.mjs');
const profiles=JSON.parse(readFileSync(new URL('../experiments/voxel-walk-lab-20260909/art-direction-20260915/profiles.json',import.meta.url))).regions;
function schedule(profile){const base=makeTown(profile,741);return constructionPlan(base,{buildings:base.buildings.map((b,i)=>({id:b.id,startStep:i*20000,endStep:(i+1)*20000}))});}

test('every building in every region gets one completion pause, even after a long walk',()=>{
 for(const profile of profiles){
  const plan=schedule(profile),start=130000,recap={from:start,to:start+plan.walkBudget+1777},events=[];let p=recapPlayback(recap,plan,start),ticks=0;
  while(!p.done&&ticks++<1000){const before=p;p=advanceRecap(p,100);events.push(...p.completed);if(before.hold>100)assert.equal(p.value,before.value,'building completion is held on screen');for(const id of p.completed)assert.equal(p.value,start+plan.buildings.find(b=>b.id===id).endStep);assert.ok(p.value>=before.value&&p.value<=recap.to);}
  assert.ok(p.done,profile.id);assert.equal(p.value,recap.to);assert.deepEqual(events,plan.buildings.map(b=>b.id));assert.deepEqual(advanceRecap(p,10000).completed,[]);
 }
});
test('a paused or resumed recap keeps exact steps and does not repeat an already seen completion',()=>{
 const plan=schedule(profiles[0]),recap={from:39900,to:61000};let p=recapPlayback(recap,plan,0),events=[];
 for(let i=0;i<1000&&!p.completed.length;i++)p=advanceRecap(p,16);
 assert.deepEqual(p.completed,['building-1']);assert.ok(p.hold<=COMPLETION_HOLD_MS);const held=advanceRecap(p,0);assert.equal(held.value,p.value);assert.equal(held.hold,p.hold);
 p=recapPlayback({from:p.value,to:recap.to},plan,0);while(!p.done){p=advanceRecap(p,100);events.push(...p.completed);}
 assert.deepEqual(events,['building-2']);assert.equal(p.value,61000);assert.deepEqual(recap,{from:39900,to:61000});
});
test('completion glow leaves every building fixed and releases only its own effects',()=>{
 const root=new THREE.Group(),fx=createCompletionEffects(root);
 for(const profile of profiles)for(const b of schedule(profile).buildings){
  const g=new THREE.Group(),geometry=new THREE.BoxGeometry(),full=new THREE.Mesh(geometry);g.position.set(b.x,b.y,b.z);g.rotation.y=b.rot*Math.PI/2;full.scale.setScalar(b.u/.1);g.add(full);root.add(g);let disposed=false;geometry.addEventListener('dispose',()=>disposed=true);
  fx.play({...b,g,full},0);fx.play({...b,g,full},0);assert.equal(fx.count,1);
  fx.update(.8);assert.deepEqual(g.scale.toArray(),[1,1,1]);assert.deepEqual(g.position.toArray(),[b.x,b.y,b.z]);assert.ok(fx.group.children.length===1);
  fx.update(COMPLETION_SECONDS+.01);assert.equal(fx.count,0);assert.equal(disposed,false);assert.ok(root.children.includes(g));fx.clear();root.remove(g);geometry.dispose();full.material.dispose();
 }
});
