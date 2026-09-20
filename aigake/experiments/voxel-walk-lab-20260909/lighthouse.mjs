import {Voxels,COLORS as C} from './voxels.mjs';
import {hash} from './model.mjs';

const radius=(x,z)=>Math.max(Math.abs(x),Math.abs(z),(Math.abs(x)+Math.abs(z))*.71);
export function lighthouseBlueprint(seed=1429){
  const v=new Voxels(seed),ring=(y,r,w,color,phase)=>{
    for(let x=-Math.ceil(r);x<=r;x++)for(let z=-Math.ceil(r);z<=r;z++)if(radius(x,z)<=r&&radius(x,z)>r-w)v.put(x,y,z,color,phase);
  };
  for(let y=0;y<=3;y++)ring(y,12-Math.floor(y/2),30,y===3?C.floor:C.stone,0);
  // The pier is built with the foundation, from the shore out to the water.
  v.box(9,1,7,39,2,14,C.woodLight,0);
  for(const x of [10,18,26,34,39])for(const z of [7,14])v.box(x,-2,z,x,1,z,C.wood,0);
  for(let z=10;z<=20;z++)v.box(-4,0,z,4,Math.max(0,3-Math.floor((z-10)/3)),z,C.stone,0);
  for(let y=4;y<=43;y++){
    const r=10-(y-4)*.065;
    for(let x=-10;x<=10;x++)for(let z=-10;z<=10;z++){
      const d=radius(x,z);if(d>r||d<r-1.1)continue;
      const frame=(Math.abs(x)<=1||Math.abs(z)<=1||Math.abs(Math.abs(x)-Math.abs(z))<=.5);
      const door=z>7&&Math.abs(x)<=2&&y<=12;
      const window=(z>5&&Math.abs(x)<=1||x>5&&Math.abs(z)<=1)&&[24,25,26,37,38,39].includes(y);
      if(door||window)continue;
      const stripe=(y>=16&&y<=20)||(y>=31&&y<=35);
      v.put(x,y,z,frame?C.wood:stripe?'#b8816e':hash(seed,x,y,z)>.8?'#e4d4b8':C.trim,frame?1:2);
    }
    if([4,15,30,43].includes(y))ring(y,r,1.4,C.woodLight,1);
  }
  // Match the structural posts to the finished tower bands.
  for(let y=4;y<=43;y++){
    const r=10-(y-4)*.065;
    for(let x=-10;x<=10;x++)for(let z=-10;z<=10;z++){
      const d=radius(x,z);if(d>r||d<r-1.1)continue;
      const key=`${x},${y},${z}`,c=v.cells.get(key);
      if(c?.phase===1)c.color=(y>=16&&y<=20)||(y>=31&&y<=35)?'#b8816e':C.trim;
    }
  }
  // Gallery, eight lantern posts, pale glass and a stepped copper cap.
  ring(44,10,30,C.stone,2);ring(45,10,2,C.trim,3);
  for(let y=46;y<=48;y++)for(let a=0;a<8;a++){
    const t=a*Math.PI/4,x=Math.round(Math.cos(t)*10),z=Math.round(Math.sin(t)*10);
    v.put(x,y,z,C.woodLight,3);
  }
  ring(48,10,1,C.woodLight,3);
  for(let y=45;y<=54;y++)for(let x=-6;x<=6;x++)for(let z=-6;z<=6;z++){
    const r=radius(x,z);if(r>6||r<5)continue;
    const post=Math.abs(x)<=.5||Math.abs(z)<=.5||Math.abs(Math.abs(x)-Math.abs(z))<=.5;
    v.put(x,y,z,post||y===45||y===54?C.dark:C.glass,post?1:3);
  }
  for(let y=55;y<=61;y++)ring(y,8-(y-55),30,y%2?'#628e8b':'#78a29a',2);
  v.box(0,62,0,0,64,0,C.woodLight,3);
  for(const [y,r] of [[24,9],[37,8]])for(const side of [false,true]){
    for(let dx=-2;dx<=2;dx++)for(let dy=-1;dy<=3;dy++)v.put(side?r:dx,y+dy,side?dx:r,Math.abs(dx)===2||dy===-1||dy===3?C.woodLight:C.glass,3,true);
  }
  v.box(-2,4,10,2,12,10,C.wood,3);v.box(-1,8,11,1,11,11,C.glass,3);v.put(2,7,11,C.light,3);
  // Low keeper's cottage gives the tall silhouette a sheltered, human scale.
  v.box(-26,0,-7,-10,2,9,C.stone,0);
  for(const x of [-25,-11])for(const z of [-6,8])v.box(x,3,z,x,14,z,C.wood,1);
  for(const y of [3,14]){v.box(-25,y,-6,-11,y,-6,C.woodLight,1);v.box(-25,y,8,-11,y,8,C.woodLight,1);}
  for(let y=3;y<=14;y++){
    v.box(-25,y,-6,-11,y,-6,C.wall,2);v.box(-25,y,-6,-25,y,8,C.wall,2);
    v.box(-11,y,-6,-11,y,8,C.wall,2);
    for(let x=-25;x<=-11;x++)if(!(x>=-21&&x<=-16&&y>=6&&y<=11))v.put(x,y,8,C.wall,2);
  }
  for(let x=-27;x<=-9;x++)for(let z=-8;z<=10;z++)v.box(x,15,z,x,16+Math.round((1-Math.abs(x+18)/10)*6),z,'#6f9296',2);
  for(let x=-21;x<=-16;x++)for(let y=6;y<=11;y++){v.put(x,y,8,C.glass,3);v.put(x,y,9,x===-21||x===-16||y===6||y===11?C.woodLight:C.glass,3);}
  v.box(-24,17,-3,-22,24,-1,C.wall,3);v.box(-25,25,-4,-21,25,0,C.stone,3);
  // Bollards and a life ring: these are construction finishes, not vegetation.
  for(const x of [18,28,38])v.box(x,3,14,x,5,14,C.dark,3);
  for(let a=0;a<18;a++){const t=a/18*Math.PI*2;v.put(31+Math.cos(t)*2,6+Math.sin(t)*2,15,a%6<3?C.trim:'#c5866e',3);}
  // A usable side entrance for the attached room, with two low approach steps.
  for(let z=-2;z<=2;z++)for(let y=3;y<=11;y++)v.put(-25,y,z,Math.abs(z)<2&&y>=7&&y<=10?C.glass:C.wood,3,true);
  v.box(-28,0,-4,-27,0,4,C.stone,0);v.box(-27,1,-3,-27,1,3,C.floor,0);
  const cells=v.list().map(c=>({...c,part:'building'})),phases=[0,1,2,3].map(p=>cells.filter(c=>c.phase===p));
  const bounds=cells.reduce((b,c)=>({min:b.min.map((v,i)=>Math.min(v,[c.x,c.y,c.z][i])),max:b.max.map((v,i)=>Math.max(v,[c.x,c.y,c.z][i]))}),{min:[Infinity,Infinity,Infinity],max:[-Infinity,-Infinity,-Infinity]});
  return{cells,phases,counts:phases.map(c=>c.length),bounds,landmark:true,landmarkKind:'lighthouse',audit:{entrances:[{"name":"tower entrance","x":0,"y":4,"z":11,"height":9,"access":"ground"},{"name":"side room entrance","x":-25,"y":3,"z":0,"height":9,"access":"ground","normal":[-1,0]}],rooms:[{name:'tower',seed:[0,6,0]},{name:'keeper-cottage',seed:[-18,6,0]},{name:'lantern-room',seed:[0,50,0]}],features:[{name:'striped tower and lantern'},{name:'keeper cottage and pier'}],openStructures:[{name:'gallery',reason:'灯室を囲む屋外の回廊'}]}};
}

export function harborGarden(level,seed=1429){
  const v=new Voxels(seed);
  if(level>=1){
    // A small moored sailboat, below the pier deck on the water surface.
    for(let y=-2;y<=0;y++)for(let x=28;x<=41;x++){
      const w=Math.min(3,Math.floor((x-27)/2),Math.floor((42-x)/2));
      v.box(x,y,20-w,x,y,20+w,y===0?C.woodLight:'#748f91');
    }
    v.box(34,1,20,34,17,20,C.wood);v.box(35,1,19,38,3,21,C.trim);
    for(let y=4;y<=16;y++)v.box(35,y,20,35+Math.floor((17-y)*.6),y,20,C.trim);
    v.line([34,1,20],[34,4,14],C.woodLight);v.put(34,18,20,'#bd8a72');
  }
  if(level>=2){
    for(const x of [-20,-12])for(const z of [18,20])v.box(x,0,z,x,3,z,C.wood);
    v.box(-20,4,18,-12,4,20,C.woodLight);v.box(-20,5,18,-12,7,18,C.woodLight);
    v.box(-17,5,19,-16,8,20,'#889b9c');v.box(-17,9,19,-16,10,20,'#d5ba96');
    v.box(-18,7,21,-15,7,21,C.trim);
  }
  if(level>=3){
    for(const x of [13,37])v.box(x,3,7,x,17,7,C.wood);
    for(let x=13;x<=37;x++){
      const y=15+Math.round(Math.abs(x-25)/6);v.put(x,y,7,C.woodLight);
      if(x%4<2)v.box(x,y-3,7,x,y-1,7,x%8<4?'#c8967d':'#8ea9a0');
    }
  }
  return v.list();
}
