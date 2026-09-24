export const CELL=.15;
export const PALETTE={clay:'#b9b5a5',masonry:'#627985',tile:'#6d626c',stone:'#d8ceb1',wood:'#936637',glass:'#426b63',paper:'#c4ab7a',leaf:'#708b47',pot:'#a77046',metal:'#8b794d',lamp:'#e6d9a9'};
Object.assign(PALETTE,{masonryLight:'#75838b',masonryBlue:'#587185',masonryDeep:'#4e6577',masonryWarm:'#8c8e83',tileLight:'#80717a',tileWarm:'#8e7e80',tileDeep:'#625963',tileJoint:'#665e68',stoneLight:'#e2d5b4',stoneDeep:'#b9b29b',woodLight:'#a67b48',woodDeep:'#765233',glassLight:'#597c71',glassDeep:'#345e58',paperCream:'#d1bd89',paperGreen:'#709080',paperRed:'#a8694e',paperBlue:'#668284',paperOchre:'#bc964f',leafLight:'#8f9f55',leafDeep:'#59773e',potDeep:'#925e3e'});
export function createBooksCells({stage='optimization'}={}){
 if(stage!=='blockout')return createDetailedCells(stage);
 const cells=new Map(),box=(part,x,y,z,w,h,d)=>{for(let a=x;a<x+w;a++)for(let b=Math.round(y*1.12);b<Math.round((y+h)*1.12);b++)for(let c=z;c<z+d;c++)cells.set(`${a},${b},${c}`,{x:a,y:b,z:c,color:'clay',part,phase:0});};
 box('building',-20,0,-14,40,25,28);
 // The observed roof is hipped: height increases with distance from all four eaves.
 for(let x=-23;x<23;x++)for(let z=-17;z<17;z++){
  const course=Math.min(7,Math.floor(Math.min((x+23)/2.65,(22-x)/2.65,(z+17)/2,(16-z)/2)));
  box('roof',x,25+course*2,z,1,2,1);
 }
 box('chimney',7,33,-10,5,12,5);box('chimney-rim',6,44,-11,7,2,7);
 box('bench',23,0,-4,7,6,19);box('bench',23,6,-4,1,5,19);
 box('pot-left',-25,0,16,5,7,5);box('pot-right',18,0,18,5,8,5);
 box('lamp-post',32,0,7,2,9,2);box('lamp-head',31,8,6,4,6,4);
 box('steps',5,0,14,12,2,8);
 const positioned=new Map();for(const c of cells.values()){if(['building','roof','chimney','chimney-rim','steps'].includes(c.part))c.x-=3;positioned.set(`${c.x},${c.y},${c.z}`,c);}return positioned;
}

export const Y=y=>Math.round(y*1.12);
const props=new Set(['bench','pot-left','pot-right','herb-left','herb-right','lamp-post','lamp-head']);
function createDetailedCells(stage){
 if(!['structure','form','material','surface','lighting','interaction','optimization'].includes(stage))throw Error('This pass is not built yet.');
 const cells=new Map();
 const box=(part,color,x,y,z,w,h,d,phase=3)=>{for(let a=x;a<x+w;a++)for(let b=Y(y);b<Y(y+h);b++)for(let c=z;c<z+d;c++)cells.set(`${a},${b},${c}`,{x:a,y:b,z:c,color,part,phase});};
 const cut=(x,y,z,w,h,d)=>{for(let a=x;a<x+w;a++)for(let b=Y(y);b<Y(y+h);b++)for(let c=z;c<z+d;c++)cells.delete(`${a},${b},${c}`);};
 box('plinth','stone',-20,0,-14,40,2,28,0);
 box('building','masonry',-20,2,-14,40,23,28,1);cut(-18,2,-12,36,23,24);
 // Continuous hip backing: adjacent two-cell courses share complete side faces.
 for(let x=-23;x<23;x++)for(let z=-17;z<17;z++){
  const course=Math.min(7,Math.floor(Math.min((x+23)/2.65,(22-x)/2.65,(z+17)/2,(16-z)/2)));
  const top=26+course*2,bottom=Math.max(25,top-3);
  box('roof','tile',x,bottom,z,1,top-bottom+1,1,2);
 }
 box('fascia','stone',-21,23,-15,42,2,30,2);cut(-18,23,-12,36,2,24);
 box('chimney','stone',7,33,-10,5,12,5,2);box('chimney-rim','tile',6,44,-11,7,2,7,2);
 cut(8,39,-9,3,7,3);
 // Front display: the shelves run horizontally; no centre mullion.
 cut(-16,5,12,18,13,3);box('display-frame','wood',-16,5,13,18,13,2);cut(-15,6,12,16,11,3);
 box('display-glass','glass',-15,6,12,16,11,1);
 box('shelf','wood',-15,11,13,16,1,2);
 box('display-sill','stone',-17,3,14,20,2,3);box('display-lintel','stone',-17,18,14,20,2,3);
 for(const [row,y] of [['lower',6],['upper',12]])for(const [i,x] of [-15,-12,-9,-6,-3,-1].entries())box(`books-${row}`,'paper',x,y,13,2,3+(i%2),1,4);
 cut(6,2,12,10,18,3);box('door-frame','wood',6,2,13,10,18,2);cut(7,2,12,8,17,3);
 box('door','wood',7,2,13,8,17,1);box('door-glass','glass',8,11,13,6,6,1);box('handle','metal',13,9,14,1,1,1);
 box('door-lintel','stone',5,20,14,12,2,3);
 cut(18,7,-3,3,13,6);box('side-window','wood',19,7,-3,2,13,6);cut(18,8,-2,3,11,4);box('side-window','glass',19,8,-2,1,11,4);
 box('side-window','stone',20,5,-4,2,2,8);box('side-window','stone',20,20,-4,2,2,8);
 box('steps','stone',5,0,14,12,1,8,0);box('steps','stone',5,1,14,12,1,4,0);
 // Four grounded legs; the two back boards attach to end uprights.
 for(const x of [23,28])for(const z of [-4,13])box('bench','wood',x,0,z,2,5,2,4);
 box('bench','wood',23,5,-4,7,1,19,4);
 for(const z of [-4,13])box('bench','wood',23,6,z,1,5,2,4);
 for(const y of [7,10])box('bench','wood',23,y,-4,1,1,19,4);
 for(const [id,x,z] of [['left',-25,16],['right',18,18]]){
  box('pot-'+id,'pot',x,0,z,5,4,5,4);cut(x+1,3,z+1,3,1,3);box('pot-'+id,'wood',x+1,2,z+1,3,1,3,4);
  for(const [dx,dz,h] of [[1,1,4],[3,2,5],[2,3,3]]){box('herb-'+id,'leaf',x+dx,3,z+dz,1,h,1,4);box('herb-'+id,'leaf',x+dx-1,4,z+dz,2,1,1,4);}
 }
 box('lamp-post','metal',32,0,7,2,9,2,4);box('lamp-head','lamp',31,8,6,4,5,4,4);box('lamp-head','tile',31,13,6,4,1,4,4);
 if(stage!=='structure'){
  // Sparse projecting corner stones, never a separate floating decorative skin.
  for(const y of [5,11,17]){box('building','stone',-20,y,14,3,1,1,1);box('building','stone',17,y+2,14,3,1,1,1);box('building','stone',20,y,10,1,1,3,1);}
  // Unequal book heights and thin volumes interrupt the repeated rectangle rhythm.
  for(const y of [6,12]){const row=y===6?'lower':'upper';box('books-'+row,'paper',-6,y,13,1,5,1,4);cut(-5,y,13,1,4,1);}
  for(const [id,x,z] of [['left',-25,16],['right',18,18]])for(const [dx,dz,y]of [[1,1,5],[3,2,6],[2,3,4]])box('herb-'+id,'leaf',x+dx-1,y,z+dz,2,1,1,4);
  // A modest lantern cap and frame instead of a solid light-coloured cube.
  box('lamp-head','tile',32,14,7,2,1,2,4);
  for(const x of [31,34])for(const z of [6,9])box('lamp-head','metal',x,8,z,1,5,1,4);
  box('lamp-head','metal',31,8,6,4,1,4,4);
 }
 if(!['structure','form'].includes(stage)){
  const h=(a,b,s=0)=>{const n=Math.sin(a*127.1+b*311.7+s*74.7)*43758.5453;return n-Math.floor(n);};
  for(const c of cells.values()){
   const {x,y,z,part}=c,row=Math.floor(y/2),wallU=Math.abs(z)>=12?x:z,t=h(Math.floor((wallU+(row%2)*2)/4),row,3);
   if(c.color==='masonry')c.color=t<.10?'masonryWarm':t<.28?'masonryLight':t<.46?'masonryDeep':t<.72?'masonryBlue':'masonry';
   if(c.color==='stone')c.color=t<.22?'stoneDeep':t>.79?'stoneLight':'stone';
   if(c.color==='tile'){
    if(part==='roof'){
     const side=Math.min((x+23)/2.65,(22-x)/2.65)<Math.min((z+17)/2,(16-z)/2),u=side?z+17:x+23,lane=u%5,course=Math.min(7,Math.floor(Math.min((x+23)/2.65,(22-x)/2.65,(z+17)/2,(16-z)/2))),tone=h(Math.floor(u/5),course,4);
     c.color=lane===4?'tileJoint':lane<2?(tone<.16?'tileWarm':tone>.7?'tileLight':'tile'):(tone<.16?'tileLight':tone>.7?'tile':'tileDeep');
    }else c.color='tileDeep';
   }
   if(c.color==='wood')c.color=h(part==='bench'?Math.floor(z/4):Math.floor(x/2),part==='shelf'?0:Math.floor(y/8),2)<.3?'woodLight':'wood';
   if(c.color==='glass')c.color=y>Y(14)?'glassDeep':(x%6===0?'glassLight':'glass');
   if(c.color==='paper'){const book=Math.floor((x+15)/3),idx=(book+(part==='books-upper'?2:0))%6;c.color=['paperCream','paperGreen','paperRed','paperBlue','paperCream','paperOchre'][idx];}
   if(c.color==='leaf')c.color=h(x,z,Math.floor(y/2))>.6?'leafLight':'leaf';
   if(c.color==='pot'&&y<2)c.color='potDeep';
   if(part==='lamp-post'||(part==='lamp-head'&&c.color==='metal'))c.color='woodDeep';
  }
 }
 const positioned=new Map();for(const c of cells.values()){if(!props.has(c.part))c.x-=3;positioned.set(`${c.x},${c.y},${c.z}`,c);}return positioned;
}
