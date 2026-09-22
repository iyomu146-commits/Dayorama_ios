import {workshop} from './kit.mjs';
import {REGIONS} from './catalog.mjs';
import {hash} from '../model.mjs';
import {flowerBlueprint} from './flowers.mjs';

export function extraPlant(kind,seed){
  const flower=flowerBlueprint(kind,seed);if(flower)return flower;
  const k=workshop('grove',seed),{box,put,line,disk,ellipsoid}=k,g='#8c9f7e',light='#acb792';
  const stem=(h=7)=>box(0,0,0,0,h,0,g,0);
  if(['wheat','susuki','silver-grass'].includes(kind)){
    for(const [x,z,h]of [[-2,0,8],[1,1,11],[3,-1,7]]){line([0,0,0],[x,h,z],kind==='wheat'?'#b6ad79':g,0);const c=kind==='wheat'?'#c6b67d':kind==='susuki'?'#c9c4a6':'#d1d6c5';for(let y=h-3;y<=h+1;y++)box(x-(y%2?1:0),y,z,x+1,y,z,c,0);}
  }else if(['juniper','winter-berry'].includes(kind)){
    const h=kind==='juniper'?5:7;
    for(const [x,z]of [[-3,-1],[2,-2],[0,3]]){line([0,0,0],[x,h,z],g,0);ellipsoid(x,3,z,2,2,2,kind==='juniper'?'#94aaa0':g,0);if(kind==='juniper'){put(x,h,z,'#839bab',0);}else{for(const dx of [-1,1])ellipsoid(x+dx,h,z,1,1,1,'#b98979',0);}}
  }else if(['moss','lichen'].includes(kind)){
    for(const [x,z,r]of [[-2,-1,3],[2,0,2],[0,3,2]])ellipsoid(x,0,z,r,kind==='moss'?1.5:.7,r,kind==='moss'?'#9daa7d':'#c0c6ad',0);
  }else if(kind==='cactus'){
    box(-1,0,-1,1,10,1,'#91aa94',0);for(const [s,h]of [[-1,5],[1,7]]){line([0,h,0],[s*4,h,0],g,0,2);box(s*4,h,0,s*4,h+4,0,g,0);}put(0,11,0,'#c8b094',0);
  }else if(kind==='aloe'){
    disk(0,0,0,2,g,0);for(let i=0;i<7;i++){const a=i*Math.PI*2/7;line([0,1,0],[Math.round(Math.cos(a)*5),6,Math.round(Math.sin(a)*5)],light,0,2);}stem(7);
  }else if(kind==='banana'){
    box(0,0,0,1,12,1,'#a7b290',0);for(const [x,z,h]of [[-6,0,11],[7,0,12],[0,-6,13],[0,6,10]]){line([0,10,0],[x,h,z],g,0,2);ellipsoid(x*.6,h,z*.6,Math.abs(x)>0?4:2,1,Math.abs(z)>0?4:2,light,0);}box(2,7,1,3,10,2,'#c4bf89',0);
  }else if(kind==='monstera'){
    stem(7);for(const [x,z,h]of [[-3,0,4],[3,1,6],[0,-3,8]]){line([0,2,0],[x,h,z],g,0);for(let a=-2;a<=2;a++)for(let b=-2;b<=2;b++)if(a*a+b*b<7&&!(a===0&&Math.abs(b)===2))put(x+a,h,z+b,light,0);}
  }else throw Error('Plant not authored: '+kind);
  return k.v.list();
}

export function extraTree(region,seed=41,type=null){
  const profile=REGIONS[region],kind=type||profile.trees[Math.floor(hash(seed,31)*profile.trees.length)],k=workshop(region,seed),{C,box,put,line,disk,ellipsoid}=k;
  const h=25+Math.floor(hash(seed,81)*6);
  if(['ginkgo','zelkova'].includes(kind)){
    const top=15+Math.floor(hash(seed,81)*3);
    box(0,0,0,1,top,1,'#918974',0);
    for(const [x,y,z,r]of [[-3,top-2,0,5],[3,top+1,0,5],[0,top+4,-2,5]]){
      line([0,9,0],[x,y,z],'#918974',0);
      ellipsoid(x,y,z,r,kind==='ginkgo'?4:3,r,kind==='ginkgo'?'#b2bd88':'#93ad91',0);
    }
  }else if(['spruce','snow-fir'].includes(kind)){
    box(0,0,0,1,h+7,1,C.wood,0);for(const [y,r]of [[11,10],[18,8],[25,6]])for(let j=0;j<11;j++)disk(0,y+j,0,Math.max(0,r*(1-j/11)),kind==='snow-fir'&&j%3!==0?'#d8dfd2':'#91a694',0);
  }else if(['date-palm','palm'].includes(kind)){
    line([0,0,0],[4,h,0],C.wood,0,2);for(let i=0;i<7;i++){const a=i*Math.PI*2/7;for(let j=0;j<=12;j++){const x=4+Math.round(Math.cos(a)*j),z=Math.round(Math.sin(a)*j),y=h+3-Math.round(((j-3)/4)**2);box(x,y,z,x+1,y+1,z+1,'#9fb18e',0);}}for(const z of [-2,2])ellipsoid(4,h-2,z,2,2,2,kind==='date-palm'?C.accent:C.woodLight,0);
  }else if(kind==='mangrove'){
    for(const [x,z]of [[-9,0],[8,-3],[0,8],[0,-8]])line([x,0,z],[0,12,0],C.wood,0,2);box(-1,10,-1,1,h,1,C.wood,0);ellipsoid(0,h,0,12,6,10,'#95afa0',0);ellipsoid(5,h+5,-3,8,5,8,'#a8ba9e',0);
  }else if(kind==='bamboo'){
    for(const [x,z,hh]of [[-5,0,h],[0,2,h+8],[5,-1,h+3]]){box(x,0,z,x+1,hh,z+1,'#9eb18c',0);for(let y=5;y<hh;y+=5){box(x-1,y,z-1,x+1,y,z+1,'#bdc7a2',0);line([x,y,z],[x+5,y+3,z], '#9eb18c',0);ellipsoid(x+4,y+4,z,4,1,2,'#aebd98',0);}}
  }else if(kind==='poplar'){
    box(0,0,0,1,h+5,1,C.wood,0);ellipsoid(0,h-1,0,5,17,5,'#b5c092',0);
  }else{
    const birch=kind==='silver-birch',color=kind==='cherry'?'#d3b7b4':kind==='maple'?'#bcab89':kind==='apple'?'#a9b68a':'#c0c6ac';box(0,0,0,1,h,1,birch?'#deded0':C.wood,0);
    for(const [x,y,z,r]of [[-6,h-4,0,7],[5,h+1,1,8],[0,h+7,-3,7]]){line([0,12,0],[x,y,z],birch?'#c7c9b8':C.wood,0,2);ellipsoid(x,y,z,r,kind==='maple'?4:6,r,color,0);}
    if(kind==='apple')for(const [x,y,z]of [[-7,h-7,4],[7,h-2,5],[1,h+4,3]])ellipsoid(x,y,z,1.5,1.5,1.5,'#c7937b',0);
    if(birch)for(let y=4;y<22;y+=5)put(0,y,1,'#89958a',0,true);
  }
  return k.v.list();
}

export function extraProp(kind,seed=41){
  const region=Object.keys(REGIONS).find(r=>REGIONS[r].props.includes(kind));if(!region)throw Error(kind);
  const k=workshop(region,seed),{C,box,put,line,disk,ellipsoid,bench,pot}=k;
  if(kind==='hay-bale'){box(-5,0,-3,5,5,3,'#c8b782',0);for(const x of [-3,3])box(x,6,-3,x,6,3,C.wood,0);}
  else if(kind==='milk-can'){for(let y=0;y<7;y++)disk(0,y,0,y<5?3:2,C.trim,0);disk(0,7,0,3,C.roof,0);box(-4,3,0,4,4,0,C.woodLight,0);}
  else if(['fence','bamboo-fence'].includes(kind)){for(const x of [-6,0,6])box(x,0,0,x,7,0,kind==='fence'?C.woodLight:'#a1b391',0);for(const y of [3,6])box(-7,y,0,7,y,0,C.wood,0);if(kind==='bamboo-fence')for(let x=-6;x<7;x+=2)line([x,1,0],[x+2,7,0],C.woodLight,0);}
  else if(kind==='trail-sign'){box(0,0,0,0,13,0,C.wood,0);box(-5,9,0,4,11,0,C.woodLight,0);put(5,10,0,C.woodLight,0);box(-4,5,0,6,7,0,C.trim,0);}
  else if(['stone-bench','moon-bench','woven-seat'].includes(kind)){bench(-6,0,0,12);if(kind==='stone-bench')box(-6,3,-1,6,4,2,C.stone,0);if(kind==='moon-bench')for(let x=-6;x<=6;x++)box(x,6,0,x,6+Math.round(3*(1-(x/6)**2)),0,C.trim,0);if(kind==='woven-seat')for(let x=-6;x<=6;x+=2)box(x,4,0,x,4,3,C.accent,0);}
  else if(['log-stack','firewood'].includes(kind)){for(const [x,y]of [[-3,1],[1,1],[-1,4]]){box(x,y,-4,x+2,y+2,4,C.wood,0);box(x,y,5,x+2,y+2,5,C.woodLight,0);}box(-4,0,-4,4,0,4,C.woodLight,0);if(kind==='firewood')box(-4,7,-4,4,7,5,C.trim,0);}
  else if(['stone-lantern','snow-lantern','star-lamp'].includes(kind)){const h=kind==='star-lamp'?14:kind==='stone-lantern'?8:2;disk(0,0,0,3,C.stone,0);box(0,1,0,0,h,0,C.stone,0);box(-2,h+1,-2,2,h+4,2,C.glass,0);disk(0,h+5,0,4,kind==='snow-lantern'?C.trim:C.roof,0);disk(0,h+6,0,2,C.trim,0);}
  else if(['water-basin','water-trough'].includes(kind)){const w=kind==='water-basin'?4:7;box(-w,0,-3,w,2,3,C.stone,0);for(const z of [-3,3])box(-w,3,z,w,4,z,C.stone,0);for(const x of [-w,w])box(x,3,-3,x,4,3,C.stone,0);box(1-w,3,-2,w-1,3,2,C.water,0);if(kind==='water-basin')line([-6,0,-3],[-3,8,-3],C.woodLight,0);}
  else if(kind==='clay-jar'){pot(0,0,0,4,7,C.wall);disk(0,8,0,3,C.accent,0);}
  else if(kind==='woven-mat'){for(let x=-6;x<=6;x++)for(let z=-4;z<=4;z++)put(x,0,z,Math.abs(x)+Math.abs(z)<5?C.accent:(x+z)%3?C.trim:C.woodLight,0);}
  else if(kind==='sled'){for(const z of [-3,3]){box(-6,0,z,5,0,z,C.wood,0);line([5,0,z],[7,3,z],C.wood,0);}box(-4,1,-3,4,2,3,C.woodLight,0);box(-4,3,-3,-4,5,3,C.wood,0);}
  else if(kind==='armillary'){disk(0,0,0,3,C.stone,0);box(0,1,0,0,7,0,C.wood,0);for(let i=0;i<40;i++){const a=i*Math.PI/20;put(Math.cos(a)*5,10+Math.sin(a)*5,0,C.accent,0);put(0,10+Math.sin(a)*5,Math.cos(a)*5,C.trim,0);}ellipsoid(0,10,0,2,2,2,C.accent,0);}
  else if(kind==='coconut-basket'){pot(0,0,0,4,4,C.woodLight);for(const [x,z]of [[-2,-1],[2,-1],[0,2]])ellipsoid(x,4,z,2,2,2,C.wood,0);}
  else if(kind==='shell-marker'){disk(0,0,0,4,C.stone,0);for(let x=-4;x<=4;x++)box(x,1,0,x,Math.round(6*Math.sqrt(Math.max(0,1-(x/5)**2))),0,C.trim,0);for(const x of [-2,0,2])line([0,1,1],[x,5,1],C.accent,0);}
  else throw Error('Prop not authored: '+kind);
  return k.v.list();
}
