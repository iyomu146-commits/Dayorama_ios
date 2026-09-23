// Reuse only the finish math. Cafe-specific cell/part classifications are NOT reused.
import {installMaterialStudy as installSharedFinish} from '../cafe/material-study.mjs';
export function installMaterialStudy(material){
 installSharedFinish(material);const shared=material.onBeforeCompile;
 material.onBeforeCompile=shader=>{
  shared(shader);
  function replace(before,after){if(!shader.fragmentShader.includes(before))throw Error('Shared finish changed: '+before);shader.fragmentShader=shader.fragmentShader.replace(before,after);}
  replace('float tile=craftIs(10.);','float tile=craftIs(10.); float bread=craftIs(11.);');
  replace('wallUV.y/.15','wallUV.y/.30');
  replace('wallUV.y/.15','wallUV.y/.30');
  replace('roughnessFactor=clamp(','roughnessFactor=clamp(.91*bread+');
  replace('// Only the lighting normal changes.',`diffuseColor.rgb*=1.+bread*(middle-.5)*.07;
 // Only the lighting normal changes.`);
  replace('float relief=microDetail*(','float relief=microDetail*(bread*fineFade*(fine-.5)*.0005+');
 };
 material.customProgramCacheKey=()=> 'bakery-local-finish-v1';
}
export function bakerySubstance(color){
 if(color.startsWith('tile'))return 1;
 if(color.startsWith('wood'))return 2;
 if(color.startsWith('glass'))return 3;
 if(color.startsWith('brick'))return 4;
 if(color.startsWith('stone'))return 5;
 if(color.startsWith('leaf'))return 7;
 if(color.startsWith('cloth'))return 8;
 if(color.startsWith('bread'))return 11;
 if(color==='metal')return 9;
 return 0;
}
export function bakeryChannels(mesh,cells,cellSize){
 const out=new Float32Array(mesh.positions.length/3*2);
 for(let i=0;i<mesh.positions.length;i+=9){
  const q=[0,1,2].map(a=>Math.floor((mesh.positions[i+a]+mesh.positions[i+3+a]+mesh.positions[i+6+a])/(3*cellSize)-mesh.normals[i+a]*.0001)),cell=cells.get(q.join(','));
  if(!cell)throw Error('Missing bakery material source at '+q);
  let axis=1;
  if((cell.part.startsWith('stall')||cell.part.startsWith('pot'))&&cell.y%3!==1)axis=0;
  if(cell.part==='roof')axis=2;
  const id=bakerySubstance(cell.color); // Deliberately never shader id 10: cafe tile coordinates.
  for(let v=0;v<3;v++)out.set([id,axis],(i/3+v)*2);
 }
 return out;
}
