import test from 'node:test';
import assert from 'node:assert/strict';
import {PROPS,PREMIUM_PROPS,PREMIUM_PACKS,propModel,placedCells} from './props.mjs';
import {REGION_NAMES,initialState,canPlaceProp,exportTown,importTown} from './model.mjs';
function unsupported(cells){
 const lookup=new Map(cells.map(c=>[`${c.x},${c.y},${c.z}`,c])),queue=cells.filter(c=>c.y===1),seen=new Set(queue.map(c=>`${c.x},${c.y},${c.z}`));
 for(let i=0;i<queue.length;i++){const c=queue[i];for(const[a,b,d]of [[1,0,0],[-1,0,0],[0,1,0],[0,-1,0],[0,0,1],[0,0,-1]]){const k=`${c.x+a},${c.y+b},${c.z+d}`;if(lookup.has(k)&&!seen.has(k)){seen.add(k);queue.push(lookup.get(k));}}}
 return cells.filter(c=>!seen.has(`${c.x},${c.y},${c.z}`));
}
test('11 regional paid packs each contain 30 real models, alongside 44 basic props',()=>{
 assert.deepEqual(Object.keys(PREMIUM_PACKS).sort(),Object.keys(REGION_NAMES).sort());assert.equal(Object.keys(PROPS).length,374);
 for(const[region,ids]of Object.entries(PREMIUM_PACKS)){assert.equal(ids.length,30,region);assert.equal(new Set(ids.map(id=>PROPS[id].name)).size,30,region);for(const id of ids){assert.equal(PROPS[id].tier,'premium');assert.equal(PROPS[id].region,region);assert.ok(PROPS[PROPS[id].fallback]);}}
});
test('every premium object has grounded connected components, bounded scale and valid voxels',()=>{
 const issues=[];for(const id of Object.keys(PREMIUM_PROPS)){const m=propModel(id),cells=m.cells;assert.ok(cells.length>=10,id);assert.ok(cells.length<5000,id);assert.ok(cells.every(c=>Number.isInteger(c.x)&&Number.isInteger(c.y)&&Number.isInteger(c.z)&&c.y>=1&&c.y<=24&&Math.abs(c.x)<=12&&Math.abs(c.z)<=12&&/^#[a-f0-9]{6}$/i.test(c.color)),id);assert.equal(new Set(cells.map(c=>`${c.x},${c.y},${c.z}`)).size,cells.length,id);const floating=unsupported(cells);if(floating.length)issues.push(`${id}: ${floating.length} detached, e.g. ${JSON.stringify(floating[0])}`);for(let r=0;r<4;r++){const rotated=placedCells({id:'ptest',kind:id,x:20,z:20,r});assert.equal(rotated.length,cells.length);}}
 assert.deepEqual(issues,[]);
});
test('the 30 models in a region differ in geometry, not only in color',()=>{
 for(const [region,ids]of Object.entries(PREMIUM_PACKS)){const shapes=new Map();for(const id of ids){const signature=propModel(id).cells.map(c=>`${c.x},${c.y},${c.z}`).sort().join(';');assert.ok(!shapes.has(signature),`${region}: ${id} duplicates ${shapes.get(signature)}`);shapes.set(signature,id);}}
});
test('premium placement obeys roads and entrances; sharing preserves models without construction progress',()=>{
 const state=initialState(),p={id:'ppremium',kind:'stars-instrument-refractor',x:14,z:16,r:1};assert.equal(canPlaceProp(state,p),null);assert.ok(canPlaceProp(state,{...p,x:0,z:0}));assert.ok(canPlaceProp(state,{...p,x:-32,z:-16}));state.props.push(p);const restored=importTown(exportTown(state));assert.equal(restored.props.at(-1).kind,p.kind);assert.equal(restored.buildings[0].steps,0);
});
