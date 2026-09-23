import {createDensityView} from './density-render.mjs';
import {PHASES} from './design.mjs';
const $=id=>document.getElementById(id),fmt=n=>Math.round(n).toLocaleString('ja-JP');
const worker=new Worker(new URL('./density-worker.mjs',import.meta.url),{type:'module'});
let model='crafted',steps=20000,night=false,busy=false,playing=false,started=0,startSteps=0,lastUpdate=0,serial=0;
const pending=new Map(),view=createDensityView($('view'),{onFrame:frame,framing:{target:[0,2.4,.2],half:4,width:4.8}});
function lock(){document.querySelectorAll('[data-model],[data-step],#steps,#play,#reset,#export').forEach(b=>b.disabled=busy);}
function request(type,extra={}){busy=true;lock();const id=++serial;return new Promise((resolve,reject)=>{pending.set(id,{resolve,reject});worker.postMessage({id,type,model,factor:2,scope:'building',merge:true,steps,...extra});});}
worker.onmessage=({data:d})=>{
 const p=pending.get(d.id);if(!p)return;pending.delete(d.id);busy=false;lock();$('loading').hidden=true;
 if(d.error){$('phase').textContent=d.error;p.reject(Error(d.error));return;}
 if(d.type==='geometry'){
  view.load(d);$('count').textContent=`${fmt(d.completed.count)}粒`;
  $('metrics').textContent=`表示中 ${fmt(d.active.triangles)}三角形 · 頂点データ ${(d.active.bytes/1048576).toFixed(2)} MB`;
  $('steps').value=steps;$('step-value').textContent=`${fmt(steps)}歩`;$('phase').textContent=steps===20000?'完成':PHASES.find(p=>steps<=p.end)?.name||'仕上げ';
 }p.resolve(d);
};
const safe=fn=>async(...args)=>{try{await fn(...args);}catch(error){stop();$('phase').textContent=error.message;}};
function stop(){playing=false;$('play').textContent='▶';$('play').setAttribute('aria-label','建築を再生');}
async function progress(n){steps=Math.max(0,Math.min(20000,Math.round(n)));await request('progress');}
document.querySelectorAll('[data-model]').forEach(b=>b.onclick=safe(async()=>{
 stop();model=b.dataset.model;document.querySelectorAll('[data-model]').forEach(v=>v.setAttribute('aria-pressed',String(v===b)));
 document.querySelector('.editor-link').href=`./density.html?model=${model}`;
 $('description').textContent=model==='crafted'?'15cmの格子上で直接設計した喫茶店。窓の中央に枠はなく、テラス席は建物の横に置いています。全ての形をボクセルとして編集できます。':'7.5cmの模型を15cmに縮約した以前の版。比較用に残しています。';
 $('loading').hidden=false;await request('load');
}));
$('angle').onchange=e=>view.angle(e.target.value);
$('night').onclick=()=>{night=!night;view.night(night);$('night').setAttribute('aria-pressed',String(night));};
$('zoom-in').onclick=()=>view.zoom(1.2);$('zoom-out').onclick=()=>view.zoom(1/1.2);$('fit').onclick=()=>view.angle($('angle').value);
$('steps').oninput=safe(async e=>{stop();if(!busy)await progress(Number(e.target.value));});
document.querySelectorAll('[data-step]').forEach(b=>b.onclick=safe(async()=>{stop();await progress(Number(b.dataset.step));}));
$('reset').onclick=safe(async()=>{stop();await progress(0);});
$('play').onclick=safe(async()=>{if(playing){stop();return;}if(steps===20000)await progress(0);playing=true;started=performance.now();startSteps=steps;$('play').textContent='Ⅱ';$('play').setAttribute('aria-label','建築を一時停止');});
function frame(f){if(!playing||busy||f.now-lastUpdate<120)return;lastUpdate=f.now;const next=startSteps+(f.now-started)*1.1;if(next>=20000)stop();safe(()=>progress(next))();}
$('export').onclick=safe(async()=>{const d=await request('export'),url=URL.createObjectURL(new Blob([d.text],{type:'application/json'})),a=document.createElement('a');a.href=url;a.download=`dayorama-cafe-${model}-15cm.json`;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);});
document.addEventListener('visibilitychange',()=>{if(document.hidden)stop();});
safe(()=>request('load'))();
