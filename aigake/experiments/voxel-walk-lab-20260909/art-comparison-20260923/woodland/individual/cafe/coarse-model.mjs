import {CELL,createCafeCells} from './model.mjs?v=grid5';

export const COARSE_CELL=CELL*2;
const key=(x,y,z)=>`${x},${y},${z}`;
const neighbours=[[1,0,0],[-1,0,0],[0,1,0],[0,-1,0],[0,0,1],[0,0,-1]];
const family=color=>['glass','wood','slate','brick','leaf'].find(prefix=>color.startsWith(prefix))||color;
// Resample the existing building in world space. This changes the editable grid,
// not the scene scale: eight 15cm positions share one genuine 30cm cell.
export function createCoarseCafeCells(source=createCafeCells()){
 const buckets=new Map();
 for(const c of source.values()){
  const p=[c.x,c.y,c.z].map(v=>Math.floor(v/2)),id=key(...p);
  if(!buckets.has(id))buckets.set(id,{p,samples:[]});
  buckets.get(id).samples.push(c);
 }
 const cells=new Map();
 for(const [id,{p,samples}] of buckets){
  const votes=new Map();
  for(const c of samples){
   // Glass shades vote together so a single backing color cannot outvote a
   // mixed-color pane. Windows and the door favour their actual exterior face.
   const outward=c.part==='side-window'?[[1,0,0]]:['front-window','door'].includes(c.part)?[[0,0,1]]:neighbours;
   const faces=outward.filter(d=>!source.has(key(c.x+d[0],c.y+d[1],c.z+d[2]))).length;
   const weight=1+faces*(outward.length===1?12:2)+(c.part==='handle'?40:0)+(c.part==='cup'?12:0)+(c.part==='chimney'&&c.color==='ivory'?12:0);
   const label=`${c.part}/${family(c.color)}`,vote=votes.get(label)||{colors:new Map(),weight:0};
   const colorVote=vote.colors.get(c.color)||{cell:c,weight:0};colorVote.weight+=weight;vote.colors.set(c.color,colorVote);
   vote.weight+=weight;votes.set(label,vote);
  }
  const order=(a,b)=>b[1].weight-a[1].weight||a[0].localeCompare(b[0],'en');
  const material=[...votes.entries()].sort(order)[0][1],winner=[...material.colors.entries()].sort(order)[0][1].cell;
  cells.set(id,{x:p[0],y:p[1],z:p[2],part:winner.part,color:winner.color,phase:winner.phase});
 }
 return cells;
}
