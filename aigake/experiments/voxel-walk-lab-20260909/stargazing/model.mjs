import {CONSTELLATIONS} from './catalog.mjs';
export {CONSTELLATIONS};
export const BY_ID=Object.fromEntries(CONSTELLATIONS.map(c=>[c.id,c]));
const rad=Math.PI/180,mod=(a,n)=>((a%n)+n)%n,clamp=x=>Math.max(-1,Math.min(1,x));
export const OBSERVATORIES={north:{name:'北の空',latitude:35,longitude:135,offset:9},south:{name:'南の空',latitude:-35,longitude:135,offset:9}};
export function observationDate(day=new Date().toLocaleDateString('en-CA'),hour=21){
 if(!/^\d{4}-\d{2}-\d{2}$/.test(day)||!Number.isInteger(hour)||hour<0||hour>23)throw Error('観測日時を選んでください。');
 const [y,m,d]=day.split('-').map(Number),test=new Date(Date.UTC(y,m-1,d));if(test.toISOString().slice(0,10)!==day)throw Error('観測日が正しくありません。');
 return new Date(Date.UTC(y,m-1,d,hour-9));
}
export function sidereal(date,longitude=135){
 const jd=date.getTime()/86400000+2440587.5,jd0=Math.floor(jd-.5)+.5,h=(jd-jd0)*24,d=jd0-2451545,t=(jd-2451545)/36525;
 return mod((6.697375+.065709824279*d+1.0027379*h+.0000258*t*t)*15+longitude,360);
}
export function horizontal([ra,dec],date,site='north'){
 const p=OBSERVATORIES[site];if(!p)throw Error('観測地点が正しくありません。');
 const ha=(sidereal(date,p.longitude)-ra)*rad,phi=p.latitude*rad,de=dec*rad;
 const altitude=Math.asin(clamp(Math.cos(ha)*Math.cos(de)*Math.cos(phi)+Math.sin(de)*Math.sin(phi)))/rad;
 const azimuth=mod(Math.atan2(-Math.sin(ha)*Math.cos(de),Math.sin(de)*Math.cos(phi)-Math.cos(de)*Math.sin(phi)*Math.cos(ha))/rad,360);
 return{altitude,azimuth};
}
export function center(c){
 const v=c.stars.reduce((a,[r,d])=>[a[0]+Math.cos(d*rad)*Math.cos(r*rad),a[1]+Math.cos(d*rad)*Math.sin(r*rad),a[2]+Math.sin(d*rad)],[0,0,0]);
 return[Math.atan2(v[1],v[0])/rad,Math.atan2(v[2],Math.hypot(v[0],v[1]))/rad];
}
export function visibility(c,date,site){
 const minAltitude=Math.min(...c.stars.map(s=>horizontal(s,date,site).altitude)),position=horizontal(center(c),date,site);
 return{...position,minAltitude,visible:minAltitude>=5};
}
export function tonight(date,site){return CONSTELLATIONS.map(c=>({...c,sky:visibility(c,date,site)})).filter(c=>c.sky.visible).sort((a,b)=>a.edges.length-b.edges.length||a.id.localeCompare(b.id));}
export function observingMonths(c,site,year=new Date().getFullYear()){
 return Array.from({length:12},(_,i)=>i+1).filter(m=>[1,8,15,22].some(d=>[20,21,22,23,0,1,2,3,4].some(h=>visibility(c,observationDate(`${year}-${String(m).padStart(2,'0')}-${String(d).padStart(2,'0')}`,h),site).visible)));
}
// Stereographic projection keeps a pole or the 0h meridian from splitting a figure.
export function projectFigure(c){
 const [r0,d0]=center(c).map(v=>v*rad);
 const points=c.stars.map(([ra,dec])=>{const r=ra*rad-r0,d=dec*rad,k=2/(1+Math.sin(d0)*Math.sin(d)+Math.cos(d0)*Math.cos(d)*Math.cos(r));return[-k*Math.cos(d)*Math.sin(r),-k*(Math.cos(d0)*Math.sin(d)-Math.sin(d0)*Math.cos(d)*Math.cos(r))];});
 const xs=points.map(p=>p[0]),ys=points.map(p=>p[1]),x0=Math.min(...xs),x1=Math.max(...xs),y0=Math.min(...ys),y1=Math.max(...ys),scale=Math.min(480/Math.max(.001,x1-x0),380/Math.max(.001,y1-y0));
 return points.map(([x,y])=>[300+(x-(x0+x1)/2)*scale,240+(y-(y0+y1)/2)*scale]);
}
export const edgeKey=(a,b)=>a<b?`${a}:${b}`:`${b}:${a}`;
export function checkAnswer(c,edges){
 const expected=new Set(c.edges.map(e=>edgeKey(...e))),actual=new Set();
 for(const e of edges){if(!Array.isArray(e)||e.length!==2||e.some(i=>!Number.isInteger(i)||i<0||i>=c.stars.length)||e[0]===e[1])return{correct:false,matched:0,extra:1,missing:expected.size};actual.add(edgeKey(...e));}
 const matched=[...actual].filter(e=>expected.has(e)).length,extra=actual.size-matched,missing=expected.size-matched;
 return{correct:!extra&&!missing,matched,extra,missing};
}
export const emptyNotebook=()=>({version:1,entries:{}});
export function restoreNotebook(raw){
 if(!raw)return emptyNotebook();const n=JSON.parse(raw);
 if(n?.version!==1||!n.entries||typeof n.entries!=='object'||Array.isArray(n.entries))throw Error('星座帳を読み込めません。元の記録は保持しています。');
 for(const [id,e]of Object.entries(n.entries))if(!Object.hasOwn(BY_ID,id)||!e||typeof e.registeredAt!=='string'||!Number.isFinite(Date.parse(e.registeredAt))||!Object.hasOwn(OBSERVATORIES,e.site)||typeof e.observedAt!=='string'||!Number.isFinite(Date.parse(e.observedAt)))throw Error('星座帳を読み込めません。元の記録は保持しています。');
 return n;
}
export function registerAnswer(book,c,edges,{unlocked,date,site,now=new Date()}){
 if(!unlocked)throw Error('星見の丘を完成させると観測できます。');
 if(!BY_ID[c.id]||!visibility(BY_ID[c.id],date,site).visible)throw Error('この日時には星座全体が見えません。');
 if(!checkAnswer(BY_ID[c.id],edges).correct)throw Error('まだ星座の形が違います。');
 if(book.entries[c.id])return book;
 return{version:1,entries:{...book.entries,[c.id]:{registeredAt:now.toISOString(),observedAt:date.toISOString(),site}}};
}
export function studioUnlocked(state){return state?.region==='stars'&&state.buildings?.length===4&&state.buildings.every(b=>b.steps>=20000);}
export function walkUnlocked(state,budget){return state?.album?.some(t=>t.region==='stars')||(state?.region==='stars'&&Number.isFinite(budget)&&budget>0&&state.total-state.townStart>=budget);}
