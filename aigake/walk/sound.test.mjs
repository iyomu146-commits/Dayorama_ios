import test from 'node:test';
import assert from 'node:assert/strict';
import {createConstructionSound,createTownAudio,soundPreferences,SOUND_KEY} from './sound.mjs';
import {synthEffect,synthAmbience,ambientScene} from './sound-synthesis.mjs';

const plan={buildings:[{id:'house',start:0,end:.5,bp:{counts:[100,100,100,100]}},{id:'shop',start:.5,end:1,bp:{counts:[100,100,100,100]}}]};
test('sound follows newly placed voxels, with a bounded tap rate and one fanfare per completion',()=>{
 const tracker=createConstructionSound();let taps=0,complete=[];
 for(let t=0;t<=2000;t+=10){const e=tracker.update(plan,t/2000,null,true,t);taps+=Number(e.tap);complete.push(...e.completed);}
 assert.ok(taps>5&&taps<=15);assert.deepEqual(complete,['house','shop']);
 assert.deepEqual(tracker.update(plan,1,null,true,3000),{tap:false,completed:[]});
});
test('restores, skips, seeks, backwards motion and changes of town are silent',()=>{
 const t=createConstructionSound(),quiet={tap:false,completed:[]};
 assert.deepEqual(t.update(plan,1,null,true,0),quiet);
 assert.deepEqual(t.update(plan,0,null,true,20),quiet);
 assert.deepEqual(t.update(plan,.8,null,false,40),quiet);
 assert.deepEqual(t.update(plan,.8,null,true,80),quiet);
 assert.deepEqual(t.update({...plan},1,null,true,100),quiet);
 t.update(plan,.2,null,false,120);assert.deepEqual(t.update(plan,1,null,false,140),quiet);
});
test('single-building timelapses ignore the completed buildings in their background',()=>{
 const t=createConstructionSound();let completed=[];
 for(let i=0;i<=10;i++)completed.push(...t.update(plan,1,{buildingId:'shop',buildingProgress:i/10},true,i*200).completed);
 assert.deepEqual(completed,['shop']);
 t.update(plan,1,{buildingId:'shop',buildingProgress:0},false,2500);
 assert.deepEqual(t.update(plan,1,{buildingId:'shop',buildingProgress:1},true,3000).completed,['shop']);
});
test('preferences recover from malformed storage and keep independent volume limits',()=>{
 for(const raw of ['{','null','false','42',null])assert.deepEqual(soundPreferences(raw),{enabled:true,effects:.45,ambience:.32});
 assert.deepEqual(soundPreferences({enabled:false,effects:4,ambience:-2}),{enabled:false,effects:1,ambience:0});
 assert.equal(soundPreferences({effects:NaN}).effects,.45);
});
test('all generated effects have headroom, smooth edges, and a usable signal',()=>{
 for(const kind of ['place','complete','bird','insect'])for(const variant of [0,1,2,3,4]){
  const {channels}=synthEffect(kind,variant);for(const data of channels){
   let peak=0,power=0;for(const v of data){assert.ok(Number.isFinite(v));peak=Math.max(peak,Math.abs(v));power+=v*v;}
   assert.ok(peak<=.481&&peak>.1,kind);assert.ok(Math.sqrt(power/data.length)>.008,kind);assert.ok(Math.abs(data[0])<1e-8);assert.ok(Math.abs(data.at(-1))<1e-8);
  }
 }
});
test('ambient loops have continuous seams, low DC and different stereo channels',()=>{
 for(const kind of ['wind','stream','sea','city']){
  const {channels}=synthAmbience(kind);assert.equal(channels.length,2);let difference=0;
  for(const data of channels){
   let mean=0,peak=0,diff=0;for(let i=0;i<data.length;i++){const v=data[i];assert.ok(Number.isFinite(v));mean+=v;peak=Math.max(peak,Math.abs(v));if(i)diff+=(v-data[i-1])**2;}
   assert.ok(Math.abs(mean/data.length)<1e-5);assert.ok(peak<.481);
   assert.ok(Math.abs(data[0]-data.at(-1))<Math.sqrt(diff/data.length)*5,kind+' loop seam');
  }
  for(let i=0;i<1000;i++)difference+=Math.abs(channels[0][i]-channels[1][i]);assert.ok(difference>1);
 }
});
test('regional ambience changes wildlife at night without adding summer insects to snow or Tokyo',()=>{
 assert.equal(ambientScene('grove',12).wildlife,'bird');assert.equal(ambientScene('grove',20).wildlife,'insect');
 assert.equal(ambientScene('harbor').water,'sea');assert.equal(ambientScene('canal').water,'stream');assert.equal(ambientScene('tokyo').bed,'city');
 for(const r of ['snow','tokyo'])for(const h of [6,12,20])assert.equal(ambientScene(r,h).wildlife,null);
});

// A small scheduling fake checks lifecycle behavior that is difficult to hear:
// no queued notes on resume, duplicate contexts, or unbounded rapid previews.
class AudioFake{
 constructor(){this.state='suspended';this.currentTime=0;this.destination={};this.sources=[];this.runningResumes=0;}
 param(value=0){return{value,cancelScheduledValues(){},setTargetAtTime(v){this.value=v;}};}
 node(){return{connect(){},disconnect(){}};}
 createGain(){return{...this.node(),gain:this.param()};}
 createDynamicsCompressor(){return{...this.node(),...Object.fromEntries(['threshold','knee','ratio','attack','release'].map(k=>[k,this.param()]))};}
 createBuffer(n,length,rate){return{copyToChannel(){},duration:length/rate};}
 createBufferSource(){const s={...this.node(),start:(at=0)=>{s.at=at;s.started=true;},stop:()=>{s.stopped=true;queueMicrotask(()=>{if(this.state==='running')s.onended?.();});}};this.sources.push(s);return s;}
 async resume(){this.state='running';this.runningResumes++;this.onstatechange?.();}
 async suspend(){this.state='suspended';this.onstatechange?.();}
 async close(){this.state='closed';this.onstatechange?.();}
}
test('audio starts on demand, honors mute, caps voices and discards scheduled sounds in the background',async()=>{
 const ctx=new AudioFake(),saved=new Map();let created=0;
 const audio=createTownAudio({storage:{getItem:k=>saved.get(k),setItem:(k,v)=>saved.set(k,v)},contextFactory:()=>{created++;return ctx;}});
 audio.tick('grove',12);await audio.resume();assert.equal(created,0,'foreground alone cannot create audio');
 await Promise.all([audio.unlock(),audio.unlock()]);assert.equal(created,1);assert.equal(audio.status().loops,2);
 await audio.preview('place');const old=ctx.sources.filter(s=>!s.loop);assert.equal(old.length,3);assert.ok(old[2].at>ctx.currentTime);
 audio.setActive(false);await Promise.resolve();assert.equal(audio.status().state,'suspended');assert.equal(audio.status().voices,0);assert.ok(old.every(s=>s.stopped));
 audio.setActive(true);await audio.resume();assert.equal(created,1);assert.equal(audio.status().voices,0);
 audio.configure({enabled:false});await Promise.resolve();const count=ctx.sources.length;await audio.preview('complete');assert.equal(ctx.sources.length,count);
 assert.equal(JSON.parse(saved.get(SOUND_KEY)).enabled,false);
 audio.configure({enabled:true});await audio.unlock();for(let i=0;i<30;i++){ctx.currentTime+=.15;audio.construction({tap:true,completed:[]});}
 assert.ok(audio.status().voices<=8);audio.dispose();await Promise.resolve();assert.equal(ctx.state,'closed');
});
test('a mute or background transition while resume is pending cannot start delayed audio',async()=>{
 const ctx=new AudioFake();let release;ctx.resume=()=>new Promise(resolve=>{release=()=>{ctx.state='running';resolve();};});
 const audio=createTownAudio({storage:null,contextFactory:()=>ctx});const pending=audio.unlock();audio.setActive(false);release();assert.equal(await pending,false);
 assert.equal(ctx.sources.length,0);assert.equal(ctx.state,'suspended');audio.dispose();
});
