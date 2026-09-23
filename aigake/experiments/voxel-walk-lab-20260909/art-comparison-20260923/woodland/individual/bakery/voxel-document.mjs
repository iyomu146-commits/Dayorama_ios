import {CELL,PALETTE} from './model.mjs';
export function createVoxelDocument(cells){return {format:'dayorama-voxel-bakery',version:2,cellSize:CELL,stage:'individual-bakery-v1',palette:{...PALETTE},finish:'sharp-bakery-material-v1',reference:'woodland/references/crops/bakery.png',cells:[...cells.values()].map(c=>({...c}))};}
export function readVoxelDocument(doc){
 if(doc?.format!=='dayorama-voxel-bakery'||doc.version!==2||doc.cellSize!==CELL||!Array.isArray(doc.cells)||doc.cells.length>50000)throw Error('Unsupported bakery document');
 const cells=new Map();for(const c of doc.cells){
  if(![c.x,c.y,c.z].every(n=>Number.isInteger(n)&&Math.abs(n)<=256)||c.y<0||typeof c.part!=='string'||!Number.isInteger(c.phase)||c.phase<0||c.phase>4||!/^#[0-9a-f]{6}$/i.test(doc.palette?.[c.color]||''))throw Error('Invalid bakery cell');
  const key=[c.x,c.y,c.z].join(',');if(cells.has(key))throw Error('Duplicate bakery cell');cells.set(key,{...c});
 }return {cells,palette:{...doc.palette},cellSize:CELL,finish:doc.finish};
}
