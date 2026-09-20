export const STEPS_PER_BUILDING=20000;
export const completionStep=(b,budget)=>b.endStep??Math.ceil(b.end*budget-1e-8);

// Save the schedule per town so a balance change never removes earned buildings.
export function prepareConstruction(state,plan){
 if(state.construction)return state;
 const steps=Math.max(0,state.total-state.townStart),legacy=state.legacyPace&&steps>0;
 let cursor=0;
 const buildings=plan.buildings.map(b=>{
  let startStep=cursor,endStep=cursor+STEPS_PER_BUILDING;
  if(legacy){
   const oldStart=b.start*plan.walkBudget,oldEnd=completionStep(b,plan.walkBudget);
   if(oldEnd<=steps){startStep=Math.round(oldStart);endStep=oldEnd;}
   else if(oldStart<steps){
    const progress=(steps-oldStart)/(b.end*plan.walkBudget-oldStart);
    endStep=steps+Math.max(1,Math.floor((1-progress)*STEPS_PER_BUILDING));startStep=endStep-STEPS_PER_BUILDING;
   }
  }
  cursor=Math.max(cursor,endStep);return{id:b.id,startStep,endStep};
 });
 const {legacyPace,...rest}=state;
 return{...rest,construction:{stepsPerBuilding:STEPS_PER_BUILDING,buildings,sceneryAnchor:legacy?{before:Math.min(1,steps/plan.walkBudget),steps}:null}};
}

export function constructionPlan(plan,construction){
 const walkBudget=Math.max(...construction.buildings.map(b=>b.endStep));
 const buildings=plan.buildings.map(b=>{
  const schedule=construction.buildings.find(s=>s.id===b.id);
  if(!schedule)throw Error('建築予定を読み込めません');
  return{...b,...schedule,start:schedule.startStep/walkBudget,end:schedule.endStep/walkBudget};
 });
 const anchor=construction.sceneryAnchor;
 const birth=value=>{
  if(!anchor)return value;
  const after=Math.min(1,anchor.steps/walkBudget);
  return value<=anchor.before?value/anchor.before*after:after+(value-anchor.before)/(1-anchor.before)*(1-after);
 };
 return{...plan,walkBudget,buildings,trees:plan.trees.map(t=>({...t,birth:birth(t.birth)})),plants:plan.plants.map(p=>({...p,birth:birth(p.birth)}))};
}
