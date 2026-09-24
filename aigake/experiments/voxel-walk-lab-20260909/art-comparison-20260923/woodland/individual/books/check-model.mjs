import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createBooksCells,CELL,PALETTE,Y} from './model.mjs';
import {groundedCells} from '../../../density-core.mjs';
import {createVoxelDocument,readVoxelDocument} from './voxel-document.mjs';
const stage=process.argv[2]||'structure',cells=createBooksCells({stage}),checks=[];
const at=(x,y,z)=>cells.get(`${x-3},${y},${z}`);
function check(name,f){f();checks.push(name);}
check('Unique integer 15cm cells and valid palette',()=>{assert.equal(CELL,.15);for(const [k,c]of cells){assert.equal(k,[c.x,c.y,c.z].join(','));assert([c.x,c.y,c.z].every(Number.isInteger));assert(c.y>=0);assert(PALETTE[c.color]);}});
check('Every cell is face-connected to ground',()=>assert.equal(groundedCells(cells).size,cells.size));
check('Display, door and side glazing have no central mullions',()=>{
 for(let x=-15;x<1;x++)for(let y=Y(6);y<Y(17);y++)assert(at(x,y,12)?.color.startsWith('glass'));
 for(let x=8;x<14;x++)for(let y=Y(11);y<Y(17);y++)assert(at(x,y,13)?.part==='door-glass');
 for(let z=-2;z<2;z++)for(let y=Y(8);y<Y(19);y++)assert(at(19,y,z)?.color.startsWith('glass'));
});
check('Roof covers every wall column without holes',()=>{for(let x=-20;x<20;x++)for(let z=-14;z<14;z++){let covered=false;for(let y=Y(25);y<Y(46);y++)if(['roof','chimney','chimney-rim'].includes(at(x,y,z)?.part))covered=true;assert(covered,`Open roof ${x},${z}`);}});
check('Chimney mouth open, bottom sealed',()=>{for(let x=8;x<11;x++)for(let z=-9;z<-6;z++){for(let y=Y(39);y<Y(46);y++)assert(!at(x,y,z));assert(at(x,Y(39)-1,z));}});
check('Entrance approach clear above the two steps',()=>{for(let x=7;x<15;x++)for(let z=15;z<28;z++)for(let y=Y(2);y<Y(19);y++)assert(!at(x,y,z));});
check('Books supported by their shelf or lower window frame',()=>{for(const c of cells.values())if(c.part.startsWith('books-')){const below=cells.get(`${c.x},${c.y-1},${c.z}`);assert(below&&[c.part,'shelf','display-frame'].includes(below.part));}});
check('Bench has four grounded legs and an unbroken seat',()=>{for(const x of [23,28])for(const z of [-4,13])for(let y=0;y<Y(6);y++)assert(cells.get(`${x},${y},${z}`)?.part==='bench');});
check('All specified parts exist',()=>{const spec=JSON.parse(fs.readFileSync('sculpt-spec.json'));const parts=new Set([...cells.values()].map(c=>c.part));assert.deepEqual(parts,new Set(spec.componentTree.map(c=>c.id)));});
check('Voxel document preserves all authoring information',()=>{assert.deepEqual(readVoxelDocument(createVoxelDocument(cells)).cells,cells);});
const report={stage,passed:true,cells:cells.size,parts:[...new Set([...cells.values()].map(c=>c.part))],checks};fs.writeFileSync(`evidence/${stage}-structure.json`,JSON.stringify(report,null,2));console.log(JSON.stringify(report));
