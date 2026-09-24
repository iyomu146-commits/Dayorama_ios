import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createHomeCells,CELL,PALETTE} from './model.mjs';
import {groundedCells,meshChunk} from '../../../density-core.mjs';
const stage=process.argv[2]||'structure',cells=createHomeCells({stage}),checks=[];
function check(name,f){f();checks.push(name);}
check('Uniform integer 15cm cells with defined palette',()=>{for(const c of cells.values()){assert([c.x,c.y,c.z].every(Number.isInteger));assert(c.y>=0);assert(PALETTE[c.color]);}});
check('Every cell face-connected to ground',()=>assert.equal(groundedCells(cells).size,cells.size));
check('Five glass openings without centre mullions or wall behind',()=>{
 for(const [x,y,z,side] of [[-15,5,14,false],[-15,22,14,false],[4,22,14,false],[18,5,-4,true],[18,22,-4,true]])for(let u=2;u<8;u++)for(let v=2;v<8;v++){
  const key=side?`${x+1},${y+v},${z+u}`:`${x+u},${y+v},${z+1}`;assert(cells.get(key)?.color.startsWith('glass'),key);
  const behind=side?`${x},${y+v},${z+u}`:`${x+u},${y+v},${z}`;
  // Frame backing is removed separately so panes aren't painted onto opaque walls.
  assert(!cells.has(behind),`Backing behind glass ${behind}`);
 }
});
check('Door route clear and porch above door',()=>{for(let x=5;x<13;x++)for(let z=18;z<23;z++)for(let y=2;y<16;y++)assert(!cells.has(`${x},${y},${z}`));});
check('Chimney aperture stays open through pale cap',()=>{for(let x=13;x<16;x++)for(let z=-9;z<-6;z++)for(let y=44;y<55;y++)assert(!cells.has(`${x},${y},${z}`));});
check('Window guards connected by side returns, slots stay open',()=>{for(const [start,side] of [[-16,false],[3,false],[-5,true]]){for(const u of [0,11])for(let t=0;t<4;t++){const p=side?[19+t,21,start+u]:[start+u,21,15+t];assert(cells.has(p.join(',')));}for(const u of [1,2,3,5,6,8,9,10]){const p=side?[22,22,start+u]:[start+u,22,18];assert(!cells.has(p.join(',')));}}});
if(['roof-coarse','roof-pairs'].includes(stage))check('Broad roof courses have no recessed lanes and remain joined on both axes',()=>{
 const columns=new Map();
 for(let x=-23;x<23;x++)for(let z=-20;z<20;z++){
  const flue=x>=13&&x<16&&z>=-9&&z<-6,depth=19-Math.floor(Math.abs(z+.5)),top=34+Math.round(Math.floor(depth/3)*2.4);
  if(!flue)assert(cells.has(`${x},${top},${z}`),`Recessed top ${x},${z}`);
  const ys=new Set();for(let y=31;y<=49;y++)if(['roof','ridge','chimney','chimney-cap'].includes(cells.get(`${x},${y},${z}`)?.part))ys.add(y);
  assert(ys.size,`Missing roof ${x},${z}`);columns.set(`${x},${z}`,ys);
 }
 for(const [key,a] of columns){const [x,z]=key.split(',').map(Number);for(const [dx,dz] of [[1,0],[0,1]]){const b=columns.get(`${x+dx},${z+dz}`);if(b)assert([...a].some(y=>b.has(y)),`Open roof joint ${key}`);}}
});
if(stage==='roof-pairs')check('Paired roof tones preserve geometry and leave all other building cells unchanged',()=>{
 const previous=createHomeCells({stage:'roof-coarse'});assert.equal(cells.size,previous.size);
 for(const [key,c] of cells){const old=previous.get(key);assert(old);assert.deepEqual({...c,color:old.color},old);if(!(['roof','porch'].includes(c.part)&&old.color.startsWith('slate')))assert.equal(c.color,old.color);}
 for(let row=0;row<6;row++)for(let x=-23;x+4<23;x+=5){const y=34+Math.round(row*2.4),z=19-row*3,a=[0,1,2,3,4].map(i=>cells.get(`${x+i},${y},${z}`));assert(a.every(Boolean));assert.equal(a[0].color,a[1].color);assert.equal(a[2].color,a[3].color);assert.notEqual(a[0].color,a[2].color);assert.equal(a[4].color,'slateJoint');}
});
const palette=Object.fromEntries(Object.keys(PALETTE).map(k=>[k,[.5,.5,.5]])),compiled=[];let triangles=0,surfaceFaces=0;
for(const part of new Set([...cells.values()].map(c=>c.part))){const m=meshChunk([...cells.values()].filter(c=>c.part===part),cells,CELL,{palette,aoStrength:.08});assert([...m.positions].every(Number.isFinite));compiled.push({part,...m});triangles+=m.triangles;surfaceFaces+=m.surfaceFaces;}
// Exact occupancy boundary: no interior faces, absent boundary faces or non-grid vertices.
const expected=new Set(),actual=new Set();let area=0;
for(const c of cells.values())for(let d=0;d<3;d++)for(const sign of [-1,1]){const p=[c.x,c.y,c.z],q=[...p];q[d]+=sign;if(!cells.has(q.join(',')))expected.add([d,p[d]+(sign>0?1:0),p[(d+1)%3],p[(d+2)%3],sign].join(','));}
for(const m of compiled)for(let i=0;i<m.positions.length;i+=9){const p=[0,1,2].map(j=>Array.from(m.positions.slice(i+j*3,i+j*3+3),v=>{assert(Math.abs(v/CELL-Math.round(v/CELL))<1e-4);return Math.round(v/CELL);}));const a=p[1].map((v,j)=>v-p[0][j]),b=p[2].map((v,j)=>v-p[0][j]),n=[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]],d=n.findIndex(v=>v!==0);assert(d>=0);assert(n.every((v,j)=>j===d||v===0));area+=Math.abs(n[d])/2;const u=(d+1)%3,v=(d+2)%3,edge=(a,b,q)=>(b[u]-a[u])*(q[v]-a[v])-(b[v]-a[v])*(q[u]-a[u]);for(let x=Math.min(...p.map(q=>q[u]));x<Math.max(...p.map(q=>q[u]));x++)for(let y=Math.min(...p.map(q=>q[v]));y<Math.max(...p.map(q=>q[v]));y++){const q=[0,0,0];q[u]=x+.5;q[v]=y+.5;const edges=p.map((a,j)=>edge(a,p[(j+1)%3],q));if(edges.every(t=>t>=0)||edges.every(t=>t<=0))actual.add([d,p[0][d],x,y,Math.sign(n[d])].join(','));}}
check('Compiled surfaces equal exact voxel boundary',()=>{assert.equal(area,expected.size);assert.deepEqual(actual,expected);});
const report={stage,checks,cells:cells.size,triangles,surfaceFaces,parts:compiled.filter(m=>m.triangles).map(m=>m.part),boundary:{expected:expected.size,actual:actual.size,area},visualAcceptance:'Not measured by this script; no phone performance claim.'};
fs.mkdirSync('evidence',{recursive:true});fs.writeFileSync(`evidence/${stage}-structure.json`,JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));
