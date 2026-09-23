import {makeRefinedDesign} from './refined.mjs';
const rand=(a,b=0)=>{const n=Math.sin(a*127.1+b*311.7)*43758.5453;return n-Math.floor(n);};
export const SITE=[[-6.5,-2.5],[-4.5,-3.65],[-1.5,-3.65],[.2,-3.85],[3.4,-3.2],[5,-1.9],[5.25,.6],[4.7,2.85],[2.7,3.8],[.95,3.65],[-1.6,4.05],[-4.65,3.15],[-6.2,1.6]];
const ORIGINAL_POTS=[[-2.85,1.95],[1.48,1.95],[3.3,-.52]];
export const POTS=[[-2.85,1.95],[1.84,1.95],[3.3,-.52]];
export function inWalkway(x,z){
 return (x> -4.65&&x<1.9&&z>1.32&&z<2.75)||(x>1.65&&x<4.3&&z>-.96&&z<2.5)||(x>.1&&x<1.78&&z>=2.5&&z<3.7);
}
export function makeSceneDesign(variant=0){
 const d=makeRefinedDesign(variant);d.scene=true;
 d.parts=d.parts.filter(p=>p.group!=='ground'&&
  !(p.group==='tree'&&!['樹の根元','樹の幹','地面を支える根'].includes(p.name))&&
  !(p.group==='plants'&&!ORIGINAL_POTS.some(([x,z])=>Math.hypot(p.p[0]-x,p.p[2]-z)<.62)));
 for(const p of d.parts.filter(p=>p.group==='plants'&&Math.hypot(p.p[0]-1.48,p.p[2]-1.95)<.62)){p.p[0]+=.36;if(p.end)p.end[0]+=.36;}
 let serial=0;
 const add=(shape,name,p,s,color,group,phase=4,extra={})=>{const part={id:`site${serial++}`,shape,name,p,s,color,group,phase,r:[0,0,0],...extra};d.parts.push(part);return part;};
 const box=(n,p,s,c,g,phase=4,e={})=>add('box',n,p,s,c,g,phase,e);
 const ball=(n,p,s,c,g,phase=4,e={})=>add('ellipsoid',n,p,s,c,g,phase,e);
 const round=(n,p,s,c,g,phase=4,e={})=>add('cylinder',n,p,s,c,g,phase,e);
 const line=(n,a,b,r,c,g,phase=4,e={})=>add('segment',n,a,[r,r,r],c,g,phase,{end:b,...e});
 function prism(name,outline,y,height,color,group='ground',phase=-1){
  const min=[Math.min(...outline.map(p=>p[0])),Math.min(...outline.map(p=>p[1]))],max=[Math.max(...outline.map(p=>p[0])),Math.max(...outline.map(p=>p[1]))],cx=(min[0]+max[0])/2,cz=(min[1]+max[1])/2;
  return add('prism',name,[cx,y,cz],[max[0]-min[0],height,max[1]-min[1]],color,group,phase,{outline:outline.map(([x,z])=>[x-cx,z-cz])});
 }
 // Flat grade avoids the concentric steps of the former ellipsoid pedestal.
 const groundStart=d.parts.length;
 prism('敷地',SITE,-.1125,.225,'grass');
 box('建物下の地盤',[-.7,.075,-.5],[4.96,.15,3.76],'mortar','ground',-1);
 box('別棟下の地盤',[2.43,.075,-1.54],[1.7,.15,1.6],'mortar','ground',-1);
 const xs=[-4.65,-3.88,-3.02,-2.4,-1.47,-.75,.12,.82,1.73,2.42,3.18,3.85,4.45];
 const zs=[-1.03,-.35,.42,1.17,1.93,2.62,3.35,3.83];
 const corner=(i,j)=>[xs[i]+(rand(i,j)-.5)*.14,zs[j]+(rand(j,i+71)-.5)*.14];
 for(let i=0;i<xs.length-1;i++)for(let j=0;j<zs.length-1;j++){
  const x=(xs[i]+xs[i+1])/2,z=(zs[j]+zs[j+1])/2;
  if(!inWalkway(x,z))continue;
  const corners=[corner(i,j),corner(i+1,j),corner(i+1,j+1),corner(i,j+1)];
  const inset=corners.map(([a,b])=>[a+(x-a)*.055,b+(z-b)*.055]);
  // Two chamfered corners keep the silhouette irregular without individual pebbles.
  const polygon=[];for(let k=0;k<4;k++){
   const p=inset[k];if((k+i+j)%2){polygon.push(p);continue;}
   const prev=inset[(k+3)%4],next=inset[(k+1)%4];
   polygon.push([p[0]+(prev[0]-p[0])*.1,p[1]+(prev[1]-p[1])*.1],[p[0]+(next[0]-p[0])*.1,p[1]+(next[1]-p[1])*.1]);
  }
  prism('敷石の下地',corners,.0375,.075,'mortar');
  prism('敷石',polygon,.1125,.075,['flagWarm','flagLight','flagGrey'][(i+j*2)%3]);
 }
 // Foundation and furniture contact heights stay unchanged, including at grout lines.
 for(const p of d.parts.filter(p=>['ベンチの脚','椅子の脚','テーブルの足','庇の支柱'].includes(p.name))){
  const foot=p.p[1]<p.end[1]?p.p:p.end;box('足元の敷石',[foot[0],.075,foot[2]],[.225,.15,.225],'flagWarm','ground',-1);
 }
 for(const [x,z] of POTS)box('鉢下の敷石',[x,.075,z],[.675,.15,.675],'flagWarm','ground',-1);
 const ground=d.parts.splice(groundStart);d.parts.unshift(...ground);

 // Existing opaque panes remain voxels. Their recess now has actual jambs and a sill.
 for(const p of d.parts){
  if(p.name==='ガラス')p.p[2]=1.015;
  if(p.name==='窓の奥')p.p[2]=.93;
  if(p.name==='窓台'){p.p[2]=1.42;p.s[2]=.66;p.s[1]=.15;}
  if(p.name==='側面ガラス')p.p[0]=1.5;
 }
 for(const x of [-2.745,-.155])box('窓の側壁',[x,1.925,1.19],[.15,1.96,.52],'plaster2','cafe',2);
 for(const y of [1.0,2.86])box('窓の上下の壁',[-1.45,y,1.18],[2.74,.15,.5],'plaster','cafe',2);
 for(const x of [-2.67,-.23])box('窓の内枠',[x,1.92,1.065],[.075,1.8,.075],'woodHoney','cafe',2);
 for(const y of [1.06,2.77])box('窓の内横枠',[-1.45,y,1.065],[2.51,.075,.075],'woodHoney','cafe',2);
 for(const z of [-1.18,.48])box('側面窓の側壁',[1.6,1.87,z],[.4,1.79,.15],'plaster2','cafe',2);
 for(const y of [1.03,2.74])box('側面窓の上下の壁',[1.6,y,-.35],[.4,.15,1.8],'plaster2','cafe',2);
 box('側面の窓台',[1.74,.96,-.35],[.58,.15,1.95],'stone2','cafe');
 for(const [x,color,height] of [[-2.19,'ceramic',.3],[-.91,'pot',.22]]){
  round('窓辺の鉢',[x,1.1,1.55],[.135,.225,.135],color,'cafe',4,{taper:.78});
  round('窓辺の土',[x,1.215,1.55],[.11,.03,.11],'soil','cafe');
  for(let j=0;j<5;j++){
   const a=j*2.399,tip=[x+Math.cos(a)*.13,1.25+height*(.65+rand(j,x)*.35),1.55+Math.sin(a)*.11];
   line('窓辺の茎',[x,1.21,1.55],tip,.025,'leafDark','cafe');
   ball('窓辺の葉',tip,[.11,.075,.065],'leafOlive','cafe',4,{r:[0,a,.4]});
  }
 }
 // Quiet concentrated planting, with the approach and terrace kept clear.
 const beds=[[-5.55,.68,.58,.57],[-2.05,3.17,.73,.42],[4.3,-1.67,.47,.54]];
 for(const [cx,cz,w,h] of beds)for(let i=0;i<14;i++){
  const a=i*2.399,r=Math.sqrt(rand(i,cx)),x=cx+Math.cos(a)*w*r,z=cz+Math.sin(a)*h*r;
  if(inWalkway(x,z))continue;
  for(let k=0;k<3;k++){
   const t=a+k*2.1,tip=[x+Math.cos(t)*.09,.15+rand(i,k)*.14,z+Math.sin(t)*.08];
   line('花壇の茎',[x,0,z],tip,.025,'leafDark','plants');
   ball('花壇の葉',tip,[.11,.08,.065],i%3?'leafOlive':'leaf2','plants',4,{r:[0,t,.3]});
  }
  if(i%5===0){const y=.35+rand(i,7)*.07;line('花壇の花茎',[x,.02,z],[x,y,z],.025,'leafDark','plants');
   for(let k=0;k<5;k++){const t=k*1.257;ball('花壇の花弁',[x+Math.cos(t)*.09,y,z+Math.sin(t)*.09],[.075,.045,.06],i%2?'cream':'flowerGold','plants');}
   ball('花壇の花芯',[x,y+.025,z],[.05,.045,.05],'yellow','plants');
  }
 }
 // Open fork silhouette. Five broader crown areas replace the stacked round clusters.
 const fork=[-4.96,2.48,-1.4],branches=[[-5.71,3.15,-.75],[-5.22,4.04,-1.92],[-4.61,4.7,-1.43]];
 branches.forEach(b=>line('主枝',fork,b,.14,'bark','tree',1,{taper:.42}));
 const crowns=[[-6.02,3.65,-.72,.91,.82,.75,0],[-5.5,4.55,-1.92,1.01,.94,.81,1],[-4.63,5.33,-1.37,1.19,.86,.84,2],[-3.98,4.43,-1.9,.76,.69,.65,2],[-5.24,4.08,-.23,.75,.69,.61,0]];
 crowns.forEach(([x,y,z,w,h,depth,parent],i)=>{
  const center=[x,y-.16,z];line('枝分かれ',branches[parent],center,.08,'bark','tree',1,{taper:.45});
  for(let j=0;j<38;j++){
   const a=j*2.399+i*.57,rad=Math.sqrt(rand(i+21,j))*.88;
   const tip=[x+Math.cos(a)*w*rad,y+(rand(j,i+31)-.5)*h*1.75,z+Math.sin(a)*depth*rad];
   line('小枝',center,tip,.027,'barkDark','tree',2,{taper:.5});
   ball('葉の芯',tip,[.24,.20,.21],'leafOlive','tree',3,{foliage:true});
   for(let k=0;k<7;k++){
    const t=k*2.399+a,rr=.12+rand(k,j)*.13;
    ball('小枝先の葉',[tip[0]+Math.cos(t)*rr,tip[1]+(rand(k,i+j)-.3)*.14,tip[2]+Math.sin(t)*rr],
     [.18,.075,.10],'leafOlive','tree',3,{foliage:true,r:[(rand(i,k)-.5)*1.2,t,(rand(j,k)-.5)*.7]});
   }
  }
 });
 // Place structural timber before foliage so repeated twig/leaf overlaps do not
 // alternate construction phases or leave late twigs drawn over the final crown.
 d.parts.sort((a,b)=>a.phase-b.phase);
 return d;
}
