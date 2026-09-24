import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createBakeryCells,CELL,PALETTE} from './model.mjs';
import {groundedCells} from '../../../density-core.mjs';
const stage=process.argv[2]||'structure',cells=createBakeryCells({stage}),checks=[];
function check(name,f){f();checks.push(name);}
check('All cells are unique integer 15cm cells with valid colours',()=>{assert.equal(CELL,.15);for(const [k,c] of cells){assert.equal(k,[c.x,c.y,c.z].join(','));assert([c.x,c.y,c.z].every(Number.isInteger));assert(c.y>=0);assert(PALETTE[c.color]);}});
check('Every cell is face-connected to ground',()=>assert.equal(groundedCells(cells).size,cells.size));
check('Shop glazing has no centre mullions or masonry backing',()=>{for(const [x,y,z,w,h] of [[-17,4,12,13,14],[8,4,12,9,14],[23,6,10,5,8]])for(let i=x+1;i<x+w-1;i++)for(let j=y+1;j<y+h-1;j++){assert(cells.get(`${i},${j},${z}`)?.color.startsWith('glass'));assert(!cells.has(`${i},${j},${z-1}`));}});
check('Front approach stays clear below the awning',()=>{for(let x=-2;x<7;x++)for(let y=1;y<17;y++)for(let z=15;z<29;z++)assert(!cells.has(`${x},${y},${z}`));});
check('Side door approach stays clear',()=>{for(let x=31;x<36;x++)for(let y=1;y<14;y++)for(let z=-5;z<3;z++)assert(!cells.has(`${x},${y},${z}`));});
check('Chimney has an open mouth and a sealed bottom',()=>{for(let x=2;x<5;x++)for(let z=-8;z<-5;z++){for(let y=36;y<43;y++)assert(!cells.has(`${x},${y},${z}`));assert(cells.has(`${x},35,${z}`));}});
check('Roof fully covers the main shop and wing without open seams',()=>{for(let x=-20;x<20;x++)for(let z=-14;z<14;z++){let roof=false;for(let y=23;y<42;y++)if(['roof','ridge','chimney'].includes(cells.get(`${x},${y},${z}`)?.part))roof=true;assert(roof);}for(let x=20;x<30;x++)for(let z=-10;z<12;z++){let roof=false;for(let y=17;y<24;y++)if(cells.get(`${x},${y},${z}`)?.part==='wing-roof')roof=true;assert(roof);}});
check('All bread is supported by bread or its own display bin',()=>{for(const c of cells.values())if(c.part.startsWith('bread-')){const below=cells.get(`${c.x},${c.y-1},${c.z}`);assert(below&&[c.part,c.part.replace('bread','stall')].includes(below.part));}});
if(['optimization','roof-seams','roof-pairs'].includes(stage)){
 check('Every main roof course is continuous across its full width, including below the ridge',()=>{
  for(let x=-23;x<23;x++)for(let z=-17;z<17;z++){
   const y=25+Math.round(Math.floor((16.5-Math.abs(z+.5))/3)*2.4);
   assert(['roof','ridge','chimney','chimney-rim'].includes(cells.get(`${x},${y},${z}`)?.part),`Recessed or missing tile at ${x},${y},${z}`);
  }
 });
 check('Annex roof has continuous courses without recessed strips',()=>{
  for(let x=19;x<33;x++)for(let z=-12;z<14;z++){
   const part=cells.get(`${x},${22-Math.floor((x-19)/4)},${z}`)?.part;
   assert(part==='wing-roof'||(x===19&&part==='gable')||(x<=20&&z===13&&part==='fascia'),`Annex groove at ${x},${z}`);
  }
 });
}
if(stage==='roof-pairs')check('Paired main and annex tiles preserve geometry and all non-roof cells',()=>{
 const previous=createBakeryCells({stage:'roof-seams'});assert.equal(cells.size,previous.size);
 for(const [key,c] of cells){const old=previous.get(key);assert(old);assert.deepEqual({...c,color:old.color},old);if(!['roof','wing-roof'].includes(c.part))assert.equal(c.color,old.color);}
 for(let row=0;row<5;row++)for(let x=-23;x+4<23;x+=5){const y=25+Math.round(row*2.4),z=16-row*3,a=[0,1,2,3,4].map(i=>cells.get(`${x+i},${y},${z}`));assert(a.every(Boolean));assert.equal(a[0].color,a[1].color);assert.equal(a[2].color,a[3].color);assert.notEqual(a[0].color,a[2].color);assert.equal(a[4].color,'tileJoint');}
 for(let z=-12;z+4<14;z+=5){const a=[0,1,2,3,4].map(i=>cells.get(`31,19,${z+i}`));assert(a.every(Boolean));assert.equal(a[0].color,a[1].color);assert.equal(a[2].color,a[3].color);assert.notEqual(a[0].color,a[2].color);assert.equal(a[4].color,'tileJoint');}
});
const report={stage,passed:true,cells:cells.size,parts:[...new Set([...cells.values()].map(c=>c.part))],checks};fs.writeFileSync(`evidence/${stage}-structure.json`,JSON.stringify(report,null,2));console.log(JSON.stringify(report));
