import {makeSceneDesign} from './scene.mjs';
import {voxelizeRefined} from './refined.mjs';
import {CELL,cellKey} from './design.mjs';
import {resample,makeTimeline,atSteps,changedChunks,buckets,meshChunk,editBox,encodeDensity,decodeDensity} from './density-core.mjs';
let fine,states=new Map(),factor=2,scope='building',merge=true,current=new Map(),chunks=new Map();
const state=()=>states.get(factor),allowed=c=>scope==='district'||['cafe','terrace'].includes(c.group);
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
  if(!fine){fine=voxelizeRefined(makeSceneDesign());for(const f of [1,2]){const cells=resample(fine,f);states.set(f,{map:new Map(cells.map(c=>[cellKey(c),c])),timeline:makeTimeline(cells),history:[]});}}
  if(d.type==='export'){self.postMessage({id:d.id,type:'export',text:encodeDensity(state().map,factor)});return;}
  let isLoad=['load','import'].includes(d.type),edited=0;
  if(d.type==='import'){const decoded=decodeDensity(d.text);factor=decoded.factor;states.set(factor,{map:decoded.map,timeline:makeTimeline([...decoded.map.values()]),history:[]});}
  if(d.type==='load')factor=d.factor;
  if(isLoad){scope=d.scope||scope;merge=d.merge??merge;}
  if(d.type==='edit'){
   if(scope!=='building')throw Error('建物の画面で編集してください');
   const result=editBox(state().map,d.edit);state().history.push(result.patch);if(state().history.length>30)state().history.shift();state().map=result.map;edited=result.patch.length;state().timeline=makeTimeline([...result.map.values()]);
  }
  if(d.type==='undo'){const patch=state().history.pop();if(patch){for(const {key,old} of patch)old?state().map.set(key,old):state().map.delete(key);edited=patch.length;state().timeline=makeTimeline([...state().map.values()]);}}
  const completed=filtered(state().map);let complete;
  if(isLoad){current=new Map();chunks=new Map();complete=compile(completed,true);}
  const steps=d.steps??20000,map=steps===20000?completed:filtered(atSteps(state().timeline,steps)),active=compile(map,isLoad);
  const output={id:d.id,type:'geometry',factor,scope,merge,steps,complete,active,total:summary(state().map),visible:summary(map),completed:summary(completed),undo:state().history.length,edited,workerMs:performance.now()-start};
  self.postMessage(output,[...transferMeshes(complete?.items||[]),...transferMeshes(active.items)]);
 }catch(error){self.postMessage({id:d.id,error:error.message});}
};
