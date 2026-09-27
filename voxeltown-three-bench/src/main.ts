import './style.css';import {loadBundle,resolveBundle} from './world';import {TownScene} from './scene';import {Benchmark} from './bench';import {Bench,native,platform,snapshot} from './native';
if(platform==='ios')document.documentElement.dataset.benchBuffer='1280x720';
const app=document.querySelector<HTMLDivElement>('#app')!;
app.innerHTML=`<header><strong>tile002</strong><span id="tag">Three.js / 15 cm</span><span id="stats"></span></header><main id="stage"><div id="town"></div><figure id="reference" hidden><img src="/reference/seihon2.png" alt="正本画像"><figcaption>正本画像</figcaption></figure></main><footer><div id="tools"><button data-mode="view" aria-pressed="true">見る</button><button data-mode="add">置く</button><button data-mode="remove">消す</button><button id="reset">初期視点</button><button id="compare">正本と並置</button><button id="panel">計測</button></div><output id="status">データを読込中</output></footer><dialog id="metrics"><div class="dialog-title"><strong>実機ベンチ</strong><button id="close">閉じる</button></div><p id="platform"></p><div class="actions"><button id="fps">描画 30秒 × 3</button><button id="edits">置く・消す 各10回</button><button id="idle">静止・電池 10分</button><button id="cancel">中止</button><button id="save">結果を保存</button></div><pre id="results">未計測</pre></dialog>`;
const $=<T extends HTMLElement=HTMLElement>(s:string)=>document.querySelector<T>(s)!;
let town:TownScene|undefined,bench:Benchmark|undefined,queued=0,dirty=true,mode='view';
const pageStart=performance.now();
function status(s:string){$('#status').textContent=s;}
function request(){dirty=true;if(!queued&&!document.hidden)queued=requestAnimationFrame(frame);}
function frame(t:number){queued=0;if(document.hidden)return;bench?.frame?.(t);if(town&&(dirty||bench?.frame)){dirty=false;town.render();updateStats();}if(bench?.frame)queued=requestAnimationFrame(frame);}
function updateStats(){if(!town)return;const s=town.stats();$('#stats').textContent=`${s.resolvedChunks} chunks · ${(s.triangles/1000).toFixed(0)}k tris · ${s.drawCalls} calls`;}
function showResult(){$('#results').textContent=JSON.stringify(bench?.report,(_k,v)=>Array.isArray(v)&&v.length>30?`[${v.length} samples]`:v,2);}
function modeSet(value:string){mode=value;document.querySelectorAll<HTMLButtonElement>('[data-mode]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.mode===mode)));}
async function run(action:()=>Promise<void>){try{await action();showResult();if(native&&bench)await Bench.save({json:bench.json()});}catch(e){status(String(e));showResult();}}
async function start(){
  const bundle=await loadBundle(),world=resolveBundle(bundle),resolved=performance.now();
  town=new TownScene(world,$('#town'),request);const meshReady=performance.now();
  bench=new Benchmark(town,request,status);await bench.initialize();town.render();dirty=false;
  await new Promise<void>(r=>requestAnimationFrame(()=>r()));
  bench.report.startup={jsReadyMs:performance.now()-pageStart,decodeResolveMs:resolved-pageStart,sceneMeshMs:meshReady-resolved,...native?await Bench.ready():{},initialMemory:await snapshot()};
  $('#platform').textContent=native?`${platform==='ios'?'iPhone WKWebView':'Android WebView'}。記録前に充電・画面輝度を手順書に合わせてください。`:'PCでの機能確認です。この値を実機の合否には使いません。';
  $('#tag').textContent=`Three.js · 15 cm · 土台 ${Object.keys(bundle.tile.base.chunks).length} chunks`;
  status('ドラッグで回転 · ピンチでズーム');updateStats();
  const canvas=town.renderer.domElement,pointers=new Set<number>();let down:{x:number;y:number;time:number}|null=null,multi=false;
  canvas.addEventListener('pointerdown',e=>{pointers.add(e.pointerId);if(pointers.size===1){down={x:e.clientX,y:e.clientY,time:performance.now()};multi=false;}else multi=true;});
  canvas.addEventListener('pointercancel',e=>{pointers.delete(e.pointerId);down=null;});
  canvas.addEventListener('pointerup',e=>{
    pointers.delete(e.pointerId);if(!down||multi||bench!.active||mode==='view')return;
    const d=down;down=null;if(Math.hypot(e.clientX-d.x,e.clientY-d.y)>8||performance.now()-d.time>700)return;
    const cell=town!.pick(e.clientX,e.clientY,mode==='add');if(!cell)return;
    run(async()=>{const result=town!.applyEdit(cell,mode==='add'?bundle.palette.entries.find(e=>e.surface==='plaster_beige')?.index??1:0);status(`${mode==='add'?'置く':'消す'} · ${result.chunks.length} chunk · ${result.meshMs.toFixed(1)} ms`);});
  });
  canvas.addEventListener('webglcontextlost',e=>{e.preventDefault();bench!.abort();status('描画コンテキストを失いました。アプリを再起動して再計測してください。');});
  new ResizeObserver(()=>town?.resize()).observe($('#town'));
  (window as any).__bench={town,bench,request,status,ready:true};
  if(native)await Bench.save({json:bench.json()});
  if(bench.report.device?.launchArguments?.includes('--bench-fps-edits')){
    await new Promise(r=>setTimeout(r,3000));await run(async()=>{await bench!.fps();await bench!.edits();});
  }
}
document.querySelectorAll<HTMLButtonElement>('[data-mode]').forEach(b=>b.onclick=()=>{if(!bench?.active)modeSet(b.dataset.mode!);});
$('#reset').onclick=()=>{if(!bench?.active)town?.resetView();};
$('#compare').onclick=()=>{if(bench?.active)return;const ref=$('#reference');ref.hidden=!ref.hidden;$('#stage').classList.toggle('pair',!ref.hidden);town?.resize();};
const dialog=$<HTMLDialogElement>('#metrics');$('#panel').onclick=()=>{if(bench?.active)bench.abort();showResult();dialog.showModal();};$('#close').onclick=()=>dialog.close();
function prepare(){dialog.close();$('#reference').hidden=true;$('#stage').classList.remove('pair');modeSet('view');town?.resize();}
$('#fps').onclick=()=>{prepare();run(()=>bench!.fps());};$('#edits').onclick=()=>{prepare();run(()=>bench!.edits());};$('#idle').onclick=()=>{prepare();run(()=>bench!.idle());};$('#cancel').onclick=()=>{bench?.abort();dialog.close();};
$('#save').onclick=()=>run(async()=>{if(!bench)return;const json=bench.json();if(native){status('保存: '+(await Bench.save({json})).path);}else{const u=URL.createObjectURL(new Blob([json],{type:'application/json'})),a=document.createElement('a');a.href=u;a.download='bench-report.json';a.click();setTimeout(()=>URL.revokeObjectURL(u),1000);}});
document.addEventListener('visibilitychange',()=>{if(document.hidden){bench?.abort();if(queued)cancelAnimationFrame(queued);queued=0;}else request();});
window.addEventListener('error',e=>status(e.message));
start().catch(e=>{status('起動失敗: '+String(e));console.error(e);});
