import {makeModel,atConstruction} from './scene-model.mjs';
import {CELL,PALETTE,ROUGHNESS,PARTS} from './plan.mjs';
import {meshChunk} from '../density-core.mjs';
const linear=v=>v<=.04045?v/12.92:((v+.055)/1.055)**2.4;
const palette=Object.fromEntries(Object.entries(PALETTE).map(([k,v])=>[k,[1,3,5].map(i=>linear(parseInt(v.slice(i,i+2),16)/255))]));
const model=makeModel();
self.onmessage=({data:d})=>{try{
 if(d.type==='export'){self.postMessage({id:d.id,type:'export',text:JSON.stringify({format:'dayorama-woodland',version:1,cell:CELL,palette:PALETTE,parts:PARTS,cells:model.cells})});return;}
 const visible=model.cells.filter(c=>d.asset==='town'||(d.asset==='tree'?c.part==='tree-0':c.asset===d.asset));
 const frames=new Map();for(const c of visible){if(!frames.has(c.part))frames.set(c.part,{min:[Infinity,Infinity,Infinity],max:[-Infinity,-Infinity,-Infinity]});const b=frames.get(c.part);[c.x,c.y,c.z].forEach((v,i)=>{b.min[i]=Math.min(b.min[i],v*CELL);b.max[i]=Math.max(b.max[i],(v+1)*CELL);});}
 const map=d.asset==='town'?new Map(visible.map(c=>[`${c.x},${c.y},${c.z}`,c])):atConstruction(visible,d.steps);
 if(d.color===false)for(const [k,c] of map)map.set(k,{...c,color:c.color.replace(/\d+$/,'0')});
 const parts=new Map();for(const c of map.values()){if(!parts.has(c.part))parts.set(c.part,[]);parts.get(c.part).push(c);}
 const items=[],transfer=[];let triangles=0,bytes=0;
 for(const [part,cells] of parts){const mesh=meshChunk(cells,map,CELL,{palette,roughnessFor:c=>ROUGHNESS[c.color],aoStrength:.04});items.push({part,mesh});triangles+=mesh.triangles;bytes+=mesh.bytes;for(const a of ['positions','normals','colors','surfaces'])transfer.push(mesh[a].buffer);}
 self.postMessage({id:d.id,type:'geometry',items,frames:[...frames.values()],count:map.size,triangles,bytes},transfer);
 }catch(e){self.postMessage({id:d.id,error:e.message});}};
