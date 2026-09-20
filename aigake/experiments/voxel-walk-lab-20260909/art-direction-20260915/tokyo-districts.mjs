import {workshop} from '../content/kit.mjs';
import {infillBlueprint,stationBlueprint,RAIL,railDistance} from '../tokyo/city.mjs';
import {gateBlueprint,templeBlueprint,approachShop,brickStationBlueprint} from './tokyo-landmarks.mjs';
import {SHIBUYA_CROSSING} from './tokyo-activity.mjs';

export const TOKYO_HALF=[16,12.8];
export const TOKYO_RAIL={...RAIL,a:14.72,b:11.52,r:2.56};
// Four ordinary-sized districts share streets at their edges. The narrow
// joints are surface markings, not gaps that pedestrians or trains can fall in.
export const TOKYO_TILES=[
 {id:'station',name:'渋谷',x:-8,z:-6.4,color:'#769c88',ground:'#bfc4c3',description:'スクランブル交差点・看板のビル・環状線の駅'},
 {id:'shops',name:'浅草',x:-8,z:6.4,color:'#a77e6b',ground:'#bfc1bb',description:'雷門・本堂・参道と店'},
 {id:'office',name:'東京駅・丸の内',x:8,z:-6.4,color:'#7992aa',ground:'#b6c2c8',description:'赤レンガ駅舎・ドーム屋根・ガラスのビル'},
 {id:'tower',name:'東京タワー',x:8,z:6.4,color:'#bb7564',ground:'#c5c0b8',description:'赤白の鉄骨塔・展望台・密集する街並み'},
].map((t,i)=>({...t,index:i,bounds:{min:[t.x-8,t.z-6.4],max:[t.x+8,t.z+6.4]}}));

function highrise(seed,{w=27,d=25,floors=8,tone=0,step=false,sign=false}={}){
 const k=workshop('tokyo',seed),{box,paint,C}=k,h=floors*9+3,hx=Math.floor(w/2),hz=Math.floor(d/2);
 const walls=['#a9b9c1','#c3c8c7','#afb6c0'],glass=['#7d9ba9','#8caeae','#8b9eb4'];
 k.house({w,d,h,floors,shape:'flat',rise:1,roofOverhang:0,foundationMargin:0,windows:false,color:walls[tone%3],roofColor:'#8f9fa5'});
 for(let f=0;f<floors;f++){
  const y=f*9+4;
  for(const z of [-hz,hz])for(let x=-hx+2;x<hx-1;x++)if((x+hx)%6!==0&&!(f===0&&z>0&&Math.abs(x)<4))paint(x,y,z,x,y+5,z,glass[tone%3],3);
  for(const x of [-hx,hx])for(let z=-hz+2;z<hz-1;z++)if((z+hz)%6!==0)paint(x,y,z,x,y+5,z,glass[tone%3],3);
 }
 // Closed setback volumes rest on the complete roof of the wider volume.
 if(step)k.house({w:w-8,d:d-8,h:14,y:h+2,shape:'flat',rise:1,roofOverhang:0,foundationMargin:0,door:false,windows:false,color:walls[tone%3],roofColor:'#8f9fa5'});
 else{box(-hx+3,h+2,-hz+3,-hx+8,h+5,-hz+7,'#7e8e94',3);box(hx-7,h+2,hz-7,hx-3,h+4,hz-3,'#a6b3b4',3);}
 if(sign){
  const accent=['#c45143','#427f9e','#c39a40'][tone%3];
  box(hx-5,14,hz+1,hx-1,Math.min(h-2,39),hz+1,accent,3);
  for(let y=17;y<28;y+=4)paint(hx-4,y,hz+1,hx-2,y+1,hz+1,'#f0e4cc',3);
  box(-hx+1,13,hz+1,hx-7,22,hz+1,'#487f91',3);paint(-hx+3,16,hz+1,hx-9,19,hz+1,'#efe3c7',3);
 }
 for(const c of k.v.list())if([C.wood,C.woodLight].includes(c.color))k.put(c.x,c.y,c.z,'#82949c',c.phase,true);
 return k.finish('tokyo-highrise');
}
export function tokyoDistrictPlan(seed,towerBuilder){
 const buildings=[];
 function add(district,kind,name,x,z,bp,u=.1,rot=0){buildings.push({district,kind,name,x,z,bp,u,rot});}
 add('station','tokyo-station','渋谷の駅',-7.7,-10.36,stationBlueprint(seed),.09,2);
 for(const [i,x]of [-12.1,-9.25,-5.8,-2.95].entries())add('station','tokyo-highrise','渋谷の商業ビル',x,-7.8,highrise(seed+i,{w:21,floors:[5,7,8,5][i],tone:i,step:i===1,sign:true}),.1);
 for(const [i,x]of [-12.1,-3.05].entries())add('station','tokyo-infill','交差点のビル',x,-2.5,highrise(seed+11+i,{floors:[4,5][i],tone:i+1,sign:true,w:23,d:21}),.1);

 add('shops','tokyo-kaminarimon','雷門',-8,9.1,gateBlueprint(seed+30),.09);
 add('shops','tokyo-temple','本堂',-8,2.75,templeBlueprint(seed+31),.09);
 for(const [i,z]of [4.6,6.9].entries())for(const side of [-1,1])add('shops','tokyo-shop','参道の店',-8+side*4.35,z,approachShop(seed+33+i+(side+1)*2,i+(side+1)),.09,side<0?1:3);

 add('office','tokyo-brick-station','東京駅',7.5,-5.7,brickStationBlueprint(seed+51),.10);
 for(const [i,x]of [3.4,7.65,11.65].entries())add('office','tokyo-office','丸の内のオフィス',x,-9.9,highrise(seed+55+i,{w:27,d:17,floors:[6,8,6][i],tone:i,step:i===0}),.1);

 add('tower','tokyo-tower','東京タワー',7.65,4.8,towerBuilder(seed+70),.105);
 for(const [i,[x,z,f]]of [[3,2.5,4],[12,2.5,4],[3,5.75,3],[12,5.75,3],[3.5,9.65,2],[7.6,9.65,3],[11.5,9.65,2]].entries())add('tower','tokyo-residence','集合住宅',x,z,infillBlueprint({floors:f,w:25,d:21,tone:i+1},seed+71+i),.10,i>=4?2:i===2?1:i===3?3:0);
 const roads=[[[0,-10.3],[0,10.3]],[[-13.5,0],[13.5,0]],[[-13.4,SHIBUYA_CROSSING.z],[-1.3,SHIBUYA_CROSSING.z]],[[-7.55,-9.5],[-7.55,-1.3]],[[1.3,-2.6],[13.4,-2.6]],[[1.3,7.6],[13.4,7.6]],[[-8,4.4],[-8,10.6]],[[-13.2,10.6],[-2,10.6]]];
 return{buildings,tiles:TOKYO_TILES,half:TOKYO_HALF,rail:TOKYO_RAIL,roads,walkBudget:80000};
}

const roadAt=(x,z)=>Math.abs(x)<.72||Math.abs(z)<.72||(x<0&&z<0&&(Math.abs(z-SHIBUYA_CROSSING.z)<.8||Math.abs(x+7.55)<.85||Math.abs(x+7.55)<1.9&&Math.abs(z-SHIBUYA_CROSSING.z)<1.75))||(x>0&&(Math.abs(z+2.6)<.43||Math.abs(z-7.6)<.43));
export function tokyoPavement(x,z){
 if(railDistance(x,z,TOKYO_RAIL)<.57)return '#858e92';
 if(roadAt(x,z))return '#78858a';
 return TOKYO_TILES.find(t=>(x<0)===(t.x<0)&&(z<0)===(t.z<0)).ground;
}
export function tokyoStreetDetails(){
 const boxes=[],add=(x,y,z,w,h,d,color,kind='marking')=>boxes.push({x,y,z,w,h,d,color,kind}),line=(a,b,width,color)=>{
  const len=Math.hypot(b[0]-a[0],b[1]-a[1]),n=Math.ceil(len/.095);for(let i=0;i<=n;i++){const t=i/n;add(a[0]+(b[0]-a[0])*t,.326,a[1]+(b[1]-a[1])*t,width,.009,width,color);}
 };
 // A shallow joint and four colored plinth edges make the tile count legible.
 add(0,.322,0,.035,.003,25.6,'#8b9697');add(0,.322,0,32,.003,.035,'#8b9697');
 for(const t of TOKYO_TILES){add(t.x,-.89,t.z,15.88,.35,12.68,t.color,'base');}
 for(let x=-12.9;x<13;x+=1.10)if(Math.abs(x)>1.35)add(x,.33,0,.52,.014,.045,'#d5ceb6');
 for(let z=-9.6;z<10;z+=1.10)if(Math.abs(z)>1.35)add(0,.33,z,.045,.014,.52,'#d5ceb6');
 // Zebra crossings at the central crossroads; nothing is raised above footing.
 for(const side of [-1,1])for(let n=-2;n<=2;n++){
  add(side*1.12,.334,n*.23,.60,.013,.13,'#e8e1cb');add(n*.23,.334,side*1.12,.13,.013,.60,'#e8e1cb');
 }
 const {x:cx,z:cz}=SHIBUYA_CROSSING;
 for(const side of [-1,1])for(let n=-4;n<=4;n++){
  add(cx+side*1.45,.334,cz+n*.25,.58,.013,.13,'#ebe1c9');add(cx+n*.25,.334,cz+side*1.45,.13,.013,.58,'#ebe1c9');
 }
 for(const side of [-1,1])for(let n=-5;n<=5;n++){
  const d=n*.23;line([cx+d-side*.23,cz+side*d+.23],[cx+d+side*.23,cz+side*d-.23],.085,'#e5dcc5');
 }
 // Small traffic signals sit on the pavement at the crossing corners.
 for(const [x,z]of [[1.1,1.1],[-1.1,-1.1]]){
  add(x,1.35,z,.065,2.06,.065,'#707e81','signal');add(x+.22,2.34,z,.50,.16,.14,'#566971','signal');
  for(const [i,c]of ['#89b499','#c7b77f','#ba7969'].entries())add(x+.06+i*.14,2.34,z+.078,.08,.08,.02,c,'signal');
 }
 // Paving gives the station forecourt its own scale without oversized props.
 for(let z=-3.5;z<-1.4;z+=.55)for(let x=2.2;x<12.8;x+=.55)add(x,.325,z,.51,.009,.51,'#d9cdbc');
 for(let z=4.3;z<10.65;z+=.44)for(let x=-9.05;x<-6.7;x+=.44)add(x,.332,z,.41,.016,.41,'#c8bfae');
 return boxes;
}
