import test from 'node:test';
import assert from 'node:assert/strict';
import {createConstructionSound,createTownAudio,soundPreferences,SOUND_KEY} from './sound.mjs';
import {synthUI} from './sound-synthesis.mjs';
import {musicPeriod} from './sound-assets.mjs';

const plan={buildings:[{id:'house',start:0,end:.5,bp:{counts:[100,100,100,100]}},{id:'shop',start:.5,end:1,bp:{counts:[100,100,100,100]}}]};
test('sound follows newly placed voxels, with a bounded tap rate and one fanfare per completion',()=>{
 const tracker=createConstructionSound();let taps=0,complete=[];
 for(let t=0;t<=2000;t+=10){const e=tracker.update(plan,t/2000,null,true,t);taps+=Number(e.tap);complete.push(...e.completed);}
 assert.ok(taps>5&&taps<=15);assert.deepEqual(complete,['house','shop']);
 assert.deepEqual(tracker.update(plan,1,null,true,3000),{tap:false,completed:[]});
});
test('restores, skips, seeks, backwards motion and changes of town are silent',()=>{
 const t=createConstructionSound(),quiet={tap:false,completed:[]};
 assert.deepEqual(t.update(plan,1,null,true,0),quiet);assert.deepEqual(t.update(plan,0,null,true,20),quiet);
 assert.deepEqual(t.update(plan,.8,null,false,40),quiet);assert.deepEqual(t.update(plan,.8,null,true,80),quiet);
 assert.deepEqual(t.update({...plan},1,null,true,100),quiet);
 t.update(plan,.2,null,false,120);assert.deepEqual(t.update(plan,1,null,false,140),quiet);
});
test('single-building timelapses ignore the completed buildings in their background',()=>{
 const t=createConstructionSound();let completed=[];
 for(let i=0;i<=10;i++)completed.push(...t.update(plan,1,{buildingId:'shop',buildingProgress:i/10},true,i*200).completed);
 assert.deepEqual(completed,['shop']);t.update(plan,1,{buildingId:'shop',buildingProgress:0},false,2500);
 assert.deepEqual(t.update(plan,1,{buildingId:'shop',buildingProgress:1},true,3000).completed,['shop']);
});
test('preferences recover from malformed storage and keep independent volume limits',()=>{
 for(const raw of ['{','null','false','42',null])assert.deepEqual(soundPreferences(raw),{enabled:true,effects:.45,bgm:.32,ui:.32});
 assert.deepEqual(soundPreferences({enabled:false,effects:4,bgm:-2,ui:.7}),{enabled:false,effects:1,bgm:0,ui:.7});
 assert.deepEqual(soundPreferences({enabled:false,effects:.6,ambience:.9}),{enabled:false,effects:.6,bgm:.32,ui:.32});
 assert.equal(soundPreferences({effects:NaN}).effects,.45);
});
test('original UI feedback is brief, unclipped, and has silent edges',()=>{
 const {sampleRate,channels:[data]}=synthUI();let peak=0,power=0;
 for(const v of data){assert.ok(Number.isFinite(v));peak=Math.max(peak,Math.abs(v));power+=v*v;}
 assert.ok(data.length/sampleRate<.15);assert.ok(peak<.3&&peak>.1);assert.ok(Math.sqrt(power/data.length)>.008);assert.equal(data[0],0);assert.equal(data.at(-1),0);
});
test('night starts exactly at 19:00 and ends at 07:00, across midnight',()=>{
 for(const h of [0,6+59/60,19,23+59/60,24])assert.equal(musicPeriod(h),'night');
 for(const h of [7,12,18+59/60])assert.equal(musicPeriod(h),'day');
});

// Retain source identities/routing to check continuity and lifecycle behavior.
class AudioFake{
 constructor(){this.state='suspended';this.currentTime=0;this.destination={};this.sources=[];}
 param(value=0){return{value,cancelScheduledValues(){},setTargetAtTime(v){this.value=v;}};}
 node(){return{connect(target){this.target=target;},disconnect(){this.disconnected=true;}};}
 createGain(){return{...this.node(),gain:this.param()};}
 createDynamicsCompressor(){return{...this.node(),...Object.fromEntries(['threshold','knee','ratio','attack','release'].map(k=>[k,this.param()]))};}
 createBuffer(n,length,rate){return{copyToChannel(){},duration:length/rate,kind:'ui'};}
 async decodeAudioData(data){return{kind:data.kind,duration:data.duration};}
 createBufferSource(){const s={...this.node(),playbackRate:this.param(1),start:(at=0,offset=0)=>{s.at=at;s.offset=offset;s.started=true;},stop:()=>{s.stopped=true;queueMicrotask(()=>{if(this.state==='running')s.onended?.();});}};this.sources.push(s);return s;}
 async resume(){this.state='running';this.onstatechange?.();}
 async suspend(){this.state='suspended';this.onstatechange?.();}
 async close(){this.state='closed';this.onstatechange?.();}
}
const assets={day:'day.wav',night:'night.wav',place:'place.wav',complete:'complete.wav'};
const fetchAudio=async url=>{const kind=url.pathname.split('/').at(-1).split('.')[0];return{ok:true,arrayBuffer:async()=>({kind,duration:{day:60,night:60,place:.155,complete:1.13}[kind]})};};
function fixture(options={}){const ctx=new AudioFake(),audio=createTownAudio({storage:null,contextFactory:()=>ctx,assets,fetchAudio,...options});return{ctx,audio};}
async function start(audio){await audio.unlock();await audio.whenLoaded();}
const liveMusic=ctx=>ctx.sources.filter(s=>s.loop&&!s.stopped);

test('audio starts on demand, honors mute, caps voices and discards scheduled sounds in the background',async()=>{
 const ctx=new AudioFake(),saved=new Map();let created=0;
 const audio=createTownAudio({assets,fetchAudio,storage:{getItem:k=>saved.get(k),setItem:(k,v)=>saved.set(k,v)},contextFactory:()=>{created++;return ctx;}});
 audio.tick('grove',12);await audio.resume();assert.equal(created,0,'foreground alone cannot create audio');
 await Promise.all([audio.unlock(),audio.unlock()]);await audio.whenLoaded();assert.equal(created,1);assert.equal(audio.status().loops,1);
 await audio.preview('place');const old=ctx.sources.filter(s=>!s.loop);assert.equal(old.length,3);assert.ok(old[2].at>ctx.currentTime);
 assert.ok(old.every(s=>s.buffer.kind==='place'&&s.playbackRate.value===1),'supplied poko is repeated without pitch changes');
 audio.setActive(false);await Promise.resolve();assert.equal(audio.status().state,'suspended');assert.equal(audio.status().voices,0);assert.ok(old.every(s=>s.stopped));
 audio.setActive(true);await audio.resume();assert.equal(created,1);assert.equal(audio.status().voices,0);
 audio.configure({enabled:false});await Promise.resolve();const count=ctx.sources.length;await audio.preview('complete');assert.equal(ctx.sources.length,count);
 assert.equal(JSON.parse(saved.get(SOUND_KEY)).enabled,false);
 audio.configure({enabled:true});await audio.unlock();for(let i=0;i<30;i++){ctx.currentTime+=.15;audio.construction({tap:true,completed:[]});}
 assert.ok(audio.status().voices<=8);audio.dispose();await Promise.resolve();assert.equal(ctx.state,'closed');
});
test('a background transition while resume is pending cannot start delayed audio',async()=>{
 const ctx=new AudioFake();let release;ctx.resume=()=>new Promise(resolve=>{release=()=>{ctx.state='running';resolve();};});
 const audio=createTownAudio({storage:null,contextFactory:()=>ctx,assets,fetchAudio});const pending=audio.unlock();audio.setActive(false);release();assert.equal(await pending,false);
 assert.equal(ctx.sources.length,0);assert.equal(ctx.state,'suspended');audio.dispose();
});
test('day and night crossfade without restarting on ordinary ticks or creating duplicate loops',async()=>{
 const {ctx,audio}=fixture();await start(audio);const day=liveMusic(ctx)[0];
 for(const region of ['grove','snow','tokyo']){ctx.currentTime++;audio.tick(region,18+59/60);}
 assert.deepEqual(liveMusic(ctx),[day]);
 ctx.currentTime=10;audio.tick('grove',19);assert.deepEqual(liveMusic(ctx).map(s=>s.buffer.kind),['day','night']);assert.equal(day.target.gain.value,0);
 for(let i=0;i<20;i++){ctx.currentTime+=.05;audio.tick('grove',i%2?19:12);assert.ok(liveMusic(ctx).length<=2);}
 ctx.currentTime=15;audio.tick('grove',19);assert.deepEqual(liveMusic(ctx).map(s=>s.buffer.kind),['night']);
 const night=liveMusic(ctx)[0];audio.tick('grove',0);assert.equal(liveMusic(ctx)[0],night);
 audio.tick('grove',7);ctx.currentTime+=3;audio.tick('grove',7);assert.deepEqual(liveMusic(ctx).map(s=>s.buffer.kind),['day']);audio.dispose();
});
test('background return keeps music position but observes a night boundary crossed while away',async()=>{
 const {ctx,audio}=fixture();await start(audio);ctx.currentTime=23;audio.setActive(false);await Promise.resolve();
 assert.equal(liveMusic(ctx).length,0);audio.setActive(true);await audio.resume();assert.equal(liveMusic(ctx)[0].offset,23);
 ctx.currentTime=28;audio.setActive(false);audio.tick('grove',20);audio.setActive(true);await audio.resume();
 assert.deepEqual(liveMusic(ctx).map(s=>s.buffer.kind),['night']);assert.equal(liveMusic(ctx)[0].offset,0);audio.dispose();
});
test('muting during loading cannot start delayed music or replay a missed completion',async()=>{
 const pending=[];const {ctx,audio}=fixture({fetchAudio:url=>new Promise(resolve=>pending.push(()=>fetchAudio(url).then(resolve)))});
 await audio.unlock();audio.construction({tap:false,completed:['house']});audio.configure({enabled:false});
 pending.forEach(release=>release());await audio.whenLoaded();assert.equal(ctx.sources.length,0);
 audio.configure({enabled:true});await audio.unlock();assert.equal(liveMusic(ctx).length,1);assert.equal(ctx.sources.filter(s=>!s.loop).length,0);audio.dispose();
});
test('music, construction and UI levels are independent and completion temporarily ducks only music',async()=>{
 const {ctx,audio}=fixture();await start(audio);const music=liveMusic(ctx)[0].target.target;
 audio.configure({effects:0,bgm:.6,ui:.4});audio.construction({tap:true,completed:[]});audio.interaction();
 const ui=ctx.sources.find(s=>s.buffer.kind==='ui');assert.ok(ui);assert.equal(ui.target.target.gain.value,.4);assert.equal(music.gain.value,.6);assert.equal(ctx.sources.filter(s=>s.buffer.kind==='place').length,0);
 audio.configure({effects:.5});ctx.currentTime=2;audio.construction({tap:false,completed:['house']});
 const completed=ctx.sources.find(s=>s.buffer.kind==='complete');assert.ok(completed);assert.equal(completed.target.target.gain.value,.5);assert.equal(music.gain.value,.6*.45);assert.equal(ui.target.target.gain.value,.4);
 ctx.currentTime=4;audio.tick('grove',12);assert.equal(music.gain.value,.6);
 audio.configure({bgm:0});assert.equal(liveMusic(ctx).length,0);ctx.currentTime+=1;audio.interaction();assert.equal(ctx.sources.at(-1).buffer.kind,'ui');audio.dispose();
});
test('failed recordings are reported, leave UI usable, and never fall back to environmental synthesis',async()=>{
 const {ctx,audio}=fixture({fetchAudio:async()=>({ok:false})});await start(audio);
 assert.deepEqual(audio.status().assetErrors.sort(),['complete','day','night','place']);assert.deepEqual(audio.status().loaded,['ui']);
 audio.interaction();assert.equal(ctx.sources[0].buffer.kind,'ui');assert.equal(await audio.preview('complete'),false);assert.equal(liveMusic(ctx).length,0);audio.dispose();
});
