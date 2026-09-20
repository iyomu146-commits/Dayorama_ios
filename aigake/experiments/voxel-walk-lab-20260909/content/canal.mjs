import {workshop} from './kit.mjs';
import {mechanisms} from './mechanisms.mjs';
export const CANAL_IDS=['canal-lock','watermill','bridge-house','clockmaker','post-office','glassworks','flower-barge','music-school','antique-shop','washhouse'];
export function canalBlueprint(id,seed=314){
  if(!CANAL_IDS.includes(id))throw Error('Unknown canal building: '+id);
  const k=workshop('canal',seed),{C,box,put,line,paint,ellipsoid,disk,house,roundHouse,hall,feature,opening,pot,flower}=k,{ringFace,wheel,clock,hull,crate}=mechanisms(k);
  if(id==='canal-lock'){
    box(-21,0,-11,21,0,16,C.water,0);for(const x of [-20,10])box(x,1,-10,x+10,2,15,C.stone,0);
    house({x:-14,z:-2,w:11,d:11,y:2,h:13,rise:5,windows:false});k.stairs(-15,15,7,2,5);
    feature('二枚の水門扉',()=>{for(let y=0;y<=14;y++)for(let x=-8;x<=8;x++){const z=8-Math.round(Math.abs(x)/2);paint(x,y,z,x,y,z,C.wood,2);}for(const x of [-8,8])box(x,1,4,x,18,4,C.woodLight,1);for(const y of [3,13]){line([-8,y,5],[0,y,9],C.dark,3);line([0,y,9],[8,y,5],C.dark,3);}});
    feature('水門の巻上げ輪',()=>{for(const x of [-10,10]){box(x,2,8,x,14,8,C.wood,1);wheel(x,15,9,4);line([x,15,8],[x<0?-8:8,15,4],C.dark,3);}});
    opening('sluice','水門の下流・上流へ開いた水路');
  }else if(id==='watermill'){
    house({x:-5,w:21,d:19,h:24,rise:8,floors:2});
    feature('大きな水車と水路',()=>{box(8,0,-15,17,0,15,C.water,0);box(5,12,0,13,13,0,C.wood,1);wheel(12,12,0,12,'x');for(let i=0;i<12;i++){const t=i*Math.PI/6,y=12+Math.round(Math.sin(t)*12),z=Math.round(Math.cos(t)*12);paint(10,y,z-1,14,y+1,z+1,C.woodLight,3);}});
    feature('粉袋の積み場',()=>{for(const[x,z]of [[-14,13],[3,13]]){ellipsoid(x,3,z,3,3,2,C.trim);box(x-1,6,z-1,x+1,6,z+1,C.woodLight,3);}});
  }else if(id==='bridge-house'){
    box(-18,0,-11,18,0,12,C.water,0);
    for(let x=-17;x<=17;x++){const under=Math.abs(x)<10?Math.ceil(9*Math.sqrt(1-(x/10)**2)):1;box(x,under,-8,x,13,8,C.stone,x%4===0?1:0);}
    house({w:23,d:13,y:13,h:15,rise:7});
    feature('通り抜ける石のアーチ',()=>{for(const z of [-9,9])for(let x=-11;x<=11;x++){const y=2+Math.round(9*Math.sqrt(Math.max(0,1-(x/11)**2)));box(x,y,z,x,y+1,z,C.trim,2);}});
    feature('橋の欄干',()=>{for(const z of [-9,9]){for(let x=-17;x<=17;x+=4)box(x,13,z,x,17,z,C.woodLight,3);box(-17,17,z,17,17,z,C.woodLight,3);}});
    for(const [key,c]of k.v.cells)if(c.z===9&&c.y>13&&c.y<=17)k.v.cells.delete(key);
    paint(-17,13,9,18,13,12,C.stone,1);for(const x of [-17,18])box(x,0,12,x,13,12,C.stone,1);box(-17,18,12,10,18,12,C.woodLight,3);for(let x=-17;x<=10;x+=3)box(x,14,12,x,17,12,C.woodLight,3);k.stairs(15,13,7,13,14);
    opening('bridge-arch','水路が下を通る石橋の開口');
  }else if(id==='clockmaker'){
    house({w:17,d:17,h:38,rise:8,floors:3,shape:'hip'});
    feature('入口上の小さな時計',()=>clock(0,17,9,2));
    feature('細い縦窓と窓庇',()=>{for(const y of [20,31]){k.window(0,y,9,5,5);box(-4,y+5,9,4,y+5,11,C.roof,3);}k.awning({z:9,w:11,y:12,depth:3});});
    feature('修理する小時計',()=>{for(const x of [-7,7]){box(x-3,0,12,x+3,4,16,C.woodLight,3);clock(x,7,15,2);}});
  }else if(id==='post-office'){
    house({w:29,d:19,h:25,rise:7,floors:2,shape:'gambrel',roofColor:'#a78e7c'});
    feature('集配口の水平の庇',()=>{k.awning({z:10,w:21,y:13,depth:6,color:C.roof});});
    feature('投函箱と仕分け荷物',()=>{box(-18,0,12,-14,8,16,'#b98c76',3);paint(-17,6,17,-15,6,17,C.dark);for(const[x,y,z]of [[11,0,13],[15,0,15],[12,4,14]]){box(x,y,z,x+3,y+3,z+3,'#c4b392',3);box(x+1,y+4,z,x+1,y+4,z+3,C.trim,3);}});
  }else if(id==='glassworks'){
    house({x:-8,w:19,d:17,h:14,rise:7,shape:'shed'});roundHouse({x:12,z:-3,r:6,h:12,rise:7,cap:'dome',color:C.stone,roofColor:C.stone,door:false,windows:false});
    feature('炉につながる煉瓦の煙突',()=>{box(11,14,-4,13,27,-2,C.stone,2);box(10,28,-5,14,28,-1,C.trim,3);ringFace(12,7,4,3,C.accent);paint(10,5,3,14,9,3,C.dark);});
    feature('吹きガラスの展示台',()=>{box(-1,0,12,19,3,17,C.woodLight,3);for(const[x,color]of [[2,'#93b8b6'],[9,'#b2a3c0'],[16,'#c5b781']]){ellipsoid(x,6,14,3,3,2.5,color);box(x,9,14,x,11,14,color,3);}});
  }else if(id==='flower-barge'){
    hull(0,0,0,43,19,7);box(-23,0,-12,23,0,14,C.water,0);
    house({w:31,d:13,y:7,h:12,rise:6,color:C.glass,roofColor:C.glass,windows:false,door:false});
    k.doorway(0,9,-6,9,{name:'landward entrance'});
    box(-4,8,-12,4,8,-7,C.woodLight,1);
    for(let i=0;i<9;i++)box(-3,0,-13-i,3,8-i,-13-i,C.woodLight,0);
    for(const x of [-4,4]){box(x,9,-12,x,12,-7,C.wood,3);box(x,13,-12,x,13,-7,C.woodLight,3);}
    feature('船の上の温室',()=>{for(let x=-14;x<=14;x+=7){for(let z=-8;z<=8;z++)put(x,19+Math.max(1,Math.round(6*(1-Math.abs(x)/17))),z,C.trim,3,true);for(const z of [-6,6])paint(x,9,z,x,18,z,C.trim);}});
    feature('船首と船尾の苗の棚',()=>{for(const x of [-19,19]){pot(x,7,0,2,3);flower(x,10,0,'#d7b5c0',4);}for(const x of [-9,9]){box(x-2,2,10,x+2,5,12,C.woodLight,3);flower(x,6,11,'#d0c3a2',3);}});
  }else if(id==='music-school'){
    house({x:-4,w:27,d:19,h:24,rise:7,floors:2});house({x:15,z:-3,w:7,d:9,h:17,rise:5,shape:'shed',windows:false,door:false});
    feature('練習室の縦窓',()=>{for(const x of [-12,4])k.window(x,15,10,3,7);k.window(15,6,2,3,7);});
    feature('小さな玄関ポーチ',()=>{box(-13,0,10,7,1,16,C.stone,0);box(-8,0,17,0,0,19,C.floor,0);k.awning({x:-4,z:10,w:13,y:12,depth:5});});
  }else if(id==='antique-shop'){
    house({x:-4,w:17,d:15,h:27,rise:8,shape:'gambrel',floors:2});
    feature('出窓と古道具の陳列棚',()=>{k.shutters(-4,18,8,5,6);box(9,0,2,18,2,8,C.wood,3);box(9,3,2,18,10,8,C.glass,2);box(8,11,1,19,12,9,C.roof,2);for(const x of [9,14,18])paint(x,3,9,x,10,9,C.woodLight,3);clock(-4,12,8,2);});
    feature('古い蓄音機',()=>{box(-18,0,12,-10,3,18,C.woodLight,3);disk(-14,4,15,3,C.dark);box(-11,4,12,-11,8,12,C.accent,3);for(let y=8;y<=11;y++)disk(-11,y,12,1+(y-8)*.4,C.accent,3,'round',Math.max(-1,(y-8)*.4-1));});
  }else if(id==='washhouse'){
    hall({w:39,d:17,h:14,rise:6,shape:'hip'});
    feature('並んだ洗い槽',()=>{for(const x of [-16,-6,4,14]){box(x-3,2,-4,x+3,2,4,C.stone,2);for(const a of [-3,3])box(x+a,3,-4,x+a,6,4,C.stone,2);for(const z of [-4,4])box(x-3,3,z,x+3,6,z,C.stone,2);box(x-2,3,-3,x+2,4,3,C.water,3);box(x,6,-4,x,9,-4,C.woodLight,3);}});
    feature('物干しの布',()=>{for(const x of [-20,20])box(x,0,13,x,18,13,C.wood,1);box(-20,18,13,20,18,13,C.woodLight,3);for(const x of [-14,-5,4,13])box(x-2,9,13,x+3,17,13,x%2?C.trim:'#a8b9b4',3);});
  }
  const access={"washhouse":[-1,2,6]};if(access[id])k.accessPoint(...access[id],'work / visitor aisle');
  const result=k.finish(id);if(id==='flower-barge')for(const e of result.audit.entrances)e.normal=[0,-1];return result;
}
