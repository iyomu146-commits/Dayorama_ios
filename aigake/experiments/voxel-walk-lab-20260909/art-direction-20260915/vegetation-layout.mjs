// Rotation-independent envelopes of the real voxel geometry, one band per
// height. A low plant can stand below a crown without entering its trunk.
export function vegetationShape(cells,u){
 const radii=new Map();
 for(const c of cells){const r=Math.hypot(Math.abs(c.x)+.5,Math.abs(c.z)+.5)*u;radii.set(c.y,Math.max(radii.get(c.y)||0,r));}
 const bands=[...radii].sort(([a],[b])=>a-b).map(([y,r])=>({min:y*u,max:(y+1)*u,r:r+.025}));
 return{bands,r:Math.max(...bands.map(b=>b.r)),min:bands[0]?.min??0,max:bands.at(-1)?.max??0};
}
export function vegetationOverlap(a,b,gap=.025){
 const d=Math.hypot(a.x-b.x,a.z-b.z);
 if(d>=a.shape.r+b.shape.r+gap||a.y+a.shape.max<=b.y+b.shape.min||b.y+b.shape.max<=a.y+a.shape.min)return false;
 return a.shape.bands.some(p=>b.shape.bands.some(q=>a.y+p.min<b.y+q.max&&a.y+p.max>b.y+q.min&&d<p.r+q.r+gap));
}
export function vegetationHitsBox(a,b,gap=.025){
 const d=Math.hypot(Math.max(0,b.min[0]-a.x,a.x-b.max[0]),Math.max(0,b.min[2]-a.z,a.z-b.max[2]));
 return a.shape.bands.some(p=>a.y+p.min<b.max[1]&&a.y+p.max>b.min[1]&&d<p.r+gap);
}
export function sceneryBoxes(buildings,boxes){
 return[
  ...buildings.map(b=>({min:[b.bounds.min[0],b.base,b.bounds.min[1]],max:[b.bounds.max[0],b.y+(b.bp.bounds.max[1]+.5)*b.u,b.bounds.max[1]]})),
  ...boxes.filter(b=>!['base','land','water'].includes(b.kind)).map(b=>({min:[b.x-b.w/2,b.y-b.h/2,b.z-b.d/2],max:[b.x+b.w/2,b.y+b.h/2,b.z+b.d/2]}))
 ];
}
export function spaceGroundPlants(plan){
 const shapes=new Map(),shapeFor=p=>{
  const key=p.kind+':'+p.u;
  if(!shapes.has(key))shapes.set(key,vegetationShape(plan.prototypes[p.kind],p.u));
  return shapes.get(key);
 };
 const trees=plan.trees.map(t=>({...t,shape:vegetationShape(plan.treePrototypes[t.variant],t.u)})),obstacles=sceneryBoxes(plan.buildings,plan.boxes),accepted=[],ids=new Set();
 // Keep the few authored root mushrooms before filling the remaining gaps.
 const candidates=[...plan.plants.filter(p=>p.kind==='mushroom'),...plan.plants.filter(p=>p.kind!=='mushroom')];
 for(const p of candidates){
  const a={...p,shape:shapeFor(p)};
  if(trees.some(t=>vegetationOverlap(a,t))||accepted.some(b=>vegetationOverlap(a,b))||obstacles.some(b=>vegetationHitsBox(a,b)))continue;
  let blocked=false;
  for(let i=0;i<12;i++){
   const angle=i*Math.PI/6,x=p.x+Math.cos(angle)*a.shape.r,z=p.z+Math.sin(angle)*a.shape.r;
   if(!plan.inside(x,z)||plan.wet(x,z)!==plan.wet(p.x,p.z)||plan.deck(x,z)!==null||plan.onPath(x,z)||Math.abs(plan.surface(x,z)-p.y)>.025){blocked=true;break;}
  }
  if(blocked)continue;
  p.clearanceRadius=a.shape.r;accepted.push(a);ids.add(p.id);
 }
 return plan.plants.filter(p=>ids.has(p.id));
}
