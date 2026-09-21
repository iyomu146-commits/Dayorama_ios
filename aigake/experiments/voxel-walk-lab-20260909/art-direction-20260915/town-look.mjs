import * as THREE from 'three';
import {geometry as cellGeometry} from './study.mjs';

export const LOOKS=[
 {name:'A · 現状',detail:'これまでの光とマットな質感。'},
 {name:'B · 陰影と素材',detail:'薄い接触陰影、素材の反射、地域ごとの光と色彩。'},
 {name:'C · 水面と風',detail:'Bに水面の波紋と、草木の微かな揺れを追加。'}
];
// The order matches BoxGeometry and the exposed voxel faces.
const normals=[[1,0,0],[-1,0,0],[0,1,0],[0,-1,0],[0,0,1],[0,0,-1]];
const key=(x,y,z)=>`${x},${y},${z}`;
const roleCache=new Map();
export function surfaceRole(color,p){
 const k=p.id+color;if(roleCache.has(k))return roleCache.get(k);
 const c=new THREE.Color(color),C=p.palette;
 let kind=0;
 if(color===C.glass||color==='#e7c68a')kind=3;
 else if(p.id==='snow'&&c.r>.53&&c.g>.58&&c.b>.57)kind=5;
 else if(color===C.wood||c.r>c.g*1.12&&c.g>c.b*1.25)kind=2;
 else if(c.g>c.r*1.06&&c.g>c.b*1.1)kind=4;
 roleCache.set(k,kind);return kind;
}
export function faceAO(occupied,c,face){
 const n=normals[face],axis=n.findIndex(v=>v!==0),a=(axis+1)%3,b=(axis+2)%3;
 const q=[c.x+n[0],c.y+n[1],c.z+n[2]];
 let sum=0;
 for(const sa of [-1,1])for(const sb of [-1,1]){
  const u=[...q],v=[...q],w=[...q];u[a]+=sa;v[b]+=sb;w[a]+=sa;w[b]+=sb;
  const s1=occupied.has(key(...u)),s2=occupied.has(key(...v)),corner=occupied.has(key(...w));
  sum+=s1&&s2?0:3-Number(s1)-Number(s2)-Number(corner);
 }
 return .54+.46*sum/12;
}
export function voxelSurface(cells,p,{wind=false,snow=false,tree=false}={}){
 const g=cellGeometry(cells,'proposal'),lookup=new Map(cells.map(c=>[key(c.x,c.y,c.z),c]));
 const pos=g.attributes.position,nor=g.attributes.normal,ao=new Float32Array(pos.count),kind=new Float32Array(pos.count),sway=new Float32Array(pos.count);
 for(let i=0;i<pos.count;i+=6){
  const center=[0,0,0];for(let j=0;j<6;j++){center[0]+=pos.getX(i+j)/6;center[1]+=pos.getY(i+j)/6;center[2]+=pos.getZ(i+j)/6;}
  const n=[nor.getX(i),nor.getY(i),nor.getZ(i)],xyz=center.map((v,j)=>Math.round(v/.1-n[j]*.5));
  const c=lookup.get(key(...xyz));if(!c)throw Error('Missing surface voxel');
  const role=c.surface??surfaceRole(c.color,p),face=normals.findIndex(a=>a.every((v,j)=>v===n[j])),value=faceAO(lookup,c,face);
  // Use one continuous height field for stems, leaves and flowers so joints stay closed.
  for(let j=0;j<6;j++){ao[i+j]=value;kind[i+j]=role;sway[i+j]=wind?Math.pow(Math.max(0,pos.getY(i+j)-(tree?1.2:0)),1.3)*(snow?.09:tree?.36:.6):0;}
 }
 g.setAttribute('townAO',new THREE.Float32BufferAttribute(ao,1));g.setAttribute('townKind',new THREE.Float32BufferAttribute(kind,1));g.setAttribute('townSway',new THREE.Float32BufferAttribute(sway,1));
 return g;
}
export function plainSurface(g,kind=0){
 const n=g.attributes.position.count;
 g.setAttribute('townAO',new THREE.Float32BufferAttribute(new Float32Array(n).fill(1),1));
 g.setAttribute('townKind',new THREE.Float32BufferAttribute(new Float32Array(n).fill(kind),1));
 g.setAttribute('townSway',new THREE.Float32BufferAttribute(new Float32Array(n),1));return g;
}
// Incremental occupancy keeps construction shading tied to the blocks actually present.
export function constructionSurface(phases,cube,p){
 const lookup=new Map(),visible=new Set(),counts=phases.map(()=>0);
 const geometries=phases.map((cells,phase)=>{
  const g=cube.clone();plainSurface(g);
  g.setAttribute('cellAO1',new THREE.InstancedBufferAttribute(new Float32Array(cells.length*3).fill(1),3));
  g.setAttribute('cellAO2',new THREE.InstancedBufferAttribute(new Float32Array(cells.length*3).fill(1),3));
  g.setAttribute('cellKind',new THREE.InstancedBufferAttribute(new Float32Array(cells.map(c=>c.surface??surfaceRole(c.color,p))),1));
  cells.forEach((c,index)=>lookup.set(key(c.x,c.y,c.z),{c,phase,index}));return g;
 });
 function update(next){
  const affected=new Set();
  phases.forEach((cells,phase)=>{
   for(let i=Math.min(counts[phase],next[phase]);i<Math.max(counts[phase],next[phase]);i++){
    const c=cells[i],k=key(c.x,c.y,c.z);if(i<next[phase])visible.add(k);else visible.delete(k);
    for(let x=-1;x<=1;x++)for(let y=-1;y<=1;y++)for(let z=-1;z<=1;z++)affected.add(key(c.x+x,c.y+y,c.z+z));
   }counts[phase]=next[phase];
  });
  const dirty=new Set();
  for(const k of affected){const q=lookup.get(k);if(!q||!visible.has(k))continue;
   const v=normals.map((_,i)=>faceAO(visible,q.c,i)),g=geometries[q.phase];
   g.attributes.cellAO1.setXYZ(q.index,v[0],v[1],v[2]);g.attributes.cellAO2.setXYZ(q.index,v[3],v[4],v[5]);dirty.add(q.phase);
  }
  for(const i of dirty){geometries[i].attributes.cellAO1.needsUpdate=true;geometries[i].attributes.cellAO2.needsUpdate=true;}
 }
 return{geometries,update,counts};
}

const windCode=`
float townPhase = 0.0;
#ifdef USE_INSTANCING
 townPhase = instanceMatrix[3].x * 1.17 + instanceMatrix[3].z * 0.73;
#endif
float townWind = sin(uTownTime * 0.72 + townPhase) * 0.045 + sin(uTownTime * 1.13 + townPhase * 1.7) * 0.018;
transformed.x += townWind * townSway * uTownLive;
transformed.z += sin(uTownTime * 0.61 + townPhase + 1.4) * townSway * 0.026 * uTownLive;
`;
export function createLooks(renderer){
 const uniforms={uTownLook:{value:0},uTownLive:{value:0},uTownTime:{value:0},uTownRegion:{value:0},uTownColor:{value:0}};
 const mats=[];let colorStrength=.7;
 function material({cells=false,water=false,building=false}={}){
  const m=new THREE.MeshStandardMaterial({vertexColors:true,roughness:water?.37:.94,metalness:water?.08:0});
  m.envMap=environment.texture;
  m.onBeforeCompile=shader=>{
   Object.assign(shader.uniforms,uniforms);
   shader.vertexShader=`attribute float townAO; attribute float townKind; attribute float townSway;
    varying float vTownAO; varying float vTownKind; varying vec3 vTownWorld;
    uniform float uTownTime; uniform float uTownLive;
    ${cells?'attribute vec3 cellAO1; attribute vec3 cellAO2; attribute float cellKind;':''}
    ${building?'attribute float warmth; attribute float windowStrength; varying float vWarmth; varying float vWindowStrength;':''}\n`+shader.vertexShader;
   shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>',`#include <begin_vertex>
    vTownKind=${cells?'cellKind':'townKind'};
    vTownAO=${cells?'normal.x > .5 ? cellAO1.x : normal.x < -.5 ? cellAO1.y : normal.y > .5 ? cellAO1.z : normal.y < -.5 ? cellAO2.x : normal.z > .5 ? cellAO2.y : cellAO2.z':'townAO'};
    ${building?'vWarmth = warmth; vWindowStrength=windowStrength;':''}
    ${windCode}`);
   shader.vertexShader=shader.vertexShader.replace('#include <worldpos_vertex>',`#include <worldpos_vertex>
    vec4 townPosition = vec4(transformed,1.0);
    #ifdef USE_INSTANCING
     townPosition = instanceMatrix * townPosition;
    #endif
    vTownWorld = (modelMatrix * townPosition).xyz;`);
   shader.fragmentShader=`varying float vTownAO; varying float vTownKind; varying vec3 vTownWorld;
    uniform float uTownLook; uniform float uTownLive; uniform float uTownTime; uniform float uTownRegion; uniform float uTownColor; uniform float uNight; uniform float uRooms;
    ${building?'varying float vWarmth; varying float vWindowStrength;':''}\n`+shader.fragmentShader;
   shader.fragmentShader=shader.fragmentShader.replace('#include <roughnessmap_fragment>',`#include <roughnessmap_fragment>
    float townRoughness = vTownKind > 6.5 ? .27 : vTownKind > 5.5 ? .46 : vTownKind > 4.5 ? .83 : vTownKind > 3.5 ? .86 : vTownKind > 2.5 ? .22 : vTownKind > 1.5 ? .74 : .94;
    roughnessFactor = mix(roughnessFactor,townRoughness,uTownLook);`);
   shader.fragmentShader=shader.fragmentShader.replace('#include <metalnessmap_fragment>',`#include <metalnessmap_fragment>
    metalnessFactor = mix(metalnessFactor,vTownKind > 5.5 && vTownKind < 6.5 ? .65 : 0.0,uTownLook);`);
   shader.fragmentShader=shader.fragmentShader.replace('#include <color_fragment>',`#include <color_fragment>
    if(uTownLook > .5 && vTownKind > 6.5 && vTownKind < 7.5){
     float shore = 0.0;
     if(uTownRegion < .5) shore = smoothstep(.45,1.0,length((vTownWorld.xz-vec2(-.8,2.0))/vec2(2.7,2.0)));
     else if(uTownRegion < 1.5) shore = smoothstep(.3,1.6,abs(vTownWorld.x));
     diffuseColor.rgb = mix(diffuseColor.rgb * .86,vec3(.29,.52,.46),shore*.48);
     float ripple = sin(vTownWorld.x*4.0+vTownWorld.z*2.1-uTownTime*.65) * sin(vTownWorld.z*3.3-uTownTime*.43);
     diffuseColor.rgb += vec3(.032,.047,.042) * smoothstep(.65,.98,ripple) * uTownLive;
    }
    if(uTownColor > 0.0){
     // Grade each surface before lighting; neutral whites retain their original hue.
     vec3 base = diffuseColor.rgb;
     float low = min(base.r,min(base.g,base.b));
     float high = max(base.r,max(base.g,base.b));
     float chroma = (high-low)/max(high,.001);
     float neutralGuard = smoothstep(.025,.17,chroma) * (1.0-smoothstep(.70,.94,low));
     float saturation = .43;
     if(vTownKind > .5 && vTownKind < 1.5) saturation = .24;
     if(vTownKind > 1.5 && vTownKind < 2.5) saturation = .25;
     if(vTownKind > 4.5 && vTownKind < 5.5) saturation = .06;
     float luminance = dot(base,vec3(.2126,.7152,.0722));
     base = mix(vec3(luminance),base,1.0+saturation*uTownColor*neutralGuard);
     if(vTownKind > 3.5 && vTownKind < 4.5){
      // Recover a greener canopy from the shared warm daylight, keeping its brightness.
      vec3 green = base * vec3(.82,1.09,.91);
      green *= luminance/max(dot(green,vec3(.2126,.7152,.0722)),.001);
      base = mix(base,green,uTownColor*.8);
     }
     diffuseColor.rgb = max(base,vec3(0.0));
    }`);
   shader.fragmentShader=shader.fragmentShader.replace('#include <normal_fragment_maps>',`#include <normal_fragment_maps>
    if(vTownKind > 6.5 && vTownKind < 7.5 && uTownLive > .5){
     vec3 waves = vec3(cos(vTownWorld.x*4.0+vTownWorld.z*2.1-uTownTime*.65)*.035,0.0,cos(vTownWorld.z*3.3-uTownTime*.43)*.022);
     normal = normalize(normal + (viewMatrix * vec4(waves,0.0)).xyz);
    }`);
   shader.fragmentShader=shader.fragmentShader.replace('#include <aomap_fragment>',`#include <aomap_fragment>
    float townOcclusion = mix(1.0,vTownAO,uTownLook);
    reflectedLight.indirectDiffuse *= townOcclusion;
    reflectedLight.directDiffuse *= mix(1.0,townOcclusion,.35);`);
   shader.fragmentShader=shader.fragmentShader.replace('#include <emissivemap_fragment>',`#include <emissivemap_fragment>
    totalEmissiveRadiance += vec3(1.0,.64,.28) * uNight * (1.0-step(.1,abs(vTownKind-8.0))) * 1.8;
    ${building?'totalEmissiveRadiance += vec3(1.0,.58,.22) * uNight * smoothstep(vWarmth-.07,vWarmth+.07,uRooms) * (1.0-step(.1,abs(vTownKind-3.0))) * vWindowStrength;':''}`);
  };
  m.customProgramCacheKey=()=>`town-look-2-${cells}-${water}-${building}`;mats.push(m);return m;
 }
 uniforms.uNight={value:0};
 uniforms.uRooms={value:1};
 const depth=new THREE.MeshDepthMaterial({depthPacking:THREE.RGBADepthPacking});
 depth.onBeforeCompile=shader=>{Object.assign(shader.uniforms,uniforms);shader.vertexShader='attribute float townSway; uniform float uTownTime; uniform float uTownLive;\n'+shader.vertexShader;shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\n'+windCode);};
 depth.customProgramCacheKey=()=> 'town-wind-depth-1';
 const data=new Uint8Array(128*64*4),sky=new THREE.Color('#b6d2df'),horizon=new THREE.Color('#fff0d8'),ground=new THREE.Color('#b2a68e');
 for(let y=0;y<64;y++)for(let x=0;x<128;x++){
  const h=y/63,c=h<.5?ground.clone().lerp(horizon,h*2):horizon.clone().lerp(sky,(h-.5)*2);c.convertLinearToSRGB();const k=(y*128+x)*4;data[k]=Math.round(c.r*255);data[k+1]=Math.round(c.g*255);data[k+2]=Math.round(c.b*255);data[k+3]=255;
 }
 const texture=new THREE.DataTexture(data,128,64);texture.colorSpace=THREE.SRGBColorSpace;texture.mapping=THREE.EquirectangularReflectionMapping;texture.needsUpdate=true;
 const pmrem=new THREE.PMREMGenerator(renderer),environment=pmrem.fromEquirectangular(texture);texture.dispose();pmrem.dispose();
 return{uniforms,material,depth,environment:environment.texture,
  setColor:value=>colorStrength=Math.max(0,Math.min(1,Number(value)||0)),
  set(mode,id){uniforms.uTownLook.value=mode>0?1:0;uniforms.uTownLive.value=mode===2?1:0;uniforms.uTownRegion.value=id==='oasis'?0:id==='canal'?1:2;uniforms.uTownColor.value=mode>0?colorStrength:0;mats.forEach(m=>m.envMapIntensity=mode>0?.42-.16*colorStrength:0);},
  tick:t=>uniforms.uTownTime.value=t,
  atmosphere:(night,rooms)=>{uniforms.uNight.value=night;uniforms.uRooms.value=rooms;mats.forEach(m=>m.envMapIntensity=(uniforms.uTownLook.value?(.42-.16*colorStrength):0)*(1-night*.86));},
  contact(bounds,y){
   const w=bounds.max[0]-bounds.min[0],d=bounds.max[1]-bounds.min[1],g=new THREE.PlaneGeometry(w+1.4,d+1.4);
   const m=new THREE.ShaderMaterial({transparent:true,depthWrite:false,uniforms:{uOpacity:{value:0},uSize:{value:new THREE.Vector2(w,d)}},vertexShader:'varying vec2 vLocal; void main(){vLocal=position.xy;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}',fragmentShader:'varying vec2 vLocal; uniform vec2 uSize; uniform float uOpacity; void main(){vec2 q=max(abs(vLocal)-uSize*.5,vec2(0.0)); float a=1.0-smoothstep(0.0,.7,length(q));gl_FragColor=vec4(.15,.19,.18,a*uOpacity);\n#include <colorspace_fragment>\n}'});
   const mesh=new THREE.Mesh(g,m);mesh.rotation.x=-Math.PI/2;mesh.position.set((bounds.min[0]+bounds.max[0])/2,y+.004,(bounds.min[1]+bounds.max[1])/2);mesh.userData.ownMaterial=true;return mesh;
  }
 };
}
