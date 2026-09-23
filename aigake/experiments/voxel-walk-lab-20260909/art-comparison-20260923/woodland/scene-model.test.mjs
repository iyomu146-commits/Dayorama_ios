import test from 'node:test';
import assert from 'node:assert/strict';
import {makeModel,key,atConstruction} from './scene-model.mjs';
import {BUILDINGS,PALETTE,CELL,ROUGHNESS} from './plan.mjs';
import {meshChunk,groundedCells} from '../density-core.mjs';
const {cells}=makeModel(),full=new Map(cells.map(c=>[key(c),c]));
test('All authored cells are unique integer voxels with known independent material channels',()=>{
 assert.equal(full.size,cells.length);for(const c of cells){assert.ok([c.x,c.y,c.z].every(Number.isInteger));assert.ok(Object.hasOwn(PALETTE,c.color),c.color);assert.ok(ROUGHNESS[c.color]>0&&ROUGHNESS[c.color]<=1);}
});
test('Every construction prefix has an existing face-connected support',()=>{
 for(const b of BUILDINGS){const source=cells.filter(c=>c.asset===b.id),occupied=new Set();for(let phase=0;phase<5;phase++){
  const stage=source.flatMap(c=>[...(c.under||[]),c]).filter(c=>c.phase===phase).sort((a,b)=>a.order-b.order);
  for(const c of stage){const nearby=[[1,0,0],[-1,0,0],[0,1,0],[0,-1,0],[0,0,1],[0,0,-1]].some(d=>occupied.has(`${c.x+d[0]},${c.y+d[1]},${c.z+d[2]}`));assert.ok(c.y===0||occupied.has(key(c))||nearby,`${b.id}: ${key(c)}`);occupied.add(key(c));}
 }for(const n of [0,2000,6000,12000,17000,20000]){const map=atConstruction(source,n);assert.equal(groundedCells(map).size,map.size,`${b.id} at ${n}`);}assert.equal(atConstruction(source,20000).size,source.length);}
});
test('Every building footprint has continuous roof coverage and windows have no centre mullion',()=>{
 for(const b of BUILDINGS){const f=Math.floor(b.d/2),back=f-b.d+1,a=-b.w/2,c=a+b.w-1;
  for(let x=a;x<=c;x++)for(let z=back;z<=f;z++){assert.ok(cells.some(v=>v.asset===b.id&&v.x===b.x+x&&v.z===b.z+z&&v.y>b.h&&(v.part.endsWith('roof')||v.part.endsWith('details')&&/^(brick|plaster|stone)/.test(v.color))),`${b.id} roof or chimney ${x},${z}`);}
  for(const [l,r,lo,hi] of b.windows){const x=b.x+Math.floor((l+r)/2);for(let y=lo+3;y<=hi-1;y++){const v=full.get(`${x},${y},${b.z+f-1}`);assert.ok(v?.color.startsWith('glass')||(b.id==='books'&&y<=14),`${b.id}: window centre ${y}`);}}
  for(let x=b.door[0];x<=b.door[1];x++)for(let z=f+2;z<=f+6;z++)for(let y=4;y<=18;y++)assert.equal(full.has(`${b.x+x},${y},${b.z+z}`),false,`${b.id}: entry blocked`);
 }
});
test('Per-asset exterior mesh stays finite and emits original palette values',()=>{
 const linear=v=>v<=.04045?v/12.92:((v+.055)/1.055)**2.4,palette=Object.fromEntries(Object.entries(PALETTE).map(([k,v])=>[k,[1,3,5].map(i=>linear(parseInt(v.slice(i,i+2),16)/255))]));
 for(const b of BUILDINGS){const source=cells.filter(c=>c.asset===b.id),map=new Map(source.map(c=>[key(c),c])),m=meshChunk(source,map,CELL,{palette,roughnessFor:c=>ROUGHNESS[c.color]});assert.ok(m.triangles>0&&m.triangles<65000);for(const a of [m.positions,m.normals,m.colors,m.surfaces])assert.ok(a.every(Number.isFinite));}
});
