// Facade relief remains backed by the intact structural wall. Edits invalidate each
// affected patch via its source-cell colors; no floating replacement wall is created.
const key=(x,y,z)=>`${x},${y},${z}`;
const variation=n=>(Math.sin(n*127.1+311.7)*43758.5453)%1;
export function addArchitecturalFinish(cells){
 const panels=[];
 function panel(part,axis,plane,sign,lo,hi,y0,y1,width,height,kind){
  const coord=(u,y)=>axis===2?[u,y,plane]:[plane,y,u],face=plane+(sign>0?1:0);
  for(let y=y0,row=0;y<y1;y+=height,row++)for(let u0=lo-(row%2)*Math.floor(width/2);u0<hi;u0+=width){
   const bucket=new Map();
   for(let u=Math.max(lo,u0);u<Math.min(hi,u0+width);u++)for(let v=y;v<Math.min(y1,y+height);v++){
    const p=coord(u,v),c=cells.get(key(...p)),next=[...p];next[axis]+=sign;
    if(c?.part===part&&!cells.has(key(...next)))bucket.set(`${u},${v}`,c);
   }
   for(const c of [...bucket.values()].sort((a,b)=>a.y-b.y||(axis===2?a.x-b.x:a.z-b.z))){
    const u=axis===2?c.x:c.z,v=c.y;if(!bucket.has(`${u},${v}`))continue;
    const match=(a,b)=>{const p=bucket.get(`${a},${b}`);return p&&(kind!=='plaster'||p.color===c.color);};
    let w=1,h=1;while(match(u+w,v))w++;
    outer:for(;;h++){for(let i=0;i<w;i++)if(!match(u+i,v+h))break outer;}
    const keys=[],colors=[];for(let i=0;i<w;i++)for(let j=0;j<h;j++){const p=bucket.get(`${u+i},${v+j}`);keys.push(key(p.x,p.y,p.z));colors.push(p.color);bucket.delete(`${u+i},${v+j}`);}
    const n=u*17+v*43+plane*71,brick=kind==='brick'||c.color.startsWith('repair'),out=(brick?.23:.075)+variation(n)*(brick?.065:.035),gap=brick?.105:.025,embed=brick?.18:.30;
    const box=axis===2?[u+gap/2,v+gap/2,face-(sign>0?embed:out),w-gap,h-gap,embed+out]:[face-(sign>0?embed:out),v+gap/2,u+gap/2,embed+out,h-gap,w-gap];
    panels.push({id:`relief-${part}-${axis}-${sign}-${u}-${v}`,part,keys,colors,shape:{box,color:c.color,bevel:brick?.115:out+.025,overlay:true,axis,sign,backPlane:face,kind:brick?'brick':kind,seed:n,relief:true}});
   }
  }
 }
 for(const [axis,plane,sign,lo,hi] of [[2,13,1,-17,17],[2,-14,-1,-17,17],[0,16,1,-12,12],[0,-17,-1,-12,12]]){
  panel('plinth',axis,plane,sign,lo,hi,1,4,4,2,'brick');
  panel('plinth',axis,plane,sign,lo,hi,0,1,5,1,'stone');
  panel('walls',axis,plane,sign,lo,hi,4,22,6,4,'plaster');
  if(axis===0)panel('gable',axis,plane,sign,-14,14,22,34,6,4,'plaster');
 }
 for(const [axis,plane,sign,lo,hi] of [[2,-7,1,-13,-8],[2,-11,-1,-13,-8],[0,-9,1,-10,-7],[0,-13,-1,-10,-7]])panel('chimney',axis,plane,sign,lo,hi,28,37,3,2,'brick');
 // Stone slabs are a shallow skin over continuous pavement, not disconnected blocks.
 for(const part of ['terrace','steps']){
  const top=new Map([...cells].filter(([,c])=>c.part===part&&!cells.has(key(c.x,c.y+1,c.z))));
  for(const c of [...top.values()].sort((a,b)=>a.z-b.z||a.x-b.x)){
   if(!top.has(key(c.x,c.y,c.z)))continue;const match=(x,z)=>top.has(key(x,c.y,z));let w=1,d=1;
   while(w<4&&match(c.x+w,c.z))w++;
   outer:while(d<3){for(let i=0;i<w;i++)if(!match(c.x+i,c.z+d))break outer;d++;}
   const keys=[],colors=[];for(let i=0;i<w;i++)for(let j=0;j<d;j++){const k=key(c.x+i,c.y,c.z+j);keys.push(k);colors.push(top.get(k).color);top.delete(k);}
   panels.push({id:`paver-${part}-${c.x}-${c.y}-${c.z}`,part,keys,colors,shape:{box:[c.x+.035,c.y+.84,c.z+.035,w-.07,.21,d-.07],color:c.color,bevel:.06,overlay:true,axis:1,sign:1,backPlane:c.y+1,kind:'stone'}});
  }
 }
 // Long wooden members receive one bevel per board/leg. Do not round each voxel.
 const eligible=c=>!c.finishUnit&&(c.color.startsWith('wood')||c.color==='metal'||['pot','potLight'].includes(c.color))&&['door','handle','table','chair-front','chair-back','plant-left','plant-front','plant-right'].includes(c.part);
 const available=new Map([...cells].filter(([,c])=>eligible(c)));let serial=0;
 for(const c of [...available.values()].sort((a,b)=>a.y-b.y||a.z-b.z||a.x-b.x)){
  if(!available.has(key(c.x,c.y,c.z)))continue;
  const match=(x,y,z)=>{const p=available.get(key(x,y,z));return p?.part===c.part&&p.color===c.color;};let w=1,h=1,d=1;
  while(match(c.x+w,c.y,c.z))w++;
  outer:while(true){for(let i=0;i<w;i++)if(!match(c.x+i,c.y,c.z+d))break outer;d++;}
  outer:while(true){for(let i=0;i<w;i++)for(let j=0;j<d;j++)if(!match(c.x+i,c.y+h,c.z+j))break outer;h++;}
  const id=`trim-${serial++}`,keys=[],colors=[];
  for(let i=0;i<w;i++)for(let j=0;j<h;j++)for(let k=0;k<d;k++){const idKey=key(c.x+i,c.y+j,c.z+k),p=available.get(idKey);keys.push(idKey);colors.push(p.color);cells.set(idKey,{...p,finishUnit:id});available.delete(idKey);}
  const pot=c.color.startsWith('pot');panels.push({id,part:c.part,keys,colors,shape:{box:[c.x,c.y,c.z,w,h,d],color:c.color,bevel:pot?.09:.075,kind:pot?'ceramic':'wood'}});
 }
 cells.finishUnits.push(...panels);
}
