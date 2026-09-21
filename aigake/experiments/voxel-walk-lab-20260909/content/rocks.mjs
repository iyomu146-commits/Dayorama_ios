import {Voxels} from '../voxels.mjs';
import {hash} from '../model.mjs';

export function forestRock(seed=41,variant=0){
 const v=new Voxels(seed),rx=[3.8,3.4,4.1][variant%3],rz=[2.9,3.4,2.7][variant%3],height=[3.9,3.2,4.2][variant%3];
 for(let x=-4;x<=4;x++)for(let z=-4;z<=4;z++){
  const q=((x+.20*z)/rx)**2+((z-.18)/rz)**2;
  // Clip two unequal corners and tilt the crest; avoid a square stepped pyramid.
  if(q>1||x+z>4||-x+z>4.5)continue;
  const h=Math.max(1,Math.round(height*Math.sqrt(1-q)+.18*x-.12*z));
  for(let y=0;y<h;y++){
   const top=y===h-1,patch=top&&y>0&&(x+1.8)**2+(z+1.1)**2<4.8&&hash(seed,x,z,42)>.18;
   const color=patch?(hash(seed,x,z,43)>.5?'#77845d':'#86916b'):['#918b7e','#9e9788','#aaa291'][Math.floor(hash(seed,x,z,44)*3)];
   v.put(x,y,z,color,0);
  }
 }
 return v.list();
}
