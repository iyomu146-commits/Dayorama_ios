import * as THREE from 'three';
import {World,CELL} from './world';import {u01} from './hash';import type {V3,Entry} from './types';

const faces=[
  {n:[1,0,0],q:[[1,0,0],[1,1,0],[1,1,1],[1,0,1]],axis:0},
  {n:[-1,0,0],q:[[0,0,0],[0,0,1],[0,1,1],[0,1,0]],axis:0},
  {n:[0,1,0],q:[[0,1,0],[0,1,1],[1,1,1],[1,1,0]],axis:1},
  {n:[0,-1,0],q:[[0,0,0],[1,0,0],[1,0,1],[0,0,1]],axis:1},
  {n:[0,0,1],q:[[0,0,1],[1,0,1],[1,1,1],[0,1,1]],axis:2},
  {n:[0,0,-1],q:[[0,0,0],[0,1,0],[1,1,0],[1,0,0]],axis:2},
];
export function vertexAO(world:World,cell:V3,normal:V3,corner:V3):number {
  const axes=[0,1,2].filter(i=>normal[i]===0),outside=cell.map((v,i)=>v+normal[i]);
  let occupied=0;
  for(let mask=0;mask<4;mask++) {
    const q=[...outside];
    for(let k=0;k<2;k++)if(mask&(1<<k))q[axes[k]]+=corner[axes[k]]===0?-1:1;
    if(world.get(q[0],q[1],q[2]))occupied++;
  }
  return 1-.58*(occupied/4);
}
interface Paint {color:THREE.Color;emission:THREE.Color;jitter:number;hero:number;}
export function palettePaint(world:World):Map<number,Paint> {
  const map=new Map<number,Paint>();
  for(const e of world.bundle.palette.entries) {
    const s=world.bundle.look.surfaces[e.surface],color=new THREE.Color(e.hex);
    if(e.role==='plant')color.multiplyScalar(.82);
    if(['ground','road','sidewalk'].includes(e.role))color.multiplyScalar(.88);
    const emission=new THREE.Color(s.emissionHex??e.hex).multiplyScalar((s.emission??0)*(e.emitScale??1));
    const hero=['glass','glass_lattice','curtain','vend_display','vend_panel'].includes(e.surface)?1:0;
    map.set(e.index,{color,emission,jitter:s.jitter??0,hero});
  }
  return map;
}
export function buildChunk(world:World,key:string,paint=palettePaint(world)):THREE.BufferGeometry {
  const lo=key.split(',').map(v=>Number(v)*16),hi=lo.map(v=>v+16);
  const positions:number[]=[],normals:number[]=[],colors:number[]=[],emissions:number[]=[],heroes:number[]=[],indices:number[]=[];
  let vertex=0;
  function quad(points:number[][],normal:number[],p:Paint,jitter:number,ao:number[]) {
    for(let v=0;v<4;v++) {
      positions.push(...points[v].map(n=>n*CELL));normals.push(...normal);
      const k=jitter*ao[v];colors.push(p.color.r*k,p.color.g*k,p.color.b*k);
      emissions.push(p.emission.r,p.emission.g,p.emission.b);heroes.push(p.hero);
    }
    if(ao[0]+ao[2]>ao[1]+ao[3])indices.push(vertex,vertex+1,vertex+3,vertex+1,vertex+2,vertex+3);
    else indices.push(vertex,vertex+1,vertex+2,vertex,vertex+2,vertex+3);
    vertex+=4;
  }
  const origin=world.bundle.tile.originCell;
  for(let z=lo[2];z<hi[2];z++)for(let y=lo[1];y<hi[1];y++)for(let x=lo[0];x<hi[0];x++) {
    const value=world.get(x,y,z);if(!value||world.getOwner(x,y,z))continue;
    const p=paint.get(value)!,jitter=1+p.jitter*(2*u01(x+origin[0],y+origin[1],z+origin[2])-1);
    for(const f of faces) {
      const nx=x+f.n[0],ny=y+f.n[1],nz=z+f.n[2];
      // A finish-piece neighbour is inset; its joint may expose this plain-cell face.
      if(world.get(nx,ny,nz)&&!world.getOwner(nx,ny,nz))continue;
      quad(f.q.map(q=>[x+q[0],y+q[1],z+q[2]]),f.n,p,jitter,
        f.q.map(q=>vertexAO(world,[x,y,z],f.n as V3,q as V3)));
    }
  }
  // These source-declared finish pieces are not greedy meshing. Only original outer
  // faces are emitted; clipping at chunk seams never creates an internal cap.
  for(const unit of world.pieces) {
    if(!unit.active)continue;
    const b=unit.box;if([0,1,2].some(k=>b[k]>=hi[k]||b[k+3]<=lo[k]))continue;
    const entry=world.bundle.palette.entries.find(e=>e.index===unit.value)!;
    const g=(world.bundle.look.surfaces[entry.surface].joint??world.bundle.look.jointDefault)/CELL;
    const low=b.slice(0,3).map(v=>v+g),high=b.slice(3).map(v=>v-g),p=paint.get(unit.value)!;
    const jitter=1+p.jitter*(2*u01(b[0]+origin[0],b[1]+origin[1],b[2]+origin[2],1)-1);
    for(const f of faces) {
      const a=f.axis,plane=f.n[a]>0?high[a]:low[a];
      if(plane<lo[a]||plane>hi[a])continue;
      const clippedLow=low.map((v,k)=>k===a?plane:Math.max(v,lo[k]));
      const clippedHigh=high.map((v,k)=>k===a?plane:Math.min(v,hi[k]));
      if([0,1,2].some(k=>k!==a&&clippedLow[k]>=clippedHigh[k]))continue;
      const pts=f.q.map(q=>q.map((v,k)=>v?clippedHigh[k]:clippedLow[k]));
      const ao=pts.map((point,v)=>{
        const cell=point.map((p,k)=>Math.min(b[k+3]-1,Math.max(b[k],Math.floor(p)))) as V3;
        return vertexAO(world,cell,f.n as V3,f.q[v] as V3);
      });
      quad(pts,f.n,p,jitter,ao);
    }
  }
  const geometry=new THREE.BufferGeometry();
  geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));
  geometry.setAttribute('normal',new THREE.Float32BufferAttribute(normals,3));
  geometry.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));
  geometry.setAttribute('benchEmission',new THREE.Float32BufferAttribute(emissions,3));
  geometry.setAttribute('benchHero',new THREE.Float32BufferAttribute(heroes,1));
  geometry.setIndex(indices);geometry.computeBoundingSphere();
  return geometry;
}
