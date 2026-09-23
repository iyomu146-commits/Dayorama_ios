// Cafe only. Dimensions are authored from references/crops/cafe.png.
// Shared infrastructure handles faces, never architectural design.
import {addArchitecturalFinish,FINISH_BEVEL} from './architectural-finish.mjs?v=grid5';
export const CELL=.15;
export function createCafeBlockoutCells(){
 const cells=new Map();
 function box(part,x0,y0,z0,w,h,d){for(let x=x0;x<x0+w;x++)for(let y=y0;y<y0+h;y++)for(let z=z0;z<z0+d;z++)cells.set(`${x},${y},${z}`,{x,y,z,part,color:'clay'});}
 // Current unlocked pass: blockout. No openings, tiles, palette or furniture yet.
 box('building',-17,0,-14,34,22,28);
 for(let z=-14;z<14;z++){
  const roofY=22+Math.floor((17-Math.abs(z+.5))*2/3);
  box('building',-17,22,z,34,Math.max(1,roofY-22),1);
 }
 for(let z=-18;z<18;z++){
  const top=22+Math.floor((17.5-Math.abs(z+.5))*2/3);
  box('roof',-20,top-1,z,40,3,1);
 }
 box('chimney',-13,29,-5,5,8,5);
 box('chimney',-14,37,-6,7,1,7);
 return cells;
}

export function createCafeCells({stage='structure',color=true}={}){
 if(stage==='blockout')return createCafeBlockoutCells();
 const map=new Map(),finishUnits=[];let activeUnit=null;
 function put(part,x,y,z,c,phase=2){const key=`${x},${y},${z}`;map.set(key,{x,y,z,part,color:color?c:'clay',phase,...(activeUnit?{finishUnit:activeUnit.id}:{})});activeUnit?.keys.add(key);}
 function unit(id,part,shape,build){activeUnit={id,part,shape,keys:new Set()};build();finishUnits.push({...activeUnit,keys:[...activeUnit.keys]});activeUnit=null;}
 function box(part,x,y,z,w,h,d,c,phase=2){for(let i=x;i<x+w;i++)for(let j=y;j<y+h;j++)for(let k=z;k<z+d;k++)put(part,i,j,k,typeof c==='function'?c(i,j,k):c,phase);}
 function cut(x,y,z,w,h,d){for(let i=x;i<x+w;i++)for(let j=y;j<y+h;j++)for(let k=z;k<z+d;k++)map.delete(`${i},${j},${k}`);}
 const brick=(x,y,z)=>['brick','brickWarm','brickLight','brick','brickDark','brickWarm'][((Math.floor((x+2*(y%2))/4)+Math.floor(z/4)+y)%6+6)%6];
 box('plinth',-17,0,-14,34,1,28,'stone',0);
 for(let y=1;y<4;y++)for(let x=-17;x<17;x++)for(let z=-14;z<14;z++)if(x<-15||x>14||z<-12||z>11)put('plinth',x,y,z,brick(x,y,z),0);
 // Hollow shell; frames/glass fill the openings, not a second wall behind them.
 for(let y=4;y<22;y++)for(let x=-17;x<17;x++)for(let z=-14;z<14;z++)if(x<-15||x>14||z<-12||z>11)put('walls',x,y,z,'plaster',1);
 for(let z=-14;z<14;z++){const y=22+2*Math.floor((17-Math.abs(z+.5))/3);box('gable',-17,22,z,2,Math.max(1,y-22),1,'plaster',1);box('gable',15,22,z,2,Math.max(1,y-22),1,'plaster',1);}
 // The sparse patches follow the crop, including the pier between window and door.
 for(const [x,y,w,h,c] of [[-17,6,2,3,'plasterWarm'],[-17,15,2,2,'plasterLight'],[3,5,2,2,'repairPink'],[3,9,2,1,'repair'],[3,12,2,2,'plasterWarm'],[3,16,2,2,'plasterLight'],[15,5,2,3,'repairPink'],[15,11,2,2,'plasterLight']])box('walls',x,y,13,w,h,1,c,1);
 for(const [z,y,d,h,c] of [[-11,5,3,2,'repairPink'],[9,5,4,3,'repairPink'],[9,9,2,1,'plasterWarm'],[8,13,3,2,'plasterLight'],[-12,17,2,2,'plasterWarm']])box('walls',16,y,z,1,h,d,c,1);
 cut(-13,6,12,15,12,3);cut(15,6,-7,3,12,13);cut(5,2,12,10,18,3);
 // Window centre panes are uninterrupted. No central structural mullions.
 box('front-window',-13,6,12,15,12,3,'ivory');
 box('front-window',-12,7,14,13,10,1,'wood');
 box('front-window',-11,8,13,11,8,1,(x,y)=>y<10+Math.floor((x+11)/4)?'glassMid':x<-8&&y>13?'glassPale':'glass');cut(-11,8,14,11,8,1);
 for(const [i,b] of [[-12,7,14,1,10,1],[0,7,14,1,10,1],[-11,7,14,11,1,1],[-11,16,14,11,1,1]].entries())unit(`front-frame-${i}`,'front-window',{box:b,color:'wood',bevel:FINISH_BEVEL},()=>box('front-window',...b,'wood'));
 unit('front-sill','front-window',{box:[-14,5,13,17,1,3],color:'ivory',bevel:FINISH_BEVEL},()=>box('front-window',-14,5,13,17,1,3,'ivory'));
 box('side-window',15,6,-7,3,12,13,'ivory');
 box('side-window',17,7,-6,1,10,11,'wood');
 box('side-window',16,8,-5,1,8,9,(_x,y,z)=>y<10+Math.floor((z+5)/4)?'glassMid':'glass');cut(17,8,-5,1,8,9);
 for(const [i,b] of [[17,7,-6,1,10,1],[17,7,4,1,10,1],[17,7,-5,1,1,9],[17,16,-5,1,1,9]].entries())unit(`side-frame-${i}`,'side-window',{box:b,color:'wood',bevel:FINISH_BEVEL},()=>box('side-window',...b,'wood'));
 unit('side-sill','side-window',{box:[16,5,-8,3,1,15],color:'ivory',bevel:FINISH_BEVEL},()=>box('side-window',16,5,-8,3,1,15,'ivory'));
 box('door',5,2,12,10,18,3,'woodDark');
 box('door',6,2,14,8,17,1,'wood');box('door',7,3,14,6,6,1,'woodPanel');
 box('door',7,10,13,6,8,1,'glass');cut(7,10,14,6,8,1);
 box('door',7,8,14,6,1,1,'woodLight');box('door',8,3,14,1,5,1,'woodLight');
 put('handle',13,9,15,'metal');
 // Eaves and front fabric share actual wall contact. Door top stays below fabric.
 for(let strip=0;strip<12;strip++){
  const x=-18+strip*3,c=strip%2?'ivory':'cloth';
  unit(`awning-${strip}`,'awning',{boxes:[[x,21,14,3,1,4],[x,20,18,3,2,3],[x,19,21,3,2,2]],color:c,bevel:FINISH_BEVEL},()=>{box('awning',x,21,14,3,1,4,c,3);box('awning',x,20,18,3,2,3,c,3);box('awning',x,19,21,3,2,2,c,3);});
 }
 box('steps',4,0,14,12,1,7,'stoneLight',0);box('steps',5,1,14,10,1,5,'stoneLight',0);
 // Closed roof underlay; a groove is one cell lower, never an open hole.
 for(let z=-18;z<18;z++){
  const course=Math.floor((17.5-Math.abs(z+.5))/3),y=22+course*2;
  box('roof',-20,y-1,z,40,2,1,'slateDark',3);
  box('fascia',-20,y-1,z,2,1,1,'woodDark',3);box('fascia',18,y-1,z,2,1,1,'wood',3);
  box('tiles',-20,y+1,z,40,1,1,'slate',3);
 }
 // Ten half-width lanes, six courses. Color families still follow the accepted crop.
 const tones=[['slate','slate2','slateMuted','slate','slate2','slate'],['slate','slateSage','slateSage2','slate2','slateSage','slate'],['slateMuted','slate','slate2','slateMuted','slate','slate2'],['slate','slate2','slateMuted','slate2','slate','slate'],['slate','slateSage2','slateSage','slate2','slateSage','slate']];
 for(const sign of [-1,1])for(let lane=0;lane<10;lane++)for(let row=0;row<6;row++){
  const x=-20+lane*4,z=sign>0?15-row*3:-18+row*3,y=23+row*2,c=tones[Math.floor(lane/2)][row];
  unit(`tile-${sign}-${lane}-${row}`,'tiles',{boxes:[[x,y,z,4,1,3],[x,y+1,z+(sign>0?1:0),4,1,2]],color:c,bevel:FINISH_BEVEL,tile:true},()=>{
  box('tiles',x,y,z,4,1,3,c,3);
  box('tiles',x,y+1,z+(sign>0?1:0),4,1,2,c,3);
  // Two- or three-cell patches stay within the tile; never per-cell random noise.
  const px=(lane+row)%3,pc=c.startsWith('slateSage')?'slateSagePatina':c==='slateMuted'?'slate':'slatePatina';
  box('tiles',x+px,y+1,z+(sign>0?1:0),1,1,2,pc,3);
  });
 }
 for(let i=0;i<10;i++){const c=i%3===1?'slateMuted':'slateEdge';unit(`ridge-${i}`,'ridge',{box:[-20+i*4,34,-1,4,2,2],color:c,bevel:FINISH_BEVEL},()=>box('ridge',-20+i*4,34,-1,4,2,2,c,3));}
 // Back of chimney is inferred; shaft starts within the roof support, cap has a real opening.
 box('chimney',-13,27,-11,5,10,5,(x,y,z)=>brick(x,y,z),3);
 box('chimney',-12,32,-10,3,1,3,'soot',3);cut(-12,33,-10,3,5,3);
 const cap=[[ -14,37,-12,7,1,2 ],[ -14,37,-7,7,1,2 ],[ -14,37,-10,2,1,3 ],[ -9,37,-10,2,1,3 ]];
 cap.forEach((b,i)=>unit(`cap-${i}`,'chimney',{box:b,color:'ivory',bevel:FINISH_BEVEL},()=>box('chimney',...b,'ivory',3)));
 // Individual paving stones. All loose objects stand on the same Y=1 surface.
 for(let x=19;x<40;x++)for(let z=-5;z<23;z++)if(!(x>35&&z>19)&&!(x<21&&z<-1))put('terrace',x,0,z,((Math.floor((x-19)/4)+Math.floor((z+5)/4))%4===0?'stoneLight':'stone'),0);
 unit('table-top','table',{box:[24,8,5,8,1,8],color:'wood',bevel:FINISH_BEVEL},()=>box('table',24,8,5,8,1,8,(x)=>x%3===0?'woodLight':'wood',4));
 for(const x of [24,30])for(const z of [5,11])box('table',x,1,z,1,7,1,'woodDark',4);
 box('table',24,7,5,8,1,1,'wood',4);box('table',24,7,12,8,1,1,'wood',4);
 function chair(id,z,back){for(const x of [25,30])for(const dz of [0,5])box(id,x,1,z+dz,1,4,1,'woodDark',4);box(id,25,5,z,6,1,6,'woodLight',4);box(id,25,6,back,1,5,1,'wood',4);box(id,30,6,back,1,5,1,'wood',4);box(id,25,9,back,6,2,1,'woodLight',4);}
 chair('chair-front',15,20);chair('chair-back',-4,-4);
 box('cup',27,9,8,2,2,2,'ivory',4);put('cup',28,10,9,'coffee',4);put('cup',29,9,8,'ivory',4);
 function pot(id,x,z,flower){
  box(id,x,0,z,4,1,4,'stoneLight',0);box(id,x,1,z,4,2,4,'pot',4);box(id,x,3,z,4,1,4,'potLight',4);box(id,x+1,3,z+1,2,1,2,'soil',4);
  for(const [dx,dz,h] of [[1,1,5],[2,2,7],[1,2,6]]){
   box(id,x+dx,4,z+dz,1,h-3,1,'leafDark',4);
   if(flower){for(const [a,b] of [[-1,0],[1,0],[0,-1],[0,1]])put(id,x+dx+a,h,z+dz+b,(dx+dz+a+b)%2?'pink':'pinkLight',4);put(id,x+dx,h,z+dz,'cream',4);}
   else{put(id,x+dx-1,h-1,z+dz,'leaf',4);put(id,x+dx+1,h-2,z+dz,'leafLight',4);put(id,x+dx,h,z+dz,'leafLight',4);}
  }
 }
 pot('plant-left',-22,17,false);pot('plant-front',17,18,true);pot('plant-right',36,4,false);
 // Removing/editing one cell invalidates that unit's decorative finish. The grid is authoritative.
 map.finishUnits=finishUnits.filter(u=>u.keys.every(k=>map.get(k)?.finishUnit===u.id)).map(u=>({...u,colors:u.keys.map(k=>map.get(k).color)}));
 addArchitecturalFinish(map);
 return map;
}
