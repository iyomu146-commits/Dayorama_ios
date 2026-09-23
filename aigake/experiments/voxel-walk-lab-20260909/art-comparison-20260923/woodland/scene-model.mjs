import {BUILDINGS,TREES} from './plan.mjs';
export const key=c=>`${c.x},${c.y},${c.z}`;
export const hash=(x,y,z=0)=>{let h=Math.imul(x+371,374761393)^Math.imul(y+117,668265263)^Math.imul(z+47,1442695041);h=Math.imul(h^(h>>>13),1274126177);return (h^(h>>>16))>>>0;};
export function makeModel(){
 const map=new Map();let part='terrain',asset='town',phase=-1,ox=0,oz=0;
 const set=(p,a='town',ph=-1,x=0,z=0)=>{part=p;asset=a;phase=ph;ox=x;oz=z;};
 function put(x,y,z,color){const c={x:x+ox,y,z:z+oz,color,part,asset,phase,emission:color.startsWith('glass')};const k=key(c),old=map.get(k);if(old&&old.asset===asset&&old.phase>=0&&old.phase<phase)c.under=[...(old.under||[]),old];map.set(k,c);}
 function box(x0,x1,y0,y1,z0,z1,color){for(let y=y0;y<=y1;y++)for(let z=z0;z<=z1;z++)for(let x=x0;x<=x1;x++)put(x,y,z,typeof color==='function'?color(x,y,z):color);}
 function flower(x,z,y=0,tone=0){box(x,x,y,y+3,z,z,'leaf3');put(x-1,y+1,z,'leaf1');put(x+1,y+2,z,'leaf1');for(const [dx,dz] of [[-1,0],[1,0],[0,-1],[0,1]])put(x+dx,y+4,z+dz,'flower'+tone);put(x,y+4,z,tone===1?'wood2':'flower1');}
 function planter(x,z,tone=0){box(x-2,x+2,0,2,z-2,z+2,'brick1');box(x-1,x+1,3,3,z-1,z+1,'soil0');flower(x,z,4,tone);}
 function bench(x,z){for(const xx of [x,x+11])for(const zz of [z,z+3])box(xx,xx,0,3,zz,zz,'wood3');box(x,x+11,4,4,z,z+3,'wood1');for(const xx of [x,x+11])box(xx,xx,5,9,z,z,'wood3');box(x,x+11,7,9,z,z,'wood1');}
 function sideBench(x,z){for(const xx of [x,x+3])for(const zz of [z,z+11])box(xx,xx,1,3,zz,zz,'wood3');box(x,x+3,4,4,z,z+11,'wood1');for(const zz of [z,z+11])box(x,x,5,9,zz,zz,'wood3');box(x,x,7,9,z,z+11,'wood1');}
 const inside=(x,z)=>x>=-88&&x<=(z<-20?92:86)&&z>=-81&&z<=81&&!(x<-81&&z>74)&&!(x>80&&z>76)&&!(x<-84&&z<-78)&&!(x>88&&z<-78);
 const path=(x,z)=>Math.abs(x)<9||Math.abs(z-4)<6||Math.abs(z-53)<7||BUILDINGS.some(b=>x>b.x-b.w/2-5&&x<b.x+b.w/2+15&&z>b.z+Math.floor(b.d/2)&&z<b.z+Math.floor(b.d/2)+10);
 for(let z=-81;z<=81;z++)for(let x=-88;x<=92;x++){
  if(!inside(x,z))continue;const stream=z>=65&&z<=73;
  set(stream?'stream':'terrain');put(x,-6,z,'soil0');
  if(!inside(x-1,z)||!inside(x+1,z)||!inside(x,z-1)||!inside(x,z+1)||[64,74].includes(z))box(x,x,-5,-2,z,z,'soil1');
  if(stream){set('stream');put(x,-3,z,'water0');continue;}put(x,-1,z,path(x,z)?'stone0':'grass0');
 }
 for(const b of BUILDINGS){
  const a=-b.w/2,c=a+b.w-1,f=Math.floor(b.d/2),back=f-b.d+1,roofY=(x,z)=>b.h+1+2*Math.floor(Math.min(z-back+3,f+3-z,...(b.roof==='hip'?[x-a+3,c+3-x]:[]))/3);
  const change=(suffix,ph)=>set(b.id+'-'+suffix,b.id,ph,b.x,b.z);
  change('base',0);box(a-2,c+2,0,0,back-2,f+7,'stone0');box(a,c,1,2,back,f,'stone1');box(b.door[0]-1,b.door[1]+1,1,1,f+1,f+4,'stone1');box(b.door[0]-1,b.door[1]+1,2,2,f+1,f+2,'stone1');
  change('frame',1);box(a,c,3,3,back,f,'wood3');
  for(const x of [a,c-1])for(const z of [back,f-1])box(x,x+1,4,b.h,z,z+1,'wood3');
  for(const y of b.upper?[23,b.h]:[b.h]){box(a,c,y,y,back,back+1,'wood3');box(a,c,y,y,f-1,f,'wood3');box(a,a+1,y,y,back,f,'wood3');box(c-1,c,y,y,back,f,'wood3');}
  for(let x=a;x<=c;x+=7)for(let z=back;z<=f;z++)box(x,x,roofY(x,z)-2,roofY(x,z),z,z,'wood3');
  if(b.roof==='gable')for(const x of [a,c])box(x,x,b.h,b.h+10,-1,1,'wood3');
  change('walls',2);
  for(let y=4;y<=b.h;y++)for(let z=back;z<=f;z++)for(let x=a;x<=c;x++){
   if(x>a+1&&x<c-1&&z>back+1&&z<f-1)continue;
   const front=z>=f-1,door=front&&x>=b.door[0]&&x<=b.door[1]&&y<=19;
   const win=front&&b.windows.some(([l,r,lo,hi])=>x>=l&&x<=r&&y>=lo&&y<=hi);
   const side=x>=c-1&&z>=-7&&z<=3&&((y>=10&&y<=20)||(b.upper&&y>=30&&y<=39));
   const rear=z<=back+1&&x>=-5&&x<=4&&y>=11&&y<=20;
   if(door||win||side||rear)continue;put(x,y,z,(b.id==='cafe'&&y<7?'brick':b.upper&&y>24?b.upper:b.wall)+'0');
  }
  if(b.roof==='gable')for(const x of [a,a+1,c-1,c])for(let z=back;z<=f;z++)box(x,x,b.h+1,roofY(x,z)-1,z,z,(b.upper||b.id==='bakery'?'plaster':b.wall)+'0');
  change('openings',2);
  function window(axis,plane,l,r,lo,hi,rail=false){
   const b2=(u0,u1,y0,y1,p0,p1,col)=>axis==='z'?box(u0,u1,y0,y1,p0,p1,col):box(p0,p1,y0,y1,u0,u1,col);
   b2(l,r,lo,hi,plane-1,plane-1,'glass0');for(const u of [l-1,r+1])b2(u,u,lo-1,hi+1,plane-1,plane+1,'wood1');
   for(const y of [lo-1,hi+1])b2(l-1,r+1,y,y,plane-1,plane+1,'wood1');b2(l-2,r+2,lo-2,lo-2,plane,plane+2,'stone1');b2(l-2,r+2,hi+2,hi+2,plane,plane+1,'stone1');
   if(rail){b2(l-2,r+2,lo-2,lo-2,plane+2,plane+3,'wood3');b2(l-2,r+2,lo+2,lo+2,plane+3,plane+3,'wood3');for(const u of [l-2,l+1,r-1,r+2])b2(u,u,lo-1,lo+1,plane+3,plane+3,'wood3');}
  }
  b.windows.forEach(v=>window('z',f,...v,b.upper&&v[2]>25));window('x',c,-7,3,10,20);if(b.upper)window('x',c,-7,3,30,39,true);
  box(-5,4,11,20,back,back,'glass0');for(const x of [-6,5])box(x,x,10,21,back-1,back,'wood1');for(const y of [10,21])box(-6,5,y,y,back-1,back,'wood1');
  const [dl,dr]=b.door;box(dl,dr,4,19,f-1,f-1,'wood1');box(dl+1,dr-1,11,17,f,f,'glass0');for(const x of [dl-1,dr+1])box(x,x,4,20,f-1,f+1,'wood3');box(dl-1,dr+1,20,20,f-1,f+1,'wood3');put(dr-1,10,f,'metal0');
  change('roof',3);for(let z=back-3;z<=f+3;z++)for(let x=a-3;x<=c+3;x++)box(x,x,roofY(x,z),roofY(x,z)+1,z,z,b.tiles+'0');
  for(let z=back-2;z<=f+2;z++)for(let x=a-2;x<=c+2;x++){const course=Math.floor((z-back+3)/3);if((x-a+2+course%2*2)%6!==0&&(z-back+3)%3!==0)put(x,roofY(x,z)+2,z,b.tiles+'0');}
  if(b.roof==='gable')box(a-3,c+3,b.h+12,b.h+12,-1,1,b.tiles+'0');
  change('details',4);
  if(b.id==='home'){
   for(let z=f;z<=f+5;z++)box(dl-3,dr+3,23-Math.floor((z-f)/3),24-Math.floor((z-f)/3),z,z,'blueRoof0');
   box(a+5,a+8,4,b.h+17,back+6,back+9,'brick0');box(a+4,a+9,b.h+18,b.h+18,back+5,back+10,'stone1');
   for(const x of [a-6,c+6]){box(x,x,0,3,f+2,f+12,'wood1');for(let z=f+2;z<=f+12;z+=5)box(x,x+1,0,5,z,z+1,'wood1');}
  }
  if(b.id==='bakery'){
   box(c+1,c+10,0,2,-7,f,'stone0');box(c+1,c+10,3,19,-7,f,'brick0');
   for(let x=c+1;x<=c+12;x++)box(x,x,20+Math.floor((c+12-x)/3),21+Math.floor((c+12-x)/3),-9,f+2,'redRoof0');
   box(c+10,c+10,8,15,-3,4,'glass0');for(const z of [-4,5])box(c+10,c+11,7,16,z,z,'stone1');for(const y of [7,16])box(c+10,c+11,y,y,-4,5,'stone1');
   for(const [cx,w] of [[a+7,9],[c-2,5]]){box(cx-w/2|0,(cx+w/2|0),1,5,f+4,f+8,'wood3');box(cx-w/2|0,(cx+w/2|0),6,6,f+3,f+9,'wood1');for(let x=(cx-w/2|0)+1;x<(cx+w/2|0);x+=3){box(x,x+1,7,8,f+4,f+7,'ochre1');box(x,x+1,9,9,f+5,f+6,'ochre2');put(x,9,f+5,'cream1');}}
  }
  if(b.id==='florist'){
   box(a-10,a-1,0,3,-3,f,'wood1');box(a-10,a-1,4,15,-3,f,'glass0');
   for(const x of [a-10,a-1])for(const z of [-3,f])box(x,x,4,17,z,z,'cream0');
   for(let z=-4;z<=f+1;z++)for(let x=a-11;x<=a;x++)put(x,18-Math.floor((z+4)/4),z,(x===a-11||x===a||z===-4||z===f+1)?'cream0':'glass1');
   for(const [x,z,tone] of [[a-7,f+5,0],[a-1,f+6,1],[a+6,f+7,3],[c+5,f+4,4],[c+5,f-3,0],[c+5,f-10,1]])planter(x,z,tone);
  }
  if(b.id==='books'){box(c+1,c+10,0,0,back+3,f+7,'stone0');sideBench(c+5,-7);planter(a-4,f+4,4);box(a+6,a+9,4,b.h+15,back+7,back+10,'plaster0');box(a+5,a+10,b.h+16,b.h+16,back+6,back+11,'plumRoof0');for(let x=-11;x<=1;x+=3)box(x,x+1,9,13+(x%2),f-1,f-1,x%3===0?'wood1':'cream0');}
  if(b.id==='cafe'){
   box(c+2,c+19,0,0,-9,f+7,'stone0');box(c+8,c+14,6,6,-1,5,'wood1');for(const x of [c+8,c+14])for(const z of [-1,5])box(x,x,1,5,z,z,'wood3');
   for(const [z,side] of [[-7,-1],[9,1]]){for(const x of [c+9,c+13])for(const zz of [z,z+3])box(x,x,1,3,zz,zz,'wood3');box(c+9,c+13,4,4,z,z+3,'wood1');const zz=side<0?z:z+3;for(const x of [c+9,c+13])box(x,x,5,9,zz,zz,'wood3');box(c+9,c+13,8,9,zz,zz,'wood1');}put(c+11,7,2,'cream0');
   planter(a-3,f+4,4);planter(c+4,f+7,0);box(a+5,a+8,4,b.h+13,back+6,back+9,'brick0');box(a+4,a+9,b.h+14,b.h+14,back+5,back+10,'stone1');
  }
  if(b.id!=='home'&&b.id!=='books')for(let z=f+1;z<=f+5;z++)for(let x=a+1;x<=c-2;x++)box(x,x,b.h-2-Math.floor((z-f)/3),b.h-1-Math.floor((z-f)/3),z,z,'cream0');
 }
 TREES.forEach(([cx,cz],i)=>{
  set(`tree-${i}`,'tree',-1,cx,cz);const e=i===2?3:0;
  box(-1,1,0,30+e,-1,1,i===2?'cream0':'wood3');box(-2,2,0,3,-2,2,i===2?'cream0':'wood3');
  if(i===2)for(let y=5;y<27;y+=6){box(-1,0,y,y,1,1,'wood3');put(1,y+2,0,'wood3');}
  for(const sign of [-1,1])for(let n=0;n<=7;n++)box(sign*n-1,sign*n+1,22+n+e,24+n+e,-1,1,'wood3');
  for(const [x,y,z,r] of [[0,31+e,0,10],[-8,29+e,1,7],[7,32+e,0,8],[-2,39+e,-1,6],[1,29+e,7,7]])for(let yy=-r;yy<=r;yy+=2)for(let zz=-r;zz<=r;zz+=2)for(let xx=-r;xx<=r;xx+=2){if(Math.abs(xx)+Math.abs(zz)>r*1.7||Math.abs(xx)+Math.abs(yy)+Math.abs(zz)>r*2.05)continue;const px=Math.round((x+xx)*.7),pz=Math.round((z+zz)*.7);box(px,px+1,y+yy,y+yy+1,pz,pz+1,'leaf0');}
 });
 set('bridge','bridge');box(-8,8,-2,-1,62,77,'wood3');box(-8,8,0,0,62,77,'wood1');for(const x of [-8,8]){for(const z of [62,69,77])box(x,x+1,0,7,z,z+1,'wood1');box(x,x,5,5,62,78,'wood1');}
 set('street','bench');bench(-72,53);
 for(const [x,z] of [[-25,-6],[78,1],[-70,36]]){box(x-1,x+1,0,1,z-1,z+1,'metal0');box(x,x,2,16,z,z,'metal0');box(x-2,x+2,17,17,z-2,z+2,'metal0');box(x-1,x+1,18,21,z-1,z+1,'glass2');for(const xx of [x-2,x+2])for(const zz of [z-2,z+2])box(xx,xx,18,22,zz,zz,'metal0');box(x-2,x+2,22,22,z-2,z+2,'metal0');box(x-1,x+1,23,23,z-1,z+1,'metal0');}
 set('garden','flowers');
 for(const [x,z] of [[-72,-15],[-70,13],[-65,31],[-16,-7],[24,-5],[78,33],[-68,69],[65,60],[-35,77],[32,77]]){
  for(const [dx,dz,t] of [[0,0,0],[4,1,1],[-3,3,4]]){const xx=x+dx,zz=z+dz;if(zz>=65&&zz<=73||path(xx,zz)||map.has(`${xx},0,${zz}`))continue;flower(xx,zz,0,t);}
 }
 // Restrained, irregular shrubs placed outside the circulation rectangles.
 for(const [x,z] of [[-78,20],[78,51],[-22,-52]])for(const [dx,dz,h,w] of [[0,0,5,4],[4,1,3,3],[-3,2,4,3]])box(x+dx-w,x+dx+w,0,h,z+dz-w,z+dz+w,'leaf0');
 // Macro color zones are stored in the voxels. No baked image lighting.
 for(const c of map.values()){
  const base=c.color.replace(/\d+$/,''),q=hash(Math.floor((c.x+(Math.floor(c.y/2)%2)*2)/4),Math.floor(c.y/2),Math.floor(c.z/4));
  if(c.color.endsWith('0')&&['plaster','sage','ochre','indigo'].includes(base)){const v=q%17;c.color=base+(v<11?0:v<13?1:v<15?2:3);}
  else if(c.color.endsWith('0')&&['brick','soil','stone','grass'].includes(base))c.color=base+((q%10)<6?0:(q%4)+1);
  else if(base.includes('Roof')){const v=hash(Math.floor(c.x/4),Math.floor(c.y/2),Math.floor(c.z/3))%13;c.color=base+(v<6?0:v<9?1:v<11?2:3);}
  else if(base==='wood'&&c.color!=='wood3')c.color='wood'+hash(Math.floor(c.x/2),0,Math.floor(c.z/3))%3;
  else if(base==='leaf')c.color='leaf'+(hash(Math.floor(c.x/4),Math.floor(c.y/4),Math.floor(c.z/4))%7<3?0:hash(Math.floor(c.x/4),Math.floor(c.y/4),Math.floor(c.z/4))%5);
  else if(base==='glass')c.color='glass'+(c.y%11===8?2:c.y%11<3?3:1);
  else if(base==='water')c.color='water'+hash(Math.floor(c.x/7),0,Math.floor(c.z/3))%4;
  if(c.part==='cafe-details'&&c.color.startsWith('cream')&&c.y>20)c.color=Math.floor(c.x/3)%2===0?'cream0':'brick4';
 }
  const cells=[...map.values()];
  for(const b of BUILDINGS)orderConstruction(cells.filter(c=>c.asset===b.id));
  return {cells,buildings:BUILDINGS};
}
export function orderConstruction(cells){
 const neighbours=c=>[[1,0,0],[-1,0,0],[0,1,0],[0,-1,0],[0,0,1],[0,0,-1]].map(d=>`${c.x+d[0]},${c.y+d[1]},${c.z+d[2]}`),occupied=new Set();
 for(let phase=0;phase<5;phase++){
  const stage=new Map();for(const c of cells)for(const v of [...(c.under||[]),c])if(v.phase===phase)stage.set(key(v),v);
  const queue=[],seen=new Set(),add=(k,c)=>{if(!seen.has(k)){seen.add(k);queue.push(c);}};
  for(const [k,c] of stage)if(c.y===0||occupied.has(k)||neighbours(c).some(k=>occupied.has(k)))add(k,c);
  for(let i=0;i<queue.length;i++){const c=queue[i];c.order=i;occupied.add(key(c));for(const k of neighbours(c))if(stage.has(k))add(k,stage.get(k));}
  if(seen.size!==stage.size){const rest=[...stage.values()].filter(c=>!seen.has(key(c)));throw Error(`Unsupported ${cells[0].asset} phase ${phase}: ${rest.length}, ${JSON.stringify(rest.slice(0,2))}`);}
 }
}
export function atConstruction(cells,steps,asset){
 const stages=[2000,6000,12000,17000,20000],staged=Array.from({length:5},()=>[]),map=new Map();
 for(const c of cells){if(asset&&c.asset!==asset)continue;for(const v of [...(c.under||[]),c])if(v.phase<0)map.set(key(v),v);else staged[v.phase].push(v);}
 staged.forEach((items,i)=>{items.sort((a,b)=>a.order-b.order);const start=i?stages[i-1]:0,n=Math.floor(items.length*Math.max(0,Math.min(1,(steps-start)/(stages[i]-start))));for(let j=0;j<n;j++)map.set(key(items[j]),items[j]);});return map;
}
