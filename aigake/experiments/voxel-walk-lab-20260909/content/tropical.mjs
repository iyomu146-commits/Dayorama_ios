import {workshop} from './kit.mjs';
import {mechanisms} from './mechanisms.mjs';
export const TROPICAL_IDS=['stilt-house','fruit-bar','turtle-rescue','coral-lab','surf-school','palm-weaver','butterfly-dome','canopy-station'];
export function tropicalBlueprint(id,seed=41){
  if(!TROPICAL_IDS.includes(id))throw Error(id);
  const k=workshop('tropical',seed),{C,box,put,line,paint,disk,ellipsoid,house,roundHouse,hall,feature,opening,stairs,pot,bench}=k,{balcony}=mechanisms(k);
  if(id==='stilt-house'){
    box(-16,0,-15,16,0,11,C.water,0);
    for(const x of [-11,11])for(const z of [-11,5])box(x,0,z,x+1,13,z+1,C.wood,1);
    house({z:-3,w:25,d:19,y:13,h:15,rise:10});
    feature('潮の上の長い支柱と階段',()=>{stairs(0,12,7,13,15);for(const z of [-11,5]){line([-11,0,z],[12,13,z],C.woodLight,1);line([12,0,z],[-11,13,z],C.woodLight,1);}});
    feature('海を眺める縁台',()=>{balcony(0,13,7,25,{gate:9,door:false});pot(-9,14,10,2,3);box(-9,17,10,-9,23,10,C.leaf,3);ellipsoid(-9,23,10,3,2,3,C.leaf);});
  }else if(id==='fruit-bar'){
    hall({w:25,d:17,h:13,rise:5,shape:'hip'});box(-12,2,-8,12,12,-8,C.woodLight,2);
    feature('風の通るカウンター庇',()=>{k.awning({z:9,w:27,y:11,depth:5,color:'#b8b28f'});k.sign(0,10,-7,5,3);});
    feature('ジュースのカウンター',()=>{box(-11,0,12,11,4,17,C.wood,3);for(const x of [-7,0,7]){put(x,5,14,C.trim,3);put(x,6,14,C.woodLight,3);}});
  }else if(id==='turtle-rescue'){
    house({z:-2,w:31,d:19,h:11,rise:5,shape:'hip',windows:false});
    feature('水槽を見守る横長窓と日除け',()=>{for(const x of [-10,10])k.window(x,4,8,7,5);k.awning({z:8,w:31,y:12,depth:6});});
    feature('浅い保護水槽',()=>{box(-18,0,17,18,2,24,C.stone,0);paint(-16,2,18,16,2,23,C.water);});
  }else if(id==='coral-lab'){
    house({x:-10,w:17,d:19,h:16,rise:6,shape:'flat'});
    feature('横長の珊瑚育成水槽',()=>{box(1,0,-7,23,2,11,C.stone,0);box(2,3,-6,22,9,10,C.glass,2);for(const x of [1,23])box(x,3,-7,x,11,11,C.trim,1);box(1,11,-7,23,11,-7,C.trim,3);box(1,11,11,23,11,11,C.trim,3);});
    feature('水面の小さな珊瑚の苗',()=>{for(const x of [7,17]){box(x,10,2,x,13,2,C.accent,3);for(const s of [-1,1])line([x,11,2],[x+s*2,13,2],C.accent,3);}});
  }else if(id==='surf-school'){
    house({w:25,d:17,h:13,rise:6,shape:'shed',windows:false});
    feature('片流れの屋根と通風窓',()=>{k.awning({z:9,w:27,y:12,depth:4});for(const x of [-7,7])k.window(x,5,9,5,5);});
    feature('軒下に並ぶサーフボード',()=>{for(const [x,z,h,c]of [[16,-4,13,C.accent],[19,0,15,C.trim],[16,5,12,C.roof]]){box(x,0,z,x+1,h-2,z,c,3);put(x,h-1,z,c,3);put(x,h,z,c,3);}box(14,6,-5,20,7,6,C.wood,1);});
  }else if(id==='palm-weaver'){
    hall({w:23,d:19,h:15,rise:10,shape:'hip'});
    feature('椰子葉を編んだ庇',()=>{for(let x=-13;x<=13;x+=3){for(let z=-11;z<=11;z++){const y=15+Math.max(1,Math.round(Math.min(1-Math.abs(x)/13,1-Math.abs(z)/11)*10));put(x,y,z,C.woodLight,3,true);}}});
    feature('作業用の編み籠と座席',()=>{for(const x of [-4,4])pot(x,2,0,3,4,C.woodLight);bench(-9,0,15,18);});
  }else if(id==='butterfly-dome'){
    for(const x of [-10,10])house({x,w:17,d:19,h:13,rise:7,color:C.glass,roofColor:C.glass,windows:false,door:false});
    feature('二棟をつなぐ低い入口',()=>{house({z:5,w:7,d:13,h:10,rise:3,color:C.trim,roofColor:C.roof,windows:false});});
    feature('二連の温室の細い白枠',()=>{for(const cx of [-10,10]){for(const z of [-11,11])for(let x=-10;x<=10;x++)put(cx+x,13+Math.max(1,Math.round((1-Math.abs(x)/10)*7)),z,C.trim,3,true);for(const x of [-8,0,8])for(const z of [-9,9])paint(cx+x,2,z,cx+x,12,z,C.trim,3);}});
  }else if(id==='canopy-station'){
    for(const [x,h]of [[-15,20],[15,30]]){box(x-1,0,-1,x+1,h,1,C.wood,1);for(const s of [-1,1])line([x,0,0],[x+s*6,h-3,0],C.wood,1,2);hall({x,w:13,d:15,y:h,h:12,rise:7,shape:'hip'});}
    feature('二つの床を結ぶ吊り橋',()=>{for(let x=-8;x<=8;x++){const y=21+Math.round((x+8)*10/16);box(x,y,-2,x,y,3,C.woodLight,1);for(const z of [-3,4]){box(x,y+4,z,x,y+5,z,C.wood,3);if(x%3===0)box(x,y+1,z,x,y+4,z,C.woodLight,3);}}});
    for(const[cx,deck]of [[-15,21],[15,31]]){
      for(const z of [-7,7])for(let x=cx-6;x<=cx+6;x++){if(cx<0&&z===7&&Math.abs(x-cx)<=3)continue;put(x,deck+5,z,C.woodLight,3);if((x-cx+6)%3===0)box(x,deck+1,z,x,deck+4,z,C.woodLight,3);}
      for(const side of [-1,1])for(let z=-7;z<=7;z++){if(side===(cx<0?1:-1)&&Math.abs(z)<=3)continue;const x=cx+side*6;put(x,deck+5,z,C.woodLight,3);if((z+7)%3===0)box(x,deck+1,z,x,deck+4,z,C.woodLight,3);}
    }
    feature('樹冠へ上がる梯子',()=>{k.accessLadder(-15,8,21);box(-20,0,-5,-10,0,5,C.stone,0);k.accessPoint(15,32,4,'upper observation deck');});opening('canopy-platforms','柱上の二つの観察床と開放した吊り橋');
  }
  const access={"fruit-bar":[0,2,0],"palm-weaver":[0,2,5],"canopy-station":[-15,22,3]};if(access[id])k.accessPoint(...access[id],'work / visitor aisle');
  return k.finish(id);
}
