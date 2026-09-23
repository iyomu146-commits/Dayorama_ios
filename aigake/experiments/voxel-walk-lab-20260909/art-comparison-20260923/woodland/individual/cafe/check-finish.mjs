import assert from 'node:assert/strict';
import {writeFile} from 'node:fs/promises';
import {createCafeCells,CELL} from './model.mjs';
import {FINISH_BEVEL} from './architectural-finish.mjs';
import {buildCafeSurfaces,chamferBox,intactFinishUnit} from './surface-finish.mjs';
import {PALETTE} from './palette.mjs';
const cells=createCafeCells(),palette=Object.fromEntries(Object.keys(PALETTE).map(k=>[k,[.5,.5,.5]]));
const before=JSON.stringify([...cells]),grid=buildCafeSurfaces(cells,palette,{finish:false}),finished=buildCafeSurfaces(cells,palette,{finish:true});
assert.equal(JSON.stringify([...cells]),before,'The finish must not change editable cells');
const box=chamferBox([0,0,0,8,2,3]),edges=new Map();
for(let i=0;i<box.positions.length;i+=9){const keys=[0,3,6].map(j=>box.positions.slice(i+j,i+j+3).map(v=>v.toFixed(7)).join(','));for(let j=0;j<3;j++){const a=keys[j],b=keys[(j+1)%3],key=[a,b].sort().join('|');edges.set(key,(edges.get(key)||0)+1);}}
assert([...edges.values()].every(n=>n===2),'Chamfer must be watertight');assert.equal(box.positions.length/9,44);
for(const m of finished){assert([...m.positions,...m.normals,...m.colors,...m.surfaces].every(Number.isFinite));for(let i=0;i<m.normals.length;i+=3)assert(Math.abs(Math.hypot(...m.normals.slice(i,i+3))-1)<1e-5);}
assert.deepEqual(finished.map(m=>m.part),grid.map(m=>m.part));
const owned=new Set();let finishBoxes=0;
for(const u of cells.finishUnits){
 assert(intactFinishUnit(u,cells),`Invalid source anchors: ${u.id}`);
 assert.equal(u.shape.bevel,FINISH_BEVEL,'Use the same small inward bevel everywhere');
 for(const k of ['overlay','relief','seed','backPlane'])assert(!(k in u.shape),`Off-grid finish metadata: ${u.id}/${k}`);
 const coverage=new Set();
 for(const b of u.shape.boxes||[u.shape.box]){
  finishBoxes++;
  assert(b.every(Number.isInteger)&&b.slice(3).every(v=>v>0),`Fractional component: ${u.id}`);
  if(u.shape.tile){assert.equal(b[3],4,'Keep half-width roof tiles');assert.equal(b[4],1,'Each roof layer is exactly one cell thick');}
  for(let x=b[0];x<b[0]+b[3];x++)for(let y=b[1];y<b[1]+b[4];y++)for(let z=b[2];z<b[2]+b[5];z++){
   const k=`${x},${y},${z}`;assert(!coverage.has(k),`Overlapping boxes: ${u.id}/${k}`);coverage.add(k);
  }
  const g=chamferBox(b,u.shape.bevel),lo=[Infinity,Infinity,Infinity],hi=[-Infinity,-Infinity,-Infinity];
  for(let i=0;i<g.positions.length;i++){const a=i%3,v=g.positions[i]/CELL;assert(v>=b[a]-1e-8&&v<=b[a]+b[a+3]+1e-8,`Finish leaves source volume: ${u.id}`);lo[a]=Math.min(lo[a],v);hi[a]=Math.max(hi[a],v);}
  for(let a=0;a<3;a++){assert(Math.abs(lo[a]-b[a])<1e-8);assert(Math.abs(hi[a]-b[a]-b[a+3])<1e-8,'Finish must retain the integer outer dimensions');}
 }
 assert.deepEqual([...coverage].sort(),[...u.keys].sort(),`Rendered component does not match editable cells: ${u.id}`);
 for(const k of u.keys){assert(!owned.has(k),`Cell belongs to multiple finish units: ${k}`);owned.add(k);}
}
assert.throws(()=>chamferBox([0,0,0,4,1.9,3]),/whole grid cells/);
assert.throws(()=>chamferBox([.03,0,0,4,2,3]),/whole grid cells/);
assert.throws(()=>chamferBox([0,0,0,4,2,3],.17),/shared grid allowance/);
// Internal facets are culled only when all face/edge/corner neighbours exist.
const solid=new Map();for(let x=-1;x<=1;x++)for(let y=-1;y<=1;y++)for(let z=-1;z<=1;z++)solid.set(`${x},${y},${z}`,true);
assert.equal(chamferBox([0,0,0,1,1,1],FINISH_BEVEL,solid).positions.length,0);
solid.delete('1,0,0');assert(chamferBox([0,0,0,1,1,1],FINISH_BEVEL,solid).positions.length>0);
const lone=new Map([['0,0,0',true]]);assert.deepEqual(chamferBox([0,0,0,1,1,1],FINISH_BEVEL,lone),chamferBox([0,0,0,1,1,1]));
const exploded=buildCafeSurfaces(cells,palette,{isolated:true});assert(exploded.reduce((n,m)=>n+m.triangles,0)>finished.reduce((n,m)=>n+m.triangles,0),'Exploded parts must recover contact faces');
const total=finished.reduce((n,m)=>n+m.triangles,0);assert(total<25000);
// An edited/deleted cell invalidates its containing finish unit, rather than leaving a ghost tile.
const unit=cells.finishUnits.find(u=>u.id.startsWith('tile')),changed=new Map(cells);changed.finishUnits=cells.finishUnits;changed.delete(unit.keys[0]);
const intact=cells.finishUnits.filter(u=>intactFinishUnit(u,changed));assert(!intact.includes(unit));
assert.doesNotThrow(()=>buildCafeSurfaces(changed,palette));
const painted=new Map(cells);painted.finishUnits=cells.finishUnits;const key=unit.keys[0];painted.set(key,{...painted.get(key),color:'wood'});assert(!intactFinishUnit(unit,painted));assert.doesNotThrow(()=>buildCafeSurfaces(painted,palette));
const report={cells:cells.size,cellSizeMetres:CELL,bevelInCells:FINISH_BEVEL,gridTriangles:grid.reduce((n,m)=>n+m.triangles,0),finishedTriangles:total,finishUnits:cells.finishUnits.length,finishBoxes,checks:['44-triangle unculled chamfer is watertight','Finite vertices and unit normals','Same editable grid for all finishes','Every component has integer coordinates and dimensions','Component boxes exactly cover their source cells without overlap','Finish stays inside source boxes and retains their outer dimensions','Shared small inward bevel; no fractional overlays or random transforms','Roof tiles remain four cells wide with one-cell layers','Interior facets cull only with complete neighbours; exploded parts recover contact faces','Partial voxel removal or painting invalidates affected finish unit','All finish source anchors match current cells','Same selectable part hierarchy','Under 25,000 surface triangles'],scope:'Geometry checks only; inward edge cuts intentionally differ from cube corners. No visual-quality score or device performance claim.'};
await writeFile('evidence/finish-structure.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));
