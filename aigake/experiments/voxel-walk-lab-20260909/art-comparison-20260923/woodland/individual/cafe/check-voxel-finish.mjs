import assert from 'node:assert/strict';
import {writeFile} from 'node:fs/promises';
import {createCafeCells,CELL} from './model.mjs';
import {FINISH_BEVEL} from './architectural-finish.mjs';
import {buildCafeSurfaces} from './surface-finish.mjs';
import {PALETTE} from './palette.mjs';

const palette=Object.fromEntries(Object.keys(PALETTE).map((k,i)=>[k,[.1+i*.001,.3,.5]]));
const compile=(cells,isolated=false)=>buildCafeSurfaces(cells,palette,{unit:'voxel',isolated});
const key=c=>`${c.x},${c.y},${c.z}`,total=meshes=>meshes.reduce((n,m)=>n+m.triangles,0);
const cells=createCafeCells(),before=JSON.stringify([...cells]),meshes=compile(cells);
assert.equal(JSON.stringify([...cells]),before,'Rendering must not change editable cells');
assert.equal(meshes.reduce((n,m)=>n+m.sourceCells,0),cells.size);
assert.deepEqual(meshes.map(m=>m.part),[...new Set([...cells.values()].map(c=>c.part))]);
// Long components must not leak into this mode: every triangle fits one cell,
// and each coordinate uses only an integer boundary or the shared inward bevel.
for(const m of meshes){
 for(const data of [m.positions,m.normals,m.colors,m.surfaces])assert(data.every(Number.isFinite));
 for(let i=0;i<m.positions.length;i+=9)for(let a=0;a<3;a++){
  const values=[0,3,6].map(j=>m.positions[i+j+a]/CELL);
  assert(Math.max(...values)-Math.min(...values)<=1+1e-5,'A rendered triangle spans multiple voxels');
  for(const v of values){const fraction=v-Math.floor(v);assert([0,FINISH_BEVEL,1-FINISH_BEVEL,1].some(f=>Math.abs(fraction-f)<1e-5),'A cell uses different scale, bevel or offset');}
 }
 for(let i=0;i<m.normals.length;i+=3)assert(Math.abs(Math.hypot(...m.normals.slice(i,i+3))-1)<1e-5);
}
// An isolated cell must have exactly the same dimensions for all materials.
const sampleColors=['slate','plaster','wood','glass','leaf','ivory','brick','stone'],samples=new Map();
sampleColors.forEach((color,i)=>{const c={x:i*3-12,y:2,z:-3,color,part:color};samples.set(key(c),c);});
for(const m of compile(samples)){
 const c=[...samples.values()].find(c=>c.part===m.part);assert.equal(m.triangles,44);
 for(let a=0;a<3;a++){
  const values=Array.from(m.positions).filter((_,i)=>i%3===a),origin=[c.x,c.y,c.z][a]*CELL;
  assert(Math.abs(Math.min(...values)-origin)<1e-6);assert(Math.abs(Math.max(...values)-origin-CELL)<1e-6);
 }
 for(let i=0;i<m.colors.length;i++)assert(Math.abs(m.colors[i]-palette[c.color][i%3])<1e-6,'Preserve individual cell paint');
}
const block=new Map();for(let x=0;x<3;x++)for(let y=0;y<3;y++)for(let z=0;z<3;z++){const c={x,y,z,part:'wall',color:'plaster'};block.set(key(c),c);}
const solid=compile(block);assert.equal(solid[0].visibleCells,26,'A completely enclosed cell must not be rendered');
block.delete('1,1,1');assert(total(compile(block))>total(solid),'Deleting a cell must reveal its neighbours');
const pair=new Map([['0,0,0',{x:0,y:0,z:0,part:'wall',color:'plaster'}],['1,0,0',{x:1,y:0,z:0,part:'roof',color:'slate'}]]);
assert.equal(total(compile(pair)),84);assert.equal(total(compile(pair,true)),88,'Exploded parts must restore contact faces');
const unchanged=compile(pair);pair.finishUnits=[{shape:{box:[0,0,0,90,.01,90]}}];
assert.deepEqual(compile(pair),unchanged,'Component finish metadata must not affect individual cubes');
pair.set('0,0,0',{...pair.get('0,0,0'),color:'wood'});const painted=compile(pair);
assert.deepEqual(painted[0].positions,unchanged[0].positions);assert.notDeepEqual(painted[0].colors,unchanged[0].colors);

const component=buildCafeSurfaces(cells,palette),report={cells:cells.size,cellSizeMetres:CELL,bevelInCells:FINISH_BEVEL,voxelTriangles:total(meshes),componentTriangles:total(component),geometryRatio:total(meshes)/total(component),partMeshes:meshes.length,exposedCells:meshes.reduce((n,m)=>n+m.visibleCells,0),checks:['All materials use identical one-cell dimensions and bevel','No triangles span multiple cells','Original cell colors and editable data preserved','No fractional scale or position jitter','Fully enclosed cells and contact faces culled','Deleting cells reveals neighbours; paint changes only color','Exploded parts recover contact faces','Component finish metadata has no effect','Finite geometry and unit normals'],scope:'Comparison prototype. The 25,000-triangle component budget does not pass for this geometric per-cell finish. iPhone FPS, memory and thermal behaviour not measured.'};
await writeFile('evidence/voxel6-structure.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));
