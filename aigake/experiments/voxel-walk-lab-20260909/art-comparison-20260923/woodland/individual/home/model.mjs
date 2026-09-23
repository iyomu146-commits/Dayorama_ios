export const CELL=.15;
export function createHomeBlockoutCells(){
 const cells=new Map();
 const put=(part,x,y,z,color='clay')=>cells.set(`${x},${y},${z}`,{x,y,z,part,color});
 const box=(part,x,y,z,w,h,d,color)=>{for(let a=x;a<x+w;a++)for(let b=y;b<y+h;b++)for(let c=z;c<z+d;c++)put(part,a,b,c,color);};
 box('building',-20,0,-16,40,33,32);
 for(let z=-16;z<16;z++){const top=33+Math.floor((19-Math.abs(z+.5))*.75);box('building',-20,33,z,40,Math.max(1,top-33),1);}
 for(let z=-20;z<20;z++){const top=33+Math.floor((19.5-Math.abs(z+.5))*.75);box('roof',-23,top-1,z,46,3,1);}
 box('chimney',12,39,-10,5,14,5);box('chimney',11,52,-11,7,2,7);
 return cells;
}

export function createHomeCells({stage='structure'}={}){
 if(stage==='blockout')return createHomeBlockoutCells();
 const cells=new Map();
 const put=(part,x,y,z,color,phase=2)=>cells.set(`${x},${y},${z}`,{x,y,z,part,color,phase});
 const box=(part,x,y,z,w,h,d,color,phase=2)=>{for(let a=x;a<x+w;a++)for(let b=y;b<y+h;b++)for(let c=z;c<z+d;c++)put(part,a,b,c,typeof color==='function'?color(a,b,c):color,phase);};
 const cut=(x,y,z,w,h,d)=>{for(let a=x;a<x+w;a++)for(let b=y;b<y+h;b++)for(let c=z;c<z+d;c++)cells.delete(`${a},${b},${c}`);};
 box('plinth',-20,0,-16,40,2,32,'stone',0);
 // Actual two-cell walls. No hidden wall behind the window glass.
 for(let y=2;y<33;y++)for(let x=-20;x<20;x++)for(let z=-16;z<16;z++)if(x<-18||x>=18||z<-14||z>=14){const part=y<17?'lower-wall':y===17?'floor-band':'upper-wall';put(part,x,y,z,y<17?'sage':y===17?'stoneLight':'cream');}
 box('building',-18,17,-14,36,1,28,'wood',1);
 for(let z=-16;z<16;z++){const top=32+Math.floor((19.5-Math.abs(z+.5))*.75);box('gable',-20,33,z,2,Math.max(0,top-33),1,'cream');box('gable',18,33,z,2,Math.max(0,top-33),1,'cream');}
 // Deliberate grouped repairs: low frequency, quiet plaster fields between patches.
 if(stage!=='structure'){
  const fronts=[[-20,3,3,3,'sageStone'],[-18,10,3,2,'sageShade'],[-3,3,4,3,'sageLight'],[0,12,3,3,'sageStone'],[17,4,3,3,'sageStone'],[17,12,3,3,'sageLight'],[-20,21,3,3,'creamWarm'],[-17,29,3,2,'creamLight'],[-3,19,3,3,'creamWarm'],[-1,27,3,2,'creamShade'],[16,22,4,2,'creamLight'],[17,29,3,3,'creamWarm']];
  for(const [x,y,w,h,c] of fronts)box(y<17?'lower-wall':'upper-wall',x,y,15,w,h,1,c);
  for(const [z,y,d,h,c] of [[10,3,4,3,'sageStone'],[-14,11,3,3,'sageLight'],[9,10,3,2,'sageShade'],[-13,20,3,3,'creamWarm'],[10,27,4,2,'creamLight'],[-6,31,3,2,'creamWarm']])box(y<17?'lower-wall':'upper-wall',19,y,z,1,h,d,c);
 }
 function window(part,x,y,z,side=false){
  // Local horizontal u points along X at front, Z on the side.
  const b=(u,v,t,w,h,d,c)=>side?box(part,x+t,y+v,z+u,d,h,w,c):box(part,x+u,y+v,z+t,w,h,d,c);
  if(side)cut(x,y,z,4,10,10);else cut(x,y,z,10,10,4);
  const inset=stage==='structure'?2:1,span=10-inset*2;
  b(0,0,0,10,10,3,'ivory');if(stage==='structure')b(1,1,2,8,8,1,'woodDark');b(inset,inset,1,span,span,1,(_a,b)=>b<y+4?'glassLower':'glass');
  // Remove the face in front of the whole pane; leave perimeter only.
  if(side){cut(x+2,y+inset,z+inset,2,span,span);cut(x,y+inset,z+inset,1,span,span);}else{cut(x+inset,y+inset,z+2,span,span,2);cut(x+inset,y+inset,z,span,span,1);}
  b(-1,-1,1,12,1,3,'stoneLight');
 }
 window('front-low',-15,5,14);window('front-upper-left',-15,22,14);window('front-upper-right',4,22,14);
 window('right-low',18,5,-4,true);window('right-upper',18,22,-4,true);
 cut(4,2,14,10,14,4);box('door',4,2,14,10,14,3,'woodDark');box('door',5,2,16,8,13,1,'wood');
 // Vertical stiles and horizontal panel rails are single-cell structural detailing.
 if(stage!=='structure'){box('door',6,3,16,1,11,1,'woodLight');box('door',11,3,16,1,11,1,'woodLight');box('door',7,7,16,4,1,1,'woodDark');box('door',7,12,16,4,1,1,'woodDark');box('door',7,9,16,4,3,1,'woodShade');}
 box('door-handle',12,8,17,1,1,1,'metal',4);
 box('steps',3,0,16,12,1,10,'stone',0);box('steps',4,1,16,10,1,5,'stoneLight',0);
 // Porch roof rises at the wall, supported by timber returns at both sides.
 for(let z=15;z<23;z++){const top=19-Math.floor((z-15)/3);box('porch',2,top,z,14,2,1,'slate',3);box('porch',2,top-1,z,1,1,1,'wood',3);box('porch',15,top-1,z,1,1,1,'wood',3);}
 box('porch',3,16,16,1,2,3,'woodLight',3);box('porch',14,16,16,1,2,3,'woodLight',3);
 // Closed 3-cell deck follows each slope. No dark empty seams between tile lanes.
 for(let x=-23;x<23;x++)for(let z=-20;z<20;z++){
  const depth=19-Math.floor(Math.abs(z+.5)),top=33+Math.floor(depth*.75),lane=Math.floor((x+23)/4),row=Math.floor(depth/2);
  let color='slate';
  if(stage!=='structure'){
   color=['slate','slateLight','slate','slateCool'][((lane*3+row*5)%11)%4];
   if((lane===3||lane===4)&&[2,8].includes(row)||(lane===7||lane===8)&&row===5||lane===10&&row===3)color='slateRepair';
  }
  const offset=stage==='structure'?0:([2,3,7,8].includes(lane)&&depth<18?1:0),surface=33+Math.floor((depth+offset)*.75)+1;
  box('roof',x,top-1,z,1,surface-top+2,1,color,3);
 }
 // The side fascia is supported by the roof, and meets the gable wall.
 for(let z=-20;z<20;z++){const top=33+Math.floor((19.5-Math.abs(z+.5))*.75);box('roof',-23,top-1,z,2,1,1,'woodDark',3);box('roof',21,top-1,z,2,1,1,'wood',3);}
 box('ridge',-23,48,-1,46,1,2,'slateLight',3);box('ridge',-23,47,-2,46,1,4,'slate',3);
 box('chimney',12,39,-10,5,14,5,(x,y,z)=>stage==='structure'?'brick':['brick','brickWarm','brickDark','brick'][((Math.floor((x+y%2)/3)+Math.floor(z/3)+Math.floor(y/2))%4+4)%4],3);
 box('chimney-cap',11,52,-11,7,2,7,'stoneLight',3);cut(13,44,-9,3,11,3);
 function guard(part,start,side=false){
  const b=(u,y,t,w,h,d)=>side?box(part,19+t,y,start+u,d,h,w,'rail',4):box(part,start+u,y,15+t,w,h,d,'rail',4);
  b(0,21,3,12,1,1);b(0,24,3,12,1,1);
  for(const u of [0,4,7,11])b(u,22,3,1,2,1);
  // Two side returns join to the actual wall; no unsupported balcony slab.
  b(0,21,0,1,1,3);b(11,21,0,1,1,3);b(0,24,0,1,1,3);b(11,24,0,1,1,3);
 }
 guard('rail-left',-16);guard('rail-right',3);guard('rail-side',-5,true);
 return cells;
}

export const PALETTE={clay:'#b9b5a5',cream:'#e6d6b1',creamWarm:'#c7af80',creamLight:'#efdfbb',creamShade:'#d5c399',sage:'#91a078',sageLight:'#a7b18d',sageShade:'#7d9068',sageStone:'#b7b38b',stone:'#c6bb96',stoneLight:'#e0d3ad',ivory:'#e9dbb6',slate:'#426173',slateLight:'#526f80',slateCool:'#3a586c',slateRepair:'#8b938c',brick:'#ad6a43',brickWarm:'#be7b4d',brickDark:'#915536',wood:'#95703f',woodLight:'#b28c54',woodDark:'#755834',woodShade:'#80643e',rail:'#4e4b3e',glass:'#4a736d',glassLower:'#608277',metal:'#806333'};
