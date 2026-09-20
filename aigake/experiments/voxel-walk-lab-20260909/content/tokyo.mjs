import {workshop} from './kit.mjs';
import {mechanisms} from './mechanisms.mjs';
import {hash} from '../model.mjs';

export const TOKYO_IDS=['tokyo-shop','tokyo-apartment','tokyo-cafe','tokyo-station','tokyo-office','tokyo-tower'];
export function tokyoBlueprint(id,seed=41){
  if(!TOKYO_IDS.includes(id))throw Error('Unknown Tokyo building: '+id);
  const k=workshop('tokyo',seed),{C,box,put,line,paint,house,feature}=k,{balcony}=mechanisms(k);
  const tone=['#dfd8c8','#c9cfca','#d7c9b9'][Math.floor(hash(seed,47)*3)];
  if(id==='tokyo-shop'){
    house({w:23,d:17,h:25,floors:2,shape:'gable',rise:5,color:tone,roofColor:'#777f7a',windows:false,doorOffset:6});
    feature('一階の売り場と二階の住まい',()=>{
      k.window(-5,4,8,11,7);k.window(-6,17,8,5,6);k.window(6,17,8,5,6);
      for(const x of [-11,11])k.window(x,17,0,5,6,true);
      k.awning({z:9,y:12,w:25,depth:3,color:'#859c91'});
    });
    feature('店先の陳列棚と入口脇の看板',()=>{
      k.shelf(-12,0,15,8,5);k.sign(-10,6,13,3,4);
      box(-12,0,-10,12,0,18,C.floor,0);
    });
  }else if(id==='tokyo-apartment'){
    house({w:29,d:17,h:27,floors:2,rise:1,shape:'flat',color:tone,windows:false,roofOverhang:1});
    feature('住戸の窓と二階のバルコニー',()=>{
      for(const x of [-8,8]){k.window(x,5,8,5,6);balcony(x,14,9,11);k.window(x,18,-8,5,6);}
      for(const x of [-14,14])for(const y of [5,18])k.window(x,y,0,5,6,true);
    });
    feature('玄関庇と集合ポスト',()=>{
      k.awning({z:9,y:12,w:9,depth:3,color:C.trim});
      box(-5,0,15,-5,3,15,C.wood,1);box(-7,4,14,-3,7,16,C.roof,3);
      for(const x of [-6,-4])paint(x,6,17,x,6,17,C.dark);
    });
    for(const c of k.v.list())if(c.color===C.woodLight)put(c.x,c.y,c.z,'#a4b0a6',c.phase,true);
  }else if(id==='tokyo-cafe'){
    box(-21,0,-11,26,0,17,C.floor,0);
    house({x:-7,w:25,d:19,h:15,rise:2,shape:'shed',foundationMargin:0,windows:false,color:'#c7c4b8',roofColor:'#818b87',doorOffset:7});
    feature('倉庫の大きな採光窓',()=>{
      k.window(-11,3,9,11,10);k.window(-19,4,0,9,8,true);
      k.awning({x:-7,z:10,w:27,y:14,depth:3,color:'#b3b2a0'});
    });
    feature('側面のテラス席',()=>{
      k.table(17,1,0);k.chair(17,1,-8);k.chair(17,1,8,2);put(17,8,0,C.trim,3);
      k.sign(-21,5,9,3,4);
    });
    // The small wall sign attaches to the side of the building.
    box(-21,4,9,-19,9,9,C.wood,3);
  }else if(id==='tokyo-station'){
    box(-26,0,-9,26,0,15,C.floor,0);
    box(-25,1,-1,25,2,9,'#c1c5be',0);
    for(const z of [-7,-3])box(-25,1,z,25,1,z,'#707b77',1);
    for(let x=-24;x<=24;x+=3)box(x,0,-8,x,0,-2,'#888c80',0);
    // Buffer stops terminate both ends; the train reverses on this short line.
    for(const x of [-25,25]){box(x,1,-7,x,4,-7,C.wood,1);box(x,1,-3,x,4,-3,C.wood,1);box(x,4,-7,x,4,-3,C.trim,3);}
    feature('ホームと柱で支える屋根',()=>{
      for(const x of [-20,-7,7,20])box(x,3,7,x,15,7,C.wood,1);
      for(const x of [-20,20])box(x,3,0,x,15,0,C.wood,1);
      k.roof(0,4,45,9,15,2,'shed','#9aa89d');
      for(let x=-23;x<=23;x++)put(x,3,0,'#dacb91',3);
      for(const z of [-1,9])box(-25,3,z,-24,7,z,C.wood,3);
    });
    feature('改札への入口とホームの椅子',()=>{
      k.stairs(0,10,9,2,4);
      for(const x of [-8,8]){box(x,3,8,x,8,9,C.wood,1);box(x-1,8,8,x+1,9,9,C.roof,3);}
      k.bench(-18,3,5,8,2);k.bench(10,3,5,8,2);
      k.sign(-18,10,7,7,3);
    });
    k.accessPoint(0,3,5,'station concourse');
    k.opening('station-platform','列車の到着を待つ開放ホーム');
  }else if(id==='tokyo-office'){
    house({w:23,d:19,h:48,floors:4,rise:1,shape:'flat',color:'#c5ceca',roofColor:'#aeb9b0',roofOverhang:0,windows:false});
    feature('反復する窓と縦の柱',()=>{
      for(let floor=0;floor<4;floor++){
        const y=4+floor*12;
        for(const z of [-9,9]){
          if(floor||z<0)paint(-10,y,z,10,y+6,z,'#aec8c2',3);
          else{paint(-10,y,z,-4,y+6,z,'#aec8c2',3);paint(4,y,z,10,y+6,z,'#aec8c2',3);}
          for(const x of [-7,0,7])if(floor||z<0||x)paint(x,y,z,x,y+6,z,'#8ca79f',3);
        }
        for(const x of [-11,11]){paint(x,y,-8,x,y+6,8,'#aec8c2',3);for(const z of [-4,4])paint(x,y,z,x,y+6,z,'#8ca79f',3);}
        for(const z of [-9,9])paint(-10,y+7,z,10,y+7,z,'#dde2d5',3);
      }
      for(const x of [-11,11])paint(x,2,9,x,47,9,'#e0e0d4',1);
    });
    feature('玄関広場と屋上の設備',()=>{
      box(-15,0,10,15,0,18,C.floor,0);
      k.awning({z:10,y:13,w:15,depth:4,color:C.trim});
      k.bench(8,1,15,6);
      box(-5,50,-4,4,52,3,'#9ba39b',3);for(const x of [-3,2])box(x,53,-2,x,53,1,C.trim,3);
    });
  }else if(id==='tokyo-tower'){
    const red='#b75c49',white='#eee4ce';
    box(-16,0,-13,16,0,16,C.floor,0);
    house({w:13,d:9,h:11,shape:'flat',rise:1,windows:false,color:'#dedbd0',roofColor:'#b5b6a8'});
    const levels=[[1,13,10],[13,9,7],[27,5,4],[42,2,2],[51,1,1]];
    feature('四脚と接続した鉄骨の斜材',()=>{
      for(let i=0;i<levels.length-1;i++){
        const [y0,x0,z0]=levels[i],[y1,x1,z1]=levels[i+1],color=i===2?white:red;
        for(const sx of [-1,1])for(const sz of [-1,1])line([sx*x0,y0,sz*z0],[sx*x1,y1,sz*z1],color,1,1);
        for(const sz of [-1,1])line([-x1,y1,sz*z1],[x1,y1,sz*z1],color,1);
        for(const sx of [-1,1])line([sx*x1,y1,-z1],[sx*x1,y1,z1],color,1);
        // Keep the base entrance open below the first horizontal ring.
        if(i)for(const sz of [-1,1]){line([-x0,y0,sz*z0],[x1,y1,sz*z1],color,1);line([x0,y0,sz*z0],[-x1,y1,sz*z1],color,1);}
        if(i)for(const sx of [-1,1]){line([sx*x0,y0,-z0],[sx*x1,y1,z1],color,1);line([sx*x0,y0,z0],[sx*x1,y1,-z1],color,1);}
      }
    });
    feature('展望室と赤白のアンテナ',()=>{
      for(const [y,r]of [[27,7],[42,4]]){
        box(-r,y,-r,r,y,r,red,2);box(-r,y+1,-r,r,y+3,r,C.glass,2);box(-r,y+4,-r,r,y+4,r,white,2);
        for(let x=-r;x<=r;x+=3)for(const z of [-r,r])paint(x,y+1,z,x,y+3,z,white,3);
      }
      box(0,51,0,0,63,0,white,2);for(const y of [53,54,59,60])paint(0,y,0,0,y,0,red,3);
      k.window(0,4,-4,5,5);k.window(-6,4,0,3,5,true);k.window(6,4,0,3,5,true);
    });
    k.opening('tower-frame','脚と斜材の間は、空の見える鉄骨構造');
  }
  const bp=k.finish(id);
  if(id==='tokyo-station')bp.transit={min:[-24,2,-8],max:[24,10,-2],rails:[-7,-3],travel:[-17,17]};
  return bp;
}
