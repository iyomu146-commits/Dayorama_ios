import test from 'node:test';
import assert from 'node:assert/strict';
import {makeCoarseCafe,subdivideCoarse,CAFE_PLAN} from './coarse-cafe.mjs';
import {groundedCells,makeTimeline,atSteps,encodeDensity,decodeDensity,buckets,meshChunk} from './density-core.mjs';
const cells=makeCoarseCafe(),map=new Map(cells.map(c=>[`${c.x},${c.y},${c.z}`,c])),at=(x,y,z)=>map.get(`${x},${y},${z}`);
test('native coarse model and every construction prefix stay connected to the ground',()=>{
 assert.ok(cells.length<12000);assert.equal(groundedCells(map).size,map.size);
 const timeline=makeTimeline(cells),built=new Map();
 for(const stage of timeline.stages)for(const c of stage){
  const key=`${c.x},${c.y},${c.z}`;
  assert.ok(c.y===0||built.has(key)||[[1,0,0],[-1,0,0],[0,1,0],[0,-1,0],[0,0,1],[0,0,-1]].some(d=>built.has(`${c.x+d[0]},${c.y+d[1]},${c.z+d[2]}`)),`floating reveal at ${key}`);
  built.set(key,c);
 }
 assert.equal(built.size,map.size);assert.equal(atSteps(timeline,0).size,0);
});
test('roof covers every column; window panes have no central posts or wall occlusion',()=>{
 const r=CAFE_PLAN.roof;
 for(let x=r.x[0];x<=r.x[1];x++)for(let z=r.z[0];z<=r.z[1];z++)assert.ok(cells.some(c=>c.x===x&&c.z===z&&c.y>=24&&c.color.startsWith('roof')),`roof gap ${x},${z}`);
 for(let x=-17;x<=-7;x++)for(let y=9;y<=19;y++){
  assert.ok(at(x,y,9)?.color.startsWith('glass'));
  for(let z=10;z<=12;z++)assert.equal(at(x,y,z),undefined,'front pane is covered');
 }
 for(let z=-9;z<=2;z++)for(let y=9;y<=18;y++){
  assert.ok(at(10,y,z)?.color.startsWith('glass'));
  for(let x=11;x<=12;x++)assert.equal(at(x,y,z),undefined,'side pane is covered');
 }
});
test('door clearance and furniture have consistent paving height and four separate legs',()=>{
 // Canopy underside is above the door head (y=19); the approach has only steps.
 for(let x=1;x<=7;x++)for(let z=11;z<=20;z++)for(let y=3;y<=18;y++)assert.equal(at(x,y,z),undefined,`blocked entrance ${x},${y},${z}`);
 for(const c of cells.filter(c=>c.phase===4&&c.x>=1&&c.x<=7&&c.z>=11&&c.z<=15&&['cloth','cream'].includes(c.color)))assert.ok(c.y>=20,'canopy intersects door header');
 for(const [xs,zs,top] of [[[18,23],[-3,2],4],[[19,22],[-9,-6],2],[[19,22],[5,8],2]]){
  for(const x of xs)for(const z of zs){assert.ok(at(x,0,z));for(let y=1;y<=top;y++)assert.equal(at(x,y,z)?.color,'woodDark');}
  assert.equal(at(xs[0]+1,1,zs[0]+1),undefined,'legs should not form a solid pedestal');
 }
});
test('coarse model remains editable and preserves stages after file roundtrip',()=>{
 const read=decodeDensity(encodeDensity(map,2));assert.equal(read.factor,2);assert.equal(read.map.size,map.size);
 for(const s of [2000,6000,12000,17000,20000])assert.equal(atSteps(makeTimeline([...read.map.values()]),s).size,atSteps(makeTimeline(cells),s).size);
 const fine=subdivideCoarse(cells);assert.equal(fine.length,cells.length*8);assert.ok(fine.every(c=>(c.under||[]).every(v=>v.x===c.x&&v.y===c.y&&v.z===c.z)));
 const meshes=[...buckets(map).values()].map(c=>meshChunk(c,map,.15));assert.ok(meshes.every(m=>[...m.positions,...m.colors].every(Number.isFinite)));
});
