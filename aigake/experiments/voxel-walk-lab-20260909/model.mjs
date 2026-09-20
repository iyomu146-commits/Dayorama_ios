import {BUILDINGS,REGIONS} from './content/catalog.mjs';
export const TOTAL_STEPS = 4800;
export const DISCOVERY_STEPS = 1800;
export const STAR_PAGES = [
  {name:'こぐまの灯り',subtitle:'小さな星を、ひとつ見つけた。',gift:'庭に、星の環が届きました。',points:[[16,62],[31,49],[42,52],[54,35],[74,32],[78,49],[60,53]],edges:[[0,1],[1,2],[2,3],[3,4],[4,5],[5,6],[6,3]]},
  {name:'白鳥の渡り道',subtitle:'夜空にも、帰り道がありました。',gift:'星を読むベンチに、最初のお客さん。',points:[[50,15],[49,42],[47,67],[44,86],[21,39],[76,48]],edges:[[0,1],[1,2],[2,3],[4,1],[1,5]]},
  {name:'こと座の便り',subtitle:'静かな夜に、ひとつの贈りもの。',gift:'小道に、月色の花が咲きました。',points:[[31,22],[46,40],[67,44],[60,72],[39,68]],edges:[[0,1],[1,2],[2,3],[3,4],[4,1]]},
];
export const discoveryCount=journey=>Math.min(STAR_PAGES.length,Math.floor((journey?.afterSteps||0)/600));
export const PHASES = [
  {id:'foundation',name:'基礎',from:0,to:.14},
  {id:'frame',name:'骨組み',from:.14,to:.39},
  {id:'shell',name:'壁・屋根',from:.39,to:.86},
  {id:'details',name:'仕上げ',from:.86,to:1},
];
export const BIOMES = {
  ...Object.fromEntries(Object.entries(REGIONS).map(([id,r])=>[id,{...r,subtitle:r.name+'に、小さな暮らしを。',next:r.name+'へ',description:r.trees.join('・')+'のある風景'}])),
  grove:{name:'木もれびの街',subtitle:'木陰に、本のある暮らし。',next:'木立の奥へ',description:'大きな木と、小さな読書庭園',ground:'#91a479',roof:'#668d85',water:'#92bdb4'},
  canal:{name:'水音の街',subtitle:'小さな橋の向こうに、寄り道。',next:'運河のほとりへ',description:'流れる水と、橋でつながる店先',ground:'#a5b188',roof:'#688d9a',water:'#83b9ba'},
  hill:{name:'花咲く丘',subtitle:'段々の庭に、季節を植える。',next:'花の丘へ',description:'石段を上って、花のあるテラス',ground:'#a9b480',roof:'#ae8270',water:'#9abbb0'},
};
export const KINDS = {
  ...Object.fromEntries(BUILDINGS.map(b=>[b.id,{name:b.name,label:b.name,effect:b.charm+'。',complete:b.name+'ができました。'+b.role+'場所が町に加わりました。'}])),
  books:{name:'本屋',label:'本屋',effect:'本屋と木陰がつながると、読書の庭に。',complete:'木陰に椅子が並び、読書の庭ができました。'},
  tea:{name:'喫茶室',label:'喫茶室',effect:'喫茶室の前庭が、ひと休みできるテラスに。',complete:'テラスにお茶の席ができました。'},
  flowers:{name:'花屋',label:'花屋',effect:'花屋のまわりに、小さな花の散歩道を。',complete:'花の散歩道に、蝶がやってきました。'},
  observatory:{name:'天文台',label:'天文台',effect:'石の小道の先に、星を待つ場所を。',complete:'ドームがひらきました。今夜、最初の星を探しましょう。'},
  lighthouse:{name:'灯台',label:'灯台',effect:'潮風の小道の先に、帰り道を照らす灯りを。',complete:'灯りがともりました。小さな船を待ちましょう。'},
};
export const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
export function hash(seed,x=0,y=0,z=0){let n=(seed^Math.imul(x,374761393)^Math.imul(y,668265263)^Math.imul(z,1442695041))>>>0;n=Math.imul(n^(n>>>13),1274126177);return((n^(n>>>16))>>>0)/4294967296;}
export function normalizeDesign(d={}){return{court:!!d.court,tower:['none','left','right'].includes(d.tower)?d.tower:'left',greenhouse:!!d.greenhouse,roof:['sage','clay','blue'].includes(d.roof)?d.roof:'sage'};}
export function freshDistrict(biome='grove',seed=41,id=1){return{id,biome:BIOMES[biome]?biome:'grove',seed,steps:0,kind:'books',design:normalizeDesign(),finishedOn:null};}
export function freshJourney(){return{...freshDistrict('grove',941,1),kind:'observatory',design:normalizeDesign({tower:'none'}),afterSteps:0};}
export function initialState(){const active=freshDistrict();active.steps=1872;return{version:1,active,archive:[],journey:freshJourney()};}
export function phaseAt(steps){const p=clamp(steps/TOTAL_STEPS,0,1);const index=p===1?3:PHASES.findIndex(s=>p<s.to);const phase=PHASES[index];return{index,...phase,local:clamp((p-phase.from)/(phase.to-phase.from),0,1),progress:p,complete:p===1};}
export function countsAt(counts,steps){const p=clamp(steps/TOTAL_STEPS,0,1);return PHASES.map((s,i)=>Math.floor(counts[i]*clamp((p-s.from)/(s.to-s.from),0,1)+1e-8));}
export function walk(state,steps){
  const n=Number(steps);if(!Number.isFinite(n)||n<0)return state;
  const active={...state.active,steps:clamp(state.active.steps+n,0,TOTAL_STEPS)};
  const prev=state.journey||freshJourney(),journey={...prev,steps:clamp(prev.steps+n,0,TOTAL_STEPS),afterSteps:clamp(prev.afterSteps+Math.max(0,prev.steps+n-TOTAL_STEPS),0,DISCOVERY_STEPS)};
  for(const d of [active,journey])if(d.steps===TOTAL_STEPS&&!d.finishedOn)d.finishedOn=new Date().toISOString().slice(0,10);
  return{...state,active,journey};
}
export function edit(state,patch){return{...state,active:{...state.active,design:normalizeDesign({...state.active.design,...patch})}};}
export function nextDistrict(state,biome){if(state.active.steps<TOTAL_STEPS||!BIOMES[biome])return state;const archived=structuredClone(state.active);return{...state,archive:[...state.archive,archived],active:freshDistrict(biome,(archived.seed*73+19)%99991,archived.id+1)};}
export function restore(raw){try{const s=typeof raw==='string'?JSON.parse(raw):raw;if(s?.version!==1||!Array.isArray(s.archive))return initialState();const clean=d=>{if(!d||!BIOMES[d.biome]||!KINDS[d.kind]||!Number.isFinite(d.steps)||!Number.isFinite(d.seed)||!Number.isFinite(d.id))throw Error('invalid save');return{...freshDistrict(d.biome,Math.floor(d.seed),Math.floor(d.id)),kind:d.kind,steps:clamp(d.steps,0,TOTAL_STEPS),design:normalizeDesign(d.design),finishedOn:typeof d.finishedOn==='string'?d.finishedOn:null};};
  const journey=freshJourney();
  if(s.journey&&Number.isFinite(s.journey.steps)){
    journey.steps=clamp(s.journey.steps,0,TOTAL_STEPS);journey.afterSteps=journey.steps===TOTAL_STEPS&&Number.isFinite(s.journey.afterSteps)?clamp(s.journey.afterSteps,0,DISCOVERY_STEPS):0;
    journey.finishedOn=typeof s.journey.finishedOn==='string'?s.journey.finishedOn:null;
  }
  return{version:1,active:clean(s.active),archive:s.archive.map(clean).filter(d=>d.steps===TOTAL_STEPS),journey};
}catch{return initialState();}}
