import assert from 'node:assert/strict';import fs from 'node:fs';
import {createBooksCells,CELL} from './model.mjs';
const stage=process.argv[2]||'blockout',cells=createBooksCells({stage}),render=JSON.parse(fs.readFileSync(`evidence/${stage}-geometry.json`)),expected=new Set(),actual=new Set();let area=0;
for(const c of cells.values())for(let d=0;d<3;d++)for(const sign of [-1,1]){const p=[c.x,c.y,c.z],q=[...p];q[d]+=sign;if(!cells.has(q.join(',')))expected.add([d,p[d]+(sign>0?1:0),p[(d+1)%3],p[(d+2)%3],sign].join(','));}
for(let i=0;i<render.indices.length;i+=3){const p=render.indices.slice(i,i+3).map(index=>render.vertices[index].map(v=>{assert(Math.abs(v/CELL-Math.round(v/CELL))<1e-4);return Math.round(v/CELL);}));const a=p[1].map((v,j)=>v-p[0][j]),b=p[2].map((v,j)=>v-p[0][j]),n=[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]],d=n.findIndex(v=>v!==0);assert(d>=0&&n.every((v,j)=>j===d||v===0));area+=Math.abs(n[d])/2;const u=(d+1)%3,v=(d+2)%3,edge=(a,b,q)=>(b[u]-a[u])*(q[v]-a[v])-(b[v]-a[v])*(q[u]-a[u]);for(let x=Math.min(...p.map(q=>q[u]));x<Math.max(...p.map(q=>q[u]));x++)for(let y=Math.min(...p.map(q=>q[v]));y<Math.max(...p.map(q=>q[v]));y++){const q=[0,0,0];q[u]=x+.5;q[v]=y+.5;const edges=p.map((a,j)=>edge(a,p[(j+1)%3],q));if(edges.every(t=>t>=0)||edges.every(t=>t<=0))actual.add([d,p[0][d],x,y,Math.sign(n[d])].join(','));}}
assert.equal(area,expected.size,'No repeated or missing surface area');assert.deepEqual(actual,expected,'Render must equal complete voxel union boundary');
for(let i=0;i<render.indices.length;i+=3){
 const ids=render.indices.slice(i,i+3),p=ids.map(id=>render.vertices[id]),a=p[1].map((v,j)=>v-p[0][j]),b=p[2].map((v,j)=>v-p[0][j]);
 const n=[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]],axis=n.findIndex(v=>Math.abs(v)>1e-8);
 for(const id of ids)render.normals[id].forEach((v,j)=>assert(Math.abs(v-(j===axis?Math.sign(n[axis]):0))<1e-5,'Actual flat normal must match outward winding'));
}
// Equivalent unit-face tessellation avoids greedy-face T junctions in volume diagnostics.
const vertices=[],normals=[],indices=[];
for(const key of actual){const [d,plane,u,v,sign]=key.split(',').map(Number),corners=[[0,0],[1,0],[1,1],[0,1]],order=sign>0?[0,1,2,0,2,3]:[0,2,1,0,3,2];for(const j of order){const p=[0,0,0],n=[0,0,0];p[d]=plane;p[(d+1)%3]=u+corners[j][0];p[(d+2)%3]=v+corners[j][1];n[d]=sign;vertices.push(p.map(n=>n*CELL));normals.push(n);indices.push(indices.length);}}
fs.writeFileSync(`evidence/${stage}-unit-surface.json`,JSON.stringify({name:'equivalent-unit-boundary',vertices,normals,indices}));
fs.writeFileSync(`evidence/${stage}-boundary.json`,JSON.stringify({passed:true,stage,cells:cells.size,renderTriangles:render.indices.length/3,expectedFaces:expected.size,actualFaces:actual.size,area,method:'Exhaustive signed axis-grid face equality and summed triangle area. Rendered surface equals occupancy boundary exactly; analysis tessellation preserves the same surface.'},null,2));console.log('Exact render boundary verified: '+actual.size+' faces.');
