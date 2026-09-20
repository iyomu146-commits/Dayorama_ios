// Shared physical objects, authored in the same integer grid as the buildings.
export function mechanisms(k){
  const {C,box,put,line,ellipsoid,disk}=k;
  function ringFace(x,y,z,r,color=C.woodLight,width=1.4,axis='z',phase=3){
    for(let a=-Math.ceil(r);a<=r;a++)for(let b=-Math.ceil(r);b<=r;b++){const d=Math.hypot(a,b);if(d<=r+.25&&d>=r-width)put(x+(axis==='z'?a:0),y+b,z+(axis==='x'?a:0),color,phase);}
  }
  function wheel(x,y,z,r,axis='z',color=C.woodLight){
    ringFace(x,y,z,r,color,2,axis);ringFace(x,y,z,r-2,C.wood,1,axis);
    for(let i=0;i<8;i++){const t=i*Math.PI/4,a=Math.round(Math.cos(t)*r),b=Math.round(Math.sin(t)*r);line([x,y,z],[x+(axis==='z'?a:0),y+b,z+(axis==='x'?a:0)],color,3);}
    ellipsoid(x,y,z,2,2,2,C.wood,3);
  }
  function clock(x,y,z,r=5){
    k.fitting('clock',()=>{
    for(let a=-r;a<=r;a++)for(let b=-r;b<=r;b++)if(a*a+b*b<=r*r+.5)put(x+a,y+b,z,C.trim,3);
    ringFace(x,y,z+1,r,C.accent);line([x,y,z+1],[x,y+r-2,z+1],C.dark,3);line([x,y,z+1],[x+r-2,y-1,z+1],C.dark,3);
    for(const [a,b]of [[r-1,0],[1-r,0],[0,r-1],[0,1-r]])put(x+a,y+b,z+1,C.wood,3);
    });
  }
  function hull(x,y,z,length=25,width=9,height=5,ribs=false,axis='x'){
    const half=Math.floor(length/2),beam=Math.floor(width/2);
    const place=(a,b,c,color,phase)=>axis==='z'?put(x+c-z,b,z+a-x,color,phase):put(a,b,c,color,phase);
    for(let a=-half;a<=half;a++)place(x+a,y,z,C.wood,1);
    for(let a=-half;a<=half;a++){
      const span=Math.max(0,Math.min(beam,Math.floor((half-Math.abs(a))*.65)+1));
      for(let b=1;b<=height;b++)for(let c=-span;c<=span;c++){
        const skin=Math.abs(c)>=Math.max(0,span-1)||b===1;
        if(ribs?(a%4===0&&skin||b===height&&Math.abs(c)===span):skin)place(x+a,y+b,z+c,ribs?C.woodLight:b===height?C.trim:C.roof,ribs?1:2);
      }
    }
  }
  function fish(x,y,z,length=11,color='#8ea6a7'){
    ellipsoid(x,y,z,length*.45,2.4,1.8,color);
    for(let a=0;a<4;a++)box(x-Math.floor(length/2)-a,y-a,z,x-Math.floor(length/2)-a,y+a,z,color,3);
    box(x-1,y+2,z,x+1,y+4,z,color,3);put(x+Math.floor(length*.3),y+1,z+2,C.dark,3);
  }
  function crate(x,y,z,w=7,d=5,fishInside=false){
    box(x,y,z,x+w,y,z+d,C.woodLight,3);for(const a of [0,w])box(x+a,y+1,z,x+a,y+3,z+d,C.wood,3);for(const b of [0,d])box(x,y+1,z+b,x+w,y+3,z+b,C.wood,3);
    if(fishInside){box(x+1,y+1,z+1,x+w-1,y+1,z+d-1,'#d1e0d9',3);box(x+2,y+2,z+2,x+w-2,y+2,z+3,'#94aba9',3);put(x+w-2,y+3,z+2,C.dark,3);}
  }
  function lifebuoy(x,y,z,r=5){
    for(let a=-r;a<=r;a++)for(let b=-r;b<=r;b++){const d=Math.hypot(a,b);if(d<=r+.3&&d>=r-2)put(x+a,y+b,z,Math.abs(a)<2||Math.abs(b)<2?C.accent:C.trim,3);}
  }
  function balcony(x,y,z,w=23,{gate=0,door=true}={}){
    const h=Math.floor(w/2);box(x-h,y,z,x+h,y,z+4,C.woodLight,1);
    for(let a=-h;a<=h;a++){if(gate&&Math.abs(a)<=Math.floor(gate/2))continue;put(x+a,y+5,z+4,C.woodLight,3);if((a+h)%3===0)box(x+a,y+1,z+4,x+a,y+4,z+4,C.woodLight,3);}
    for(const a of [-h,h]){box(x+a,y+5,z,x+a,y+5,z+4,C.woodLight,3);box(x+a,y+1,z+2,x+a,y+4,z+2,C.woodLight,3);}
    for(const a of [-h,h])box(x+a,0,z+4,x+a,y,z+4,C.wood,1);
    if(door&&y>4)k.doorway(x,y+1,z-1,8,{access:'balcony',name:'balcony door'});
  }
  return{ringFace,wheel,clock,hull,fish,crate,lifebuoy,balcony};
}
