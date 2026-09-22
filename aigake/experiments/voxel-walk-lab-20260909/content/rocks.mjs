import {Voxels} from '../voxels.mjs';
import {hash} from '../model.mjs';

export const ROCK_PALETTES={
 grove:{stone:['#918b7e','#9e9788','#aaa291'],cover:['#77845d','#86916b']},
 harbor:{stone:['#879196','#99a1a4','#aab0af']},
 canal:{stone:['#8a9290','#9aa29b','#acb0a5'],cover:['#788d6c','#899876']},
 meadow:{stone:['#989384','#aaa18d','#b9ae98'],cover:['#89956c','#99a47c']},
 alpine:{stone:['#7f8992','#909aa1','#a4abb0']},
 satoyama:{stone:['#828b84','#949d92','#a6afa1'],cover:['#75875c','#87976b']},
 oasis:{stone:['#bb9770','#ccac80','#ddc195']},
 snow:{stone:['#8f9b9f','#a0aaad','#b1babc'],snow:['#d7e0df','#e8ede6']},
 stars:{stone:['#8a8d9b','#a0a1ac','#b4b3bb']},
 tropical:{stone:['#afa99a','#c2baa8','#d1cbb7'],cover:['#8b9c7c','#9cab8c']},
};
export const forestRock=(seed=41,variant=0)=>regionalRock('grove',seed,variant);
export function regionalRock(region,seed=41,variant=0){
 const palette=ROCK_PALETTES[region];if(!palette)throw Error('No natural rocks for region: '+region);
 const v=new Voxels(seed),rx=[3.8,3.4,4.1][variant%3],rz=[2.9,3.4,2.7][variant%3],height=[3.9,3.2,4.2][variant%3];
 for(let x=-4;x<=4;x++)for(let z=-4;z<=4;z++){
  const q=((x+.20*z)/rx)**2+((z-.18)/rz)**2;
  // Clip two unequal corners and tilt the crest; avoid a square stepped pyramid.
  if(q>1||x+z>4||-x+z>4.5)continue;
  const h=Math.max(1,Math.round(height*Math.sqrt(1-q)+.18*x-.12*z));
  for(let y=0;y<h;y++){
   const top=y===h-1,patch=top&&y>0&&(x+1.8)**2+(z+1.1)**2<4.8&&hash(seed,x,z,42)>.18;
   const color=patch&&palette.cover?palette.cover[hash(seed,x,z,43)>.5?0:1]:palette.stone[region==='oasis'?y%3:Math.floor(hash(seed,x,z,44)*3)];
   v.put(x,y,z,color,0);
  }
  if(palette.snow&&h>1)v.put(x,h,z,palette.snow[hash(seed,x,z,45)>.35?1:0],0);
 }
 return v.list();
}
