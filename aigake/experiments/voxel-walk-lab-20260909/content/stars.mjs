import {workshop} from './kit.mjs';
import {mechanisms} from './mechanisms.mjs';
export const STARS_IDS=['planetarium','star-map-library','meteorite-lab','moon-garden','balloon-port'];
export function starsBlueprint(id,seed=41){
  if(!STARS_IDS.includes(id))throw Error(id);
  const k=workshop('stars',seed),{C,box,put,line,paint,disk,ellipsoid,house,roundHouse,hall,feature,opening,book,bench}=k,{ringFace}=mechanisms(k);
  if(id==='planetarium'){
    roundHouse({r:14,h:11,rise:15,cap:'dome'});
    feature('低い玄関庇と外壁の帯',()=>{k.awning({z:14,w:15,y:11,depth:4});disk(0,10,0,14,C.trim,3,'round',12.8);});
    feature('上映案内の小さな掲示板',()=>{box(-13,0,18,-13,5,18,C.wood,1);k.sign(-13,6,18,7,4);bench(5,0,18,8);});
  }else if(id==='star-map-library'){
    house({w:37,d:21,h:24,rise:1,floors:2,shape:'flat'});
    feature('三連の採光屋根',()=>{for(let x=-21;x<=21;x++){const lift=((x+21)%14)*.35;for(let z=-13;z<=13;z++)box(x,25,z,x,27+Math.round(lift),z,C.roof,2);}for(const x of [-8,6,20])for(const z of [-8,0,8])paint(x,28,z-2,x,30,z+2,C.glass,3);});
    feature('閲覧テラスの机',()=>{for(const x of [-11,11]){box(x-5,0,15,x+5,4,19,C.woodLight,3);book(x,5,16,3);}});
  }else if(id==='meteorite-lab'){
    house({x:-8,w:21,d:19,h:16,rise:5,shape:'shed'});
    feature('低い採光棟と試料の窓',()=>{house({x:13,z:1,w:17,d:17,h:11,rise:3,shape:'shed',color:C.glass,roofColor:C.trim,windows:false,door:false});for(const x of [5,21])paint(x,2,10,x,10,10,C.woodLight,3);});
    feature('試料の測定器',()=>{box(0,0,13,16,4,18,C.woodLight,3);box(6,5,15,7,12,15,C.wood,3);line([6,12,15],[11,10,15],C.trim,3,2);disk(9,5,15,3,C.stone,3);});
  }else if(id==='moon-garden'){
    disk(0,0,0,19,C.floor,0);
    feature('半円の回廊',()=>{for(let a=0;a<=24;a++){const t=Math.PI+a*Math.PI/24,x=Math.round(Math.cos(t)*16),z=Math.round(Math.sin(t)*13);box(x-2,17,z-2,x+2,19,z+2,C.roof,2);if(a%4===0)box(x,1,z,x,17,z,C.wood,1);}bench(-5,1,-10,10);});
    feature('庭へ入る木のパーゴラ',()=>{for(const x of [-9,9])box(x,0,12,x,13,15,C.wood,1);box(-11,13,12,11,14,15,C.woodLight,2);for(let x=-10;x<=10;x+=4)box(x,15,10,x,15,17,C.roof,3);});opening('moon-colonnade','屋外の庭と片側に開いた回廊');
  }else if(id==='balloon-port'){
    house({x:-7,w:23,d:17,h:15,rise:5,shape:'hip'});box(6,0,-9,21,1,10,C.floor,0);
    feature('測器を納める百葉箱',()=>{for(const x of [9,17])for(const z of [-5,3])box(x,2,z,x,13,z,C.wood,1);box(9,6,-5,17,7,3,C.trim,1);for(const y of [8,10,12]){box(9,y,-5,17,y,-5,C.trim,3);box(9,y,3,17,y,3,C.trim,3);box(9,y,-5,9,y,3,C.trim,3);box(17,y,-5,17,y,3,C.trim,3);}k.roof(13,-1,11,11,13,3,'hip',C.trim);});
    feature('観測記録の窓辺と風向計',()=>{k.window(-14,5,9,3,6);box(20,1,7,20,21,7,C.wood,1);box(17,21,7,23,21,7,C.trim,3);put(23,22,7,C.accent,3);bench(-19,0,14,7);});
  }
  const access={"moon-garden":[0,1,5]};if(access[id])k.accessPoint(...access[id],'work / visitor aisle');
  return k.finish(id);
}
