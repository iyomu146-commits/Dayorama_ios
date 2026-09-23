import test from 'node:test';
import assert from 'node:assert/strict';
import {makeSceneDesign} from './scene.mjs';
import {voxelizeRefined} from './refined.mjs';
import {CELL,cellKey,encodeWork,decodeWork,visibleCells,insidePart} from './design.mjs';
const design=makeSceneDesign(),cells=voxelizeRefined(design),map=new Map(cells.map(c=>[cellKey(c),c]));

test('shop panes have a real empty recess and no central post',()=>{
 const pane=design.parts.find(p=>p.name==='ガラス');assert.ok(pane.p[2]<1.05);
 const glazing=cells.filter(c=>c.part===pane.id);assert.ok(glazing.length>600);assert.ok(glazing.every(c=>c.color.startsWith('glass')&&c.emission));
 for(let y=18;y<=34;y++)for(let z=15;z<=17;z++)assert.ok(!map.has(`-20,${y},${z}`),'solid cell occupies the central window recess');
 const side=design.parts.find(p=>p.name==='側面ガラス');assert.ok(side.p[0]<1.6);assert.ok(cells.some(c=>c.part===side.id&&c.emission));
});
test('paving supports the feet, planters and foundation at the preserved contact height',()=>{
 const names=['ベンチの脚','椅子の脚','テーブルの足','庇の支柱','植木鉢','窓辺の鉢','基礎石'];
 for(const p of design.parts.filter(p=>names.includes(p.name))){
  const occupied=cells.filter(c=>c.part===p.id);assert.ok(occupied.length,p.name+' disappeared');
  const bottom=Math.min(...occupied.map(c=>c.y)),feet=occupied.filter(c=>c.y===bottom);
  assert.ok(feet.some(c=>map.has(`${c.x},${c.y-1},${c.z}`)),p.name+' floats');
 }
 const grade=design.parts.find(p=>p.name==='敷地');assert.ok(insidePart(grade,-5.02,-.075,-1.38));
 const stones=design.parts.filter(p=>p.name==='敷石');assert.ok(stones.length>20);assert.ok(new Set(stones.map(p=>p.s[0].toFixed(2))).size>6);
});
test('planting remains outside the entrance and canopy remains one grounded tree',()=>{
 const e=design.entrance;for(const c of cells.filter(c=>c.group==='plants')){const x=(c.x+.5)*CELL,z=(c.z+.5)*CELL;assert.ok(!(x>e.min[0]&&x<e.max[0]&&z>e.min[2]&&z<e.max[2]),'plant blocks doorway');}
 const tree=cells.filter(c=>c.group==='tree'),points=new Map(tree.map(c=>[cellKey(c),c]));
 const start=tree.reduce((a,b)=>a.y<b.y?a:b),seen=new Set([cellKey(start)]),q=[start];
 for(let i=0;i<q.length;i++){const p=q[i];for(let x=-1;x<=1;x++)for(let y=-1;y<=1;y++)for(let z=-1;z<=1;z++){
  const key=`${p.x+x},${p.y+y},${p.z+z}`;if(seen.has(key)||!points.has(key))continue;seen.add(key);q.push(points.get(key));
 }}assert.equal(seen.size,tree.length);assert.ok(start.y<=0);assert.ok(tree.length>12000);
});
test('roof stays covered and all temporary columns survive construction and sharing',()=>{
 const roof=design.parts.find(p=>p.shape==='hip'),cover=new Set(cells.filter(c=>c.group==='cafe'&&c.y*CELL>3.3&&(c.color.startsWith('roof')||['brick','brick2','stone','metal'].includes(c.color))).map(c=>`${c.x},${c.z}`));
 for(let x=Math.ceil((roof.p[0]-roof.s[0])/CELL);x<Math.floor((roof.p[0]+roof.s[0])/CELL);x++)for(let z=Math.ceil((roof.p[2]-roof.s[2])/CELL);z<Math.floor((roof.p[2]+roof.s[2])/CELL);z++)assert.ok(cover.has(`${x},${z}`));
 const framed=new Set(visibleCells(decodeWork(encodeWork(cells)),6000).map(cellKey));
 for(const p of design.parts.filter(p=>p.name==='柱'))assert.ok(framed.has(p.p.map(v=>Math.floor(v/CELL)).join(',')));
});
test('both palettes and all construction phases round-trip within file bounds',()=>{
 for(const source of [cells,voxelizeRefined(makeSceneDesign(1))]){
  const shared=decodeWork(encodeWork(source));assert.equal(shared.length,source.length);assert.ok(shared.length<240000);
  assert.ok(source.every(c=>(c.under?.length??0)<=5));
  for(const n of [0,2000,6000,12000,17000,20000])assert.equal(visibleCells(shared,n).length,visibleCells(source,n).length);
 }
});
