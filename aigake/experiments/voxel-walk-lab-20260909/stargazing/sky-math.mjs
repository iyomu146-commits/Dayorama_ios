import {OBSERVATORIES,sidereal,horizontal,center} from './model.mjs';
export const RAD=Math.PI/180;
export const clamp=(v,a,b)=>Math.min(b,Math.max(a,v));
export function equatorialVector([ra,dec]){const r=ra*RAD,d=dec*RAD;return[Math.cos(d)*Math.cos(r),Math.cos(d)*Math.sin(r),Math.sin(d)];}
// Right-handed local world: x east, y zenith, -z north. Row-major matrix.
export function skyRotation(date,site){
 const p=OBSERVATORIES[site];if(!p)throw Error('観測地点が正しくありません。');
 const a=sidereal(date,p.longitude)*RAD,b=p.latitude*RAD,s=Math.sin(a),c=Math.cos(a),sp=Math.sin(b),cp=Math.cos(b);
 return[-s,c,0,cp*c,cp*s,sp,sp*c,sp*s,-cp];
}
export function localVector(star,date,site){const v=equatorialVector(star),m=skyRotation(date,site);return[0,1,2].map(i=>m[i*3]*v[0]+m[i*3+1]*v[1]+m[i*3+2]*v[2]);}
export function directionName(azimuth){return['北','北東','東','南東','南','南西','西','北西'][Math.round(((azimuth%360)+360)%360/45)%8];}
export function constellationView(c,date,site,aspect){
 const xyz=localVector(center(c),date,site),azimuth=Math.atan2(xyz[0],-xyz[2])/RAD,altitude=clamp(Math.asin(xyz[1])/RAD,-5,89.5),az=azimuth*RAD,alt=altitude*RAD;
 const forward=[Math.sin(az)*Math.cos(alt),Math.sin(alt),-Math.cos(az)*Math.cos(alt)],right=[Math.cos(az),0,Math.sin(az)],up=[-Math.sin(az)*Math.sin(alt),Math.cos(alt),Math.cos(az)*Math.sin(alt)],dot=(a,b)=>a.reduce((s,v,i)=>s+v*b[i],0);
 let spanX=.08,spanY=.08;
 for(const star of c.stars){const v=localVector(star,date,site),depth=Math.max(.001,dot(v,forward));spanX=Math.max(spanX,Math.abs(dot(v,right)/depth));spanY=Math.max(spanY,Math.abs(dot(v,up)/depth));}
 // Long figures such as Hydra need a wider overview on portrait phones.
 const fov=clamp(2*Math.atan(Math.max(spanY/.40,spanX/(aspect*.79)))/RAD,18,170);
 return{azimuth,altitude,fov,viewShift:.07};
}
export function constellationHint(c,date,site){
 const {altitude,azimuth}=horizontal(center(c),date,site);
 const shapes={Cyg:'天の川を横切る、大きな十字を探して。',Cas:'5つの星がつくる、Wの並びを探して。',Ori:'一列に並ぶ3つの星が目印。',Lyr:'明るい星のそばに、小さな平行四辺形。',Aql:'明るい星を挟む、3つの星の並びが目印。',UMa:'ひしゃくの形を手がかりに、大きな星座を探して。',UMi:'北極星へ続く、小さなひしゃくを探して。',Sco:'赤い星から尾へ、曲がった星の列をたどって。',Peg:'大きな四角形を手がかりに探して。',Crux:'4つの星がつくる、小さな十字を探して。',Leo:'鎌のような曲線と、三角形を探して。',Sgr:'注ぎ口のあるティーポットの形を探して。',Tau:'V字に並ぶ星と、そこから伸びる2本の角。',Gem:'並んだ2つの明るい星が目印。',Cep:'屋根のある家のような五角形を探して。',Del:'小さなひし形と、そこから伸びる尾を探して。',And:'四角形の隅から続く、ゆるやかな星の列。'};
 return{direction:`${directionName(azimuth)}の空 · 高度 ${Math.round(altitude)}°`,clue:shapes[c.id]||`${c.stars.length}個の星を、${c.edges.length}本の線でつなぐ星座。`};
}
export function chooseFeatured(available){
 const favorites=['Cyg','Ori','Cas','Crux','Sco','Aql','Lyr','Leo','Peg','Tau','Gem','UMa','Car','Cen'];
 return favorites.map(id=>available.find(c=>c.id===id&&c.sky.altitude<78)).find(Boolean)||available.find(c=>c.sky.altitude>25)||available[0]||null;
}
// Pick a real section of the Milky Way above the local horizon, never a fixed backdrop.
export function scenicView(date,site){
 const samples=[[280,-20],[290,0],[300,25],[315,45],[340,58],[20,60],[55,50],[85,25],[105,-10],[125,-35],[160,-60],[210,-60],[255,-40]];
 const visible=samples.map(s=>horizontal(s,date,site)).filter(s=>s.altitude>15);
 const best=visible.sort((a,b)=>Math.abs(a.altitude-40)-Math.abs(b.altitude-40))[0];
 return{azimuth:best?.azimuth??180,altitude:clamp(best?.altitude??32,24,34),fov:86};
}
