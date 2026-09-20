import {dayKey,townSteps} from './state.mjs';
import {completionStep} from './construction.mjs';
import {BY_ID} from '../experiments/voxel-walk-lab-20260909/content/catalog.mjs';
import {platform} from './health.mjs';

export function widgetSnapshot(state,plan,now=new Date()){
 if(state.source!=='health')return null;
 const steps=townSteps(state),completed=plan.buildings.filter(b=>steps>=completionStep(b,plan.walkBudget)),b=plan.buildings.find(b=>steps<completionStep(b,plan.walkBudget)),start=b&&(b.startStep??b.start*plan.walkBudget),end=b&&completionStep(b,plan.walkBudget);
 return{version:1,day:dayKey(now),timeZone:Intl.DateTimeFormat().resolvedOptions().timeZone,todaySteps:state.records[dayKey(now)]?.steps??null,syncedAt:state.lastDataSync?Date.parse(state.lastDataSync):null,updatedAt:now.getTime(),region:plan.p?.name||state.region,building:b?(b.name||BY_ID[b.kind]?.name||'建物'):'町の全景',completedBuildings:completed.length,totalBuildings:plan.buildings.length,progress:b?Math.max(0,Math.min(1,(steps-start)/(end-start))):1,remainingSteps:b?Math.max(0,end-steps):0};
}
export function widgetSignature(snapshot,seed){const {updatedAt,...stable}=snapshot;return JSON.stringify([seed,stable]);}
let bridge;
export async function publishWidget(snapshot,images){
 if(platform()!=='ios'||!snapshot)return false;
 if(!bridge){const {registerPlugin}=await import('./capacitor-core.js');bridge=registerPlugin('WidgetBridge');}
 const png=data=>{if(!data?.startsWith('data:image/png;base64,'))throw Error('ウィジェットの画像を作成できません');return data.slice('data:image/png;base64,'.length);};
 await bridge.publish({snapshot:{...snapshot,townImage:png(images.town),buildingImage:png(images.building)}});return true;
}
