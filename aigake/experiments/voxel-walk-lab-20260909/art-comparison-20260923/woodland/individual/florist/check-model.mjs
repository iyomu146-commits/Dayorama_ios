import assert from 'node:assert/strict';import fs from 'node:fs';
import {createFloristCells,CELL,PALETTE,containers} from './model.mjs';import {groundedCells} from '../../../density-core.mjs';
import {createVoxelDocument,readVoxelDocument} from './voxel-document.mjs';
const stage=process.argv[2]||'structure',cells=createFloristCells({stage}),checks=[],get=(x,y,z)=>cells.get(`${x},${y},${z}`);
function check(name,f){f();checks.push(name);}
check('Unique 15cm integer cells with known colors',()=>{assert.equal(CELL,.15);for(const [key,c]of cells){assert.equal(key,[c.x,c.y,c.z].join(','));assert([c.x,c.y,c.z].every(Number.isInteger));assert(c.y>=0);assert(PALETTE[c.color]);}});
check('Every cell face-connected to ground',()=>assert.equal(groundedCells(cells).size,cells.size));
check('Every construction phase is grounded',()=>{for(let phase=0;phase<=4;phase++){const s=new Map([...cells].filter(([,c])=>c.phase<=phase));assert.equal(groundedCells(s).size,s.size,'phase '+phase);}});
check('Main roof fully covers walls without gaps',()=>{for(let x=-16;x<18;x++)for(let z=-13;z<15;z++){let found=false;for(let y=25;y<40;y++)if(get(x,y,z)?.part==='roof')found=true;assert(found);}});
check('Front entry corridor is unobstructed',()=>{for(let x=6;x<14;x++)for(let z=16;z<31;z++)for(let y=1;y<20;y++)assert(!get(x,y,z));});
check('Glazed lean-to roof exposes its glass instead of a solid covering',()=>{for(let x=-31;x<-17;x++)for(let z=2;z<17;z++)assert.equal(get(x,stage==='glass-height2'?19-Math.floor((z-1)/6):17-Math.floor((z-1)/3),z)?.part,'greenhouse-glass');});
check('Front, side, door and greenhouse panes have no vertical bars',()=>{
 for(let x=-12;x<1;x++)for(let y=6;y<18;y++)assert(get(x,y,13)?.part==='display-glass');
 for(let y=9;y<20;y++)for(let z=-4;z<4;z++)assert(get(17,y,z)?.part==='side-glass');
 for(let x=7;x<13;x++)for(let y=12;y<17;y++)assert(get(x,y,14)?.part==='door-glass');
 for(let x=-31;x<-17;x++)for(let y=2;y<(stage==='glass-height2'?16:11);y++)assert(get(x,y,17)?.part==='greenhouse-glass');
});
check('Each flower group is rooted in its own container or window sill',()=>{for(const [,part]of containers){const own=new Set([...cells].filter(([,c])=>c.part===part).map(([k])=>k));assert(own.size>0);const bases=[...own].map(k=>cells.get(k)).filter(c=>!own.has(`${c.x},${c.y-1},${c.z}`)&&get(c.x,c.y-1,c.z)?.part===containers.find(a=>a[1]===part)[0]);assert(bases.length>0);}});
check('All 35 individually specified parts are present',()=>{const ids=JSON.parse(fs.readFileSync('sculpt-spec.json')).componentTree.map(c=>c.id);assert.deepEqual(new Set([...cells.values()].map(c=>c.part)),new Set(ids));});
check('Saving retains coordinates, materials, parts and construction phases',()=>assert.deepEqual(readVoxelDocument(createVoxelDocument(cells)).cells,cells));
if(stage==='glass-height2')check('Only the glazed extension changes; shop and flowers retain all original cells',()=>{const original=createFloristCells({stage:'optimization'}),other=map=>new Map([...map].filter(([,c])=>!c.part.startsWith('greenhouse-')));assert.deepEqual(other(cells),other(original));for(const z of [1,17]){const top=18-Math.floor((z-1)/6);assert.equal(get(-32,top+1,z)?.part,'greenhouse-frame');assert(!get(-32,top+2,z));}});
if(stage!=='structure')check('21 blooms each have a raised center, four petals and rooted stems',()=>{const blooms=new Map();for(const c of cells.values())if(c.bloom){if(!blooms.has(c.bloom))blooms.set(c.bloom,[]);blooms.get(c.bloom).push(c);}assert.equal(blooms.size,21);for(const list of blooms.values()){assert.equal(list.filter(c=>c.flowerRole==='petal').length,4);const center=list.filter(c=>c.flowerRole==='center');assert.equal(center.length,2);assert.equal(Math.abs(center[0].y-center[1].y),1);assert(list.some(c=>c.flowerRole==='leaf'));assert(list.some(c=>c.flowerRole==='stem'));}});
const result={stage,passed:true,cellCount:cells.size,checks};fs.writeFileSync(`evidence/${stage}-structure.json`,JSON.stringify(result,null,2));console.log(result);
