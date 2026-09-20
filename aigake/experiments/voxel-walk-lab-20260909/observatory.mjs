import {Voxels,COLORS as C} from './voxels.mjs';
import {hash} from './model.mjs';

// The dome shutters and telescope retain their construction coordinates. Only
// completed parts move; every construction cell keeps its final size.
export function observatoryBlueprint(seed=941){
  const v=new Voxels(seed),parts={};
  const ring=(cx,cz,y,r,width,color,phase)=>{
    for(let x=-Math.ceil(r);x<=r;x++)for(let z=-Math.ceil(r);z<=r;z++){
      const d=Math.hypot(x,z);if(d<=r+.35&&d>=r-width)v.put(cx+x,y,cz+z,color,phase);
    }
  };
  const disk=(cx,cz,y,r,color,phase)=>ring(cx,cz,y,r,r+1,color,phase);
  // A terraced stone plinth, entrance stair and paved star court.
  for(let y=0;y<=3;y++)disk(0,0,y,17-Math.floor(y/2),y===3?C.floor:C.stone,0);
  for(let z=14;z<=25;z++)v.box(-5,0,z,5,Math.max(0,3-Math.floor((z-14)/3)),z,C.stone,0);
  disk(0,26,0,10,C.floor,0);
  for(let a=0;a<8;a++){const t=a*Math.PI/4;v.line([0,0,26],[Math.round(Math.sin(t)*8),0,26+Math.round(Math.cos(t)*8)],a%2?C.trim:'#aa9980',0);}
  // Structural timber stays visible before the circular masonry closes in.
  for(let a=0;a<12;a++){
    const t=a*Math.PI/6,x=Math.round(Math.cos(t)*13),z=Math.round(Math.sin(t)*13);
    v.box(x,4,z,x,28,z,C.wood,1);
  }
  for(const y of [4,16,27,28])ring(0,0,y,13,1.2,C.woodLight,1);
  for(let y=5;y<=26;y++)for(let x=-14;x<=14;x++)for(let z=-14;z<=14;z++){
    const r=Math.hypot(x,z);if(r>13.4||r<12.0)continue;
    const door=z>10&&Math.abs(x)<=3&&y<=14-Math.max(0,Math.abs(x)-1);
    const window=((Math.abs(x)<=2&&z<-10)||(Math.abs(z)<=2&&Math.abs(x)>10)||(Math.abs(x-9)<=1&&z>7)||(Math.abs(x+9)<=1&&z>7))&&y>=18&&y<=23;
    if(door||window){v.put(x,y,z,door?C.wood:C.glass,3);continue;}
    v.put(x,y,z,y%7===0?'#d1bfa1':hash(seed,x,y,z)>.82?'#e2d0b2':C.wall,2);
  }
  for(const y of [5,15,26,28])ring(0,0,y,14,1.2,y===15?'#b4a084':C.trim,2);
  disk(0,0,27,12,C.woodLight,2);
  disk(0,0,28,14,C.woodLight,2);
  // Warm windows and the original pale, opaque glass blocks.
  for(const [x,z,side] of [[0,-14,false],[-14,0,true],[14,0,true],[-9,10,false],[9,10,false]]){
    for(let u=-2;u<=2;u++)for(let y=17;y<=24;y++){
      const edge=Math.abs(u)===2||y===17||y===24;
      v.put(x+(side?0:u),y,z+(side?u:0),edge?C.trim:u===0?C.woodLight:C.glass,3,true);
    }
  }
  v.box(-3,4,14,3,12,14,C.wood,3);v.box(-2,8,15,2,12,15,C.glass,3);
  v.box(0,4,16,0,13,16,C.woodLight,3);v.put(2,7,16,C.light,3);
  // A stepped copper dome; the central meridian is a pair of sliding shutters.
  for(let y=29;y<=43;y++){
    const r=15*Math.sqrt(Math.max(0,1-((y-29)/14.6)**2));
    for(let x=-16;x<=16;x++)for(let z=-16;z<=16;z++){
      const nextRadius=15*Math.sqrt(Math.max(0,1-((y+1-29)/14.6)**2));
      const d=Math.hypot(x,z);if(d>r+.3||d<Math.max(0,Math.min(r-1.5,nextRadius-.9)))continue;
      const shutter=Math.abs(x)<=4,part=shutter?(x<=0?'shutterLeft':'shutterRight'):null;
      const rib=x%7===0||z%7===0||y===29;
      v.put(x,y,z,rib?'#7eaaa0':y>38?'#80a99c':'#608d87',rib?1:2);
      if(part)parts[`${x},${y},${z}`]=part;
    }
  }
  for(let x=-3;x<=3;x++)for(let z=-3;z<=3;z++)if(Math.hypot(x,z)<=3.4){
    v.put(x,44,z,'#80a99c',2);parts[`${x},44,${z}`]=x<=0?'shutterLeft':'shutterRight';
  }
  for(const x of [-5,5])v.box(x,29,-15,x,29,15,'#b6a778',3);
  ring(0,0,28,16,2,'#b7a879',3);
  // A lower reading room, with its own little copper roof and book window.
  v.box(-28,0,-8,-13,2,10,C.stone,0);
  for(const x of [-27,-15])for(const z of [-7,9])v.box(x,3,z,x,15,z,C.wood,1);
  for(const y of [3,14]){v.box(-27,y,-7,-15,y,-7,C.woodLight,1);v.box(-27,y,9,-15,y,9,C.woodLight,1);}
  for(let y=3;y<=14;y++){
    v.box(-27,y,-7,-15,y,-7,C.wall,2);v.box(-27,y,-7,-27,y,9,C.wall,2);
    v.box(-15,y,-7,-15,y,9,C.wall,2);
    for(let x=-27;x<=-15;x++)if(!(x>=-24&&x<=-18&&y>=6&&y<=11))v.put(x,y,9,C.wall,2);
  }
  for(let x=-29;x<=-13;x++)for(let z=-9;z<=11;z++){
    const y=16+Math.round(7*(1-Math.abs(x+21)/9));v.box(x,15,z,x,y,z,'#719991',2);
    if(z%5===0)v.put(x,y+1,z,'#88aaa0',3);
  }
  for(let x=-24;x<=-18;x++)for(let y=6;y<=11;y++){v.put(x,y,9,C.glass,3);v.put(x,y,10,(x+24)%3===0||y===6||y===11?C.woodLight:C.glass,3);}
  v.box(-25,4,11,-17,5,12,C.woodLight,3);
  for(let x=-24;x<=-18;x++){v.put(x,6,12,C.leaf,3);if(x%2)v.put(x,7,12,C.flower,3);}
  // The observation terrace and a low brass railing.
  disk(20,7,0,7,C.stone,0);disk(20,7,1,6,C.floor,0);
  for(let i=0;i<8;i++){const t=i*Math.PI/4,x=20+Math.round(Math.sin(t)*6),z=7+Math.round(Math.cos(t)*6);v.box(x,2,z,x,5,z,C.woodLight,3);}
  ring(20,7,5,6,1,C.woodLight,3);
  for(let x=18;x<=22;x++)for(let y=2;y<=5;y++)for(let z=11;z<=14;z++)v.cells.delete(`${x},${y},${z}`);
  v.box(18,0,12,22,0,15,C.floor,0);
  for(const [x,z] of [[-7,21],[7,21],[-24,15]]){
    v.box(x,1,z,x,8,z,C.dark,3);v.box(x-1,8,z-1,x+1,10,z+1,C.light,3);v.box(x-2,11,z-2,x+2,11,z+2,'#698a7d',3);
  }
  // Telescope at the opening: cream barrel, brass collars, blue glass objective.
  v.box(-2,28,-2,2,31,2,C.stone,3);v.box(-1,32,-1,1,34,1,C.woodLight,3);
  const telescope=new Voxels(seed);
  for(let z=-4;z<=11;z++){
    const cy=35+Math.round(z*.5),radius=z>=9?3:2;
    for(let x=-radius;x<=radius;x++)for(let dy=-radius;dy<=radius;dy++){
      if(x*x+dy*dy>radius*radius+.8)continue;
      telescope.put(x,cy+dy,z,z===11?C.glass:[-4,-3,7,8,10].includes(z)?'#bda678':C.trim,3);
    }
  }
  telescope.box(-3,33,-1,3,35,1,'#9a9275',3);
  for(const c of telescope.list()){
    // Construction objects are authored without overlapping cells.
    v.put(c.x,c.y,c.z,c.color,c.phase,true);parts[`${c.x},${c.y},${c.z}`]='telescope';
  }
  // A usable side entrance for the attached room, with two low approach steps.
  for(let z=-2;z<=2;z++)for(let y=3;y<=11;y++)v.put(-27,y,z,Math.abs(z)<2&&y>=7&&y<=10?C.glass:C.wood,3,true);
  v.box(-30,0,-4,-29,0,4,C.stone,0);v.box(-29,1,-3,-29,1,3,C.floor,0);
  const cells=v.list().map(c=>({...c,part:parts[`${c.x},${c.y},${c.z}`]||'building'}));
  const phases=[0,1,2,3].map(p=>cells.filter(c=>c.phase===p));
  const bounds=cells.reduce((b,c)=>({min:b.min.map((v,i)=>Math.min(v,[c.x,c.y,c.z][i])),max:b.max.map((v,i)=>Math.max(v,[c.x,c.y,c.z][i]))}),{min:[Infinity,Infinity,Infinity],max:[-Infinity,-Infinity,-Infinity]});
  return{cells,phases,counts:phases.map(c=>c.length),bounds,landmark:true,audit:{entrances:[{name:"terrace entrance",x:20,y:2,z:10,height:9,access:"ground",open:true},{"name":"main entrance","x":0,"y":4,"z":16,"height":10,"access":"ground"},{"name":"side room entrance","x":-27,"y":3,"z":0,"height":9,"access":"ground","normal":[-1,0]}],rooms:[{name:'main-reading-room',seed:[0,6,0]},{name:'side-library',seed:[-21,7,0]},{name:'closed-observation-dome',seed:[8,32,0]}],features:[{name:'sliding dome shutters'},{name:'telescope and star court'}],openStructures:[]}};
}

export function observationGarden(level,seed=941){
  const v=new Voxels(seed);
  if(level>=1){
    // A small brass armillary sphere on the terrace.
    v.box(19,2,6,21,5,8,C.stone);v.box(20,6,7,20,9,7,C.woodLight);
    for(let i=0;i<50;i++){const a=i/50*Math.PI*2;v.put(20+Math.cos(a)*3,11+Math.sin(a)*3,7,'#c0aa79');v.put(20+Math.cos(a)*3,11,7+Math.sin(a)*3,'#c0aa79');}
  }
  if(level>=2){
    for(const x of [-15,-9])for(const z of [23,25])v.box(x,0,z,x,3,z,C.wood);
    v.box(-15,4,23,-9,4,25,C.woodLight);v.box(-15,5,23,-9,6,23,C.woodLight);
    v.box(-13,5,24,-12,7,25,'#8b9b93');v.box(-13,8,24,-12,9,25,'#d5ba96');
    v.box(-14,7,26,-11,7,26,C.trim);
  }
  if(level>=3){
    for(const x of [-8,8])for(let z=26;z<=32;z+=3){
      v.box(x-1,0,z-1,x+1,1,z+1,C.stone);v.box(x,2,z,x,4,z,C.leaf);
      v.put(x,5,z,'#e0d8b6');v.put(x-1,4,z,'#c0b2d1');v.put(x+1,4,z,'#c0b2d1');
    }
  }
  return v.list();
}
