import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';
import {World,decode} from '../src/world';import {buildChunk,vertexAO} from '../src/mesher';import type {Bundle} from '../src/types';
const read=(p:string)=>JSON.parse(fs.readFileSync('public/data/'+p,'utf8'));
function empty(){const tile=read('tiles/tile002.json');tile.size=[32,32,32];return new World({tile,palette:read('palettes/tile002_street.json'),look:read('look/town_evening.json'),templates:{},manifest:{files:{}}} as Bundle);}
test('adjacent plain cells emit ten outer faces, never their shared face',()=>{
 const w=empty();w.write([3,3,3],1);w.write([4,3,3],1);const g=buildChunk(w,'0,0,0');assert.equal(g.index!.count,10*6);g.dispose();
});
test('boundary faces are culled using the adjacent chunk, no internal caps',()=>{
 const w=empty();w.write([15,4,4],1);w.write([16,4,4],1);
 for(const key of ['0,0,0','1,0,0']){const g=buildChunk(w,key);assert.equal(g.index!.count,5*6);g.dispose();}
});
test('four-neighbour AO includes diagonals across a chunk boundary',()=>{
 const w=empty(),cell:[number,number,number]=[15,15,3];assert.equal(vertexAO(w,cell,[0,0,1],[1,1,1]),1);
 for(const p of [[15,15,4],[16,15,4],[15,16,4],[16,16,4]])w.write(p as [number,number,number],1);
 assert.ok(Math.abs(vertexAO(w,cell,[0,0,1],[1,1,1])-.42)<1e-12);
});
test('interior edit invalidates one chunk; boundary edit includes AO diagonal',()=>{
 const w=empty();assert.deepEqual(w.edit([5,5,5],1).chunks,['0,0,0']);assert.equal(w.edit([15,15,15],1).chunks.length,8);
 assert.throws(()=>w.edit([-1,0,0],1));assert.throws(()=>w.edit([4,4,4],255));
});
test('editing a declared piece dissolves only that piece, invalidates all of its fragments',()=>{
 const w=empty();for(let x=12;x<20;x++)w.write([x,5,5],1);w.addPiece([12,5,5,20,6,6],'test');w.finalizePieces();
 const result=w.edit([14,5,5],0);assert.equal(result.brokenPiece,1);assert.deepEqual(result.chunks,['0,0,0','1,0,0']);assert.equal(w.pieces[0].active,false);
 assert.equal(w.get(13,5,5),1);assert.equal(w.getOwner(13,5,5),0);
});
test('a source piece spanning a chunk has six outside surfaces split into ten quads, no seam caps',()=>{
 const w=empty();for(let x=12;x<20;x++)w.write([x,5,5],1);w.addPiece([12,5,5,20,6,6],'test');w.finalizePieces();
 const a=buildChunk(w,'0,0,0'),b=buildChunk(w,'1,0,0');assert.equal(a.index!.count+b.index!.count,10*6);a.dispose();b.dispose();
});
test('rows and RLE decode to the same X-fast storage, malformed lengths fail',()=>{
 assert.deepEqual(decode({size:[2,2,1],encoding:'rows',rows:['0101','0002']}),decode({size:[2,2,1],encoding:'rle',rle:'2*01,1*00,1*02'}));
 assert.throws(()=>decode({size:[2,2,1],encoding:'rle',rle:'3*01'}));
});
