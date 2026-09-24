export const CELL=.15;
export const Y=y=>y;
export const PALETTE={clay:'#b9b5a5',plaster:'#cb9a58',tile:'#707343',wood:'#94683b',glass:'#567c75',stone:'#d4c49c',pot:'#a76d46',leaf:'#5c7d3f',flower:'#d5939c',metal:'#746444'};
Object.assign(PALETTE,{plasterLight:'#d7ae71',plasterDeep:'#b8894e',plasterWarm:'#c49759',tileLight:'#83854e',tileWarm:'#969457',tileDeep:'#646a40',tileJoint:'#686e43',woodLight:'#aa7e4a',woodDeep:'#7b5734',glassLight:'#79968a',glassDeep:'#486c65',stoneLight:'#e1d2af',stoneDeep:'#beb293',potLight:'#b98050',potDeep:'#93603e',leafLight:'#78934d',leafDeep:'#496a37',flowerPink:'#d5939c',flowerYellow:'#dcb84f',flowerWhite:'#e7d9b4',flowerPurple:'#a391bb',flowerOrange:'#d69c54',centerGold:'#c19b39',centerCream:'#eee0a5'});
export const containers=[['planter-left','flowers-left',-34,0,19,16,4,6],['pot-pink','flowers-pink',-17,0,22,5,5,5],['planter-yellow','flowers-yellow',-9,0,23,11,4,6],['pot-purple','flowers-purple',17,0,23,5,5,5],['pot-white','flowers-white',24,0,22,5,5,5],...['front','middle','back'].map((s,i)=>['planter-side-'+s,'flowers-side-'+s,23,0,10-i*9,8,5,6])];
export function createFloristCells({stage='optimization'}={}){
 if(stage!=='blockout')return detailed(stage);
 const cells=new Map(),box=(part,x,y,z,w,h,d)=>{for(let a=x;a<x+w;a++)for(let b=y;b<y+h;b++)for(let c=z;c<z+d;c++)cells.set(`${a},${b},${c}`,{x:a,y:b,z:c,color:'clay',part,phase:0});};
 box('building',-16,0,-13,34,25,28);
 for(let z=-16;z<18;z++){const top=26+2*Math.floor((16.5-Math.abs(z+.5))/3);box('roof',-19,top,z,40,2,1);if(z>=-13&&z<15)box('building',-16,25,z,34,Math.max(0,top-25),1);}
 for(let z=1;z<18;z++)box('greenhouse-frame',-32,0,z,16,18-Math.floor((z-1)/3),1);
 for(const [id,,x,y,z,w,h,d]of containers)box(id,x,y,z,w,h+5,d);
 box('awning',-14,20,14,17,2,5);box('steps',5,0,15,10,1,6);
 return cells;
}
function detailed(stage){
 if(!['structure','form','material','surface','lighting','interaction','optimization'].includes(stage))throw Error('This pass is not built yet.');
 const cells=new Map();
 const box=(part,color,x,y,z,w,h,d,phase=3)=>{for(let a=x;a<x+w;a++)for(let b=y;b<y+h;b++)for(let c=z;c<z+d;c++)cells.set(`${a},${b},${c}`,{x:a,y:b,z:c,color,part,phase});};
 const cut=(x,y,z,w,h,d)=>{for(let a=x;a<x+w;a++)for(let b=y;b<y+h;b++)for(let c=z;c<z+d;c++)cells.delete(`${a},${b},${c}`);};
 box('plinth','stone',-16,0,-13,34,1,28,0);box('building','plaster',-16,1,-13,34,24,28,1);cut(-14,1,-11,30,24,24);
 for(let z=-16;z<18;z++){
  const top=26+2*Math.floor((16.5-Math.abs(z+.5))/3),bottom=Math.max(25,top-2);
  box('roof','tile',-19,bottom,z,40,top-bottom+2,1,2);
  if(z>=-13&&z<15){box('gable','plaster',-16,25,z,2,Math.max(0,bottom-25),1,1);box('gable','plaster',16,25,z,2,Math.max(0,bottom-25),1,1);}
 }
 for(const z of [-14,15])box('fascia','wood',-17,24,z,36,1,1,2);
 // Storefront openings, with uninterrupted glass behind their displays.
 cut(-13,5,13,15,14,3);box('display-frame','wood',-13,5,13,15,14,3);cut(-12,6,13,13,12,3);box('display-glass','glass',-12,6,13,13,12,1);
 for(let z=14;z<19;z++)box('awning','tile',-14,21-Math.floor((z-14)/3),z,17,2,1,3);
 cut(5,1,13,10,19,3);box('door-frame','wood',5,1,14,10,19,2);cut(6,1,13,8,18,3);box('door','wood',6,1,14,8,18,1);box('door-glass','glass',7,12,14,6,5,1);box('handle','metal',12,10,15,1,1,1);
 cut(16,8,-5,3,13,10);box('side-frame','wood',17,8,-5,2,13,10);cut(16,9,-4,3,11,8);box('side-glass','glass',17,9,-4,1,11,8);box('side-frame','wood',18,7,-5,3,2,10);box('side-frame','wood',18,21,-6,2,2,12);
 box('steps','stone',5,0,15,10,1,6,0);
 // Glazed lean-to: perimeter frame only, no vertical bars across the panes.
 box('greenhouse-frame','stone',-32,0,1,16,2,17,1);
 for(let z=1;z<18;z++){
  const top=16-Math.floor((z-1)/3);
  box('greenhouse-frame','stone',-32,top,z,16,2,1,2);
  if(z>1&&z<17)box('greenhouse-glass','glass',-31,top,z,14,2,1,3);
  for(const x of [-32,-17]){
   box('greenhouse-frame','stone',x,2,z,1,top-2,1,1);
   if(z>1&&z<17)box('greenhouse-glass','glass',x,2,z,1,top-2,1,3);
  }
 }
 for(const [z,top]of [[1,16],[17,11]]){box('greenhouse-frame','stone',-32,2,z,16,top-2,1,1);box('greenhouse-glass','glass',-31,2,z,14,top-2,1,3);}
 function flower(part,x,z,base,head){
  if(stage==='structure'){box(part,'leaf',x,base,z,1,head-base,1,4);box(part,'flower',x-1,head,z-1,3,1,3,4);return;}
  const bloom=part+':'+x+':'+z;
  const put=(a,b,c,color,role)=>{const key=`${a},${b},${c}`,old=cells.get(key);if(old?.bloom&&old.bloom!==bloom)throw Error('Overlapping flowers: '+bloom+' and '+old.bloom);box(part,color,a,b,c,1,1,1,4);Object.assign(cells.get(key),{bloom,flowerRole:role});};
  for(let y=base;y<head;y++)put(x,y,z,'leaf','stem');
  put(x-1,head-2,z,'leaf','leaf');put(x,head-3,z+1,'leaf','leaf');
  put(x,head,z,'flower','center');
  for(const [dx,dz]of [[-1,0],[1,0],[0,-1],[0,1]])put(x+dx,head,z+dz,'flower','petal');
  put(x,head+1,z,'flower','center');
 }
 for(const [id,flowers,x,y,z,w,h,d]of containers){
  box(id,id.startsWith('pot')?'pot':'wood',x,y,z,w,h,d,4);cut(x+1,h-1,z+1,w-2,1,d-2);box(id,'leaf',x+1,h-2,z+1,w-2,1,d-2,4);
  const centers=id==='planter-left'?[-32,-28,-24,-20]:id==='planter-yellow'?[-7,-3,0]:id.startsWith('pot')?[x+2]:[x+2,x+6];
  if(stage!=='structure'&&id.startsWith('pot')){for(const a of [x,x+w-1])for(const c of [z,z+d-1])cut(a,0,c,1,h,1);}
  centers.forEach((cx,i)=>flower(flowers,cx,z+3,h-1,h+3+(i%2)+(stage!=='structure'&&id==='pot-white'?2:0)));
 }
 for(const [x,h]of [[-10,11],[-6,12],[-2,10]])flower('display-flowers',x,15,6,h);
 for(const [z,h]of [[-2,14],[2,15]])flower('side-flowers',19,z,9,h);
 if(!['structure','form'].includes(stage)){
  const hash=(a,b,s=0)=>{const n=Math.sin(a*127.1+b*311.7+s*74.7)*43758.5453;return n-Math.floor(n);};
  for(const c of cells.values()){
   const {x,y,z,part}=c,row=Math.floor(y/2),u=Math.abs(z)>=12?x:z,t=hash(Math.floor((u+(row%2)*2)/4),row,3);
   if(c.color==='plaster')c.color=t<.18?'plasterLight':t>.80?'plasterDeep':t>.56?'plasterWarm':'plaster';
   if(c.color==='stone')c.color=t<.20?'stoneDeep':t>.75?'stoneLight':'stone';
   if(c.color==='tile'){
    const lane=(x+19)%5,course=Math.floor((16.5-Math.abs(z+.5))/3),tone=hash(Math.floor((x+19)/5),course,4);
    c.color=lane===4?'tileJoint':lane<2?(tone<.14?'tileWarm':tone>.70?'tileLight':'tile'):(tone<.14?'tileLight':tone>.70?'tile':'tileDeep');
   }
   if(c.color==='wood'){const grain=part.startsWith('planter')?Math.floor(y/2):Math.floor(x/2);c.color=hash(grain,part.startsWith('planter')?0:Math.floor(y/9),2)<.3?'woodLight':'wood';}
   if(c.color==='glass')c.color=y>14?'glassDeep':x%9===0?'glassLight':'glass';
   if(c.color==='pot')c.color=y<2?'potDeep':y===4?'potLight':'pot';
   if(c.color==='leaf')c.color=c.flowerRole==='stem'?'leafDeep':hash(x,z,Math.floor(y/2))>.6?'leafLight':'leaf';
   if(c.flowerRole==='petal'||c.flowerRole==='center'){
    const tone=part==='flowers-left'?['Pink','White','Yellow','Orange'][Math.floor((x+33)/4)]:part.includes('yellow')||part==='flowers-side-front'||part==='flowers-side-middle'?'Yellow':part.includes('purple')?'Purple':part.includes('white')?'White':part==='display-flowers'?'Orange':'Pink';
    // Color belongs to the whole bloom, not the individual petal coordinate.
    const bloomX=Number(c.bloom.split(':')[1]),petalTone=part==='flowers-left'?['Pink','Pink','White','Yellow'][Math.floor((bloomX+32)/4)]:tone;
    c.color=c.flowerRole==='center'?(petalTone==='Yellow'?'centerCream':'centerGold'):'flower'+petalTone;
   }
  }
 }
 return cells;
}
