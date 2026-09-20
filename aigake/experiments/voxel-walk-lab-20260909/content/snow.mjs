import {workshop} from './kit.mjs';
import {mechanisms} from './mechanisms.mjs';
export const SNOW_IDS=['igloo','sauna','sled-workshop','reindeer-stable','aurora-station','ice-sculpture','wool-mill','winter-greenhouse'];
export function snowBlueprint(id,seed=41){
  if(!SNOW_IDS.includes(id))throw Error(id);
  const k=workshop('snow',seed),{C,box,put,line,paint,disk,ellipsoid,house,roundHouse,hall,feature,chimney,pot,bench}=k,{ringFace,wheel}=mechanisms(k);
  if(id==='igloo'){
    roundHouse({r:11,h:8,rise:12,cap:'dome',color:C.trim,roofColor:C.trim});house({z:13,w:9,d:9,h:8,rise:4,shape:'hip',windows:false,color:C.trim,roofColor:C.trim});
    feature('半球の積雪の目地',()=>{for(let y=10;y<=18;y+=4){const r=12*Math.sqrt(1-((y-8)/12.4)**2);for(let i=0;i<12;i++){const a=i*Math.PI/6+(y===14?.2:0),x=Math.round(Math.cos(a)*r),z=Math.round(Math.sin(a)*r);put(x,y,z,'#d0dbd7',3,true);}}});
    k.threshold(0,2,19,6);
    feature('トンネルの玄関と雪灯り',()=>{ringFace(0,6,19,5,C.roof,1);for(const x of [-14,14]){disk(x,0,9,3,C.trim,3);box(x-1,1,8,x+1,4,10,C.glass,3);disk(x,5,9,3,C.trim,3);}});
  }else if(id==='sauna'){
    house({w:23,d:21,h:13,rise:7,color:C.woodLight,roofColor:C.roof,windows:false});
    feature('木板の外壁と高窓',()=>{for(const y of [4,8,12])for(const z of [-10,10])box(-11,y,z,11,y,z,C.wood,3);for(const x of [-7,7])k.window(x,8,11,5,3);});
    feature('薪ストーブと外の桶',()=>{chimney(5,-5,0,32,2);pot(15,0,8,4,6,C.woodLight);bench(-15,0,15,8);});
  }else if(id==='sled-workshop'){
    house({w:31,d:19,h:15,rise:7,shape:'shed'});
    feature('橇を修理する深い軒下',()=>{k.awning({z:10,w:33,y:13,depth:7,color:C.roof});for(const x of [-14,14])box(x,1,10,x,1,18,C.woodLight,0);});
    feature('修理中の小さな橇',()=>{for(const z of [-5,1])box(18,0,z,24,1,z,C.wood,3);box(18,2,-5,24,3,1,C.woodLight,3);});
  }else if(id==='reindeer-stable'){
    hall({w:37,d:23,h:17,rise:12});box(-18,2,-11,18,15,-11,C.woodLight,2);
    feature('雪を避ける軒と木の通風板',()=>{k.awning({z:12,w:37,y:15,depth:3});for(const x of [-12,-6,0,6,12])box(x,12,12,x,16,12,C.woodLight,3);});
    feature('雪よけの柵と飼葉桶',()=>{for(let x=-18;x<=18;x+=6)if(x)box(x,0,14,x,8,14,C.wood,3);for(const[a,b]of [[-18,-4],[4,18]])box(a,7,14,b,8,14,C.woodLight,3);box(-7,2,2,7,6,6,C.wood,3);box(-6,7,3,6,7,5,C.accent,3);});
  }else if(id==='aurora-station'){
    house({w:25,d:19,h:25,rise:8,shape:'shed',floors:2,windows:false});
    feature('空へ向けた大きな観測窓',()=>{paint(-10,14,10,10,24,10,C.glass);for(const x of [-10,0,10])paint(x,14,11,x,24,11,C.trim);box(-10,24,11,10,24,11,C.trim,3);});
    feature('屋外の小さな撮影台',()=>{for(const [x,z]of [[12,14],[20,14],[16,19]])line([x,0,z],[16,8,16],C.wood,3);box(14,8,15,18,10,17,C.dark,3);box(15,9,13,17,10,14,C.roof,3);});
  }else if(id==='ice-sculpture'){
    house({x:-12,w:13,d:15,h:27,rise:1,floors:2,shape:'flat',color:C.trim,windows:false});
    feature('冷蔵棟につながる作業屋根',()=>{hall({x:10,w:23,d:19,h:13,rise:4,shape:'shed'});box(0,2,-9,21,11,-9,C.woodLight,2);box(3,2,-3,17,4,3,C.stone,3);});
    feature('切り出した氷のブロック',()=>{for(const [x,y,z]of [[-22,0,14],[-5,0,15],[0,0,16],[-7,5,16]])box(x,y,z,x+4,y+4,z+4,C.glass,3);});
  }else if(id==='wool-mill'){
    house({x:-5,w:23,d:19,h:25,rise:10,floors:2});
    feature('軒下の作業用の糸車',()=>{box(13,0,4,14,7,4,C.wood,1);wheel(14,7,5,5);box(8,0,3,20,1,6,C.wood,1);k.awning({x:14,z:0,w:13,y:13,depth:9});});
    feature('窓辺の毛糸の棚',()=>{for(const[a,b]of [[-18,-10],[0,7]])box(a,0,13,b,3,18,C.woodLight,3);for(const [x,c]of [[-15,C.accent],[-11,C.trim],[3,C.roof]])ellipsoid(x,5,15,2,2,2,c);});
  }else if(id==='winter-greenhouse'){
    house({w:35,d:19,h:14,rise:9,color:C.glass,roofColor:C.glass,windows:false});
    feature('雪の白い温室の縁',()=>{for(let x=-16;x<=16;x+=8){for(const z of [-9,9])paint(x,2,z,x,14,z,C.trim);for(let z=-11;z<=11;z++)put(x,14+Math.max(1,Math.round((1-Math.abs(x)/19)*9)),z,C.trim,3,true);}for(const z of [-11,11])for(let x=-19;x<=19;x++)put(x,14+Math.max(1,Math.round((1-Math.abs(x)/19)*9)),z,C.trim,3,true);});
    feature('暖房煙突と入り口の苗',()=>{chimney(20,-4,0,28,2);for(const x of [-9,9]){pot(x,0,15,3,4,C.stone);box(x,4,15,x,8,15,C.leaf,3);ellipsoid(x,8,15,3,2,3,C.leaf);}});
  }
  const access={"reindeer-stable":[0,2,10]};if(access[id])k.accessPoint(...access[id],'work / visitor aisle');
  return k.finish(id);
}


