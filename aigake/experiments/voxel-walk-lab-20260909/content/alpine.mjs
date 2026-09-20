import {workshop} from './kit.mjs';
import {mechanisms} from './mechanisms.mjs';
export const ALPINE_IDS=['cable-station','mountain-lodge','ski-shop','climbing-gym','crystal-mine','bell-tower','stone-mason','cheese-cellar','avalanche-station','trail-refuge'];
export function alpineBlueprint(id,seed=41){
  if(!ALPINE_IDS.includes(id))throw Error(id);
  const k=workshop('alpine',seed),{C,box,put,line,paint,disk,ellipsoid,house,roundHouse,hall,feature,bench,stairs}=k,{wheel,ringFace,balcony}=mechanisms(k);
  if(id==='cable-station'){
    house({x:-12,w:13,d:19,h:22,rise:6,floors:2,windows:false});
    feature('索道の大滑車',()=>{for(const x of [1,21])box(x,0,-6,x,33,-6,C.stone,1);box(1,33,-6,21,35,-6,C.wood,1);wheel(11,32,-5,8);box(-5,39,-5,23,39,-5,C.dark,3);});
    feature('吊られた客車',()=>{box(11,19,-5,11,38,-5,C.dark,1);box(4,10,-4,18,11,6,C.wood,2);box(4,12,-4,18,16,6,C.accent,2);box(4,17,-4,18,23,6,C.glass,3);box(3,24,-5,19,25,7,C.roof,2);for(const x of [4,11,18])paint(x,17,7,x,23,7,C.trim);box(10,23,-5,12,26,-5,C.dark,1);});
    feature('乗車ホームと階段',()=>{box(3,11,7,21,11,12,C.floor,1);for(const x of [3,21])for(const z of [7,12])box(x,0,z,x,15,z,C.wood,1);for(const[a,b]of [[3,6],[16,21]])box(a,15,12,b,16,12,C.woodLight,3);for(const x of [3,21])box(x,15,7,x,16,12,C.woodLight,3);stairs(11,13,7,11,13);k.doorway(11,12,7,9,{name:'boarding door'});});
  }else if(id==='mountain-lodge'){
    box(-19,0,-13,26,0,17,C.floor,0);
    house({x:-5,w:27,d:25,h:26,rise:17,floors:2,roofColor:C.roof,foundationMargin:0});
    feature('側面のテラス席',()=>{k.table(19,1,0);k.chair(19,1,-8);k.chair(19,1,8,2);disk(19,8,0,2,C.trim,3);});
    feature('張り出す二階の縁側',()=>{balcony(-5,14,13,25);});
  }else if(id==='ski-shop'){
    house({w:23,d:17,h:15,rise:12});
    feature('雪を落とせる入口の庇',()=>{k.awning({z:9,w:17,y:12,depth:4});});
    feature('軒下の板の乾燥棚',()=>{box(14,0,-6,15,11,7,C.wood,1);for(const z of [-5,0,5]){box(16,0,z,17,13,z,C.woodLight,3);box(16,14,z,17,14,z+1,C.woodLight,3);}});
  }else if(id==='climbing-gym'){
    house({x:-7,w:17,d:17,h:34,rise:5,floors:3,shape:'shed',windows:false});
    feature('傾斜したクライミング壁',()=>{for(let y=0;y<=38;y++){const x=7+Math.floor(y/6);box(x,y,-8,x+3,y,9,C.stone,2);if(y%5===2)for(const z of [-5,2,7])box(x+4,y,z,x+4,y+1,z+1,(y+z)%3?C.accent:C.roof,3);}});
    feature('安全マットと確保ロープ',()=>{box(8,0,10,21,1,16,C.roof,3);for(const z of [-8,8]){box(3,0,z-1,5,1,z+1,C.stone,0);line([4,1,z],[12,33,z],C.wood,1,2);}line([16,38,7],[19,2,13],C.trim,3);});
  }else if(id==='crystal-mine'){
    house({x:-9,w:17,d:17,h:13,rise:9,roofColor:C.stone,color:C.stone,windows:false});
    feature('坑口の太い梁',()=>{paint(-14,2,9,-4,11,9,C.dark);for(const x of [-16,-2])box(x,0,10,x+1,15,12,C.wood,1);box(-16,15,10,-1,17,12,C.wood,1);});
    k.threshold(-9,2,9);
    feature('試料を仕分ける低い作業場',()=>{hall({x:12,z:1,w:15,d:13,h:11,rise:3,shape:'shed'});box(7,2,-2,18,4,4,C.woodLight,3);for(const x of [9,14,17])ellipsoid(x,6,1,1,1.5,1,'#a9bfc1');box(8,0,12,17,2,16,C.stone,3);});
  }else if(id==='bell-tower'){
    house({w:15,d:15,h:24,rise:1,shape:'flat',floors:2,windows:false});hall({w:15,d:15,y:25,h:18,rise:11,shape:'hip'});
    feature('開いた鐘室の大鐘',()=>{box(-1,35,-1,1,43,1,C.wood,1);for(let y=29;y<=37;y++)disk(0,y,0,Math.max(2,6-(y-29)*.5),C.accent,3,'round',Math.max(0,4-(y-29)*.5));box(0,27,0,0,36,0,C.dark,3);});
    feature('鐘を鳴らす綱と足場',()=>{box(3,1,1,3,40,1,C.woodLight,3);stairs(0,9,7,2,6);ringFace(0,17,8,3,C.trim);});
  }else if(id==='stone-mason'){
    hall({x:-5,w:29,d:21,h:23,rise:5,shape:'shed'});
    feature('石吊り梁と滑車',()=>{for(const x of [-20,18])box(x,0,13,x,29,13,C.wood,1);box(-20,29,13,18,31,13,C.wood,1);wheel(8,29,14,3);box(8,10,14,8,28,14,C.dark,3);box(3,5,10,13,11,18,C.stone,3);});
    feature('切石の積み場',()=>{for(const [x,y,z]of [[-17,2,6],[-7,2,6],[-12,7,6],[-15,0,16],[10,0,16]])box(x,y,z,x+7,y+4,z+5,C.stone,3);});
  }else if(id==='cheese-cellar'){
    house({w:31,d:19,h:11,rise:8,shape:'hip',color:C.stone,roofColor:C.ground,windows:false});
    feature('丸い蔵戸と石の輪',()=>{ringFace(0,7,11,6,C.trim,2);for(let x=-4;x<=4;x++)for(let y=-4;y<=4;y++)if(x*x+y*y<=20)put(x,y+7,11,C.wood,3);});
    k.threshold(0,2,11);
    feature('熟成チーズの輪',()=>{for(const x of [-11,11])box(x-5,0,14,x+5,3,19,C.woodLight,3);for(const x of [-11,11]){for(let y=4;y<=7;y++)disk(x,y,16,4,'#cfbf83',3);put(x+1,8,17,C.accent,3);}});
  }else if(id==='avalanche-station'){
    house({x:-5,w:17,d:15,h:24,rise:9,floors:2});
    feature('積雪の高さを読む雪尺',()=>{box(16,0,0,17,43,1,C.trim,1);for(let y=2;y<44;y+=4)paint(16,y,2,18,y+1,2,C.accent);});
    feature('屋根の小さな風向計',()=>{box(-5,31,0,-5,37,0,C.wood,1);box(-8,36,0,-2,36,0,C.trim,3);put(-2,37,0,C.roof,3);line([-5,37,0],[-5,37,3],C.woodLight,3);});
  }else if(id==='trail-refuge'){
    house({x:-4,w:19,d:17,h:10,rise:17,color:C.woodLight,roofColor:C.roof,windows:false});
    feature('三角小屋の入口の梁',()=>{line([-15,10,11],[-4,28,11],C.trim,3,2);line([-4,28,11],[7,10,11],C.trim,3,2);});
    feature('低い道標と休憩の丸太',()=>{box(15,0,9,15,11,9,C.wood,1);box(12,9,9,19,10,9,C.woodLight,3);box(11,6,9,18,7,9,C.trim,3);bench(-17,0,15,8);});
  }
  const access={"stone-mason":[-5,2,-3]};if(access[id])k.accessPoint(...access[id],'work / visitor aisle');
  return k.finish(id);
}

