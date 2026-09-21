import * as THREE from 'three';
import {hash} from '../model.mjs';

export const COMPLETION_SECONDS=2.1;
export function createCompletionEffects(parent){
 const group=new THREE.Group();group.name='building-completions';parent.add(group);const active=[];
 function remove(e){
  group.remove(e.g);e.frame.geometry.dispose();e.particles.geometry.dispose();
  e.frame.material.dispose();e.particles.material.dispose();e.glow.material.dispose();e.particles.dispose();
 }
 function clear(){active.splice(0).forEach(remove);}
 function play(b,time){
  const old=active.findIndex(e=>e.id===b.id);if(old!==-1)remove(active.splice(old,1)[0]);
  const g=new THREE.Group();group.add(g);
  const glow=new THREE.Mesh(b.full.geometry,new THREE.MeshBasicMaterial({color:'#fff1cd',transparent:true,opacity:0,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-2,polygonOffsetUnits:-2}));
  glow.position.copy(b.g.position);glow.rotation.copy(b.g.rotation);glow.scale.copy(b.full.scale);g.add(glow);
  const width=b.bounds.max[0]-b.bounds.min[0]+.30,depth=b.bounds.max[1]-b.bounds.min[1]+.30,line=.025;
  const shape=new THREE.Shape();shape.moveTo(-width/2,-depth/2);shape.lineTo(width/2,-depth/2);shape.lineTo(width/2,depth/2);shape.lineTo(-width/2,depth/2);shape.closePath();
  const hole=new THREE.Path();hole.moveTo(-width/2+line,-depth/2+line);hole.lineTo(-width/2+line,depth/2-line);hole.lineTo(width/2-line,depth/2-line);hole.lineTo(width/2-line,-depth/2+line);hole.closePath();shape.holes.push(hole);
  const frame=new THREE.Mesh(new THREE.ShapeGeometry(shape),new THREE.MeshBasicMaterial({color:'#e6d1a0',transparent:true,opacity:0,depthWrite:false,side:THREE.DoubleSide}));
  frame.rotation.x=-Math.PI/2;frame.position.set((b.bounds.min[0]+b.bounds.max[0])/2,b.base+.018,(b.bounds.min[1]+b.bounds.max[1])/2);g.add(frame);
  const particles=new THREE.InstancedMesh(new THREE.BoxGeometry(1,1,1),new THREE.MeshBasicMaterial({color:'#ead6ae',transparent:true,opacity:0,depthWrite:false}),12);particles.frustumCulled=false;g.add(particles);
  const height=(b.bp.bounds.max[1]+.5)*b.u,points=Array.from({length:12},(_,i)=>{const a=i*Math.PI/6;return{x:frame.position.x+Math.cos(a)*width*.46,z:frame.position.z+Math.sin(a)*depth*.46,y:b.base+height*(.2+hash(i,width*100,41)*.65),lift:.28+hash(i,71)*.35,size:.024+hash(i,72)*.014};});
  active.push({id:b.id,g,glow,frame,particles,points,time});
 }
 const matrix=new THREE.Matrix4();
 function update(time){
  for(let i=active.length-1;i>=0;i--){
   const e=active[i],t=Math.max(0,(time-e.time)/COMPLETION_SECONDS);
   if(t>=1){remove(e);active.splice(i,1);continue;}
   const fade=Math.sin(Math.PI*t)**1.3;e.glow.material.opacity=fade*.12;e.frame.material.opacity=fade*.48;e.particles.material.opacity=fade*.72;e.frame.scale.setScalar(1+t*.04);
   e.points.forEach((p,j)=>{matrix.makeScale(p.size,p.size,p.size);matrix.setPosition(p.x,p.y+p.lift*t,p.z);e.particles.setMatrixAt(j,matrix);});e.particles.instanceMatrix.needsUpdate=true;
  }
 }
 return{group,play,update,clear,get count(){return active.length;}};
}
