import {PHASES,CELL} from './design.mjs';
import {createDensityView} from './density-render.mjs';
import {workbenchBounds} from './density-core.mjs';
const $=id=>document.getElementById(id),fmt=n=>Math.round(n).toLocaleString('ja-JP');
const worker=new Worker(new URL('./density-worker.mjs',import.meta.url),{type:'module'}),pending=new Map();
const initialMode=new URLSearchParams(location.search).get('mode');
let serial=0,busy=false,scope=['blank','district'].includes(initialMode)?initialMode:'building',factor=2,steps=20000,playing=false,playAt=0,playSteps=0,night=false,selection=[],latest,frameStats,measuring=null,results=[],lastStats=0,lastDraws=-1,animationAt=0,ready=false;
const view=createDensityView($('density-view'),{onPick:pick,onFrame:frame});
function lock(){const blocked=busy||!!measuring;for(const id of ['density','mesh-mode','camera','night','play','restart','steps','tool','color','brush','mirror','undo','apply','clear-selection','clear-work','export-work','import-work','measure','offset-x','offset-y','offset-z'])$(id).disabled=blocked;document.querySelectorAll('[data-scope],[data-steps]').forEach(b=>b.disabled=blocked);$('undo').disabled=blocked||!latest?.undo;$('clear-work').disabled=blocked||!latest?.completed.count;$('apply').disabled=blocked||selection.length!==2;$('cancel-measure').hidden=!measuring;$('measure').textContent=measuring?'測定中':'25秒測る';}
function syncScope(){
 const blank=scope==='blank';document.body.dataset.mode=scope;$('editor').hidden=scope==='district';$('construction').hidden=blank;$('measurement').hidden=blank;$('clear-work').hidden=!blank;$('blank-navigation').hidden=!blank;$('mesh-mode').parentElement.hidden=blank;$('night').hidden=blank;
 if(blank&&night){night=false;view.night(false);$('night').setAttribute('aria-pressed','false');}
 $('edit-title').textContent=blank?'ゼロから作る':'範囲で編集';$('edit-note').textContent=blank?'クリックで積む、ドラッグで回転。ピンチで拡大、2本指または右ドラッグで移動。粗さごとに作品を保持します。':'範囲編集は2点を選んで適用。「面に足す」は押した面に追加します。';
 document.querySelectorAll('[data-scope]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.scope===scope)));
 $('density-view').setAttribute('aria-label',blank?'空から作れるボクセルの作業台。クリックで編集、ドラッグで回転。':'密度比較の模型。ドラッグで回転、ホイールで拡大。');
}
function syncTool(){view.edit($('tool').value!=='view',$('tool').value,Number($('brush').value));$('offsets').hidden=$('tool').value!=='copy';}
function request(type,extra={},overlay=false){
 busy=true;lock();if(overlay)$('busy').hidden=false;const id=++serial,start=performance.now();
 return new Promise((resolve,reject)=>{pending.set(id,{resolve,reject,start,type,measure:measuring?.phase});worker.postMessage({id,type,factor,scope,merge:$('mesh-mode').value==='merged',steps,...extra});});
}
worker.onmessage=({data:d})=>{const p=pending.get(d.id);if(!p)return;pending.delete(d.id);busy=pending.size>0;$('busy').hidden=true;
 if(d.error){$('selection-status').textContent=d.error;lock();p.reject(Error(d.error));return;}
 if(d.type==='geometry'){
  const applyStart=performance.now();const changedScope=scope!==d.scope;scope=d.scope;if(changedScope){$('tool').value=scope==='blank'?'place':'view';$('camera').value='corner';clearSelection();}view.load(d);syncScope();syncTool();const applyMs=performance.now()-applyStart;if(d.complete)d.complete.items=[];d.active.items=[];latest=d;factor=d.factor;steps=d.steps;$('density').value=String(factor);
  $('model-count').textContent=scope==='district'?`5棟 · 樹5本 · 住民${night?'0':'12'}人`:scope==='blank'?`作品 ${fmt(d.completed.count)}粒`:`建物・テラス ${fmt(d.completed.count)}粒`;
  $('scene-status').textContent=scope==='district'?`手前右の1棟を建築 · ${fmt(d.completed.count*4+d.visible.count)}粒`:scope==='blank'?`作業台 ${workbenchBounds(factor).width} × ${workbenchBounds(factor).width} · 4.8m四方`:`主屋の幅${factor===2?32:64}粒`;
  $('mesh-time').textContent=(d.active.meshMs+(d.complete?.meshMs||0)).toFixed(1)+' ms';$('chunk-count').textContent=fmt(d.active.updated);$('response-time').textContent=(performance.now()-p.start).toFixed(0)+' ms';
  const full=d.complete||latestComplete;if(d.complete)latestComplete=d.complete;
  const triangles=scope==='district'?(full?.triangles||0)*4+(steps===20000?(full?.triangles||0):d.active.triangles):d.active.triangles;
  $('triangles').textContent=fmt(triangles);$('buffer-size').textContent=((d.active.bytes+(scope==='district'?(full?.bytes||0):0))/1048576).toFixed(1)+' MiB';
  if(d.edited)$('selection-status').textContent=p.type==='clear'?'作業台を空にしました。「戻す」で復元できます。':`${fmt(d.edited)}粒を変更`;
  else if(p.type==='edit')$('selection-status').textContent='変更はありません（作業台の外には置けません）';
  updateProgress();if(measuring&&p.type==='progress')measuring.updates.push({phase:p.measure,meshMs:d.active.meshMs,workerMs:d.workerMs,applyMs,responseMs:performance.now()-p.start,chunks:d.active.updated});
 }
 lock();p.resolve(d);
};
let latestComplete;
worker.onerror=e=>{$('busy').hidden=true;$('selection-status').textContent='模型の処理を続けられませんでした。ページを開き直してください。';for(const p of pending.values())p.reject(Error(e.message));pending.clear();busy=false;stop();lock();};
function updateProgress(){$('steps').value=steps;$('step-value').textContent=fmt(steps)+'歩';$('build-status').textContent=(scope==='district'?'5棟目 · ':'')+(steps===20000?'完成':PHASES.find(p=>steps<=p.end)?.name||'完成');}
function clearSelection(){selection=[];view.select();$('apply').disabled=true;const tool=$('tool').value;$('selection-status').textContent=['place','extrude'].includes(tool)?(scope==='blank'?'作業台やブロックの面を押して追加':'追加する面を押してください'):tool==='erase-one'?'消す粒を押してください':tool==='paint-one'?'色を変える粒を押してください':tool==='view'?'ドラッグで回転、ホイール・ピンチで拡大':'2か所を押して範囲を選択';}
function stop(){playing=false;$('play').textContent='▶';$('play').setAttribute('aria-label','建築を再生');}
async function progress(n){steps=Math.max(0,Math.min(20000,Math.round(n/250)*250));updateProgress();return request('progress');}
async function load(){stop();clearSelection();return request('load',{},true);}
async function setScope(next){if(next!==scope)$('camera').value='corner';scope=next;$('tool').value=scope==='blank'?'place':'view';if(scope==='blank'){$('brush').value='1';steps=20000;}syncScope();syncTool();await load();}
function safe(fn){return(...args)=>Promise.resolve().then(()=>fn(...args)).catch(e=>{$('selection-status').textContent=e.message;if(measuring)cancelMeasure('処理エラーのため測定を中止しました。');});}
async function pick(q,n,onFloor=false){
 if(busy||measuring||scope==='district'||steps!==20000||$('tool').value==='view')return;
 const tool=$('tool').value;
 if(['place','extrude'].includes(tool)){
  const r=(Number($('brush').value)-1)/2,a=q.map((v,i)=>v+n[i]-(n[i]?0:r)),b=q.map((v,i)=>v+n[i]+(n[i]?0:r));
  try{await request('edit',{edit:{a,b,tool:'fill',color:$('color').value,mirror:$('mirror').checked}});}catch(e){$('selection-status').textContent=e.message;}return;
 }
 if(['erase-one','paint-one'].includes(tool)){if(onFloor)return;try{await request('edit',{edit:{a:q,b:q,tool:tool==='erase-one'?'erase':'paint',color:$('color').value,mirror:$('mirror').checked}});}catch(e){$('selection-status').textContent=e.message;}return;}
 if(onFloor)q=[q[0],0,q[2]];
 if(selection.length===2)selection=[];selection.push(q);view.select(selection[0],selection[1]);$('selection-status').textContent=selection.length===1?'もう1か所を選択':`${fmt(selection[0].reduce((n,v,i)=>n*(Math.abs(v-selection[1][i])+1),1))}粒分の範囲`;$('apply').disabled=selection.length!==2;
}
function save(name,text){const url=URL.createObjectURL(new Blob([text],{type:'application/json'})),a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
$('density').onchange=safe(async()=>{factor=Number($('density').value);await load();});$('mesh-mode').onchange=safe(load);document.querySelectorAll('[data-scope]').forEach(b=>b.onclick=safe(()=>setScope(b.dataset.scope)));
$('camera').onchange=()=>view.angle($('camera').value);$('night').onclick=()=>{night=!night;view.night(night);$('night').setAttribute('aria-pressed',String(night));if(scope==='district')$('model-count').textContent=`5棟 · 樹5本 · 住民${night?'0':'12'}人`;};
$('zoom-in').onclick=()=>view.zoom(1.5);$('zoom-out').onclick=()=>view.zoom(1/1.5);$('fit-work').onclick=()=>view.angle($('camera').value);
$('steps').onchange=safe(()=>{stop();view.edit(false);$('tool').value='view';return progress(Number($('steps').value));});document.querySelectorAll('[data-steps]').forEach(b=>b.onclick=safe(()=>{stop();view.edit(false);$('tool').value='view';return progress(Number(b.dataset.steps));}));$('restart').onclick=safe(()=>{stop();view.edit(false);$('tool').value='view';return progress(0);});
$('play').onclick=safe(async()=>{if(playing){stop();return;}view.edit(false);$('tool').value='view';if(steps===20000)await progress(0);playAt=performance.now();playSteps=steps;playing=true;$('play').textContent='Ⅱ';$('play').setAttribute('aria-label','建築を一時停止');});
$('tool').onchange=safe(async()=>{stop();clearSelection();if(steps!==20000)await progress(20000);syncTool();});$('brush').onchange=syncTool;$('clear-selection').onclick=clearSelection;
$('clear-work').onclick=safe(async()=>{clearSelection();await request('clear');});
$('apply').onclick=safe(async()=>{if(selection.length!==2)return;await request('edit',{edit:{a:selection[0],b:selection[1],tool:$('tool').value,color:$('color').value,mirror:$('mirror').checked,offset:['x','y','z'].map(a=>Number($('offset-'+a).value))}});view.select();selection=[];lock();});$('undo').onclick=safe(()=>request('undo'));
$('export-work').onclick=safe(async()=>{const d=await request('export');save(`dayorama-${scope==='blank'?'scratch':'density'}-${factor}.json`,d.text);});$('import-work').onclick=()=>$('work-file').click();$('work-file').onchange=safe(async e=>{const f=e.target.files[0];if(!f)return;if(f.size>24000000)throw Error('作品ファイルが大きすぎます');stop();clearSelection();steps=20000;await request('import',{text:await f.text()},true);e.target.value='';});

const quantile=(a,p)=>{if(!a.length)return null;const sorted=[...a].sort((a,b)=>a-b);return sorted[Math.min(sorted.length-1,Math.floor(sorted.length*p))];};
function stageResult(m,phase){const frames=m.frames.filter(f=>f.phase===phase),updates=m.updates.filter(u=>u.phase===phase),intervals=frames.map(f=>f.dt);return {frames:frames.length,fps:intervals.length?1000*intervals.length/intervals.reduce((s,v)=>s+v,0):null,frameP95:quantile(intervals,.95),over50ms:intervals.filter(t=>t>50).length,renderCpuP95:quantile(frames.map(f=>f.cpuMs),.95),updates:updates.length,meshP95:quantile(updates.map(u=>u.meshMs),.95),applyP95:quantile(updates.map(u=>u.applyMs),.95),responseP95:quantile(updates.map(u=>u.responseMs),.95)};}
function renderResults(){const val=v=>v==null?'—':v.toFixed(1);$('results').innerHTML='<table><thead><tr><th>条件</th><th>区間</th><th>平均FPS</th><th>遅いフレーム p95</th><th>50ms超</th><th>形状作成 p95</th><th>応答 p95</th></tr></thead><tbody>'+results.flatMap(r=>['rotation','construction'].map(phase=>{const s=r[phase];return `<tr><td>${r.factor===2?'15':'7.5'}cm / ${r.merge?'結合':'未結合'}${r.night?' / 夜':''}</td><td>${phase==='rotation'?'回転':'建築'}</td><td>${r.cadenceLimited?'評価保留':val(s.fps)}</td><td>${val(s.frameP95)} ms</td><td>${s.over50ms}</td><td>${val(s.meshP95)} ms</td><td>${val(s.responseP95)} ms</td></tr>`;})).join('')+'</tbody></table>';$('export-report').disabled=!results.length;}
async function startMeasure(){
 if(busy||measuring)return;stop();if(scope!=='district')await setScope('district');if(steps!==20000)await progress(20000);view.angle('corner');$('camera').value='corner';
 $('density-view').scrollIntoView({block:'start',behavior:'instant'});measuring={start:performance.now(),phase:'rotation',frames:[],updates:[],factor,merge:$('mesh-mode').value==='merged',night,viewport:view.viewport,baselineTriangles:latestComplete?.triangles,baselineBytes:latestComplete?.bytes};view.rotate(true);lock();$('measure-status').textContent='回転を測定中… 0 / 25秒';
}
function cancelMeasure(message='測定を中止しました。'){measuring=null;view.rotate(false);$('measure-status').textContent=message;lock();}
async function finishMeasure(){const m=measuring;if(!m)return;measuring=null;view.rotate(false);const cadenceLimited=m.frames.length>0&&m.frames.filter(f=>f.dt>900&&f.dt<1100).length/m.frames.length>.8;const result={date:new Date().toISOString(),factor:m.factor,merge:m.merge,night:m.night,viewport:m.viewport,userAgent:navigator.userAgent,devicePixelRatio,templateReuse:5,people:m.night?0:12,cadenceLimited,geometryTrianglesPerPlot:m.baselineTriangles,geometryBytesPerPlot:m.baselineBytes,rotation:stageResult(m,'rotation'),construction:stageResult(m,'construction')};results.push(result);renderResults();$('measure-status').textContent=cadenceLimited?'約1秒ごとの描画更新を検出。背景表示などの制限が疑われるため、FPSは評価保留です。':'測定完了。端末・画面サイズ・昼夜を揃えて比較してください。';lock();if(!busy)await progress(20000);}
$('measure').onclick=safe(startMeasure);$('cancel-measure').onclick=()=>cancelMeasure();$('export-report').onclick=()=>save('dayorama-density-measurements.json',JSON.stringify({format:'dayorama-density-benchmark',version:1,results},null,2));
document.addEventListener('visibilitychange',()=>{if(document.hidden){stop();if(measuring)cancelMeasure('画面が非表示になったため、この測定は無効です。');}});
function frame(f){frameStats=f;if(f.draws!=null&&(f.draws!==lastDraws||f.now-lastStats>500)){lastDraws=f.draws;$('draws').textContent=fmt(f.draws);lastStats=f.now;}
 if(measuring){if(f.width&& (f.width!==measuring.viewport.width||f.height!==measuring.viewport.height)){cancelMeasure('画面サイズが変わったため、この測定は無効です。');return;}const elapsed=f.now-measuring.start;measuring.phase=elapsed<10000?'rotation':'construction';if(elapsed>500&&elapsed<=25000&&f.rendered&&f.dt>0)measuring.frames.push({...f,phase:measuring.phase});
  $('measure-status').textContent=`${elapsed<10000?'回転':'建築'}を測定中… ${Math.min(25,Math.floor(elapsed/1000))} / 25秒`;
  if(elapsed>=25000){if(!busy)safe(finishMeasure)();return;}
  if(elapsed>=10000&&!busy&&f.now-animationAt>500){animationAt=f.now;safe(()=>progress((elapsed-10000)/15000*20000))();}
 }else if(playing&&!busy&&f.now-animationAt>500){animationAt=f.now;const next=playSteps+(f.now-playAt)/1.25;if(next>=20000)stop();safe(()=>progress(next))();}
}
if(scope==='blank'){$('tool').value='place';$('brush').value='1';}syncScope();syncTool();lock();safe(async()=>{await load();ready=true;lock();})();
