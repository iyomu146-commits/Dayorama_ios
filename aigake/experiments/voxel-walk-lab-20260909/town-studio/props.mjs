// Authored, deterministic voxel objects. Dimensions share the building grid.
import {PREMIUM_PROPS} from './premium-catalog.mjs';
import {premiumModel} from './premium-models.mjs';
export {PREMIUM_PROPS,PREMIUM_PACKS} from './premium-catalog.mjs';
const W='#9b7855',L='#c4a77b',D='#626d64',G='#749167',F='#d1ac91',S='#b0ad9b',T='#e7dbc0';
const specs=[
 ['bench','ベンチ','家具'],['chair','椅子','家具'],['table','テーブル','家具'],['picnic','ピクニックテーブル','家具'],['parasol','パラソル','家具'],['stool','スツール','家具'],
 ['lamp','街灯','街路'],['mailbox','郵便受け','街路'],['bin','ごみ箱','街路'],['sign','案内板','街路'],['fence','木柵','街路'],['gate','門','街路'],['bollard','係留柱','街路'],['busstop','バス停','街路'],
 ['flowers','花壇','植栽'],['planter','プランター','植栽'],['pot','植木鉢','植栽'],['grass','草','植栽'],['shrub','低木','植栽'],['hedge','生垣','植栽'],['tree','広葉樹','植栽'],['pine','針葉樹','植栽'],['palm','ヤシ','植栽'],['cactus','サボテン','植栽'],['vegetables','菜園','植栽'],
 ['bread','パンの台','店先'],['books','本棚','店先'],['crates','木箱','店先'],['barrel','樽','店先'],['cart','手押し車','店先'],['bike','自転車','店先'],['pottery','陶器の台','店先'],['parcels','荷物','店先'],['chalkboard','立て看板','店先'],
 ['fountain','噴水','庭'],['birdbath','水飲み台','庭'],['well','井戸','庭'],['doghouse','犬小屋','庭'],['firewood','薪','庭'],['rocks','岩','庭'],['trough','水槽','庭'],['lantern','石灯籠','庭'],['sled','そり','庭'],['snowman','雪だるま','庭'],
];
export const PROPS={...Object.fromEntries(specs.map(([id,name,category])=>[id,{id,name,category,tier:'free',grows:category==='植栽'}])),...PREMIUM_PROPS};
export const CATEGORIES=[...new Set(specs.map(s=>s[2]))];
const cache=new Map();
export function propModel(id){
 if(cache.has(id))return cache.get(id);if(!Object.hasOwn(PROPS,id))throw Error('未対応の小物です。');
 if(PROPS[id].tier==='premium'){const result=premiumModel(PROPS[id]);cache.set(id,result);return result;}
 const map=new Map();
 const put=(x,y,z,color,tag='')=>map.set(`${x},${y},${z}`,{x,y,z,color,phase:3,tag});
 const box=(a,b,c,x,y,z,color,tag='')=>{for(let yy=b;yy<=y;yy++)for(let zz=c;zz<=z;zz++)for(let xx=a;xx<=x;xx++)put(xx,yy,zz,color,tag);};
 const ball=(cx,cy,cz,rx,ry,rz,color)=>{for(let x=-rx;x<=rx;x++)for(let y=-ry;y<=ry;y++)for(let z=-rz;z<=rz;z++)if((x/rx)**2+(y/ry)**2+(z/rz)**2<=1.15)put(cx+x,cy+y,cz+z,color);};
 const legs=(w,d,h)=>{for(const x of [-w,w])for(const z of [-d,d])box(x,1,z,x,h,z,W);};
 const table=(height=6)=>{legs(3,2,height-1);box(-4,height,-3,4,height,3,L);};
 const flower=(x,z,h,color)=>{box(x,2,z,x,h,z,G);put(x-1,h-2,z,G);put(x+1,h-1,z,G);box(x-1,h,z-1,x+1,h,z+1,color);put(x,h+1,z,'#d9bd68');};
 if(id==='bench'){legs(4,1,1);box(-5,2,-2,5,2,2,L);for(const x of [-5,5])box(x,1,-2,x,6,-2,W);for(const y of [4,6])box(-5,y,-2,5,y,-2,L);}
 if(id==='chair'){legs(1,1,1);box(-2,2,-2,2,2,2,L);box(-2,3,-2,2,6,-2,L);}
 if(id==='table')table(4);
 if(id==='stool'){legs(1,1,1);box(-2,2,-2,2,2,2,L);}
 if(id==='picnic'){table(4);for(const z of [-5,5]){for(const x of [-3,3])box(x,1,z,x,1,z,W);box(-5,2,z-1,5,2,z+1,L);box(-3,1,-5,-3,1,5,W);box(3,1,-5,3,1,5,W);}}
 if(id==='parasol'){box(-2,1,-2,2,1,2,S);box(0,2,0,0,14,0,W);for(let x=-6;x<=6;x++)for(let z=-6;z<=6;z++){const y=15-Math.floor(Math.max(Math.abs(x),Math.abs(z))/2);box(x,y,z,x,y+1,z,(Math.floor((x+6)/3)%2)?'#9cae96':T);}}
 if(id==='lamp'){box(-1,1,-1,1,1,1,D);box(0,2,0,0,15,0,D);box(-2,13,-2,2,16,2,'#e4ca83','light');box(-3,17,-3,3,17,3,D);for(const x of [-2,2])for(const z of [-2,2])box(x,13,z,x,16,z,D);}
 if(id==='mailbox'){box(0,1,0,0,7,0,W);box(-2,7,-2,2,11,2,'#9e6251');box(-1,9,3,1,9,3,D);}
 if(id==='bin'){box(-2,1,-2,2,6,2,D);box(-3,7,-3,3,7,3,S);box(-1,8,-1,1,8,1,D);}
 if(id==='sign'||id==='chalkboard'){for(const x of [-3,3])box(x,1,0,x,9,0,W);box(-4,5,0,4,10,1,L);box(-3,6,2,3,9,2,D);box(-2,8,3,2,8,3,T);if(id==='chalkboard')for(const x of [-3,3]){box(x,1,-3,x,1,0,W);box(x,1,-3,x,7,-3,W);box(x,7,-3,x,7,0,W);}}
 if(id==='fence'||id==='gate'){for(const x of [-6,6])box(x,1,0,x,7,0,W);for(const y of [3,6])box(-6,y,0,6,y,0,L);if(id==='gate')for(let x=-4;x<=4;x+=2)box(x,1,0,x,6,0,L);}
 if(id==='bollard'){box(-2,1,-2,2,1,2,S);box(-1,2,-1,1,5,1,D);box(-3,6,-1,3,6,1,D);}
 if(id==='busstop'){box(0,1,0,0,16,0,D);box(-3,13,0,3,18,0,T);box(-2,15,1,2,16,1,'#608d88');}
 if(id==='pot'||id==='planter'||id==='flowers'||id==='vegetables'){
   const wide=id==='flowers'||id==='vegetables'?6:id==='planter'?4:2,deep=id==='vegetables'?5:2;
   box(-wide,1,-deep,wide,2,deep,id==='vegetables'?W:'#b28262');box(-wide+1,3,-deep+1,wide-1,3,deep-1,'#8c7559');
   for(let x=-wide+1;x<wide;x+=3)if(id==='vegetables'){for(const z of [-3,0,3])ball(x,4,z,1,1,1,G);}else flower(x,0,6+(x%2),x%2?'#ce91a7':'#dfc174');
 }
 if(id==='grass'){box(-2,1,-1,2,1,1,G);for(const [x,z,h] of [[-2,0,3],[0,1,4],[1,0,2],[2,-1,3]])box(x,1,z,x,h,z,G);}
 if(id==='shrub'||id==='hedge'){box(id==='hedge'?-5:-2,1,-2,id==='hedge'?5:2,2,2,'#7e825e');if(id==='hedge')box(-6,2,-2,6,6,2,G);else ball(0,4,0,4,3,3,G);}
 if(id==='tree'){box(-1,1,-1,1,12,1,W);box(-4,9,0,4,10,0,W);ball(0,15,0,6,5,5,G);ball(-4,12,0,3,3,3,'#89a276');}
 if(id==='pine'){box(0,1,0,0,18,0,W);for(let y=5;y<=19;y++){const r=Math.max(1,6-Math.floor((y-5)/3));box(-r,y,-r,r,y,r,'#5e7e6b');}}
 if(id==='palm'){box(0,1,0,0,18,0,W);for(const [dx,dz] of [[1,0],[-1,0],[0,1],[0,-1]])for(let i=0;i<=8;i++){const y=18-Math.floor(i/3);box(dx*i-1,y,dz*i-1,dx*i+1,y+1,dz*i+1,G);}}
 if(id==='cactus'){box(-1,1,-1,1,10,1,'#779b83');box(-4,5,0,4,6,0,'#779b83');box(-4,6,0,-4,9,0,'#779b83');box(4,6,0,4,8,0,'#779b83');}
 if(id==='bread'||id==='pottery'){table();for(const x of [-2,2]){if(id==='bread')box(x-1,7,-1,x+1,8,1,'#d2a25e');else{box(x-1,7,-1,x+1,9,1,F);put(x,10,0,T);}}}
 if(id==='books'){for(const x of [-4,4])box(x,1,-1,x,10,1,W);for(const y of [1,5,10])box(-4,y,-1,4,y,1,L);for(const y of [2,6])for(let x=-3;x<=3;x++)box(x,y,0,x,y+2+(x%2?1:0),1,['#a77962','#688f87','#b4a371'][Math.abs(x)%3]);}
 if(id==='crates'||id==='parcels'){box(-4,1,-2,0,4,2,id==='crates'?L:'#b99b72');box(1,1,-2,4,3,2,id==='crates'?W:'#c7ab80');box(-2,5,-2,1,7,1,L);for(const y of [2,4,6])box(-2,y,2,-1,y,2,W);}
 if(id==='barrel'){box(-2,1,-2,2,7,2,W);for(const y of [2,6]){box(-3,y,-2,3,y,2,D);box(-2,y,-3,2,y,3,D);}box(-2,8,-2,2,8,2,L);}
 if(id==='cart'){for(const x of [-4,4]){box(x,1,-1,x,3,1,D);box(x,2,-2,x,2,2,D);}box(-4,3,0,4,3,0,D);box(-3,4,-4,3,4,4,L);for(const x of [-3,3])box(x,5,-4,x,7,4,W);box(-3,5,-4,3,7,-4,W);for(const x of [-2,2])box(x,6,3,x,6,8,W);}
 if(id==='bike'){
   for(const cx of [-5,5]){for(let x=-3;x<=3;x++)for(let y=-3;y<=3;y++)if(x*x+y*y>=5&&x*x+y*y<=11)put(cx+x,y+4,0,D);box(cx-3,4,0,cx+3,4,0,S);box(cx,1,0,cx,7,0,S);}
   box(-5,4,0,5,5,0,'#668c88');box(-2,5,0,-2,9,0,'#668c88');box(-4,10,-1,0,10,1,W);box(5,5,0,5,11,0,S);box(4,11,-2,5,11,2,D);box(0,1,1,0,5,1,S);
 }
 if(id==='fountain'||id==='birdbath'||id==='well'||id==='trough'){
   const r=id==='birdbath'?3:id==='trough'?4:6;box(-r,1,-r,r,1,r,S);
   if(id==='birdbath'){box(-1,2,-1,1,6,1,S);box(-3,7,-3,3,7,3,S);box(-2,8,-2,2,8,2,'#8ebbbb');}
   else{for(let x=-r;x<=r;x++)for(let z=-r;z<=r;z++)if(Math.abs(x)===r||Math.abs(z)===r)box(x,2,z,x,4,z,S);box(-r+1,2,-r+1,r-1,2,r-1,'#8ebbbb');if(id==='fountain'){box(-1,3,-1,1,8,1,S);box(-3,9,-3,3,9,3,S);put(0,10,0,'#8ebbbb');}if(id==='well'){for(const x of [-6,6])box(x,5,0,x,13,0,W);box(-6,13,0,6,13,0,W);for(let x=-7;x<=7;x++)box(x,15-Math.floor(Math.abs(x)/3),-4,x,16-Math.floor(Math.abs(x)/3),4,W);box(0,8,0,0,13,0,L);}}
 }
 if(id==='doghouse'){box(-4,1,-4,4,1,4,L);box(-4,2,-4,-4,7,4,W);box(4,2,-4,4,7,4,W);box(-4,2,-4,4,7,-4,W);for(const x of [-3,3])box(x,2,4,x,7,4,W);for(let x=-5;x<=5;x++)box(x,8+Math.floor((5-Math.abs(x))/2),-5,x,9+Math.floor((5-Math.abs(x))/2),5,'#82786a');}
 if(id==='firewood'){for(const y of [1,3])for(const x of [-3,0,3])box(x,y,-3,x+1,y+1,3,W);box(-4,1,-3,4,1,3,L);}
 if(id==='rocks'){ball(0,3,0,4,2,3,S);ball(3,3,2,2,2,2,'#949b91');}
 if(id==='lantern'){box(-3,1,-3,3,1,3,S);box(-1,2,-1,1,6,1,S);box(-2,7,-2,2,9,2,'#d9c692','light');box(-3,10,-3,3,10,3,S);box(-2,11,-2,2,11,2,S);put(0,12,0,S);}
 if(id==='sled'){for(const x of [-3,3])box(x,1,-5,x,2,5,D);box(-3,3,-4,3,3,4,W);for(const x of [-3,3])box(x,3,5,x,4,5,D);}
 if(id==='snowman'){ball(0,4,0,4,3,4,'#e2e7df');box(-2,7,-2,2,7,2,'#e2e7df');ball(0,10,0,3,3,3,'#e2e7df');put(-1,11,3,D);put(1,11,3,D);box(0,10,3,0,10,5,'#c6986c');box(-4,13,-4,4,13,4,D);box(-2,14,-2,2,16,2,D);}
 const cells=[...map.values()],xs=cells.map(c=>c.x),zs=cells.map(c=>c.z);
 const result={...PROPS[id],cells,bounds:{x0:Math.min(...xs),x1:Math.max(...xs),z0:Math.min(...zs),z1:Math.max(...zs)},seat:['bench','chair','stool'].includes(id)?{x:0,z:0,y:2,front:2.5}:null};cache.set(id,result);return result;
}
export function rotate(x,z,r){for(let i=0;i<r%4;i++)[x,z]=[-z,x];return[x,z];}
export function placedCells(prop){return propModel(prop.kind).cells.map(c=>{const [x,z]=rotate(c.x,c.z,prop.r);return{...c,x:x+prop.x,z:z+prop.z,prop:prop.id};});}
