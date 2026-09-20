import {hash,normalizeDesign} from './model.mjs';
export const UNIT=.14;
export const COLORS={stone:'#bfb29a',floor:'#d0bfa1',wall:'#eddfc5',trim:'#efe8d5',wood:'#916f50',woodLight:'#b7966b',dark:'#535f50',glass:'#b9d2c1',light:'#f1cf81',sage:'#668d85',clay:'#b67f69',blue:'#6e8799',leaf:'#809862',flower:'#dab093'};
export class Voxels{
  constructor(seed=1){this.seed=seed;this.cells=new Map();}
  put(x,y,z,color,phase=0,force=false){x=Math.round(x);y=Math.round(y);z=Math.round(z);const k=`${x},${y},${z}`;if(force||!this.cells.has(k))this.cells.set(k,{x,y,z,color,phase});}
  box(x0,y0,z0,x1,y1,z1,color,phase=0){for(let y=Math.ceil(y0);y<=Math.floor(y1);y++)for(let z=Math.ceil(z0);z<=Math.floor(z1);z++)for(let x=Math.ceil(x0);x<=Math.floor(x1);x++)this.put(x,y,z,color,phase);}
  line(a,b,color,phase=0,width=1){const n=Math.ceil(Math.max(...a.map((v,i)=>Math.abs(v-b[i]))));for(let i=0;i<=n;i++){const t=n?i/n:0;const [x,y,z]=a.map((v,j)=>Math.round(v+(b[j]-v)*t));this.box(x,y,z,x+width-1,y+width-1,z+width-1,color,phase);}}
  list(){return [...this.cells.values()].sort((a,b)=>a.phase-b.phase||a.y-b.y||a.z-b.z||a.x-b.x);}
}
export function buildBlueprint(input={},seed=41,kind='books'){
  const d=normalizeDesign(input),v=new Voxels(seed),C={...COLORS,roof:COLORS[d.roof]};
  function window(cx,cy,cz,w=5,h=7,side=false){
    for(let x=-Math.floor(w/2);x<=Math.floor(w/2);x++)for(let y=0;y<h;y++){
      if(y===h-1&&Math.abs(x)>Math.floor(w/2)-1)continue;
      const border=Math.abs(x)===Math.floor(w/2)||y===0||y===h-1;
      const c=border?C.trim:(x===0||y===Math.floor(h/2)?C.wood:C.light);
      v.put(cx+(side?0:x),cy+y,cz+(side?x:0),c,3,true);
    }
    if(!side){v.box(cx-w/2-1,cy-2,cz,cx+w/2+1,cy-1,cz+2,C.wood,3);for(let i=-3;i<=3;i++){v.put(cx+i,cy,cz+2,i%2?C.leaf:C.flower,3);}}
  }
  function house(cx,cz,w,dpth,h,roofH,decor=true){
    const x0=cx-Math.floor(w/2),x1=cx+Math.floor(w/2),z0=cz-Math.floor(dpth/2),z1=cz+Math.floor(dpth/2);
    v.box(x0-1,0,z0-1,x1+1,0,z1+1,C.stone,0);
    for(const z of [z0,z1])v.box(x0,1,z,x1,2,z,C.stone,0);
    for(const x of [x0,x1])v.box(x,1,z0,x,2,z1,C.stone,0);
    const rx=(w/2+2),ry=x=>h+2+Math.round(roofH*(1-Math.pow(Math.min(1,Math.abs(x-cx)/rx),.84)));
    for(const x of [x0,x1])for(const z of [z0,cz,z1])v.box(x,3,z,x, h+1,z,C.wood,1);
    for(const y of [3,h+1]){for(const z of [z0,z1])v.line([x0,y,z],[x1,y,z],C.wood,1);for(const x of [x0,x1])v.line([x,y,z0],[x,y,z1],C.wood,1);}
    for(const z of [z0,cz,z1]){for(let x=x0-1;x<=x1+1;x++){const yy=ry(x)-1;v.box(x,yy-1,z,x,yy,z,C.wood,1);}v.line([cx,h+1,z],[cx,ry(cx)-1,z],C.wood,1);}
    for(const x of [x0,x1])v.line([x,4,z0],[x,h,cz],C.wood,1,2);
    const wx=w>18?[-Math.round(w*.29),Math.round(w*.29)]:[0];
    const opening=(x,y,front)=>{if(front&&Math.abs(x-cx)<=2&&y>=3&&y<=13)return true;return wx.some(q=>Math.abs(x-(cx+q))<=2&&y>=7&&y<=13);};
    for(let y=3;y<=h;y++)for(let x=x0;x<=x1;x++)for(const z of [z0,z1])if(!opening(x,y,z===z1))v.put(x,y,z,C.wall,2);
    for(let y=3;y<=h;y++)for(let z=z0;z<=z1;z++)for(const x of [x0,x1])if(!(Math.abs(z-cz)<=2&&y>=7&&y<=13))v.put(x,y,z,C.wall,2);
    for(const z of [z0,z1])for(let x=x0;x<=x1;x++)for(let y=h+1;y<ry(x);y++)v.put(x,y,z,C.wall,2);
    for(let x=x0-2;x<=x1+2;x++)for(let z=z0-2;z<=z1+2;z++){const yy=ry(x);v.put(x,yy,z,C.roof,2);v.put(x,yy+1,z,C.roof,2);}
    v.box(cx,ry(cx)+2,z0-3,cx,ry(cx)+2,z1+3,C.roof,2);
    for(const q of wx){if(q!==0)window(cx+q,7,z1+1);window(cx+q,7,z0-1);}
    window(x1+1,7,cz,5,7,true);window(x0-1,7,cz,5,7,true);
    v.box(cx-2,3,z1+1,cx+2,13,z1+1,C.wood,3);
    v.box(cx-1,7,z1+2,cx+1,11,z1+2,C.glass,3);v.put(cx+1,6,z1+3,C.light,3);
    v.box(cx-4,1,z1+2,cx+4,1,z1+5,C.stone,0);v.box(cx-3,2,z1+1,cx+3,2,z1+3,C.floor,0);
    if(decor){
      v.box(cx-5,15,z1+1,cx+5,15,z1+4,C.roof,3);v.box(cx-5,14,z1+4,cx+5,14,z1+4,C.trim,3);
      for(const x of [cx-5,cx+5])v.box(x,3,z1+4,x,14,z1+4,C.woodLight,3);
      v.box(cx+6,ry(cx+6)-1,cz-4,cx+8,ry(cx)+4,cz-2,C.stone,2);v.box(cx+5,ry(cx)+5,cz-5,cx+9,ry(cx)+5,cz-1,C.trim,3);
      v.box(cx-3,17,z1+1,cx+3,19,z1+1,kind==='flowers'?'#929d76':kind==='tea'?'#a08066':'#5e807b',3);
      for(let x=-2;x<=2;x++)v.put(cx+x,18,z1+2,C.trim,3);
    }
  }
  if(d.court){house(0,-9,28,12,16,9);house(-17,5,10,26,13,8,false);house(17,5,10,26,13,8,false);v.box(-11,0,-2,11,0,19,C.floor,0);}
  else house(0,0,28,20,18,11);
  if(d.tower!=='none'){
    const tx=(d.tower==='left'?-1:1)*(d.court?24:19),tz=d.court?-8:-5,r=5;
    for(let y=0;y<=35;y++)for(let x=-r;x<=r;x++)for(let z=-r;z<=r;z++){
      const dist=Math.hypot(x,z);if(dist>r+.35)continue;
      if(y<=2)v.put(tx+x,y,tz+z,C.stone,0);
      else if(dist>=r-1.1){const frame=(Math.abs(x)<=1&&Math.abs(z)>=r-1)||(Math.abs(z)<=1&&Math.abs(x)>=r-1)||[16,34].includes(y);const opening=z>r-2&&Math.abs(x)<=2&&y>=23&&y<=29;if(!opening)v.put(tx+x,y,tz+z,frame?C.wood:C.wall,frame?1:2);}
    }
    for(let y=0;y<=12;y++){const rr=6*(1-y/13);for(let x=-7;x<=7;x++)for(let z=-7;z<=7;z++)if(Math.hypot(x,z)<=rr+.4&&Math.hypot(x,z)>=rr-1.3)v.put(tx+x,36+y,tz+z,C.roof,2);}
    window(tx,23,tz+6,5,7);v.put(tx,49,tz,C.light,3);
  }
  if(d.greenhouse){
    const gx=d.court?30:25,gz=11,w=12,dd=17,hh=11;
    v.box(gx-w/2-1,0,gz-dd/2-1,gx+w/2+1,1,gz+dd/2+1,C.stone,0);
    for(let x=-w/2;x<=w/2;x++)for(let z=-8;z<=8;z++){
      if(Math.abs(x)===w/2||Math.abs(z)===8)for(let y=2;y<=hh;y++){const f=y===hh||y===2||(Math.abs(z)===8&&(x+w/2)%4===0)||(Math.abs(x)===w/2&&(z+8)%4===0);v.put(gx+x,y,gz+z,f?C.woodLight:C.glass,f?1:2);}
      const yy=hh+1+Math.round(5*(1-Math.abs(x)/(w/2)));v.put(gx+x,yy,gz+z,z%4===0?C.trim:C.glass,z%4===0?1:2);
    }
    for(let z=-5;z<=5;z+=5)for(const x of [-3,3]){v.box(gx+x,2,gz+z,gx+x+1,4,gz+z+2,C.wood,3);v.box(gx+x,5,gz+z,gx+x+1,7,gz+z+2,C.leaf,3);v.put(gx+x,8,gz+z,C.flower,3);}
  }
  const front=d.court?24:16;
  if(kind==='books'){
    for(const x of [-10,-9])v.box(x,1,front,x,6,front+5,C.wood,3);
    for(const y of [2,5]){v.box(-13,y,front,-6,y,front+4,C.woodLight,3);for(let x=-12;x<=-7;x++)v.box(x,y+1,front+1,x,y+2,front+3,['#ab7969','#869985','#c4ad79'][Math.abs(x)%3],3);}
    v.box(5,3,front+2,13,3,front+4,C.woodLight,3);v.box(5,4,front+2,13,6,front+2,C.woodLight,3);
    for(const x of [5,13])for(const z of [front+2,front+4])v.box(x,0,z,x,2,z,C.wood,3);
    v.box(8,4,front+3,9,6,front+4,'#819381',3);v.box(8,7,front+3,9,8,front+4,'#d5ba96',3);v.box(8,9,front+3,9,9,front+4,'#827259',3);v.box(8,2,front+5,9,3,front+5,'#6f7e77',3);v.box(7,5,front+5,10,5,front+5,C.trim,3);
  }else if(kind==='tea'){
    for(const x of [-9,9]){v.box(x-1,0,front-1,x+1,0,front+1,C.wood,3);v.box(x,1,front,x,5,front,C.wood,3);v.box(x-3,6,front-3,x+3,6,front+3,C.woodLight,3);v.put(x,7,front,C.trim,3);for(const z of [front-6,front+6]){v.box(x-2,3,z-1,x+2,3,z+1,C.woodLight,3);for(const dx of [-2,2])for(const dz of [-1,1])v.box(x+dx,0,z+dz,x+dx,2,z+dz,C.wood,3);const back=z+(z<front?-1:1);v.box(x-2,4,back,x+2,6,back,C.woodLight,3);}}
  }else{
    for(const x of [-9,9])for(const z of [front,front+7]){v.box(x-2,1,z-2,x+2,3,z+2,C.wood,3);for(let q=-2;q<=2;q++){v.put(x+q,4,z,C.leaf,3);v.put(x+q,5+Math.abs(q%2),z,C.flower,3);}}
  }
  const cells=v.list(),phases=[0,1,2,3].map(p=>cells.filter(c=>c.phase===p));
  return{cells,phases,counts:phases.map(p=>p.length),bounds:cells.reduce((b,c)=>({min:b.min.map((v,i)=>Math.min(v,[c.x,c.y,c.z][i])),max:b.max.map((v,i)=>Math.max(v,[c.x,c.y,c.z][i]))}),{min:[Infinity,Infinity,Infinity],max:[-Infinity,-Infinity,-Infinity]}),design:d};
}

export function treeBlueprint(seed=1,size=1){
  const v=new Voxels(seed),h=16+Math.floor(hash(seed)*6),r=10*size;
  v.box(-1,0,-1,1,h,1,'#826f51');
  const lobes=[[-r*.6,h,0,r*.65],[r*.55,h+3,0,r*.66],[0,h+9,0,r*.77],[0,h+2,r*.65,r*.6],[-2,h+3,-r*.65,r*.66]];
  for(let i=0;i<lobes.length;i++){const[cx,cy,cz,rr]=lobes[i];v.line([0,h/2,0],[cx,cy,cz],'#826f51',0,2);for(let x=Math.floor(cx-rr);x<=cx+rr;x++)for(let y=Math.floor(cy-rr*.65);y<=cy+rr*.65;y++)for(let z=Math.floor(cz-rr);z<=cz+rr;z++){const n=Math.hypot((x-cx)/rr,(y-cy)/(rr*.7),(z-cz)/rr);if(n<.98+hash(seed,x,y,z)*.06)v.put(x,y,z,['#739065','#8ca070','#a4b47e','#667f59'][Math.min(3,Math.floor(hash(seed,i)*4))]);}}
  return v.list();
}
