// Reuse only the finish math. Cafe-specific cell/part classifications are NOT reused.
import {installMaterialStudy} from '../cafe/material-study.mjs';
export {installMaterialStudy};
export function homeSubstance(color){
 if(color.startsWith('slate'))return 1;
 if(color.startsWith('wood')||color==='rail')return 2;
 if(color.startsWith('glass'))return 3;
 if(color.startsWith('brick'))return 4;
 if(color.startsWith('stone')||color==='ivory')return 5;
 if(color==='metal')return 9;
 return 0; // Home cream and sage are plaster, never leaves.
}
export function homeChannels(mesh,cells,cellSize){
 const out=new Float32Array(mesh.positions.length/3*2);
 for(let i=0;i<mesh.positions.length;i+=9){
  const q=[0,1,2].map(a=>Math.floor((mesh.positions[i+a]+mesh.positions[i+3+a]+mesh.positions[i+6+a])/(3*cellSize)-mesh.normals[i+a]*.0001)),cell=cells.get(q.join(','));
  if(!cell)throw Error('Missing home material source at '+q);
  let axis=1;
  if(cell.color==='rail'&&(cell.y===21||cell.y===24))axis=cell.part==='rail-side'?2:0;
  if(cell.part==='roof')axis=2;
  const id=homeSubstance(cell.color); // Deliberately never shader id 10: cafe tile coordinates.
  for(let v=0;v<3;v++)out.set([id,axis],(i/3+v)*2);
 }
 return out;
}
