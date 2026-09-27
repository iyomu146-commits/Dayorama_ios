import {test} from 'node:test';import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';import {createHash} from 'node:crypto';
import {localBundle} from './parity.test';import {resolveBundle,decode,place} from '../src/world';
import {storyState,type StorySpec} from '../src/story-state';
const bytes=readFileSync('public/story/story.json'),s=JSON.parse(bytes.toString()) as StorySpec;
const sha=(b:Uint8Array)=>createHash('sha256').update(b).digest('hex');
test('story reconstructs the frozen order and final grid, without touching canonical data',()=>{
 const b=localBundle(),w=resolveBundle(b),a=b.tile.placements.find(p=>p.id==='house_b')!,t=b.templates[a.template],v=decode(t.voxels),[width,depth,height]=t.voxels.size;
 const canonical:number[][]=[];for(let z=0;z<height;z++)for(let y=0;y<depth;y++)for(let x=0;x<width;x++){const value=v[x+width*(y+depth*z)];if(value)canonical.push([...place([x,y,z],t,a),value]);}
 assert.deepEqual(s.cells,t.order.runs.flatMap(([start,n])=>canonical.slice(start,start+n)));
 assert.equal(sha(w.grid),s.sourceGridSha256);
 for(const [i,value] of s.contextPatch)w.grid[i]=value;
 assert.equal(sha(w.grid),s.contextGridSha256);
 for(const [x,y,z,value] of s.cells)w.grid[w.index(x,y,z)]=value;
 assert.equal(sha(w.grid),s.sourceGridSha256);
 assert.equal(storyState(s,s.buildStart+s.fallDuration-.001).n,0);
 assert.equal(storyState(s,s.finishTime+.001).n,s.cells.length);
 assert.equal(storyState(s,32).actorPosition[1],3.675);
 assert.deepEqual(bytes,readFileSync('../voxeltown-godot-bench/story/story.json'));
 for(const file of ['place.wav','complete.wav','step.wav'])assert.deepEqual(readFileSync('public/story/'+file),readFileSync('../voxeltown-godot-bench/story/'+file));
});
test('piece presentation switches at the last ordered cell landing; no cell exists before its birth',()=>{
 for(const r of s.instances){assert.ok(r[9]<r[10]);assert.ok(r.slice(3,6).every(size=>size>0));}
 assert.equal(s.instances.filter(r=>r[11]===1).length,s.cells.length);
 const n0=storyState(s,0);assert.equal(n0.n,0);assert.equal(n0.actorVisible,false);assert.equal(n0.light,0);
 const n1=storyState(s,32);assert.equal(n1.finished,true);assert.equal(n1.light,1);assert.equal(n1.walking,false);
});
