import {CONSTELLATIONS,BY_ID,OBSERVATORIES,observationDate,tonight,projectFigure,edgeKey,checkAnswer,restoreNotebook,registerAnswer,observingMonths,center} from './model.mjs';
import {createSky} from './sky.mjs';
import {chooseFeatured,constellationHint,directionName} from './sky-math.mjs';
const NS='http://www.w3.org/2000/svg';
function svgNode(tag,attrs={}){const n=document.createElementNS(NS,tag);for(const[k,v]of Object.entries(attrs))n.setAttribute(k,v);return n;}
const today=()=>{const d=new Date();return`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;};

export function createStargazing({unlocked=()=>false,storageKey='komorebi-starbook-v1',onClose=()=>{}}={}){
 if(!document.querySelector('[data-stargazing-style]')){const link=document.createElement('link');link.rel='stylesheet';link.href=new URL('./style.css',import.meta.url);link.dataset.stargazingStyle='';document.head.append(link);}
 const dialog=document.createElement('dialog');dialog.className='stargazing';dialog.setAttribute('aria-label','星見の丘');
 dialog.innerHTML=`
 <div class="star-sky" data-s="sky" tabindex="0" role="group" aria-label="星空。ドラッグまたは矢印キーで見回す。ピンチまたはプラスとマイナスで拡大縮小。">
  <svg data-s="overlay" class="star-overlay" aria-label="観測中の星座"></svg><div class="star-markers" data-s="markers"></div>
 </div>
 <header class="star-header"><div><small data-s="mode">星見の丘</small><h1>星座観測</h1><button data-s="settings-toggle" class="star-time" aria-expanded="false" aria-controls="star-settings"><span data-s="time-label"></span> ⌄</button></div><div class="star-header-actions"><button data-s="book-tab">星座帳 <span data-s="count">0 / 88</span></button><button data-s="close" aria-label="星座観測を閉じる">閉じる</button></div></header>
 <div class="star-settings star-sheet" id="star-settings" data-s="settings" hidden><h2>観測する空</h2><div class="star-controls"><label>観測地点<select data-s="site"><option value="north">北の空 · 北緯35°</option><option value="south">南の空 · 南緯35°</option></select></label><label>日付<input data-s="date" type="date"></label><label>時刻<select data-s="hour">${[20,21,22,23,0,1,2,3,4].map(h=>`<option value="${h}" ${h===21?'selected':''}>${String(h).padStart(2,'0')}:00</option>`).join('')}</select></label></div><small>位置情報を使わない観測地点です。時刻は日本時間。</small><a href="${new URL('./about.html',import.meta.url)}" target="_blank" rel="noopener">星図・データについて</a><button data-s="settings-done">空に戻る</button></div>
 <section data-s="observe" class="star-observe">
  <button data-s="list-toggle" class="star-list-toggle" aria-expanded="false" aria-controls="star-tonight">今夜の星座 <span data-s="available"></span> ⌄</button>
  <div class="star-tonight star-sheet" id="star-tonight" data-s="list" hidden><div class="star-sheet-heading"><h2>今夜の星座</h2><button data-s="list-close" aria-label="今夜の星座を閉じる">×</button></div><div data-s="targets" class="star-targets"></div></div>
  <div class="star-view-tools"><span data-s="bearing"></span><div><button data-s="zoom-out" aria-label="星空を縮小">−</button><button data-s="scenic">空全体</button><button data-s="zoom-in" aria-label="星空を拡大">＋</button></div></div>
  <article class="star-hint-card" data-s="card"><div class="star-card-heading"><small data-s="card-kicker">今夜のヒント</small><button data-s="leave-connect" hidden>見回す</button></div><h2 data-s="name"></h2><p data-s="clue" class="star-clue"></p><p data-s="direction" class="star-direction"></p>
   <div data-s="explore-actions" class="star-actions"><button data-s="locate">方角を見る</button><button data-s="begin" class="star-primary">星を結ぶ</button></div>
   <div data-s="connect-actions" hidden><p class="star-connect-note">星を2つ選んで結ぶ <span data-s="line-count"></span></p><div class="star-actions"><button data-s="undo">戻す</button><button data-s="hint">ヒント</button><button data-s="check" class="star-primary">答え合わせ</button></div><details class="star-reference"><summary>お手本・番号で結ぶ</summary><svg data-s="reference" viewBox="0 0 600 480" aria-label="星座の形のお手本"></svg><div class="star-actions"><button data-s="guide" aria-pressed="false">空に重ねる</button><button data-s="clear">線を消す</button><button data-s="fit">星座全体</button></div><div class="star-numbers"><select data-s="from" aria-label="始点の星"></select><select data-s="to" aria-label="終点の星"></select><button data-s="connect">結ぶ</button></div></details></div>
  </article><p class="star-gesture" data-s="gesture">ドラッグして見回す · ピンチで拡大</p>
 </section>
 <section data-s="book" class="star-book star-sheet" hidden><div class="star-sheet-heading"><h2>星座帳</h2><button data-s="observe-tab">空に戻る</button></div><div class="star-book-tools"><input data-s="search" type="search" placeholder="星座を探す" aria-label="星座帳を検索"><select data-s="filter" aria-label="星座帳の絞り込み"><option value="all">すべて</option><option value="found">登録済み</option><option value="unfound">未登録</option></select></div><div data-s="entries" class="star-entries"></div></section>
 <p data-s="status" class="star-status" role="status" aria-live="polite"></p>`;
 document.body.append(dialog);const $=s=>dialog.querySelector(`[data-s="${s}"]`);
 let preview=false,book,storageFailed=false,key,c=null,available=[],edges=[],history=[],selected=null,view='observe',solved=false,guide=false,connecting=false,sky=null,frame=null,markerNodes=[],pointNodes=[],lineNodes=[],guideNodes=[],lastBearing='';
 const say=text=>{$('status').textContent=text;};
 const date=()=>observationDate($('date').value,Number($('hour').value));
 const site=()=>$('site').value;
 function panel(name,open){$(name).hidden=!open;$(name==='settings'?'settings-toggle':'list-toggle').setAttribute('aria-expanded',String(open));}
 function chooseView(next){view=next;say('');$('observe').hidden=next!=='observe';$('book').hidden=next!=='book';$('sky').inert=next!=='observe';panel('list',false);panel('settings',false);if(next==='book'){renderBook();sky?.stop();}else sky?.start();}
 function updateCount(){$('count').textContent=`${Object.keys(book.entries).length} / 88`;}
 function svgLine(a,b,points){return svgNode('line',{x1:points[a][0],y1:points[a][1],x2:points[b][0],y2:points[b][1]});}
 function renderReference(){const svg=$('reference');svg.replaceChildren();if(!c)return;const points=projectFigure(c);for(const e of c.edges)svg.append(svgLine(...e,points));points.forEach(([x,y],i)=>{svg.append(svgNode('circle',{cx:x,cy:y,r:5}));const t=svgNode('text',{x:x+10,y:y-9});t.textContent=i+1;svg.append(t);});}
 function draw(){
  const overlay=$('overlay');overlay.replaceChildren();pointNodes=[];lineNodes=[];guideNodes=[];
  $('name').textContent=c?.name||'星空を見回す';$('begin').disabled=!c;$('locate').disabled=!c;$('check').disabled=!c||storageFailed||solved;
  $('explore-actions').hidden=connecting;$('connect-actions').hidden=!connecting;$('leave-connect').hidden=!connecting;$('card-kicker').textContent=connecting?(solved?'観測できました':'星を結ぶ'):'今夜のヒント';
  $('clue').hidden=connecting;$('direction').hidden=connecting;$('gesture').hidden=connecting;dialog.classList.toggle('is-connecting',connecting);
  $('line-count').textContent=c?`${edges.length} / ${c.edges.length} 本`:'';$('undo').disabled=!history.length;$('clear').disabled=!edges.length;
  if(c){const hint=constellationHint(c,date(),site());$('clue').textContent=hint.clue;$('direction').textContent=hint.direction;}
  if(c&&connecting){
   if(guide)for(const [a,b]of c.edges){const el=svgNode('line',{class:'star-guide-line'});overlay.append(el);guideNodes.push({a,b,el});}
   for(const [a,b]of edges){const el=svgNode('line',{class:solved?'star-drawn-line is-solved':'star-drawn-line'});overlay.append(el);lineNodes.push({a,b,el});}
   c.stars.forEach((s,i)=>{const el=svgNode('g',{role:'button',tabindex:0,'aria-label':`星 ${i+1}`,'aria-pressed':String(selected===i),class:'star-point'}),circle=svgNode('circle',{r:selected===i?8:4,class:selected===i?'selected':''}),ring=svgNode('circle',{r:18,class:'star-hit'}),label=svgNode('text',{x:12,y:-11});label.textContent=i+1;el.append(ring,circle,label);el.addEventListener('keydown',e=>{if(['Enter',' '].includes(e.key)){e.preventDefault();e.stopPropagation();tap(i);pointNodes[i]?.el.focus();}});overlay.append(el);pointNodes.push({s,el});});
  }
  if(frame)drawFrame(frame);
 }
 function drawFrame(f){frame=f;if(view!=='observe')return;
  $('overlay').setAttribute('viewBox',`0 0 ${f.width} ${f.height}`);
  const bearing=`${directionName(f.azimuth)} · ${Math.round(f.altitude)}°`;if(bearing!==lastBearing){$('bearing').textContent=bearing;lastBearing=bearing;}
  let visibleLabels=0;
  for(const {item,el}of markerNodes){const p=f.project(center(item));const show=!connecting&&p.visible&&p.x>60&&p.x<f.width-60&&p.y>160&&p.y<f.height-260&&visibleLabels<3;el.hidden=!show;if(show){visibleLabels++;el.style.transform=`translate(${p.x}px,${p.y}px)`;}}
  if(!c||!connecting)return;
  const points=c.stars.map(f.project);
  pointNodes.forEach(({el},i)=>{const p=points[i];el.style.display=p.visible?'':'none';el.setAttribute('transform',`translate(${p.x} ${p.y})`);});
  for(const {a,b,el}of [...lineNodes,...guideNodes]){const p=points[a],q=points[b];el.style.display=p.visible&&q.visible?'':'none';el.setAttribute('x1',p.x);el.setAttribute('y1',p.y);el.setAttribute('x2',q.x);el.setAttribute('y2',q.y);}
 }
 function toggle(a,b){if(!c||a===b)return;history.push(edges.map(e=>[...e]));const k=edgeKey(a,b),exists=edges.some(e=>edgeKey(...e)===k);edges=exists?edges.filter(e=>edgeKey(...e)!==k):[...edges,[a,b]];selected=null;solved=false;say('');draw();}
 function tap(i){if(!connecting||!c)return;if(selected===null){selected=i;draw();}else if(selected===i){selected=null;draw();}else toggle(selected,i);}
 function setConnecting(value){connecting=value;selected=null;panel('list',false);panel('settings',false);$('reference').parentElement.open=false;if(value&&c)sky?.fit(c);draw();}
 function select(id,{locate=false}={}){
  c=BY_ID[id]||null;edges=[];history=[];selected=null;solved=false;guide=false;connecting=false;$('guide').setAttribute('aria-pressed','false');$('guide').textContent='空に重ねる';
  for(const n of ['from','to']){$(n).replaceChildren();c?.stars.forEach((s,i)=>{const o=document.createElement('option');o.value=i;o.textContent=`星 ${i+1}`;$(n).append(o);});}if(c?.stars.length>1)$('to').value='1';
  panel('list',false);say('');renderReference();draw();if(locate&&c)sky?.locate(c);renderTargets();
 }
 function renderTargets(){
  $('targets').replaceChildren(...available.map(item=>{const b=document.createElement('button'),hint=constellationHint(item,date(),site());b.className=item.id===c?.id?'is-current':'';const name=document.createElement('span'),direction=document.createElement('small');name.textContent=item.name+(book.entries[item.id]?' ✓':'');direction.textContent=hint.direction;b.append(name,direction);b.onclick=()=>select(item.id,{locate:true});return b;}));
  $('markers').replaceChildren();markerNodes=[];
  const ordered=[...available].sort((a,b)=>(a.id===c?.id?-1:b.id===c?.id?1:0));
  for(const item of ordered){const el=document.createElement('button');el.className='star-sky-label';el.textContent=item.name;el.setAttribute('aria-label',`${item.name}を観測する`);el.hidden=true;el.onclick=e=>{e.stopPropagation();select(item.id);setConnecting(true);};$('markers').append(el);markerNodes.push({item,el});}
 }
 function refresh({initial=false}={}){
  try{if(!preview)$('date').value=today();available=tonight(date(),site());sky?.setObservation(date(),site());
   const previous=available.find(a=>a.id===c?.id),featured=initial?chooseFeatured(available):previous||chooseFeatured(available);
   const [,m,d]=$('date').value.split('-');$('time-label').textContent=`${Number(m)}月${Number(d)}日 ${String($('hour').value).padStart(2,'0')}:00 · ${OBSERVATORIES[site()].name}`;$('available').textContent=`${available.length}`;
   select(featured?.id);sky?.scenic(false);if(!available.length)say('この時刻には星座全体が見えません。時刻を変えてみましょう。');
  }catch(e){say(e.message);}
 }
 const monthsCache=new Map();
 function renderBook(){updateCount();const q=$('search').value.trim(),filter=$('filter').value,shown=CONSTELLATIONS.filter(item=>(!q||item.name.includes(q)||item.latin.toLowerCase().includes(q.toLowerCase()))&&(filter==='all'||(filter==='found')===!!book.entries[item.id]));
  $('entries').replaceChildren(...shown.map(item=>{const article=document.createElement('article'),name=document.createElement('h3'),detail=document.createElement('p'),chart=svgNode('svg',{viewBox:'0 0 600 480','aria-hidden':'true'}),entry=book.entries[item.id];article.className=entry?'registered':'unregistered';name.textContent=item.name;
   if(entry){const points=projectFigure(item);for(const e of item.edges)chart.append(svgLine(...e,points));for(const [x,y]of points)chart.append(svgNode('circle',{cx:x,cy:y,r:5}));detail.textContent=`${new Date(entry.registeredAt).toLocaleDateString('ja-JP')} · ${OBSERVATORIES[entry.site].name}`;}else{const k=`${site()}/${new Date().getFullYear()}/${item.id}`;if(!monthsCache.has(k))monthsCache.set(k,observingMonths(item,site()));const months=monthsCache.get(k);detail.textContent=months.length?`${OBSERVATORIES[site()].name} · ${months.join('・')}月`:`${site()==='north'?'南':'北'}の空で観測できます`;const t=svgNode('text',{x:300,y:260,'text-anchor':'middle','font-size':48});t.textContent='未観測';chart.append(t);}
   article.append(chart,name,detail);return article;}));if(!shown.length){const p=document.createElement('p');p.textContent='該当する星座はありません';$('entries').append(p);}
 }
 $('close').onclick=()=>dialog.close();dialog.addEventListener('close',()=>{sky?.stop();onClose();});$('observe-tab').onclick=()=>chooseView('observe');$('book-tab').onclick=()=>chooseView(view==='book'?'observe':'book');
 $('settings-toggle').onclick=()=>{panel('list',false);panel('settings',$('settings').hidden);};$('settings-done').onclick=()=>panel('settings',false);
 $('list-toggle').onclick=()=>{panel('settings',false);panel('list',$('list').hidden);};$('list-close').onclick=()=>panel('list',false);
 for(const n of ['site','date','hour'])$(n).onchange=()=>refresh();$('search').oninput=renderBook;$('filter').onchange=renderBook;
 $('locate').onclick=()=>{if(c)sky?.locate(c);};$('begin').onclick=()=>setConnecting(true);$('leave-connect').onclick=()=>setConnecting(false);
 $('guide').onclick=()=>{guide=!guide;$('guide').setAttribute('aria-pressed',String(guide));$('guide').textContent=guide?'お手本を隠す':'空に重ねる';draw();};
 $('connect').onclick=()=>toggle(Number($('from').value),Number($('to').value));$('undo').onclick=()=>{if(history.length){edges=history.pop();selected=null;solved=false;draw();say('');}};$('clear').onclick=()=>{history.push(edges);edges=[];selected=null;solved=false;draw();say('');};
 $('hint').onclick=()=>{if(!c)return;const wrong=edges.find(e=>!c.edges.some(t=>edgeKey(...e)===edgeKey(...t)));if(wrong){say(`星 ${wrong[0]+1} と ${wrong[1]+1} の線を見直してみましょう。`);return;}const next=c.edges.find(e=>!edges.some(t=>edgeKey(...e)===edgeKey(...t)));say(next?`星 ${next[0]+1} と ${next[1]+1} を結んでみましょう。`:'星座の形ができました。答え合わせをしてみましょう。');};
 $('check').onclick=()=>{if(!c)return;try{if(!preview&&$('date').value!==today()){refresh();throw Error('日付が変わったので、今夜の星空に更新しました。');}const result=checkAnswer(c,edges);if(!result.correct){say(`${result.extra?`違う線が ${result.extra} 本。`:''}${result.missing?`あと ${result.missing} 本つながります。`:''}`);return;}const latest=restoreNotebook(localStorage.getItem(key)),merged={version:1,entries:{...book.entries,...latest.entries}},next=registerAnswer(merged,c,edges,{unlocked:preview||unlocked(),date:date(),site:site()});if(storageFailed)throw Error('保存できないため、星座帳への登録を停止しています。');try{localStorage.setItem(key,JSON.stringify(next));}catch{throw Error('星座帳を保存できませんでした。空き容量を確認して、もう一度答え合わせしてください。');}const existed=!!book.entries[c.id];book=next;solved=true;updateCount();draw();renderTargets();say(existed?`${c.name}、正解です。`:`${c.name}を${preview?'体験用の':''}星座帳に登録しました。`);}catch(e){say(e.message);}};
 $('zoom-in').onclick=()=>sky?.zoom(1/1.3);$('zoom-out').onclick=()=>sky?.zoom(1.3);$('fit').onclick=()=>{if(c)sky?.fit(c);};$('scenic').onclick=()=>{setConnecting(false);sky?.scenic();say('');};
 return{
  get isOpen(){return dialog.open;},
  open({demo=false}={}){
   if(!demo&&!unlocked())return false;preview=demo;key=preview?storageKey+'-preview':storageKey;storageFailed=false;
   try{book=restoreNotebook(localStorage.getItem(key));}catch{book=restoreNotebook(null);storageFailed=true;}
   $('mode').textContent=preview?'星見の丘 · 体験用':'星見の丘';$('date').value=today();$('date').disabled=!preview;updateCount();dialog.showModal();
   if(!sky)try{sky=createSky($('sky'),{onFrame:drawFrame,onError:say,onTap:(x,y)=>{if(!connecting||!c||!frame)return;const nearest=c.stars.map((s,i)=>{const p=frame.project(s);return{i,d:p.visible?Math.hypot(p.x-x,p.y-y):Infinity};}).sort((a,b)=>a.d-b.d)[0];if(nearest?.d<=25)tap(nearest.i);}});}catch{say('この端末で星空を描画できませんでした。ブラウザーを更新して、もう一度開いてください。');return true;}
   chooseView('observe');refresh({initial:true});if(storageFailed)say('星座帳を読み込めません。元の記録は保持し、登録を停止しています。');$('sky').focus({preventScroll:true});return true;
  },
  close:()=>dialog.close(),
  destroy(){sky?.destroy();dialog.remove();}
 };
}
