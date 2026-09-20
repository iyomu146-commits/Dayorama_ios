import {workshop} from './kit.mjs';
import {mechanisms} from './mechanisms.mjs';
export const OASIS_IDS=['caravanserai','oasis-well','date-market','carpet-weaver','spice-house','sundial-house','adobe-school','irrigation-house'];
export function oasisBlueprint(id,seed=41){
  if(!OASIS_IDS.includes(id))throw Error(id);
  const k=workshop('oasis',seed),{C,box,put,line,paint,disk,ellipsoid,house,roundHouse,hall,feature,opening,pot,bench}=k,{wheel}=mechanisms(k);
  if(id==='caravanserai'){
    // Low side wings and a wide court keep its floor visible from the town
    // camera. Only the rear lodging block has a second storey.
    for(const x of [-20,20])house({x,w:11,d:29,h:14,rise:1,shape:'flat',door:false,windows:false});
    house({z:-12,w:29,d:7,h:24,rise:1,floors:2,shape:'flat',door:false,windows:false});
    k.sideDoor(-15,2,1,1);k.sideDoor(15,2,1,-1);k.doorway(0,2,-9);
    for(const side of [-1,1]){
      for(const z of [-5,7])k.window(side*15,5,z,3,5,true);
      for(const z of [-7,5])k.window(side*25,5,z,3,5,true);
      k.window(side*20,5,14,5,5);
      for(const y of [5,17])k.window(side*9,y,-9,5,5);
    }
    feature('舗装した中庭と低い門',()=>{
      box(-14,0,-8,14,0,16,C.floor,0);
      paint(-13,0,-7,13,0,12,'#b9a58c',0);
      paint(-3,0,3,3,0,16,C.floor,0);
      for(const x of [-15,13])box(x,1,13,x+2,11,14,C.wall,1);
      for(let x=-12;x<=12;x++){
        const under=8+Math.round(2*Math.sqrt(Math.max(0,1-(x/12)**2)));
        box(x,under,13,x,11,14,C.wall,2);
      }
      for(const x of [-12,-6,6,12])box(x,26,-14,x+1,27,-13,C.wall,3);
    });
    feature('中庭の水盤と入口の壺',()=>{
      disk(0,1,-1,4,C.stone,3);disk(0,2,-1,4,C.accent,3,'round',2.5);disk(0,2,-1,2,C.water,3);
      for(const x of [-20,20])pot(x,0,18,3,6);
    });
    opening('courtyard','低い両翼と奥の宿泊棟、門で囲む屋外の中庭',{sky:{min:[-12,3,-6],max:[12,3,11]}});
  }else if(id==='oasis-well'){
    hall({w:21,d:21,h:17,rise:1,shape:'flat'});for(let y=18;y<=27;y++)disk(0,y,0,12*Math.sqrt(Math.max(.015,1-((y-18)/10)**2)),C.roof,2);
    feature('日陰の釣瓶井戸',()=>{for(let y=2;y<=8;y++)disk(0,y,0,5,C.stone,3,'round',3);box(-7,2,0,-7,15,0,C.wood,1);box(7,2,0,7,15,0,C.wood,1);box(-7,15,0,7,15,0,C.wood,1);box(0,6,0,0,15,0,C.woodLight,3);pot(0,5,0,2,3,C.woodLight);});
    feature('水を待つ素焼きの壺',()=>{for(const x of [-8,8])pot(x,0,15,3,6,C.wall);});
  }else if(id==='date-market'){
    hall({w:39,d:17,h:16,rise:5,shape:'butterfly'});
    feature('乾果の山と天秤',()=>{box(-17,2,3,17,6,8,C.woodLight,3);for(const x of [-12,0,12]){disk(x,7,5,4,C.trim,3);ellipsoid(x,9,5,3,2,2,C.accent);}box(0,7,6,0,17,6,C.wood,3);box(-6,16,6,6,16,6,C.wood,3);for(const x of [-6,6]){box(x,12,6,x,16,6,C.woodLight,3);disk(x,12,6,2,C.accent,3);}});
    feature('布の日除けの房',()=>{for(let x=-18;x<=18;x+=3)box(x,13,10,x,17+Math.round(Math.abs(x)/5),10,C.trim,3);});
  }else if(id==='carpet-weaver'){
    house({x:-7,w:21,d:17,h:25,rise:1,shape:'flat',floors:2});
    feature('作業場に納まる縦の織機',()=>{for(const x of [8,20])box(x,0,7,x,16,7,C.wood,1);box(8,16,7,20,17,7,C.wood,1);box(8,2,7,20,3,7,C.wood,1);for(let x=10;x<20;x++)for(let y=4;y<16;y++)put(x,y,7,Math.abs(x-14)+Math.abs(y-10)<5?C.accent:((x+y)%4?C.trim:C.roof),3);});
    feature('店先に掛けた敷物',()=>{for(const x of [-17,1]){box(x,0,12,x+5,12,12,C.roof,3);paint(x+1,2,13,x+4,10,13,C.accent);box(x,12,9,x+5,12,12,C.wood,3);}});
  }else if(id==='spice-house'){
    roundHouse({x:-5,r:11,h:15,rise:9,cap:'dome'});
    feature('三色の香辛料の円錐',()=>{for(const[a,b]of [[-19,-10],[1,21]])box(a,0,15,b,4,20,C.wall,3);for(const [x,color]of [[-15,'#c0956e'],[6,'#c8b778'],[16,'#b98676']])for(let y=5;y<=11;y++)disk(x,y,17,Math.max(0,4-(y-5)*.6),color,3);});
    feature('軒下の計量壺',()=>{pot(15,0,0,3,6,C.accent);disk(15,5,0,4,C.trim,3,'round',2);});
  }else if(id==='sundial-house'){
    house({w:19,d:19,h:25,rise:1,floors:2,shape:'flat',color:C.wall});
    feature('屋上テラスと小さな日時計',()=>{for(const z of [-9,9]){for(const x of [-9,-3,3,9])box(x,27,z,x,30,z,C.wall,3);box(-9,30,z,9,30,z,C.wall,3);}disk(0,27,0,4,C.trim,3);for(let z=-2;z<=2;z++)box(0,28,z,0,28+(2-z),z,C.accent,3);});
    feature('外階段と測量棒',()=>{paint(-11,26,-11,11,26,11,C.floor,1);k.stairs(15,-6,5,26,27);box(10,26,-10,17,26,-6,C.floor,1);box(10,30,-10,17,31,-10,C.wall,3);box(17,27,-10,17,31,-10,C.wall,3);box(17,30,-10,17,31,-6,C.wall,3);for(const x of [-10,10])for(let z=-9;z<=9;z++){if(x===10&&z>=-8&&z<=-4)continue;box(x,30,z,x,31,z,C.wall,3);if(z%3===0)box(x,27,z,x,29,z,C.wall,3);}box(-14,0,6,-14,19,6,C.wood,3);k.accessPoint(0,27,6,'roof terrace');});
  }else if(id==='adobe-school'){
    house({w:39,d:17,h:14,rise:1,shape:'flat',windows:false});
    feature('土のアーチの学び廊下',()=>{for(const x of [-15,-5,5,15]){for(const a of [-4,4])box(x+a,0,15,x+a,12,15,C.wall,1);for(let a=-4;a<=4;a++){const under=9+Math.round(3*Math.sqrt(Math.max(0,1-(a/4)**2)));box(x+a,under,14,x+a,15,16,C.wall,2);}}});
    feature('黒板と低い机',()=>{box(7,2,10,15,9,10,C.wood,3);paint(8,4,11,14,8,11,C.dark);box(-15,0,11,-7,3,14,C.woodLight,3);});
  }else if(id==='irrigation-house'){
    house({x:-6,z:-6,w:17,d:11,h:14,rise:5,shape:'hip'});
    feature('三方に分かれる水樋',()=>{for(let z=1;z<=18;z++)for(const side of [-1,0,1]){const x=Math.round(side*(z-1)*.85);box(x-2,0,z,x+2,2,z,C.stone,0);paint(x-1,2,z,x+1,2,z,C.water);}box(-4,0,0,4,6,3,C.stone,1);paint(-2,6,0,2,6,3,C.water);});
    feature('水を分ける操作輪',()=>{box(10,0,0,10,14,0,C.wood,1);wheel(10,15,1,5);line([10,14,0],[0,8,0],C.wood,3);});
  }
  const access={"oasis-well":[0,2,7],"date-market":[0,2,-2]};if(access[id])k.accessPoint(...access[id],'work / visitor aisle');
  return k.finish(id);
}
