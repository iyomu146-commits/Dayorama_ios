import {TOTAL_STEPS,DISCOVERY_STEPS,STAR_PAGES,clamp,freshJourney as observatoryJourney} from './model.mjs';

export const HARBOR_PAGES=[
  {name:'最初の寄港',subtitle:'灯りをたよりに、小さな帆船がやってきた。',gift:'桟橋のそばに、帆船が停泊しました。',icon:'boat'},
  {name:'潮風の読書席',subtitle:'波の音を聞きながら、もう一ページ。',gift:'海を眺めるベンチに、本を読む人が来ました。',icon:'bench'},
  {name:'港の休日',subtitle:'風にはためく旗が、いつもの港を彩る。',gift:'桟橋に、休日の小さな旗が並びました。',icon:'flags'},
];
export const JOURNEYS={
  observatory:{number:'01',name:'天文台',label:'天文台',place:'星待ちの丘',title:'星を待つ場所。',intro:'丸いドームがひらく、その日まで。',description:'円い屋根と、小さな読書室',promise:'ドームがひらき、望遠鏡が星を探す。',afterTitle:'星を集める夜',journalTitle:'完成から、はじまる夜',collection:'星図',unit:'枚',shell:'丸いドーム',complete:'ドームがひらきました。ここから、星を集める夜へ。',pages:STAR_PAGES,milestones:['石の基礎','円い骨組み','銅緑のドーム','星を待つ場所'],afterDescription:'星図と庭の贈りもの',image:'./assets/journey-observatory.png'},
  lighthouse:{number:'02',name:'灯台',label:'灯台',place:'潮風の入り江',title:'帰り道を照らす灯り。',intro:'海に灯りがともる、その日まで。',description:'しま模様の塔と、木の桟橋',promise:'灯りが回り、小さな船が港を訪れる。',afterTitle:'港に届く便り',journalTitle:'完成から、育つ港',collection:'港の便り',unit:'通',shell:'塔と灯室',complete:'灯台に灯りがともりました。次は、最初の船を待ちましょう。',pages:HARBOR_PAGES,milestones:['石の基礎と桟橋','塔の骨組み','しま模様の塔','海を照らす灯り'],afterDescription:'港の便りと風景の変化',image:'./assets/journey-lighthouse.png'},
};
export const journeyInfo=d=>JOURNEYS[d?.kind]||JOURNEYS.observatory;
export function freshLandmark(kind){const d=observatoryJourney();return kind==='lighthouse'?{...d,kind,seed:1429,biome:'canal'}:d;}
export function cleanJourney(raw,kind=raw?.kind){
  const d=freshLandmark(Object.hasOwn(JOURNEYS,kind)?kind:'observatory');
  if(Number.isFinite(raw?.steps))d.steps=clamp(raw.steps,0,TOTAL_STEPS);
  if(d.steps===TOTAL_STEPS&&Number.isFinite(raw?.afterSteps))d.afterSteps=clamp(raw.afterSteps,0,DISCOVERY_STEPS);
  d.finishedOn=typeof raw?.finishedOn==='string'?raw.finishedOn:null;
  return d;
}
// Only the chosen journey receives new walks. Switching never consumes the
// town's held steps or copies progress from another journey.
export function selectJourney(state,kind){
  if(!Object.hasOwn(JOURNEYS,kind)||kind===state.journey.kind)return state;
  const journeyShelf={...state.journeyShelf,[state.journey.kind]:structuredClone(state.journey)};
  const journey=journeyShelf[kind]?cleanJourney(journeyShelf[kind],kind):freshLandmark(kind);
  delete journeyShelf[kind];
  return{...state,journey,journeyShelf};
}
export function restoreJourneyShelf(raw,selected){
  return Object.fromEntries(Object.keys(JOURNEYS).filter(k=>k!==selected&&raw?.[k]).map(k=>[k,cleanJourney(raw[k],k)]));
}
