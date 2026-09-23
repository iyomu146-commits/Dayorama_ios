import {makeDesign,COLORS,BUDGET,PHASES,encodeWork,decodeWork,cellKey} from './design.mjs';
import {createView} from './render.mjs';
import {makeRefinedDesign} from './refined.mjs';
import {makeSceneDesign} from './scene.mjs';
const $=id=>document.getElementById(id),fmt=n=>Math.round(n).toLocaleString('ja-JP');
const names={plaster:'漆喰',plaster2:'砂色',stone:'石',stone2:'明るい石',wood:'木',woodLight:'明るい木',woodDark:'濃い木',roof:'青緑',roofEdge:'濃い青緑',roofLight:'明るい青緑',glass:'ガラス',glassLight:'明るいガラス',metal:'鉄',brick:'煉瓦',brick2:'明るい煉瓦',cloth:'赤茶',clothLight:'薄い赤茶',pot:'素焼き',soil:'土',leaf:'葉',leaf2:'若葉',leaf3:'黄緑',leafDark:'濃い葉',grass:'草',flower:'桃色',cream:'白',yellow:'黄色'};
Object.assign(names,{roofMuted:'青緑・中間',roofSlate:'青緑・灰',roofSeam:'屋根の継ぎ目',woodHoney:'蜂蜜色の木',bark:'樹皮',barkDark:'濃い樹皮',barkLight:'明るい樹皮',leafGold:'黄葉',leafLime:'黄緑の葉',plasterWarm:'暖かい漆喰',glassSilver:'ガラス・空色',glassDeep:'ガラス・深緑',flowerGold:'山吹色'});
Object.assign(names,{earthEdge:'土の縁',grassSoft:'明るい芝',grassShade:'芝',flagWarm:'砂岩',flagLight:'明るい砂岩',flagGrey:'灰色の石',mortar:'目地',leafOlive:'オリーブ色の葉',leafOliveLight:'明るい葉',glassHaze:'ガラス・薄緑',glassSea:'ガラス・緑',glassShadow:'ガラス・影',ceramic:'青磁'});
for(const [id,hex] of Object.entries(COLORS)){const o=document.createElement('option');o.value=id;o.textContent=names[id]||id;o.style.color=hex;$('paint').append(o);}$('paint').value='roof';
let design=makeSceneDesign(),cells=[],history=[],steps=BUDGET,playing=false,last=0,accumulated=0,night=false,variant=0,views={},ready=false,patches=new Map(),imported=false,revision='scene';
const versions=new Map();
const activeKey=()=>imported?'imported':revision+':'+variant;
function keepVersion(){versions.set(activeKey(),{design,cells,history,patches,variant});}
async function buildCells(d){
 const worker=new Worker(new URL('./voxel-worker.mjs',import.meta.url),{type:'module'});
 try{return await new Promise((resolve,reject)=>{worker.onmessage=e=>e.data.error?reject(Error(e.data.error)):resolve(e.data.cells);worker.onerror=reject;worker.postMessage(d);});}
 finally{worker.terminate();}
}
function labelVersion(){
 $('revision').value=imported?'imported':revision;
 $('voxel-title').textContent=imported?'読み込んだ作品':revision==='scene'?'ボクセル — 窓と敷地':revision==='refined'?'ボクセル — 前回の版':'ボクセル — 初回';
 $('variant').disabled=imported;$('variant').setAttribute('aria-pressed',String(variant===1));
 $('undo').disabled=!history.length;
 $('selected').textContent=imported?'左に読み込んだ作品を表示しています。':revision==='scene'?'窓の奥行き・敷石・枝が見える樹冠':revision==='refined'?'前回の屋根・樹・家具の作り込み':'初回の比較モデル';
}
async function switchVersion(nextRevision,nextVariant=variant){
 if(!ready)return;keepVersion();stop();ready=false;$('loading').hidden=false;
 const previous={revision,variant,imported,design,cells,history,patches};
 try{
  imported=nextRevision==='imported';revision=nextRevision;variant=nextVariant;
  let v=versions.get(activeKey());
  if(!v){const d=revision==='scene'?makeSceneDesign(variant):revision==='refined'?makeRefinedDesign(variant):makeDesign(variant);v={design:d,cells:await buildCells(d),history:[],patches:new Map(),variant};}
  ({design,cells,history,patches,variant}=v);views.voxel.set(design,cells);views.module.set(makeDesign(variant),[]);
  progress(steps);labelVersion();
 }catch(e){({revision,variant,imported,design,cells,history,patches}=previous);$('selected').textContent=e.message;$('revision').value=imported?'imported':revision;}
 finally{ready=true;$('loading').hidden=true;}
}
function cameraFrom(which,state){views[which==='voxel'?'module':'voxel']?.setCamera(state);}
function stats(which,s){$(which+'-stats').textContent=(which==='voxel'?fmt(s.cells)+'粒':'初回の'+fmt(s.parts)+'部材')+' · '+fmt(s.triangles)+'△';}
function pick(which,hit,editing){
 if(which==='module'){$('selected').textContent=hit.part?.name||'部品';return;}
 const c=hit.cell;if(!c)return;
 if(!editing){$('selected').textContent=`${names[c.color]} · ${c.x}, ${c.y}, ${c.z}`;return;}
 const tool=$('tool').value,q={...c},map=new Map(cells.map(v=>[cellKey(v),v]));
 if(tool==='add'){if(cells.length>=240000){$('selected').textContent='この試作で保存できる粒数の上限です。';return;}q.x+=hit.normal[0];q.y+=hit.normal[1];q.z+=hit.normal[2];q.phase=4;q.part='custom';q.under=undefined;}
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
function imageDownload(which){const a=document.createElement('a');a.download=`dayorama-${which}-${which==='voxel'?(imported?'imported':revision):'original'}-${$('focus').value}-${$('angle').value}-${steps}${night?'-night':''}.png`;a.href=views[which].snapshot();a.click();}
function frame(now){if(playing){const dt=Math.min(.1,(now-last)/1000);accumulated+=dt*1000;if(accumulated>=180){progress(steps+accumulated);accumulated=0;if(steps>=BUDGET)stop();}}last=now;requestAnimationFrame(frame);}
async function initialize(){
 try{
  // Separate study page never reads/writes the production ledger or localStorage.
  cells=await buildCells(design);
  views.voxel=createView($('voxel-view'),'voxel',{onCamera:s=>cameraFrom('voxel',s),onPick:(h,e)=>pick('voxel',h,e),onStats:s=>stats('voxel',s)});
  views.module=createView($('module-view'),'module',{onCamera:s=>cameraFrom('module',s),onPick:(h,e)=>pick('module',h,e),onStats:s=>stats('module',s)});
  views.voxel.set(design,cells);views.module.set(makeDesign(),[]);views.module.setCamera(views.voxel.getCamera());ready=true;labelVersion();$('loading').hidden=true;requestAnimationFrame(frame);
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
$('import-file').onchange=async e=>{const f=e.target.files[0];if(!f||!ready)return;try{if(f.size>16000000)throw Error('ファイルが大きすぎます。');const next=decodeWork(await f.text());keepVersion();cells=next.sort((a,b)=>a.phase-b.phase||a.y-b.y||a.z-b.z||a.x-b.x);history=[];patches=new Map();imported=true;stop();if(!$('revision').querySelector('[value="imported"]')){const o=document.createElement('option');o.value='imported';o.textContent='読み込んだ作品';$('revision').append(o);}views.voxel.cells(cells);progress(BUDGET);labelVersion();$('selected').textContent='左に作品を読み込みました。右は共通原案のままです。';}catch(error){$('selected').textContent=error.message;}e.target.value='';};
$('explode').onclick=()=>{if(!ready)return;const on=$('explode').getAttribute('aria-pressed')!=='true';$('explode').setAttribute('aria-pressed',String(on));views.module.exploded(on);};
$('variant').onclick=()=>{if(ready&&!imported)switchVersion(revision,1-variant);};
$('revision').onchange=()=>switchVersion($('revision').value);
$('reference-open').onclick=()=>$('reference').showModal();$('reference-close').onclick=()=>$('reference').close();
$('voxel-shot').onclick=()=>ready&&imageDownload('voxel');$('module-shot').onclick=()=>ready&&imageDownload('module');
initialize();
