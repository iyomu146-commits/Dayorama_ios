import {workshop} from './kit.mjs';

export const GROVE_IDS=['books','tea','flowers','bakery','mushroom-house','woodland-library','apiary','pottery','aviary','herbalist','ranger','treehouse','acorn-store','forest-stage'];
export function groveBlueprint(id,seed=41){
  if(!GROVE_IDS.includes(id))throw Error('Unknown forest building: '+id);
  const k=workshop('grove',seed),{C,box,put,line,paint,ellipsoid,disk,house,roundHouse,hall,stairs,chimney,feature,book,shelf,pot,bench,flower}=k;
  if(id==='books'){
    house({w:25,d:17,h:17,rise:7});
    feature('木枠の玄関庇',()=>{k.awning({z:9,w:15,y:13,depth:4});});
    feature('店先の本棚と腰掛け',()=>{shelf(-13,0,13,7,8);box(-13,9,13,-6,9,16,C.woodLight,3);bench(6,0,16,8);});
  }else if(id==='tea'){
    // One continuous ground slab joins the entrance, posts and side seating.
    box(-19,0,-11,25,0,14,C.floor,0);
    house({x:-6,w:25,d:19,h:14,rise:5,shape:'hip',roofColor:'#8a9a85',foundationMargin:0});
    feature('低い軒と開いた窓辺',()=>{k.awning({x:-6,z:10,w:25,y:12,depth:3,color:'#b7a58b'});k.window(-13,5,10,5,6);k.window(1,5,10,5,6);});
    feature('側面のテラス席',()=>{k.table(17,1,0);k.chair(17,1,-8,0);k.chair(17,1,8,2);put(17,8,0,C.trim,3);});
  }else if(id==='flowers'){
    house({x:-4,w:19,d:15,h:14,rise:8,roofColor:'#74949b'});house({x:10,z:-2,w:9,d:13,h:10,rise:4,color:C.glass,roofColor:C.glass,windows:false,door:false});
    feature('温室につながる採光窓',()=>{k.window(-9,5,8,5,6);for(const x of [6,10,14])paint(x,2,5,x,9,5,C.trim,3);});
    feature('通路の両脇の花台',()=>{for(let i=0;i<3;i++){for(const[a,b]of [[-14,-9],[2,14]])box(a,0,11+i*4,b,5-i*2,13+i*4,C.woodLight,3);for(const [j,x]of [-12,5,11].entries())flower(x,6-i*2,12+i*4,['#d9859b','#f0e7d2','#a797cd','#e4bd55'][(i+j)%4],3,{stamen:'#e6b63e',pistil:'#97643a'});}});
  }else if(id==='bakery'){
    house({x:-5,w:21,d:17,h:14,rise:8,shape:'hip',roofColor:'#b88a70'});roundHouse({x:13,z:-2,r:6,h:9,rise:6,cap:'dome',color:'#bda48b',roofColor:'#b5967d',door:false,windows:false});chimney(12,-3,10,27,3);
    feature('薪窯の脇の軒下',()=>{k.awning({x:-5,z:9,w:19,y:12,depth:3,color:'#c8b590'});});
    feature('薪窯とパンの台',()=>{
      paint(11,3,4,15,7,4,C.dark);box(-18,0,13,-10,4,17,C.wood,3);
      box(-18,5,13,-10,5,17,C.woodLight,3);
      // A long loaf and a round roll sit directly on the serving board.
      // Dark lower crust, golden dome, and pale scoring cut into that crust.
      for(let a=-1;a<=1;a++)for(let b=0;b<=2;b++)for(let d=-2;d<=2;d++){
        if((a/1.6)**2+((b-.5)/1.65)**2+(d/2.55)**2>1.05)continue;
        put(-17+a,6+b,15+d,['#9c632f','#bf7e40','#cf9855'][b],3);
      }
      for(const z of [14,16])put(-17,8,z,'#e8c185',3,true);
      for(let y=0;y<3;y++)disk(-12,6+y,15,[2.1,1.5,.85][y],['#9c632f','#bf7e40','#cf9855'][y]);
      // A scored cross follows the dome; no pale cube protrudes above it.
      put(-12,8,15,'#e8c185',3,true);for(const [a,d]of [[-1,0],[1,0],[0,-1],[0,1]])put(-12+a,7,15+d,'#e8c185',3,true);
      for(let y=0;y<=3;y+=2)for(const x of [10,13,16])box(x,y,10,x+1,y+1,16,C.wood,3);
    });
  }else if(id==='mushroom-house'){
    house({w:29,d:21,h:29,rise:8,floors:2,roofColor:'#8d9b8a'});
    feature('二階の窓の手すり',()=>{for(const x of [-9,9]){
      k.window(x,18,10,5,7);
      // Shallow window guards are anchored to the jambs, with open spaces
      // between the balusters so the glazing remains visible.
      for(const dx of [-3,3])box(x+dx,18,11,x+dx,21,12,C.wood,3);
      box(x-3,18,12,x+3,18,12,C.wood,3);box(x-3,21,12,x+3,21,12,C.woodLight,3);
      for(const dx of [-1,1])box(x+dx,19,12,x+dx,20,12,C.wood,3);
    }});
    // A full-height internal staircase reaches the second-floor landing.
    k.clearBox(-12,14,-6,-8,14,5);
    for(let i=0;i<=12;i++)box(-12,2,-6+i,-8,2+i,-6+i,C.woodLight,1);
    feature('玄関庇と花鉢',()=>{k.awning({z:11,w:11,y:12,depth:3});pot(-12,0,14,2,3);flower(-12,3,14,'#d6b2c6',2);});
    chimney(9,-6,28,40,2);
  }else if(id==='woodland-library'){
    const h=house({w:33,d:21,h:29,rise:8,floors:2});
    feature('二層の縦長の閲覧窓',()=>{for(const x of [-10,0,10])k.window(x,19,-11,5,8);});
    feature('二階の読書バルコニー',()=>{box(-14,15,11,14,15,16,C.woodLight,1);for(const x of [-14,14])box(x,1,16,x,20,16,C.wood,1);for(let x=-14;x<=14;x+=4)box(x,16,16,x,20,16,C.woodLight,3);box(-14,20,16,14,20,16,C.woodLight,3);shelf(-12,16,12,8,5);shelf(4,16,12,8,5);});
    k.doorway(0,16,10,9,{access:'balcony',name:'reading balcony door'});for(const x of [-14,14]){box(x,20,11,x,20,16,C.woodLight,3);box(x,16,13,x,19,13,C.woodLight,3);}
    feature('入口の本のワゴン',()=>{shelf(-18,0,15,7,8);box(-18,9,15,-11,9,18,C.woodLight,3);bench(5,0,17,9);});
  }else if(id==='apiary'){
    roundHouse({x:-6,r:8,h:16,rise:7,metric:'hex',roofColor:'#b9a173'});
    feature('庭に並ぶ小さな巣箱',()=>{for(const[x,z]of [[10,0],[15,10],[4,15]]){box(x-2,0,z-2,x+2,5,z+2,'#c4ab7c',3);box(x-3,6,z-3,x+3,6,z+3,C.woodLight,3);paint(x-1,2,z+3,x+1,2,z+3,C.dark);}});
    feature('採蜜小屋の窓庇',()=>{k.awning({x:-6,z:9,w:11,y:12,depth:3});});
  }else if(id==='pottery'){
    house({x:-9,w:19,d:15,h:16,rise:5,shape:'shed'});roundHouse({x:12,z:-2,r:7,h:13,rise:7,cap:'dome',color:'#b4977d',roofColor:'#aa8d76',door:false,windows:false});chimney(11,-3,15,29,4);
    feature('丸い窯口',()=>paint(10,3,5,14,8,5,C.dark));
    feature('器の乾燥棚',()=>{for(const y of [0,7]){for(const[a,b]of [[-19,-14],[-3,5]]){box(a,y,12,b,y,16,C.woodLight,3);for(const x of [a,b])box(x,0,13,x,8,15,C.wood,3);}pot(-16,y+1,14,2,4,'#bc8e7c');pot(1,y+1,14,2,4,'#91a59e');}});
  }else if(id==='aviary'){
    hall({w:15,d:15,h:31,rise:8,shape:'hip'});
    feature('背の高い鳥籠',()=>{for(let x=-6;x<=6;x+=3)for(const z of [-7,7])box(x,2,z,x,30,z,C.woodLight,1);for(let z=-6;z<=6;z+=3)for(const x of [-7,7])box(x,2,z,x,30,z,C.woodLight,1);for(const y of [12,23]){box(-7,y,-7,7,y,-7,C.woodLight,1);box(-7,y,7,7,y,7,C.woodLight,1);box(-7,y,-7,-7,y,7,C.woodLight,1);box(7,y,-7,7,y,7,C.woodLight,1);}});
    k.clearBox(-2,2,7,2,10,7);k.doorway(0,2,7,9);
    feature('観察用のとまり木',()=>{for(const y of [10,21])box(-7,y,0,7,y,0,C.wood,3);stairs(0,9,7,2,5);});
  }else if(id==='herbalist'){
    house({w:33,d:13,h:12,rise:5,shape:'shed'});
    feature('深い屋根の乾燥棚',()=>{box(-17,0,7,17,0,17,C.floor,0);for(const x of [-16,16])box(x,1,16,x,11,16,C.wood,1);box(-17,12,7,17,13,17,C.roof,2);for(const x of [-12,-6,6,12]){box(x,7,16,x,12,16,C.woodLight,3);ellipsoid(x,6,16,2,3,2,x%12?'#a1af86':'#879d80');}});
    feature('薬草を並べる作業台',()=>{box(5,1,12,15,4,14,C.wood,3);for(const x of [8,12])pot(x,5,13,1,2);});
  }else if(id==='ranger'){
    for(const x of [-6,6])for(const z of [-6,6])box(x,0,z,x+1,24,z+1,C.wood,1);
    hall({w:15,d:15,h:12,y:24,rise:7,shape:'hip'});
    feature('高い見張り床と筋交い',()=>{for(const z of [-6,6]){line([-6,3,z],[6,21,z],C.woodLight,1,2);line([6,3,z],[-6,21,z],C.woodLight,1,2);}for(let x=-6;x<=6;x+=3)box(x,26,7,x,30,7,C.woodLight,3);box(-7,30,7,7,30,7,C.woodLight,3);stairs(11,0,5,25,27);box(7,25,-2,13,25,0,C.woodLight,1);});
    for(const z of [-7,7]){box(-7,30,z,7,30,z,C.woodLight,3);for(const x of [-7,-3,3,7])box(x,26,z,x,29,z,C.woodLight,3);}for(const x of [-7,7])for(let z=-7;z<=7;z++){if(x===7&&z>=-3&&z<=1)continue;put(x,30,z,C.woodLight,3);if(z%3===0)box(x,26,z,x,29,z,C.woodLight,3);}
    feature('見張り床の記録台',()=>{box(-3,25,2,-3,29,2,C.wood,3);box(-5,30,1,1,30,4,C.woodLight,3);book(-2,31,2,3);});
  }else if(id==='treehouse'){
    box(-12,0,-10,12,0,10,C.stone,0);for(const x of [-9,9])for(const z of [-7,7])box(x,1,z,x,6,z,C.wood,1);
    house({w:19,d:15,h:14,y:6,rise:7});
    feature('玄関につながる高床の階段',()=>{box(-12,6,-10,12,6,10,C.woodLight,1);stairs(0,9,7,7,10);});
    feature('入口の郵便受け',()=>{box(-9,7,9,-9,11,9,C.wood,3);box(-11,12,8,-7,15,10,'#b88070',3);paint(-10,14,11,-8,14,11,C.dark);});
  }else if(id==='acorn-store'){
    roundHouse({r:8,h:25,rise:5,cap:'cone',color:'#b4a78d',roofColor:'#7e918a'});
    feature('貯蔵庫の水平の帯',()=>{for(const y of [7,16,24])disk(0,y,0,8,C.woodLight,3,'round',6.7);});
    feature('側面の点検梯子と収穫かご',()=>{for(const z of [-3,3])box(9,0,z,9,23,z,C.wood,3);for(let y=2;y<=23;y+=3)box(10,y,-3,10,y,3,C.woodLight,3);pot(11,0,11,2,3);put(11,4,11,'#b69b68',3);});
  }else if(id==='forest-stage'){
    hall({w:31,d:15,h:16,rise:8,shape:'butterfly'});
    feature('扇形の舞台と段々の客席',()=>{box(-18,0,8,18,0,22,C.floor,0);for(let i=0;i<3;i++){const width=10+i*3;box(-width,0,11+i*4,width,i,13+i*4,C.floor,0);for(const x of [-width,width-6])bench(x,i+1,11+i*4,6,2);}});
    feature('舞台のチェロ',()=>{box(0,2,0,0,4,0,C.wood,3);ellipsoid(0,7,0,3,4,1.5,'#b98b68');ellipsoid(0,12,0,2,2,1.5,'#b98b68');box(0,13,0,0,14,0,C.dark,3);line([3,3,0],[5,14,0],C.woodLight,3);});
  }
  const access={"ranger":[0,26,-3],"forest-stage":[0,2,4]};if(access[id])k.accessPoint(...access[id],'work / visitor aisle');
  return k.finish(id);
}
