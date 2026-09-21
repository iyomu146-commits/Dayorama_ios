import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {registerHooks} from 'node:module';
import {townClock,localHour,laundryState,laundryWork,smokeActivity} from '../experiments/voxel-walk-lab-20260909/art-direction-20260915/town-clock.mjs';
import {windowLighting} from '../experiments/voxel-walk-lab-20260909/art-direction-20260915/window-lighting.mjs';
registerHooks({resolve(s,c,next){return s==='three'?{url:new URL('../vendor/three/three.module.js',import.meta.url).href,shortCircuit:true}:next(s,c);}});
const {makeTown}=await import('../experiments/voxel-walk-lab-20260909/art-direction-20260915/town-plan.mjs');
const {makeLifePlan}=await import('../experiments/voxel-walk-lab-20260909/art-direction-20260915/town-life.mjs');
const {makeDomesticPlan,routeLength,routePoint}=await import('../experiments/voxel-walk-lab-20260909/art-direction-20260915/town-domestic-plan.mjs');
const {createDomestic}=await import('../experiments/voxel-walk-lab-20260909/art-direction-20260915/town-domestic.mjs');
const THREE=await import('three');
const profiles=JSON.parse(readFileSync(new URL('../experiments/voxel-walk-lab-20260909/art-direction-20260915/profiles.json',import.meta.url))).regions;

test('clock uses local civil time, stays continuous at midnight and exposes gentle night light',()=>{
 assert.equal(localHour(new Date(2026,8,21,17,30,0)),17.5);
 assert.equal(townClock(12).daylight,1);assert.equal(townClock(12).lamps,0);
 assert.equal(townClock(21).lamps,1);assert.ok(townClock(23.5).rooms<townClock(20).rooms);
 for(const h of [0,5,7,16.5,17,19,21,24])for(const key of ['daylight','sunset','dawn','lamps','rooms'])assert.ok(Math.abs(townClock(h-.0001)[key]-townClock(h+.0001)[key])<.002,`${h}: ${key}`);
});
test('laundry has continuous outward/work/home travel and changes cloth only at the line',()=>{
 const offset=.3,trip=16,start=16.7+offset;
 assert.equal(laundryState(12,offset,trip).cloth,1);assert.equal(laundryState(21,offset,trip).cloth,0);
 const out=laundryState(start+8/3600,offset,trip),work=laundryState(start+25/3600,offset,trip),home=laundryState(start+42/3600,offset,trip);
 assert.equal(out.phase,'out');assert.ok(Math.abs(out.travel-.5)<1e-7);assert.equal(out.cloth,1);
 assert.equal(work.phase,'work');assert.ok(Math.abs(work.cloth-.5)<1e-7);
 assert.equal(home.phase,'home');assert.equal(home.cloth,0);assert.ok(Math.abs(home.travel-.5)<1e-7);
 for(const collect of [true,false]){
  assert.equal(laundryWork(0,collect).x,0);assert.equal(laundryWork(1,collect).x,0);
  for(const seconds of [3,9,15]){const pose=laundryWork(seconds/18,collect);assert.equal(pose.moving,false);assert.ok(Math.abs(pose.x-(collect?1:-1)*(1-(seconds-3)/6)*.34)<1e-7);}
 }
 assert.ok(smokeActivity('sauna','snow',19)>smokeActivity('sauna','snow',10));
});
test('all regional vents are above actual geometry and laundry has clear, accessible side yards',()=>{
 let yards=0,vents=0;
 for(const p of profiles){
  const plan=makeTown(p,741),life=makeLifePlan(plan),domestic=makeDomesticPlan(plan,life);
  for(const c of domestic.chimneys){assert.ok(Number.isFinite(c.y));assert.ok(c.y>plan.buildings[c.building].base+.5);vents++;}
  for(const yard of domestic.laundry){
   assert.ok(life.clear(yard.x,yard.z,yard.r));assert.ok(!plan.onPath(yard.x,yard.z));assert.ok(routeLength(yard.route)>0);
   assert.deepEqual(routePoint(yard.route,0).position,yard.route[0]);
   const end=routePoint(yard.route,1).position;end.forEach((v,i)=>assert.ok(Math.abs(v-yard.route.at(-1)[i])<1e-6));
   // The first doorway segment is the existing validated entrance; the rest
   // must never enter another building, fixture, tree trunk, or water.
   for(let i=yard.approachCount+1;i<yard.route.length;i++){
    const a=yard.route[i-1],b=yard.route[i];for(let t=0;t<=1;t+=.1)assert.ok(life.clear(a[0]+(b[0]-a[0])*t,a[2]+(b[2]-a[2])*t,.17),p.id);
   }
   yards++;
  }
 }
 assert.ok(vents>5);assert.ok(yards>=2,'at least two residential regions have a usable yard');
});
test('glass panes share switches and greenhouse glass cannot become a bright solid building',()=>{
 const p=profiles.find(p=>p.id==='grove'),town=makeTown(p,741),flower=town.buildings.find(b=>b.kind==='flowers'),lights=windowLighting(flower.bp.cells,42);
 for(const c of flower.bp.cells)assert.equal(lights.has([c.x,c.y,c.z].join(',')),c.surface===3);
 assert.ok([...lights.values()].some(l=>l.strength<.1),'large connected greenhouse surface is subdued');
 const synthetic=[{x:0,y:0,z:0,surface:3},{x:1,y:0,z:0,surface:3},{x:2,y:0,z:0,surface:0}],panes=windowLighting(synthetic,42);
 assert.equal(panes.get('0,0,0'),panes.get('1,0,0'));assert.equal(panes.has('2,0,0'),false);
});
test('unfinished homes never show domestic effects and point lights have a fixed upper bound',()=>{
 const plan=makeTown(profiles.find(p=>p.id==='canal'),741),life=makeLifePlan(plan),defs=makeDomesticPlan(plan,life),root=new THREE.Group(),domestic=createDomestic(root,plan,defs);
 const buildings=plan.buildings.map(()=>({progress:0}));domestic.update(townClock(17.5),10,buildings);
 assert.ok(domestic.stats().lights<=6);
 for(const child of root.children.filter(o=>o.isInstancedMesh||o.isGroup))assert.equal(child.visible,false);
 buildings.forEach(b=>b.progress=1);domestic.update(townClock(12),10,buildings);
 assert.ok(root.children.some(o=>o.isGroup&&o.visible),'completed home has a clothesline');
 assert.ok(root.children.filter(o=>o.isPointLight).every(l=>l.intensity===0),'no artificial light at noon');
 domestic.update(townClock(20),10,buildings,{showcase:true});assert.ok(root.children.every(o=>!o.visible),'building-only replay hides surrounding life');
});
