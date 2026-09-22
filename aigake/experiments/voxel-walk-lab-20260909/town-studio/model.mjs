import {DEFAULT,validateDesign} from '../jev-lab/design.mjs';
import {generate} from '../jev-lab/generator.mjs';
import {REGIONS} from '../content/catalog.mjs';
import {PROPS,propModel,placedCells,rotate} from './props.mjs';
export const TYPES={cottage:'平屋',townhouse:'住居付き',ell:'L字',courtyard:'中庭型'};
export const SITES={normal:'標準',corner:'角地',narrow:'路地',waterfront:'水辺'};
export const ADDONS={terrace:'テラス',workshop:'作業場・閲覧室',residence:'居住階'};
export const KINDS={house:'住宅',bakery:'パン屋',cafe:'喫茶店'};
export const REGION_NAMES={grove:'林間の町',harbor:'港',canal:'運河',meadow:'牧草地',alpine:'山村',satoyama:'里山',oasis:'オアシス',snow:'雪の村',stars:'星見の丘',tropical:'南の島',tokyo:'東京'};
export const WATER_REGIONS=['harbor','canal','tropical','oasis'];
export const BUDGET=20000,EXTENSION_BUDGET=5000,FORMAT='komorebi-town',VERSION=1;
export const key=(x,z)=>`${x},${z}`;
export const inside=(x,z)=>x>=-64&&x<=64&&z>=-57&&z<=57;
export const water=(state,x,z)=>WATER_REGIONS.includes(state.region)&&z>=49;
export const road=(x,z)=>Math.abs(x)<=3||Math.abs(z)<=3;
export const transform=(b,x,z)=>{const [a,c]=rotate(x,z,b.r);return[a+b.x,c+b.z];};
export const progress=b=>Math.min(1,b.steps/BUDGET);
const clone=x=>structuredClone(x), cache=new Map();
export function initialState(){return{format:FORMAT,version:VERSION,name:'わたしの町',region:'grove',hour:13,buildings:[
 {id:'b0',kind:'bakery',type:'townhouse',site:'corner',roof:'gable',wall:'plaster',roofColor:'clay',windows:'wide',entrance:'regular',x:-32,z:-28,r:0,steps:20000,addons:[]},
 {id:'b1',kind:'house',type:'ell',site:'normal',roof:'hip',wall:'timber',roofColor:'sage',windows:'regular',entrance:'regular',x:32,z:-28,r:0,steps:20000,addons:[]},
 {id:'b2',kind:'cafe',type:'courtyard',site:'normal',roof:'flat',wall:'brick',roofColor:'slate',windows:'wide',entrance:'regular',x:-32,z:28,r:2,steps:20000,addons:[{kind:'terrace',steps:5000}]},
 {id:'b3',kind:'house',type:'cottage',site:'normal',roof:'hip',wall:'plaster',roofColor:'sage',windows:'regular',entrance:'regular',x:32,z:28,r:2,steps:7000,addons:[]},
 ],props:[{id:'p1',kind:'bench',x:-15,z:-7,r:0},{id:'p2',kind:'lamp',x:8,z:8,r:0},{id:'p3',kind:'flowers',x:20,z:-7,r:0},{id:'p4',kind:'tree',x:-56,z:-46,r:0},{id:'p5',kind:'books',x:-56,z:12,r:1},{id:'p6',kind:'planter',x:51,z:-10,r:0}],paths:[]};}
function option(value,values,label){if(!Object.hasOwn(values,value))throw Error(`${label}が読み取れません。`);return value;}
function integer(value,min,max,label){if(!Number.isInteger(value)||value<min||value>max)throw Error(`${label}が範囲外です。`);return value;}
export function validateState(raw,{shared=false}={}){
 if(!raw||raw.format!==FORMAT||raw.version!==VERSION)throw Error('この町の設計ファイルは読み込めません。');
 if(typeof raw.name!=='string'||raw.name.length>40||!Array.isArray(raw.buildings)||raw.buildings.length!==4||!Array.isArray(raw.props)||raw.props.length>120||!Array.isArray(raw.paths)||raw.paths.length>1200)throw Error('設計のサイズが範囲外です。');
 const state={format:FORMAT,version:VERSION,name:raw.name.replace(/[\x00-\x1f]/g,'').trim()||'わたしの町',region:option(raw.region,REGIONS,'地域'),hour:integer(raw.hour,0,23,'時刻'),buildings:[],props:[],paths:[]};
 for(const [i,b] of raw.buildings.entries()){
   if(b.id!==`b${i}`||!Array.isArray(b.addons)||b.addons.length>3||new Set(b.addons.map(a=>a.kind)).size!==b.addons.length)throw Error('建物の指定が読み取れません。');
   const d=validateDesign({...DEFAULT,...b,layout:'rectangle',floors:'one',terrace:'none'});
   const next={id:b.id,kind:d.kind,type:option(b.type,TYPES,'建築型'),site:option(b.site,SITES,'敷地'),roof:d.roof,wall:d.wall,roofColor:d.roofColor,windows:d.windows,entrance:d.entrance,x:integer(b.x,-48,48,'建物の位置'),z:integer(b.z,-40,40,'建物の位置'),r:integer(b.r,0,3,'建物の向き'),steps:shared?0:integer(b.steps,0,20000,'建築歩数'),addons:b.addons.map(a=>({kind:option(a.kind,ADDONS,'増築'),steps:shared?0:integer(a.steps,0,5000,'増築歩数')}))};
   if(next.addons.some(a=>a.kind==='residence')&&(next.type==='townhouse'||next.site==='narrow'))throw Error('2階建てに居住階を重ねることはできません。');state.buildings.push(next);
 }
 const ids=new Set();for(const p of raw.props){if(typeof p.id!=='string'||!/^p[\w-]{1,50}$/.test(p.id)||ids.has(p.id))throw Error('小物の番号が読み取れません。');ids.add(p.id);state.props.push({id:p.id,kind:option(p.kind,PROPS,'小物'),x:integer(p.x,-64,64,'小物の位置'),z:integer(p.z,-57,57,'小物の位置'),r:integer(p.r,0,3,'小物の向き')});}
 for(const p of raw.paths){if(!Array.isArray(p)||p.length!==3||!['stone','brick','wood'].includes(p[2]))throw Error('道の指定が読み取れません。');state.paths.push([integer(p[0],-64,64,'道'),integer(p[1],-57,57,'道'),p[2]]);}
 return state;
}
export function buildingModel(b){
 const signature=JSON.stringify({...b,steps:0,addons:b.addons.map(a=>({kind:a.kind,steps:0}))});if(cache.has(signature))return cache.get(signature);
 const two=b.type==='townhouse'||b.site==='narrow',layout=b.site==='narrow'?'rectangle':b.type==='ell'?'ell':b.type==='courtyard'?'courtyard':'rectangle';
 const design={...DEFAULT,...b,layout,floors:two?'two':'one',terrace:'none'};
 const base=generate(design,{narrow:b.site==='narrow'}),baseCells=base.cells.filter(c=>c.tag!=='paving'),additions=[],entrances=base.doors.map(d=>({...d}));
 const original=new Map(baseCells.map(c=>[`${c.x},${c.y},${c.z}`,c]));
 let residence=null;const workshopRemove=new Set();
 if(b.addons.some(a=>a.kind==='residence')){
   const full=generate({...design,floors:'two'}),oldRoof=new Set(baseCells.filter(c=>['roof','parapet','gable'].includes(c.tag)).map(c=>`${c.x},${c.y},${c.z}`));
   residence={remove:oldRoof,cells:full.cells.filter(c=>c.tag!=='paving'&&(c.y>=16||c.tag==='stair'))};
 }
 for(const addon of b.addons){const cells=[],put=(x,y,z,color,tag='extension')=>cells.push({x,y,z,color,phase:y===0?0:y<12?1:2,tag}),box=(x0,y0,z0,x1,y1,z1,color,tag)=>{for(let y=y0;y<=y1;y++)for(let z=z0;z<=z1;z++)for(let x=x0;x<=x1;x++)put(x,y,z,color,tag);};
   if(addon.kind==='terrace'){
     box(17,0,-11,27,0,11,'#c2a47d','deck');
     for(const [kind,x,z,r] of [['table',22,0,0],['chair',22,-8,0],['chair',22,8,2]])for(const c of placedCells({id:'extension',kind,x,z,r}))cells.push({...c,phase:3});
   }
   if(addon.kind==='workshop'){
     const edge=Math.min(...base.footprint.map(p=>p.x)),x0=-26,x1=edge-1,z0=-10,z1=4;
     box(x0,0,z0,x1,0,z1,'#b6a48a');
     for(let x=x0;x<=x1;x++)for(let z=z0;z<=z1;z++){
       if(x===x0||x===x1||z===z0||z===z1)for(let y=1;y<=12;y++){
         if(x===x1&&z>=-5&&z<=-1&&y<=10)continue;
         put(x,y,z,(x===x0||x===x1)&&(z===z0||z===z1)?'#806344':'#d6c6a7');
       }
       box(x,13,z,x,14,z,'#6e8b82','roof');
     }
     for(let z=-5;z<=-1;z++)for(let y=1;y<=10;y++)workshopRemove.add(`${edge},${y},${z}`);
     const dx=Math.round((x0+x1)/2);box(dx-2,1,z1,dx+2,9,z1,'#88664a','door');box(dx-1,5,z1,dx+1,8,z1,'#adc5bb','glass');entrances.push({x:dx,z:z1,half:2,top:9,canopy:13});
   }
   if(addon.kind==='residence')cells.push(...residence.cells);
   additions.push({kind:addon.kind,cells:cells.sort((a,c)=>a.phase-c.phase||a.y-c.y||a.z-c.z||a.x-c.x)});
 }
 const mapCell=c=>{const [x,z]=transform(b,c.x,c.z);return{...c,x,z,owner:b.id};};
 const worldKeys=keys=>new Set([...keys].map(k=>{const[x,y,z]=k.split(',').map(Number),[a,c]=transform(b,x,z);return`${a},${y},${c}`;}));
 const result={base:[...original.values()].map(mapCell),additions:additions.map(a=>({...a,cells:a.cells.map(mapCell)})),residenceRemove:residence?worldKeys(residence.remove):null,workshopRemove:worldKeys(workshopRemove),
   entrances:entrances.map(e=>{const[x,z]=transform(b,e.x,e.z),[nx,nz]=rotate(0,1,b.r);return{...e,x,z,nx,nz};}),local:base,design};
 if(b.site==='waterfront'){
   const cells=[];for(let z=11;z<=28;z++)for(let x=-4;x<=4;x++){const[a,c]=transform(b,x,z);cells.push({x:a,y:0,z:c,color:'#ae8c63',phase:0,tag:'dock',owner:b.id});}
   result.base.push(...cells);
 }
 if(cache.size>100)cache.clear();cache.set(signature,result);return result;
}
export function solidCells(b){const m=buildingModel(b);return[...m.base,...m.additions.flatMap(a=>a.cells)];}
export function visibleCells(b,preview=false){
 const m=buildingModel(b),fraction=preview?1:progress(b),baseCount=Math.floor(m.base.length*fraction);let cells=m.base.slice(0,baseCount);
 for(const addon of m.additions){const value=b.addons.find(a=>a.kind===addon.kind).steps;if(fraction<1&&!preview)continue;
   if(addon.kind==='residence'&&(preview||value>0))cells=cells.filter(c=>!m.residenceRemove.has(`${c.x},${c.y},${c.z}`));
   if(addon.kind==='workshop'&&(preview||value===5000))cells=cells.filter(c=>!m.workshopRemove.has(`${c.x},${c.y},${c.z}`));
   cells.push(...addon.cells.slice(0,Math.floor(addon.cells.length*(preview?1:value/5000))));
 }
 return cells;
}
export function occupancy(state,{ignoreProp=null,ignoreBuilding=null}={}){
 const blocked=new Set(),buildings=new Set();
 for(const b of state.buildings)if(b.id!==ignoreBuilding)for(const c of solidCells(b)){if(c.y>0){blocked.add(key(c.x,c.z));buildings.add(key(c.x,c.z));}}
 for(const p of state.props)if(p.id!==ignoreProp)for(const c of placedCells(p))blocked.add(key(c.x,c.z));
 return{blocked,buildings};
}
export function entryZones(state){const set=new Set();for(const b of state.buildings)for(const d of buildingModel(b).entrances)for(let forward=1;forward<=7;forward++)for(let side=-d.half;side<=d.half;side++)set.add(key(d.x+d.nx*forward+d.nz*side,d.z+d.nz*forward-d.nx*side));return set;}
export function findRoute(state,from,to,blocked=occupancy(state).blocked,{radius=1}={}){
 const free=(x,z)=>inside(x,z)&&!water(state,x,z)&&!Array.from({length:radius*2+1},(_,i)=>i-radius).some(a=>Array.from({length:radius*2+1},(_,i)=>i-radius).some(c=>blocked.has(key(x+a,z+c))));
 const start=from.map(Math.round),end=to.map(Math.round);if(!free(...start)||!free(...end))return null;
 const queue=[start],seen=new Map([[key(...start),null]]);let finish=null;
 for(let i=0;i<queue.length;i++){const[x,z]=queue[i];if(x===end[0]&&z===end[1]){finish=key(x,z);break;}for(const[dx,dz]of [[1,0],[-1,0],[0,1],[0,-1]]){const nx=x+dx,nz=z+dz,k=key(nx,nz);if(!seen.has(k)&&free(nx,nz)){seen.set(k,key(x,z));queue.push([nx,nz]);}}}
 if(!finish)return null;const path=[];for(let k=finish;k;k=seen.get(k))path.push(k.split(',').map(Number));return path.reverse();
}
export function approach(d){return[d.x+d.nx*6,d.z+d.nz*6];}
export function routes(state){const occupied=occupancy(state).blocked;return state.buildings.flatMap(b=>buildingModel(b).entrances.map(d=>({owner:b.id,door:d,path:findRoute(state,approach(d),[0,0],occupied)})));}
export function canPlaceProp(state,prop,{connectivity=true}={}){
 if(state.props.length>=120&&!state.props.some(p=>p.id===prop.id))return'小物は120個までです。';
 const occupied=occupancy(state,{ignoreProp:prop.id}).blocked,entries=entryZones(state),reserved=new Set(state.paths.map(p=>key(p[0],p[1])));
 for(const c of placedCells(prop)){
   if(!inside(c.x,c.z))return'敷地の外には置けません。';if(water(state,c.x,c.z))return'陸地に置いてください。';if(road(c.x,c.z)||reserved.has(key(c.x,c.z)))return'道を空けて配置してください。';if(entries.has(key(c.x,c.z)))return'入口の前を空けてください。';if(occupied.has(key(c.x,c.z)))return'建物や小物と重なっています。';
 }
 // Narrow gaps can still block a route even without direct voxel overlap.
 const next=clone(state);next.props=next.props.filter(p=>p.id!==prop.id);next.props.push(prop);
 if(connectivity&&routes(next).some(r=>!r.path))return'建物へ通じる通路がなくなります。';return null;
}
export function auditTown(state){
 const errors=[],used=new Map();
 for(const b of state.buildings){
   const cells=solidCells(b);for(const c of cells){if(!inside(c.x,c.z))errors.push('建物が敷地外');if(c.y>0){if(road(c.x,c.z))errors.push('建物が道路上');if(water(state,c.x,c.z))errors.push('建物が水面上');const k=key(c.x,c.z);if(used.has(k)&&used.get(k)!==b.id)errors.push('建物が重複');used.set(k,b.id);}}
   if(b.site==='waterfront'&&(!WATER_REGIONS.includes(state.region)||!cells.some(c=>c.tag==='dock'&&water(state,c.x,c.z))))errors.push('船着き場が水辺に接していません');
 }
 const entries=entryZones(state),build=occupancy({...state,props:[]}).blocked,propUsed=new Map();
 for(const p of state.props)for(const c of placedCells(p)){const k=key(c.x,c.z);if(!inside(c.x,c.z)||water(state,c.x,c.z)||road(c.x,c.z)||entries.has(k)||build.has(k))errors.push('小物の位置が不正');if(propUsed.has(k)&&propUsed.get(k)!==p.id)errors.push('小物が重複');propUsed.set(k,p.id);}
 for(const p of state.paths)if(!inside(p[0],p[1])||water(state,p[0],p[1])||build.has(key(p[0],p[1]))||propUsed.has(key(p[0],p[1])))errors.push('道の位置が不正');
 if(routes(state).some(r=>!r.path))errors.push('入口への通路なし');return{ok:errors.length===0,errors:[...new Set(errors)]};
}
export function mutateBuilding(state,id,patch){const next=clone(state),b=next.buildings.find(b=>b.id===id);Object.assign(b,patch);
 if(b.site==='narrow'||b.type==='townhouse')b.addons=b.addons.filter(a=>a.kind!=='residence');
 const clean=validateState(next),audit=auditTown(clean);if(!audit.ok)throw Error(audit.errors.join('、'));return clean;
}
export function addExtension(state,id,kind){const b=state.buildings.find(b=>b.id===id);if(b.steps<20000)throw Error('建物が完成すると増築できます。');if(b.addons.some(a=>a.kind===kind))throw Error('すでに計画に入っています。');if(kind==='residence'&&(b.type==='townhouse'||b.site==='narrow'))throw Error('すでに2階建てです。');return mutateBuilding(state,id,{addons:[...b.addons,{kind,steps:0}]});}
export function advance(state,amount,preferred){const next=clone(state);let rest=amount;const order=[...next.buildings].sort((a,b)=>(a.id===preferred?-1:0)-(b.id===preferred?-1:0));
 for(const b of order){const n=Math.min(rest,20000-b.steps);b.steps+=n;rest-=n;if(b.steps===20000)for(const a of b.addons){const v=Math.min(rest,5000-a.steps);a.steps+=v;rest-=v;}if(!rest)break;}return next;
}
export function resetConstruction(state){const next=clone(state);for(const b of next.buildings){b.steps=0;for(const a of b.addons)a.steps=0;}return next;}
export function propVisible(state,p,preview){if(preview)return true;const b=state.buildings.reduce((a,b)=>Math.hypot(b.x-p.x,b.z-p.z)<Math.hypot(a.x-p.x,a.z-p.z)?b:a);const birth=PROPS[p.kind].grows?(Math.abs(p.x*31+p.z*17)%16+1)/20:1;return progress(b)>=birth;}
export function totalSteps(state){return state.buildings.reduce((n,b)=>n+b.steps+b.addons.reduce((a,c)=>a+c.steps,0),0);}
export function exportTown(state){const clean=validateState(state);return JSON.stringify(resetConstruction(clean),null,2);}
export function importTown(text){if(typeof text!=='string'||new TextEncoder().encode(text).length>400000)throw Error('設計ファイルは400KBまでです。');const state=validateState(JSON.parse(text),{shared:true}),report=auditTown(state);if(!report.ok)throw Error(report.errors.join('、'));return state;}
