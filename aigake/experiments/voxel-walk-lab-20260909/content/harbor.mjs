import {workshop} from './kit.mjs';
import {mechanisms} from './mechanisms.mjs';
export const HARBOR_IDS=['boathouse','fish-market','shipyard','crab-shack','net-loft','coastguard','sea-museum','harbor-inn','ferry-terminal','diving-hut','shell-chapel'];
export function harborBlueprint(id,seed=1429){
  if(!HARBOR_IDS.includes(id))throw Error('Unknown harbor building: '+id);
  const k=workshop('harbor',seed),{C,box,put,line,paint,ellipsoid,disk,house,roundHouse,hall,feature,bench}=k,{ringFace,clock,hull,fish,crate,lifebuoy,balcony}=mechanisms(k);
  if(id==='boathouse'){
    hall({z:-3,w:27,d:17,h:15,rise:9});
    box(-13,2,-11,13,14,-11,C.wall,2);for(const x of [-13,13])box(x,2,-11,x,14,5,C.wall,2);
    feature('引き出された小舟と舟台',()=>{box(-15,0,6,15,0,18,C.water,0);for(const z of [-2,10])box(-5,1,z,5,2,z+1,C.wood,0);hull(0,3,7,25,9,4,false,'z');});
    box(-12,1,5,-6,1,20,C.woodLight,0);for(const x of [-11,-7])for(const z of [8,16])box(x,0,z,x,1,z,C.wood,0);box(-12,0,21,-6,0,22,C.floor,0);
    box(-17,1,7,-10,1,10,C.woodLight,0);box(-18,0,7,-18,0,10,C.floor,0);
    feature('入口と櫂掛け',()=>{line([-11,13,6],[0,22,6],C.trim,3,2);line([0,22,6],[11,13,6],C.trim,3,2);for(const y of [8,13])box(-17,y,3,-13,y,3,C.wood,3);k.fitting('stored oar',()=>{box(-18,0,4,-16,4,4,C.woodLight,3);box(-17,4,4,-17,17,4,C.woodLight,3);box(-18,17,4,-16,17,4,C.woodLight,3);});});
  }else if(id==='fish-market'){
    hall({w:35,d:15,h:13,rise:5});
    feature('市場の低い案内板',()=>{box(-3,0,16,-3,6,16,C.wood,3);k.sign(-3,7,16,7,3);});
    feature('氷を詰めた魚箱',()=>{for(const x of [-15,-4,7]){crate(x,0,11,8,6,true);crate(x,2,-4,8,6,true);box(x,0,-4,x+8,1,2,C.woodLight,0);}for(const x of [-15,15])box(x,0,18,x,3,18,C.dark,3);});
    feature('縞の日除け',()=>{for(let x=-18;x<=18;x++)box(x,12,8,x,13,13,(Math.floor((x+18)/4)%2)?C.trim:C.roof,3);for(const x of [-18,18])box(x,0,13,x,12,13,C.wood,1);});
  }else if(id==='shipyard'){
    k.opening('dry-dock','造船中の船体と開放された吊り梁');
    box(-21,0,-12,21,1,15,C.floor,0);box(-22,0,-13,22,0,16,C.floor,0);
    feature('造りかけの船の骨格',()=>{for(const z of [-8,10])box(-6,2,z,6,3,z+1,C.wood,1);hull(0,4,2,31,13,8,true,'z');for(let z=17;z<=25;z++)box(-7,0,z,7,Math.floor((25-z)/4),z,C.woodLight,0);});
    feature('船を吊る作業梁',()=>{for(const x of [-19,19])for(const z of [-10,10])box(x,2,z,x+1,30,z+1,C.wood,1);for(const z of [-10,10])box(-19,29,z,20,32,z+2,C.roof,2);box(-19,29,-10,-17,30,11,C.woodLight,1);box(18,29,-10,20,30,11,C.woodLight,1);box(-2,29,-10,2,30,11,C.woodLight,1);box(0,13,0,0,29,0,C.dark,3);ringFace(0,13,0,3,C.dark,1);});
    feature('造船の作業机',()=>{bench(-17,2,12,12);crate(9,2,10,8,4);});
  }else if(id==='crab-shack'){
    box(-17,0,-11,24,0,14,C.floor,0);
    house({x:-6,w:19,d:15,h:12,rise:5,shape:'hip',roofColor:C.accent,foundationMargin:0});
    feature('潮風をよける低い庇',()=>{k.awning({x:-6,z:8,w:21,y:12,depth:4,color:'#b8a38b'});k.window(-12,4,8,3,5);k.window(0,4,8,3,5);});
    feature('側面のテラス席',()=>{k.table(16,1,0);k.chair(16,1,-8);k.chair(16,1,8,2);disk(16,8,0,2,C.trim);});
  }else if(id==='net-loft'){
    house({w:21,d:17,h:27,rise:6,shape:'shed',floors:2});
    feature('背面の網干し枠',()=>{for(const x of [-12,12])box(x,0,-11,x,25,-11,C.wood,1);for(const y of [2,25])box(-12,y,-11,12,y,-11,C.wood,1);for(let x=-10;x<=10;x+=3)box(x,3,-12,x,24,-12,C.woodLight,3);for(let y=3;y<=24;y+=3)box(-10,y,-12,11,y,-12,C.woodLight,3);});
    feature('巻いた網と浮き',()=>{for(const x of [-14,13]){ellipsoid(x,3,16,3,3,3,'#9eae9d');for(const z of [14,17])ellipsoid(x,5,z,1,1,1,C.trim);}});
  }else if(id==='coastguard'){
    house({x:-5,w:23,d:17,h:24,rise:5,floors:2});roundHouse({x:12,z:-3,r:5,h:34,rise:6,roofColor:C.accent});
    feature('入口脇の救命浮輪',()=>lifebuoy(-12,8,9,2));
    feature('見張り窓と救助ボート',()=>{k.window(12,25,2,5,6);box(10,33,2,14,33,5,C.trim,3);for(const z of [12,20])box(9,0,z,17,1,z,C.wood,0);hull(13,2,16,15,7,3,false,'z');});
  }else if(id==='sea-museum'){
    house({w:35,d:23,h:26,rise:7,floors:2});
    feature('石の柱と深い玄関庇',()=>{k.awning({z:12,w:31,y:13,depth:5,color:C.trim});for(const x of [-15,15])box(x-1,0,17,x+1,12,17,C.stone,1);});
    feature('標本展示の窓',()=>{k.window(0,17,12,15,7);for(const x of [-10,10]){box(x-3,0,16,x+3,2,20,C.stone,0);ellipsoid(x,4,18,2,2,1.5,'#b7c8bf');}});
  }else if(id==='harbor-inn'){
    house({w:19,d:17,h:36,rise:7,shape:'hip',floors:3,roofColor:C.roof});
    feature('三階まで続くバルコニー',()=>{balcony(0,13,9,23);balcony(0,26,9,23);});
    feature('鎧戸の客室窓',()=>{for(const x of [-6,6])k.window(x,29,9,3,5);lifebuoy(6,6,9,2);});
  }else if(id==='ferry-terminal'){
    box(-22,0,-9,23,0,16,C.water,0);box(-22,1,-8,22,2,8,C.woodLight,0);
    hall({x:-6,z:-1,w:27,d:13,h:13,y:2,rise:6,shape:'butterfly'});
    feature('船を待つ桟橋',()=>{box(8,2,8,22,2,17,C.woodLight,0);for(const x of [10,21])box(x,0,16,x,5,16,C.wood,1);for(const z of [-7,7])box(21,0,z,21,5,z,C.wood,1);bench(-16,3,1,12);});
    k.stairs(16,18,7,2,5);
    feature('船の時刻時計',()=>{box(-7,15,7,-5,20,7,C.wood,3);clock(-6,19,8,4);});
  }else if(id==='diving-hut'){
    house({w:19,d:17,h:13,rise:5,shape:'shed',roofColor:'#819b9b'});
    feature('器材を洗う軒下',()=>{k.awning({z:9,w:17,y:12,depth:4});k.window(-6,5,9,3,5);});
    feature('空気タンクと足ひれ',()=>{for(const x of [-13,-9]){for(let y=0;y<11;y++)disk(x,y,9,1.5,C.roof);box(x,11,9,x,13,9,C.woodLight,3);}for(const x of [9,12]){box(x,0,10,x+1,9,10,C.accent,3);box(x-1,0,10,x+2,3,11,C.accent,3);}});
  }else if(id==='shell-chapel'){
    house({w:23,d:21,h:16,rise:12,shape:'gable',roofColor:'#8a9693'});
    feature('切妻の縦長窓と玄関庇',()=>{k.window(0,18,11,5,7);k.awning({z:11,w:11,y:12,depth:3});});
    feature('入口脇の鐘と長椅子',()=>{k.fitting('entrance bell',()=>{box(-9,15,10,-9,15,13,C.wood,3);box(-9,14,13,-9,15,13,C.wood,3);ellipsoid(-9,12,13,2,2,2,C.accent);});for(const x of [-14,6])bench(x,0,17,8);});
  }
  const access={"boathouse":[-9,2,0],"fish-market":[0,2,-6],"shipyard":[-10,2,0],"ferry-terminal":[0,4,-3]};if(access[id])k.accessPoint(...access[id],'work / visitor aisle');
  return k.finish(id);
}
