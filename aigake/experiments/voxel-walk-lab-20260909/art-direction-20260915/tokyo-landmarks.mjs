import {workshop} from '../content/kit.mjs';

const VERMILION='#b94735',STONE='#dfd2b8',SLATE='#465766',BRICK='#a75241';

// Each stepped roof has a complete lower course. Tile ridges sit on that
// volume; decorative surface changes never punch holes in the cover.
function tiledRoof(k,x,z,w,d,y,rise){
 k.roof(x,z,w,d,y,rise,'hip',SLATE,2);
 const hx=Math.floor(w/2)+2,hz=Math.floor(d/2)+2;
 for(let a=-hx;a<=hx;a++)for(let b=-hz;b<=hz;b++){
  const top=y+Math.max(1,Math.round(Math.min(hx-Math.abs(a),hz-Math.abs(b))/Math.min(hx,hz)*rise));
  k.box(x+a,y,z+b,x+a,top,z+b,SLATE,2);
  if(a%3===0)k.put(x+a,top+1,z+b,'#63747d',2);
 }
 if(hx>=hz)k.box(x-(hx-hz),y+rise,z,x+(hx-hz),y+rise+1,z,'#65727a',2);
 else k.box(x,y+rise,z-(hz-hx),x,y+rise+1,z+(hz-hx),'#65727a',2);
}

export function gateBlueprint(seed){
 const k=workshop('tokyo',seed),{box,paint}=k;
 box(-30,0,-11,30,0,12,STONE,0);
 for(const x of [-23,-10,10,23])for(const z of [-5,5]){
  box(x-1,1,z-1,x+1,2,z+1,'#575c58',0);
  box(x-1,3,z-1,x+1,25,z+1,VERMILION,1);
 }
 for(const z of [-5,5]){box(-25,22,z-1,25,25,z+1,VERMILION,1);box(-26,26,z-2,26,27,z+2,STONE,1);}
 for(const x of [-23,23])box(x-1,22,-6,x+1,25,6,VERMILION,1);
 for(const s of [-1,1]){
  const x=s*17;box(x-5,2,-4,x+5,20,-4,'#424c49',2);
  for(const dx of [-4,-2,0,2,4])box(x+dx,3,5,x+dx,18,5,'#737b68',3);
  for(const y of [3,10,18])box(x-5,y,5,x+5,y,5,'#737b68',3);
 }
 tiledRoof(k,0,0,61,23,28,10);
 // A supported central suspension, with a clear passage below the lantern.
 box(-1,20,0,1,27,0,'#4b5451',1);
 for(let y=12;y<=20;y++)k.disk(0,y,0,y===12||y===20?3:4,VERMILION,3);
 for(const y of [11,21])k.disk(0,y,0,3,'#343f42',3);
 paint(-1,14,4,1,18,4,STONE,3);paint(-2,17,4,2,17,4,STONE,3);
 k.accessPoint(0,1,12,'雷門の通り抜け');
 k.opening('gate-passage','門の中央を通り抜ける開口。提灯は上部の梁に接続');
 const bp=k.finish('tokyo-kaminarimon');bp.passage={min:[-7,1,-10],max:[7,10,12]};return bp;
}

export function templeBlueprint(seed){
 const k=workshop('tokyo',seed),{box,paint}=k;
 k.house({w:49,d:25,h:22,shape:'flat',roofOverhang:0,foundationMargin:0,door:false,windows:false,color:'#9b503d',roofColor:SLATE});
 for(const x of [-22,-11,11,22])box(x-1,2,13,x+1,23,14,VERMILION,1);
 for(const x of [-16,-5,5,16]){
  paint(x-3,4,12,x+3,18,12,'#564c3f',3);
  for(const dx of [-2,0,2])paint(x+dx,4,12,x+dx,18,12,'#bba47a',3);
 }
 box(-25,21,13,25,23,14,STONE,1);
 tiledRoof(k,0,0,57,31,24,13);
 k.doorway(0,2,12,11);k.box(-4,0,13,4,0,18,STONE,0);
 k.opening('temple-front','柱を避けた中央の参拝口');return k.finish('tokyo-temple');
}

export function approachShop(seed,tone=0){
 const k=workshop('tokyo',seed),{box,paint}=k;
 k.house({w:17,d:19,h:13,shape:'flat',rise:1,roofOverhang:0,windows:false,color:'#bca88a',roofColor:SLATE});
 tiledRoof(k,0,0,19,23,14,5);
 paint(-7,3,9,-4,10,9,'#705c49',3);paint(4,3,9,7,10,9,'#705c49',3);
 const color=['#477e74','#a45b4e','#b18a47'][tone%3];
 box(-8,11,10,8,12,11,color,3);paint(-4,12,11,4,12,11,STONE,3);
 for(const x of [-8,8])box(x,1,11,x,10,11,'#786951',1);
 return k.finish('tokyo-approach-shop');
}

export function brickStationBlueprint(seed){
 const k=workshop('tokyo',seed),{box,paint}=k;
 k.house({w:97,d:25,h:25,floors:2,shape:'hip',rise:7,roofOverhang:0,foundationMargin:0,windows:false,color:BRICK,roofColor:SLATE});
 for(const z of [-12,12]){
  for(const y of [2,13,24])paint(-48,y,z,48,y,z,STONE,3);
  for(let x=-45;x<=45;x+=5)for(const y of [4,15]){
   if(Math.abs(x)<4&&y===4&&z>0)continue;
   paint(x-1,y,z,x+1,y+6,z,'#97b3b7',3);
   for(const dx of [-2,2])paint(x+dx,y-1,z,x+dx,y+7,z,STONE,3);
   paint(x-2,y+7,z,x+2,y+7,z,STONE,3);
  }
 }
 // Square drums stand on the station's closed roof and support solid domes.
 for(const x of [-33,33]){
  box(x-10,26,-11,x+10,34,11,BRICK,2);
  box(x-11,34,-12,x+11,34,12,SLATE,2);
  for(let y=0;y<=12;y++){
   const radius=Math.max(1,Math.round(11*Math.sqrt(Math.max(0,1-(y/12)**2))));
   k.disk(x,35+y,0,radius,SLATE,2);
   for(const s of [-1,1])k.put(x+s*radius,35+y,0,'#78858a',2);
  }
  box(x-1,47,-1,x+1,50,1,SLATE,2);
  for(const z of [-11,11]){paint(x-2,28,z,x+2,32,z,STONE,3);paint(x-1,29,z,x+1,31,z,'#97b3b7',3);}
 }
 // Central pediment, clock and a canopy whose front posts clear the door.
 for(let y=25;y<=34;y++){const r=Math.max(1,10-(y-25));box(-r,y,12,r,y,13,BRICK,2);box(-r,y,14,-r,y,14,STONE,3);box(r,y,14,r,y,14,STONE,3);}
 paint(-3,26,14,3,30,14,STONE,3);paint(0,27,14,0,30,14,'#4d626b',3);paint(0,28,14,2,28,14,'#4d626b',3);
 k.awning({z:13,w:17,depth:5,y:14,color:SLATE});
 // Side concourse joins the station to an actual outer-loop platform.
 box(48,0,-5,67,1,5,STONE,0);box(61,0,-22,67,1,22,STONE,0);
 for(const z of [-6,6])box(49,0,z,60,0,z,STONE,0);
 for(const z of [-18,-6,6,18])box(61,2,z,61,15,z,'#78898f',1);
 k.roof(61,0,5,43,15,1,'flat',SLATE,0);
 paint(67,1,-22,67,1,22,'#dfbd65',3);
 k.sideDoor(48,2,0,1,10);
 for(const c of k.v.list())if([k.C.wood,k.C.woodLight].includes(c.color))k.put(c.x,c.y,c.z,STONE,c.phase,true);
 const bp=k.finish('tokyo-brick-station');bp.platform={edgeX:67,z0:-22,z1:22};return bp;
}
