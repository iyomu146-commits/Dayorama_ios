import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs';
import {createHomeCells,CELL,PALETTE} from './model.mjs';
import {createVoxelDocument,readVoxelDocument} from './voxel-document.mjs';
import {meshChunk} from '../../../density-core.mjs';
import {homeChannels} from './material.mjs';
const cells=createHomeCells(),palette=Object.fromEntries(Object.keys(PALETTE).map(k=>[k,[.5,.5,.5]]));
test('Saved JSON restores the exact editable geometry, color and construction tags',()=>{const doc=JSON.parse(JSON.stringify(createVoxelDocument(cells))),read=readVoxelDocument(doc);assert.deepEqual([...read.cells],[...cells]);assert.deepEqual(read.palette,PALETTE);assert.equal(read.cellSize,CELL);const bad=structuredClone(doc);bad.cells.push({...bad.cells[0]});assert.throws(()=>readVoxelDocument(bad),/Duplicate/);bad.cells.pop();bad.cellSize=.30;assert.throws(()=>readVoxelDocument(bad),/Unsupported/);});
test('Every separated part has its own complete exterior and valid material channels',()=>{
 for(const part of new Set([...cells.values()].map(c=>c.part))){const list=[...cells.values()].filter(c=>c.part===part),own=new Map(list.map(c=>[[c.x,c.y,c.z].join(','),c])),data=meshChunk(list,own,CELL,{palette}),channels=homeChannels(data,own,CELL);
 let boundary=0;for(const c of list)for(let d=0;d<3;d++)for(const sign of [-1,1]){const p=[c.x,c.y,c.z];p[d]+=sign;if(!own.has(p.join(',')))boundary++;}assert.equal(data.surfaceFaces,boundary,part);assert.equal(channels.length,data.positions.length/3*2);assert([...channels].every(Number.isFinite));for(let i=0;i<channels.length;i+=2)assert(channels[i]>=0&&channels[i]<10,'No cafe tile mapping');
 }
});
test('Browser-exported part hierarchy and action sockets match the authoritative model',()=>{const m=JSON.parse(fs.readFileSync(new URL('./evidence/roof-coarse-runtime.json',import.meta.url))),expected=[...new Set([...cells.values()].map(c=>c.part))].sort();assert.deepEqual(m.parts.map(p=>p.name).sort(),expected);assert.equal(m.unnamedMeshes,0);assert.equal(m.runtime.parts.length,expected.length);for(const p of m.runtime.parts){assert(expected.includes(p.pivotNode));assert(p.collider.size.every(n=>n>0));assert(p.pivot.every(Number.isFinite));}assert(m.runtime.sockets.some(s=>s.id==='smoke'&&s.parent==='chimney-cap'));assert(m.runtime.sockets.some(s=>s.id==='entrance'&&s.parent==='door'));});
