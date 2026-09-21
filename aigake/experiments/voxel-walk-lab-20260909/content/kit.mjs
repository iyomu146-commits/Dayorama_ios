import {Voxels,COLORS} from '../voxels.mjs';
import {REGIONS} from './catalog.mjs';

export function workshop(region='grove',seed=41){
  const v=new Voxels(seed),theme=REGIONS[region],C={...COLORS,...theme},rooms=[],roofs=[],features=[],openStructures=[],entrances=[],furniture=[],buildings=[],ladders=[],awnings=[],signs=[],fittings=[],chimneys=[],flowerHeads=[];
  const box=(...a)=>v.box(...a),put=(...a)=>v.put(...a),line=(...a)=>v.line(...a);
  function paint(x0,y0,z0,x1,y1,z1,color,phase=3){for(let x=x0;x<=x1;x++)for(let y=y0;y<=y1;y++)for(let z=z0;z<=z1;z++)put(x,y,z,color,phase,true);}
  function ellipsoid(x,y,z,rx,ry,rz,color,phase=3){
    for(let a=-Math.ceil(rx);a<=rx;a++)for(let b=-Math.ceil(ry);b<=ry;b++)for(let c=-Math.ceil(rz);c<=rz;c++)if((a/rx)**2+(b/ry)**2+(c/rz)**2<=1.08)put(x+a,y+b,z+c,color,phase);
  }
  function disk(x,y,z,r,color,phase=3,metric='round',inner=-1){
    const distance=(a,b)=>metric==='hex'?Math.max(Math.abs(a),Math.abs(b)*.87+Math.abs(a)*.5):Math.hypot(a,b);
    for(let a=-Math.ceil(r);a<=r;a++)for(let b=-Math.ceil(r*1.2);b<=r*1.2;b++){const d=distance(a,b);if(d<=r+.25&&d>inner)put(x+a,y,z+b,color,phase);}
  }
  function roof(x,z,w,d,y,rise=8,shape='gable',color=C.roof,overhang=2){
    const hx=Math.floor(w/2)+overhang,hz=Math.floor(d/2)+overhang;
    roofs.push({x,z,hx,hz,y});
    for(let a=-hx;a<=hx;a++)for(let b=-hz;b<=hz;b++){
      const u=Math.abs(a)/hx,t=Math.abs(b)/hz;
      const lift=shape==='flat'?1:shape==='hip'?Math.min(1-u,1-t)*rise:shape==='shed'?(a+hx)/(2*hx)*rise:shape==='butterfly'?u*rise:shape==='gambrel'?(u<.55?1-u*.45:1.68-u*1.68)*rise:(1-u)*rise;
      // A solid roof volume closes stepped slopes and gable ends. Surface
      // meshing removes the hidden internal faces after completion.
      box(x+a,y,z+b,x+a,y+Math.max(1,Math.round(lift)),z+b,color,2);
    }
    return y+rise+1;
  }
  function window(x,y,z,w=5,h=6,side=false){
    const r=Math.floor(w/2);
    for(let a=-r;a<=r;a++)for(let b=0;b<h;b++)put(x+(side?0:a),y+b,z+(side?a:0),Math.abs(a)===r||b===0||b===h-1?C.trim:C.glass,3,true);
  }
  function house({x=0,z=0,w=23,d=17,h=15,y=0,rise=8,shape='gable',floors=1,color=C.wall,roofColor=C.roof,roofOverhang=2,door=true,doorOffset=0,windows=true,foundationMargin=1}={}){
    const hx=Math.floor(w/2),hz=Math.floor(d/2),top=y+h;
    box(x-hx-foundationMargin,y,z-hz-foundationMargin,x+hx+foundationMargin,y+1,z+hz+foundationMargin,C.stone,y>0?1:0);
    for(const a of [-hx,hx])for(const b of [-hz,hz])box(x+a,y+2,z+b,x+a,top-1,z+b,C.wood,1);
    for(const yy of [y+2,top-1]){box(x-hx,yy,z-hz,x+hx,yy,z-hz,C.wood,1);box(x-hx,yy,z+hz,x+hx,yy,z+hz,C.wood,1);box(x-hx,yy,z-hz,x-hx,yy,z+hz,C.wood,1);box(x+hx,yy,z-hz,x+hx,yy,z+hz,C.wood,1);}
    for(const a of [-hx,hx])box(x+a,y+2,z-hz,x+a,top-1,z+hz,color,2);
    for(const b of [-hz,hz])box(x-hx,y+2,z+b,x+hx,top-1,z+b,color,2);
    for(let f=1;f<floors;f++){const yy=y+Math.floor(h*f/floors);box(x-hx,yy,z-hz,x+hx,yy,z+hz,C.woodLight,1);}
    roof(x,z,w,d,top,rise,shape,roofColor,roofOverhang);
    if(door){doorway(x+doorOffset,y+2,z+hz,Math.min(9,h-2));box(x+doorOffset-4,y,z+hz+1,x+doorOffset+4,y,z+hz+(y>0?1:4),C.floor,y>0?1:0);}
    if(windows)for(let f=0;f<floors;f++){
      const yy=y+4+Math.floor(h*f/floors);
      if(yy+6>=top)continue;
      window(x,yy,z-hz);window(x+hx,yy,z,5,6,true);window(x-hx,yy,z,5,6,true);
      if(hx>=10)for(const a of [-Math.round(hx*.65),Math.round(hx*.65)])window(x+a,yy,z+hz,3,6);
    }
    for(let f=0;f<floors;f++)rooms.push({name:'room-'+rooms.length,seed:[x,y+3+Math.floor(h*f/floors),z],bounds:{min:[x-hx,y+1,z-hz],max:[x+hx,top,z+hz]}});
    buildings.push({x,z,hx,hz,y,top});return{x,z,hx,hz,top,peak:top+rise+1,front:z+hz,y};
  }
  function roundHouse({x=0,z=0,r=8,h=18,y=0,rise=8,cap='cone',color=C.wall,roofColor=C.roof,metric='round',door=true,windows=true}={}){
    disk(x,y,z,r+1,C.stone,0,metric);disk(x,y+1,z,r,C.floor,0,metric);
    for(let yy=y+2;yy<y+h;yy++)disk(x,yy,z,r,color,[y+2,y+h-1].includes(yy)?1:2,metric,r-1.6);
    for(let yy=0;yy<=rise;yy++){
      const rr=cap==='mushroom'?(r+5)*Math.sqrt(Math.max(.025,1-(yy/(rise+.3))**2)):cap==='dome'?(r+1)*Math.sqrt(Math.max(.015,1-(yy/(rise+.4))**2)):r+2-(r+1)*yy/rise;
      disk(x,y+h+yy,z,rr,roofColor,2,metric);
    }
    for(const [a,b] of [[r,0],[-r,0],[0,r],[0,-r]])box(x+a,y+2,z+b,x+a,y+h-1,z+b,C.wood,1);
    if(door)doorway(x,y+2,z+(metric==='hex'?Math.floor(r/.87):r),Math.min(8,h-2));if(windows)window(x+r,y+7,z,3,5,true);
    rooms.push({name:'round-'+rooms.length,seed:[x,y+3,z],bounds:{min:[x-r,y+1,z-r],max:[x+r,y+h,z+r]}});
    buildings.push({x,z,hx:r,hz:r,y,top:y+h});return{x,z,r,top:y+h,peak:y+h+rise,front:z+r,y};
  }
  function hall({x=0,z=0,w=29,d=17,h=17,y=0,rise=6,shape='hip'}={}){
    const hx=Math.floor(w/2),hz=Math.floor(d/2);box(x-hx-1,y,z-hz-1,x+hx+1,y+1,z+hz+1,C.floor,y>0?1:0);
    if(y===0)box(x-hx-2,0,z-hz-2,x+hx+2,0,z+hz+2,C.floor,0);
    for(const a of [-hx,hx])for(const b of [-hz,hz])box(x+a,y+2,z+b,x+a,y+h,z+b,C.wood,1);
    roof(x,z,w,d,y+h,rise,shape);openStructures.push({name:'open-hall',reason:'柱で支えた開放構造'});return{x,z,hx,hz,top:y+h,front:z+hz,y};
  }
  function stairs(x,z,width,rise,length){
    for(let i=0;i<length;i++){
      const top=Math.max(0,Math.floor(rise*(length-1-i)/(length-1))),r=Math.floor(width/2);
      box(x-r,0,z+i,x+r,top,z+i,C.woodLight,0);paint(x-r,top,z+i,x+r,top,z+i,C.woodLight,0);
      // Leave the landing open for a turn into a side entrance.
      if(rise>=6&&i>=2)for(const xx of [x-r,x+r]){box(xx,top+4,z+i,xx,top+5,z+i,C.woodLight,3);if(i%3===2||i===length-1)box(xx,top+1,z+i,xx,top+3,z+i,C.wood,3);}
    }
  }
  function chimney(x,z,base,top,width=3){chimneys.push({x:x+(width-1)/2,z:z+(width-1)/2,top:top+2.5,width});box(x,base,z,x+width-1,top,z+width-1,C.stone,2);box(x-1,top+1,z-1,x+width,top+2,z+width,C.trim,3);}
  // Identity comes from usable architectural elements at the building's scale.
  // Small fittings sit at hand/door height; roofs do not carry enlarged goods.
  function awning({x=0,z=10,w=17,depth=5,y=12,color=C.roof,posts=true}={}){
    awnings.push({x,y,z,w,depth,posts});
    const r=Math.floor(w/2);for(let dz=0;dz<=depth;dz++)box(x-r,y+Math.round((depth-dz)*.3),z+dz,x+r,y+Math.round((depth-dz)*.3),z+dz,color,2);
    box(x-r,y-1,z+depth,x+r,y-1,z+depth,C.woodLight,1);
    if(posts)for(const xx of [x-r,x+r])box(xx,0,z+depth,xx,y-1,z+depth,C.wood,1);
  }
  function sign(x,y,z,w=5,h=3){signs.push({x,y,z,w,h});box(x-Math.floor(w/2),y,z,x+Math.floor(w/2),y+h-1,z,C.wood,3);box(x-Math.floor(w/2)+1,y+1,z+1,x+Math.floor(w/2)-1,y+h-2,z+1,C.trim,3);}
  function shutters(x,y,z,w=5,h=6){window(x,y,z,w,h);for(const side of [-1,1]){const xx=x+side*(Math.floor(w/2)+1);box(Math.min(xx,xx+side),y,z+1,Math.max(xx,xx+side),y+h-1,z+1,C.woodLight,3);}}
  function feature(name,draw){const before=new Set(v.cells.keys());draw();features.push({name,cells:[...v.cells.keys()].filter(k=>!before.has(k)).length});}
  function fitting(name,draw){
    const original=v.put,points=new Map();
    v.put=function(x,y,z,...rest){const p=[x,y,z].map(Math.round);points.set(p.join(','),p);return original.call(v,x,y,z,...rest);};
    try{draw();}finally{v.put=original;}
    fittings.push({name,cells:[...points.values()]});
  }
  function opening(name,reason,geometry={}){openStructures.push({name,reason,...geometry});}
  function book(x,y,z,w=9){
    // Open pages stay one voxel thick; the spine is a crease, not a tall box.
    const r=Math.max(2,Math.floor(w/2)),depth=2;
    box(x-r,y,z,x+r,y,z+depth,C.accent,3);
    for(let a=-r;a<=r;a++)if(a!==0)box(x+a,y+1,z,x+a,y+1,z+depth,C.trim,3);
  }
  function shelf(x,y,z,w=11,h=10){
    box(x,y,z,x+1,y+h,z+3,C.wood,3);box(x+w-1,y,z,x+w,y+h,z+3,C.wood,3);
    for(let b=0;b<=h;b+=5){box(x,y+b,z,x+w,y+b,z+3,C.woodLight,3);if(b<h)for(let a=2;a<w-1;a+=2)box(x+a,y+b+1,z+1,x+a,y+b+3,z+3,['#ba8b75','#8ba19b','#c5b282'][(a/2)%3],3);}
  }
  function pot(x,y,z,r=3,h=5,color=C.accent){for(let b=0;b<h;b++)disk(x,y+b,z,r-(b===0?1:0),color,3);disk(x,y+h,z,r+.6,C.woodLight,3,'round',r-1);}
  // y is the lowest leg cell. Four distinct feet support both front and rear
  // edges; a nearby wall or another leg cannot count as floor support.
  function bench(x,y,z,w=11,turn=0,{seat=3}={}){
    const back=z+(turn===2?2:0);box(x,y+seat,z,x+w,y+seat,z+2,C.woodLight,3);box(x,y+seat+1,back,x+w,y+seat+3,back,C.woodLight,3);
    const feet=[];for(const a of [0,w])for(const b of [0,2]){box(x+a,y,z+b,x+a,y+seat-1,z+b,C.wood,3);feet.push([x+a,y,z+b]);}
    furniture.push({name:'bench',feet,seat:y+seat,center:[x+w/2,y+seat+.5,z+1],turn});
  }
  function chair(x,y,z,turn=0,{seat=3}={}){
    const point=(a,b)=>turn===1?[x-b,z+a]:turn===2?[x-a,z-b]:turn===3?[x+b,z-a]:[x+a,z+b];
    const cell=(a,h,b,c)=>{const[xx,zz]=point(a,b);put(xx,y+h,zz,c,3);};
    for(let a=-2;a<=2;a++)for(let b=-2;b<=2;b++)cell(a,seat,b,C.woodLight);
    for(let a=-2;a<=2;a++)for(let h=seat+1;h<=seat+4;h++)cell(a,h,-2,C.woodLight);
    const feet=[];for(const a of [-2,2])for(const b of [-2,2]){for(let h=0;h<seat;h++)cell(a,h,b,C.wood);const[xx,zz]=point(a,b);feet.push([xx,y,zz]);}
    furniture.push({name:'chair',feet,seat:y+seat,center:[x,y+seat+.5,z],turn});
  }
  function table(x,y,z,w=7,d=7,{height=6}={}){
    const hx=Math.floor(w/2),hz=Math.floor(d/2),feet=[];box(x-hx,y+height,z-hz,x+hx,y+height,z+hz,C.woodLight,3);
    for(const a of [-hx+1,hx-1])for(const b of [-hz+1,hz-1]){box(x+a,y,z+b,x+a,y+height-1,z+b,C.wood,3);feet.push([x+a,y,z+b]);}
    furniture.push({name:'table',feet,top:y+height});
  }
  function doorway(x,y,z,height=9,{access='ground',name='entrance'}={}){
    paint(x-2,y,z,x+2,y+height-1,z,C.wood,3);paint(x-1,y+Math.max(2,height-5),z,x+1,y+height-2,z,C.glass,3);put(x+2,y+3,z+1,C.light,3,true);
    entrances.push({name,x,y,z,height,access});
  }
  function threshold(x,y,z,height=9){const old=entrances.find(e=>e.access==='ground'&&Math.abs(e.x-x)<=1&&Math.abs(e.y-y)<=1&&Math.abs(e.z-z)<=4);if(old)Object.assign(old,{x,y,z,height});else entrances.push({name:'entrance',x,y,z,height,access:'ground'});}
  function accessPoint(x,y,z,name='open entrance'){entrances.push({name,x,y,z,height:9,access:'ground',open:true});}
  function sideDoor(x,y,z,normal=1,height=9){
    for(let a=-2;a<=2;a++)for(let h=0;h<height;h++)put(x,y+h,z+a,Math.abs(a)<2&&h>3&&h<height-1?C.glass:C.wood,3,true);
    put(x+normal,y+3,z+2,C.light,3,true);entrances.push({name:'side entrance',x,y,z,height,access:'ground',normal:[normal,0]});
  }
  function clearBox(x0,y0,z0,x1,y1,z1){for(let x=x0;x<=x1;x++)for(let y=y0;y<=y1;y++)for(let z=z0;z<=z1;z++)v.cells.delete(`${x},${y},${z}`);}
  function accessLadder(x,z,deck){
    const rungs=[];for(const xx of [x-2,x+2])box(xx,0,z,xx,deck+4,z,C.wood,1);
    for(let y=2;y<=deck;y+=2){box(x-2,y,z,x+2,y,z,C.woodLight,3);rungs.push([x-2,y,z,x+2]);}
    ladders.push({name:'access ladder',base:[x,0,z+3],top:[x,deck+1,z-2],rungs});
  }
  function flower(x,y,z,color=C.flower,height=5,{stamen='#e6b63e',pistil='#97643a',leaf=C.leaf,phase=3}={}){
    const head=y+height+1;
    flowerHeads.push({x,y:head+1.5,z});
    box(x,y,z,x,head-1,z,leaf,phase);
    put(x+1,y+1,z,leaf,phase);if(height>2)put(x-1,y+2,z,leaf,phase);
    // Four rounded petal lobes, rather than a solid ellipsoid. The centre
    // connects every petal to the stem, and the raised pistil stays visible.
    for(let a=-2;a<=2;a++)for(let b=-2;b<=2;b++)if(Math.abs(a)+Math.abs(b)<4)put(x+a,head,z+b,color,phase);
    for(const [a,b]of [[-1,0],[1,0],[0,-1],[0,1]])put(x+a,head,z+b,stamen,phase,true);
    put(x,head,z,pistil,phase,true);put(x,head+1,z,pistil,phase);
  }
  function finish(id){
    const cells=v.list(),phases=[0,1,2,3].map(p=>cells.filter(c=>c.phase===p));
    const bounds=cells.reduce((b,c)=>({min:b.min.map((n,i)=>Math.min(n,[c.x,c.y,c.z][i])),max:b.max.map((n,i)=>Math.max(n,[c.x,c.y,c.z][i]))}),{min:[Infinity,Infinity,Infinity],max:[-Infinity,-Infinity,-Infinity]});
    return{id,cells,phases,counts:phases.map(p=>p.length),bounds,audit:{rooms,roofs,features,openStructures,entrances,furniture,buildings,ladders,awnings,signs,fittings,chimneys,flowerHeads}};
  }
  return{v,C,box,put,line,paint,ellipsoid,disk,roof,window,house,roundHouse,hall,stairs,chimney,awning,sign,shutters,feature,fitting,opening,book,shelf,pot,bench,chair,table,doorway,threshold,accessPoint,sideDoor,clearBox,accessLadder,flower,finish};
}
