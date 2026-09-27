import {test} from 'node:test';import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';import {createHash} from 'node:crypto';
import {localBundle} from './parity.test';import {resolveBundle,decode,place} from '../src/world';
import {storyState,type StorySpec} from '../src/story-state';
import {interiorRanges} from '../src/story-occlusion';
import {StoryDrawList,attachStoryDrawList} from '../src/story-draw-list';
import {BufferGeometry,InstancedMesh,InstancedBufferAttribute,BoxGeometry,Matrix4,MeshBasicMaterial,Color} from 'three';
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

test('interior culling never starts before six unit neighbours land, and ends before a finish-piece gap can open',()=>{
 const ranges=interiorRanges(s),by=new Map(s.cells.map((c,i)=>[c.slice(0,3).join(','),i]));
 const directions=[[1,0,0],[-1,0,0],[0,1,0],[0,-1,0],[0,0,1],[0,0,-1]];
 let hidden=0;
 for(let i=0;i<s.instances.length;i++){
  const lo=ranges[2*i],hi=ranges[2*i+1];if(lo>=hi)continue;hidden++;
  assert.ok(i<s.cells.length,'declared finish pieces must never be culled');
  const c=s.cells[i];
  for(const j of [i,...directions.map(d=>by.get(c.slice(0,3).map((v,k)=>v+d[k]).join(',')))]){
   assert.notEqual(j,undefined,'boundary surface must stay visible');const r=s.instances[j!];
   assert.ok(lo>r[9]+s.fallDuration);assert.ok(hi<r[10]);
  }
 }
 assert.equal(hidden,31550);
});

test('dense list equals reference visibility through forward playback, finish-piece switches and backward seeks',()=>{
 const ranges=interiorRanges(s),list=new StoryDrawList(s);
 const times=[0,...Array.from({length:96},(_,i)=>i/3),16,8,0,32,3.17,19.999];
 for(const value of times){
  const t=Math.fround(value);list.update(t);
  const expected=s.instances.flatMap((r,i)=>Math.fround(r[9])<=t&&t<Math.fround(r[10])&&!(ranges[i*2]<=t&&t<ranges[i*2+1])?[i]:[]);
  const active=[...list.sources.subarray(0,list.count)];
  assert.deepEqual([...active].sort((a,b)=>a-b),expected);
  active.forEach((id,slot)=>assert.equal(list.slots[id],slot));
 }
});

test('swap-compacted GPU slots preserve matrices, colors and timing through pause and seek',()=>{
 const geometry:BufferGeometry=new BoxGeometry(1,1,1),mesh=new InstancedMesh(geometry,new MeshBasicMaterial(),s.instances.length);
 const times=new Float32Array(s.instances.length*3),heights=new Float32Array(s.instances.length);
 s.instances.forEach((r,i)=>{mesh.setMatrixAt(i,new Matrix4().makeScale(r[3],r[4],r[5]).setPosition(r[0],r[1],r[2]));mesh.setColorAt(i,new Color(r[6],r[7],r[8]));times.set(r.slice(9,12),i*3);heights[i]=r[5];});
 geometry.setAttribute('aStory',new InstancedBufferAttribute(times,3));geometry.setAttribute('aHeight',new InstancedBufferAttribute(heights,1));
 const attributes=[mesh.instanceMatrix,mesh.instanceColor!,geometry.getAttribute('aStory'),geometry.getAttribute('aHeight')],before=attributes.map(a=>a.array.slice());
 const dense=attachStoryDrawList(mesh,s);
 for(const t of [0,8,16,16,20,32,2,19,0,26]){
  dense.update(t);assert.equal(mesh.count,dense.list.count);
  for(const [k,a] of attributes.entries())for(let slot=0;slot<mesh.count;slot++){
   const source=dense.list.sources[slot],width=a.itemSize;
   assert.deepEqual(a.array.slice(slot*width,(slot+1)*width),before[k].slice(source*width,(source+1)*width));
  }
 }
 dense.restore();attributes.forEach((a,k)=>assert.deepEqual(a.array,before[k]));
});
