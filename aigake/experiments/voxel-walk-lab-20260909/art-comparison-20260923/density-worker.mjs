import {makeSceneDesign} from './scene.mjs';
import {voxelizeRefined} from './refined.mjs';
import {CELL} from './design.mjs';
import {resample,atSteps,changedChunks,buckets,meshChunk,encodeDensity,decodeDensity} from './density-core.mjs';
import {DensityWorkspaces} from './density-workspaces.mjs';
let fine,factor=2,scope='building',merge=true,current=new Map(),chunks=new Map();
const workspaces=new DensityWorkspaces();
const state=()=>workspaces.get(scope,factor),allowed=c=>scope==='district'||scope==='blank'||['cafe','terrace'].includes(c.group);
const filtered=map=>new Map([...map].filter(([,c])=>allowed(c)));
function summary(map){const group={};for(const c of map.values())group[c.group]=(group[c.group]||0)+1;return {count:map.size,group};}
function transferMeshes(items){return items.flatMap(({mesh})=>mesh?[mesh.positions.buffer,mesh.normals.buffer,mesh.colors.buffer,mesh.surfaces.buffer]:[]);}
function compile(map,all=false){
 const groups=buckets(map),dirty=all?new Set([...chunks.keys(),...groups.keys()]):changedChunks(current,map),items=[],start=performance.now();
 for(const key of dirty){const cells=groups.get(key);if(!cells){chunks.delete(key);items.push({key,mesh:null});continue;}const mesh=meshChunk(cells,map,CELL*factor,{merge});chunks.set(key,{triangles:mesh.triangles,bytes:mesh.bytes,surfaceFaces:mesh.surfaceFaces});items.push({key,mesh});}
 current=map;return {items,meshMs:performance.now()-start,updated:items.length,triangles:[...chunks.values()].reduce((s,c)=>s+c.triangles,0),bytes:[...chunks.values()].reduce((s,c)=>s+c.bytes,0)};
}
self.onmessage=({data:d})=>{
 const start=performance.now();
 try{
  let isLoad=['load','import'].includes(d.type),edited=0;
  if(d.type==='load'){factor=d.factor;scope=d.scope||scope;}
  if(d.type==='import'){const decoded=decodeDensity(d.text);factor=decoded.factor;scope=decoded.workspace==='blank'?'blank':'building';workspaces.replace(scope,factor,decoded.map);}
  if(isLoad)merge=d.merge??merge;
  if(scope!=='blank'&&!fine){fine=voxelizeRefined(makeSceneDesign());for(const f of [1,2])workspaces.install('building',f,resample(fine,f));}
  if(d.type==='export'){self.postMessage({id:d.id,type:'export',text:encodeDensity(state().map,factor,scope==='blank'?'blank':'sample')});return;}
  if(d.type==='edit')edited=workspaces.edit(scope,factor,d.edit);
  if(d.type==='clear')edited=workspaces.clear(scope,factor);
  if(d.type==='undo')edited=workspaces.undo(scope,factor);
  const completed=filtered(state().map);let complete;
  if(isLoad){current=new Map();chunks=new Map();complete=compile(completed,true);}
  const steps=scope==='blank'?20000:d.steps??20000,map=steps===20000?completed:filtered(atSteps(state().timeline,steps)),active=compile(map,isLoad);
  const output={id:d.id,type:'geometry',factor,scope,merge,steps,complete,active,total:summary(state().map),visible:summary(map),completed:summary(completed),undo:state().history.length,edited,workerMs:performance.now()-start};
  self.postMessage(output,[...transferMeshes(complete?.items||[]),...transferMeshes(active.items)]);
 }catch(error){self.postMessage({id:d.id,error:error.message});}
};
