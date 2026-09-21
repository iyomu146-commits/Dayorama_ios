import {Voxels,treeBlueprint,UNIT} from '../voxels.mjs';
import {hash} from '../model.mjs';
import {workshop} from './kit.mjs';
import {REGIONS,BY_ID} from './catalog.mjs';
import {extraPlant,extraTree,extraProp} from './ecology-extra.mjs';

export const FOREST_PLANTS=['fern','clover','bluebell','mushroom'];
export function plantBlueprint(kind,seed=41){
  const k=workshop('grove',seed),{C,box,put,line,ellipsoid,disk}=k;
  if(kind==='fern'){
    box(0,0,0,0,6,0,'#748b60');
    for(const y of [2,4,6])for(const side of [-1,1]){const r=6-y/2;line([0,y,0],[side*r,y+2,0],'#8b9e70');for(let x=1;x<=r;x++)put(side*x,y+Math.floor(x/2),1,'#8b9e70');}
  }else if(kind==='clover'){
    for(const[x,z]of [[-2,0],[2,1],[0,-2]]){box(x,0,z,x,2,z,'#829566');for(const[a,b]of [[-1,0],[1,0],[0,1]])ellipsoid(x+a,3,z+b,1,1,1,'#98aa7c',0);}
  }else if(kind==='bluebell'){
    box(0,0,0,0,7,0,'#7e946b');line([0,2,0],[2,4,0],'#7e946b');
    for(const[y,side]of [[4,-1],[7,1]]){box(0,y,0,side>0?2:0,y,0,'#7e946b');if(side<0)box(-2,y,0,0,y,0,'#7e946b');ellipsoid(side*2,y-1,0,1.4,1.5,1.4,'#b1b7cb',0);}
  }else if(kind==='mushroom'){
    // Author this small silhouette at its final resolution: scaling 4 and 5
    // by .65 previously collapsed both cap tiers onto the same height.
    box(0,0,0,0,2,0,'#ded2b3');disk(0,3,0,2,'#ac8468',0);disk(0,4,0,1,'#bd9876',0);put(0,5,0,'#c9a782',0);
    return k.v.list();
  }else if(kind==='beach-grass'){
    for(const [x,z,h]of [[-3,-1,5],[0,0,8],[3,1,6],[-1,2,7],[2,-2,5]])line([0,0,0],[x,h,z],'#a6ad81',0);
  }else if(kind==='sea-lavender'){
    box(0,0,0,0,6,0,'#889978',0);for(const [x,y,z]of [[-3,5,0],[3,6,1],[0,8,-1]]){line([0,3,0],[x,y,z],'#889978',0);ellipsoid(x,y,z,1.5,1.5,1.5,'#b5a8be',0);}
  }else if(kind==='succulent'){
    disk(0,0,0,2,'#8da49a',0);for(let i=0;i<8;i++){const a=i*Math.PI/4;line([0,1,0],[Math.round(Math.cos(a)*4),2,Math.round(Math.sin(a)*4)],'#9db2a2',0,2);}ellipsoid(0,3,0,2,2,2,'#b6c1a6',0);
  }else if(kind==='iris'){
    for(const x of [-2,0,2])line([0,0,0],[x,7-Math.abs(x),0],'#7f9b81',0);box(0,0,0,0,8,0,'#839c78',0);for(const [x,z]of [[-2,0],[2,0],[0,2]])ellipsoid(x,8,z,1.5,2,1.5,'#a6a5c4',0);put(0,9,0,'#d8c993',0);
  }else if(kind==='reed'){
    for(const [x,z,h]of [[-2,0,7],[1,1,10],[2,-1,6]]){box(x,0,z,x,h,z,'#a2ac82',0);box(x,h-2,z,x,h,z,'#a68b6f',0);line([x,2,z],[x+2,5,z],'#a2ac82',0);}
  }else if(kind==='hydrangea'){
    box(0,0,0,0,3,0,'#839a7d',0);for(const[x,z]of [[-2,-1],[2,-1],[0,2]]){line([0,1,0],[x,3,z],'#839a7d',0);ellipsoid(x,3,z,2,1.5,2,'#9baea0',0);ellipsoid(x,5,z,2,2,2,x===0?'#c0adc1':'#aebccf',0);}
  }else for(const c of extraPlant(kind,seed))put(c.x,c.y,c.z,c.color,0);
  const compact=new Voxels(seed);for(const c of k.v.list())compact.put(Math.round(c.x*.65),Math.round(c.y*.65),Math.round(c.z*.65),c.color,c.phase);return compact.list();
}
export function regionalTree(region,seed){
  if(['harbor','canal'].includes(region)){
    const k=workshop(region,seed),{box,line,ellipsoid,put}=k;
    if(region==='harbor'){
      line([0,0,0],[3,18,0],'#94816a',0,2);
      for(const [x,y,z,r]of [[-6,20,-2,7],[7,24,2,7],[2,29,0,6]]){line([2,12,0],[x,y,z],'#94816a',0,2);ellipsoid(x,y,z,r,3,r*.8,'#94ab94',0);}
    }else{
      line([0,0,0],[2,21,0],'#9c9078',0,2);ellipsoid(0,24,0,9,4,8,'#a5b48f',0);
      for(let a=0;a<12;a++){const t=a*Math.PI/6,x=Math.round(Math.cos(t)*8),z=Math.round(Math.sin(t)*7),bottom=9+Math.floor(hash(seed,a,8)*6);line([2,17,0],[x,23,z],'#9c9078',0);for(let y=bottom;y<=24;y++)box(x,y,z,x+1,y,z+1,a%3?'#a2b493':'#bdc6a1',0);}
    }
    return k.v.list();
  }
  if(region!=='grove')return extraTree(region,seed);
  if(hash(seed,19)>.35)return treeBlueprint(seed);
  const v=new Voxels(seed),h=26;
  v.box(0,0,0,1,h,1,'#e0dacf');for(let y=3;y<23;y+=5)v.put(0,y,1,'#8c9482',0,true);
  for(const[x,y,z,r]of [[-5,22,0,6],[4,28,1,6],[0,33,-2,6]]){
    v.line([0,14,0],[x,y,z],'#c6c6ad',0,2);
    for(let a=-r;a<=r;a++)for(let b=-r;b<=r;b++)for(let c=-r;c<=r;c++)if(a*a+(b*.85)**2+c*c<r*r)v.put(x+a,y+b,z+c,'#acb88c');
  }
  return v.list();
}
export function regionProp(kind,seed=41){
  const region=Object.keys(REGIONS).find(r=>REGIONS[r].props.includes(kind))||'grove',k=workshop(region,seed),{C,box,put,disk,ellipsoid,bench,shelf}=k;
  if(kind==='log-bench'){
    for(const x of [-4,4])box(x,0,0,x,2,1,C.wood);
    box(-5,3,-1,5,4,2,C.woodLight);box(-5,5,-1,5,6,-1,C.wood);
  }else if(kind==='book-cart'){
    shelf(-5,2,0,10,5);for(const x of [-4,4])for(const z of [0,3])ellipsoid(x,1,z,1,1,1,C.dark,0);box(-5,1,0,5,1,3,C.wood);
  }else if(kind==='birdbath'){
    disk(0,0,0,3,C.stone,0);box(0,1,0,0,5,0,C.stone);disk(0,6,0,4,C.stone,0);disk(0,7,0,4,C.stone,0,'round',2.5);disk(0,7,0,2,'#9dbfb5',0);
  }else if(kind==='bollard'){
    disk(0,0,0,4,C.stone,0);for(let y=1;y<=6;y++)disk(0,y,0,y===6?3:2,C.dark,0);disk(0,3,0,3,C.woodLight,0,'round',1.5);
  }else if(kind==='rope-coil'){
    for(let i=0;i<90;i++){const t=i*.26,r=1+i/30;put(Math.cos(t)*r,0,Math.sin(t)*r,C.woodLight,0);}box(1,0,0,6,0,0,C.woodLight,0);
  }else if(kind==='fish-crate'){
    box(-4,0,-3,4,0,3,C.woodLight,0);for(const x of [-4,4])box(x,1,-3,x,3,3,C.wood,0);for(const z of [-3,3])box(-4,1,z,4,3,z,C.wood,0);box(-3,1,-2,3,1,2,'#d3e0da',0);for(const z of [-1,1])box(-2,2,z,2,2,z,'#94b2b1',0);
  }else if(kind==='iron-bench'){
    for(const x of [-5,5])box(x,0,0,x,6,0,C.dark,0);box(-5,3,-1,5,3,2,C.woodLight,0);for(const y of [5,7])box(-5,y,-1,5,y,-1,C.dark,0);for(const x of [-3,0,3])box(x,4,-1,x,7,-1,C.dark,0);
  }else if(kind==='parcel-stack'){
    for(const [x,y,z,w]of [[-4,0,-2,4],[1,0,-1,3],[-2,5,-1,3]]){box(x,y,z,x+w,y+w,z+3,'#c7b593',0);box(x+1,y+w+1,z,x+1,y+w+1,z+3,C.trim,0);}
  }else if(kind==='canal-lamp'){
    disk(0,0,0,3,C.stone,0);box(0,1,0,0,13,0,C.dark,0);box(-2,14,-2,2,17,2,C.glass,0);box(-3,18,-3,3,18,3,C.dark,0);box(-1,19,-1,1,20,1,C.dark,0);
  }else return extraProp(kind,seed);
  return k.v.list();
}
export function collectionStreetLife(kinds,surface,seed=41,region='grove',people=true){
  const cells=[],plants=[],plantCells=new Set(),spots=[[1.45,1.65],[4.15,1.75],[2.7,4.2]];
  const translate=(part,x,y,z)=>part.map(c=>({...c,x:c.x+x,y:c.y+y,z:c.z+z}));
  kinds.forEach((kind,i)=>{
    const [x,z]=spots[i],xx=Math.round(x/UNIT),yy=Math.round((surface(x,z)+UNIT/2)/UNIT),zz=Math.round(z/UNIT);
    const profile=REGIONS[region];
    const prop=region==='grove'?(['books','woodland-library','treehouse'].includes(kind)?'book-cart':['flowers','herbalist','aviary','apiary','mushroom-house'].includes(kind)?'birdbath':'log-bench'):region==='harbor'?(['fish-market','crab-shack'].includes(kind)?'fish-crate':['shipyard','net-loft'].includes(kind)?'rope-coil':'bollard'):region==='canal'?(kind==='post-office'?'parcel-stack':['clockmaker','canal-lock'].includes(kind)?'canal-lamp':'iron-bench'):profile.props[(BY_ID[kind].number+i)%profile.props.length];
    const propCells=regionProp(prop,seed),compactProp=new Voxels(seed);if(region==='tokyo')for(const c of propCells)compactProp.put(Math.round(c.x*.65),Math.round(c.y*.65),Math.round(c.z*.65),c.color,c.phase);cells.push(...translate(region==='tokyo'?compactProp.list():propCells,xx,yy,zz));
    if(people){const person=new Voxels(seed);person.box(0,0,0,1,1,1,'#687b70');person.box(0,2,0,1,4,1,['#9aa787','#b09a83','#8eaaa0'][i]);person.box(0,5,0,1,6,1,'#d8bb97');person.box(-1,7,0,2,7,1,'#9b8867');cells.push(...translate(person.list(),xx+7,yy,zz+2));}
    const species=region==='grove'?(kind==='herbalist'?'fern':kind==='mushroom-house'?'mushroom':kind==='apiary'?'clover':'bluebell'):profile.plants[(BY_ID[kind].number+i)%profile.plants.length];
    for(let p=0;p<3;p++){
      const [dx,dz]=[[-7,8],[6,9],[-1,15]][p],px=xx+dx;
      // Resolve collisions against earlier plants only; later choices can
      // never move a plant that has already been earned.
      for(const shift of [0,2,4,6]){
        const pz=zz+dz+shift,part=translate(plantBlueprint(species,seed),px,yy,pz),keys=part.map(c=>`${c.x},${c.y},${c.z}`);
        if(keys.some(k=>plantCells.has(k)))continue;
        keys.forEach(k=>plantCells.add(k));plants.push({id:`collection-${i}-${kind}-${p}`,kind:species,anchor:[px,yy,pz],cells:part});break;
      }
    }
  });
  return{cells,plants,residents:kinds.length};
}
