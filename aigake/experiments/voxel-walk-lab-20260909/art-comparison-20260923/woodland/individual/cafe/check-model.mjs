import assert from 'node:assert/strict';
import {writeFile,readFile} from 'node:fs/promises';
import {createCafeCells,CELL} from './model.mjs';
import {PALETTE,roughness} from './palette.mjs';
import {groundedCells,meshChunk} from '../../../density-core.mjs';
const cells=createCafeCells({stage:'detail'}),checks=[],check=(name,fn)=>{fn();checks.push(name);};
check('All cell coordinates are integer, palette IDs resolve',()=>{for(const c of cells.values()){assert([c.x,c.y,c.z].every(Number.isInteger));assert(c.y>=0);assert(PALETTE[c.color]);}});
check('Every cell is supported through face adjacency from ground',()=>assert.equal(groundedCells(cells).size,cells.size));
check('Front and side windows retain uninterrupted glass, no centre posts',()=>{for(let x=-12;x<=0;x++)for(let y=7;y<=16;y++){assert(cells.get(`${x},${y},13`).color.startsWith('glass'));assert(!cells.has(`${x},${y},14`));}for(let z=-7;z<=4;z++)for(let y=7;y<=16;y++){assert(cells.get(`16,${y},${z}`).color.startsWith('glass'));assert(!cells.has(`17,${y},${z}`));}});
check('Entrance route clear above stone steps; awning above door',()=>{for(let x=6;x<=13;x++)for(let z=16;z<=20;z++)for(let y=2;y<=18;y++)assert(!cells.has(`${x},${y},${z}`));assert(Math.min(...[...cells.values()].filter(c=>c.part==='awning').map(c=>c.y))>18);});
check('Each chair and table has four continuous grounded legs',()=>{for(const [id,xs,zs,height] of [['table',[24,30],[5,11],7],['chair-front',[25,30],[15,20],4],['chair-back',[25,30],[-4,1],4]])for(const x of xs)for(const z of zs){assert(cells.has(`${x},0,${z}`));for(let y=1;y<=height;y++)assert.equal(cells.get(`${x},${y},${z}`)?.part,id);}});
check('Roof has a continuous lower surface across course joints',()=>{for(let x=-19;x<=18;x++)for(let z=-18;z<17;z++){const a=new Set(),b=new Set();for(let y=20;y<=35;y++){if(['roof','tiles','ridge','fascia','chimney'].includes(cells.get(`${x},${y},${z}`)?.part))a.add(y);if(['roof','tiles','ridge','fascia','chimney'].includes(cells.get(`${x},${y},${z+1}`)?.part))b.add(y);}assert([...a].some(y=>b.has(y)),`roof join ${x},${z}`);}});
check('Chimney cap has a real empty opening',()=>{for(let x=-12;x<=-10;x++)for(let z=-4;z<=-2;z++)assert(!cells.has(`${x},37,${z}`));});
const compiled=[],palette=Object.fromEntries(Object.keys(PALETTE).map(k=>[k,[.5,.5,.5]]));let triangles=0;
for(const part of new Set([...cells.values()].map(c=>c.part))){const m=meshChunk([...cells.values()].filter(c=>c.part===part),cells,CELL,{palette,roughnessFor:c=>roughness(c.color)});assert([...m.positions,...m.normals].every(Number.isFinite));compiled.push({part,m});triangles+=m.triangles;}
const vertices=[],indices=[],normals=[];for(const {m} of compiled)for(let i=0;i<m.positions.length;i+=3){indices.push(vertices.length);vertices.push(Array.from(m.positions.slice(i,i+3)));normals.push(Array.from(m.normals.slice(i,i+3)));}
const report={checks,cells:cells.size,triangles,parts:compiled.map(p=>p.part),visualAcceptance:'Not assessed by this script. Formal visual quality gate remains pending.'};
await writeFile('evidence/detail-structure.json',JSON.stringify(report,null,2));await writeFile('evidence/detail-cells.json',JSON.stringify([...cells.values()]));await writeFile('evidence/detail-geometry.json',JSON.stringify({meshes:[{id:'cafe-union',vertices,indices,normals}]}));console.log(JSON.stringify(report,null,2));
