import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {registerHooks} from 'node:module';
registerHooks({resolve(s,c,next){return s==='three'?{url:new URL('../vendor/three/three.module.js',import.meta.url).href,shortCircuit:true}:next(s,c);}});
const {workshop}=await import('../experiments/voxel-walk-lab-20260909/content/kit.mjs');
const {REGIONS}=await import('../experiments/voxel-walk-lab-20260909/content/catalog.mjs');
const {makeTown}=await import('../experiments/voxel-walk-lab-20260909/art-direction-20260915/town-plan.mjs');
const {makeLifePlan,createLifeAnimal,updateLifeAnimal}=await import('../experiments/voxel-walk-lab-20260909/art-direction-20260915/town-life.mjs');
const {makeDomesticPlan}=await import('../experiments/voxel-walk-lab-20260909/art-direction-20260915/town-domestic-plan.mjs');
const {hash}=await import('../experiments/voxel-walk-lab-20260909/model.mjs');
const THREE=await import('three');
const profiles=JSON.parse(readFileSync(new URL('../experiments/voxel-walk-lab-20260909/art-direction-20260915/profiles.json',import.meta.url))).regions;

test('even the narrowest front and side windows contain uninterrupted glass in every region',()=>{
 for(const region of Object.keys(REGIONS))for(const width of [3,5,7])for(const side of [false,true]){
  const k=workshop(region);k.window(0,0,0,width,6,side);const cells=k.finish('window').cells;
  assert.equal(cells.length,width*6);
  for(const c of cells){const a=side?c.z:c.x,border=Math.abs(a)===Math.floor(width/2)||c.y===0||c.y===5;assert.equal(c.color,border?k.C.trim:k.C.glass,region+' '+width);}
 }
});

// Measure the rendered cubes independently of the placement envelopes. The
// spatial grid keeps this affordable even with the full tree geometry.
function worldBoxes(cells,p,angle=0,centerOffset=0){
 const s=Math.sin(angle),c=Math.cos(angle),xz=(Math.abs(s)+Math.abs(c))*p.u/2;
 return cells.map(v=>{const x=p.x+(v.x*c+v.z*s)*p.u,y=p.y+v.y*p.u+centerOffset,z=p.z+(-v.x*s+v.z*c)*p.u;return{min:[x-xz,y-p.u/2,z-xz],max:[x+xz,y+p.u/2,z+xz]};});
}
const overlaps=(a,b)=>a.min.every((v,i)=>v<b.max[i]-1e-7&&a.max[i]>b.min[i]+1e-7);
test('rendered vegetation cubes never intersect another plant or tree',()=>{
 for(const profile of profiles){
  const plan=makeTown(profile,741),groups=[...Array.from({length:4},(_,v)=>({items:plan.trees.filter(t=>t.variant===v),cells:plan.treePrototypes[v]})),...Object.entries(plan.prototypes).map(([kind,cells])=>({items:plan.plants.filter(p=>p.kind===kind),cells}))],grid=new Map();let item=0;
  for(const group of groups)for(const [index,p]of [...group.items].sort((a,b)=>a.birth-b.birth).entries()){
   const boxes=worldBoxes(group.cells,p,hash(plan.seed,index,21)*Math.PI*2,p.u/2);item++;
   for(const box of boxes){
    const lo=box.min.map(v=>Math.floor(v/.3)),hi=box.max.map(v=>Math.floor(v/.3));
    for(let x=lo[0];x<=hi[0];x++)for(let y=lo[1];y<=hi[1];y++)for(let z=lo[2];z<=hi[2];z++){
     const key=[x,y,z].join(','),near=grid.get(key)||[];
     for(const other of near)if(other.item!==item)assert.ok(!overlaps(box,other.box),profile.id+' intersects vegetation '+item+' / '+other.item);
     near.push({item,box});grid.set(key,near);
    }
   }
  }
  if(profile.id==='grove'){
   assert.ok(plan.trees.length>=6);assert.ok(plan.plants.length>=100);
   assert.equal(new Set(plan.plants.filter(p=>p.kind.startsWith('wildflower-')).map(p=>p.kind)).size,4);
   for(const p of plan.plants.filter(p=>p.kind==='mushroom'))assert.ok(plan.trees.some(t=>Math.hypot(t.x-p.x,t.z-p.z)<.85&&p.birth>=t.birth));
  }
 }
});

test('both butterflies visit existing shop flowers without entering buildings during flight or rest',()=>{
 for(const seed of [741,913,2401]){
  const plan=makeTown(profiles.find(p=>p.id==='grove'),seed),life=makeLifePlan(plan);makeDomesticPlan(plan,life);
  const visitors=life.animals.filter(a=>a.type==='butterfly');assert.equal(visitors.length,2);assert.deepEqual(life.notes,[]);
  const obstacles=plan.buildings.flatMap(b=>worldBoxes(b.bp.cells,b,b.rot));
  for(const [i,def]of visitors.entries()){
   assert.equal(plan.buildings[def.building].kind,'flowers');assert.equal(def.birth,0);
   const a=createLifeAnimal(def,i,seed);assert.equal(a.rig.wings.length,4);const actions=new Set();let previous;
   for(let t=0;t<=36;t+=.125){
    updateLifeAnimal(a,t);a.g.updateMatrixWorld(true);actions.add(a.action);
    const bounds=new THREE.Box3().setFromObject(a.g),box={min:bounds.min.toArray(),max:bounds.max.toArray()};
    assert.ok(!obstacles.some(o=>overlaps(o,box)),seed+' butterfly hits a building at '+t);
    if(previous)assert.ok(previous.distanceTo(a.g.position)<.03,'no teleport at a pause or turn');previous=a.g.position.clone();
   }
   assert.deepEqual([...actions].sort(),['fly','nectar']);a.rig.dispose();
  }
 }
});
