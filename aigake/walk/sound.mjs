import {countsAt} from '../experiments/voxel-walk-lab-20260909/model.mjs';
import {synthUI} from './sound-synthesis.mjs';
import {SOUND_ASSETS,musicPeriod} from './sound-assets.mjs';
const clamp=x=>Math.max(0,Math.min(1,x));
export const SOUND_KEY='dayorama-sound-v1';
export function soundPreferences(raw){
 let p={};try{p=typeof raw==='string'?JSON.parse(raw):raw||{};}catch{}p=p||{};
 const volume=(v,fallback)=>typeof v==='number'&&Number.isFinite(v)?clamp(v):fallback;
 return{enabled:typeof p.enabled==='boolean'?p.enabled:true,effects:volume(p.effects,.45),bgm:volume(p.bgm,.32),ui:volume(p.ui,.32)};
}
// Silent updates establish the baseline for restores, seeks and skips.
export function createConstructionSound(){
 let previous=new Map(),identity=null,focusId=null,lastTap=-Infinity;
 return{update(plan,progress,focus=null,audible=false,now=0){
  const changed=plan!==identity||focusId!==(focus?.buildingId??null),next=new Map(),completed=[];let added=0;
  for(const b of plan.buildings){
   if(focus&&focus.buildingId!==b.id)continue;
   const p=focus?clamp(focus.buildingProgress):clamp((progress-b.start)/(b.end-b.start));
   const cells=countsAt(b.bp.counts,p*4800).reduce((a,b)=>a+b,0),old=previous.get(b.id);next.set(b.id,{p,cells});
   if(audible&&!changed&&old&&p>=old.p){added+=Math.max(0,cells-old.cells);if(old.p<1&&p===1)completed.push(b.id);}
  }
  previous=next;identity=plan;focusId=focus?.buildingId??null;
  if(!audible||changed){lastTap=-Infinity;return{tap:false,completed:[]};}
  const tap=!completed.length&&added>0&&now-lastTap>=140;if(tap)lastTap=now;
  return{tap,completed};
 }};
}
export function createTownAudio({storage=globalThis.localStorage,contextFactory=()=>new (globalThis.AudioContext||globalThis.webkitAudioContext)({latencyHint:'interactive'}),assets=SOUND_ASSETS,fetchAudio=url=>fetch(url),onChange=()=>{}}={}){
 let raw;try{raw=storage?.getItem(SOUND_KEY);}catch{}
 let preferences=soundPreferences(raw),context=null,master,effects,music,uiGain,limiter,opening=null,active=true,disposed=false;
 let sequence=0,lastTap=-Infinity,lastFanfare=-Infinity,lastUI=-Infinity,duckUntil=0,period='day',assetLoading=null;
 const recordings=new Map(),voices=new Set(),musicVoices=new Map(),offsets=new Map(),assetErrors=new Set();
 const status=()=>({preferences:{...preferences},state:context?.state||'locked',active,voices:voices.size,loops:musicVoices.size,music:period,loaded:[...recordings.keys()],assetErrors:[...assetErrors]});
 const emit=()=>onChange(status());
 const ready=()=>!disposed&&active&&preferences.enabled&&context?.state==='running';
 function gainTo(param,value,seconds=.15){const t=context.currentTime;param.cancelScheduledValues(t);param.setTargetAtTime(value,t,Math.max(.008,seconds/3));}
 function stopVoice(v,fade=.02){if(v.stopping)return;v.stopping=true;gainTo(v.gain.gain,0,fade);try{v.source.stop(context.currentTime+fade);}catch{}}
 function disconnect(v){v.source.onended=null;try{v.source.stop();}catch{}v.source.disconnect();v.gain.disconnect();}
 function stopEffects(){for(const v of voices)if(v.kind!=='ui')stopVoice(v);lastTap=-Infinity;lastFanfare=-Infinity;duckUntil=0;if(context)gainTo(music.gain,preferences.bgm);}
 function stopMusic(kind){
  const v=musicVoices.get(kind);if(!v)return;
  offsets.set(kind,(v.offset+Math.max(0,context.currentTime-v.started))%v.source.buffer.duration);musicVoices.delete(kind);disconnect(v);
 }
 function silence(){
  // Suspended contexts can defer onended. Keep only music positions, never
  // scheduled effects, so old taps cannot replay on returning to the app.
  for(const v of voices)disconnect(v);voices.clear();for(const kind of musicVoices.keys())stopMusic(kind);
  lastTap=-Infinity;lastFanfare=-Infinity;lastUI=-Infinity;duckUntil=0;
 }
 function oneShot(kind,{volume=1,delay=0,rate=1}={}){
  if(!ready()||!recordings.has(kind)||(kind==='ui'?preferences.ui:preferences.effects)===0||voices.size>=8)return;
  const source=context.createBufferSource(),gain=context.createGain();source.buffer=recordings.get(kind);source.playbackRate.value=rate;gain.gain.value=volume;source.connect(gain);gain.connect(kind==='ui'?uiGain:effects);
  const v={source,gain,kind};voices.add(v);source.onended=()=>{voices.delete(v);source.disconnect();gain.disconnect();};source.start(context.currentTime+delay);return v;
 }
 function loadAssets(){
  if(assetLoading)return assetLoading;
  if(!recordings.has('ui')){const pcm=synthUI(),b=context.createBuffer(1,pcm.channels[0].length,pcm.sampleRate);b.copyToChannel(pcm.channels[0],0);recordings.set('ui',b);}
  assetLoading=Promise.all(Object.entries(assets).filter(([kind])=>!recordings.has(kind)).map(async([kind,path])=>{
   try{
    const response=await fetchAudio(new URL(path,import.meta.url));if(!response.ok)throw Error('Audio unavailable');
    const data=await response.arrayBuffer();if(disposed)return;
    const decoded=await context.decodeAudioData(data);if(!decoded.duration)throw Error('Empty audio');
    if(!disposed){recordings.set(kind,decoded);assetErrors.delete(kind);applyMusic();emit();}
   }catch{if(!disposed){assetErrors.add(kind);emit();}}
  })).then(()=>{assetLoading=null;});return assetLoading;
 }
 function applyMusic(){
  if(!ready()||preferences.bgm===0){for(const kind of musicVoices.keys())stopMusic(kind);return;}
  if(!recordings.has(period))return;
  const t=context.currentTime;
  for(const [kind,v]of musicVoices){
   if(kind===period){if(v.retireAt){v.retireAt=null;gainTo(v.gain.gain,1,2);}}
   else if(!v.retireAt){v.retireAt=t+2.2;gainTo(v.gain.gain,0,2);}
  }
  if(musicVoices.has(period))return;
  const source=context.createBufferSource(),gain=context.createGain();source.buffer=recordings.get(period);source.loop=true;gain.gain.value=0;source.connect(gain);gain.connect(music);
  const offset=(offsets.get(period)||0)%source.buffer.duration;
  musicVoices.set(period,{source,gain,offset,started:t,retireAt:null});source.start(t,offset);gainTo(gain.gain,1,2);
 }
 function levels(){
  if(!context)return;gainTo(master.gain,ready()?.8:0);gainTo(effects.gain,preferences.effects);gainTo(uiGain.gain,preferences.ui);gainTo(music.gain,preferences.bgm*(duckUntil>context.currentTime?.45:1));
 }
 async function openContext(){
  try{
   if(!context){
    context=contextFactory();master=context.createGain();effects=context.createGain();music=context.createGain();uiGain=context.createGain();limiter=context.createDynamicsCompressor();
    master.gain.value=0;effects.gain.value=preferences.effects;music.gain.value=preferences.bgm;uiGain.gain.value=preferences.ui;
    limiter.threshold.value=-9;limiter.knee.value=12;limiter.ratio.value=4;limiter.attack.value=.004;limiter.release.value=.18;
    effects.connect(master);music.connect(master);uiGain.connect(master);master.connect(limiter);limiter.connect(context.destination);
    context.onstatechange=()=>{if(!disposed){if(context.state!=='running')silence();levels();emit();}};
   }
   await context.resume();
   if(!ready()){silence();if(context.state==='running')await context.suspend();return false;}
   levels();applyMusic();if(!recordings.has('ui'))loadAssets();emit();return true;
  }catch{emit();return false;}
 }
 function unlock(){
  if(disposed||!active||!preferences.enabled)return Promise.resolve(false);
  if(!opening)opening=openContext().finally(()=>{opening=null;});return opening;
 }
 function configure(patch){
  preferences=soundPreferences({...preferences,...patch});try{storage?.setItem(SOUND_KEY,JSON.stringify(preferences));}catch{}
  if(!preferences.enabled){silence();if(context)gainTo(master.gain,0,.04);}else{levels();applyMusic();}
  if(preferences.effects===0)stopEffects();if(preferences.ui===0)for(const v of voices)if(v.kind==='ui')stopVoice(v);emit();return{...preferences};
 }
 function construction(event){
  if(!ready())return;const t=context.currentTime;
  if(event.completed.length&&t-lastFanfare>.45){
   for(const v of voices)if(v.kind!=='ui')stopVoice(v);
   lastFanfare=t;const v=oneShot('complete');if(v){duckUntil=t+v.source.buffer.duration;gainTo(music.gain,preferences.bgm*.45,.18);}
  }else if(event.tap&&t-lastTap>=.135&&t-lastFanfare>1.1){lastTap=t;oneShot('place',{volume:[.78,.82,.8][sequence++%3]});}
 }
 function interaction(back=false){
  if(!ready()||context.currentTime-lastUI<.09)return;
  lastUI=context.currentTime;for(const v of voices)if(v.kind==='ui')stopVoice(v,.01);oneShot('ui',{volume:.65,rate:back?.9:1});
 }
 function setActive(value){
  active=!!value&&!disposed;
  if(!active){silence();if(context){gainTo(master.gain,0,.025);context.suspend().catch(()=>{});}}emit();
 }
 function tick(_region,hour){
  const next=musicPeriod(hour);if(next!==period){period=next;emit();}
  if(!ready())return;applyMusic();const t=context.currentTime;
  for(const [kind,v]of musicVoices)if(v.retireAt&&t>=v.retireAt)stopMusic(kind);
  if(duckUntil&&t>=duckUntil){duckUntil=0;gainTo(music.gain,preferences.bgm,.5);}
 }
 async function preview(kind){
  if(!await unlock())return false;
  if(kind==='ui'){interaction();return true;}
  if(assetLoading)await assetLoading;if(!recordings.has(kind)&&assetErrors.has(kind))await loadAssets();
  if(!ready()||!recordings.has(kind))return false;
  stopEffects();if(kind==='complete')construction({tap:false,completed:['preview']});
  else for(let i=0;i<3;i++)oneShot('place',{delay:i*.24,volume:.8});return true;
 }
 function dispose(){disposed=true;silence();if(context){context.onstatechange=null;context.close().catch(()=>{});}recordings.clear();}
 return{unlock,resume:()=>context?unlock():Promise.resolve(false),configure,construction,interaction,setActive,tick,preview,stopEffects,dispose,status,whenLoaded:()=>assetLoading||Promise.resolve()};
}
