import test from 'node:test';
import assert from 'node:assert/strict';
import {resample,makeTimeline,atSteps,changedChunks,buckets,meshChunk,editBox,encodeDensity,decodeDensity,workbenchBounds,layerCell} from './density-core.mjs';
import {DensityWorkspaces} from './density-workspaces.mjs';
import {makeSceneDesign} from './scene.mjs';
import {voxelizeRefined} from './refined.mjs';
const cell=(x,y,z,color='plaster',phase=2)=>({x,y,z,color,phase,group:'cafe',emission:false});
const mapOf=a=>new Map(a.map(c=>[[c.x,c.y,c.z].join(','),c]));
test('coplanar merging preserves surface area, winding and material without losing cells',()=>{
 const cells=[];for(let x=0;x<8;x++)for(let y=0;y<5;y++)for(let z=0;z<4;z++)cells.push(cell(x,y,z));const map=mapOf(cells);
 const faces=meshChunk(cells,map,1,{merge:false}),merged=meshChunk(cells,map,1,{merge:true});assert.equal(faces.surfaceFaces,2*(8*5+8*4+5*4));assert.equal(merged.triangles,12);assert.equal(map.size,160);
 function area(g){let area=0;for(let i=0;i<g.positions.length;i+=9){const a=g.positions.slice(i,i+3),b=g.positions.slice(i+3,i+6),c=g.positions.slice(i+6,i+9),u=b.map((v,k)=>v-a[k]),v=c.map((p,k)=>p-a[k]),cross=[u[1]*v[2]-u[2]*v[1],u[2]*v[0]-u[0]*v[2],u[0]*v[1]-u[1]*v[0]];assert.ok(cross.reduce((s,n,k)=>s+n*g.normals[i+k],0)>0);area+=Math.hypot(...cross)/2;}return area;}assert.equal(area(faces),area(merged));
});
test('chunk seams cull internal faces and AO edits invalidate diagonal neighbours',()=>{
 const cells=[cell(23,23,23),cell(24,23,23),cell(24,24,24)],map=mapOf(cells),groups=buckets(map);let faces=0;for(const c of groups.values())faces+=meshChunk(c,map,1).surfaceFaces;assert.equal(faces,16);
 const dirty=changedChunks(map,mapOf(cells.slice(1)));assert.ok(dirty.has('0,0,0'));assert.ok(dirty.has('1,1,1'));assert.ok(dirty.has('1,0,0'));
});
test('range edits copy original cells, support symmetry, preserve source and can be undone',()=>{
 const original=mapOf([cell(1,1,1),cell(2,1,1,'wood')]);const filled=editBox(original,{a:[0,2,0],b:[2,3,1],tool:'fill',color:'brick',mirror:true});assert.equal(filled.patch.length,24);assert.equal(original.size,2);
 const copied=editBox(original,{a:[1,1,1],b:[2,1,1],tool:'copy',offset:[1,0,0]});assert.equal(copied.map.get('2,1,1').color,'plaster');assert.equal(copied.map.get('3,1,1').color,'wood');for(const {key,old} of copied.patch)old?copied.map.set(key,old):copied.map.delete(key);assert.deepEqual(copied.map,original);
 assert.throws(()=>editBox(original,{a:[0,0,0],b:[80,80,80],tool:'fill'}));
});
test('coarse construction retains temporary frames and import rejects corrupt data',()=>{
 const c=cell(2,2,2,'plaster',2);c.under=[cell(2,2,2,'wood',1)];const coarse=resample([c],2),timeline=makeTimeline(coarse);assert.equal(atSteps(timeline,6000).get('1,1,1').color,'wood');assert.equal(atSteps(timeline,12000).get('1,1,1').color,'plaster');
 const map=mapOf(coarse),text=encodeDensity(map,2),roundtrip=decodeDensity(text);assert.equal(roundtrip.factor,2);assert.equal(roundtrip.map.get('1,1,1').under[0].color,'wood');assert.throws(()=>decodeDensity(text.replace('"factor":2','"factor":3')));
 const d=JSON.parse(text);d.cells.push(d.cells[0]);assert.throws(()=>decodeDensity(JSON.stringify(d)));
});
test('actual scene remains bounded at both densities with preserved glass and a covered roof',()=>{
 const fine=voxelizeRefined(makeSceneDesign());assert.equal(fine.length,144042);
 for(const factor of [1,2]){const cells=resample(fine,factor),map=mapOf(cells),size=.075*factor;assert.ok(cells.some(c=>c.color.startsWith('glass')&&c.emission));assert.ok(cells.some(c=>c.group==='terrace'));assert.equal(map.size,cells.length);
  // Sample the interior roof footprint; every column has some roof above the wall.
  for(let x=-2.8;x<=1.2;x+=.3)for(let z=-1.8;z<=.8;z+=.3){const ix=Math.floor(x/size),iz=Math.floor(z/size);assert.ok(cells.some(c=>c.x===ix&&c.z===iz&&c.y*size>=3.4&&c.phase===3),`roof ${factor}/${ix}/${iz}`);}
  const body=cells.filter(c=>['cafe','terrace'].includes(c.group));assert.ok(body.length<(factor===1?67000:12000));const round=decodeDensity(encodeDensity(map,factor));assert.equal(round.map.size,map.size);
 }
});
test('scratch starts empty, stacks cells and keeps both densities separate from the sample',()=>{
 const works=new DensityWorkspaces();assert.equal(works.get('blank',2).map.size,0);assert.equal(works.has('building',2),false);
 for(const a of [[0,0,0],[0,1,0],[1,1,0]])works.edit('blank',2,{a,b:a,tool:'fill',color:'wood'});
 assert.equal(works.get('blank',2).map.size,3);assert.equal(works.get('blank',1).map.size,0);
 works.install('building',2,[cell(4,4,4)]);works.edit('blank',1,{a:[0,0,0],b:[0,0,0],tool:'fill',color:'brick'});
 assert.equal(works.get('blank',2).map.size,3);assert.equal(works.get('blank',1).map.get('0,0,0').color,'brick');assert.equal(works.get('district',2).map.size,1);
 assert.equal(works.clear('blank',2),3);assert.equal(works.get('blank',2).map.size,0);assert.equal(works.undo('blank',2),3);assert.equal(works.get('blank',2).map.size,3);
 works.undo('blank',2);assert.equal(works.get('blank',2).map.size,2);assert.equal(works.get('blank',1).map.size,1);assert.equal(works.get('building',2).map.size,1);
 assert.throws(()=>works.clear('building',2));
});
test('same physical workbench bounds clip brushes, mirror and copy at each resolution',()=>{
 const works=new DensityWorkspaces();for(const factor of [1,2]){const bounds=workbenchBounds(factor);assert.equal(bounds.width*.075*factor,4.8);const top=bounds.max;
  works.edit('blank',factor,{a:top,b:top.map(v=>v+2),tool:'fill',mirror:true});assert.equal(works.get('blank',factor).map.size,2);
  const before=works.get('blank',factor).history.length;works.edit('blank',factor,{a:top,b:top,tool:'copy',offset:[0,1,0]});assert.equal(works.get('blank',factor).map.size,2);assert.equal(works.get('blank',factor).history.length,before);
 }
});
test('scratch files preserve their workspace and reject out-of-board imports',()=>{
 const empty=decodeDensity(encodeDensity(new Map(),2,'blank'));assert.equal(empty.workspace,'blank');assert.equal(empty.map.size,0);
 const text=encodeDensity(mapOf([cell(0,0,0,'glassSea',4)]),1,'blank'),saved=decodeDensity(text);assert.equal(saved.workspace,'blank');assert.equal(saved.factor,1);assert.equal(saved.map.get('0,0,0').emission,true);
 const d=JSON.parse(text);d.cells[0].x=100;assert.throws(()=>decodeDensity(JSON.stringify(d)));delete d.workspace;assert.equal(decodeDensity(JSON.stringify(d)).workspace,'sample');
});
test('horizontal selection fills only layer two, preserving lower and higher cells at either density',()=>{
 for(const factor of [1,2]){
  const works=new DensityWorkspaces(),bounds=workbenchBounds(factor),size=.075*factor;
  works.install('blank',factor,[cell(0,0,0,'wood'),cell(1,2,1,'glassSea')]);
  // Plane picks do not inherit the height of an occupied surface or require supports below.
  const a=layerCell([.2*size,4*size,.2*size],factor,2,bounds),b=layerCell([2.8*size,0,1.8*size],factor,2,bounds);
  assert.deepEqual(a,[0,1,0]);assert.deepEqual(b,[2,1,1]);
  works.edit('blank',factor,{a,b,tool:'fill',color:'brick'});
  const map=works.get('blank',factor).map;assert.equal(map.size,8);assert.equal([...map.values()].filter(c=>c.y===1).length,6);
  assert.equal(map.get('0,0,0').color,'wood');assert.equal(map.get('1,2,1').color,'glassSea');
  works.edit('blank',factor,{a,b,tool:'paint',color:'stone'});assert.equal(works.get('blank',factor).map.get('1,1,1').color,'stone');
  works.edit('blank',factor,{a,b,tool:'erase'});assert.equal(works.get('blank',factor).map.size,2);
  works.undo('blank',factor);assert.equal(works.get('blank',factor).map.size,8);
  works.undo('blank',factor);assert.equal(works.get('blank',factor).map.get('1,1,1').color,'brick');
  works.undo('blank',factor);assert.equal(works.get('blank',factor).map.size,2);
 }
});
test('layer picking handles negative coordinates, last layer and out-of-board clicks',()=>{
 for(const factor of [1,2]){const bounds=workbenchBounds(factor),size=.075*factor;
  assert.deepEqual(layerCell([-size*.2,0,-size*.2],factor,bounds.width,bounds),[-1,bounds.width-1,-1]);
  assert.equal(layerCell([0,0,0],factor,0,bounds),null);
  assert.equal(layerCell([0,0,0],factor,1.5,bounds),null);
  assert.equal(layerCell([0,0,0],factor,bounds.width+1,bounds),null);
  assert.equal(layerCell([2.41,0,0],factor,2,bounds),null);
  assert.equal(layerCell([NaN,0,0],factor,2,bounds),null);
 }
});
