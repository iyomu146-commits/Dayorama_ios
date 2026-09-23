import {meshChunk} from '../../../density-core.mjs';
import {CELL} from './model.mjs?v=grid5';
import {roughness} from './palette.mjs?v=grid5';
import {FINISH_BEVEL} from './architectural-finish.mjs?v=grid5';

// The same chamfer can be applied to a component or an individual grid cell.
// A box has 6 planes, 12 edge strips and 8 corner triangles = 44 triangles.
export function chamferBox(box,radius=FINISH_BEVEL,occupancy=null){
 if(box.length!==6||!box.every(Number.isInteger)||box.slice(3).some(v=>v<1))throw new Error('Finish boxes must occupy whole grid cells');
 if(!Number.isFinite(radius)||radius<=0||radius>FINISH_BEVEL)throw new Error('Finish bevel exceeds the shared grid allowance');
 const [x,y,z,w,h,d]=box;
 const half=[w/2,h/2,d/2],center=[x+w/2,y+h/2,z+d/2],b=Math.min(radius,...half.map(v=>v*.7));
 const positions=[],normals=[],polys=[],signs=[-1,1];
 // Hide a face/edge/corner only when its entire adjacent integer-cell shell
 // exists. Partial neighbours retain the whole facet, so openings stay intact.
 const hiddenCache=new Map(),origin=[x,y,z],extent=[w,h,d];
 const hidden=directions=>{
  if(!occupancy)return false;
  const tag=directions.map(([a,s])=>`${a}:${s}`).join('/');
  if(hiddenCache.has(tag))return hiddenCache.get(tag);
  for(let mask=1;mask<(1<<directions.length);mask++){
   const lo=[...origin],hi=origin.map((v,a)=>v+extent[a]);
   directions.forEach(([a,s],i)=>{if(mask&(1<<i)){lo[a]=s<0?origin[a]-1:hi[a];hi[a]=lo[a]+1;}});
   for(let i=lo[0];i<hi[0];i++)for(let j=lo[1];j<hi[1];j++)for(let k=lo[2];k<hi[2];k++)if(!occupancy.has(`${i},${j},${k}`)){hiddenCache.set(tag,false);return false;}
  }
  hiddenCache.set(tag,true);return true;
 };
 for(let axis=0;axis<3;axis++)for(const s of signs){
  const u=(axis+1)%3,v=(axis+2)%3;if(hidden([[axis,s]]))continue;
  polys.push([[-1,-1],[1,-1],[1,1],[-1,1]].map(([su,sv])=>{const p=[0,0,0];p[axis]=s*half[axis];p[u]=su*(half[u]-b);p[v]=sv*(half[v]-b);return p;}));
 }
 for(let axis=0;axis<3;axis++)for(const su of signs)for(const sv of signs){
  const u=(axis+1)%3,v=(axis+2)%3,pts=[];if(hidden([[u,su],[v,sv]]))continue;
  for(const [sa,t] of [[-1,0],[1,0],[1,1],[-1,1]]){const p=[0,0,0];p[axis]=sa*(half[axis]-b);p[u]=su*(half[u]-(t?b:0));p[v]=sv*(half[v]-(t?0:b));pts.push(p);}polys.push(pts);
 }
 for(const sx of signs)for(const sy of signs)for(const sz of signs)if(!hidden([[0,sx],[1,sy],[2,sz]]))polys.push([0,1,2].map(a=>[sx,sy,sz].map((s,i)=>s*(half[i]-(i===a?0:b)))));
 // Only remove material at the edges; never resize, tilt, jitter or offset a unit.
 const toWorld=p=>p.map((v,i)=>(v+center[i])*CELL);
 const cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]],sub=(a,b)=>a.map((v,i)=>v-b[i]);
 for(let poly of polys){const n=cross(sub(poly[1],poly[0]),sub(poly[2],poly[0])),mid=poly.reduce((a,p)=>a.map((v,i)=>v+p[i]),[0,0,0]);if(n.reduce((s,v,i)=>s+v*mid[i],0)<0)poly=poly.toReversed();
  const pts=poly.map(toWorld);for(let i=1;i<pts.length-1;i++){const tri=[pts[0],pts[i],pts[i+1]],normal=cross(sub(tri[1],tri[0]),sub(tri[2],tri[0])),len=Math.hypot(...normal);for(const p of tri){positions.push(...p);normals.push(...normal.map(v=>v/len));}}
 }
 return {positions,normals};
}

export const intactFinishUnit=(u,cells)=>u.keys.length>0&&u.keys.every((k,i)=>cells.get(k)?.part===u.part&&cells.get(k)?.finishUnit===u.id&&cells.get(k)?.color===u.colors?.[i]);
export function buildCafeSurfaces(cells,palette,{finish=true,isolated=false,unit='component'}={}){
 if(finish&&unit==='voxel')return buildUniformVoxelSurfaces(cells,palette,{isolated});
 const units=finish?(cells.finishUnits||[]).filter(u=>intactFinishUnit(u,cells)):[],replaced=new Set(units.flatMap(u=>u.keys));
 const raw=new Map([...cells].filter(([k])=>!replaced.has(k))),result=[];
 for(const part of new Set([...cells.values()].map(c=>c.part))){
  const selected=[...raw.values()].filter(c=>c.part===part),occupancy=isolated?new Map(selected.map(c=>[`${c.x},${c.y},${c.z}`,c])):raw;
  const m=meshChunk(selected,occupancy,CELL,{palette,roughnessFor:c=>roughness(c.color),aoStrength:.065});
  const positions=[...m.positions],normals=[...m.normals],colors=[...m.colors],surfaces=[...m.surfaces];
  const finishOccupancy=isolated?new Map([...cells].filter(([,c])=>c.part===part)):cells;
  for(const u of units.filter(u=>u.part===part))for(const b of u.shape.boxes||[u.shape.box]){
   const g=chamferBox(b,u.shape.bevel,finishOccupancy),c=palette[u.shape.color],r=roughness(u.shape.color);
   positions.push(...g.positions);normals.push(...g.normals);
   for(let i=0;i<g.positions.length/3;i++){colors.push(...c);surfaces.push(0,r);}
  }
  result.push({part,positions:new Float32Array(positions),normals:new Float32Array(normals),colors:new Float32Array(colors),surfaces:new Float32Array(surfaces),triangles:positions.length/9});
 }
 return result;
}

// Every material, including glass, furniture and plants, uses the identical
// 1x1x1 envelope and inward bevel. Only colors/roughness differ between cells.
// Combine buffers by selectable part, not by visual block: no object per cube.
export function buildUniformVoxelSurfaces(cells,palette,{isolated=false}={}){
 const parts=new Map();
 for(const c of cells.values()){if(!parts.has(c.part))parts.set(c.part,[]);parts.get(c.part).push(c);}
 const result=[];
 for(const [part,selected] of parts){
  const occupancy=isolated?new Map(selected.map(c=>[`${c.x},${c.y},${c.z}`,c])):cells;
  const positions=[],normals=[],colors=[],surfaces=[];let visibleCells=0;
  for(const c of selected){
   const g=chamferBox([c.x,c.y,c.z,1,1,1],FINISH_BEVEL,occupancy);
   if(!g.positions.length)continue;
   visibleCells++;
   positions.push(...g.positions);normals.push(...g.normals);
   const color=palette[c.color],r=roughness(c.color);
   for(let i=0;i<g.positions.length/3;i++){colors.push(...color);surfaces.push(0,r);}
  }
  result.push({part,positions:new Float32Array(positions),normals:new Float32Array(normals),colors:new Float32Array(colors),surfaces:new Float32Array(surfaces),triangles:positions.length/9,sourceCells:selected.length,visibleCells,surfaceUnit:'voxel'});
 }
 return result;
}

// Material channels are independent: broad patina in albedo, fine relief in normals,
// and variation in roughness. These are procedural approximations, not recovered PBR maps.
export function installSurfaceShader(material){
 material.userData.surfaceAmount={value:1};
 material.onBeforeCompile=s=>{
  s.uniforms.surfaceAmount=material.userData.surfaceAmount;
  s.vertexShader='attribute vec2 surface; varying vec2 vSurface; varying vec3 vObjectPosition;\n'+s.vertexShader;
  s.vertexShader=s.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nvSurface=surface; vObjectPosition=position;');
  s.fragmentShader=`varying vec2 vSurface; varying vec3 vObjectPosition; uniform float surfaceAmount;
float finishHash(vec3 p){p=fract(p*.1031);p+=dot(p,p.yzx+33.33);return fract((p.x+p.y)*p.z);}
float finishNoise(vec3 p){vec3 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(mix(finishHash(i),finishHash(i+vec3(1,0,0)),f.x),mix(finishHash(i+vec3(0,1,0)),finishHash(i+vec3(1,1,0)),f.x),f.y),mix(mix(finishHash(i+vec3(0,0,1)),finishHash(i+vec3(1,0,1)),f.x),mix(finishHash(i+vec3(0,1,1)),finishHash(i+vec3(1,1,1)),f.x),f.y),f.z);}
float finishRelief(vec3 p,float slate,float wood){return mix(finishNoise(p*60.),finishNoise(p*vec3(18.,85.,55.))*.65+finishNoise(p*145.)*.35,slate)+wood*finishNoise(p*vec3(4.,120.,115.))*.3;}
`+s.fragmentShader;
  s.fragmentShader=s.fragmentShader.replace('#include <color_fragment>',`#include <color_fragment>
float roofMaterial=1.-step(.025,abs(vSurface.y-.75));
float woodMaterial=1.-step(.025,abs(vSurface.y-.82));
float opaqueMaterial=step(.6,vSurface.y);
float broad=finishNoise(vObjectPosition*vec3(3.5,7.,8.));
float meso=finishNoise(vObjectPosition*vec3(15.,26.,24.));
float fine=finishNoise(vObjectPosition*145.);
float patina=(broad-.5)*.30+(meso-.5)*.15+(fine-.5)*.06;
diffuseColor.rgb*=1.+surfaceAmount*opaqueMaterial*patina*mix(.35,1.,roofMaterial);
diffuseColor.rgb+=surfaceAmount*roofMaterial*smoothstep(.55,.8,broad)*vec3(.022,.030,.017);
`);
  s.fragmentShader=s.fragmentShader.replace('#include <roughnessmap_fragment>',`#include <roughnessmap_fragment>
roughnessFactor=clamp(vSurface.y+surfaceAmount*opaqueMaterial*(meso-.5)*.16,.25,1.);`);
  s.fragmentShader=s.fragmentShader.replace('#include <normal_fragment_maps>',`#include <normal_fragment_maps>
vec3 dpdx=dFdx(-vViewPosition),dpdy=dFdy(-vViewPosition);
float relief=finishRelief(vObjectPosition,roofMaterial,woodMaterial)*surfaceAmount*opaqueMaterial*mix(.00045,.0027,roofMaterial);
vec3 r1=cross(dpdy,normal),r2=cross(normal,dpdx);float determinant=dot(dpdx,r1);
normal=normalize(abs(determinant)*normal-sign(determinant)*(dFdx(relief)*r1+dFdy(relief)*r2));`);
 };
 material.customProgramCacheKey=()=> 'cafe-finish-v1';
}
