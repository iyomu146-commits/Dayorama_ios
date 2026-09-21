import {countsAt} from '../experiments/voxel-walk-lab-20260909/model.mjs';
import {synthEffect,synthAmbience,ambientScene} from './sound-synthesis.mjs';

const clamp=x=>Math.max(0,Math.min(1,x));
export const SOUND_KEY='dayorama-sound-v1';
export function soundPreferences(raw){
 let p={};try{p=typeof raw==='string'?JSON.parse(raw):raw||{};}catch{}p=p||{};
 const volume=(v,fallback)=>typeof v==='number'&&Number.isFinite(v)?clamp(v):fallback;
 return{enabled:typeof p.enabled==='boolean'?p.enabled:true,effects:volume(p.effects,.45),ambience:volume(p.ambience,.32)};
}

// Observe only the visible construction, never the step ledger. Silent updates
// establish a new baseline for restores, seeks, skips and widget snapshots.
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

export function createTownAudio({storage=globalThis.localStorage,contextFactory=()=>new (globalThis.AudioContext||globalThis.webkitAudioContext)({latencyHint:'interactive'}),onChange=()=>{}}={}){
 let raw;try{raw=storage?.getItem(SOUND_KEY);}catch{}
 let preferences=soundPreferences(raw),context=null,master,effects,ambient,limiter,opening=null,active=true,disposed=false;
 let scene={region:'grove',hour:12},sceneSignature='',sequence=0,lastTap=-Infinity,lastFanfare=-Infinity,nextWildlife=0,duckUntil=0;
 const buffers=new Map(),voices=new Set(),loops=new Map(),ambientVoices=new Set();
 const status=()=>({preferences:{...preferences},state:context?.state||'locked',active,voices:voices.size,loops:loops.size});
 const emit=()=>onChange(status());
 function gainTo(param,value,seconds=.15){const t=context.currentTime;param.cancelScheduledValues(t);param.setTargetAtTime(value,t,Math.max(.008,seconds/3));}
 function ready(){return !disposed&&active&&preferences.enabled&&context?.state==='running';}
 function buffer(kind,loop=false,variant=0){
  const key=(loop?'loop:':'effect:')+kind+':'+variant;
  if(!buffers.has(key)){
   const pcm=loop?synthAmbience(kind):synthEffect(kind,variant),b=context.createBuffer(pcm.channels.length,pcm.channels[0].length,pcm.sampleRate);
   pcm.channels.forEach((data,i)=>b.copyToChannel(data,i));buffers.set(key,b);
  }return buffers.get(key);
 }
 function stopVoice(v,fade=.035){
  if(v.stopping)return;v.stopping=true;gainTo(v.gain.gain,0,fade);try{v.source.stop(context.currentTime+fade);}catch{}
 }
 function stopEffects(){for(const v of voices)stopVoice(v);lastTap=-Infinity;lastFanfare=-Infinity;duckUntil=0;if(context)gainTo(ambient.gain,preferences.ambience);}
 function silence(){
  // Suspended contexts may defer onended until resume. Disconnect immediately
  // so neither a scheduled tap nor a fading regional bed survives a pause.
  for(const v of [...voices,...ambientVoices]){v.source.onended=null;try{v.source.stop();}catch{}v.source.disconnect();v.gain.disconnect();}
  voices.clear();ambientVoices.clear();
  loops.clear();sceneSignature='';nextWildlife=0;lastTap=-Infinity;lastFanfare=-Infinity;duckUntil=0;
 }
 function oneShot(kind,{variant=0,volume=1,delay=0,environment=false}={}){
  if(!ready()||(environment?preferences.ambience:preferences.effects)===0)return;
  // Includes fading nodes; repeated preview taps cannot accumulate sources.
  if(voices.size>=8)return;
  const source=context.createBufferSource(),gain=context.createGain();source.buffer=buffer(kind,false,variant);gain.gain.value=volume;source.connect(gain);gain.connect(environment?ambient:effects);
  const v={source,gain};voices.add(v);source.onended=()=>{voices.delete(v);source.disconnect();gain.disconnect();};source.start(context.currentTime+delay);return v;
 }
 function applyScene(){
  if(!ready())return;
  const p=ambientScene(scene.region,scene.hour),signature=JSON.stringify(p);
  if(signature===sceneSignature)return;sceneSignature=signature;nextWildlife=context.currentTime+7;
  const desired=new Map([[p.bed,.65*p.level]]);if(p.water)desired.set(p.water,p.waterGain*p.level);
  for(const [kind,v]of loops)if(!desired.has(kind)){stopVoice(v,.8);loops.delete(kind);}
  for(const [kind,volume]of desired){
   if(!loops.has(kind)){
    const source=context.createBufferSource(),gain=context.createGain();source.buffer=buffer(kind,true);source.loop=true;gain.gain.value=0;source.connect(gain);gain.connect(ambient);
    const v={source,gain};ambientVoices.add(v);source.onended=()=>{ambientVoices.delete(v);source.disconnect();gain.disconnect();};loops.set(kind,v);source.start();
   }gainTo(loops.get(kind).gain.gain,volume,1.5);
  }
 }
 function levels(){
  if(!context)return;gainTo(master.gain,ready()?.8:0);gainTo(effects.gain,preferences.effects);gainTo(ambient.gain,preferences.ambience);
 }
 async function unlock(){
  if(disposed||!active||!preferences.enabled)return false;
  if(opening)return opening;
  try{
   if(!context){
    context=contextFactory();master=context.createGain();effects=context.createGain();ambient=context.createGain();limiter=context.createDynamicsCompressor();
    master.gain.value=0;effects.gain.value=preferences.effects;ambient.gain.value=preferences.ambience;
    limiter.threshold.value=-9;limiter.knee.value=12;limiter.ratio.value=4;limiter.attack.value=.004;limiter.release.value=.18;
    effects.connect(master);ambient.connect(master);master.connect(limiter);limiter.connect(context.destination);
    context.onstatechange=()=>{if(!disposed){if(context.state!=='running')silence();levels();emit();}};
   }
   // Called synchronously from a trusted gesture; don't defer resume past it.
   opening=Promise.resolve(context.resume());await opening;
   if(!ready()){silence();if(context.state==='running')await context.suspend();return false;}
   levels();applyScene();emit();return true;
  }catch{emit();return false;}finally{opening=null;}
 }
 function configure(patch){
  preferences=soundPreferences({...preferences,...patch});try{storage?.setItem(SOUND_KEY,JSON.stringify(preferences));}catch{}
  if(!preferences.enabled){silence();if(context)gainTo(master.gain,0,.04);}else{levels();applyScene();}
  if(preferences.effects===0)stopEffects();emit();return{...preferences};
 }
 function construction(event){
  if(!ready())return;const t=context.currentTime;
  if(event.completed.length&&t-lastFanfare>.45){
   for(const v of voices)if(!v.environment)stopVoice(v);
   lastFanfare=t;duckUntil=t+2.4;oneShot('complete');gainTo(ambient.gain,preferences.ambience*.65,.18);
  }else if(event.tap&&t-lastTap>=.135&&t-lastFanfare>1.3){lastTap=t;oneShot('place',{variant:sequence++%5,volume:.7});}
 }
 function setActive(value){
  active=!!value&&!disposed;
  if(!active){silence();if(context){gainTo(master.gain,0,.025);context.suspend().catch(()=>{});}}
  emit();
 }
 function tick(region,hour){
  scene={region,hour};if(!ready())return;applyScene();const t=context.currentTime;
  if(duckUntil&&t>=duckUntil){duckUntil=0;gainTo(ambient.gain,preferences.ambience,.5);}
  if(t>=nextWildlife){
   nextWildlife=t+18+(sequence++%5)*3;const kind=ambientScene(region,hour).wildlife;
   if(kind&&preferences.ambience>0){const v=oneShot(kind,{environment:true,volume:kind==='bird'?.4:.5});if(v)v.environment=true;}
  }
 }
 async function preview(kind){
  const unlocked=await unlock();if(!unlocked)return false;stopEffects();
  if(kind==='complete')construction({tap:false,completed:['preview']});
  else for(let i=0;i<3;i++)oneShot('place',{variant:i,delay:i*.24,volume:.7});
  return true;
 }
 function dispose(){disposed=true;silence();if(context){context.onstatechange=null;context.close().catch(()=>{});}buffers.clear();}
 return{unlock,resume:()=>context?unlock():Promise.resolve(false),configure,construction,setActive,tick,preview,stopEffects,dispose,status};
}
