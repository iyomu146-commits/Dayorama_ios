import {makeDesign,voxelize,COLORS,CELL,BUDGET,PHASES,encodeWork,decodeWork,cellKey} from './design.mjs';
import {createView} from './render.mjs';
const $=id=>document.getElementById(id),fmt=n=>Math.round(n).toLocaleString('ja-JP');
const names={plaster:'漆喰',plaster2:'砂色',stone:'石',stone2:'明るい石',wood:'木',woodLight:'明るい木',woodDark:'濃い木',roof:'青緑',roofEdge:'濃い青緑',roofLight:'明るい青緑',glass:'ガラス',glassLight:'明るいガラス',metal:'鉄',brick:'煉瓦',brick2:'明るい煉瓦',cloth:'赤茶',clothLight:'薄い赤茶',pot:'素焼き',soil:'土',leaf:'葉',leaf2:'若葉',leaf3:'黄緑',leafDark:'濃い葉',grass:'草',flower:'桃色',cream:'白',yellow:'黄色'};
for(const [id,hex] of Object.entries(COLORS)){const o=document.createElement('option');o.value=id;o.textContent=names[id];o.style.color=hex;$('paint').append(o);}$('paint').value='roof';
let design=makeDesign(),cells=[],history=[],steps=BUDGET,playing=false,last=0,accumulated=0,night=false,variant=0,views={},ready=false,patches=new Map(),imported=false;
function cameraFrom(which,state){views[which==='voxel'?'module':'voxel']?.setCamera(state);}
function stats(which,s){$(which+'-stats').textContent=(which==='voxel'?fmt(s.cells)+'粒':'共通の'+fmt(s.parts)+'部材')+' · '+fmt(s.triangles)+'△';}
function pick(which,hit,editing){
 if(which==='module'){$('selected').textContent=hit.part?.name||'部品';return;}
 const c=hit.cell;if(!c)return;
 if(!editing){$('selected').textContent=`${names[c.color]} · ${c.x}, ${c.y}, ${c.z}`;return;}
 const tool=$('tool').value,q={...c},map=new Map(cells.map(v=>[cellKey(v),v]));
 if(tool==='add'){q.x+=hit.normal[0];q.y+=hit.normal[1];q.z+=hit.normal[2];q.phase=4;q.group='custom';q.part='custom';}
 if([q.x,q.y,q.z].some(v=>Math.abs(v)>120)){$('selected').textContent='編集できる範囲の外です。';return;}
 const key=cellKey(q),old=map.get(key),next=tool==='remove'?null:{...q,color:$('paint').value,emission:$('paint').value.startsWith('glass')};
 if(tool==='add'&&old)return;
 history.push({key,old,next,previousPatch:patches.has(key)?patches.get(key):undefined});if(history.length>100)history.shift();
 patches.set(key,next);if(next)map.set(key,next);else map.delete(key);cells=[...map.values()].sort((a,b)=>a.phase-b.phase||(a.order??999)-(b.order??999)||a.y-b.y||a.z-b.z||a.x-b.x);
 views.voxel.cells(cells);$('undo').disabled=false;$('selected').textContent=tool==='paint'?'一粒の色を変更しました':tool==='remove'?'一粒取り除きました':'一粒追加しました';
}
function progress(n){steps=Math.max(0,Math.min(BUDGET,n));$('steps').value=steps;$('step-value').textContent=fmt(steps)+'歩';$('phase').textContent=steps>=BUDGET?'完成':PHASES.find(p=>steps<=p.end)?.name||'完成';for(const v of Object.values(views))v.progress(steps);}
function stop(){playing=false;$('play').textContent='▶';$('play').setAttribute('aria-label','建築を再生');}
function viewMode(){const value=$('tool').value,editing=value!=='view';if(editing){stop();progress(BUDGET);$('selected').textContent='ブロックをタップ。回転するときは「眺める」に戻します。';}views.voxel.edit(editing);}
function download(name,data,type){const url=URL.createObjectURL(new Blob([data],{type})),a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
function imageDownload(which){const a=document.createElement('a');a.download=`dayorama-${which}-${$('angle').value}-${steps}${night?'-night':''}.png`;a.href=views[which].snapshot();a.click();}
function frame(now){if(playing){const dt=Math.min(.1,(now-last)/1000);accumulated+=dt*1000;if(accumulated>=180){progress(steps+accumulated);accumulated=0;if(steps>=BUDGET)stop();}}last=now;requestAnimationFrame(frame);}
async function initialize(){
 try{
  // Separate study page never reads/writes the production ledger or localStorage.
  const worker=new Worker(new URL('./voxel-worker.mjs',import.meta.url),{type:'module'});
  cells=await new Promise((resolve,reject)=>{worker.onmessage=e=>e.data.error?reject(Error(e.data.error)):resolve(e.data.cells);worker.onerror=reject;worker.postMessage(design);});worker.terminate();
  views.voxel=createView($('voxel-view'),'voxel',{onCamera:s=>cameraFrom('voxel',s),onPick:(h,e)=>pick('voxel',h,e),onStats:s=>stats('voxel',s)});
  views.module=createView($('module-view'),'module',{onCamera:s=>cameraFrom('module',s),onPick:(h,e)=>pick('module',h,e),onStats:s=>stats('module',s)});
  views.voxel.set(design,cells);views.module.set(design,[]);views.module.setCamera(views.voxel.getCamera());ready=true;$('loading').hidden=true;requestAnimationFrame(frame);
 }catch(e){console.error(e);$('loading').textContent='表示できませんでした。 '+(e.message||'3D描画を確認してください。');}
}
$('steps').addEventListener('input',()=>{if(!ready)return;stop();$('tool').value='view';views.voxel.edit(false);progress(Number($('steps').value));});
document.querySelectorAll('[data-step]').forEach(b=>b.onclick=()=>{stop();$('tool').value='view';views.voxel.edit(false);progress(Number(b.dataset.step));});
$('play').onclick=()=>{if(!ready)return;if(playing){stop();return;}$('tool').value='view';views.voxel.edit(false);if(steps>=BUDGET)progress(0);playing=true;accumulated=0;$('play').textContent='Ⅱ';$('play').setAttribute('aria-label','建築を一時停止');};
$('reset').onclick=()=>{stop();$('tool').value='view';views.voxel.edit(false);progress(0);};
$('layout').onclick=e=>{const b=e.target.closest('[data-layout]');if(!b)return;$('comparison').dataset.layout=b.dataset.layout;document.querySelectorAll('[data-layout][aria-pressed]').forEach(t=>t.setAttribute('aria-pressed',String(t===b)));};
$('focus').onchange=()=>{if(!ready)return;Object.values(views).forEach(v=>v.focus($('focus').value));};
$('angle').onchange=()=>{if(!ready)return;views.voxel.angle($('angle').value);views.module.setCamera(views.voxel.getCamera());};
$('night').onclick=()=>{if(!ready)return;night=!night;$('night').setAttribute('aria-pressed',String(night));Object.values(views).forEach(v=>v.night(night));};
$('tool').onchange=()=>ready&&viewMode();
$('undo').onclick=()=>{const h=history.pop();if(!h)return;const map=new Map(cells.map(c=>[cellKey(c),c]));if(h.old)map.set(h.key,h.old);else map.delete(h.key);if(h.previousPatch===undefined)patches.delete(h.key);else patches.set(h.key,h.previousPatch);cells=[...map.values()].sort((a,b)=>a.phase-b.phase||a.y-b.y||a.z-b.z||a.x-b.x);views.voxel.cells(cells);$('undo').disabled=!history.length;$('selected').textContent='ひとつ戻しました。';};
$('export').onclick=()=>{if(ready)download('dayorama-cafe.voxels.json',encodeWork(cells),'application/json');};
$('import').onclick=()=>$('import-file').click();
$('import-file').onchange=async e=>{const f=e.target.files[0];if(!f)return;try{if(f.size>16000000)throw Error('ファイルが大きすぎます。');const next=decodeWork(await f.text());cells=next.sort((a,b)=>a.phase-b.phase||a.y-b.y||a.z-b.z||a.x-b.x);history=[];patches.clear();imported=true;stop();$('undo').disabled=true;views.voxel.cells(cells);progress(BUDGET);$('selected').textContent='左に作品を読み込みました。右は共通原案のままです。';$('variant').disabled=true;}catch(error){$('selected').textContent=error.message;}e.target.value='';};
$('explode').onclick=()=>{if(!ready)return;const on=$('explode').getAttribute('aria-pressed')!=='true';$('explode').setAttribute('aria-pressed',String(on));views.module.exploded(on);};
$('variant').onclick=()=>{if(!ready||imported)return;variant=1-variant;design=makeDesign(variant);const map=new Map(voxelize(design).map(c=>[cellKey(c),c]));for(const [k,c] of patches){if(c)map.set(k,c);else map.delete(k);}cells=[...map.values()].sort((a,b)=>a.phase-b.phase||(a.order??999)-(b.order??999)||a.y-b.y);views.voxel.set(design,cells);views.module.set(design,[]);Object.values(views).forEach(v=>v.progress(steps));$('variant').setAttribute('aria-pressed',String(variant===1));};
$('reference-open').onclick=()=>$('reference').showModal();$('reference-close').onclick=()=>$('reference').close();
$('voxel-shot').onclick=()=>ready&&imageDownload('voxel');$('module-shot').onclick=()=>ready&&imageDownload('module');
initialize();
