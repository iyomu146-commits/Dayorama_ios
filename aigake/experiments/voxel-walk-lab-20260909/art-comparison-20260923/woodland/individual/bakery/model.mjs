export const CELL=.15;
export const PALETTE={clay:'#b9b5a5',brick:'#b87850',tile:'#a35d3c',plaster:'#e2d1aa',stone:'#c4bb9c',wood:'#997344',glass:'#4f7470',cloth:'#e1bf7c',bread:'#cf923f',leaf:'#64824a',metal:'#a1854e'};
Object.assign(PALETTE,{brickLight:'#c18556',brickRed:'#ae6746',brickDark:'#986044',tileLight:'#ae6844',tileWarm:'#b1764c',tileDark:'#88472f',plasterLight:'#e8d8b5',plasterWarm:'#d4c29a',stoneLight:'#d4c7a7',stoneDark:'#afa78a',woodLight:'#ac8350',woodDark:'#815e38',glassLight:'#769389',glassDark:'#3e625f',clothCream:'#eee0b7',breadLight:'#e6b35f',breadScore:'#f2dca0',breadCrust:'#ba782d',leafLight:'#83924a',leafDark:'#48663e'});
export function createBakeryBlockoutCells(){
 const cells=new Map();
 const box=(part,x,y,z,w,h,d)=>{for(let i=x;i<x+w;i++)for(let j=y;j<y+h;j++)for(let k=z;k<z+d;k++)cells.set(`${i},${j},${k}`,{x:i,y:j,z:k,color:'clay',part,phase:0});};
 box('building',-20,0,-14,40,22,28);
 for(let z=-14;z<14;z++){const top=23+Math.floor((16.5-Math.abs(z+.5))*.75);box('building',-20,22,z,40,Math.max(0,top-22),1);}
 for(let z=-17;z<17;z++){const top=23+Math.floor((16.5-Math.abs(z+.5))*.75);box('roof',-23,top,z,46,2,1);}
 box('wing',20,0,-10,10,17,22);
 for(let x=19;x<33;x++)box('wing-roof',x,20-Math.floor((x-19)/4),-12,1,2,26);
 box('chimney',1,30,-9,5,11,5);box('chimney-rim',0,40,-10,7,2,7);
 for(let z=14;z<22;z++)box('awning',-17,20-Math.floor((z-14)/3),z,35,1,1);
 box('stall-left',-18,0,19,14,9,8);box('stall-right',10,0,19,9,10,8);
 return cells;
}

export function createBakeryCells({stage='optimization'}={}){
 if(stage==='blockout')return createBakeryBlockoutCells();
 const formed=stage!=='structure',finished=formed&&stage!=='form',roofTop=z=>23+(formed?Math.round(Math.floor((16.5-Math.abs(z+.5))/3)*2.4):Math.floor((16.5-Math.abs(z+.5))*.75));
 const closedCourses=stage==='optimization'||stage==='roof-seams';
 const cells=new Map(),put=(part,color,x,y,z,phase=1)=>cells.set(`${x},${y},${z}`,{x,y,z,color,part,phase});
 const box=(part,color,x,y,z,w,h,d,phase=1)=>{for(let i=x;i<x+w;i++)for(let j=y;j<y+h;j++)for(let k=z;k<z+d;k++)put(part,color,i,j,k,phase);};
 const cut=(x,y,z,w,h,d)=>{for(let i=x;i<x+w;i++)for(let j=y;j<y+h;j++)for(let k=z;k<z+d;k++)cells.delete(`${i},${j},${k}`);};
 const shell=(part,color,x,y,z,w,h,d)=>{box(part,color,x,y,z,w,h,2);box(part,color,x,y,z+d-2,w,h,2);box(part,color,x,y,z,2,h,d);box(part,color,x+w-2,y,z,2,h,d);};
 box('plinth','stone',-20,0,-14,40,1,28,0);box('plinth','stone',20,0,-10,10,1,22,0);
 shell('building','brick',-20,1,-14,40,21,28);shell('wing','plaster',20,1,-10,10,16,22);
 box('wing','brick',20,1,10,10,4,2);box('wing','brick',28,1,-10,2,4,22);
 // Closed gables and a continuous two-cell roof backing; no hollow seams.
 for(let z=-17;z<17;z++){
  const top=roofTop(z),outside=z<0?z-1:z+1,bottom=finished?Math.min(top,roofTop(Math.max(-17,Math.min(16,outside)))+1):top-(formed?1:0);
  if(z>=-14&&z<14){box('gable','plaster',-20,22,z,2,bottom-22,1);box('gable','plaster',18,22,z,2,bottom-22,1);}
  box('roof','tile',-23,bottom,z,46,finished?top+2-bottom:formed?4:2,1,2);
 }
 box('ridge','tile',-23,formed&&!finished?38:37,-1,46,1,2,2);
 for(let x=19;x<33;x++){
  const top=20-Math.floor((x-19)/4);
  if(x>=20&&x<30){box('wing','plaster',x,17,-10,1,top-17,2);box('wing','plaster',x,17,10,1,top-17,2);}
  box('wing-roof','tile',x,top,-12,1,2,26,2);
 }
 box('fascia','plaster',-21,21,13,42,2,2,2);box('fascia','plaster',-21,21,-15,42,2,2,2);
 // Glazing is recessed a cell behind the perimeter. No central mullions.
 const window=(part,x,y,z,w,h)=>{cut(x,y,z-1,w,h,3);box(part,'wood',x,y,z,w,h,2,3);cut(x+1,y+1,z,w-2,h-2,2);box(part,'glass',x+1,y+1,z,w-2,h-2,1,3);};
 window('shop-left',-17,4,12,13,14);window('shop-right',8,4,12,9,14);
 cut(-2,1,12,9,18,3);box('door','wood',-2,1,12,9,18,3,3);cut(-1,2,14,7,16,1);box('door','glass',0,8,13,5,9,1,3);
 box('handle','metal',5,8,14,1,1,1,3);window('wing-window',23,6,10,5,8);
 cut(28,1,-5,3,14,8);box('wing-door','wood',28,1,-5,3,14,8,3);cut(30,2,-4,1,12,6);box('side-handle','metal',30,7,1,1,1,1,3);
 box('steps','stone',-3,0,14,12,1,6,0);
 // Striped canopy has a wall-mounted high edge and a low folded hem.
 for(let z=14;z<22;z++)box('awning','cloth',-17,20-Math.floor((z-14)/3),z,30,2,1,3);
 box('awning','cloth',-17,17,21,30,1,1,3);
 // Cavity is sealed below the roof and open above it; no solid chimney cap.
 box('chimney','brick',1,30,-9,5,11,5,2);cut(2,36,-8,3,7,3);
 box('chimney-rim','brick',0,40,-10,7,2,7,2);cut(2,40,-8,3,2,3);
 function bin(part,x,w,base){
  for(const i of [x,x+w-2])for(const z of [19,25])box(part,'wood',i,0,z,2,base+2,2,4);
  box(part,'wood',x,base,19,w,1,8,4);
  box(part,'wood',x,base+1,19,w,2,1,4);box(part,'wood',x,base+1,26,w,2,1,4);
  box(part,'wood',x,base+1,20,1,2,6,4);box(part,'wood',x+w-1,base+1,20,1,2,6,4);
 }
 bin('stall-left',-18,14,3);bin('stall-right',10,9,4);
 for(const x of [-17,-14,-11,-8])box('bread-left','bread',x,4,20,3,5,6,4);
 for(const x of [11,15])box('bread-right','bread',x,5,20,3,x===11?6:5,6,4);
 function planter(part,herb,x,z,w,d){
  box(part,'wood',x,0,z,w,4,d,4);cut(x+1,3,z+1,w-2,1,d-2);
  const cx=x+Math.floor(w/2),cz=z+Math.floor(d/2);
  box(herb,'leaf',cx,3,cz,1,7,1,4);box(herb,'leaf',cx-1,5,cz,3,2,1,4);box(herb,'leaf',cx,7,cz-1,1,2,3,4);
 }
 planter('pot-left','herb-left',-24,14,4,5);planter('pot-right','herb-right',22,17,8,7);
 if(stage==='structure')return cells;
 // Historical passes retain their raised lanes. The final roof fills those gutters:
 // adjacent tile bands share a top level, including the row just below the ridge.
 for(let x=-23;x<23;x++)for(let z=-17;z<17;z++){
  const lane=(x+23)%9,top=roofTop(z);
  if(closedCourses||(lane>0&&lane<8&&Math.abs(z)>1)){const y=top+(finished?2:3),key=`${x},${y},${z}`;if(!cells.has(key))put('roof','tile',x,y,z,2);}
 }
 // Distinct lean-to roof courses on the annex, with the same editable cell size.
 for(let x=closedCourses?19:20;x<(closedCourses?33:32);x++)for(let z=-12;z<14;z++)if(closedCourses||((x-20)%4<3&&(z+12)%7<6)){const y=22-Math.floor((x-19)/4);if(!cells.has(`${x},${y},${z}`))put('wing-roof','tile',x,y,z,2);}
 // Low timber front boards visually tie each bread bin to its four legs.
 box('stall-left','wood',-18,1,26,14,3,1,4);box('stall-right','wood',10,1,26,9,4,1,4);
 for(const [key,c] of cells)if(c.part.startsWith('bread-'))cells.delete(key);
 function loaf(part,x,y,z,height){
  for(let i=0;i<3;i++)for(let k=0;k<6;k++){
   const h=height-(i===1?0:1)-(k===0||k===5?1:0);
   box(part,'bread',x+i,y,z+k,1,h,1,4);
  }
 }
 for(const x of [-17,-14,-11,-8])loaf('bread-left',x,4,20,5);
 loaf('bread-right',11,5,20,6);loaf('bread-right',15,5,20,5);
 // A second rooted tuft makes the wider planter a cluster, not one oversized bush.
 box('herb-right','leaf',24,3,19,1,5,1,4);box('herb-right','leaf',23,5,19,3,2,1,4);
 for(let z=-13;z<13;z++){const top=roofTop(z);box('gable','wood',19,top-2,z,1,1,1,2);}
 if(stage==='form')return cells;
 // Colour variation follows building elements, not random single-voxel noise.
 const hash=(a,b,c=0)=>{let n=Math.imul(a,374761393)^Math.imul(b,668265263)^Math.imul(c,1442695041);n=Math.imul(n^(n>>>13),1274126177);return ((n^(n>>>16))>>>0)/4294967296;};
 for(const c of cells.values()){
  const {x,y,z,part}=c;let tone=c.color;
  if(tone==='brick'){
   const row=Math.floor(y/2),u=Math.abs(x)>=18?z:x,h=hash(Math.floor((u+(row%2)*2)/4),row,part==='chimney'?7:1);
   c.color=h<.18?'brickDark':h<.44?'brickRed':h>.76?'brickLight':'brick';
  }else if(tone==='tile'){
   const lane=Math.floor((x+23)/9),course=Math.floor((16.5-Math.abs(z+.5))/3),h=hash(lane,course,part==='wing-roof'?5:2);
   c.color=h<.20?'tileDark':h>.78?'tileWarm':h>.48?'tileLight':'tile';
   if(part==='ridge')c.color=Math.floor((x+23)/4)%4===1?'tileWarm':'tileLight';
  }else if(tone==='plaster')c.color=hash(Math.floor(x/5),Math.floor(y/3),Math.floor(z/4))>.7?'plasterLight':y<5?'plasterWarm':'plaster';
  else if(tone==='wood'){
   c.color=(part.startsWith('stall')||part.startsWith('pot'))?(y%3===1?'woodDark':y%3===0?'woodLight':'wood'):hash(Math.floor(x/3),0,Math.floor(z/3))>.7?'woodDark':'wood';
   if(part==='gable')c.color='woodDark';
  }else if(tone==='glass')c.color=(Math.floor(x/3)+Math.floor(y/3))%4===0?'glassLight':y>13?'glassDark':'glass';
  else if(tone==='cloth')c.color=Math.floor((x+17)/3)%2===0?'clothCream':'cloth';
  else if(tone==='bread'){
   const above=cells.get(`${x},${y+1},${z}`),top=!above||above.part!==part;
   c.color=top?'breadLight':y<(part==='bread-left'?6:7)?'breadCrust':'bread';
   const centre=part==='bread-left'?[-16,-13,-10,-7].includes(x):[12,16].includes(x);
   if(top&&centre&&(z===21||z===24))c.color='breadScore';
  }else if(tone==='leaf')c.color=y>7?'leafLight':hash(x,y,z)<.3?'leafDark':'leaf';
  else if(tone==='stone')c.color=hash(Math.floor(x/4),y,Math.floor(z/3))<.3?'stoneDark':'stoneLight';
 }
 return cells;
}
