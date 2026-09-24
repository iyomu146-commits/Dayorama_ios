// Reuse only the finish math. Cafe-specific cell/part classifications are NOT reused.
import {installMaterialStudy as installSharedFinish} from '../cafe/material-study.mjs';
export function installMaterialStudy(material){
 installSharedFinish(material);const shared=material.onBeforeCompile;
 material.onBeforeCompile=shader=>{
  shared(shader);
  function replace(before,after){if(!shader.fragmentShader.includes(before))throw Error('Shared finish changed: '+before);shader.fragmentShader=shader.fragmentShader.replace(before,after);}
  replace('float tile=craftIs(10.);','float tile=craftIs(10.); float masonry=craftIs(12.);');
  replace('stone=craftIs(5.)','stone=craftIs(5.)+masonry');
  replace('wallUV.y/.15','wallUV.y/.30');
  replace('wallUV.y/.15','wallUV.y/.30');
  replace('diffuseColor.rgb*=1.+stone*',`diffuseColor.rgb*=1.-masonry*microDetail*mesoFade*mortar*.08;
 diffuseColor.rgb*=1.+stone*`);
  replace('float relief=microDetail*(','float relief=microDetail*(-masonry*mesoFade*mortar*.0007+');
 };
 material.customProgramCacheKey=()=> 'books-local-finish-v1';
}
export function booksSubstance(color){
 if(color.startsWith('tile'))return 1;
 if(color.startsWith('wood'))return 2;
 if(color.startsWith('glass'))return 3;
 if(color.startsWith('masonry'))return 12;
 if(color.startsWith('pot'))return 6;
 if(color.startsWith('paper'))return 8;
 if(color.startsWith('stone'))return 5;
 if(color.startsWith('leaf'))return 7;
 if(color.startsWith('cloth'))return 8;
 if(color==='metal')return 9;
 return 0;
}
export function booksChannels(mesh,cells,cellSize){
 const out=new Float32Array(mesh.positions.length/3*2);
 for(let i=0;i<mesh.positions.length;i+=9){
  const q=[0,1,2].map(a=>Math.floor((mesh.positions[i+a]+mesh.positions[i+3+a]+mesh.positions[i+6+a])/(3*cellSize)-mesh.normals[i+a]*.0001)),cell=cells.get(q.join(','));
  if(!cell)throw Error('Missing books material source at '+q);
  let axis=1;
  if((cell.part==='bench'||cell.part==='shelf')&&cell.y%3!==1)axis=0;
  if(cell.part==='roof')axis=2;
  const id=booksSubstance(cell.color); // Deliberately never shader id 10: cafe tile coordinates.
  for(let v=0;v<3;v++)out.set([id,axis],(i/3+v)*2);
 }
 return out;
}
