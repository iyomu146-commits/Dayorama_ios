import assert from 'node:assert/strict';
import {writeFile} from 'node:fs/promises';
import {createCafeCells} from './model.mjs';
import {buildCafeSurfaces,chamferBox,intactFinishUnit} from './surface-finish.mjs';
import {PALETTE} from './palette.mjs';
const cells=createCafeCells(),palette=Object.fromEntries(Object.keys(PALETTE).map(k=>[k,[.5,.5,.5]]));
const before=JSON.stringify([...cells]),grid=buildCafeSurfaces(cells,palette,{finish:false}),finished=buildCafeSurfaces(cells,palette,{finish:true});
assert.equal(JSON.stringify([...cells]),before,'The finish must not change editable cells');
const box=chamferBox([0,0,0,8,2,3],.22),edges=new Map();
for(let i=0;i<box.positions.length;i+=9){const keys=[0,3,6].map(j=>box.positions.slice(i+j,i+j+3).map(v=>v.toFixed(7)).join(','));for(let j=0;j<3;j++){const a=keys[j],b=keys[(j+1)%3],key=[a,b].sort().join('|');edges.set(key,(edges.get(key)||0)+1);}}
assert([...edges.values()].every(n=>n===2),'Chamfer must be watertight');assert.equal(box.positions.length/9,44);
for(const m of finished){assert([...m.positions,...m.normals,...m.colors,...m.surfaces].every(Number.isFinite));for(let i=0;i<m.normals.length;i+=3)assert(Math.abs(Math.hypot(...m.normals.slice(i,i+3))-1)<1e-5);}
assert.deepEqual(finished.map(m=>m.part),grid.map(m=>m.part));
for(const u of cells.finishUnits){
 assert(intactFinishUnit(u,cells),`Invalid source anchors: ${u.id}`);
 if(u.shape.tile)assert.equal(u.shape.box[3],4,'Roof tile width must match the half-width brief');
 if(u.shape.overlay){const {axis,sign,backPlane,box}=u.shape,near=box[axis],far=near+box[axis+3];assert(near<backPlane&&far>backPlane,'Facade relief must penetrate its continuous backing');assert((sign>0?far-backPlane:backPlane-near)<.4,'Relief must remain a shallow attached skin');}
}
const total=finished.reduce((n,m)=>n+m.triangles,0);assert(total<25000);
// An edited/deleted cell invalidates its containing finish unit, rather than leaving a ghost tile.
const unit=cells.finishUnits.find(u=>u.id.startsWith('tile')),changed=new Map(cells);changed.finishUnits=cells.finishUnits;changed.delete(unit.keys[0]);
const intact=cells.finishUnits.filter(u=>intactFinishUnit(u,changed));assert(!intact.includes(unit));
assert.doesNotThrow(()=>buildCafeSurfaces(changed,palette));
const painted=new Map(cells);painted.finishUnits=cells.finishUnits;const key=unit.keys[0];painted.set(key,{...painted.get(key),color:'wood'});assert(!intactFinishUnit(unit,painted));assert.doesNotThrow(()=>buildCafeSurfaces(painted,palette));
const report={cells:cells.size,gridTriangles:grid.reduce((n,m)=>n+m.triangles,0),finishedTriangles:total,finishUnits:cells.finishUnits.length,checks:['44-triangle chamfer is watertight','Finite vertices and unit normals','Same editable grid for all finishes','Partial voxel removal or painting invalidates affected finish unit','Roof tiles are four cells wide, half the previous width','Facade relief penetrates continuous backing and projects less than 0.4 cell','All finish source anchors match current cells','Same selectable part hierarchy','Under 25,000 surface triangles'],scope:'Geometry checks only; no visual-quality score or device performance claim.'};
await writeFile('evidence/finish-structure.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));
