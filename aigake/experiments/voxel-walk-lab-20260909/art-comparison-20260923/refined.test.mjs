import test from 'node:test';
import assert from 'node:assert/strict';
import {makeRefinedDesign,voxelizeRefined} from './refined.mjs';
import {CELL,cellKey,encodeWork,decodeWork,visibleCells} from './design.mjs';
const design=makeRefinedDesign(),cells=voxelizeRefined(design),byKey=new Map(cells.map(c=>[cellKey(c),c]));

function component(list){
 const map=new Map(list.map(c=>[cellKey(c),c])),q=[list[0]],seen=new Set([cellKey(list[0])]);
 for(let i=0;i<q.length;i++){const c=q[i];for(let dx=-1;dx<=1;dx++)for(let dy=-1;dy<=1;dy++)for(let dz=-1;dz<=1;dz++){
  const k=`${c.x+dx},${c.y+dy},${c.z+dz}`;if(!map.has(k)||seen.has(k))continue;seen.add(k);q.push(map.get(k));
 }}return seen.size;
}
test('crafted roof covers the whole hip footprint and every raised seam touches its shell',()=>{
 const roof=design.parts.find(p=>p.shape==='hip');
 // Fascia, ridge cap and chimney deliberately replace portions of the shell.
 const shell=cells.filter(c=>c.group==='cafe'&&c.y*CELL>roof.p[1]-.16&&(c.color.startsWith('roof')||['brick','brick2','stone','metal'].includes(c.color))),columns=new Set(shell.map(c=>`${c.x},${c.z}`));
 for(let x=Math.ceil((roof.p[0]-roof.s[0])/CELL);x<Math.floor((roof.p[0]+roof.s[0])/CELL);x++)
 for(let z=Math.ceil((roof.p[2]-roof.s[2])/CELL);z<Math.floor((roof.p[2]+roof.s[2])/CELL);z++)assert.ok(columns.has(`${x},${z}`),'uncovered roof column');
 const seams=cells.filter(c=>c.color==='roofSeam');assert.ok(seams.length>250);
 for(const c of seams)assert.ok(byKey.has(`${c.x},${c.y-1},${c.z}`),'floating seam');
});
test('the tree has one grounded connected component, with roots and twigs retained',()=>{
 const tree=cells.filter(c=>c.group==='tree');assert.ok(tree.length>18000);assert.equal(component(tree),tree.length);
 assert.ok(Math.min(...tree.map(c=>c.y))*CELL<=.075);
 for(const name of ['地面を支える根','主枝','小枝','枝先の葉'])assert.ok(design.parts.some(p=>p.name===name));
});
test('crafted furniture is connected, grounded and outside the entrance clearance',()=>{
 const bench=cells.filter(c=>c.group==='bench');assert.equal(component(bench),bench.length);
 const e=design.entrance;
 for(const c of cells.filter(c=>['bench','terrace'].includes(c.group))){const x=(c.x+.5)*CELL,z=(c.z+.5)*CELL;assert.ok(!(x>e.min[0]&&x<e.max[0]&&z>e.min[2]&&z<e.max[2]));}
 const feet=design.parts.filter(p=>['ベンチの脚','椅子の脚','テーブルの足'].includes(p.name));assert.equal(feet.length,15);
 for(const p of feet)assert.ok(Math.abs(Math.min(p.p[1],p.end[1])-.17)<.025);
 assert.equal(design.parts.filter(p=>p.name==='ベンチの座板').length,5);
});
test('both colour variants fit the work format and retain crafted cells, glass emission and phase layers',()=>{
 for(const source of [cells,voxelizeRefined(makeRefinedDesign(1))]){
  const edited=[...source,{x:99,y:2,z:41,color:'leafGold',phase:4,group:'custom'}];
  const text=encodeWork(edited),shared=decodeWork(text);assert.ok(text.length<16000000);assert.ok(shared.length<240000);
  assert.equal(shared.length,edited.length);assert.equal(shared.at(-1).color,'leafGold');
  assert.ok(shared.filter(c=>c.color.startsWith('glass')).every(c=>c.emission));
  for(const step of [0,2000,6000,12000,17000,20000])assert.equal(visibleCells(source,step).length,visibleCells(decodeWork(encodeWork(source)),step).length);
  assert.ok(source.every(c=>[c.x,c.y,c.z].every(n=>Math.abs(n)<=120)));
 }
});
