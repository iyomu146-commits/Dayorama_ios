import {workshop} from './kit.mjs';
import {mechanisms} from './mechanisms.mjs';
export const MEADOW_IDS=['windmill','dairy','stable','barn','grain-silo','orchard-press','shepherd-lodge','market-hall','rail-stop','kite-workshop','picnic-pavilion','scarecrow-hut'];
export function meadowBlueprint(id,seed=41){
  if(!MEADOW_IDS.includes(id))throw Error(id);
  const k=workshop('meadow',seed),{C,box,put,line,paint,disk,ellipsoid,house,roundHouse,hall,feature,pot,bench,roof}=k,{ringFace,wheel,clock,crate}=mechanisms(k);
  if(id==='windmill'){
    roundHouse({r:9,h:34,rise:10,cap:'cone'});
    feature('四枚の羽根',()=>{box(-1,28,9,1,30,12,C.wood,1);for(let i=0;i<4;i++){const t=Math.PI/4+i*Math.PI/2;line([0,29,12],[Math.round(Math.cos(t)*20),29+Math.round(Math.sin(t)*20),12],C.wood,3,2);for(let j=5;j<=20;j++){const x=Math.round(Math.cos(t)*j),y=29+Math.round(Math.sin(t)*j);line([x,y,12],[x+Math.round(Math.sin(t)*4),y-Math.round(Math.cos(t)*4),12],j%3?C.trim:C.woodLight,3);}}});
    feature('粉の荷車',()=>{crate(-14,2,12,8,5);wheel(-13,2,18,2);wheel(-7,2,18,2);box(-14,0,12,-6,1,14,C.wood,3);});
  }else if(id==='dairy'){
    house({x:-4,w:23,d:17,h:14,rise:5,shape:'hip'});
    feature('側面の集乳作業床',()=>{box(9,0,-5,21,1,7,C.stone,0);for(const x of [12,18]){for(let y=2;y<=6;y++)disk(x,y,0,2,C.trim,3);disk(x,7,0,2,C.roof,3);}box(9,1,-5,21,1,-3,C.woodLight,3);});
    feature('白い集乳の庇',()=>{for(const x of [-14,7])box(x,0,14,x,12,14,C.wood,1);box(-15,12,9,8,13,15,C.trim,3);for(const x of [-12,4]){pot(x,0,12,2,4,C.glass);disk(x,5,12,2,C.trim,3);}});
  }else if(id==='stable'){
    hall({w:39,d:19,h:17,rise:8});box(-19,2,-9,19,16,-9,C.wall,2);
    feature('三つの馬房',()=>{for(const x of [-19,-6,7,19])box(x,2,-8,x,11,7,C.woodLight,2);for(const x of [-12,1,13])box(x-4,2,9,x+4,8,9,C.wood,3);});
    feature('馬房の飼葉桶',()=>{box(-15,2,5,-9,4,7,C.wood,3);box(-14,5,5,-10,5,7,C.accent,3);});
    feature('馬房の通風格子',()=>{for(const x of [-13,0,13]){box(x-3,15,10,x+3,16,10,C.woodLight,3);for(const a of [-2,0,2])box(x+a,8,10,x+a,16,10,C.wood,3);}});
    k.clearBox(-1,2,9,3,10,10);
  }else if(id==='barn'){
    house({w:33,d:25,h:25,rise:11,shape:'gambrel',floors:2,windows:false});
    feature('交差する大きな納屋扉',()=>{paint(-11,2,13,11,20,13,C.wood);for(const s of [-1,1])line([-10,s===1?3:19,14],[10,s===1?19:3,14],C.trim,3,2);box(-1,2,14,1,20,14,C.trim,3);});
    k.threshold(0,2,14);
    feature('干し草の天窓',()=>{box(-5,26,13,5,30,15,C.woodLight,3);for(const x of [-3,0,3])box(x,27,16,x,29,16,C.accent,3);box(-16,0,17,-8,5,21,'#c5b575',3);});
  }else if(id==='grain-silo'){
    for(const [x,h,r]of [[-13,23,5],[0,37,6],[14,28,5]])roundHouse({x,r,h,rise:6,color:C.trim,roofColor:C.roof});
    feature('三塔を結ぶ搬送管',()=>{line([-13,24,0],[0,36,0],C.woodLight,3,2);line([0,36,0],[14,29,0],C.woodLight,3,2);});
    feature('塔のはしごと点検輪',()=>{for(const x of [-2,2])box(x,0,-7,x,35,-7,C.wood,3);for(let y=3;y<35;y+=3)box(-2,y,-8,2,y,-8,C.woodLight,3);box(18,7,0,21,8,0,C.wood,1);wheel(21,8,1,3);});
  }else if(id==='orchard-press'){
    house({x:-9,w:19,d:19,h:15,shape:'shed',rise:6});
    feature('屋外のりんご圧搾機',()=>{box(5,0,-5,21,1,8,C.stone,0);for(const x of [6,20])box(x,2,-2,x,22,3,C.wood,1);box(6,22,-2,20,24,3,C.wood,1);pot(13,2,2,6,7,C.woodLight);box(12,9,1,14,27,3,C.dark,3);disk(13,12,2,5,C.wood,3);wheel(13,25,4,4);});
    feature('収穫したりんご樽',()=>{for(const x of [-17,1,9]){pot(x,0,14,3,5,C.woodLight);ellipsoid(x,5,14,2,2,2,'#c58a76');put(x,8,14,C.leaf,3);}});
  }else if(id==='shepherd-lodge'){
    house({x:-3,w:19,d:17,h:13,rise:7,shape:'hip'});
    feature('毛刈り床を覆う低い軒',()=>{k.awning({x:13,z:-3,w:11,y:10,depth:12,color:C.roof});});
    feature('毛刈り床と羊毛の山',()=>{box(9,0,-5,19,2,11,C.woodLight,0);for(const [x,z]of [[12,-1],[16,5]]){ellipsoid(x,5,z,3,3,3,C.trim);box(x-1,2,z,x+1,3,z,C.wood,3);}});
    feature('羊の休憩場所と飼葉桶',()=>{box(-25,0,-8,-14,0,10,C.floor,0);for(const x of [-25,-14])for(const z of [-8,1,10])box(x,1,z,x,7,z,C.wood,3);for(const x of [-25,-14])for(const y of [4,7])box(x,y,-8,x,y,10,C.woodLight,3);for(const y of [4,7])box(-25,y,-8,-14,y,-8,C.woodLight,3);for(const x of [-25,-14])box(x,0,-8,x,12,-8,C.wood,1);box(-25,12,-8,-12,13,-3,C.roof,2);box(-22,1,-6,-17,3,-4,C.wood,3);box(-21,4,-6,-18,4,-4,C.accent,3);});
  }else if(id==='market-hall'){
    for(const x of [-14,0,14]){hall({x,w:11,d:15,h:14,rise:7,shape:'hip'});feature('野菜の台 '+x,()=>{box(x-5,2,3,x+5,5,8,C.woodLight,3);for(let a=-3;a<=3;a+=3)ellipsoid(x+a,7,6,1.5,1.5,1.5,a===0?'#b5b779':'#bd9774');});}
    feature('縞のテント縁',()=>{for(let x=-20;x<=20;x++)box(x,14,10,x,16,10,Math.floor((x+20)/3)%2?C.trim:C.roof,3);});
  }else if(id==='rail-stop'){
    house({x:-12,z:-3,w:13,d:11,h:14,rise:7});box(-23,0,-10,23,2,16,C.stone,0);hall({x:8,z:1,w:23,d:13,h:15,rise:4,shape:'shed'});
    box(-25,0,-3,-24,1,6,C.stone,0);box(-27,0,-3,-26,0,6,C.stone,0);
    feature('細長いホームと線路',()=>{for(let x=-23;x<=23;x+=3)box(x,0,18,x+1,0,23,C.wood,3);for(const z of [19,22])box(-23,1,z,23,1,z,C.dark,3);bench(2,3,0,12);});
    feature('時計と腕木信号',()=>{box(21,2,-7,21,26,-7,C.wood,1);box(12,25,-7,21,26,-7,C.trim,3);paint(12,25,-6,15,26,-6,C.accent);clock(-12,17,3,3);});
  }else if(id==='kite-workshop'){
    house({w:23,d:17,h:24,rise:6,floors:2,shape:'shed'});
    feature('二階の採光窓と細い窓庇',()=>{for(const x of [-6,6]){k.window(x,15,9,5,7);box(x-4,22,9,x+4,22,11,C.roof,3);}});
    feature('凧張りの机と糸巻き',()=>{for(const x of [-8,8])box(x-4,0,12,x+4,4,18,C.woodLight,3);for(const x of [-8,8]){disk(x,5,15,2,C.trim,3);box(x,6,15,x,8,15,C.accent,3);disk(x,9,15,2,C.trim,3);}});
  }else if(id==='picnic-pavilion'){
    hall({w:29,d:25,h:16,rise:13,shape:'hip'});
    feature('中央の食卓と椅子',()=>{box(-9,2,-3,9,5,3,C.woodLight,3);bench(-9,2,7,18,2);bench(-9,2,-9,18);pot(0,6,0,2,3);});
    feature('傘の八本の骨',()=>{for(const [x,z]of [[-16,-14],[0,-14],[16,-14],[-16,0],[16,0],[-16,14],[0,14],[16,14]])for(let i=0;i<=16;i++){const xx=Math.round(x*i/16),zz=Math.round(z*i/16),yy=16+Math.max(1,Math.round(Math.min(1-Math.abs(xx)/16,1-Math.abs(zz)/14)*13));put(xx,yy,zz,C.trim,3,true);}});
  }else if(id==='scarecrow-hut'){
    house({x:-7,w:15,d:13,h:12,rise:7,shape:'gable'});
    feature('畑の道具を納める屋根',()=>{hall({x:12,z:1,w:13,d:13,h:11,rise:3,shape:'shed'});for(const x of [9,12,15]){box(x,2,0,x,10,0,C.woodLight,3);box(x-1,2,0,x+1,3,0,C.dark,3);}});
    feature('束ねた麦',()=>{for(const x of [-16,3,9]){for(let a=-2;a<=2;a++)line([x,0,13],[x+a,8,13],C.woodLight,3);box(x-2,3,13,x+2,3,13,C.wood,3);}});
  }
  const access={"stable":[1,2,10],"market-hall":[-14,2,0],"picnic-pavilion":[-12,2,0]};if(access[id])k.accessPoint(...access[id],'work / visitor aisle');
  return k.finish(id);
}


