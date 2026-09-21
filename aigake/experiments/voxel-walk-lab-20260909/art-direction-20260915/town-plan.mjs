import {Voxels,COLORS} from '../voxels.mjs';
import {hash,clamp} from '../model.mjs';
import {contentBlueprint} from '../content/blueprints.mjs';
import {workshop} from '../content/kit.mjs';
import {plantBlueprint,WILDFLOWER_COLORS} from '../content/ecology.mjs';
import {REGIONS} from '../content/catalog.mjs';
import {insideLoop} from '../tokyo/city.mjs';
import {tokyoDistrictPlan,tokyoPavement,tokyoStreetDetails} from './tokyo-districts.mjs';
import {SHIBUYA_CROSSING} from './tokyo-activity.mjs';

export const GRID=.32, HALF=[10.24,8.32];
export const blend=(a,b,t)=>{const c=s=>[1,3,5].map(i=>parseInt(s.slice(i,i+2),16));return '#'+c(a).map((v,i)=>Math.round(v*(1-t)+c(b)[i]*t).toString(16).padStart(2,'0')).join('');};
const dist=(p,a,b)=>{const dx=b[0]-a[0],dz=b[1]-a[1],t=clamp(((p[0]-a[0])*dx+(p[1]-a[1])*dz)/(dx*dx+dz*dz||1),0,1);return Math.hypot(p[0]-a[0]-t*dx,p[1]-a[1]-t*dz);};
export const inRect=(x,z,r,pad=0)=>x>=r.min[0]-pad&&x<=r.max[0]+pad&&z>=r.min[1]-pad&&z<=r.max[1]+pad;
export const overlaps=(a,b,pad=0)=>a.min[0]<b.max[0]+pad&&a.max[0]>b.min[0]-pad&&a.min[1]<b.max[1]+pad&&a.max[1]>b.min[1]-pad;
export function turn(x,z,r){for(let i=0;i<((r%4)+4)%4;i++)[x,z]=[z,-x];return[x,z];}
function rect(bp,x,z,u,r){const pts=[];for(const a of [bp.bounds.min[0]-.5,bp.bounds.max[0]+.5])for(const b of [bp.bounds.min[2]-.5,bp.bounds.max[2]+.5]){const [xx,zz]=turn(a*u,b*u,r);pts.push([x+xx,z+zz]);}return{min:[Math.min(...pts.map(p=>p[0])),Math.min(...pts.map(p=>p[1]))],max:[Math.max(...pts.map(p=>p[0])),Math.max(...pts.map(p=>p[1]))]};}
function repaint(bp,p,seed){
 const c=p.palette,s={...COLORS,...REGIONS[p.id]},t={stone:blend(c.ground,c.wall,.55),floor:blend(c.ground,c.wall,.45),wall:c.wall,wood:c.wood,woodLight:blend(c.wood,c.wall,.30),trim:blend(c.wall,'#fff1d1',.32),dark:c.shadow,glass:c.glass,roof:c.roof,sage:c.roof,clay:c.roof,blue:c.roof,leaf:c.leaf,accent:c.accent,water:c.water};
 const map=new Map(Object.entries(s).filter(([k])=>t[k]).map(([k,v])=>[v,t[k]])),v=new Voxels(seed),surfaces=new Map();
 for(const cell of bp.cells){
  // Water belongs to the continuous town waterbody, never an isolated blue tile.
  if(cell.color===s.water)continue;
  const facadeGlass=p.id==='tokyo'&&['#7d9ba9','#8caeae','#8b9eb4','#97b3b7'].includes(cell.color);
  const isGlass=facadeGlass||cell.color===s.glass||(p.id==='tokyo'&&['#aec8c2','#a7bfbe','#9eafb0','#acbebc'].includes(cell.color));
  let color=facadeGlass?cell.color:isGlass?c.glass:map.get(cell.color)||cell.color;
  let lightKey=[Math.floor(cell.x/5),Math.floor(cell.y/7),Math.floor(cell.z/5)];
  // Light whole windows, so a lit room never produces chopped yellow panes.
  if(p.id==='tokyo'&&['tokyo-highrise','tokyo-infill'].includes(bp.id)){
   const h=bp.audit.buildings[0],front=Math.abs(cell.z-h.z)===h.hz,spacing=bp.id==='tokyo-highrise'?6:5,floor=bp.id==='tokyo-highrise'?9:10;
   lightKey=[front?Math.sign(cell.z)*2:Math.sign(cell.x),Math.floor((cell.y-4)/floor),Math.floor(((front?cell.x:cell.z)+(front?h.hx:h.hz))/spacing)];
  }else if(p.id==='tokyo'&&bp.id==='tokyo-arcade'){
   lightKey=[Math.sign(cell.z),0,Math.floor((cell.x+48)/16)];
  }else if(p.id==='tokyo'&&bp.id==='tokyo-brick-station'){
   const h=bp.audit.buildings.find(b=>Math.abs(cell.x-b.x)<=b.hx)||bp.audit.buildings[0];
   lightKey=[h.x+Math.sign(cell.z),Math.floor((cell.y-5)/10),Math.floor((cell.x-h.x+h.hx-2)/5)];
  }
  // Window warmth is applied at render time, according to the local clock.
  v.put(cell.x,cell.y,cell.z,color,cell.phase);
  surfaces.set([cell.x,cell.y,cell.z].join(','),isGlass?3:[s.wood,s.woodLight].includes(cell.color)?2:cell.color===s.leaf?4:0);
 }
 if(p.id==='snow'){
  const tops=new Map();for(const c of v.list())if(c.phase===2&&c.y>10){const key=c.x+','+c.z,old=tops.get(key);if(!old||c.y>old.y)tops.set(key,c);}
  for(const c of tops.values())for(let y=1;y<=3;y++){const k=[c.x,c.y+y,c.z].join(',');if(!v.cells.has(k)){v.put(c.x,c.y+y,c.z,y===3?'#e6e8e5':'#cbd6db',2);surfaces.set(k,5);}}
 }
 const cells=v.list().map(c=>({...c,surface:surfaces.get([c.x,c.y,c.z].join(','))??0})),phases=[0,1,2,3].map(i=>cells.filter(c=>c.phase===i));
 return{...bp,cells,phases,counts:phases.map(c=>c.length),bounds:cells.reduce((b,c)=>({min:b.min.map((n,i)=>Math.min(n,[c.x,c.y,c.z][i])),max:b.max.map((n,i)=>Math.max(n,[c.x,c.y,c.z][i]))}),{min:[Infinity,Infinity,Infinity],max:[-Infinity,-Infinity,-Infinity]})};
}
function cabin(seed){
 const k=workshop('tropical',seed),{box,line,C}=k;
 for(const x of [-13,13])for(const z of [-9,9])box(x,-2,z,x+1,16,z+1,C.wood,0);
 for(const z of [-9,9]){line([-13,1,z],[14,16,z],C.woodLight,1);line([14,1,z],[-13,16,z],C.woodLight,1);}
 k.house({w:29,d:21,h:15,y:17,rise:9,shape:seed%2?'hip':'gable'});
 box(-16,17,11,16,18,17,C.woodLight,1);
 for(const x of [-16,16])box(x,-2,16,x,17,16,C.wood,0);
 for(const x of [-16,16])box(x,19,16,x,23,16,C.wood,3);
 for(const [a,b]of [[-16,-5],[5,16]])box(a,23,16,b,23,16,C.woodLight,3);
 k.accessPoint(0,19,17,'陸へつながるデッキ');
 return k.finish('island-cabin');
}
function residence(region,seed){
 const k=workshop(region,seed),two=region==='canal';
 k.house({w:two?23:35,d:21,h:two?29:16,floors:two?2:1,rise:two?10:8,shape:seed%3?'gable':'hip'});
 k.awning({z:11,w:13,y:13,depth:3});
 k.chimney(-9,-6,two?28:15,two?42:29,2);
 return k.finish(two?'canal-home':'farmhouse');
}
function radioTower(seed){
 const k=workshop('tokyo',seed),{box,line,paint,C}=k,red='#c34c32',white='#eee4ce';
 box(-16,0,-13,16,0,16,C.floor,0);
 k.house({w:13,d:9,h:11,shape:'flat',rise:1,windows:false,color:'#dedbd0',roofColor:'#b5b6a8'});
 const levels=[[1,13,10],[18,9,7],[42,5,4],[63,2,2],[79,1,1]];
 for(let i=0;i<levels.length-1;i++){
  const[y0,x0,z0]=levels[i],[y1,x1,z1]=levels[i+1],color=i===2?white:red;
  for(const sx of [-1,1])for(const sz of [-1,1])line([sx*x0,y0,sz*z0],[sx*x1,y1,sz*z1],color,1,2);
  for(const sz of [-1,1])line([-x1,y1,sz*z1],[x1,y1,sz*z1],color,1,2);
  for(const sx of [-1,1])line([sx*x1,y1,-z1],[sx*x1,y1,z1],color,1,2);
  if(i)for(const s of [-1,1]){line([-x0,y0,s*z0],[x1,y1,s*z1],color,1,2);line([x0,y0,s*z0],[-x1,y1,s*z1],color,1,2);line([s*x0,y0,-z0],[s*x1,y1,z1],color,1,2);line([s*x0,y0,z0],[s*x1,y1,-z1],color,1,2);}
  const spans=i===0?3:2;
  for(let j=1;j<spans;j++){const t=j/spans,yy=Math.round(y0+(y1-y0)*t),xx=Math.round(x0+(x1-x0)*t),zz=Math.round(z0+(z1-z0)*t);for(const s of [-1,1]){line([-xx,yy,s*zz],[xx,yy,s*zz],color,1);line([s*xx,yy,-zz],[s*xx,yy,zz],color,1);}}
 }
 for(const[y,r]of [[42,7],[63,4]]){box(-r,y,-r,r,y,r,red,2);box(-r,y+1,-r,r,y+3,r,C.glass,2);box(-r,y+4,-r,r,y+4,r,white,2);for(let x=-r;x<=r;x+=3)for(const z of [-r,r])paint(x,y+1,z,x,y+3,z,white,3);}
 box(0,79,0,0,96,0,white,2);for(const y of [82,83,89,90,95])paint(0,y,0,0,y,0,red,3);
 k.opening('tower-frame','四脚から展望室とアンテナへ連続する鉄骨');return k.finish('tokyo-tower');
}
const specs={
 grove:[['mushroom-house',-5.4,-4.2,.1],['flowers',.5,-4.5,.11],['bakery',5.8,-3.5,.10],['books',-4.9,1.1,.11],['tea',3.9,.8,.11]],
 harbor:[['harbor-inn',-4.8,-4.1,.105],['net-loft',.3,-4.8,.11],['sea-museum',5.7,-3.6,.10],['boathouse',-6.1,.15,.10],['fish-market',-.6,-.6,.10],['lighthouse',7.1,3.8,.065]],
 canal:[['clockmaker',-4.6,-5.3,.09,1],['post-office',-4.8,-1.7,.082,1],['canal-home',-4.8,2.1,.09,1],['antique-shop',-4.7,5.45,.084,1],['canal-home',4.6,-5.1,.09,3],['canal-home',4.8,-1.6,.085,3],['music-school',4.6,2.1,.084,3],['canal-home',4.6,5.6,.085,3]],
 meadow:[['barn',-5.9,-3.5,.095],['farmhouse',-.3,-4.4,.10],['windmill',6.1,-2.5,.105],['dairy',-6.2,1.4,.10],['scarecrow-hut',5.9,2.5,.10]],
 alpine:[['mountain-lodge',-5.1,-5.0,.105],['bell-tower',5.3,-4.8,.11],['ski-shop',-5.4,-.5,.11],['stone-mason',5.3,-.3,.10],['trail-refuge',-3.6,3.7,.11],['cheese-cellar',4.1,3.8,.10]],
 satoyama:[['ryokan',-5.7,-4.1,.10],['noodle-shop',0,-4.1,.11],['sake-brewery',5.8,-4.0,.095],['rice-granary',-6.8,.15,.095],['paper-workshop',6.4,.25,.095]],
 oasis:[['caravanserai',-4.4,-4.0,.10],['carpet-weaver',1.2,-4.7,.10],['spice-house',6,-3.3,.11],['date-market',6.8,1.9,.10],['adobe-school',-6.7,2.4,.10]],
 snow:[['wool-mill',-5.7,-3.6,.11],['sauna',-.2,-4.6,.11],['winter-greenhouse',5.7,-3.5,.10],['sled-workshop',-5.5,1.5,.10],['reindeer-stable',1,1.3,.10],['aurora-station',6,2.5,.10]],
 stars:[['observatory',-.4,-3.0,.10],['star-map-library',-5.5,2.8,.09],['meteorite-lab',5.4,2.3,.10],['balloon-port',5.9,-3.5,.095]],
 tropical:[['surf-school',-5.7,-3.8,.11],['fruit-bar',.2,-4.3,.11],['palm-weaver',6,-3.4,.11],['island-cabin',-4,1,.1],['island-cabin',4,1,.1]]
};
const treeCounts={grove:28,harbor:7,canal:10,meadow:9,alpine:24,satoyama:11,oasis:5,snow:30,stars:8,tropical:24,tokyo:0};
export function treeCells(region,variant,seed){
 const v=new Voxels(seed),put=(...a)=>v.put(...a),box=(...a)=>v.box(...a),line=(...a)=>v.line(...a);
 const leaf=REGIONS[region].leaf||'#648354',wood='#8c7658';
 const ell=(x,y,z,rx,ry,rz,c)=>{for(let a=-Math.ceil(rx);a<=rx;a++)for(let b=-Math.ceil(ry);b<=ry;b++)for(let d=-Math.ceil(rz);d<=rz;d++)if((a/rx)**2+(b/ry)**2+(d/rz)**2<1&&(hash(seed,Math.floor((a+x)/2),Math.floor((b+y)/2),Math.floor((d+z)/2))>.05))put(a+x,b+y,d+z,c);};
 if(['oasis','tropical'].includes(region)){
  const h=23+variant*2;for(let y=0;y<h;y++)box(Math.floor(y/10),y,0,Math.floor(y/10)+1,y,1,y%4?'#99805c':'#b19b72');
  for(let n=0;n<8;n++){const angle=n*Math.PI/4+variant*.31;for(let j=0;j<13;j++){const x=Math.round(h/10+Math.cos(angle)*j),z=Math.round(Math.sin(angle)*j),y=h+Math.round(Math.sin(j/12*Math.PI)*3-j*.3);box(x-1,y,z-1,x+1,y,z+1,n%3===0?'#829963':'#60834f');}}
 }else if(['alpine','snow'].includes(region)){
  box(0,0,0,1,33,1,wood);
  for(let y=9;y<39;y++){const r=Math.max(1,Math.ceil((39-y)*.24)+((y%6)<2?1:0));for(let x=-r;x<=r;x++)for(let z=-r;z<=r;z++)if(Math.abs(x)+Math.abs(z)<r*1.5)put(x,y,z,region==='snow'&&y%6<2?'#dce4df':y%6===5?'#7a967e':'#58765d');}
 }else{
  const birch=region==='grove'&&variant===1,h=19+variant*2;box(0,0,0,1,h,1,birch?'#d7d5bc':wood);
  if(birch)for(let y=3;y<h;y+=4)put(1,y,1,'#727f6b',0,true);
  const colors=region==='satoyama'?['#849165','#a2a169','#77895f']:region==='meadow'?['#698757','#8ca06e','#7b9563']:['#618054','#839765','#708d5b'];
  for(let n=0;n<5;n++){const a=n*2.399+variant,x=Math.round(Math.cos(a)*(n===0?0:6)),z=Math.round(Math.sin(a)*(n===0?0:5)),y=h+4+(n%3)*4;line([0,h-7,0],[x,y,z],birch?'#c8c6ab':wood,0,2);ell(x,y,z,6+(n%2),5,6,colors[n%3]);}
  if(region==='canal')for(let n=0;n<12;n++){const a=n*Math.PI/6,x=Math.round(Math.cos(a)*9),z=Math.round(Math.sin(a)*8);box(x,13+n%4,z,x,24,z,'#96ac7b');}
 }
 return v.list();
}
export function makeTown(p,seed=741){
 seed=Math.abs(Math.floor(seed))%1000000;const id=p.id,C=p.palette,boxes=[],buildings=[],trees=[],plants=[],paths=[],routes=[],waterY=-.10;
 const box=(x,y,z,w,h,d,color,kind='land')=>boxes.push({x,y,z,w,h,d,color,kind});
 const city=id==='tokyo'?tokyoDistrictPlan(seed,radioTower):null,half=city?.half||HALF;
 const inside=(x,z)=>Math.abs(x)<=half[0]&&Math.abs(z)<=half[1]&&(!!city||Math.hypot(Math.max(0,Math.abs(x)-8.3),Math.max(0,Math.abs(z)-6.3))<2.3);
 function wet(x,z){
  if(id==='grove')return z>4.9+.22*Math.sin(x*.6)&&z<6.4+.10*Math.sin(x*.6);
  if(id==='harbor'){if(buildings.some(b=>b.kind!=='boathouse'&&inRect(x,z,b.bounds,.45)))return false;return z>.75+.029*(x+1)**2;}
  if(id==='canal')return Math.abs(x)<1.60;
  if(id==='meadow'||id==='alpine'||id==='satoyama')return (id==='satoyama'&&paddy(x,z))||z>6.35+.20*Math.sin(x*.8);
  if(id==='oasis')return ((x+.8)/2.7)**2+((z-2.0)/2.0)**2<1;
  if(id==='tropical')return z>-.05+.028*x*x;
  return false;
 }
 function raw(x,z){
  if(id==='alpine'){
   if(Math.abs(x)<.65){if(z<-3.5)return 2.24;if(z<.1)return Math.round((2.24-(z+3.5)*1.12/3.6)/.08)*.08;if(z<1.4)return 1.12;if(z<4)return Math.round((1.12-(z-1.4)*.80/2.6)/.08)*.08;return .32;}
   return z<-2.9?2.24:z<1.6?1.12:.32;
  }
  if(id==='stars'){const r=Math.hypot(x*.75,(z+2.3)*.85);return .32+Math.max(0,Math.floor((6.2-r)/.32))*.08;}
  if(id==='satoyama'){if(Math.abs(x)<.65&&z>-2.2&&z<-.2)return .32+Math.round((-.2-z)*.24/.08)*.08;return z<-1.6?.8:.32;}
  return .32;
 }
 function deck(x,z){
  if(id==='canal'&&[-3.3,3.45].some(q=>Math.abs(z-q)<.62)&&Math.abs(x)<2.8)return .32+Math.round(Math.max(0,1-Math.abs(x)/2.8)*4)*.08;
  if(id==='grove'&&Math.abs(x+1.8)<.7&&z>4.4&&z<6.6)return .40;
  if(id==='tropical'){
   if(Math.abs(x)<.65&&z>=-3.35&&z<=3.5)return Math.min(1.30,.34+Math.floor((z+3.35)/.28)*.08);
   if(z>=2.55&&z<=3.6&&Math.abs(x)<5.65)return 1.30;
   if(z>=1.9&&z<2.56&&Math.abs(Math.abs(x)-4)<1.6)return 1.30;
  }
  return null;
 }
 const entries=city?.buildings||specs[id].map(([kind,x,z,u=.1,rot=0],i)=>({kind,x,z,u,rot,bp:kind==='island-cabin'?cabin(seed+i):['canal-home','farmhouse'].includes(kind)?residence(id,seed+i):contentBlueprint(kind,seed+i*53)}));
 for(const [i,e]of entries.entries()){
  // Terrain connections stay authored; seeded variation affects parts and ecology.
  const bp=repaint(e.bp,p,seed+i*53),bounds=rect(bp,e.x,e.z,e.u,e.rot),base=e.kind==='island-cabin'?-.60:raw(e.x,e.z);
  const tile=city?.tiles.find(t=>t.id===e.district),siblings=tile?entries.filter(b=>b.district===tile.id):entries,j=tile?siblings.indexOf(e):i;
  buildings.push({...e,id:'building-'+i,bp,bounds,base,y:base+e.u/2,start:tile?(tile.index+j/(siblings.length+.4))/4:i/(entries.length+.4),end:tile?(tile.index+(j+1.4)/(siblings.length+.4))/4:(i+1.4)/(entries.length+.4)});
 }
 function surface(x,z){
  const d=deck(x,z);if(d!==null)return d;
  const b=buildings.find(b=>b.kind!=='island-cabin'&&inRect(x,z,b.bounds,.03)&&(!wet(x,z)||b.kind==='lighthouse'));
  return b?b.base:wet(x,z)?waterY:raw(x,z);
 }
 const roads=city?.roads||(id==='canal'?[[[-2.35,-7.3],[-2.35,7.3]],[[2.35,-7.3],[2.35,7.3]]]:id==='tropical'?[[[-8,-2.2],[8,-2.2]],[[0,-2.5],[0,3.5]]]:id==='oasis'?[[[-8,-1.4],[8,-1.4]],[[-4,-1.4],[-4,5.1]],[[3.2,-1.4],[3.2,5.1]],[[-4,5.1],[3.2,5.1]]]:id==='alpine'?[[[0,-6.8],[0,5.8]],[[-8,-2.3],[8,-2.3]],[[-8,2],[8,2]],[[-8,5.6],[8,5.6]]]:id==='stars'?[[[-7,5.3],[7,5.3]],[[-7,5.3],[-7,-5.8]],[[7,5.3],[7,-5.8]],[[-7,-5.8],[7,-5.8]]]:[[[-8,-1.6],[8,-1.6]],[[-8,4.7],[8,4.7]],[[0,-6.5],[0,5.7]]]);
 const occupied=(x,z,pad=0)=>buildings.some(b=>inRect(x,z,b.bounds,pad));
 const mainPath=(x,z)=>roads.some(([a,b])=>dist([x,z],a,b)<.43)&&!occupied(x,z,.03);
 const key=(x,z)=>x+','+z,grid=new Map();
 const gridHalf=city?half.map(h=>Math.floor(h/GRID)-1):[31,25];
 for(let ix=-gridHalf[0];ix<=gridHalf[0];ix++)for(let iz=-gridHalf[1];iz<=gridHalf[1];iz++){
  const x=ix*GRID,z=iz*GRID;if(!inside(x,z))continue;const d=deck(x,z),walk=(!wet(x,z)||d!==null)&&!occupied(x,z,.02)&&(!city||insideLoop(x,z,.77,city.rail));
  grid.set(key(ix,iz),{ix,iz,x,z,y:surface(x,z),walk,path:walk&&(mainPath(x,z)||d!==null)});
 }
 // Each entrance gets a connected route on the same height map as the scenery.
 for(const b of buildings){
  let entrance=b.bp.audit?.entrances.find(e=>e.access==='ground')||b.bp.audit?.entrances[0];
  if(b.kind==='island-cabin')entrance={x:0,z:17,y:19,normal:[0,1]};
  if(b.kind==='boathouse')entrance={x:-18,z:8,y:1,normal:[-1,0]};
  if(b.kind==='fish-market')entrance={...entrance,normal:[0,-1]};
  if(!entrance){entrance={x:0,z:b.bp.bounds.max[2],normal:[0,1]};}
  const[nx,nz]=turn(...(entrance.normal||[0,1]),b.rot),[lx,lz]=turn(entrance.x*b.u,entrance.z*b.u,b.rot),start=[b.x+lx,b.z+lz];
  let outside=[...start];for(let n=0;n<40&&inRect(...outside,b.bounds,.2);n++)outside=[outside[0]+nx*.12,outside[1]+nz*.12];
  if(b.kind==='island-cabin')outside=[b.x,3.15];
  let sx=Math.round(outside[0]/GRID),sz=Math.round(outside[1]/GRID),first=grid.get(key(sx,sz));
  if(!first?.walk){const nearby=[...grid.values()].filter(c=>c.walk&&Math.hypot(c.x-outside[0],c.z-outside[1])<1).sort((a,c)=>Math.hypot(a.x-outside[0],a.z-outside[1])-Math.hypot(c.x-outside[0],c.z-outside[1]));first=nearby[0];}
  const queue=first?[first]:[],prev=new Map(first?[[key(first.ix,first.iz),null]]:[]);let found=null;
  for(let n=0;n<queue.length;n++){const c=queue[n];if(c.path){found=c;break;}for(const [dx,dz]of [[1,0],[-1,0],[0,1],[0,-1]]){const q=grid.get(key(c.ix+dx,c.iz+dz));if(!q?.walk||prev.has(key(q.ix,q.iz))||Math.abs(q.y-c.y)>.33)continue;prev.set(key(q.ix,q.iz),c);queue.push(q);}}
  const route=[];for(let c=found;c;c=prev.get(key(c.ix,c.iz))){c.path=true;route.push([c.x,c.y,c.z]);}route.reverse();
  b.entrance={start,outside,connected:!!found,route};routes.push(route);paths.push({a:start,b:outside});
 }
 function onPath(x,z){return mainPath(x,z)||paths.some(s=>dist([x,z],s.a,s.b)<.38)||routes.some(r=>r.some(c=>Math.hypot(c[0]-x,c[2]-z)<.48))||grid.get(key(Math.round(x/GRID),Math.round(z/GRID)))?.path;}
 function paddy(x,z){return id==='satoyama'&&!buildings.some(b=>inRect(x,z,b.bounds,.5))&&z>2&&z<5.7&&Math.abs(z-4.7)>.38&&((x>1.3&&x<7.4)||(x<-1.3&&x>-7.4));}
 function field(x,z){return id==='meadow'&&z>.2&&z<5.6&&((x>1.5&&x<7.5)||(x<-1.6&&x>-7.5));}
 for(const c of grid.values()){
  const{x,z}=c,w=wet(x,z)&&deck(x,z)===null;
  const h=w?waterY:surface(x,z),under=wet(x,z)?waterY:raw(x,z),d=deck(x,z),road=onPath(x,z)&&!occupied(x,z);
  let col=id==='snow'?'#dce3df':C.ground;
  if(city)col=tokyoPavement(x,z);
  else if(w)col=paddy(x,z)?'#92b2a2':blend(C.water,id==='tropical'?'#267d92':'#456b79',Math.round(clamp((z-2)/16,0,.4)*8)/8);
  else if(paddy(x,z))col='#93aa8e';
  else if(field(x,z))col='#c5b378';
  else if(road)col=id==='snow'?'#a5afb0':blend(C.wall,C.ground,.18);
  else col=blend(col,id==='oasis'||id==='tropical'?'#f0d7a3':'#b6bd8b',hash(seed,Math.floor(c.ix/4),Math.floor(c.iz/4),49)*.12);
  const bottom=-.8;
  if(d!==null){
   box(x,(bottom+under)/2,z,GRID,under-bottom,GRID,wet(x,z)?C.water:col,wet(x,z)?'water':'land');
   box(x,d-.055,z,GRID,.11,GRID,id==='tropical'?((c.iz%3)?'#ad9974':'#a08a65'):blend(C.wall,C.ground,.2),'bridge');
  }else box(x,(bottom+h)/2,z,GRID,h-bottom,GRID,col,w?'water':'land');
  if(!w&&!road&&id==='alpine'&&Math.abs(x)>.8&&[-2.88,1.60].some(q=>Math.abs(z-q)<.18))box(x,h+.06,z,GRID,.12,GRID,'#a0a294','retaining');
  if(d!==null&&id==='tropical'&&c.ix%4===0&&c.iz%4===0)box(x,(d+waterY-.45)/2,z,.10,d-waterY+.45,.10,C.wood,'pier');
 }
 // A solid low plinth gives the island a coherent edge, with restrained strata.
 if(city)boxes.push(...tokyoStreetDetails());else box(0,-.95,0,18.8,.30,14.7,blend(C.ground,C.shadow,.35),'base');
 // Bridge parapets leave the centre and landings clear.
 if(id==='canal')for(const z of [-3.3,3.45])for(let x=-2.55;x<=2.55;x+=.32)for(const side of [-1,1]){const y=deck(x,z);box(x,y+.25,z+side*.65,.33,.12,.10,'#aba995','railing');if(Math.round(x/.32)%3===0)box(x,y+.13,z+side*.65,.10,.26,.10,'#9c9f90','railing');}
 if(id==='grove')for(const x of [-2.48,-1.12])for(let z=4.5;z<6.65;z+=.32){box(x,.71,z,.09,.09,.34,'#9a8c6e','railing');if(Math.round(z/.32)%3===0)box(x,.56,z,.09,.30,.10,'#9a8c6e','railing');}
 if(id==='harbor')for(let x=-9.2;x<=9.2;x+=.32){const z=.75+.029*(x+1)**2;if(inside(x,z)&&!occupied(x,z,.2)){box(x,.12,z,.32,.45,.32,'#a9aaa0','quay');if(Math.round(x/.32)%8===0)box(x,.55,z-.25,.13,.4,.13,'#5c7377','bollard');}}
 // A continuous stone terrace supports the lighthouse at the water's edge.
 if(id==='harbor'){const b=buildings.find(b=>b.kind==='lighthouse');for(let x=b.bounds.min[0]-.2;x<b.bounds.max[0]+.2;x+=.32)for(let z=b.bounds.min[1]-.2;z<b.bounds.max[1]+.2;z+=.32)box(x,-.15,z,.32,.94,.32,'#b1ae99','quay');}
 if(id==='meadow'||id==='satoyama'){
  for(let x=-7.3;x<7.5;x+=.42)for(let z=.7;z<5.65;z+=.43)if((paddy(x,z)||field(x,z))&&!onPath(x,z)&&!occupied(x,z,.3))plants.push({id:'crop-'+plants.length,x,z,y:surface(x,z),kind:'crop',variant:Math.floor(hash(seed,plants.length)*4),u:.075,birth:hash(seed,plants.length,761)*.96+.02});
 }
 for(let i=0;i<5000&&trees.length<treeCounts[id];i++){
  // Palms can use the rear border, while keeping their full canopy clear of roofs.
  const x=(hash(seed,i,231)*2-1)*(id==='oasis'?9.65:9.3),z=(hash(seed,i,232)*2-1)*(id==='oasis'?8.1:7.4);
  if((['meadow','satoyama'].includes(id)&&z>-.2)||(id==='grove'&&z>4.4))continue;
  // Keep palms and snow-covered pines behind the village in the default view.
  // The positive-x edge is also foreground, so leave both visible fronts open.
  if(['oasis','snow'].includes(id)&&!(z< -5.8||(x< -7.6&&z< -1.5)))continue;
  const canopyClearance=['oasis','tropical'].includes(id)?2.15:['alpine','snow'].includes(id)?1.15:1.70;
  if(!inside(x,z)||wet(x,z)||deck(x,z)!==null||occupied(x,z,canopyClearance)||onPath(x,z)||roads.some(([a,b])=>dist([x,z],a,b)<1)||trees.some(t=>Math.hypot(t.x-x,t.z-z)<1.8)||paddy(x,z)||field(x,z))continue;
  // Keep the central sightline open; taller woodland lives around the perimeter.
  if(id==='grove'&&Math.abs(x)<3.2&&z<3.8&&z>-3.8)continue;
  trees.push({x,z,y:surface(x,z),variant:trees.length%4,u:['oasis','tropical'].includes(id)?.125:id==='grove'?.13:.12,birth:trees.length%4===0?hash(seed,i,234)*.8:0});
 }
 const kinds=id==='grove'?Object.keys(WILDFLOWER_COLORS).flatMap(k=>['fern','clover','fern',k]):id==='harbor'?['beach-grass','sea-lavender','succulent']:id==='canal'?['iris','hydrangea','reed']:id==='tropical'?['beach-grass','succulent']:id==='snow'?['beach-grass']:['clover','bluebell','fern'];
 const target=id==='tokyo'?0:id==='oasis'?85:id==='snow'?100:id==='grove'?500:230;
 for(let i=0,n=0;i<7000&&n<target;i++){
  const x=(hash(seed,i,501)*2-1)*9.8,z=(hash(seed,i,502)*2-1)*7.8;
  if(!inside(x,z)||wet(x,z)||deck(x,z)!==null||occupied(x,z,.22)||onPath(x,z)||roads.some(([a,b])=>dist([x,z],a,b)<.58)||paddy(x,z)||field(x,z))continue;
  if(id==='grove'&&trees.some(t=>Math.hypot(t.x-x,t.z-z)<.5))continue;
  plants.push({id:'plant-'+i,x,z,y:surface(x,z),kind:kinds[i%kinds.length],variant:i%4,u:.075,birth:n<30?0:hash(seed,i,509)});n++;
 }
 // Stones break up large areas at the perimeter without closing the walking routes.
 for(let i=0;i<45;i++){const x=(hash(seed,i,601)*2-1)*9.7,z=(hash(seed,i,602)*2-1)*7.7;if(!inside(x,z)||wet(x,z)||occupied(x,z,.5)||onPath(x,z)||paddy(x,z)||field(x,z)||id==='tokyo')continue;const h=.16+hash(seed,i,603)*.38;box(x,surface(x,z)+h/2,z,.3+h,h,.3+h*.7,blend(C.ground,C.shadow,.16),'stone');}
 // Tokyo lamps follow each street's perpendicular, not a fixed x offset.
 // Leave the entire lamp cap clear of rendered road cells and retain space
 // around entrance routes. If neither sidewalk is free, omit that lamp.
 const lamps=[];
 if(city){
  const roadCells=boxes.filter(b=>b.kind==='land'&&b.color==='#78858a');
  function lampSite(x,z){
   if(!insideLoop(x,z,1.05,city.rail)||occupied(x,z,.34))return false;
   if(roadCells.some(b=>Math.abs(x-b.x)<b.w/2+.22&&Math.abs(z-b.z)<b.d/2+.22))return false;
   if(paths.some(s=>dist([x,z],s.a,s.b)<.66))return false;
   for(const dx of [-.24,0,.24])for(const dz of [-.24,0,.24])if(onPath(x+dx,z+dz))return false;
   if(Math.abs(x-SHIBUYA_CROSSING.x)<2.5&&Math.abs(z-SHIBUYA_CROSSING.z)<2.4)return false;
   if(boxes.some(b=>b.kind==='signal'&&Math.abs(x-b.x)<b.w/2+.35&&Math.abs(z-b.z)<b.d/2+.35))return false;
   return lamps.every(l=>Math.hypot(l.x-x,l.z-z)>3);
  }
  for(const [a,b]of roads){
   const dx=b[0]-a[0],dz=b[1]-a[1],length=Math.hypot(dx,dz),nx=-dz/length,nz=dx/length;
   for(let d=1.4,i=0;d<length-1.1;d+=2.8,i++){
    for(const side of i%2?[-1,1]:[1,-1]){
     const x=a[0]+dx*d/length+nx*1.28*side,z=a[1]+dz*d/length+nz*1.28*side;
     if(lampSite(x,z)){lamps.push({x,y:surface(x,z),z});break;}
    }
   }
  }
 }else if(['canal','snow','stars'].includes(id)){
  for(const [i,c]of [...grid.values()].filter(c=>c.path).entries()){
   if(i%30)continue;const x=c.x+.65,z=c.z;if(wet(x,z)||occupied(x,z,.2)||!inside(x,z))continue;
   lamps.push({x,y:surface(x,z),z});
  }
 }
 for(const {x,y,z}of lamps){box(x,y+.75,z,.08,1.5,.08,C.wood,'lamp');box(x,y+1.53,z,.25,.20,.25,'#e4cf99','lamp-light');box(x,y+1.67,z,.32,.09,.32,C.roof,'lamp');}
 // One crate and a bench beside a path add human scale without blocking doors.
 for(const [i,b]of buildings.entries())if(i%2===0&&!['tokyo','tropical'].includes(id)){const x=b.bounds.max[0]+.36,z=b.bounds.max[1]-.25,y=surface(x,z);if(inside(x,z)&&!wet(x,z)&&!occupied(x,z,.15)&&!onPath(x,z)){for(const xx of [x-.23,x+.23])for(const zz of [z-.1,z+.1])box(xx,y+.12,zz,.06,.24,.06,C.wood,'furniture');box(x,y+.28,z,.60,.10,.30,blend(C.wood,C.wall,.3),'furniture');box(x,y+.43,z-.12,.60,.24,.07,blend(C.wood,C.wall,.3),'furniture');}}
 // Just two small mushrooms at each of three tree bases. They appear only
 // after their tree, and avoid paths, rocks, furniture and other plants.
 if(id==='grove'){
  let groups=0;
  const roots=trees.map((t,i)=>({...t,index:i})).sort((a,b)=>hash(seed,a.index,771)-hash(seed,b.index,771));
  for(const t of roots){
   if(groups>=3)break;let count=0;
   for(let i=0;i<12&&count<2;i++){
    const angle=hash(seed,t.index,772)*Math.PI*2+i*Math.PI/6,r=.54+hash(seed,t.index,i,773)*.10,x=t.x+Math.cos(angle)*r,z=t.z+Math.sin(angle)*r,y=surface(x,z);
    if(!inside(x,z)||wet(x,z)||deck(x,z)!==null||occupied(x,z,.18)||onPath(x,z)||roads.some(([a,b])=>dist([x,z],a,b)<.65)||Math.abs(y-t.y)>.015)continue;
    if(boxes.some(b=>!['base','land','water'].includes(b.kind)&&Math.abs(b.x-x)<b.w/2+.14&&Math.abs(b.z-z)<b.d/2+.14&&b.y+b.h/2>y+.02))continue;
    if(plants.some(p=>p.kind==='mushroom'&&Math.hypot(p.x-x,p.z-z)<.27))continue;
    for(let j=plants.length-1;j>=0;j--)if(plants[j].kind!=='mushroom'&&Math.hypot(plants[j].x-x,plants[j].z-z)<.30)plants.splice(j,1);
    plants.push({id:`root-mushroom-${t.index}-${count}`,x,y,z,kind:'mushroom',tree:t.index,variant:count,u:.045,birth:Math.max(t.birth+.02,.12+hash(seed,t.index,i,774)*.75)});count++;
   }
   if(count)groups++;
  }
 }
 const crop=new Voxels();for(const x of [-1,1])crop.box(x,0,0,x,3,0,id==='satoyama'?'#789568':'#a7a26a');crop.box(0,0,0,0,5,0,id==='satoyama'?'#8eab70':'#c7b573');crop.box(-1,5,0,1,6,0,id==='satoyama'?'#afbb78':'#ddc58b');
 const prototypes=Object.fromEntries([...new Set(plants.map(p=>p.kind))].map(k=>[k,k==='crop'?crop.list():plantBlueprint(k,seed)]));
 return{id,p,seed,half,tiles:city?.tiles||[],rail:city?.rail,walkBudget:city?.walkBudget||20000,boxes,buildings,trees,plants,prototypes,routes,lamps,inside,wet,surface,deck,onPath,waterY,treePrototypes:Array.from({length:4},(_,i)=>treeCells(id,i,seed+i*61)),signature:buildings.reduce((n,b)=>n+b.bp.cells.length*31+Math.round(b.x*100)+Math.round(b.z*100)+b.bp.cells.reduce((n,c)=>(n+parseInt(c.color.slice(1),16))>>>0,0),0)+plants.reduce((n,p)=>n+Math.round(p.x*100)+Math.round(p.z*100),0)};
}
export const buildingProgress=(b,value)=>clamp((value-b.start)/(b.end-b.start),0,1);
