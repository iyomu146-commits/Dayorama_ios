import {workshop} from './kit.mjs';
import {mechanisms} from './mechanisms.mjs';
export const SATOYAMA_IDS=['lantern-workshop','noodle-shop','tofu-shop','bathhouse','shrine','pagoda','rice-granary','sake-brewery','paper-workshop','bamboo-craft','bonsai-nursery','ryokan'];
export function satoyamaBlueprint(id,seed=41){
  if(!SATOYAMA_IDS.includes(id))throw Error(id);
  const k=workshop('satoyama',seed),{C,box,put,line,paint,disk,ellipsoid,house,roundHouse,hall,feature,roof,pot,stairs,chimney}=k,{balcony}=mechanisms(k);
  const lantern=(x,y,z,r=3)=>{box(x,y-r-2,z,x,y+r+2,z,C.wood,3);ellipsoid(x,y,z,r,r+1,r,C.trim);disk(x,y-r,z,r-1,C.accent,3);disk(x,y+r,z,r-1,C.accent,3);};
  const curved=(x,z,w,d,y,rise)=>{roof(x,z,w,d,y,rise,'gable');const hx=Math.floor(w/2)+2,hz=Math.floor(d/2)+2;for(const a of [-hx,hx])for(let b=-hz;b<=hz;b++){box(x+a,y+1,z+b,x+a,y+3,z+b,C.roof,2);box(x+a+Math.sign(a),y+3,z+b,x+a+Math.sign(a),y+4,z+b,C.roof,2);}};
  const trough=(x,z,w=13)=>{box(x,0,z,x+w,1,z+7,C.woodLight,3);for(const a of [0,w])box(x+a,2,z,x+a,5,z+7,C.wood,3);for(const b of [0,7])box(x,2,z+b,x+w,5,z+b,C.wood,3);box(x+1,2,z+1,x+w-1,3,z+6,C.water,3);};
  if(id==='lantern-workshop'){
    house({w:17,d:25,h:24,rise:7,floors:2});
    feature('軒の丸い提灯',()=>{box(-10,19,14,10,19,15,C.wood,1);for(const x of [-7,0,7])lantern(x,14,15,2);});
    feature('提灯を張る外の棚',()=>{box(13,0,-7,14,18,8,C.wood,1);box(13,18,-7,19,18,8,C.woodLight,3);for(const z of [-4,4]){box(18,14,z,18,18,z,C.wood,3);lantern(18,10,z,3);}});
  }else if(id==='noodle-shop'){
    house({w:21,d:15,h:13,rise:6});
    feature('採光窓と小さな入口庇',()=>{k.awning({z:8,w:19,y:12,depth:3});for(const x of [-7,7])k.window(x,4,8,3,5);});
    feature('暖簾と麺打ち台',()=>{box(-9,11,9,9,12,9,C.wood,3);for(const x of [-7,4])box(x,7,9,x+3,10,9,C.accent,3);box(13,0,-2,19,5,10,C.woodLight,3);box(14,6,0,18,6,6,C.trim,3);});
  }else if(id==='tofu-shop'){
    house({x:-5,w:23,d:17,h:14,rise:7,shape:'hip'});
    feature('木の豆腐水槽',()=>{trough(1,12,15);for(const x of [4,10])box(x,4,14,x+3,6,17,C.trim,3);});
    feature('木の作業台と豆腐型',()=>{box(12,0,-5,20,4,5,C.woodLight,3);for(const z of [-3,2]){box(14,5,z,18,5,z+2,C.wood,3);box(15,6,z,17,7,z+2,C.trim,3);}});
  }else if(id==='bathhouse'){
    house({w:35,d:25,h:25,rise:10,floors:2,shape:'hip'});
    feature('唐破風の玄関',()=>{for(const x of [-10,10])box(x,0,18,x,15,18,C.wood,1);for(let x=-12;x<=12;x++){const h=16+Math.round(5*Math.exp(-((x/5)**2)))-Math.round(2*Math.exp(-(((Math.abs(x)-9)/3)**2)));box(x,14,13,x,h,19,C.roof,2);put(x,h+1,20,C.trim,3);}});
    feature('高い湯屋の煙突',()=>{chimney(20,-9,0,45,3);for(let y=7;y<=35;y+=7)box(19,y,-10,23,y,-6,C.accent,3);});
  }else if(id==='shrine'){
    house({w:15,d:15,h:14,rise:9,windows:false});curved(0,0,15,15,14,9);
    feature('鳥居の門',()=>{for(const x of [-14,14])box(x,0,17,x+1,23,18,C.accent,1);box(-18,23,17,18,25,18,C.dark,3);box(-16,19,17,16,20,18,C.accent,3);box(-2,20,17,2,23,18,C.accent,3);});
    feature('拝殿の鈴と賽銭箱',()=>{box(0,10,10,0,17,10,C.woodLight,3);ellipsoid(0,15,10,2,2,2,C.accent);box(5,0,11,13,4,14,C.wood,3);for(let x=6;x<=12;x+=2)box(x,5,11,x,5,14,C.woodLight,3);});
  }else if(id==='pagoda'){
    house({w:19,d:19,h:13,rise:7,windows:false});curved(0,0,19,19,13,7);
    house({w:13,d:13,y:19,h:12,rise:6,windows:false,door:false});curved(0,0,13,13,31,6);
    house({w:9,d:9,y:36,h:11,rise:5,windows:false,door:false});curved(0,0,9,9,47,5);
    feature('相輪の九輪',()=>{box(0,49,0,0,64,0,C.wood,1);for(let y=54;y<=62;y+=2)disk(0,y,0,3-(y-54)*.18,C.accent,3);});
    feature('三層の高欄',()=>{for(const [y,r]of [[6,11],[28,8],[44,6]])for(const z of [-r,r]){box(-r,y-4,z-1,r,y-4,z+1,C.woodLight,1);box(-r,y-4,Math.min(z,0),-r,y-4,Math.max(z,0),C.woodLight,1);box(r,y-4,Math.min(z,0),r,y-4,Math.max(z,0),C.woodLight,1);box(-r,y,z,r,y,z,C.woodLight,3);for(let x=-r;x<=r;x+=3)box(x,y-3,z,x,y,z,C.wood,3);}});
    for(const[key,c]of k.v.cells)if(c.z===11&&Math.abs(c.x)<=3&&c.y>=3&&c.y<=6)k.v.cells.delete(key);stairs(0,13,7,2,5);
  }else if(id==='rice-granary'){
    for(const x of [-12,12])for(const z of [-7,7]){box(x-1,0,z-1,x+1,10,z+1,C.wood,1);disk(x,8,z,4,C.woodLight,3);}
    house({w:29,d:19,y:10,h:15,rise:12,windows:false});
    feature('高床へ上がる梯子',()=>{stairs(0,11,5,11,12);});
    feature('米俵と鼠返し',()=>{for(const x of [-9,8])ellipsoid(x,13,12,4,3,2,C.woodLight);box(-13,0,-8,13,0,8,C.stone,0);});
  }else if(id==='sake-brewery'){
    house({w:35,d:23,h:26,rise:11,floors:2,windows:false});
    feature('軒の控えめな杉玉',()=>{box(0,22,12,0,27,12,C.wood,1);ellipsoid(0,20,12,3,3,2,C.leaf);});
    feature('並ぶ醸造樽',()=>{for(const x of [-13,13]){for(let y=0;y<=10;y++)disk(x,y,17,4,C.woodLight,3);for(const y of [2,8])disk(x,y,17,5,C.wood,3,'round',3);}});
  }else if(id==='paper-workshop'){
    house({x:-7,w:25,d:17,h:13,rise:6,shape:'shed'});
    feature('軒と同じ高さの紙干し枠',()=>{for(const x of [10,20])box(x,0,0,x,13,0,C.wood,1);box(10,13,0,20,14,0,C.wood,1);box(11,4,0,19,12,0,C.trim,3);for(const x of [13,17])paint(x,4,1,x,12,1,C.woodLight);});
    feature('紙すきの水槽と簀桁',()=>{trough(0,12,18);box(3,6,13,13,6,18,C.trim,3);for(let x=4;x<13;x+=2)box(x,7,13,x,7,18,C.woodLight,3);});
  }else if(id==='bamboo-craft'){
    house({w:23,d:17,h:15,rise:7,shape:'hip'});
    feature('斜めに編んだ竹の庇',()=>{for(const x of [-14,14])box(x,0,18,x,14,18,C.wood,1);box(-14,14,9,14,14,18,C.woodLight,2);for(let x=-20;x<=20;x+=4)for(let z=9;z<=18;z++){const xx=x+z-9;if(xx>=-14&&xx<=14)put(xx,15,z,'#a5b68b',3);}for(let x=-20;x<=20;x+=5)for(let z=9;z<=18;z++){const xx=x-z+9;if(xx>=-14&&xx<=14)put(xx,16,z,C.trim,3);}});
    feature('切った竹と編み籠',()=>{for(const x of [17,20])box(x,0,-6,x,22,-6,C.leaf,3);pot(18,0,6,4,7,C.woodLight);});
  }else if(id==='bonsai-nursery'){
    hall({w:37,d:19,h:22,rise:5,shape:'shed'});
    feature('段々の盆栽棚',()=>{for(const [z,y]of [[9,3],[1,6],[-7,9]]){box(-17,2,z-2,17,y,z+2,C.wood,1);for(const x of [-12,0,12]){pot(x,y+1,z,2,2,C.stone);line([x,y+3,z],[x+2,y+7,z],C.wood,3);ellipsoid(x+2,y+8,z,3,1.5,3,C.leaf);}}});
    feature('店先の曲がった老松',()=>{pot(0,0,17,5,4,C.stone);line([0,4,17],[-5,10,17],C.wood,3,2);line([-5,10,17],[1,14,17],C.wood,3);ellipsoid(1,14,17,6,2,3,C.leaf);});
  }else if(id==='ryokan'){
    house({w:33,d:23,h:27,rise:8,floors:2});
    feature('二層の縁側',()=>{balcony(0,2,12,33,{gate:9,door:false});stairs(0,17,7,2,5);balcony(0,15,12,33);roof(0,14,33,5,26,3,'shed');});
    feature('格子の玄関と行灯',()=>{for(let x=-4;x<=4;x+=2)box(x,3,12,x,13,12,C.woodLight,3);k.threshold(0,3,12);for(const x of [-13,13]){box(x,2,19,x,8,19,C.wood,3);lantern(x,6,19,2);}});
  }
  const access={"bonsai-nursery":[0,2,5]};if(access[id])k.accessPoint(...access[id],'work / visitor aisle');
  return k.finish(id);
}
