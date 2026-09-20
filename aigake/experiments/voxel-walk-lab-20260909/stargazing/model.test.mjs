import test from 'node:test';
import assert from 'node:assert/strict';
import {CONSTELLATIONS,BY_ID,observationDate,sidereal,horizontal,tonight,visibility,projectFigure,checkAnswer,restoreNotebook,registerAnswer,studioUnlocked,walkUnlocked} from './model.mjs';
import {STARS} from './stars.mjs';
import {equatorialVector,skyRotation,localVector,scenicView,chooseFeatured,constellationHint,directionName,constellationView,RAD} from './sky-math.mjs';
import {toGalactic,fromGalactic,makeMilkyWayParticles,dustTransmission} from './milky-way.mjs';
test('procedural Milky Way follows the galactic frame and remains fixed across visits',()=>{
 const pole=toGalactic(equatorialVector([192.85948,27.12825]));assert.ok(pole[2]>.999999999);
 const gc=toGalactic(equatorialVector([266.404995,-28.936174]));assert.ok(gc[0]>.999999999);
 for(const s of STARS.filter((_,i)=>i%100===0)){const v=equatorialVector(s),back=fromGalactic(toGalactic(v));assert.ok(back.every((x,i)=>Math.abs(x-v[i])<1e-12));}
 const a=makeMilkyWayParticles(),b=makeMilkyWayParticles({count:256}),different=makeMilkyWayParticles({count:256,seed:92});
 assert.equal(a.positions.length,330000);assert.deepEqual(a.positions.slice(0,768),b.positions);assert.deepEqual(a.flux.slice(0,256),b.flux);assert.notDeepEqual(b.positions,different.positions);
 let inBand=0;
 for(let i=0;i<a.flux.length;i++){
  const p=a.positions.subarray(i*3,i*3+3);assert.ok(Math.abs(Math.hypot(...p)-1)<1e-6);assert.ok(a.flux[i]>0&&a.flux[i]<1);assert.ok(a.sizes[i]>=.7-1e-6&&a.sizes[i]<=2.1+1e-6);
  if(Math.abs(toGalactic(p)[2])<Math.sin(20*RAD))inBand++;
 }
 assert.ok(inBand/a.flux.length>.85);assert.ok(dustTransmission(0,0)<dustTransmission(0,.4));
 assert.throws(()=>makeMilkyWayParticles({count:1e9}));
});
test('whole-constellation framing retains the endpoints of long and polar figures on phones',()=>{
 const seen=new Set();
 for(const aspect of [390/844,1280/720])for(const site of ['north','south'])for(let month=1;month<=12;month++)for(const hour of [1,21]){
  const date=observationDate(`2026-${String(month).padStart(2,'0')}-15`,hour);
  for(const c of tonight(date,site)){
   seen.add(c.id);const view=constellationView(c,date,site,aspect),alt=view.altitude*RAD,tan=Math.tan(view.fov*RAD/2);
   for(const s of c.stars){const h=horizontal(s,date,site),a=h.altitude*RAD,delta=(h.azimuth-view.azimuth)*RAD,depth=Math.sin(a)*Math.sin(alt)+Math.cos(a)*Math.cos(alt)*Math.cos(delta),x=Math.cos(a)*Math.sin(delta)/(depth*tan*aspect),y=(Math.sin(a)*Math.cos(alt)-Math.cos(a)*Math.sin(alt)*Math.cos(delta))/(depth*tan)+view.viewShift*2;
    assert.ok(depth>0&&Math.abs(x)<.95&&Math.abs(y)<.95,`${c.id} endpoint lost: ${site} ${month} ${hour} aspect=${aspect}, x=${x}, y=${y}`);
   }
  }
 }
 assert.equal(seen.size,88);
});
test('rendered celestial sphere agrees with altitude and azimuth in both hemispheres',()=>{
 for(const site of ['north','south'])for(const day of ['2026-01-15','2026-07-15','2026-09-20'])for(const hour of [0,21]){
  const date=observationDate(day,hour),matrix=skyRotation(date,site);
  for(const s of [[0,0],[90,0],[180,0],[-90,0],[0,90],[0,-90],...BY_ID.Cas.stars,...BY_ID.Ori.stars]){
   const local=localVector(s,date,site),h=horizontal(s,date,site),a=h.altitude*Math.PI/180,z=h.azimuth*Math.PI/180;
   assert.ok(Math.abs(local[0]-Math.cos(a)*Math.sin(z))<1e-10);assert.ok(Math.abs(local[1]-Math.sin(a))<1e-10);assert.ok(Math.abs(local[2]+Math.cos(a)*Math.cos(z))<1e-10);
   // The background shader uses the transpose, so a catalog star and the
   // procedural Milky Way lookup recover the very same celestial direction.
   const recovered=[0,1,2].map(i=>local.reduce((sum,v,j)=>sum+v*matrix[j*3+i],0)),eq=equatorialVector(s);
   assert.ok(recovered.every((v,i)=>Math.abs(v-eq[i])<1e-10));
  }
  const available=tonight(date,site),featured=chooseFeatured(available);assert.ok(!featured||available.some(c=>c.id===featured.id));
  const view=scenicView(date,site);assert.ok(view.altitude>=24&&view.altitude<=34);assert.ok(Number.isFinite(view.azimuth));
 }
 assert.equal(directionName(0),'北');assert.equal(directionName(-90),'西');assert.equal(directionName(450),'東');
 assert.match(constellationHint(BY_ID.Cas,observationDate('2026-09-20',21),'north').clue,/W/);
});
test('bundled foreground uses finite real star coordinates, brightness and color',()=>{
 assert.equal(STARS.length,5044);assert.ok(STARS.every(s=>s.length===4&&s.every(Number.isFinite)&&Math.abs(s[0])<=180&&Math.abs(s[1])<=90&&s[2]<=6));
 // Sirius: catalog position, brightest naked-eye star. Prevent a synthetic or mirrored field.
 const sirius=STARS.reduce((a,b)=>a[2]<b[2]?a:b);assert.ok(Math.abs(sirius[0]-101.287)<.01);assert.ok(Math.abs(sirius[1]+16.716)<.01);assert.ok(sirius[2]<-1.4);
});
test('all 88 real figures are valid and Serpens has both disconnected parts',()=>{
 assert.equal(CONSTELLATIONS.length,88);assert.equal(new Set(CONSTELLATIONS.map(c=>c.id)).size,88);
 for(const c of CONSTELLATIONS){assert.ok(c.name.endsWith('座'),c.id);assert.ok(c.stars.length>=2,c.id);assert.ok(c.stars.every(s=>s.length===2&&Math.abs(s[0])<=180&&Math.abs(s[1])<=90),c.id);assert.ok(c.edges.every(e=>e.length===2&&e[0]!==e[1]&&e.every(i=>Number.isInteger(i)&&i>=0&&i<c.stars.length)),c.id);assert.equal(checkAnswer(c,c.edges).correct,true);assert.equal(checkAnswer(c,c.edges.slice(1)).correct,false);const points=projectFigure(c);assert.ok(points.every(p=>p.every(Number.isFinite)&&p[0]>=50&&p[0]<=550&&p[1]>=40&&p[1]<=440),c.id);}
 const ser=BY_ID.Ser,visited=new Set([0]);for(let i=0;i<ser.stars.length;i++)for(const[a,b]of ser.edges){if(visited.has(a))visited.add(b);if(visited.has(b))visited.add(a);}assert.ok(visited.size<ser.stars.length);
});
test('sidereal time and horizon geometry have known reference values',()=>{
 assert.ok(Math.abs(sidereal(new Date('2000-01-01T12:00:00Z'),0)-280.460625)<.001);
 const date=observationDate('2026-01-15',21),ra=sidereal(date,135);assert.ok(horizontal([ra,35],date,'north').altitude>89.99);assert.ok(horizontal([ra,-90],date,'north').altitude<0);assert.ok(horizontal([ra,-90],date,'south').altitude>34.99);assert.throws(()=>observationDate('2026-02-30',21));
});
test('seasons change the visible sky and all 88 can be reached across both sites',()=>{
 const winter=new Set(tonight(observationDate('2026-01-15',21),'north').map(c=>c.id)),summer=new Set(tonight(observationDate('2026-07-15',21),'north').map(c=>c.id));assert.ok(winter.has('Ori'));assert.ok(!summer.has('Ori'));assert.ok(summer.has('Sco'));assert.ok(!winter.has('Sco'));
 const seen=new Set();for(const site of ['north','south'])for(let m=1;m<=12;m++)for(const day of [1,15])for(const h of [20,21,22,23,0,1,2,3,4])for(const c of tonight(observationDate(`2026-${String(m).padStart(2,'0')}-${String(day).padStart(2,'0')}`,h),site))seen.add(c.id);
 assert.deepEqual(CONSTELLATIONS.filter(c=>!seen.has(c.id)).map(c=>c.id),[]);
});
test('only a correct visible answer after completion registers; retries do not duplicate entries',()=>{
 const c=BY_ID.Ori,date=observationDate('2026-01-15',21),options={unlocked:true,date,site:'north',now:new Date('2026-01-15T12:00:00Z')},empty=restoreNotebook(null);assert.equal(visibility(c,date,'north').visible,true);
 assert.throws(()=>registerAnswer(empty,c,c.edges,{...options,unlocked:false}));assert.throws(()=>registerAnswer(empty,c,[],options));assert.throws(()=>registerAnswer(empty,c,[...c.edges,[0,0]],options));assert.throws(()=>registerAnswer(empty,c,c.edges,{...options,date:observationDate('2026-07-15',21)}));
 const next=registerAnswer(empty,c,c.edges.map(([a,b])=>[b,a]),options);assert.equal(Object.keys(empty.entries).length,0);assert.equal(Object.keys(next.entries).length,1);assert.strictEqual(registerAnswer(next,c,c.edges,options),next);assert.deepEqual(restoreNotebook(JSON.stringify(next)),next);assert.throws(()=>restoreNotebook('{broken'));assert.throws(()=>restoreNotebook('{"version":1,"entries":{"fake":{}}}'));
});
test('construction preview and incomplete towns do not unlock the game; archived completion does',()=>{
 const buildings=Array.from({length:4},()=>({steps:20000}));assert.equal(studioUnlocked({region:'grove',buildings}),false);assert.equal(studioUnlocked({region:'stars',buildings}),true);assert.equal(studioUnlocked({region:'stars',buildings:[...buildings.slice(0,3),{steps:19999}],preview:true}),false);
 assert.equal(walkUnlocked({region:'stars',total:80000,townStart:0,album:[]},80000),true);assert.equal(walkUnlocked({region:'stars',total:79999,townStart:0,album:[]},80000),false);assert.equal(walkUnlocked({region:'grove',total:0,townStart:0,album:[{region:'stars'}]},100000),true);
});
