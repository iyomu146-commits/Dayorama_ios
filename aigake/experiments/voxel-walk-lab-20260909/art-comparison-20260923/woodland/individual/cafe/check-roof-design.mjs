import assert from 'node:assert/strict';
import {writeFile} from 'node:fs/promises';
import {createCafeCells,CELL} from './model.mjs';
import {createRoofDesignCells,DESIGN_PALETTE,ROOF_PHASES,ROOF_LANE_WIDTH} from './roof-design.mjs';
import {buildCafeSurfaces} from './surface-finish.mjs';
import {materialChannels} from './material-study.mjs';
import {groundedCells} from '../../../density-core.mjs';

const source=createCafeCells(),snapshot=JSON.stringify([...source]),cells=createRoofDesignCells(source),checks=[];
const check=(name,fn)=>{fn();checks.push(name);};
const roofParts=new Set(['roof','tiles','ridge']);
check('15cm integer cells; every palette ID resolves; original model unchanged',()=>{
 assert.equal(JSON.stringify([...source]),snapshot);
 for(const c of cells.values()){assert.ok([c.x,c.y,c.z].every(Number.isInteger));assert.ok(c.y>=0);assert.ok(DESIGN_PALETTE[c.color]);}
});
check('Only roof, tiles and ridge cells change; walls, windows, furniture and chimney preserved',()=>{
 for(const [k,c] of source)if(!roofParts.has(c.part))assert.deepEqual(cells.get(k),c,k);
 const bounds=map=>[0,1,2].flatMap(a=>{const v=[...map.values()].map(c=>[c.x,c.y,c.z][a]);return [Math.min(...v),Math.max(...v)];});
 assert.deepEqual(bounds(cells),bounds(source));
});
check('All cells remain connected to the ground',()=>assert.equal(groundedCells(cells).size,cells.size));
const deck=new Map();
check('All 1440 roof columns have a closed three-cell support layer',()=>{
 for(let x=-20;x<20;x++)for(let z=-18;z<18;z++){
  const lane=Math.floor((x+20)/ROOF_LANE_WIDTH),s=z>=0?17-z:z+18,row=Math.min(5,Math.floor((s+ROOF_PHASES[lane])/3)),base=22+2*row,ys=new Set();
  for(let y=base-1;y<=base+1;y++){assert.ok(cells.has(`${x},${y},${z}`),`Roof gap ${x},${y},${z}`);ys.add(y);}
  deck.set(`${x},${z}`,ys);
  assert.ok(cells.has(`${x},${base+2},${z}`),`Recessed roof course ${x},${z}`);
 }
});
check('Roof support overlaps across both lane and course joints; no open gutters',()=>{
 for(let x=-20;x<20;x++)for(let z=-18;z<18;z++)for(const [dx,dz] of [[1,0],[0,1]]){
  const a=deck.get(`${x},${z}`),b=deck.get(`${x+dx},${z+dz}`);if(b)assert.ok([...a].some(y=>b.has(y)),`Open joint ${x},${z}`);
 }
});
check('Chimney opening and door approach remain clear',()=>{
 for(let x=-12;x<=-10;x++)for(let z=-10;z<=-8;z++)for(let y=33;y<=40;y++)assert.ok(!cells.has(`${x},${y},${z}`));
 for(let x=6;x<=13;x++)for(let z=16;z<=20;z++)for(let y=2;y<=18;y++)assert.ok(!cells.has(`${x},${y},${z}`));
});

const palette=Object.fromEntries(Object.keys(DESIGN_PALETTE).map(k=>[k,[.5,.5,.5]]));
const meshes=buildCafeSurfaces(cells,palette,{finish:false,aoStrength:.135});
check('Every rendered material channel resolves from the edited grid',()=>{
 for(const m of meshes)assert.ok([...materialChannels(m,cells,CELL)].every(Number.isFinite));
});
check('Rendered boundary exactly covers exposed integer-cell faces',()=>{
 const expected=new Set(),actual=new Set();let area=0;
 for(const c of cells.values())for(let d=0;d<3;d++)for(const sign of [-1,1]){
  const p=[c.x,c.y,c.z],n=[...p];n[d]+=sign;if(cells.has(n.join(',')))continue;
  expected.add([d,p[d]+(sign>0?1:0),p[(d+1)%3],p[(d+2)%3],sign].join(','));
 }
 for(const m of meshes)for(let i=0;i<m.positions.length;i+=9){
  const pts=[0,1,2].map(v=>[0,1,2].map(a=>{const n=m.positions[i+v*3+a]/CELL;assert.ok(Math.abs(n-Math.round(n))<1e-4);return Math.round(n);}));
  const d=[0,1,2].find(a=>Math.abs(m.normals[i+a])>.5),u=(d+1)%3,v=(d+2)%3,sign=m.normals[i+d];
  assert.ok(pts.every(p=>p[d]===pts[0][d]));
  const edge=(a,b,q)=>(b[u]-a[u])*(q[v]-a[v])-(b[v]-a[v])*(q[u]-a[u]);
  area+=Math.abs(edge(pts[0],pts[1],pts[2]))/2;
  for(let x=Math.min(...pts.map(p=>p[u]));x<Math.max(...pts.map(p=>p[u]));x++)for(let y=Math.min(...pts.map(p=>p[v]));y<Math.max(...pts.map(p=>p[v]));y++){
   const q=[0,0,0];q[u]=x+.5;q[v]=y+.5;const es=pts.map((p,j)=>edge(p,pts[(j+1)%3],q));
   if(es.every(e=>e>=0)||es.every(e=>e<=0))actual.add([d,pts[0][d],x,y,sign].join(','));
  }
 }
 assert.equal(area,expected.size);assert.deepEqual(actual,expected);
});
const report={cells:cells.size,previousCells:source.size,triangles:meshes.reduce((n,m)=>n+m.triangles,0),meshes:meshes.length,cellSize:CELL,checks,scope:'Structure and boundary checks; no visual-quality score or device performance claim.'};
await writeFile(new URL('./evidence/roof14-structure.json',import.meta.url),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report,null,2));
