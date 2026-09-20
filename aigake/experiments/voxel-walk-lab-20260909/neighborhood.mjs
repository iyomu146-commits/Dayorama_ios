import {TOTAL_STEPS,BIOMES,KINDS,clamp,hash,normalizeDesign,freshDistrict as oldDistrict,freshJourney,restore as oldRestore,walk as oldWalk} from './model.mjs';
import {cleanJourney,restoreJourneyShelf} from './journeys.mjs';
import {IMPLEMENTED_IDS,availableBuildings,AVAILABLE_REGIONS} from './content/blueprints.mjs';
import {BY_ID,REGIONS} from './content/catalog.mjs';
import {advanceLife,reconcileLife,cleanLife} from './life/state.mjs';
export * from './model.mjs';
export const LOT_STEPS=1600,LOT_COUNT=3;
export const SHOP_KINDS=IMPLEMENTED_IDS.filter(id=>!BY_ID[id].journey);
export const budgetOf=d=>d.kind==='observatory'?TOTAL_STEPS:d.budget||TOTAL_STEPS;
export const buildingComplete=d=>d.steps>=budgetOf(d);
export const isNeighborhood=d=>d.layout==='neighborhood';
export const completedCount=d=>(d.completed?.length||0)+(buildingComplete(d)?1:0);
export const districtComplete=d=>buildingComplete(d)&&(!isNeighborhood(d)||completedCount(d)===LOT_COUNT);
export const visualSteps=d=>d.steps/budgetOf(d)*TOTAL_STEPS;
export const townSteps=d=>(d.completed||[]).reduce((n,b)=>n+budgetOf(b),0)+d.steps;
export const townBudget=d=>(d.completed||[]).reduce((n,b)=>n+budgetOf(b),0)+budgetOf(d)+(isNeighborhood(d)?LOT_COUNT-1-(d.completed?.length||0):0)*LOT_STEPS;
export function freshDistrict(biome='grove',seed=41,id=1){return{...oldDistrict(biome,seed,id),design:normalizeDesign({tower:'none'}),budget:LOT_STEPS,layout:'neighborhood',completed:[]};}
export function initialState(){return{version:2,active:freshDistrict(),archive:[],journey:freshJourney(),bank:0,life:cleanLife()};}
export function changeRegion(state,biome){
  const d=state.active;
  if(!d.collection||!AVAILABLE_REGIONS.includes(biome)||d.steps>0||d.completed.length>0)return state;
  return{...state,active:{...freshDistrict(biome,d.seed,d.id),collection:true,kind:availableBuildings(biome)[0]}};
}
export function lotPlacements(seed=41){
  return[[-3.2,1.6],[-3.2,-3],[2.65,-2.5]].map(([x,z],i)=>({x:x+(hash(seed,i,51)-.5)*.18,z:z+(hash(seed,i,52)-.5)*.18,s:.57}));
}
const finishedDate=()=>new Date().toISOString().slice(0,10);
function applyTownSteps(state,n){
  const room=Math.max(0,budgetOf(state.active)-state.active.steps),used=Math.min(room,n),active={...state.active,steps:state.active.steps+used};
  if(buildingComplete(active)&&!active.finishedOn)active.finishedOn=finishedDate();
  return{...state,active,bank:(state.bank||0)+n-used};
}
export function walk(state,steps){
  const n=Number(steps);if(!Number.isFinite(n)||n<0)return state;
  // Journey uses the existing 4,800-step contract, independently of town slots.
  const journey=oldWalk({...state,active:{...state.active,steps:0}},n).journey;
  return advanceLife(state,{...applyTownSteps({...state,bank:0},n+(state.bank||0)),journey},n);
}
function consumeBank(state){const bank=state.bank||0;return advanceLife(state,applyTownSteps({...state,bank:0},bank),0);}
export function chooseBuilding(state,kind){
  const d=state.active;if(!d.collection&&!['books','tea','flowers'].includes(kind))return state;if(!SHOP_KINDS.includes(kind)||!isNeighborhood(d)||districtComplete(d))return state;
  if(d.collection&&BY_ID[kind].region!==d.biome)return state;
  if(d.steps===0)return consumeBank({...state,active:{...d,kind}});
  if(!buildingComplete(d))return state;
  const saved={kind:d.kind,design:structuredClone(d.design),steps:d.steps,budget:budgetOf(d),finishedOn:d.finishedOn,seed:d.seed+(d.completed.length*101)};
  const roofs={books:'sage',tea:'clay',flowers:'blue'};
  const active={...d,steps:0,budget:LOT_STEPS,kind,finishedOn:null,completed:[...d.completed,saved],design:normalizeDesign({tower:'none',roof:roofs[kind]})};
  return consumeBank({...state,active});
}
export function edit(state,patch){return{...state,active:{...state.active,design:normalizeDesign({...state.active.design,...patch})}};}
export function nextDistrict(state,biome){
  if(!districtComplete(state.active)||!BIOMES[biome])return state;
  if(state.active.collection&&!AVAILABLE_REGIONS.includes(biome))return state;
  const archived=structuredClone(state.active);
  // Held steps wait for an explicit shop choice in the new district.
  return{...state,archive:[...state.archive,archived],active:{...freshDistrict(biome,(archived.seed*73+19)%99991,archived.id+1),...(archived.collection?{collection:true,kind:availableBuildings(biome)[0]}:{})}};
}
export function builtKinds(d,includeCurrent=buildingComplete(d)){return[...(d.completed||[]).map(b=>b.kind),...(includeCurrent?[d.kind]:[])];}
export function streetStory(kinds){
  if(kinds.some(k=>!['books','tea','flowers'].includes(k))){const names=kinds.map(k=>BY_ID[k]?.name||KINDS[k].name);return{title:kinds.length===3?(REGIONS[BY_ID[kinds[0]].region].name+'の広場'):names.at(-1)+'のある小道',text:names.join('、')+'。それぞれの営みが、小道でつながります。',effect:'collection-'+kinds.join('-')};}
  const n=k=>kinds.filter(v=>v===k).length,books=n('books'),tea=n('tea'),flowers=n('flowers');
  if(!kinds.length)return{title:'はじまりの小道',text:'最初のお店ができると、小道に暮らしが生まれます。',effect:'empty'};
  if(books&&tea&&flowers)return{title:'寄り道の広場',text:'花を選び、本をひらいて、お茶をひと口。3つのお店が小さな広場を囲みます。',effect:'square'};
  if(books&&tea)return{title:'読書喫茶',text:'本屋と喫茶室がつながり、外のテーブルで本を読む人が増えました。',effect:'reading-cafe'};
  if(books&&flowers)return{title:'花と本の庭',text:'花屋から届いた花で、木陰の読書ベンチを囲みました。',effect:'reading-garden'};
  if(tea&&flowers)return{title:'花香るテラス',text:'花に囲まれたお茶の席に、ひと休みする人が集まります。',effect:'flower-cafe'};
  if(books)return{title:books>1?'本の散歩道':'読書庭園',text:books>1?'本のワゴンと読書の席が、小道に並びました。':'最初の読書ベンチに、小さなお客さんがやってきました。',effect:'books'};
  if(tea)return{title:tea>1?'お茶の小径':'ひと休みのテラス',text:tea>1?'小道にいくつもお茶の席。今日はどこでひと休みしましょう。':'テーブルに湯のみが並び、ひと休みできる場所ができました。',effect:'tea'};
  return{title:flowers>1?'花の散歩道':'花の庭',text:flowers>1?'小道をつなぐ花壇に、蝶が遊びに来ています。':'花壇に色が加わり、花を眺める人がやってきました。',effect:'flowers'};
}
export function choiceStory(d,kind){
  const kinds=builtKinds(d);return streetStory([...kinds,kind]);
}
export function restore(raw){
  try{
    const s=typeof raw==='string'?JSON.parse(raw):raw;if(!s)return initialState();
    if(s.version===1){
      const old=oldRestore(s),valid=s.active&&BIOMES[s.active.biome]&&SHOP_KINDS.includes(s.active.kind)&&Number.isFinite(s.active.steps);
      if(!valid)return initialState();
      return reconcileLife({version:2,active:{...old.active,layout:'neighborhood',completed:[],budget:TOTAL_STEPS},archive:old.archive.map(d=>({...d,layout:'legacy',budget:TOTAL_STEPS,completed:[]})),journey:old.journey,bank:0});
    }
    if(s.version!==2||!Array.isArray(s.archive))return initialState();
    const cleanBuilding=d=>{
      if(!d||!SHOP_KINDS.includes(d.kind)||!Number.isFinite(d.steps)||!Number.isFinite(d.seed))throw Error('invalid building');
      const budget=[LOT_STEPS,TOTAL_STEPS].includes(d.budget)?d.budget:LOT_STEPS;
      return{kind:d.kind,seed:Math.floor(d.seed),design:normalizeDesign(d.design),steps:clamp(d.steps,0,budget),budget,finishedOn:typeof d.finishedOn==='string'?d.finishedOn:null};
    };
    const cleanDistrict=d=>{
      if(!BIOMES[d?.biome]||!Number.isFinite(d.id))throw Error('invalid district');
      const current=cleanBuilding(d),layout=d.layout==='legacy'?'legacy':'neighborhood';
      const completed=layout==='legacy'?[]:(d.completed||[]).slice(0,2).map(cleanBuilding);
      if(completed.some(b=>!buildingComplete(b)))throw Error('unfinished saved neighbor');
      return{...oldDistrict(d.biome,current.seed,Math.floor(d.id)),...current,layout,completed,...(d.collection===true?{collection:true}:{})};
    };
    const active=cleanDistrict(s.active),archive=s.archive.map(cleanDistrict).filter(districtComplete);
    const journey=cleanJourney(s.journey);
    return reconcileLife({version:2,active,archive,journey,bank:Number.isFinite(s.bank)?Math.max(0,s.bank):0,life:cleanLife(s.life),...(s.journeyShelf?{journeyShelf:restoreJourneyShelf(s.journeyShelf,journey.kind)}:{})});
  }catch{return initialState();}
}
