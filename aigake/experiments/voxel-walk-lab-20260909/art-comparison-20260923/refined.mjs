import {makeDesign, voxelize, CELL, cellKey} from './design.mjs';

// Shapes are authored for the cell grid, then stored as normal editable voxels.
// No render-only geometry or textures are added to the voxel result.
const rand=(a,b=0)=>{const v=Math.sin(a*127.1+b*311.7)*43758.5453;return v-Math.floor(v);};
export function makeRefinedDesign(variant=0){
 const d=makeDesign(variant);
 d.refined=true;
 d.parts=d.parts.filter(p=>p.group!=='tree'&&p.group!=='bench'&&p.group!=='terrace'&&
  !['屋根の縦はぜ','棟包み','隅棟','雨樋','布の継ぎ目'].includes(p.name));
 let serial=0;
 const add=(shape,name,p,s,color,group,phase=4,extra={})=>{
  const part={id:`craft${serial++}`,shape,name,p,s,color,group,phase,r:[0,0,0],...extra};d.parts.push(part);return part;
 };
 const box=(n,p,s,c,g,phase=4,e={})=>add('box',n,p,s,c,g,phase,e);
 const ball=(n,p,s,c,g,phase=4,e={})=>add('ellipsoid',n,p,s,c,g,phase,e);
 const line=(n,a,b,r,c,g,phase=4,e={})=>add('segment',n,a,[r,r,r],c,g,phase,{end:b,...e});
 const round=(n,p,s,c,g,phase=4,e={})=>add('cylinder',n,p,s,c,g,phase,e);
 // Continuous eaves/fascia sit underneath the shell, without a dotted cylinder edge.
 for(const z of [-2.63,1.63])box('軒の縁',[-.7,3.44,z],[5.62,.15,.15],'roofEdge','cafe',3);
 for(const x of [-3.48,2.08])box('軒の側縁',[x,3.44,-.5],[.15,.15,4.26],'roofEdge','cafe',3);
 box('棟の包み',[-.7,4.96,-.5],[2.55,.15,.225],'roofEdge','cafe',3);
 // A restrained valance reads as fabric at phone scale. The face stays one piece.
 for(const p of d.parts){
  if(p.name==='テラスの布庇')p.s[1]=.15;
  if(p.name==='ガラス')p.p[2]-=.04;
  if(p.name==='窓の奥')p.p[2]-=.04;
  if(p.name==='花弁'){p.s=p.s.map((n,i)=>i===1?n:n*1.12);if(p.color==='cream'&&rand(p.p[0],p.p[2])>.65)p.color='flowerGold';}
 }
 for(const z of [-.76,1.4])line('庇の斜め支え',[1.84,2.12,z],[3.02,2.71,z],.04,'metal','cafe');

 // The tree's space is split into three boughs and an asymmetrical crown.
 const root=[-5.02,.06,-1.38],fork=[-4.96,2.48,-1.4];
 line('樹の根元',root,[-5.02,.68,-1.38],.34,'bark','tree',0,{taper:.77});
 line('樹の幹',[-5.02,.54,-1.38],fork,.255,'bark','tree',1,{taper:.64});
 for(let i=0;i<5;i++){
  const a=i*1.256+.3;
  line('地面を支える根',[-5.02,.24,-1.38],[-5.02+Math.cos(a)*.59,.02,-1.38+Math.sin(a)*.49],.12,'barkDark','tree',0,{taper:.35});
 }
 const crowns=[
  [-5.95,3.25,-1.1,.84,.73,.72],[-5.45,4.27,-1.84,.9,.92,.81],
  [-4.62,5.08,-1.77,1.02,.92,.82],[-3.9,4.3,-2.08,.87,.7,.72],
  [-4.97,3.9,-.35,.86,.69,.74],[-5.99,2.95,-2.0,.59,.59,.6],
  [-4.29,5.7,-1.2,.64,.56,.62]
 ];
 const boughs=[[-5.42,2.77,-1.25],[-4.81,3.73,-1.59],[-4.95,2.96,-.78]];
 boughs.forEach(b=>line('主枝',[-4.98,1.68,-1.38],b,.16,'bark','tree',1,{taper:.56}));
 crowns.forEach(([x,y,z,w,h,depth],i)=>{
  const join=boughs[i===0||i===5?0:i===4?2:1];
  const tip=[x,y-.12,z];
  line('枝分かれ',join,tip,.09,'bark','tree',1,{taper:.43});
  ball('樹冠の芯',[x,y,z],[w*.44,h*.49,depth*.46],'leafDark','tree',2,{foliage:true});
  // Small overlapping lobes have varying elevation. Each is attached by a twig.
  for(let j=0;j<31;j++){
   const a=j*2.399+i*.43,rad=.25+rand(i,j)*.65,dy=(rand(j,i+22)-.36)*h*1.4;
   const p=[x+Math.cos(a)*w*rad,y+dy,z+Math.sin(a)*depth*rad];
   line('小枝',tip,p,.032,'barkDark','tree',2,{taper:.5});
   const r=.18+rand(i+4,j)*.12;
   ball('葉のまとまり',p,[r*1.15,r*(.78+rand(j,i)*.36),r],'leaf','tree',3,{foliage:true});
   // Leaves at the silhouette are clusters of a few connected cells, not planes.
   for(let k=0;k<4;k++){
    const ang=k*1.57+a;
    ball('枝先の葉',[p[0]+Math.cos(ang)*r*.8,p[1]+.06+(rand(k,j)-.3)*r,p[2]+Math.sin(ang)*r*.7],
     [.135,.09,.12],'leaf2','tree',3,{foliage:true});
   }
  }
 });

 // Bench: the boards sit on two side frames, with four grounded feet.
 const bx=-3.6,bz=2.15;
 for(const x of [bx-.675,bx+.675]){
  for(const z of [bz-.225,bz+.225])line('ベンチの脚',[x,.17,z],[x,.8,z],.06,'metal','bench');
  line('ベンチの座受け',[x,.72,bz-.33],[x,.72,bz+.33],.065,'metal','bench');
  line('ベンチの背支柱',[x,.72,bz-.25],[x,1.53,bz-.40],.055,'metal','bench');
  const arm=[[x,.79,bz+.24],[x,1.03,bz+.22],[x,1.09,bz+.1],[x,1.09,bz-.29],[x,1.18,bz-.33]];
  for(let k=1;k<arm.length;k++)line('ベンチの肘掛け',arm[k-1],arm[k],.045,'metal','bench');
 }
 line('ベンチの横桟',[bx-.675,.42,bz-.225],[bx+.675,.42,bz-.225],.045,'metal','bench');
 for(let j=0;j<5;j++)box('ベンチの座板',[bx,.82,bz-.3+j*.15],[1.83,.075,.075],j%2?'woodHoney':'woodLight','bench');
 for(let j=0;j<3;j++)box('ベンチの背板',[bx,1.08+j*.15,bz-.31-j*.026],[1.83,.075,.075],j===1?'woodHoney':'woodLight','bench');

 // Bistro set. All long supports are sampled onto the same integer grid.
 round('テラスの天板',[2.66,1.045,.54],[.53,.105,.53],'woodHoney','terrace');
 round('天板の縁',[2.66,.998,.54],[.55,.075,.55],'wood','terrace');
 line('テーブルの脚',[2.66,.27,.54],[2.66,1.015,.54],.075,'metal','terrace');
 for(const [dx,dz] of [[.32,.28],[-.32,.28],[0,-.38]])line('テーブルの足',[2.66,.39,.54],[2.66+dx,.18,.54+dz],.045,'metal','terrace');
 function chair(x,z,yaw){
  const point=(a,y,b)=>[x+a*Math.cos(yaw)+b*Math.sin(yaw),y,z-a*Math.sin(yaw)+b*Math.cos(yaw)];
  for(const a of [-.225,.225]){
   for(const b of [-.225,.225])line('椅子の脚',point(a,.18,b*1.22),point(a,.69,b),.044,'metal','terrace');
   line('椅子の座受け',point(a,.64,-.27),point(a,.64,.27),.042,'metal','terrace');
   line('椅子の貫',point(a,.37,-.245),point(a,.37,.245),.04,'metal','terrace');
   line('椅子の背支柱',point(a,.63,-.225),point(a,1.27,-.31),.044,'metal','terrace');
  }
  for(const b of [-.225,-.075,.075,.225])box('椅子の座板',point(0,.715,b),[.6,.075,.075],'woodHoney','terrace',4,{r:[0,yaw,0]});
  for(const y of [1.02,1.17])box('椅子の背板',point(0,y,-.29),[.6,.075,.075],'woodLight','terrace',4,{r:[0,yaw,0]});
 }
 chair(2.66,-.35,0);chair(2.66,1.43,Math.PI);
 for(const [x,z,side] of [[2.45,.4,-1],[2.88,.68,1]]){
  round('カップの受け皿',[x,1.12,z],[.14,.035,.14],'cream','terrace');
  round('カップ',[x,1.23,z],[.09,.18,.09],'cream','terrace');
  round('コーヒー',[x,1.327,z],[.06,.022,.06],'woodDark','terrace');
  line('カップの取手上',[x+side*.06,1.285,z],[x+side*.15,1.285,z],.03,'cream','terrace');
  line('カップの取手外',[x+side*.15,1.285,z],[x+side*.15,1.195,z],.03,'cream','terrace');
  line('カップの取手下',[x+side*.15,1.195,z],[x+side*.06,1.195,z],.03,'cream','terrace');
 }
 return d;
}

function connectedTree(cells){
 const tree=new Map(cells.filter(c=>c.group==='tree').map(c=>[cellKey(c),c]));
 const root=[...tree.values()].sort((a,b)=>a.y-b.y)[0];if(!root)return cells;
 const visited=new Set([cellKey(root)]),queue=[root];
 for(let i=0;i<queue.length;i++){
  const c=queue[i];
  for(let dx=-1;dx<=1;dx++)for(let dy=-1;dy<=1;dy++)for(let dz=-1;dz<=1;dz++){
   const k=`${c.x+dx},${c.y+dy},${c.z+dz}`;
   if(visited.has(k)||!tree.has(k))continue;visited.add(k);queue.push(tree.get(k));
  }
 }
 return cells.filter(c=>c.group!=='tree'||visited.has(cellKey(c)));
}

export function voxelizeRefined(design){
 const cells=voxelize(design),parts=new Map(design.parts.map(p=>[p.id,p])),map=new Map(cells.map(c=>[cellKey(c),c]));
 // Put seams directly on the occupied roof columns: no aliasing gaps, no detached dots.
 const roof=design.parts.find(p=>p.shape==='hip'),roofCells=cells.filter(c=>c.part===roof.id);
 const top=new Map();for(const c of roofCells){const k=`${c.x},${c.z}`;if(!top.has(k)||top.get(k).y<c.y)top.set(k,c);}
 const seamXs=new Set([-39,-31,-23,-15,-7,1,9,17,25]);
 for(const c of top.values()){
  const wx=(c.x+.5)*CELL+.7,wz=(c.z+.5)*CELL+.5;
  const onFront=1-Math.abs(wz)/2.13<=1-Math.max(0,Math.abs(wx)-1.23)/1.55;
  if(!onFront||!seamXs.has(c.x)||Math.abs(wz)<.12)continue;
  const raised={...c,y:c.y+1,color:design.variant?'brick2':'roofSeam'},k=cellKey(raised);
  // Do not overwrite the chimney, the cap or any attached fixture.
  if(!map.has(k))map.set(k,raised);
 }
 for(const c of map.values()){
  const p=parts.get(c.part),x=(c.x+.5)*CELL,y=(c.y+.5)*CELL,z=(c.z+.5)*CELL;
  if(p?.foliage){
   // Colour varies across broad volumes; it is part of the editable cells, not light baked into an image.
   const patch=Math.sin(x*2.7+Math.sin(z*2))*Math.cos(y*2.3-z*1.7),edge=rand(Math.floor(c.x/2),Math.floor(c.z/2)+Math.floor(c.y/2)*13);
   c.color=patch>.67?'leafGold':patch>.16?'leafLime':patch>-.55?'leaf':'leafDark';
   if(edge>.85&&patch>.2)c.color='leaf2';
  }else if(c.color==='bark'||c.color==='barkDark'){
   const groove=Math.sin(x*31+z*19+Math.sin(y*1.6)*.8);
   c.color=groove>.6?'barkLight':groove<-.6?'barkDark':'bark';
  }else if(c.part===roof.id&&c.color!=='roofSeam'){
   if(!design.variant){const stripe=Math.floor((c.x+39)/8);c.color=stripe%3===0?'roofMuted':stripe%3===1?'roof':'roofSlate';}
  }else if((c.color==='woodLight'||c.color==='woodHoney')&&p?.shape==='box'){
   const grain=Math.sin(x*4+Math.sin(z*24+y*19)*.7);
   if(grain>.82)c.color='woodHoney';else if(grain<-.85)c.color='woodLight';
  }else if(c.color==='plaster'&&Math.sin(x*2.3+z*1.7)+Math.cos(y*2.2-z*1.2)>1.4)c.color='plasterWarm';
  else if(c.color==='glass'&&p?.emission){
   // A quiet opaque sky reflection, without reinstating a central window bar.
   const relative=y-(p.p[1]??y),sweep=x*.24+z*.15+relative;
   c.color=sweep>.8?'glassSilver':relative<-.48?'glassDeep':'glass';
  }
 }
 return connectedTree([...map.values()]).sort((a,b)=>a.phase-b.phase||(a.order??999)-(b.order??999)||a.y-b.y||a.z-b.z||a.x-b.x);
}
