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
const axes=[new THREE.Vector3(1,0,0),new THREE.Vector3(0,1,0),new THREE.Vector3(0,0,1)];
function bodyBlocks(rig){
 rig.root.updateMatrixWorld(true);const result=[];
 rig.root.traverse(mesh=>{if(!mesh.isMesh)return;for(let p=mesh;p;p=p.parent)if(!p.visible)return;
  const attr=mesh.geometry.attributes.position;
  for(let i=0;i<attr.count;i+=36){const b=new THREE.Box3();for(let n=i;n<i+36;n++)b.expandByPoint(new THREE.Vector3().fromBufferAttribute(attr,n));const corners=Array.from({length:8},(_,j)=>new THREE.Vector3(j&1?b.max.x:b.min.x,j&2?b.max.y:b.min.y,j&4?b.max.z:b.min.z).applyMatrix4(mesh.matrixWorld));result.push({name:mesh.parent.name,corners,axes:axes.map(v=>v.clone().transformDirection(mesh.matrixWorld)),box:new THREE.Box3().setFromPoints(corners)});}
 });return result;
}
function hitsCell(block,cell,unit){
 if(!block.box.intersectsBox(new THREE.Box3().setFromCenterAndSize(cell,new THREE.Vector3(unit,unit,unit))))return false;
 for(const axis of [...axes,...block.axes,...block.axes.flatMap(a=>axes.map(b=>new THREE.Vector3().crossVectors(a,b)))]){
  if(axis.lengthSq()<1e-10)continue;const projection=block.corners.map(v=>v.dot(axis)),center=cell.dot(axis),radius=(unit/2-.0004)*(Math.abs(axis.x)+Math.abs(axis.y)+Math.abs(axis.z));
  if(Math.max(...projection)<=center-radius||Math.min(...projection)>=center+radius)return false;
 }return true;
}

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

test('bookshop reader and cafe guest sit on their furniture with grounded feet and clear props',()=>{
 const plan=makeTown(profiles.find(p=>p.id==='grove'),741),life=makeLifePlan(plan),seated=life.workers.filter(w=>w.options.seat);
 assert.equal(seated.length,2);assert.equal(life.workers.filter(w=>plan.buildings[w.building].kind==='books').length,1);
 assert.ok(life.workers.some(w=>plan.buildings[w.building].kind==='tea'&&!w.options.seat),'the cafe still has its server');
 for(const w of seated){
  const b=plan.buildings[w.building],a=createResident(w.route,w.index,w.building,741,w.options),seat=w.options.seat,solids=b.bp.cells.map(c=>new THREE.Vector3(c.x*b.u,c.y*b.u,c.z*b.u).applyAxisAngle(axes[1],b.rot*Math.PI/2).add(new THREE.Vector3(b.x,b.y,b.z))).filter(c=>Math.hypot(c.x-seat.position[0],c.z-seat.position[2])<.8&&c.y<seat.position[1]+1.1);
  let low=Infinity,high=-Infinity;
  for(let t=0;t<=22;t+=.25){
   updateResident(a,t);assert.equal(a.moving,false);assert.deepEqual(a.g.position.toArray(),seat.position);
   for(const block of bodyBlocks(a.rig))assert.ok(!solids.some(c=>hitsCell(block,c,b.u)),w.options.action+': '+block.name+' intersects furniture at '+t);
   const feet=a.rig.legs.map(l=>new THREE.Box3().setFromObject(l.foot).min.y);feet.forEach(y=>assert.ok(Math.abs(y-seat.position[1])<.006,'feet touch the floor'));
   const thigh=a.rig.legs.map(l=>new THREE.Box3().setFromObject(l.upper.children[0]).min.y);thigh.forEach(y=>assert.ok(y>=seat.position[1]+seat.height-.001&&y<seat.position[1]+seat.height+.03,'body rests on the seat'));
   const cup=a.rig.carry.getWorldPosition(new THREE.Vector3());low=Math.min(low,cup.y);high=Math.max(high,cup.y);
  }
  if(w.options.action==='drink')assert.ok(high-low>.18,'the cup moves from the lap to the mouth and back');a.rig.dispose();
 }
});
