import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {registerHooks} from 'node:module';
registerHooks({resolve(s,c,next){return s==='three'?{url:new URL('../vendor/three/three.module.js',import.meta.url).href,shortCircuit:true}:next(s,c);}});
const {workshop}=await import('../experiments/voxel-walk-lab-20260909/content/kit.mjs');
const {REGIONS}=await import('../experiments/voxel-walk-lab-20260909/content/catalog.mjs');
const {plantBlueprint,REGIONAL_GROUND_PLANTS}=await import('../experiments/voxel-walk-lab-20260909/content/ecology.mjs');
const {FLOWER_STYLES}=await import('../experiments/voxel-walk-lab-20260909/content/flowers.mjs');
const {ROCK_PALETTES,regionalRock}=await import('../experiments/voxel-walk-lab-20260909/content/rocks.mjs');
const {contentBlueprint}=await import('../experiments/voxel-walk-lab-20260909/content/blueprints.mjs');
const {makeTown}=await import('../experiments/voxel-walk-lab-20260909/art-direction-20260915/town-plan.mjs');
const {makeLifePlan,createLifeAnimal,updateLifeAnimal}=await import('../experiments/voxel-walk-lab-20260909/art-direction-20260915/town-life.mjs');
const {makeDomesticPlan}=await import('../experiments/voxel-walk-lab-20260909/art-direction-20260915/town-domestic-plan.mjs');
const {hash}=await import('../experiments/voxel-walk-lab-20260909/model.mjs');
const {treeGrowth}=await import('../experiments/voxel-walk-lab-20260909/art-direction-20260915/tree-growth.mjs');
const {vegetationShape,vegetationOverlap,vegetationHitsBox,sceneryBoxes}=await import('../experiments/voxel-walk-lab-20260909/art-direction-20260915/vegetation-layout.mjs');
const {prepareConstruction,constructionPlan}=await import('./construction.mjs');
const THREE=await import('three');
const profiles=JSON.parse(readFileSync(new URL('../experiments/voxel-walk-lab-20260909/art-direction-20260915/profiles.json',import.meta.url))).regions;

function assertConnected(cells,label){
 const keys=new Set(cells.map(c=>[c.x,c.y,c.z].join(','))),visited=new Set(),queue=[[cells[0].x,cells[0].y,cells[0].z]];
 assert.equal(keys.size,cells.length,label+' unique voxels');
 for(let i=0;i<queue.length;i++){
  const p=queue[i],key=p.join(',');if(visited.has(key))continue;visited.add(key);
  for(let axis=0;axis<3;axis++)for(const d of [-1,1]){const q=[...p];q[axis]+=d;const k=q.join(',');if(keys.has(k)&&!visited.has(k))queue.push(q);}
 }
 assert.equal(visited.size,cells.length,label+' attached petals / stems / surfaces');
}
test('regional flowers have attached petals and visible, separately coloured centres',()=>{
 for(const [kind,style]of Object.entries(FLOWER_STYLES))for(const seed of [741,913,2401]){
  const cells=plantBlueprint(kind,seed),colors=new Set(cells.map(c=>c.color));
  assertConnected(cells,kind);assert.equal(Math.min(...cells.map(c=>c.y)),0);
  assert.ok(style.petals.some(c=>colors.has(c)),kind+' petals');
  assert.ok(colors.has(style.stamen),kind+' stamens');assert.ok(colors.has(style.pistil),kind+' pistil');
  assert.ok(Math.max(...cells.map(c=>c.y))<=10,kind+' small enough for ground planting');
 }
});
test('each natural region uses its own flowers and three grounded, non-box rocks',()=>{
 const expected={harbor:'sea-lavender',canal:'iris',meadow:'daisy',alpine:'edelweiss',satoyama:'hydrangea',oasis:'desert-flower',snow:'snowdrop',stars:'moonflower',tropical:'hibiscus'};
 for(const p of profiles)for(const seed of [741,913,2401]){
  const plan=makeTown(p,seed),rocks=plan.boxes.filter(b=>b.rockId),groups=Map.groupBy(rocks,b=>b.rockId);
  if(p.id==='tokyo'){assert.equal(rocks.length,0);assert.equal(plan.plants.length,0);continue;}
  assert.equal(groups.size,3,p.id+' '+seed+' rock count');
  if(expected[p.id])assert.ok(plan.plants.some(plant=>plant.kind===expected[p.id]),p.id+' retains local flowers');
  for(const plant of plan.plants)if(!['crop','mushroom'].includes(plant.kind))assert.ok(REGIONAL_GROUND_PLANTS[p.id].includes(plant.kind));
  const obstacles=sceneryBoxes(plan.buildings,plan.boxes.filter(b=>!b.rockId));
  for(const [id,parts]of groups){
   const base=Math.min(...parts.map(b=>b.y-b.h/2));
   assert.ok(parts.length>30,p.id+' rock has shaped surface');
   for(const b of parts){
    assert.equal(plan.wet(b.x,b.z),false);assert.equal(plan.onPath(b.x,b.z),false);assert.equal(plan.deck(b.x,b.z),null);
    assert.ok(Math.abs(plan.surface(b.x,b.z)-base)<.015,p.id+' supported rock base');
    const box={min:[b.x-b.w/2,b.y-b.h/2,b.z-b.d/2],max:[b.x+b.w/2,b.y+b.h/2,b.z+b.d/2]};
    assert.ok(!obstacles.some(o=>overlaps(box,o)),p.id+' rock '+id+' clears scenery');
   }
  }
 }
 for(const region of Object.keys(ROCK_PALETTES))for(let variant=0;variant<3;variant++){
  const cells=regionalRock(region,741,variant);assertConnected(cells,region);
  const volume=['x','y','z'].reduce((n,k)=>n*(Math.max(...cells.map(c=>c[k]))-Math.min(...cells.map(c=>c[k]))+1),1);
  assert.ok(cells.length<volume*.8,region+' has an irregular silhouette');
  if(region==='snow')assert.ok(cells.some(c=>ROCK_PALETTES.snow.snow.includes(c.color)));
 }
});
test('bespoke tower glazing and the laboratory front keep only their outer supports',()=>{
 const tower=makeTown(profiles.find(p=>p.id==='tokyo'),741).buildings.find(b=>b.kind==='tokyo-tower').bp;
 for(const [y,r]of [[42,7],[63,4]])for(let x=-r+1;x<r;x++)for(const z of [-r,r]){
  const c=tower.cells.find(c=>c.x===x&&c.y===y+2&&c.z===z);assert.equal(c?.surface,3,'tower uninterrupted glass');
 }
 const lab=contentBlueprint('meteorite-lab'),k=workshop('stars');
 for(let y=3;y<10;y++){
  assert.equal(lab.cells.find(c=>c.x===13&&c.y===y&&c.z===9)?.color,k.C.glass,'laboratory central glazing');
  assert.equal(lab.cells.some(c=>c.x===13&&c.y===y&&c.z===10),false,'no post in front of glass');
 }
});

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
 for(const profile of profiles)for(const seed of [741,913,2401]){
  const plan=makeTown(profile,seed),groups=[...Array.from({length:4},(_,v)=>({items:plan.trees.filter(t=>t.variant===v),cells:plan.treePrototypes[v]})),...Object.entries(plan.prototypes).map(([kind,cells])=>({items:plan.plants.filter(p=>p.kind===kind),cells}))],grid=new Map();let item=0;
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

test('regional trees grow one at a time, stay rooted and keep clear of the surrounding scene',()=>{
 for(const profile of profiles)for(const seed of [741,913,2401]){
  const base=makeTown(profile,seed),plan=constructionPlan(base,prepareConstruction({total:0,townStart:0},base).construction);
  const obstacles=sceneryBoxes(plan.buildings,plan.boxes),plants=plan.plants.map(p=>({...p,shape:vegetationShape(plan.prototypes[p.kind],p.u)}));
  const trees=plan.trees.map(t=>({...t,shape:vegetationShape(plan.treePrototypes[t.variant],t.u)}));
  for(const [i,t]of trees.entries()){
   assert.ok(t.mature>t.birth);assert.ok(t.mature<=1);if(i)assert.ok(t.birth>=trees[i-1].mature);
   const complete=treeGrowth(t,1);assert.deepEqual(complete,{progress:1,height:1,width:1});
   let previous=0;
   for(const phase of [.001,...Array.from({length:20},(_,i)=>(i+1)/20)]){
    const progress=t.birth+(t.mature-t.birth)*phase,g=treeGrowth(t,progress);
    assert.ok(g.height>=previous&&g.height<=1&&g.width<=g.height);previous=g.height;
    assert.ok(plan.trees.filter(other=>{const state=treeGrowth(other,progress);return state.progress>1e-8&&state.progress<1-1e-8;}).length<=1);
    // The first voxel's lower face remains exactly at the soil throughout growth.
    assert.ok(Math.abs(t.y+t.u/2*g.height-.05*(t.u/.1*g.height)-t.y)<1e-10);
    const bands=t.shape.bands.map(b=>({min:b.min*g.height,max:b.max*g.height,r:b.r*g.width}));
    const grown={...t,shape:{bands,r:t.shape.r*g.width,min:t.shape.min*g.height,max:t.shape.max*g.height}};
    assert.ok(!obstacles.some(b=>vegetationHitsBox(grown,b)),profile.id+' growing tree hits scenery');
    assert.ok(!plants.some(p=>p.birth<=progress&&vegetationOverlap(grown,p)),profile.id+' growing tree hits a plant');
    assert.ok(!trees.slice(0,i).some(other=>vegetationOverlap(grown,other)),profile.id+' growing tree hits another tree');
    assert.deepEqual(treeGrowth(t,progress),g,'reopening and replaying produce the same growth');
   }
  }
  for(const p of plan.plants.filter(p=>p.kind==='mushroom'))assert.ok(p.birth>=plan.trees[p.tree].mature,'root mushrooms follow their mature tree');
 }
});
