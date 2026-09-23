// Authored directly on the 15 cm grid. No continuous model or resampling pass.
// Front is +Z. Bounds below are inclusive cell coordinates.
export const CAFE_GRID=.15;
export const CAFE_PLAN={body:{x:[-20,11],z:[-13,10]},roof:{x:[-23,14],z:[-16,13]},entrance:{x:[1,7],z:[11,20]},terrace:{x:[12,29],z:[-12,13]}};
export function makeCoarseCafe(){
 const map=new Map();
 function put(x,y,z,color,phase=4,group='cafe'){
  const key=`${x},${y},${z}`,old=map.get(key),cell={x,y,z,color,phase,group,emission:color.startsWith('glass'),order:y*10000+z*100+x};
  if(old&&old.phase<phase)cell.under=[...(old.under||[]),old];
  else if(old?.under)cell.under=old.under;
  map.set(key,cell);
 }
 function box(x0,x1,y0,y1,z0,z1,color,phase=4,group='cafe'){
  for(let y=y0;y<=y1;y++)for(let z=z0;z<=z1;z++)for(let x=x0;x<=x1;x++)put(x,y,z,color,phase,group);
 }
 const roofY=z=>24+Math.floor(Math.min(z+16,13-z)*.6);
 // Paving is one level, with a small bevel in plan; it grounds every piece of furniture.
 for(let z=-15;z<=20;z++)for(let x=-23;x<=29;x++){
  if(x>13&&z>14||x>27&&z<-12||x<-21&&z>17)continue;
  const terrace=x>=12,colour=(Math.floor((x+25)/5)+Math.floor((z+16)/4))%5===0?'flagGrey':'flagWarm';
  put(x,0,z,colour,0,terrace?'terrace':'cafe');
 }
 // Raised foundation and a two-tread entrance. Front circulation stays empty.
 box(-20,11,1,2,-13,10,'stone',0);
 box(-20,11,3,3,-13,10,'woodDark',1);
 box(0,8,1,1,11,14,'stone2',0);box(1,7,2,2,11,12,'stone2',0);
 // Posts, ring beam, ridge and rafters are retained in the construction timeline.
 for(const x of [-20,-5,10])for(const z of [-13,9])box(x,x+1,4,23,z,z+1,'woodDark',1);
 box(-20,11,22,23,-13,-12,'wood',1);box(-20,11,22,23,9,10,'wood',1);
 for(const x of [-20,10])box(x,x+1,22,23,-13,10,'wood',1);
 box(-20,11,31,31,-2,-1,'woodDark',1);
 for(const x of [-20,-12,-4,4,11])for(let z=-13;z<=10;z++)box(x,x,roofY(z)-1,roofY(z),z,z,'wood',1);
 for(const x of [-20,11])box(x,x,24,30,-2,-1,'wood',1);
 // Wall masonry: restrained courses, never random speckling.
 for(let y=4;y<=23;y++)for(let z=-13;z<=10;z++)for(let x=-20;x<=11;x++){
  if(x!==-20&&x!==11&&z!==-13&&z!==10)continue;
  const frontWindow=z===10&&x>=-17&&x<=-7&&y>=9&&y<=19;
  const door=z===10&&x>=1&&x<=7&&y>=4&&y<=18;
  const sideWindow=x===11&&z>=-9&&z<=2&&y>=9&&y<=18;
  const backWindow=z===-13&&x>=-8&&x<=0&&y>=10&&y<=17;
  if(frontWindow||door||sideWindow||backWindow)continue;
  const joint=y<8&&(x+(y%2)*2+z)%7===0;
  put(x,y,z,y<8?(joint?'brick':'brick2'):(y===8?'stone2':'plasterWarm'),2);
 }
 // The gable walls close the roof triangle on both sides.
 for(const x of [-20,11])for(let z=-13;z<=10;z++)box(x,x,24,roofY(z)-1,z,z,'plasterWarm',2);
 // Recessed unbroken panes. Frames stay at the perimeter, never through the middle.
 function pane(axis,plane,a,b,y0,y1){
  for(let y=y0;y<=y1;y++)for(let q=a;q<=b;q++){
   const color=y<y0+3?'glassShadow':q-a===y1-y||q-a===y1-y+1?'glassHaze':'glassSea';
   if(axis==='z')put(q,y,plane,color,2);else put(plane,y,q,color,2);
  }
 }
 // Front glazing sits two cells behind a projected stone surround.
 pane('z',9,-17,-7,9,19);
 for(const x of [-18,-6])box(x,x,8,20,9,11,'woodHoney',2);
 for(const y of [8,20])box(-18,-6,y,y,9,11,'woodHoney',2);
 box(-19,-5,7,7,10,12,'stone2',4);
 // A plain, deep wooden doorway and lower panel, no oversized emblem.
 box(1,7,4,18,9,9,'wood',2);pane('z',9,2,6,10,16);
 box(2,6,5,8,10,10,'woodHoney',4);put(6,9,10,'metal',4);
 for(const x of [0,8])box(x,x,4,19,10,11,'woodDark',2);
 box(0,8,19,19,10,11,'woodHoney',2);
 pane('x',10,-9,2,9,18);
 for(const z of [-10,3])box(10,12,8,19,z,z,'woodHoney',2);
 for(const y of [8,19])box(10,12,y,y,-10,3,'woodHoney',2);
 box(11,13,7,7,-11,4,'stone2',4);
 pane('z',-13,-8,0,10,17);
 for(const x of [-9,1])box(x,x,9,18,-14,-13,'wood',2);
 for(const y of [9,18])box(-9,1,y,y,-14,-13,'wood',2);
 // One small attic window in the gable, with only a perimeter frame.
 pane('x',11,-4,0,25,28);
 for(const z of [-5,1])box(11,12,24,29,z,z,'wood',2);
 for(const y of [24,29])box(11,12,y,y,-5,1,'wood',2);
 // Solid stepped shell: two cells thick at each change of height.
 for(let z=-16;z<=13;z++)for(let x=-23;x<=14;x++){
  const y=roofY(z),edge=x===-23||x===14;
  box(x,x,y,y+1,z,z,edge?'roofEdge':z%4===0?'roofSlate':'roofMuted',3);
 }
 box(-23,14,34,34,-2,-1,'roofEdge',3);
 // Closed fascia with a thin timber soffit. Each roof seam touches the shell.
 for(const z of [-16,13])box(-23,14,23,23,z,z,'woodHoney',3);
 for(const x of [-23,14])for(let z=-16;z<=13;z++)put(x,roofY(z)-1,z,'woodHoney',3);
 for(const x of [-17,-9,-1,7])for(let z=-15;z<=12;z++)put(x,roofY(z)+2,z,'roofSeam',3);
 // Fireplace reaches the floor; its roof penetration has continuous flashing.
 box(-16,-13,4,28,-10,-7,'brick',2);
 for(let y=27;y<=34;y++)for(let x=-16;x<=-13;x++)for(let z=-10;z<=-7;z++)if(x===-16||x===-13||z===-10||z===-7)put(x,y,z,(x+z+y)%5===0?'brick2':'brick',3);
 for(let x=-17;x<=-12;x++)for(let z=-11;z<=-6;z++)put(x,roofY(z)+2,z,'roofEdge',3);
 for(let x=-17;x<=-12;x++)for(let z=-11;z<=-6;z++)if(x<-15||x>-14||z<-9||z>-8)put(x,35,z,'stone',3);
 box(-15,-14,34,34,-9,-8,'woodDark',3);
 // Shallow canvas canopy, supported by the facade; upper door frame clears it.
 for(let z=11;z<=15;z++)for(let x=-19;x<=9;x++){
  const y=23-Math.floor((z-11)/2),stripe=Math.floor((x+19)/3)%2;
  put(x,y,z,stripe?'cream':'cloth',4);
  if(z===15)put(x,y-1,z,stripe?'cream':'cloth',4);
 }
 for(const x of [-19,9])for(let z=11;z<=15;z++)box(x,x,22-Math.floor((z-11)/2),22-Math.floor((z-11)/2),z,z,'woodDark',4);
 // Side terrace. Four distinct legs per chair and table, correct seat height.
 box(18,23,5,5,-3,2,'woodHoney',4,'terrace');
 for(const x of [18,23])for(const z of [-3,2])box(x,x,1,4,z,z,'woodDark',4,'terrace');
 function chair(z,back){
  for(const x of [19,22])for(const zz of [z,z+3])box(x,x,1,2,zz,zz,'woodDark',4,'terrace');
  box(19,22,3,3,z,z+3,'woodHoney',4,'terrace');
  const zz=back<0?z:z+3;
  for(const x of [19,22])box(x,x,4,7,zz,zz,'wood',4,'terrace');
  box(19,22,6,7,zz,zz,'woodHoney',4,'terrace');
 }
 chair(-9,-1);chair(5,1);
 put(20,6,-2,'cream',4,'terrace');put(22,6,1,'ceramic',4,'terrace');
 // Small grounded terracotta planters leave the entrance and terrace passage clear.
 function planter(cx,cz,flower=false){
  box(cx-1,cx+1,1,2,cz-1,cz+1,'pot',4,'terrace');
  box(cx-1,cx+1,3,3,cz-1,cz+1,'soil',4,'terrace');
  for(const [dx,dz,h] of [[0,0,7],[-1,0,5],[1,1,6]]){
   box(cx+dx,cx+dx,4,h,cz+dz,cz+dz,'leafDark',4,'terrace');
   put(cx+dx-1,h-1,cz+dz,'leafOlive',4,'terrace');put(cx+dx+1,h-2,cz+dz,'leafOliveLight',4,'terrace');
   if(flower){for(const [a,b] of [[-1,0],[1,0],[0,-1],[0,1]])put(cx+dx+a,h,cz+dz+b,'flower',4,'terrace');put(cx+dx,h,cz+dz,'flowerGold',4,'terrace');}
  }
 }
 planter(-21,12);planter(12,15,true);planter(27,-10);
 // Reveal each stage outwards from its existing supports. In particular, the
 // canopy starts at the wall, not at its lower (otherwise floating) front hem.
 const directions=[[1,0,0],[-1,0,0],[0,1,0],[0,-1,0],[0,0,1],[0,0,-1]],occupied=new Set();
 for(let phase=0;phase<=4;phase++){
  const stage=new Map();for(const cell of map.values())for(const v of [...(cell.under||[]),cell])if(v.phase===phase)stage.set(`${v.x},${v.y},${v.z}`,v);
  const queue=[],queued=new Set(),near=c=>directions.map(d=>`${c.x+d[0]},${c.y+d[1]},${c.z+d[2]}`);
  const add=(key,c)=>{if(!queued.has(key)){queued.add(key);queue.push(c);}};
  for(const [key,c] of stage)if(c.y===0||occupied.has(key)||near(c).some(k=>occupied.has(k)))add(key,c);
  for(let i=0;i<queue.length;i++){const c=queue[i];c.order=i;occupied.add(`${c.x},${c.y},${c.z}`);for(const k of near(c))if(stage.has(k))add(k,stage.get(k));}
  if(queued.size!==stage.size)throw Error(`Unsupported cafe construction stage ${phase}`);
 }
 return [...map.values()];
}
// A fine-grid editor may subdivide a coarse cell, without inventing new detail.
export function subdivideCoarse(cells){
 const expand=c=>{const out=[];for(let dx=0;dx<2;dx++)for(let dy=0;dy<2;dy++)for(let dz=0;dz<2;dz++){
  const convert=v=>({...v,x:c.x*2+dx,y:c.y*2+dy,z:c.z*2+dz,under:undefined});
  out.push({...convert(c),under:c.under?.map(convert)});
 }return out;};return cells.flatMap(expand);
}
