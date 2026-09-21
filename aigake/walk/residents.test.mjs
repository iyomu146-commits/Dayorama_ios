import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {registerHooks} from 'node:module';
registerHooks({resolve(s,c,next){return s==='three'?{url:new URL('../vendor/three/three.module.js',import.meta.url).href,shortCircuit:true}:next(s,c);}});
const {makeTown}=await import('../experiments/voxel-walk-lab-20260909/art-direction-20260915/town-plan.mjs');
const {makeLifePlan}=await import('../experiments/voxel-walk-lab-20260909/art-direction-20260915/town-life.mjs');
const {createResident,updateResident}=await import('../experiments/voxel-walk-lab-20260909/art-direction-20260915/town-resident.mjs');
const THREE=await import('three');
const profiles=JSON.parse(readFileSync(new URL('../experiments/voxel-walk-lab-20260909/art-direction-20260915/profiles.json',import.meta.url))).regions;

test('the walking app places men, women and children with regional outfits on clear ground',()=>{
 for(const profile of profiles)for(const seed of [741,913,2401]){
  const plan=makeTown(profile,seed),life=makeLifePlan(plan),styles=life.workers.map(w=>w.options.appearance);
  assert.ok(styles.some(s=>s.age==='adult'&&s.gender==='man'),profile.id);
  assert.ok(styles.some(s=>s.age==='adult'&&s.gender==='woman'),profile.id);
  const children=life.workers.filter(w=>w.options.appearance.age==='child');assert.equal(children.length,1,profile.id);
  const child=children[0],parent=life.workers.find(w=>w!==child&&w.zone===child.zone);
  assert.ok(parent);assert.equal(parent.building,child.building,'the whole family appears with one completed building');
  for(const w of [parent,child]){
   assert.ok(w.route.every(([x,,z])=>life.clear(x,z,.3)),profile.id+' has safe footing');
   if(['snow','alpine','stars'].includes(profile.id)){assert.ok(w.options.appearance.coat);assert.ok(w.options.appearance.boots);}
  }
  if(profile.id==='grove'){
   assert.equal(plan.buildings[0].kind,'mushroom-house');
   assert.equal(new Set(styles.filter(s=>s.age==='adult').map(s=>s.role)).size,5);
   assert.equal(styles.find(s=>s.role==='baker').hat,'baker');
   assert.ok(styles.find(s=>s.role==='gardener').overalls);
  }
 }
});
test('parent and child remain side by side through pauses and turns without body intersections',()=>{
 const plan=makeTown(profiles.find(p=>p.id==='grove'),741),life=makeLifePlan(plan);
 const child=life.workers.find(w=>w.options.appearance.age==='child'),parent=life.workers.find(w=>w!==child&&w.zone===child.zone);
 const residents=[parent,child].map(w=>createResident(w.route,w.index,w.building,741,w.options));
 for(let t=0;t<90;t+=.25){
  residents.forEach(a=>updateResident(a,t));
  assert.equal(residents[0].moving,residents[1].moving);
  assert.ok(Math.abs(residents[0].g.position.distanceTo(residents[1].g.position)-.64)<1e-8);
  const bounds=residents.map(a=>new THREE.Box3().setFromObject(a.g));
  assert.ok(!bounds[0].intersectsBox(bounds[1]));
  bounds.forEach((b,i)=>assert.ok(b.min.y>=residents[i].g.position.y-.006));
 }
 residents.forEach(a=>a.rig.dispose());
});
