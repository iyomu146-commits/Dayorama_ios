// The editable grid is the only source of volume. Finish units replace whole
// integer cells; bevels cut inward and never add a thin skin outside the grid.
export const FINISH_BEVEL=.055;
const key=(x,y,z)=>`${x},${y},${z}`;
const blockSizes={walls:[8,4,8],gable:[8,4,8],plinth:[40,4,40],chimney:[7,10,7],terrace:[4,1,4],steps:[12,1,7],fascia:[40,1,36]};
const furniture=new Set(['door','handle','table','chair-front','chair-back','plant-left','plant-front','plant-right']);
export function addArchitecturalFinish(cells){
 const eligible=c=>!c.finishUnit&&(blockSizes[c.part]||furniture.has(c.part)&&(c.color.startsWith('wood')||c.color==='metal'||['pot','potLight'].includes(c.color)));
 const available=new Map([...cells].filter(([,c])=>eligible(c)));let serial=0;
 for(const c of [...available.values()].sort((a,b)=>a.y-b.y||a.z-b.z||a.x-b.x)){
  if(!available.has(key(c.x,c.y,c.z)))continue;
  const size=blockSizes[c.part],origin=[c.x,c.y,c.z];
  const match=(x,y,z)=>{
   const p=available.get(key(x,y,z));
   return p?.part===c.part&&p.color===c.color&&(!size||[x,y,z].every((v,a)=>v-origin[a]<size[a]));
  };
  let w=1,h=1,d=1;
  while(match(c.x+w,c.y,c.z))w++;
  outer:while(true){for(let i=0;i<w;i++)if(!match(c.x+i,c.y,c.z+d))break outer;d++;}
  outer:while(true){for(let i=0;i<w;i++)for(let k=0;k<d;k++)if(!match(c.x+i,c.y+h,c.z+k))break outer;h++;}
  const id=`block-${serial++}`,keys=[],colors=[];
  for(let i=0;i<w;i++)for(let j=0;j<h;j++)for(let k=0;k<d;k++){
   const cellKey=key(c.x+i,c.y+j,c.z+k),p=available.get(cellKey);
   keys.push(cellKey);colors.push(p.color);cells.set(cellKey,{...p,finishUnit:id});available.delete(cellKey);
  }
  cells.finishUnits.push({id,part:c.part,keys,colors,shape:{box:[c.x,c.y,c.z,w,h,d],color:c.color,bevel:FINISH_BEVEL}});
 }
}
