import test from 'node:test';
import assert from 'node:assert/strict';
import {register} from 'node:module';
import {humanStyle} from '../life/human-style.mjs';
import {staffProfile,visitorProfiles,seatPlacement,canSit} from './people.mjs';
import {PROPS,propModel,placedCells} from './props.mjs';
import {initialState} from './model.mjs';

// Use the same local Three.js copy as the browser, without a package install.
const threeURL=new URL('../../../vendor/three/three.module.js',import.meta.url).href;
register('data:text/javascript,'+encodeURIComponent(`export function resolve(s,c,next){return s==='three'?{shortCircuit:true,url:${JSON.stringify(threeURL)}}:next(s,c);}`),import.meta.url);
const THREE=await import('three'),{createActor}=await import('../life/actors.mjs');
const U=.085;
const axes=[new THREE.Vector3(1,0,0),new THREE.Vector3(0,1,0),new THREE.Vector3(0,0,1)];
function intersects(block,cell){
 const directions=[...axes,...block.axes,...block.axes.flatMap(a=>axes.map(b=>new THREE.Vector3().crossVectors(a,b)))];
 for(const axis of directions){if(axis.lengthSq()<1e-10)continue;const projection=block.corners.map(v=>v.dot(axis)),center=cell.dot(axis),radius=(U/2-.0004)*(Math.abs(axis.x)+Math.abs(axis.y)+Math.abs(axis.z));if(Math.max(...projection)<=center-radius||Math.min(...projection)>=center+radius)return false;}return true;
}
function boxes(rig){
 rig.root.updateMatrixWorld(true);const result=[];
 rig.root.traverse(mesh=>{if(!mesh.isMesh)return;for(let p=mesh;p;p=p.parent)if(!p.visible)return;
   const attr=mesh.geometry.attributes.position;
   // Each authored block contains 12 triangles, keeping thin parts separate.
   for(let i=0;i<attr.count;i+=36){const b=new THREE.Box3();for(let n=i;n<Math.min(i+36,attr.count);n++)b.expandByPoint(new THREE.Vector3().fromBufferAttribute(attr,n));const corners=Array.from({length:8},(_,j)=>new THREE.Vector3(j&1?b.max.x:b.min.x,j&2?b.max.y:b.min.y,j&4?b.max.z:b.min.z).applyMatrix4(mesh.matrixWorld));result.push({name:mesh.parent.name,corners,axes:axes.map(v=>v.clone().transformDirection(mesh.matrixWorld)),box:new THREE.Box3().setFromPoints(corners)});}
 });return result;
}
test('default population includes adults of both genders, children and different work outfits',()=>{
 const state=initialState(),staff=state.buildings.map((b,i)=>staffProfile(b,i,'grove')),visitors=visitorProfiles('grove');
 assert.deepEqual(staff.map(s=>s.appearance.role),['baker','gardener','cafe','resident']);
 const people=[...staff,...visitors].map(s=>s.appearance);assert.ok(people.some(p=>p.gender==='man'&&p.age==='adult'));assert.ok(people.some(p=>p.gender==='woman'&&p.age==='adult'));assert.ok(people.some(p=>p.age==='child'));
 assert.equal(new Set(staff.map(p=>JSON.stringify(p.appearance))).size,4);assert.ok(staff[0].appearance.apron);assert.equal(staff[0].appearance.hat,'baker');assert.ok(staff[1].appearance.overalls);assert.ok(visitors[2].appearance.backpack);
 for(const region of ['snow','alpine'])for(const p of visitorProfiles(region)){assert.ok(p.appearance.coat);assert.ok(p.appearance.boots);assert.equal(p.appearance.shorts,false);}
});
test('men, women and children keep their feet on the ground and distinct silhouettes while walking',()=>{
 const styles=[humanStyle({gender:'man'}),humanStyle({gender:'woman',role:'visitor'}),humanStyle({gender:'woman',age:'child',role:'child'})],heights=[];
 for(const appearance of styles){const rig=createActor('person',{appearance});for(const moving of [false,true])for(const t of [0,.2,.6,1.1]){rig.pose(t,{moving,distance:t*.3});const min=Math.min(...boxes(rig).map(b=>b.box.min.y));assert.ok(min>=-.006,`${appearance.age}: ${min}`);}
 rig.pose(0);heights.push(new THREE.Box3().setFromObject(rig.root).max.y);rig.dispose();}
 assert.ok(heights[2]<heights[0]*.83);assert.ok(heights[2]>heights[0]*.65);
});
test('a planted walking foot stays in place while a lifted foot travels forward',()=>{
 for(const age of ['adult','child'])for(const yaw of [0,Math.PI/2,Math.PI,-Math.PI/2]){
  const rig=createActor('person',{appearance:humanStyle({age,role:age==='child'?'child':'visitor'})}),size=rig.root.scale.x,forward=new THREE.Vector3(Math.sin(yaw),0,Math.cos(yaw));rig.root.rotation.y=yaw;
  let previous=null,contacts=0,swings=0;
  for(let i=0;i<=480;i++){
   const distance=i*.0025;rig.root.position.copy(forward).multiplyScalar(distance);rig.pose(i/60,{moving:true,distance,action:'walk'});rig.root.updateMatrixWorld(true);
   const feet=rig.legs.map(l=>l.foot.getWorldPosition(new THREE.Vector3()));
   if(previous)for(let foot=0;foot<2;foot++){
    const before=previous[foot],now=feet[foot],move=now.clone().sub(before),ground=.0135*size;
    if(Math.abs(before.y-ground)<1e-8&&Math.abs(now.y-ground)<1e-8){contacts++;assert.ok(Math.hypot(move.x,move.z)<.00002,`${age}/${yaw}: planted foot slides ${move.length()}`);}
    if(before.y>ground+.002&&now.y>ground+.002){swings++;assert.ok(move.dot(forward)>-.00002,`${age}/${yaw}: lifted foot moves backward`);}
   }
   previous=feet;
  }
  assert.ok(contacts>150,'walking includes a planted support foot');assert.ok(swings>150,'both feet have a forward swing');rig.dispose();
 }
});
test('seated people never intersect the seat, backrest or legs in any rotation',()=>{
 for(const region of ['grove','snow','oasis'])for(const appearance of [humanStyle({region,role:'reader',gender:'woman'}),humanStyle({region,role:'visitor',gender:'woman',variant:0}),humanStyle({region,role:'visitor',gender:'man'}),humanStyle({region,role:'child',gender:'woman',age:'child'})]){
  for(const kind of Object.keys(PROPS).filter(id=>propModel(id).seat))for(let r=0;r<4;r++){
   const p={id:'ptest',kind,x:4,z:7,r},seat=seatPlacement(p,appearance,U),rig=createActor('person',{item:'book',appearance});rig.root.position.set(seat.position[0]*U,U*.5,seat.position[1]*U);rig.root.rotation.y=seat.yaw;
   const solid=placedCells(p).map(c=>new THREE.Vector3(c.x*U,c.y*U,c.z*U));
   for(const t of [0,1.5,4]){rig.pose(t,{seatHeight:seat.seatHeight,action:'read'});for(const block of boxes(rig)){assert.ok(block.box.min.y>=U*.5-.006,`${kind}: ${block.name} below ground`);assert.ok(!solid.some(c=>intersects(block,c)),`${region}/${appearance.gender}/${appearance.age}/${kind}/${r}/${block.name} intersects furniture`);}
    const thighs=rig.legs.map(l=>new THREE.Box3().setFromObject(l.upper.children[0]).min.y),top=(propModel(kind).seat.y+.5)*U;assert.ok(thighs.every(y=>y>=top-.001&&y<top+.03),'thighs touch the top of the seat');
   }rig.dispose();
  }
 }
});
test('seated reading needs room for the lower legs and rejects an obstructed bench',()=>{
 const state=initialState(),bench=state.props.find(p=>p.kind==='bench');assert.ok(canSit(state,bench));
 state.props.push({id:'pobstacle',kind:'table',x:bench.x,z:bench.z+6,r:0});assert.equal(canSit(state,bench),false);
});
