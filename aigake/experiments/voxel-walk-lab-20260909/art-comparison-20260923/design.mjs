// One spatial design, two render routes. Coordinates are metres; +Z is the facade.
export const CELL=.075, BUDGET=20000;
export const COLORS={plaster:'#e5d7b6',plaster2:'#d9c8a3',stone:'#b9b09b',stone2:'#ccc3ad',wood:'#a27242',woodLight:'#c39658',woodDark:'#694b34',roof:'#345e62',roofEdge:'#25494e',roofLight:'#47777a',glass:'#749a9b',glassLight:'#aec1b1',metal:'#394841',brick:'#ad7351',brick2:'#c38a63',cloth:'#bc7657',clothLight:'#d0926e',pot:'#b47751',soil:'#5c5340',leaf:'#52744b',leaf2:'#6d8a4c',leaf3:'#8d9c58',leafDark:'#3f6147',grass:'#91a16b',flower:'#e5b9ab',cream:'#f1e6c5',yellow:'#d7b759'};
Object.assign(COLORS,{roofMuted:'#3a6466',roofSlate:'#3d686b',roofSeam:'#294c51',woodHoney:'#b7884c',bark:'#79694e',barkDark:'#5e513e',barkLight:'#928065',leafGold:'#a5a854',leafLime:'#7d9147',plasterWarm:'#dfcfad',glassSilver:'#96b4ae',glassDeep:'#577d7c',flowerGold:'#d4a85f'});
export const PHASES=[{name:'基礎',end:2000},{name:'骨組み',end:6000},{name:'壁・窓',end:12000},{name:'屋根',end:17000},{name:'仕上げ',end:20000}];
const hash=(a,b=0)=>{const v=Math.sin(a*127.1+b*311.7)*43758.5453;return v-Math.floor(v);};
export function makeDesign(variant=0){
 const parts=[];let serial=0;
 function add(shape,name,p,s,color,phase=4,extra={}){const part={id:`p${String(serial++).padStart(4,'0')}`,shape,name,p,s,color,phase,group:'cafe',r:[0,0,0],...extra};parts.push(part);return part;}
 const box=(name,p,s,color,phase=4,extra={})=>add('box',name,p,s,color,phase,extra);
 const ball=(name,p,s,color,phase=4,extra={})=>add('ellipsoid',name,p,s,color,phase,extra);
 function beam(name,a,b,r,color,phase=1,extra={}){return add('segment',name,a,[r,r,r],color,phase,{end:b,...extra});}
 const round=(name,p,s,color,phase=4,extra={})=>add('cylinder',name,p,s,color,phase,extra);
 // Thin continuous terrain; paving, grass and planting positions are shared in both routes.
 ball('地面',[-.2,-.17,.25],[6.15,.27,4.45],'grass',-1,{group:'ground'});
 for(let row=0;row<10;row++)for(let col=0;col<14;col++){
  const x=-4.35+col*.65+(row%2)*.24,z=-2.6+row*.62;
  if(x>4.4||z>3.25||(x<-3.5&&z<.3))continue;
  box('敷石',[x,.08,z],[.615,.16,.58],hash(col,row)>.5?'stone':'stone2',-1,{group:'ground',bevel:.022});
 }
 const baseY=.17, floorY=.39, cx=-.7, cz=-.5, w=4.8,d=3.6,left=cx-w/2,right=cx+w/2,front=cz+d/2,back=cz-d/2,wallTop=3.5;
 for(let x=left+.3;x<right;x+=.6)for(let z=back+.3;z<front;z+=.6)box('基礎石',[x,.27,z],[.6,.2,.6],'stone',0);
 box('床',[cx,.42,cz],[w,.12,d],'woodDark',1);
 box('入口の段',[.86,.26,front+.26],[1.18,.18,.58],'stone2',0,{bevel:.025});
 for(const x of [left+.1,cx,right-.1])for(const z of [back+.1,front-.1])box('柱',[x,1.98,z],[.18,3.02,.18],'wood',1);
 for(const z of [back+.1,front-.1])box('梁',[cx,3.42,z],[w,.2,.2],'wood',1);
 for(const x of [left+.1,right-.1])box('桁',[x,3.42,cz],[.2,.2,d],'wood',1);
 for(let x=left+.3;x<right;x+=.53){const top=3.48+1.48*(1-Math.max(0,Math.abs(x-cx)-1.23)/(2.78-1.23))-.18;beam('垂木',[x,3.36,front+.2],[x,top,cz],.055,'wood',1);beam('垂木',[x,top,cz],[x,3.36,back-.2],.055,'wood',1);}
 beam('棟木',[cx-1.23,4.77,cz],[cx+1.23,4.77,cz],.075,'woodDark',1);
 for(const sx of [-1,1])for(const sz of [-1,1])beam('隅木',[cx+sx*2.38,3.39,cz+sz*1.74],[cx+sx*1.23,4.77,cz],.065,'wood',1);
 box('小屋梁',[cx,3.34,cz],[w,.15,.16],'wood',1);
 for(const x of [cx-1.23,cx+1.23])box('小屋束',[x,4.05,cz],[.12,1.42,.12],'wood',1);
 // Real window/door openings: wall strips surround openings, never cover panes.
 const win={x:-1.45,bottom:1.02,top:2.83,width:2.52},door={x:.89,bottom:.48,top:2.88,width:.92};
 const openings=[{a:win.x-win.width/2,b:win.x+win.width/2,y0:win.bottom,y1:win.top}, {a:door.x-door.width/2,b:door.x+door.width/2,y0:door.bottom,y1:door.top}];
 const cuts=[left,...openings.flatMap(o=>[o.a,o.b]),right];
 for(let i=0;i<cuts.length-1;i++){
  const a=cuts[i],b=cuts[i+1],mid=(a+b)/2,o=openings.find(q=>mid>q.a&&mid<q.b);
  for(const [y0,y1] of o?[[floorY,o.y0],[o.y1,wallTop]]:[[floorY,wallTop]])if(y1-y0>.02)box('正面の漆喰壁',[mid,(y0+y1)/2,front-.09],[b-a,y1-y0,.22],'plaster',2);
 }
 box('背面の壁',[cx,1.94,back+.07],[w,3.1,.22],'plaster',2);
 box('左側の壁',[left+.07,1.94,cz],[.22,3.1,d],'plaster',2);
 // Right side window is likewise a true opening.
 const sideZ=-.35,sideW=1.6,side0=1.05,side1=2.69;
 for(const [a,b] of [[back,sideZ-sideW/2],[sideZ+sideW/2,front]])box('側面の壁',[right-.07,1.94,(a+b)/2],[.22,3.1,b-a],'plaster2',2);
 box('側面の腰壁',[right-.07,(floorY+side0)/2,sideZ],[.22,side0-floorY,sideW],'plaster2',2);
 box('側面の垂れ壁',[right-.07,(wallTop+side1)/2,sideZ],[.22,wallTop-side1,sideW],'plaster2',2);
 function frontWindow(x,z,y0,y1,width,group='cafe'){
  box('窓の奥',[x,(y0+y1)/2,z-.12],[width,y1-y0,.075],'woodDark',2,{group});
  box('ガラス',[x,(y0+y1)/2,z-.035],[width-.13,y1-y0-.12,.075],'glass',2,{group,emission:true});
  for(const xx of [x-width/2,x+width/2])box('窓の縦枠',[xx,(y0+y1)/2,z+.04],[.13,y1-y0+.16,.18],'wood',2,{group,bevel:.012});
  for(const yy of [y0,y1])box('窓の横枠',[x,yy,z+.04],[width+.13,.13,.18],'woodLight',2,{group,bevel:.012});
  box('窓台',[x,y0-.09,z+.1],[width+.32,.14,.36],'stone2',4,{group,bevel:.025});
 }
 frontWindow(win.x,front+.035,win.bottom,win.top,win.width);
 box('側面ガラス',[right+.012,(side0+side1)/2,sideZ],[.08,side1-side0,sideW],'glass',2,{emission:true});
 for(const z of [sideZ-sideW/2,sideZ+sideW/2])box('側面の縦枠',[right+.065,(side0+side1)/2,z],[.2,side1-side0+.13,.12],'wood',2);
 for(const y of [side0,side1])box('側面の横枠',[right+.065,y,sideZ],[.2,.13,sideW+.13],'woodLight',2);
 box('ドア',[door.x,1.66,front-.02],[door.width,2.36,.14],'wood',2,{bevel:.012});
 box('ドアのガラス',[door.x,2.14,front+.065],[.63,1.08,.05],'glassLight',4,{emission:true});
 box('ドアの鏡板',[door.x,1.0,front+.064],[.64,.58,.055],'woodLight',4,{bevel:.02});
 beam('ドアの取手',[door.x+.3,1.41,front+.17],[door.x+.3,1.64,front+.17],.035,'metal',4);
 for(const x of [door.x-.51,door.x+.51])box('ドア枠',[x,1.68,front+.08],[.13,2.5,.21],'woodDark',2);
 box('ドア上枠',[door.x,2.94,front+.08],[1.15,.12,.21],'wood',2);
 // Stone skirting varies by joint, not random tiny noise over the whole wall.
 for(let x=left+.25;x<right;x+=.48){if(Math.abs(x-door.x)<.6)continue;box('腰石',[x,.6,front+.055],[.46,.28,.11],hash(x,1)>.6?'stone2':'stone',4,{bevel:.012});}
 const roofY=3.48, roofH=1.48, hw=2.78,hd=2.13,ridge=1.23;
 add('hip','屋根',[cx,roofY,cz],[hw,roofH,hd],variant===1?'brick':'roof',3,{ridge,thickness:.115});
 // Continuous front/back standing seams and hip ridges. All ribs touch the shell.
 function hipY(x,z){return roofY+roofH*Math.max(0,Math.min(1-Math.abs(z)/hd,1-Math.max(0,Math.abs(x)-ridge)/(hw-ridge)));}
 for(let x=-hw+.16;x<hw;x+=.38){const topZ=Math.min(hd,Math.max(0,(Math.abs(x)-ridge)/(hw-ridge)*hd));
  for(const sign of [-1,1])beam('屋根の縦はぜ',[cx+x,hipY(x,sign*hd)+.035,cz+sign*hd],[cx+x,hipY(x,sign*topZ)+.035,cz+sign*topZ],.027,variant===1?'brick2':'roofLight',3);
 }
 beam('棟包み',[cx-ridge,roofY+roofH+.035,cz],[cx+ridge,roofY+roofH+.035,cz],.07,'roofEdge',3);
 for(const sx of [-1,1])for(const sz of [-1,1])beam('隅棟',[cx+sx*hw,roofY+.04,cz+sz*hd],[cx+sx*ridge,roofY+roofH+.04,cz],.04,'roofEdge',3);
 for(const z of [cz-hd,cz+hd])beam('雨樋',[cx-hw,roofY+.01,z],[cx+hw,roofY+.01,z],.07,'roofEdge',4);
 beam('竪樋',[left-.21,roofY,back-.26],[left-.21,.38,back-.26],.065,'roofEdge',4);
 for(let y=3.9;y<5.35;y+=.16)for(let x=0;x<2;x++)for(let z=0;z<2;z++)box('煙突の煉瓦',[.6+x*.26,y,-1.2+z*.24],[.25,.145,.23],hash(x+y,z)>.5?'brick':'brick2',3,{bevel:.01});
 box('煙突の笠',[.73,5.37,-1.08],[.69,.14,.61],'stone',4,{bevel:.03});
 box('煙突の開口',[.73,5.45,-1.08],[.33,.045,.29],'metal',4);
 // Low wing stays behind the terrace; cannot block the front entrance.
 box('別棟の基礎',[2.43,.29,-1.54],[1.62,.24,1.48],'stone',0);
 box('別棟の壁',[2.43,1.49,-1.54],[1.6,2.18,1.45],'plaster',2);
 box('別棟の屋根',[2.43,2.67,-1.54],[1.91,.15,1.78],'roof',3,{r:[-.12,0,0]});
 for(let x=1.6;x<3.4;x+=.32)box('別棟のはぜ',[x,2.77,-1.54],[.045,.045,1.78],'roofLight',3,{r:[-.12,0,0]});
 // Side canopy sloping outward. Poles outside seated circulation.
 box('テラスの布庇',[2.65,2.73,.32],[2.03,.09,2.22],'cloth',4,{r:[0,0,-.1]});
 box('庇の垂れ',[3.66,2.6,.32],[.09,.2,2.22],'cloth',4);
 for(const z of [-.76,1.4]){beam('庇の腕',[right+.08,2.82,z],[3.68,2.62,z],.033,'metal',4);beam('庇の支柱',[3.68,.17,z],[3.68,2.65,z],.038,'metal',4);}
 for(const z of [-.54,.07,.68,1.27])box('布の継ぎ目',[2.65,2.78,z],[2.03,.013,.028],'clothLight',4,{r:[0,0,-.1]});
 round('テラスの天板',[2.65,1.02,.53],[.51,.095,.51],'woodLight',4,{group:'terrace'});
 beam('テーブルの脚',[2.65,.21,.53],[2.65,1,.53],.075,'metal',4,{group:'terrace'});
 for(const [dx,dz] of [[.31,.24],[-.31,.24],[0,-.36]])beam('テーブルの足',[2.65,.36,.53],[2.65+dx,.19,.53+dz],.035,'metal',4,{group:'terrace'});
 function chair(x,z,yaw){
  const world=(a,y,b)=>[x+a*Math.cos(yaw)+b*Math.sin(yaw),y,z-a*Math.sin(yaw)+b*Math.cos(yaw)];
  for(const a of [-.23,.23])for(const b of [-.22,.22])beam('椅子の脚',world(a*.98,.18,b*1.2),world(a,.69,b),.035,'metal',4,{group:'terrace'});
  for(const b of [-.16,0,.16])box('椅子の座面',world(0,.7,b),[.54,.075,.14],'wood',4,{group:'terrace',r:[0,yaw,0],bevel:.02});
  for(const a of [-.23,.23])beam('椅子の背支柱',world(a,.63,-.23),world(a,1.26,-.29),.035,'metal',4,{group:'terrace'});
  for(const y of [1.03,1.19])box('椅子の背板',world(0,y,-.27),[.55,.12,.065],'woodLight',4,{group:'terrace',r:[0,yaw,0],bevel:.02});
 }
 chair(2.65,-.27,0);chair(2.65,1.37,Math.PI);
 for(const [x,z] of [[2.5,.45],[2.85,.58]]){round('カップの受け皿',[x,1.086,z],[.13,.025,.13],'cream',4,{group:'terrace'});round('カップ',[x,1.16,z],[.075,.14,.075],'cream',4,{group:'terrace'});round('コーヒー',[x,1.234,z],[.055,.01,.055],'woodDark',4,{group:'terrace'});}
 // Bench parts are individually supported; no book/box on the seat.
 for(const x of [-4.27,-2.93])for(const z of [1.93,2.43])beam('ベンチの脚',[x,.17,z],[x,.79,z],.052,'metal',4,{group:'bench'});
 for(const z of [1.93,2.1,2.27,2.44])box('ベンチの座板',[-3.6,.8,z],[1.68,.1,.14],'wood',4,{group:'bench',bevel:.025});
 for(const x of [-4.27,-2.93])beam('ベンチの背柱',[x,.66,1.93],[x,1.55,1.79],.052,'metal',4,{group:'bench'});
 for(const y of [1.17,1.38])box('ベンチの背板',[-3.6,y,1.85],[1.73,.17,.085],'woodLight',4,{group:'bench',r:[-.15,0,0],bevel:.025});
 // Flowers: actual petals, contrasting centre, stem, and individual leaves.
 function flower(x,y,z,i,group='plants'){
  beam('花茎',[x,y,z],[x+.04,y+.32,z],.027,'leafDark',4,{group});
  for(const sign of [-1,1])ball('葉',[x+sign*.075,y+.15,z],[.105,.035,.05],'leaf',4,{group,r:[0,0,sign*.5]});
  for(let j=0;j<5;j++){const a=j*Math.PI*2/5;ball('花弁',[x+.04+Math.cos(a)*.073,y+.325,z+Math.sin(a)*.073],[.066,.035,.05],i%3===0?'flower':'cream',4,{group,r:[0,-a,0]});}
  ball('花芯',[x+.04,y+.35,z],[.045,.033,.045],'yellow',4,{group});
 }
 for(const [x,z] of [[-2.85,1.95],[1.48,1.95],[3.3,-.52]]){
  round('植木鉢',[x,.43,z],[.28,.49,.28],'pot',4,{group:'plants',taper:.72});
  round('鉢の縁',[x,.69,z],[.31,.09,.31],'pot',4,{group:'plants'});
  round('土',[x,.74,z],[.255,.025,.255],'soil',4,{group:'plants'});
  for(let i=0;i<7;i++){const a=i*2.399,r=.065+hash(i,x)*.16;flower(x+Math.cos(a)*r,.72+hash(i,z)*.12,z+Math.sin(a)*r,i);}
 }
 // Branching tree: foliage attaches to terminal branches, uneven negative spaces remain.
 const tree=[-4.22,.02,-1.35];
 beam('樹の幹',tree,[-4.02,2.64,-1.36],.24,'woodDark',0,{group:'tree',taper:.56});
 const crowns=[[-5.22,3.12,-1.06,.86],[-4.7,4.08,-1.81,1.08],[-3.86,4.7,-1.62,1.1],[-3.1,4.03,-1.95,.93],[-4.29,3.82,-.42,.92],[-5.15,2.62,-2.12,.68],[-3.33,5.22,-.9,.75]];
 crowns.forEach(([x,y,z,r],i)=>{
  const fork=[-4.06,1.73+i*.12,-1.35];beam('樹の枝',fork,[x,y-.22,z],.11,'wood',1,{group:'tree',taper:.42});
  for(let j=0;j<12;j++){const a=j*2.399,rr=r*(.27+hash(i,j)*.58),px=x+Math.cos(a)*rr,pz=z+Math.sin(a)*rr*.69,py=y+(hash(j,i)-.45)*r*.6;
   ball('葉の房',[px,py,pz],[r*(.39+hash(j,4)*.2),r*.28,r*.39],['leaf','leaf2','leaf3','leafDark'][(j+i)%4],2+Math.floor(j/6),{group:'tree',r:[hash(i,j)*.6,a,0],foliage:true});
  }
 });
 for(let i=0;i<35;i++){
  const a=i*2.399,r=4.1+hash(i,1)*1.2,x=Math.cos(a)*r-.3,z=Math.sin(a)*r*.67+.25;
  if((x>-.2&&x<2&&z<2.4)||(x>2&&z<1.65))continue;
  for(let j=0;j<3;j++)beam('草',[x,.035,z],[x+(hash(i,j)-.5)*.24,.19+hash(j,i)*.17,z+(hash(j,i+2)-.5)*.24],.022,'leaf2',4,{group:'plants'});
  if(i%4===0)flower(x,.05,z,i);
 }
 box('看板',[1.51,2.21,front+.075],[.31,.37,.08],'metal',4,{bevel:.02});
 beam('照明の腕',[1.51,2.72,front+.04],[1.51,2.72,front+.29],.03,'metal',4);
 round('外灯',[1.51,2.65,front+.3],[.13,.08,.13],'metal',4,{taper:.45});
 ball('外灯の光',[1.51,2.605,front+.3],[.065,.035,.065],'cream',4,{emission:true});
 // Larger left-side tree leaves the facade open. Fine clusters replace uniform balls.
 for(const p of parts.filter(p=>p.group==='tree')){p.p[0]-=.8;p.p[1]*=1.1;if(p.end){p.end[0]-=.8;p.end[1]*=1.1;}if(p.foliage){p.s=p.s.map((v,i)=>v*(i===1?.83:1));}}
 const fine=[];
 for(const p of parts.filter(p=>p.foliage))for(let j=0;j<7;j++){
  const a=j*2.399,rad=.8,dx=Math.cos(a)*p.s[0]*rad,dz=Math.sin(a)*p.s[2]*rad,dy=(hash(j,p.p[0])-.3)*p.s[1];
  fine.push({name:'小枝先の葉',pos:[p.p[0]+dx,p.p[1]+dy+.12,p.p[2]+dz],size:[.2+hash(j,1)*.1,.09,.16],color:j%4===0?'leaf3':j%2===0?'leaf2':'leaf',r:[j*.2,a,.2]});
 }
 for(const p of fine)ball(p.name,p.pos,p.size,p.color,3,{group:'tree',foliage:true,r:p.r});
 return{parts,variant,budget:BUDGET,cell:CELL,entrance:{min:[.32,.17,1.4],max:[1.38,2.7,2.45]},bounds:{min:[-7,-.5,-4.3],max:[5.7,6.7,4.6]}};
}

export function phaseProgress(steps,phase){if(phase<0)return 1;const start=phase?PHASES[phase-1].end:0;return Math.max(0,Math.min(1,(steps-start)/(PHASES[phase].end-start)));}
export function scheduleParts(parts){
 const counts=Array(5).fill(0),totals=Array(5).fill(0);parts.forEach(p=>{if(p.phase>=0)totals[p.phase]++;});
 return parts.map(p=>({...p,order:p.phase<0?0:counts[p.phase]++,phaseCount:p.phase<0?1:totals[p.phase]}));
}
export function partVisible(p,steps){return p.phase<0||phaseProgress(steps,p.phase)*p.phaseCount>p.order;}
export function inversePoint(p,x,y,z){
 x-=p.p[0];y-=p.p[1];z-=p.p[2];const [rx,ry,rz]=p.r;
 let c=Math.cos(rz),s=Math.sin(rz),a=x*c+y*s,b=-x*s+y*c;x=a;y=b;
 c=Math.cos(ry);s=Math.sin(ry);a=x*c-z*s;b=x*s+z*c;x=a;z=b;
 c=Math.cos(rx);s=Math.sin(rx);a=y*c+z*s;b=-y*s+z*c;return[x,a,b];
}
export function insidePart(p,x,y,z){
 if(p.shape==='segment'){
  const a=p.p,b=p.end,dx=b[0]-a[0],dy=b[1]-a[1],dz=b[2]-a[2],t=Math.max(0,Math.min(1,((x-a[0])*dx+(y-a[1])*dy+(z-a[2])*dz)/(dx*dx+dy*dy+dz*dz))),r=p.s[0]*(1-t*(1-(p.taper??1)));
  return (x-a[0]-t*dx)**2+(y-a[1]-t*dy)**2+(z-a[2]-t*dz)**2<=r*r;
 }
 const [a,b,c]=inversePoint(p,x,y,z),[w,h,d]=p.s;
 if(p.shape==='box')return Math.abs(a)<=w/2&&Math.abs(b)<=h/2&&Math.abs(c)<=d/2;
 if(p.shape==='ellipsoid')return(a/w)**2+(b/h)**2+(c/d)**2<=1;
 if(p.shape==='cylinder'){const r=w*((p.taper??1)+(1-(p.taper??1))*(b/h+.5));return Math.abs(b)<=h/2&&(a/r)**2+(c/(d*r/w))**2<=1;}
 if(p.shape==='hip'){const top=h*Math.max(0,Math.min(1-Math.abs(c)/d,1-Math.max(0,Math.abs(a)-p.ridge)/(w-p.ridge)));return Math.abs(a)<=w&&Math.abs(c)<=d&&b<=top&&b>=top-p.thickness;}
 return false;
}
export function partBounds(p){
 if(p.shape==='segment')return{min:p.p.map((v,i)=>Math.min(v,p.end[i])-p.s[0]),max:p.p.map((v,i)=>Math.max(v,p.end[i])+p.s[0])};
 // Conservative rotated bounds; occupancy still uses exact analytic local shape.
 const radii=p.shape==='box'?p.s.map(v=>v/2):p.shape==='cylinder'?[p.s[0],p.s[1]/2,p.s[2]]:p.shape==='hip'?[p.s[0],p.s[1]+p.thickness,p.s[2]]:p.s;
 const angle=p.r.some(v=>v!==0),r=Math.hypot(...radii);return{min:p.p.map((v,i)=>v-(angle?r:radii[i])),max:p.p.map((v,i)=>v+(angle?r:radii[i]))};
}
export function voxelize(design){
 const map=new Map(),u=design.cell;
 function put(key,c){const old=map.get(key);if(old){c.under=old.under;if(old.phase!==c.phase)c.under=[...(old.under||[]),{...old,under:undefined}];}map.set(key,c);}
 for(const original of scheduleParts(design.parts)){
  const p=original.shape==='box'?{...original,s:original.s.map(v=>Math.max(v,u*1.02))}:original;
  const b=partBounds(p),lo=b.min.map(v=>Math.floor(v/u)),hi=b.max.map(v=>Math.ceil(v/u));
  let hits=0;
  for(let x=lo[0];x<=hi[0];x++)for(let y=lo[1];y<=hi[1];y++)for(let z=lo[2];z<=hi[2];z++){
   if(!insidePart(p,(x+.5)*u,(y+.5)*u,(z+.5)*u))continue;
   put(`${x},${y},${z}`,{x,y,z,color:p.color,phase:p.phase,part:p.id,group:p.group,emission:!!p.emission,order:p.order,phaseCount:p.phaseCount});hits++;
  }
  // Thin detail uses a connected sampled centerline instead of silently vanishing.
  if(p.shape==='segment')for(let t=0;t<=1;t+=u/Math.max(u,Math.hypot(...p.end.map((v,i)=>v-p.p[i])))/2){const q=p.p.map((v,i)=>Math.floor((v+(p.end[i]-v)*t)/u));put(q.join(','),{x:q[0],y:q[1],z:q[2],color:p.color,phase:p.phase,part:p.id,group:p.group,emission:!!p.emission,order:p.order,phaseCount:p.phaseCount});}
 }
 return [...map.values()].sort((a,b)=>a.phase-b.phase||a.order-b.order||a.y-b.y||a.z-b.z||a.x-b.x);
}
export const cellKey=c=>`${c.x},${c.y},${c.z}`;
export function visibleCells(cells,steps){
 if(steps>=BUDGET)return cells;
 const events=cells.flatMap(c=>[...(c.under||[]),c]).sort((a,b)=>a.phase-b.phase||(a.order??999)-(b.order??999)||a.y-b.y||a.z-b.z||a.x-b.x);
 const counts=Array(5).fill(0),limits=Array(5).fill(0);for(const c of events)if(c.phase>=0)counts[c.phase]++;
 for(let i=0;i<5;i++)limits[i]=Math.floor(counts[i]*phaseProgress(steps,i));
 const seen=Array(5).fill(0),out=new Map();for(const c of events)if(c.phase<0||seen[c.phase]++<limits[c.phase])out.set(cellKey(c),c);return [...out.values()];
}
export function encodeWork(cells,cell=CELL){return JSON.stringify({format:'dayorama-art-study',version:1,title:'カフェのアレンジ',cell,budget:BUDGET,palette:COLORS,cells:cells.map(c=>[c.x,c.y,c.z,c.color,c.phase,c.group,...(c.under?.length?[c.under.map(u=>[u.color,u.phase,u.group])]:[])])});}
export function decodeWork(text){
 if(text.length>16000000)throw Error('ファイルが大きすぎます。');const d=JSON.parse(text);
 if(d.format!=='dayorama-art-study'||d.version!==1||d.cell!==CELL||!Array.isArray(d.cells)||d.cells.length>240000)throw Error('この比較デモの作品ファイルではありません。');
 const seen=new Set();return d.cells.map((a,i)=>{
  const valid=(color,phase,group)=>Object.hasOwn(COLORS,color)&&Number.isInteger(phase)&&phase>=-1&&phase<=4&&['ground','cafe','terrace','bench','tree','plants','custom'].includes(group);
  if(!Array.isArray(a)||![6,7].includes(a.length)||!a.slice(0,3).every(v=>Number.isInteger(v)&&Math.abs(v)<=120)||!valid(a[3],a[4],a[5]))throw Error('作品データに不正な値があります。');
  if(a[6]&&(!Array.isArray(a[6])||a[6].length>8||a[6].some(u=>!Array.isArray(u)||u.length!==3||!valid(...u))))throw Error('建築段階のデータが不正です。');
  const key=a.slice(0,3).join(',');if(seen.has(key))throw Error('重複するブロックがあります。');seen.add(key);
  return{x:a[0],y:a[1],z:a[2],color:a[3],phase:a[4],group:a[5],part:`import${i}`,emission:a[3].startsWith('glass'),under:a[6]?.map(u=>({x:a[0],y:a[1],z:a[2],color:u[0],phase:u[1],group:u[2],part:`import${i}`,emission:u[0].startsWith('glass')}))};
 });
}
