import {COLORS, CELL, BUDGET, phaseProgress, cellKey} from './design.mjs';
export const CHUNK=24;
export const WORKBENCH_SIZE=4.8;
export function workbenchBounds(factor){
 if(![1,2].includes(factor))throw Error('Unsupported density');const width=Math.round(WORKBENCH_SIZE/(CELL*factor));
 return {min:[-width/2,0,-width/2],max:[width/2-1,width-1,width/2-1],width};
}
// The displayed layer is one-based; picking uses its horizontal plane even over taller cells.
export function layerCell(point,factor,layer,bounds){
 if(![1,2].includes(factor)||!Number.isInteger(layer)||layer<1||!point.every(Number.isFinite))return null;
 const q=[Math.floor(point[0]/(CELL*factor)),layer-1,Math.floor(point[2]/(CELL*factor))];
 return q.some((v,i)=>v<bounds.min[i]||v>bounds.max[i])?null:q;
}
const xyz=c=>[c.x,c.y,c.z], coordKey=q=>q.join(','), material=c=>`${c.color}:${!!c.emission}`;
export const chunkKey=c=>xyz(c).map(v=>Math.floor(v/CHUNK)).join(',');
export const directions=[[1,0,0],[-1,0,0],[0,1,0],[0,-1,0],[0,0,1],[0,0,-1]];
const linear=v=>v<=.04045?v/12.92:((v+.055)/1.055)**2.4;
const rgb=Object.fromEntries(Object.entries(COLORS).map(([k,v])=>[k,[1,3,5].map(i=>linear(parseInt(v.slice(i,i+2),16)/255))]));

// Conservative occupied-cell resampling, with majority materials at each construction stage.
// A thin feature survives if any source cell occupies it. This is intentionally not a
// substitute for art-directing furniture at the new resolution.
export function resample(source,factor=2){
 if(factor===1)return source;
 if(factor!==2)throw Error('Unsupported density');
 const bins=new Map();
 for(const c of source){const q=xyz(c).map(v=>Math.floor(v/factor)),key=coordKey(q);if(!bins.has(key))bins.set(key,{q,items:[]});bins.get(key).items.push(c);}
 const result=[];
 for(const {q,items} of bins.values()){
  const layers=[];
  for(let phase=-1;phase<=4;phase++){
   const votes=new Map();
   for(const c of items){const candidates=[...(c.under||[]),c].filter(v=>v.phase<=phase);const v=candidates.at(-1);if(!v)continue;
    const key=material(v)+':'+v.group;const vote=votes.get(key)||{v,count:0};vote.count++;votes.set(key,vote);}
   const winner=[...votes.values()].sort((a,b)=>b.count-a.count||material(a.v).localeCompare(material(b.v)))[0]?.v;
   if(!winner)continue;const previous=layers.at(-1);
   if(previous&&material(previous)===material(winner)&&previous.group===winner.group)continue;
   layers.push({x:q[0],y:q[1],z:q[2],color:winner.color,group:winner.group,emission:!!winner.emission,phase,order:0});
  }
  if(layers.length){const top=layers.pop();result.push({...top,under:layers.length?layers:undefined});}
 }
 return result;
}

export function makeTimeline(cells){
 const stages=Array.from({length:5},()=>[]),base=[];
 for(const c of cells)for(const v of [...(c.under||[]),c]){if(v.phase<0)base.push(v);else stages[v.phase].push(v);}
 for(const a of stages)a.sort((a,b)=>(a.order??0)-(b.order??0)||a.y-b.y||a.z-b.z||a.x-b.x);
 return {base,stages,cells};
}
export function atSteps(timeline,steps){
 if(steps>=BUDGET)return new Map(timeline.cells.map(c=>[cellKey(c),c]));
 const map=new Map(timeline.base.map(c=>[cellKey(c),c]));
 timeline.stages.forEach((stage,i)=>{const limit=Math.floor(stage.length*phaseProgress(steps,i));for(let j=0;j<limit;j++)map.set(cellKey(stage[j]),stage[j]);});
 return map;
}
export function changedChunks(before,after){
 const touched=new Set();
 const add=c=>{touched.add(chunkKey(c));for(const n of directions)touched.add(chunkKey({x:c.x+n[0],y:c.y+n[1],z:c.z+n[2]}));
  // AO observes diagonal neighbours as well as face neighbours.
  for(let x=-1;x<=1;x++)for(let y=-1;y<=1;y++)for(let z=-1;z<=1;z++)touched.add(chunkKey({x:c.x+x,y:c.y+y,z:c.z+z}));};
 for(const [k,c] of before){const next=after.get(k);if(!next||material(next)!==material(c))add(c);}
 for(const [k,c] of after)if(!before.has(k))add(c);
 return touched;
}
export function buckets(map){const out=new Map();for(const c of map.values()){const k=chunkKey(c);if(!out.has(k))out.set(k,[]);out.get(k).push(c);}return out;}

// Exact face merging: only faces with identical material and uniform, equal AO merge.
// Nonuniform AO keeps its original four vertices and triangulation. Chunk boundaries
// query the complete occupancy map, so they never expose hidden internal faces.
export function meshChunk(cells,map,cellSize,{merge=true}={}){
 const planes=new Map(),quads=[];let surfaceFaces=0;
 for(const c of cells)for(let f=0;f<6;f++){
  const n=directions[f],o=xyz(c);if(map.has(coordKey(o.map((v,i)=>v+n[i]))))continue;surfaceFaces++;
  const d=Math.floor(f/2),u=(d+1)%3,v=(d+2)%3,sign=n[d];
  const corners=[[0,0],[1,0],[1,1],[0,1]],shade=corners.map(([a,b])=>{
   const q=o.map((val,i)=>val+n[i]),p=[...q],r=[...q];p[u]+=a?1:-1;r[v]+=b?1:-1;q[u]+=a?1:-1;q[v]+=b?1:-1;
   const s1=map.has(coordKey(p)),s2=map.has(coordKey(r));return s1&&s2?3:Number(s1)+Number(s2)+Number(map.has(coordKey(q)));});
  const face={d,u,v,sign,plane:o[d]+(sign>0?1:0),a:o[u],b:o[v],w:1,h:1,c,shade};
  if(!merge||!shade.every(s=>s===shade[0])){quads.push(face);continue;}
  const key=[f,face.plane,material(c),shade[0]].join('|');if(!planes.has(key))planes.set(key,new Map());planes.get(key).set(`${face.a},${face.b}`,face);
 }
 for(const plane of planes.values()){
  const ordered=[...plane.values()].sort((a,b)=>a.b-b.b||a.a-b.a);
  for(const face of ordered){if(!plane.has(`${face.a},${face.b}`))continue;let w=1,h=1;
   while(plane.has(`${face.a+w},${face.b}`))w++;
   outer:for(;;h++){for(let x=0;x<w;x++)if(!plane.has(`${face.a+x},${face.b+h}`))break outer;}
   for(let y=0;y<h;y++)for(let x=0;x<w;x++)plane.delete(`${face.a+x},${face.b+y}`);
   quads.push({...face,w,h});
  }
 }
 const positions=new Float32Array(quads.length*18),normals=new Float32Array(quads.length*18),colors=new Float32Array(quads.length*18),surfaces=new Float32Array(quads.length*12);
 let vertex=0;
 for(const q of quads){const order=q.sign>0?[0,1,2,0,2,3]:[0,3,2,0,2,1],corners=[[0,0],[q.w,0],[q.w,q.h],[0,q.h]],base=rgb[q.c.color];
  for(const i of order){const p=[0,0,0],n=[0,0,0];p[q.d]=q.plane*cellSize;p[q.u]=(q.a+corners[i][0])*cellSize;p[q.v]=(q.b+corners[i][1])*cellSize;n[q.d]=q.sign;
   positions.set(p,vertex*3);normals.set(n,vertex*3);colors.set(base.map(c=>c*(1-q.shade[i]*.095)),vertex*3);surfaces.set([q.c.emission?1:0,q.c.color.startsWith('glass')?.35:.9],vertex*2);vertex++;
  }
 }
 return {positions,normals,colors,surfaces,triangles:quads.length*2,surfaceFaces,bytes:positions.byteLength+normals.byteLength+colors.byteLength+surfaces.byteLength};
}

export function groundedCells(map){
 const found=new Set(),queue=[];for(const [key,c] of map)if(c.y===0){found.add(key);queue.push(c);}
 for(let i=0;i<queue.length;i++){const c=queue[i];for(const n of directions){const key=coordKey([c.x+n[0],c.y+n[1],c.z+n[2]]);if(found.has(key)||!map.has(key))continue;found.add(key);queue.push(map.get(key));}}
 return found;
}
export function editBox(map,{a,b,tool,color='roof',mirror=false,offset=[0,0,0],bounds=null,support='none'}){
 if(!['fill','erase','paint','copy'].includes(tool)||!Object.hasOwn(COLORS,color))throw Error('Invalid edit');
 if(![...a,...b,...offset].every(v=>Number.isInteger(v)&&Math.abs(v)<=160))throw Error('範囲が大きすぎます');
 const lo=a.map((v,i)=>Math.min(v,b[i])),hi=a.map((v,i)=>Math.max(v,b[i]));
 if(lo.reduce((n,v,i)=>n*(hi[i]-v+1),1)>40000)throw Error('一度の編集は40,000粒までです');
 const next=new Map(map),changes=new Map();
 const put=(q,c)=>{if(q.some(v=>Math.abs(v)>160)||q[1]<0||bounds&&q.some((v,i)=>v<bounds.min[i]||v>bounds.max[i]))return;const key=coordKey(q);if(!changes.has(key))changes.set(key,{key,old:map.get(key)});if(c)next.set(key,{...c,x:q[0],y:q[1],z:q[2],under:undefined,phase:4,group:'cafe',emission:c.color.startsWith('glass')});else next.delete(key);};
 for(let x=lo[0];x<=hi[0];x++)for(let y=lo[1];y<=hi[1];y++)for(let z=lo[2];z<=hi[2];z++){
  const q=[x,y,z],old=map.get(coordKey(q));if((tool==='paint'||tool==='copy')&&!old)continue;
  const target=tool==='copy'?q.map((v,i)=>v+offset[i]):q,c=tool==='erase'?null:tool==='copy'?old:{...old,color};
  put(target,c);if(mirror)put([-target[0]-1,target[1],target[2]],c);
 }
 const blocked=[];
 if(support!=='none'){
  // Layer stacking needs a cell immediately below. Process bottom-up for volume fills.
  if(support==='below')for(const c of [...next.values()].filter(c=>!map.has(coordKey(xyz(c)))).sort((a,b)=>a.y-b.y)){
   if(c.y>0&&!next.has(coordKey([c.x,c.y-1,c.z]))){next.delete(coordKey(xyz(c)));blocked.push(xyz(c));}
  }
  const grounded=groundedCells(next);
  for(const [key,c] of next)if(!map.has(key)&&!grounded.has(key)){next.delete(key);blocked.push(xyz(c));}
  // Never leave previously supported parts floating after removing a support.
  if(tool==='erase'){const before=groundedCells(map);for(const key of before)if(next.has(key)&&!grounded.has(key))throw Error('上や横のブロックが浮くため消せません。先にその部分を消してください。');}
 }
 if(next.size>240000)throw Error('作品は240,000粒までです');
 const patch=[...changes.values()].filter(({key,old})=>{const n=next.get(key);return (!old)!==(!n)||(old&&n&&(material(old)!==material(n)||old.phase!==n.phase));});
 return {map:next,patch,blocked};
}
export function encodeDensity(cells,factor,workspace='sample'){return JSON.stringify({format:'dayorama-density-study',version:1,factor,cell:CELL*factor,workspace,cells:[...cells.values()].map(({x,y,z,color,phase,group,under})=>({x,y,z,color,phase,group,under}))});}
export function decodeDensity(text){
 if(text.length>24000000)throw Error('作品ファイルが大きすぎます');const d=JSON.parse(text);
 if(d.format!=='dayorama-density-study'||d.version!==1||![1,2].includes(d.factor)||d.cell!==CELL*d.factor||!Array.isArray(d.cells)||d.cells.length>240000)throw Error('密度比較の作品ファイルではありません');
 const workspace=d.workspace??'sample';if(!['sample','blank'].includes(workspace))throw Error('作業台の種類が不正です');
 const map=new Map(),groups=new Set(['cafe','terrace','ground','tree','bench','plants']);
 const layer=c=>{if(!c||![c.x,c.y,c.z].every(v=>Number.isInteger(v)&&Math.abs(v)<=160)||!Object.hasOwn(COLORS,c.color)||!Number.isInteger(c.phase)||c.phase< -1||c.phase>4||!groups.has(c.group))throw Error('作品データが不正です');return {x:c.x,y:c.y,z:c.z,color:c.color,phase:c.phase,group:c.group,emission:c.color.startsWith('glass')};};
 for(const c of d.cells){const clean=layer(c),key=cellKey(clean);if(map.has(key))throw Error('重複する粒があります');if(c.under){if(!Array.isArray(c.under)||c.under.length>8)throw Error('建築段階が不正です');clean.under=c.under.map(v=>{const l=layer(v);if(cellKey(l)!==key)throw Error('建築段階の座標が不正です');return l;});}map.set(key,clean);}
 if(workspace==='blank'){const bounds=workbenchBounds(d.factor);for(const c of map.values())if([c.x,c.y,c.z].some((v,i)=>v<bounds.min[i]||v>bounds.max[i])||c.group!=='cafe')throw Error('作業台の範囲外に粒があります');}
 return {factor:d.factor,map,workspace};
}
