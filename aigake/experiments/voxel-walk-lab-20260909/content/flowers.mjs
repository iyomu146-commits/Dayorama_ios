import {Voxels} from '../voxels.mjs';
import {hash} from '../model.mjs';

// Author at the rendered resolution: rounding a smaller copy merges petals
// and centres, and closes the openings of bell-shaped flowers.
export const FLOWER_STYLES={
 daisy:{petals:['#eee6ca'],stamen:'#e2b84d',pistil:'#a97b39',height:5,radius:3},
 poppy:{petals:['#d27e6f','#db9780'],stamen:'#be9c55',pistil:'#655c54',height:6,radius:3},
 edelweiss:{petals:['#e6e6d4'],stamen:'#cbbb6b',pistil:'#938b58',height:3,radius:3},
 'desert-flower':{petals:['#d28c9b','#e7be65'],stamen:'#e9c66e',pistil:'#9b684d',height:3,radius:2},
 moonflower:{petals:['#eee8d4'],stamen:'#d9bc69',pistil:'#a38b51',height:6,radius:3},
 hibiscus:{petals:['#d78382','#df9a88'],stamen:'#e3bd59',pistil:'#a45e59',height:5,radius:3},
 bluebell:{petals:['#939dca','#a7abd6'],stamen:'#ddd1a1',pistil:'#8f855a'},
 snowdrop:{petals:['#edeedf'],stamen:'#c7b870',pistil:'#81915c'},
 iris:{petals:['#918dc4','#aaa0d3'],stamen:'#e1bd59',pistil:'#9a8154'},
 hydrangea:{petals:['#91afcb','#bd9bbe','#c9adca'],stamen:'#e0d5ad',pistil:'#778f9c'},
 'sea-lavender':{petals:['#b397c2','#cbacbf'],stamen:'#ede0ba',pistil:'#aa956b'},
 lavender:{petals:['#9992bc','#b2a1cc'],stamen:'#d9cca7',pistil:'#8a7896'},
 heather:{petals:['#bb94b1','#cdabc0'],stamen:'#e6d2ac',pistil:'#a28088'},
};

export function flowerBlueprint(kind,seed=41){
 const spec=FLOWER_STYLES[kind];if(!spec)return null;
 const v=new Voxels(seed),leaf='#719367',stem='#65845d';
 const put=(x,y,z,c)=>v.put(x,y,z,c,0,true);
 // A stepped, face-connected branch keeps even small stems attached.
 function branch(a,b,c=stem){
  const p=[...a],n=Math.max(...a.map((x,i)=>Math.abs(x-b[i])),1);put(...p,c);
  for(let j=1;j<=n;j++)for(let axis=0;axis<3;axis++){
   const end=Math.round(a[axis]+(b[axis]-a[axis])*j/n);
   while(p[axis]!==end){p[axis]+=Math.sign(end-p[axis]);put(...p,c);}
  }
 }
 function leaves(h){
  for(const [s,y]of [[-1,1],[1,Math.min(h-1,3)]]){
   branch([0,y,0],[s*2,y+1,0],leaf);put(s,y+1,-1,leaf);put(s,y+1,1,leaf);
  }
 }
 const petal=i=>spec.petals[i%spec.petals.length];
 function floret(x,y,z,c,r=1){
  for(let a=-r;a<=r;a++)for(let b=-r;b<=r;b++)if(Math.abs(a)+Math.abs(b)<=r)put(x+a,y,z+b,c);
  put(x,y,z,spec.stamen);put(x,y+1,z,spec.pistil);
 }
 function rosette(x,y,z,c,r){
  // Four lobes with clipped corners and a raised, separately coloured centre.
  for(let a=-r;a<=r;a++)for(let b=-r;b<=r;b++)if(Math.abs(a)+Math.abs(b)<=r+1){
   const tip=Math.max(Math.abs(a),Math.abs(b))===r;
   put(x+a,y,z+b,c);if(tip&&kind==='poppy')put(x+a,y+1,z+b,c);
  }
  for(const [a,b]of [[1,0],[-1,0],[0,1],[0,-1]])put(x+a,y,z+b,spec.stamen);
  put(x,y,z,spec.pistil);put(x,y+1,z,spec.pistil);
 }
 if(['bluebell','snowdrop'].includes(kind)){
  const h=kind==='snowdrop'?7:8;branch([0,0,0],[0,h,0]);leaves(5);
  const bells=kind==='snowdrop'?[[2,h-1,0]]:[[-2,5,0],[2,8,0]];
  bells.forEach(([x,y,z],i)=>{
   branch([0,y,0],[x,y,z]);put(x,y-1,z,petal(i));
   for(const [a,b]of [[1,0],[-1,0],[0,1],[0,-1]]){
    put(x+a,y-1,z+b,petal(i));put(x+a,y-2,z+b,petal(i));
    if(kind==='snowdrop')put(x+a,y-3,z+b,petal(i));
   }
   put(x,y-2,z,spec.stamen);put(x,y-3,z,spec.pistil);
  });
 }else if(kind==='iris'){
  branch([0,0,0],[0,7,0]);
  for(const x of [-2,2])branch([0,0,0],[x,5,0],leaf);
  for(const [x,z]of [[-2,-1],[2,-1],[0,2]]){
   branch([0,7,0],[x,7,z],petal(0));
   for(const dx of [-1,0,1])put(x+dx,7,z,petal(0));
   put(x,6,z,petal(0));put(Math.sign(x),7,Math.sign(z),spec.stamen);
   branch([0,7,0],[Math.sign(x),9,Math.sign(z)],petal(1));
  }
  put(0,8,0,spec.pistil);
 }else if(kind==='hydrangea'){
  branch([0,0,0],[0,5,0]);leaves(4);
  for(const [i,[x,y,z]]of [[-2,5,0],[2,5,0],[0,5,-2],[0,5,2],[0,7,0]].entries()){
   branch([0,3,0],[x,y,z]);floret(x,y,z,petal(i),1);
  }
 }else if(['sea-lavender','lavender','heather'].includes(kind)){
  const tall=kind==='lavender';branch([0,0,0],[0,4,0]);leaves(4);
  for(const [i,[x,z]]of [[-2,0],[2,1],[0,-2]].entries()){
   const h=(tall?7:5)+(i%2);branch([0,2,0],[x,h,z]);
   floret(x,h,z,petal(i));
   if(tall||kind==='heather')floret(x,h-2,z,petal(i+1));
  }
 }else{
  branch([0,0,0],[0,spec.height,0]);leaves(spec.height);
  rosette(0,spec.height+1,0,petal(Math.floor(hash(seed,72)*spec.petals.length)),spec.radius);
  if(kind==='hibiscus'){
   branch([0,spec.height+1,0],[0,spec.height+4,0],spec.pistil);
   for(const x of [-1,1])put(x,spec.height+4,0,spec.stamen);
  }
 }
 return v.list();
}
