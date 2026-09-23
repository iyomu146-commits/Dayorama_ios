import test from 'node:test';import assert from 'node:assert/strict';
import {makeDesign,voxelize,insidePart,visibleCells,encodeWork,decodeWork,CELL,PHASES,scheduleParts,partVisible} from './design.mjs';
const design=makeDesign(),cells=voxelize(design);
test('all five stages retain progress and converge to the same finished cell set',()=>{
 let prev=0;for(const n of [0,1,500,2000,6000,12000,17000,19999,20000]){const count=visibleCells(cells,n).length;assert.ok(count>=prev);prev=count;}assert.equal(prev,cells.length);assert.ok(visibleCells(cells,0).every(c=>c.phase===-1));
 for(const p of PHASES){const visible=visibleCells(cells,p.end),phase=PHASES.indexOf(p);assert.ok(visible.every(c=>c.phase<=phase));}
});
test('framing hidden by finished walls remains visible during construction and after file sharing',()=>{
 const framed=visibleCells(cells,6000),shared=visibleCells(decodeWork(encodeWork(cells)),6000);
 for(const p of design.parts.filter(p=>p.name==='柱')){const sample=p.p.map(v=>Math.floor(v/CELL)),key=sample.join(',');for(const list of [framed,shared])assert.ok(list.some(c=>[c.x,c.y,c.z].join(',')===key),`missing temporary support ${key}`);}
});
test('every opening retains glass after uniform-grid sampling',()=>{
 for(const pane of design.parts.filter(p=>p.emission&&p.color.startsWith('glass'))){const occupied=cells.filter(c=>c.part===pane.id);assert.ok(occupied.length>12,pane.id+' glass disappeared');}
});
test('hip roof closes every column across its footprint without rafters protruding',()=>{
 const roof=design.parts.find(p=>p.shape==='hip'),[cx,y,cz]=roof.p,[w,h,d]=roof.s;
 const covering=new Set(cells.filter(c=>c.group==='cafe'&&c.y*CELL>y-.16&&['roof','roofLight','roofEdge','brick','brick2','stone','metal'].includes(c.color)).map(c=>`${c.x},${c.z}`));
 for(let x=-w+.15;x<w-.1;x+=CELL)for(let z=-d+.15;z<d-.1;z+=CELL){const top=y+h*Math.min(1-Math.abs(z)/d,1-Math.max(0,Math.abs(x)-roof.ridge)/(w-roof.ridge));assert.ok(insidePart(roof,cx+x,top-.05,cz+z));const ix=Math.floor((cx+x)/CELL),iz=Math.floor((cz+z)/CELL);assert.ok(covering.has(`${ix},${iz}`),`roof hole ${ix},${iz}`);}
 for(const p of design.parts.filter(p=>p.name==='垂木'))for(let t=0;t<=1;t+=.1){const q=p.p.map((v,i)=>v+(p.end[i]-v)*t),x=q[0]-cx,z=q[2]-cz,top=y+h*Math.min(1-Math.abs(z)/d,1-Math.max(0,Math.abs(x)-roof.ridge)/(w-roof.ridge));assert.ok(q[1]+p.s[0]<top+.002,'rafter above roof');}
});
test('tables, chairs and bench feet meet their level paving surface',()=>{
 const feet=design.parts.filter(p=>['椅子の脚','ベンチの脚','テーブルの足'].includes(p.name));assert.ok(feet.length>=15);for(const p of feet){assert.ok(Math.abs(Math.min(p.p[1],p.end[1])-.17)<.031,p.id);}
 const e=design.entrance;for(const p of design.parts.filter(p=>['terrace','bench'].includes(p.group))){assert.ok(!(p.p[0]>e.min[0]&&p.p[0]<e.max[0]&&p.p[2]>e.min[2]&&p.p[2]<e.max[2]),'prop blocks entrance');}
});
test('cell export/import preserves hand edits, coordinate uniqueness and construction phase',()=>{
 const edited=[...cells,{x:95,y:2,z:40,color:'flower',phase:4,group:'custom'}];const decoded=decodeWork(encodeWork(edited));assert.equal(decoded.length,edited.length);assert.equal(decoded.at(-1).color,'flower');assert.equal(decoded.at(-1).x,95);assert.equal(decoded.at(-1).phase,4);
 assert.equal(new Set(decoded.map(c=>[c.x,c.y,c.z].join(','))).size,decoded.length);
});
test('shared imports reject unsupported versions, invalid coordinates, duplicate cells and arbitrary palette payloads',()=>{
 const base=JSON.parse(encodeWork(cells.slice(0,2)));for(const mutation of [d=>d.version=2,d=>d.cells[0][0]=Infinity,d=>d.cells[0][3]='<script>',d=>d.cells.push([...d.cells[0]]),d=>d.cells[0][4]=8,d=>d.cell=.01]){const b=structuredClone(base);mutation(b);assert.throws(()=>decodeWork(JSON.stringify(b)));}
});
test('module stage order is stable and complete at 20k',()=>{const p=scheduleParts(design.parts);assert.ok(p.every(p=>partVisible(p,20000)));assert.ok(p.filter(p=>partVisible(p,0)).every(p=>p.phase<0));assert.deepEqual(voxelize(makeDesign()),cells);});
