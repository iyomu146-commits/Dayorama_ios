import {createTownWorld} from '../experiments/voxel-walk-lab-20260909/art-direction-20260915/town-world.mjs';
import {makeTown} from '../experiments/voxel-walk-lab-20260909/art-direction-20260915/town-plan.mjs';
import {STEPS_PER_BUILDING,completionStep,prepareConstruction,constructionPlan} from './construction.mjs';
import {BY_ID} from '../experiments/voxel-walk-lab-20260909/content/catalog.mjs';
import {dayKey,shiftDay,daysEnding,initialState,restore,connectStepSource,applySnapshot,townSteps,pendingRecap,acknowledge,recordCompletions,nextTown,demoState} from './state.mjs';
import {platform,requestHealth,readHealth,healthErrorMessage,isHealthSigningError} from './health.mjs';
import {replayTowns,replayTownPlan,replayClips,replayFrame,advanceTimelapse} from './timelapse.mjs';
import {widgetSnapshot,widgetSignature,publishWidget} from './widget.mjs';
import {createStargazing} from '../experiments/voxel-walk-lab-20260909/stargazing/game.mjs';
import {walkUnlocked} from '../experiments/voxel-walk-lab-20260909/stargazing/model.mjs';
import {walkMode,createDebugState,addDebugSteps,debugStepsToFinish,resetDebugState} from './debug.mjs';
import {recapPlayback,advanceRecap} from './recap-playback.mjs';
import {createTownAudio,createConstructionSound} from './sound.mjs';
const $=id=>document.getElementById(id),format=n=>Math.round(n).toLocaleString('ja-JP'),params=new URLSearchParams(location.search);
const native=platform()==='ios',mode=walkMode({native,buildDebug:document.querySelector('meta[name="komorebi-debug-tools"]')?.content==='1',hostname:location.hostname,search:location.search});
const {debugTools,debug,demo,simulated,key}=mode,reduced=matchMedia('(prefers-reduced-motion: reduce)');
let state,world,profiles,plan,tab='town',period=7,selectedDay=dayKey(),animation=null,visualTotal=0,busy=false,lastFrame=0,lastUI=0,noticeTimer,statusNote='',storageFailed=false;
let timelapse=null,playerLastFrame=null,syncStage='',syncError=false,motionOffered=false,completionNoticeTimer;
const townAudio=createTownAudio({onChange:updateSoundUI}),constructionSound=createConstructionSound();
let soundHour=null,lastSoundTick=0;
function updateSoundUI({preferences,state:audioState,active,music,assetErrors}=townAudio.status()){
 const playing=preferences.enabled&&active&&audioState==='running';
 $('sound-toggle').setAttribute('aria-label',playing?'音を消す':'音を再生');$('sound-toggle').setAttribute('aria-pressed',String(playing));
 $('sound-enabled').checked=preferences.enabled;
 for(const kind of ['effects','bgm','ui']){$('sound-'+kind).value=Math.round(preferences[kind]*100);$('sound-'+kind+'-value').textContent=Math.round(preferences[kind]*100)+'%';}
 $('sound-music-period').textContent=music==='night'?'夜':'昼';
 $('sound-error').hidden=!assetErrors.length;$('sound-error').textContent=assetErrors.length?'一部の音を読み込めませんでした':'';
}
function soundScene(){const d=new Date();townAudio.tick(timelapse?.town.region||state.region,soundHour??d.getHours()+d.getMinutes()/60);}
function audibleConstruction(currentPlan,progress,focus,audible){townAudio.construction(constructionSound.update(currentPlan,progress,focus,audible,performance.now()));}
const stepSourceName=()=>state.stepSource==='pedometer'?'iPhoneの歩数':'ヘルスケア';
const motionNote='iPhone本体の歩数を使います。Apple Watchは含まず、履歴の取得は直近7日分です。';
const stargazing=createStargazing({unlocked:()=>walkUnlocked(state,plan?.walkBudget),storageKey:mode.starbookKey,onClose:()=>{townAudio.setActive(!document.hidden);soundScene();townAudio.resume();if(tab==='town')startRecap();}});
const sceneHome=$('world').parentElement,replayPlans=new Map();
$('scene-message').setAttribute('role','status');
let widgetTimer,widgetPublishing=false,lastWidgetSignature='';
function queueWidget(){
 if(!native||simulated)return;clearTimeout(widgetTimer);widgetTimer=setTimeout(updateWidget,600);
}
async function updateWidget(){
 if(simulated||!world||!plan||timelapse||document.hidden||storageFailed)return;
 if(widgetPublishing){queueWidget();return;}
 const snapshot=widgetSnapshot(state,plan),signature=widgetSignature(snapshot,state.seed)+':'+Math.floor(Date.now()/1800000);
 if(signature===lastWidgetSignature)return;
 widgetPublishing=true;
 try{
  const b=plan.buildings.find(b=>townSteps(state)<completionStep(b,plan.walkBudget));
  const images=world.widgetSnapshots(progressAt(state.total),b?.id);
  await publishWidget(snapshot,images);lastWidgetSignature=signature;
 }catch(e){console.warn('Widget update failed:',e.message);}
 finally{widgetPublishing=false;}
}
function notice(message){$('notice').textContent=message;$('notice').hidden=false;clearTimeout(noticeTimer);noticeTimer=setTimeout(()=>$('notice').hidden=true,5000);}
function persist(next){try{localStorage.setItem(key,JSON.stringify(next));state=next;return true;}catch{storageFailed=true;notice('保存できませんでした。空き容量を確認してください');return false;}}
function label(b){return b.name||BY_ID[b.kind]?.name||'建物';}
function currentProfile(){return profiles.find(p=>p.id===state.region)||profiles[0];}
function progressAt(total){return Math.max(0,Math.min(1,(total-state.townStart)/plan.walkBudget));}
function setVisual(total,celebrate=false,audible=false){visualTotal=total;const progress=progressAt(total);world.setProgress(progress,null,{celebrate});audibleConstruction(plan,progress,null,audible);}
function showCompletionMessage(buildings){
 if(!buildings.length)return;clearTimeout(completionNoticeTimer);
 const message=$('scene-message');message.textContent=buildings.length===1?label(buildings[0])+'が完成':buildings.length+'棟が完成';message.hidden=false;
 completionNoticeTimer=setTimeout(()=>message.hidden=true,2800);
}
function completionEvents(){const next=recordCompletions(state,plan.buildings,plan.walkBudget);if(next.events.length!==state.events.length)persist(next);}
function buildWorld(){
 townAudio.stopEffects();
 const base=makeTown(currentProfile(),state.seed),next=prepareConstruction(state,base);
 if(next!==state&&!persist(next))throw Error('建築予定を保存できません');
 plan=world.build(currentProfile(),state.seed,{townPlan:constructionPlan(base,state.construction)});world.setLook(2);world.setColor(1);world.setMotion(state.motion&&!reduced.matches);setVisual(Math.max(state.townStart,state.seen));world.view('home');completionEvents();
 $('scene-loading').hidden=true;$('town-name').textContent=currentProfile().name;$('setting-region').textContent=currentProfile().name;
 soundScene();queueWidget();
}
function updateTown(){
 if(timelapse)return;
 const today=state.records[dayKey()];$('today-date').textContent=new Intl.DateTimeFormat('ja-JP',{month:'long',day:'numeric',weekday:'short'}).format(new Date());$('today-steps').textContent=today?format(today.steps):'—';
 const s=world.stats(),done=s.buildings.filter(b=>b.progress===1).length,b=s.buildings.find(b=>b.progress>0&&b.progress<1)||s.buildings.find(b=>b.progress<1),target=b&&plan.buildings.find(p=>p.id===b.id);
 $('town-count').textContent=done+' / '+s.buildings.length+' 棟';$('build-name').textContent=b?label(b):'町が完成しました';$('build-phase').textContent=b?['基礎','骨組み','壁・屋根','仕上げ'][b.progress<.14?0:b.progress<.39?1:b.progress<.86?2:3]:'';$('build-progress').value=b?.progress??1;
 $('remaining').textContent=target?'完成まで '+format(Math.max(0,completionStep(target,plan.walkBudget)-(visualTotal-state.townStart)))+'歩':townSteps(state)>plan.walkBudget?'次の町へ '+format(townSteps(state)-plan.walkBudget)+'歩':'全ての建物が完成';
 $('next-town').hidden=townSteps(state)<plan.walkBudget||!!animation;$('replay').hidden=!state.recap||!!animation;
 $('connect-prompt').hidden=state.permissionRequested||simulated;$('preview-link').hidden=native;
 $('source-label').textContent=debug?'デバッグ':demo?'プレビュー':state.lastSync?stepSourceName():'';$('sync').disabled=busy||debug||(!native&&!demo);
 $('debug-town-tools').hidden=!debug;
 $('open-stargazing').hidden=!walkUnlocked(state,plan.walkBudget);$('stars-locked').hidden=state.region!=='stars'||walkUnlocked(state,plan.walkBudget);
}
function updateConnection(){
 const loading=syncStage==='permission'?'連携を確認中…':'歩数を読み込み中…';
 document.querySelectorAll('[data-connect]').forEach(b=>{b.disabled=busy||simulated||(b.id==='health-connect'&&!native);b.textContent=busy?loading:state.permissionRequested?'連携を確認':'歩数を連携';b.setAttribute('aria-busy',String(busy));});
 $('connection-message').hidden=!busy&&!syncError;$('connection-message').textContent=busy?loading:syncError?statusNote:'';
 $('motion-fallback').hidden=simulated||!native||!motionOffered||state.stepSource==='pedometer';$('motion-connect').disabled=busy||simulated;
 $('switch-step-source').hidden=simulated||!native;$('switch-step-source').disabled=busy||simulated;$('switch-step-source').textContent=state.stepSource==='pedometer'?'ヘルスケアを使う':'iPhoneの歩数を使う';
 $('debug-mode-toggle').disabled=busy;
}
function renderRecords(){
 const days=daysEnding(dayKey(),period),known=days.filter(d=>state.records[d]),total=known.reduce((sum,d)=>sum+state.records[d].steps,0),max=Math.max(1,...known.map(d=>state.records[d].steps));
 $('record-period').textContent=days[0].slice(5).replace('-',' / ')+' — '+days.at(-1).slice(5).replace('-',' / ');$('record-total').textContent=known.length?format(total):'—';$('record-average').textContent=known.length?'1日平均 '+format(total/known.length)+'歩 · '+known.length+'日分':'歩数を連携すると記録が表示されます';
 $('chart').classList.toggle('month',period===30);$('chart').replaceChildren(...days.map((day,i)=>{const record=state.records[day],b=document.createElement('button'),bar=document.createElement('span'),text=document.createElement('span');bar.className='bar';bar.style.height=(record?Math.max(2,record.steps/max*128):2)+'px';text.textContent=period===7?['日','月','火','水','木','金','土'][new Date(day+'T12:00:00').getDay()]:i%5===0||i===days.length-1?String(Number(day.slice(-2))):'';b.dataset.missing=String(!record);b.setAttribute('aria-label',day+' '+(record?format(record.steps)+'歩':'データなし'));b.setAttribute('aria-pressed',String(day===selectedDay));b.append(bar,text);b.onclick=()=>{selectedDay=day;renderRecords();};return b;}));
 const selected=state.records[selectedDay];$('selected-day').textContent=selectedDay.slice(5).replace('-',' / ')+'　'+(selected?format(selected.steps)+'歩':'データなし');
 const events=state.events.filter(e=>e.day>=days[0]&&e.day<=days.at(-1)).sort((a,b)=>b.day.localeCompare(a.day));$('journal-count').textContent=events.length+' 棟';$('records-empty').hidden=events.length>0;
 $('journal').replaceChildren(...events.map(e=>{const li=document.createElement('li'),date=document.createElement('time'),text=document.createElement('div'),name=document.createElement('strong'),region=document.createElement('small'),play=document.createElement('button');date.dateTime=e.day;date.textContent=e.day.slice(5).replace('-','/');const title=e.name||BY_ID[e.kind]?.name||'建物';name.textContent=title+'が完成';region.textContent=profiles.find(p=>p.id===e.region)?.name||'';text.append(name,region);play.className='text-button journal-replay';play.textContent='再生';play.setAttribute('aria-label',title+'のタイムラプス');play.onclick=()=>playCompletedEvent(e);li.append(date,text,play);return li;}));
}
function updateSettings(){
 $('health-settings').hidden=debug;
 $('health-source').textContent=stepSourceName();
 $('health-status').textContent=demo?'サンプル':!native?'iPhoneアプリで利用':state.permissionRequested?state.lastDataSync?'同期済み':state.lastSync?'データなし':'連携設定済み':'未連携';
 $('health-note').textContent=demo?'実際の歩数には影響しません。':statusNote||(!native?'端末歩数の読み取りはiPhoneアプリで行います。':state.stepSource==='pedometer'?motionNote:'歩数のみ読み取ります。');
 $('step-source-note').hidden=!native||state.stepSource==='pedometer';$('step-source-note').textContent=motionNote;
 $('sync-time').textContent=state.lastSync?'最終同期 '+new Intl.DateTimeFormat('ja-JP',{month:'numeric',day:'numeric',hour:'2-digit',minute:'2-digit'}).format(new Date(state.lastSync)):'';
 $('motion').checked=state.motion;$('demo-tools').hidden=!demo;
 $('debug-settings').hidden=!debugTools;$('debug-mode-toggle').textContent=debug?'デバッグを終了':'デバッグを開始';$('debug-settings-open').hidden=!debug;
}
function ui(){if(!world)return;updateTown();if(tab==='records')renderRecords();if(tab==='settings')updateSettings();updateConnection();}
function selectTab(next){if(tab==='town'&&next!=='town')pauseRecap();tab=next;for(const id of ['town','records','settings'])$(id+'-page').hidden=id!==next;document.querySelectorAll('[data-tab]').forEach(b=>{if(b.dataset.tab===next)b.setAttribute('aria-current','page');else b.removeAttribute('aria-current');});window.scrollTo(0,0);ui();if(next==='town'){world.view('home');startRecap();}}
function finishRecap(){
 if(!animation)return;const {recap,replay,playback}=animation;if(!playback.done){world.clearCompletion();townAudio.stopEffects();}animation=null;setVisual(state.total);if(!replay)persist(acknowledge(state,recap));$('recap').hidden=true;ui();
 const done=plan.buildings.filter(b=>state.townStart+completionStep(b,plan.walkBudget)>recap.from&&state.townStart+completionStep(b,plan.walkBudget)<=recap.to);
 if(done.length>1||!playback.index)showCompletionMessage(done);queueWidget();
}
function startRecap(replay=false){
 if(tab!=='town'||animation||storageFailed||timelapse||stargazing.isOpen||$('timelapse-list-dialog').open||$('debug-dialog').open)return;
 const recap=replay?state.recap:pendingRecap(state);if(!recap){setVisual(state.total);return;}
 if(recap.to<=state.townStart)return;
 townAudio.stopEffects();clearTimeout(completionNoticeTimer);$('scene-message').hidden=true;world.clearCompletion();setVisual(Math.max(state.townStart,recap.from));
 animation={recap,replay,playback:recapPlayback(recap,plan,state.townStart),lastFrame:null};
 $('recap-steps').textContent='＋'+format(recap.to-recap.from)+'歩';$('recap-caption').textContent=replay?'前回の変化':'町に反映しています';$('recap').hidden=false;ui();
 if(reduced.matches)finishRecap();
}
function pauseRecap(){townAudio.stopEffects();if(!animation)return;if(!animation.replay)persist({...state,seen:Math.max(state.seen,Math.floor(visualTotal))});animation=null;world.clearCompletion();$('recap').hidden=true;queueWidget();}
async function synchronize(request=false,provider=state.stepSource){
 if(busy)return;
 if(simulated){startRecap();return;}
 if(!native){if(request)notice('歩数の連携はiPhoneアプリで利用できます');return;}
 if(!request&&!state.permissionRequested)return;
 busy=true;syncError=false;syncStage=request?'permission':'reading';statusNote=request?'歩数の連携を確認しています。':'歩数を読み込んでいます。';ui();
 try{
  if(request){await requestHealth(provider);if(!persist(connectStepSource(state,provider)))return;motionOffered=false;}
  syncStage='reading';statusNote='歩数を読み込んでいます。';ui();
  const rows=await readHealth(state);pauseRecap();const next=applySnapshot(state,rows);
  if(!persist(next))return;completionEvents();statusNote=rows.length?(state.stepSource==='pedometer'?motionNote:'歩数のみ読み取っています。'):(state.stepSource==='pedometer'?'新しい歩数を確認できません。iPhoneを持って歩いてから、もう一度同期してください。':'新しい歩数を確認できません。ヘルスケアの歩数と連携設定を確認してください。');
  if(tab==='town')startRecap();
 }catch(e){syncError=true;motionOffered=isHealthSigningError(e);statusNote=motionOffered?'このインストールではヘルスケアを利用できません。iPhoneの歩数計を使えます。':healthErrorMessage(e);notice(statusNote);}
 finally{busy=false;syncStage='';ui();queueWidget();}
}
function chooseRegion(){
 const canStart=townSteps(state)>=plan.walkBudget,canChange=state.total===state.townStart;
 $('region-title').textContent=canStart?'次の町':canChange?'地域を選ぶ':'建築中の町';
 $('region-list').replaceChildren(...profiles.map(p=>{const b=document.createElement('button'),name=document.createElement('span'),mark=document.createElement('small');name.textContent=p.name;mark.textContent=canStart||canChange?'1棟 '+format(STEPS_PER_BUILDING)+'歩':p.id===state.region?'建築中':'';b.disabled=!canStart&&!canChange;b.append(name,mark);b.onclick=()=>{pauseRecap();const next=canStart?nextTown(state,p.id,plan.walkBudget):{...state,region:p.id,construction:null};if(!persist(next))return;$('region-dialog').close();buildWorld();selectTab('town');};return b;}));$('region-dialog').showModal();
}
function getReplayPlan(town){
 if(town.current)return plan;
 const key=town.start+':'+town.region+':'+town.seed;
 if(!replayPlans.has(key)){const profile=profiles.find(p=>p.id===town.region);if(!profile)throw Error('地域を読み込めません');replayPlans.set(key,replayTownPlan(makeTown(profile,town.seed),town));}
 return replayPlans.get(key);
}
function showTimelapses(){
 pauseRecap();
 const sections=replayTowns(state).map(town=>{
  const replayPlan=getReplayPlan(town),clips=replayClips(town,replayPlan),section=document.createElement('section'),heading=document.createElement('h3');section.className='replay-town';heading.textContent=(profiles.find(p=>p.id===town.region)?.name||town.region)+(town.current?'':town.completed?' · '+town.completed.replaceAll('-',' / '):'');section.append(heading);
  function row(clip,preview=false){const b=document.createElement('button'),name=document.createElement('span'),detail=document.createElement('small');name.textContent=preview?'地区全体を試す':clip.kind==='town'?'地区全体':label(replayPlan.buildings.find(p=>p.id===clip.id));detail.textContent=preview?'プレビュー':clip.ready?'再生':'地区の完成後';b.disabled=!clip.ready&&!preview;b.append(name,detail);b.onclick=()=>openTimelapse(town,clip,preview);section.append(b);}
  row(clips[0]);clips.slice(1).filter(c=>c.ready).forEach(c=>row(c));
  if(demo&&town.current&&!clips[0].ready)row(clips[0],true);
  return section;
 });$('timelapse-list').replaceChildren(...sections);$('timelapse-list-dialog').showModal();
}
function playCompletedEvent(event){
 const town=replayTowns(state).find(t=>event.id.startsWith(t.start+':'+t.region+':'));
 if(!town){notice('建築の記録を読み込めません');return;}
 const clip=replayClips(town,getReplayPlan(town)).find(c=>c.kind==='building'&&event.id===town.start+':'+town.region+':'+c.id);
 if(clip?.ready)openTimelapse(town,clip);else notice('建築の記録を読み込めません');
}
function openTimelapse(town,clip,preview=false){
 if(!clip.ready&&!(demo&&preview))return;
 pauseRecap();const replayPlan=getReplayPlan(town),profile=profiles.find(p=>p.id===town.region);
 timelapse={town,clip,plan:replayPlan,position:0,playing:!reduced.matches,speed:1};playerLastFrame=null;
 $('timelapse-region').textContent=profile.name+(preview?' · プレビュー':'');$('timelapse-title').textContent=clip.kind==='town'?'地区全体':label(replayPlan.buildings.find(b=>b.id===clip.id));
 if($('timelapse-list-dialog').open)$('timelapse-list-dialog').close();
 $('timelapse-dialog').showModal();$('timelapse-scene').append($('world'));
 if(!town.current)world.build(profile,town.seed,{townPlan:replayPlan});
 world.setShowcase(clip.kind==='building'?clip.id:null);world.setMotion(state.motion&&!reduced.matches);drawTimelapse();soundScene();
}
function drawTimelapse(celebrate=false){
 if(!timelapse)return;if(!celebrate)townAudio.stopEffects();const f=replayFrame(timelapse.clip,timelapse.plan,timelapse.position);world.setProgress(f.progress,f.focus,{celebrate});audibleConstruction(timelapse.plan,f.progress,f.focus,celebrate);
 $('timelapse-phase').textContent=f.phase;$('timelapse-seek').value=Math.round(timelapse.position*1000);$('timelapse-seek').setAttribute('aria-valuetext',Math.round(timelapse.position*100)+'% · '+f.phase);
 const time=ms=>Math.floor(ms/60000)+':'+String(Math.floor(ms/1000)%60).padStart(2,'0');$('timelapse-time').textContent=time(timelapse.position*timelapse.clip.duration)+' / '+time(timelapse.clip.duration);
 $('timelapse-toggle').textContent=timelapse.position===1?'もう一度':timelapse.playing?'一時停止':'再生';
 document.querySelectorAll('[data-playback-speed]').forEach(b=>b.setAttribute('aria-pressed',String(Number(b.dataset.playbackSpeed)===timelapse.speed)));
}
function closeTimelapse(){
 if(!timelapse)return;townAudio.stopEffects();const archived=!timelapse.town.current;timelapse=null;playerLastFrame=null;
 sceneHome.prepend($('world'));if(archived)world.build(currentProfile(),state.seed,{townPlan:plan});else world.setShowcase(null);
 setVisual(Math.max(state.townStart,state.seen));world.setMotion(state.motion&&!reduced.matches);world.view('home');soundScene();ui();if(tab==='town')startRecap();queueWidget();
}
function toggleDebugMode(){
 if(!debugTools||busy)return;pauseRecap();const url=new URL(location.href);
 if(debug)url.searchParams.delete('debug');else url.searchParams.set('debug','1');
 location.href=url.href;
}
function openDebugControls(){
 if(!debug)return;pauseRecap();$('debug-total').textContent='今日 '+format(state.records[dayKey()]?.steps||0)+'歩 · 累計 '+format(state.total)+'歩';
 $('debug-time').querySelector('[value="laundry"]').disabled=!world.stats().domestic?.laundry;
 document.querySelectorAll('[data-debug-finish]').forEach(b=>{b.disabled=debugStepsToFinish(state,plan,b.dataset.debugFinish)===0;});
 $('debug-dialog').showModal();
}
function advanceDebug(amount){
 if(!debug)return;
 try{pauseRecap();const next=addDebugSteps(state,amount);if(!persist(next))return;completionEvents();$('debug-dialog').close();selectTab('town');}
 catch(e){notice(e.message);}
}
function resetDebugTown(){
 if(!debug)return;pauseRecap();if(!persist(resetDebugState(state)))return;replayPlans.clear();$('scene-message').hidden=true;buildWorld();$('debug-dialog').close();selectTab('town');
}
try{
 const raw=localStorage.getItem(key);
 if(raw)state=restore(raw,mode.source);
 else if(debug){const real=localStorage.getItem('komorebi-walk-health-v1');state=createDebugState(real?restore(real,'health'):null);}
 else state=demo?demoState():initialState();
 if(!persist(state))throw Error('この端末に記録を保存できません');
 profiles=(await fetch(new URL('../experiments/voxel-walk-lab-20260909/art-direction-20260915/profiles.json',import.meta.url)).then(r=>{if(!r.ok)throw Error('風景を読み込めません');return r.json();})).regions;
 world=createTownWorld($('world'));buildWorld();
 updateSoundUI();
 const unlockSound=e=>{if(!e.isTrusted||e.target.closest?.('#sound-toggle,#sound-enabled,[data-sound-preview]'))return;townAudio.unlock();};
 document.addEventListener('pointerdown',unlockSound,{passive:true});document.addEventListener('keydown',unlockSound);
 $('sound-toggle').onclick=()=>{const s=townAudio.status();if(s.preferences.enabled&&s.state==='running')townAudio.configure({enabled:false});else{townAudio.configure({enabled:true});soundScene();townAudio.unlock();}};
 $('sound-enabled').onchange=()=>{townAudio.configure({enabled:$('sound-enabled').checked});soundScene();townAudio.unlock();};
 for(const kind of ['effects','bgm','ui'])$('sound-'+kind).oninput=()=>{townAudio.configure({[kind]:Number($('sound-'+kind).value)/100});townAudio.unlock();};
 document.querySelectorAll('[data-sound-preview]').forEach(b=>b.onclick=async()=>{townAudio.configure({enabled:true});soundScene();if(!await townAudio.preview(b.dataset.soundPreview))notice('音を再生できませんでした。もう一度お試しください');});
 document.addEventListener('click',e=>{
  if(!e.isTrusted)return;const b=e.target.closest?.('button');
  if(!b||b.matches(':disabled')||b.closest('.sound-settings')||b.id==='sound-toggle'||b.getAttribute('aria-current')==='page'||b.getAttribute('aria-pressed')==='true')return;
  const back=b.hasAttribute('data-close')||b.id==='timelapse-close';
  townAudio.unlock().then(ok=>{if(ok)townAudio.interaction(back);});
 },true);
 document.addEventListener('change',e=>{if(e.isTrusted&&e.target.matches('select,input[type="checkbox"]')&&!e.target.closest('.sound-settings'))townAudio.interaction();});
 document.querySelectorAll('[data-tab]').forEach(b=>b.onclick=()=>selectTab(b.dataset.tab));$('open-records').onclick=()=>selectTab('records');$('home-view').onclick=()=>world.view('home');$('sync').onclick=()=>synchronize();
 document.querySelectorAll('[data-connect]').forEach(b=>b.onclick=()=>synchronize(true));$('preview-link').onclick=()=>{const u=new URL(location.href);u.searchParams.set('demo','1');location.href=u;};
 $('motion-connect').onclick=()=>synchronize(true,'pedometer');$('switch-step-source').onclick=()=>synchronize(true,state.stepSource==='pedometer'?'healthkit':'pedometer');
 $('debug-mode-toggle').onclick=toggleDebugMode;$('debug-open').onclick=openDebugControls;$('debug-settings-open').onclick=openDebugControls;
 document.querySelectorAll('[data-debug-add]').forEach(b=>b.onclick=()=>advanceDebug(Number(b.dataset.debugAdd)));
 document.querySelectorAll('[data-debug-finish]').forEach(b=>b.onclick=()=>advanceDebug(debugStepsToFinish(state,plan,b.dataset.debugFinish)));
 $('debug-add-form').onsubmit=e=>{e.preventDefault();advanceDebug(Number($('debug-amount').value));};$('debug-reset').onclick=resetDebugTown;
 $('debug-time').onchange=()=>{const v=$('debug-time').value;soundHour=v==='auto'?null:v==='laundry'?17:Number(v);world.setTime(soundHour,{laundry:v==='laundry'});soundScene();world.view(v==='laundry'?'laundry':'home');$('debug-dialog').close();};
 $('debug-dialog').addEventListener('close',()=>{if(tab==='town')startRecap();});
 $('replay').onclick=()=>startRecap(true);$('skip').onclick=finishRecap;$('next-town').onclick=chooseRegion;$('choose-region').onclick=chooseRegion;
 $('open-timelapses').onclick=showTimelapses;$('timelapse-close').onclick=()=>$('timelapse-dialog').close();$('timelapse-dialog').addEventListener('close',closeTimelapse);
 $('open-stargazing').onclick=()=>{pauseRecap();stargazing.open();if(stargazing.isOpen)townAudio.setActive(false);};
 $('timelapse-list-dialog').addEventListener('close',()=>{if(!timelapse&&tab==='town')startRecap();});
 $('timelapse-toggle').onclick=()=>{if(!timelapse)return;if(timelapse.position===1)timelapse.position=0;timelapse.playing=!timelapse.playing;playerLastFrame=null;drawTimelapse();};
 $('timelapse-seek').oninput=()=>{if(!timelapse)return;timelapse.position=Number($('timelapse-seek').value)/1000;timelapse.playing=false;playerLastFrame=null;drawTimelapse();};
 document.querySelectorAll('[data-playback-speed]').forEach(b=>b.onclick=()=>{if(timelapse){timelapse.speed=Number(b.dataset.playbackSpeed);playerLastFrame=null;drawTimelapse();}});
 $('privacy-open').onclick=()=>$('privacy-dialog').showModal();document.querySelectorAll('[data-close]').forEach(b=>b.onclick=()=>$(b.dataset.close).close());
 $('motion').onchange=()=>{if(persist({...state,motion:$('motion').checked}))world.setMotion(state.motion&&!reduced.matches);};
 document.querySelectorAll('[data-period]').forEach(b=>b.onclick=()=>{period=Number(b.dataset.period);document.querySelectorAll('[data-period]').forEach(q=>q.setAttribute('aria-pressed',String(q===b)));renderRecords();});
 $('demo-return').onclick=()=>{pauseRecap();const today=dayKey();if(persist(applySnapshot(state,[{day:today,steps:(state.records[today]?.steps||0)+2400}]))){completionEvents();selectTab('town');}};
 document.addEventListener('visibilitychange',()=>{playerLastFrame=null;if(document.hidden){pauseRecap();townAudio.setActive(false);if(timelapse){timelapse.playing=false;drawTimelapse();}}else{townAudio.setActive(!stargazing.isOpen);soundScene();townAudio.resume();selectedDay=dayKey();ui();synchronize().then(()=>startRecap());}});window.addEventListener('pagehide',()=>{pauseRecap();townAudio.setActive(false);});
 window.addEventListener('pageshow',()=>{townAudio.setActive(!document.hidden&&!stargazing.isOpen);townAudio.resume();});
 window.addEventListener('komorebi:pause',()=>{pauseRecap();townAudio.setActive(false);playerLastFrame=null;if(timelapse){timelapse.playing=false;drawTimelapse();}});
 // iOS also sends this on a foreground transition even when WebKit's document
 // visibility does not change. The in-flight guard prevents duplicate reads.
 window.addEventListener('komorebi:resume',()=>{townAudio.setActive(!document.hidden&&!stargazing.isOpen);soundScene();townAudio.resume();synchronize().then(()=>{startRecap();queueWidget();});});
 window.addEventListener('komorebi:town',()=>{document.querySelectorAll('dialog[open]').forEach(d=>d.close());selectTab('town');synchronize();});
 selectTab('town');synchronize();
 function frame(now){requestAnimationFrame(frame);if(!document.hidden&&!stargazing.isOpen&&now-lastSoundTick>1000){soundScene();lastSoundTick=now;}if(document.hidden||stargazing.isOpen||(!timelapse&&tab!=='town')||now-lastFrame<32)return;lastFrame=now;
  if(timelapse){const previousPosition=timelapse.position;timelapse=advanceTimelapse(timelapse,playerLastFrame===null?0:Math.min(250,now-playerLastFrame));playerLastFrame=now;if(timelapse.position!==previousPosition)drawTimelapse(true);world.render(now);return;}
  if(animation){const a=animation;a.playback=advanceRecap(a.playback,a.lastFrame===null?0:Math.min(100,now-a.lastFrame));a.lastFrame=now;setVisual(a.playback.value,a.playback.completed.length>0,true);showCompletionMessage(plan.buildings.filter(b=>a.playback.completed.includes(b.id)));if(a.playback.done)finishRecap();if(now-lastUI>150){updateTown();lastUI=now;}}
  world.render(now);
 }requestAnimationFrame(frame);
}catch(e){$('scene-loading').textContent=e.message||'読み込みに失敗しました';notice(e.message||'アプリを開き直してください');console.error(e);}
