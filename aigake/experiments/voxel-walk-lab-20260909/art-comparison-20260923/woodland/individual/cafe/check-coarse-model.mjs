import assert from 'node:assert/strict';
import {writeFile} from 'node:fs/promises';
import {createCafeCells,CELL} from './model.mjs';
import {createCoarseCafeCells,COARSE_CELL} from './coarse-model.mjs';
import {buildCafeSurfaces,chamferBox} from './surface-finish.mjs';
import {FINISH_BEVEL} from './architectural-finish.mjs';
import {PALETTE} from './palette.mjs';
import {groundedCells} from '../../../density-core.mjs';

const source=createCafeCells(),before=JSON.stringify([...source]),cells=createCoarseCafeCells(source),checks=[];
const check=(name,fn)=>{fn();checks.push(name);};
check('Eight 15cm positions form one real 30cm cube',()=>{
 assert.equal(COARSE_CELL,CELL*2);
 const eight=new Map();for(let x=-2;x<0;x++)for(let y=0;y<2;y++)for(let z=2;z<4;z++)eight.set(`${x},${y},${z}`,{x,y,z,color:'plaster',part:'wall',phase:1});
 const reduced=createCoarseCafeCells(eight);assert.equal(reduced.size,1);assert(reduced.has('-1,0,1'));
 const g=chamferBox([-1,0,1,1,1,1],FINISH_BEVEL,null,COARSE_CELL);
 for(let a=0;a<3;a++){const v=g.positions.filter((_,i)=>i%3===a);assert(Math.abs(Math.max(...v)-Math.min(...v)-COARSE_CELL)<1e-7);}
});
check('Source unchanged; exactly one coarse cell per occupied 2x2x2 bucket',()=>{
 assert.equal(JSON.stringify([...source]),before);
 const expected=new Set([...source.values()].map(c=>[c.x,c.y,c.z].map(v=>Math.floor(v/2)).join(',')));
 assert.deepEqual(new Set(cells.keys()),expected);
 for(const c of cells.values()){assert([c.x,c.y,c.z].every(Number.isInteger));assert(PALETTE[c.color]);assert(!('finishUnit' in c));}
});
check('Whole-building size retained within a 15cm grid snap',()=>{
 for(const axis of ['x','y','z']){
  const a=[...source.values()].map(c=>c[axis]),b=[...cells.values()].map(c=>c[axis]);
  const lower=Math.min(...a)*CELL-Math.min(...b)*COARSE_CELL,upper=(Math.max(...b)+1)*COARSE_CELL-(Math.max(...a)+1)*CELL;
  assert(lower>=-1e-6&&lower<=CELL+1e-6);assert(upper>=-1e-6&&upper<=CELL+1e-6);
 }
});
check('All coarse cells remain connected to ground',()=>assert.equal(groundedCells(cells).size,cells.size));
check('Front and side window centres remain glass without a white bar',()=>{
 for(let x=-5;x<=-1;x++)for(let y=4;y<=7;y++)assert(cells.get(`${x},${y},6`)?.color.startsWith('glass'));
 for(let z=-2;z<=1;z++)for(let y=4;y<=7;y++)assert(cells.get(`8,${y},${z}`)?.color.startsWith('glass'));
 for(let x=4;x<=5;x++)for(let y=5;y<=8;y++)assert(cells.get(`${x},${y},6`)?.color.startsWith('glass'));
});
check('Entry clear and each chair/table retains four supported legs',()=>{
 for(let x=3;x<=6;x++)for(let z=8;z<=10;z++)for(let y=1;y<=8;y++)assert(!cells.has(`${x},${y},${z}`));
 for(const [part,zs,height] of [['table',[2,5],3],['chair-front',[7,10],2],['chair-back',[-2,0],2]])for(const x of [12,15])for(const z of zs){assert(cells.has(`${x},0,${z}`));for(let y=1;y<=height;y++)assert.equal(cells.get(`${x},${y},${z}`)?.part,part);}
});
check('Roof connected across courses and chimney flue still open',()=>{
 const roofParts=new Set(['roof','tiles','ridge','fascia','chimney']);
 for(let x=-9;x<=8;x++)for(let z=-9;z<8;z++){
  const a=[],b=[];for(let y=10;y<=19;y++){if(roofParts.has(cells.get(`${x},${y},${z}`)?.part))a.push(y);if(roofParts.has(cells.get(`${x},${y},${z+1}`)?.part))b.push(y);}
  assert(a.some(y=>b.includes(y)),`Open roof join ${x},${z}`);
 }
 for(let y=17;y<=20;y++)assert(!cells.has(`-6,${y},-5`));
});
const palette=Object.fromEntries(Object.keys(PALETTE).map(k=>[k,[.5,.5,.5]])),meshes=buildCafeSurfaces(cells,palette,{unit:'voxel',cellSize:COARSE_CELL});
check('Every rendered triangle stays within one 30cm cell',()=>{
 for(const m of meshes){assert(m.positions.every(Number.isFinite));for(let i=0;i<m.positions.length;i+=9)for(let a=0;a<3;a++){const v=[0,3,6].map(j=>m.positions[i+j+a]);assert(Math.max(...v)-Math.min(...v)<=COARSE_CELL+1e-6);}}
});
const report={sourceCells:source.size,coarseCells:cells.size,sourceCellSize:CELL,coarseCellSize:COARSE_CELL,triangles:meshes.reduce((n,m)=>n+m.triangles,0),partMeshes:meshes.length,checks,scope:'Grid coarsening comparison. The scene is not scaled up. Thin structures expand to one 30cm cell; small decorative details are simplified. iPhone performance not measured.'};
await writeFile('evidence/coarse7-structure.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));
