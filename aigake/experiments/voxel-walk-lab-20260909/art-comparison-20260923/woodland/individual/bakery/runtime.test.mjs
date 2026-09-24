import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs';
import {createBakeryCells,CELL,PALETTE} from './model.mjs';
import {createVoxelDocument,readVoxelDocument} from './voxel-document.mjs';
import {meshChunk} from '../../../density-core.mjs';
import {bakeryChannels,bakerySubstance} from './material.mjs';
const cells=createBakeryCells(),palette=Object.fromEntries(Object.keys(PALETTE).map(k=>[k,[.5,.5,.5]]));
test('Saved JSON restores exact editable cells, palette and construction tags',()=>{const doc=JSON.parse(JSON.stringify(createVoxelDocument(cells))),read=readVoxelDocument(doc);assert.deepEqual([...read.cells],[...cells]);assert.deepEqual(read.palette,PALETTE);assert.equal(read.cellSize,CELL);const bad=structuredClone(doc);bad.cells.push({...bad.cells[0]});assert.throws(()=>readVoxelDocument(bad),/Duplicate/);bad.cells.pop();bad.cellSize=.3;assert.throws(()=>readVoxelDocument(bad),/Unsupported/);});
test('Exploded parts expose complete surfaces with correct material channels',()=>{
 for(const part of new Set([...cells.values()].map(c=>c.part))){const list=[...cells.values()].filter(c=>c.part===part),own=new Map(list.map(c=>[[c.x,c.y,c.z].join(','),c])),data=meshChunk(list,own,CELL,{palette}),channels=bakeryChannels(data,own,CELL);
 let faces=0;for(const c of list)for(let d=0;d<3;d++)for(const sign of [-1,1]){const p=[c.x,c.y,c.z];p[d]+=sign;if(!own.has(p.join(',')))faces++;}
 assert.equal(data.surfaceFaces,faces,part);assert.equal(channels.length,data.positions.length/3*2);assert([...channels].every(Number.isFinite));for(let i=0;i<channels.length;i+=2)assert(channels[i]>=0&&channels[i]<=11&&channels[i]!==10,'No cafe-specific roof mapping');
 }
 assert.equal(bakerySubstance('tileWarm'),1);assert.equal(bakerySubstance('clothCream'),8);assert.equal(bakerySubstance('breadScore'),11);
});
test('Actual browser hierarchy covers all 27 parts and construction sockets',()=>{const m=JSON.parse(fs.readFileSync(new URL('./evidence/roof-seams-runtime.json',import.meta.url))),expected=[...new Set([...cells.values()].map(c=>c.part))].sort();assert.equal(expected.length,27);assert.deepEqual(m.parts.map(p=>p.name).sort(),expected);assert.equal(m.unnamedMeshes,0);for(const p of m.runtime.parts){assert(expected.includes(p.pivotNode));assert(p.collider.size.every(n=>n>0));assert(p.pivot.every(Number.isFinite));}assert(m.runtime.sockets.some(s=>s.id==='smoke'&&s.parent==='chimney-rim'));assert(m.runtime.sockets.some(s=>s.id==='entrance'&&s.parent==='door'));});
