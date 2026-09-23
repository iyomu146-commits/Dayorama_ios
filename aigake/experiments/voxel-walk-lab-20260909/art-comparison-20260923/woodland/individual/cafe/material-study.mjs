// Finish on the authoritative 15cm surface. No offsets, extra faces or cell edits.
export const MATERIAL={plaster:0,slate:1,wood:2,glass:3,brick:4,stone:5,pottery:6,leaf:7,cloth:8,metal:9};
export function substanceOf(color,part){
 if(color.startsWith('slate'))return MATERIAL.slate;
 if(color.startsWith('wood'))return MATERIAL.wood;
 if(color.startsWith('glass'))return MATERIAL.glass;
 if(color.startsWith('brick')||color==='mortar')return MATERIAL.brick;
 if(color.startsWith('stone'))return MATERIAL.stone;
 if(color.startsWith('pot')||part==='cup')return MATERIAL.pottery;
 if(color.startsWith('leaf')||color.startsWith('pink')||color==='cream')return MATERIAL.leaf;
 if(part==='awning')return MATERIAL.cloth;
 if(color==='metal')return MATERIAL.metal;
 return MATERIAL.plaster;
}

// A merged face never spans different cell colors. Sample inside its triangle to
// recover the material from the cells, not from lit vertex colors or roughness.
export function materialChannels(mesh,cells,cellSize){
 const channels=new Float32Array(mesh.positions.length/3*2);
 for(let i=0;i<mesh.positions.length;i+=9){
  const q=[0,1,2].map(a=>Math.floor((mesh.positions[i+a]+mesh.positions[i+3+a]+mesh.positions[i+6+a])/(3*cellSize)-mesh.normals[i+a]*.0001));
  const cell=cells.get(q.join(','));
  if(!cell)throw Error('Finish cannot find source cell at '+q.join(','));
  // Slate underlay and ridge have distinct flags; no fake tile seams there.
  const substance=substanceOf(cell.color,cell.part);
  const id=cell.part==='tiles'&&substance===MATERIAL.slate?10:substance;
  // Vertical posts, horizontal rails and top boards use their own grain direction.
  let axis=1;
  if(cell.part==='table'&&cell.y>=7||cell.part.startsWith('chair-')&&(cell.y===5||cell.y>=9)||cell.part==='fascia')axis=0;
  if(cell.part==='front-window'&&(cell.y===7||cell.y===16))axis=0;
  if(cell.part==='side-window'&&(cell.y===7||cell.y===16))axis=2;
  for(let v=0;v<3;v++)channels.set([id,axis],(i/3+v)*2);
 }
 return channels;
}

export function installMaterialStudy(material){
 material.userData.microDetail={value:1};
 material.onBeforeCompile=s=>{
  s.uniforms.microDetail=material.userData.microDetail;
  s.vertexShader='attribute vec2 substance; varying vec2 vSubstance; varying vec3 vCraftPosition; varying vec3 vCraftNormal;\n'+s.vertexShader;
  s.vertexShader=s.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nvSubstance=substance; vCraftPosition=position; vCraftNormal=normal;');
  s.fragmentShader=`varying vec2 vSubstance; varying vec3 vCraftPosition; varying vec3 vCraftNormal; uniform float microDetail;
float craftHash(vec3 p){p=fract(p*.1031);p+=dot(p,p.yzx+33.33);return fract((p.x+p.y)*p.z);}
float craftNoise(vec3 p){vec3 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(mix(craftHash(i),craftHash(i+vec3(1,0,0)),f.x),mix(craftHash(i+vec3(0,1,0)),craftHash(i+vec3(1,1,0)),f.x),f.y),mix(mix(craftHash(i+vec3(0,0,1)),craftHash(i+vec3(1,0,1)),f.x),mix(craftHash(i+vec3(0,1,1)),craftHash(i+vec3(1,1,1)),f.x),f.y),f.z);}
float craftIs(float id){return 1.-step(.1,abs(vSubstance.x-id));}
float craftEdge(float f,float width,float aa){float d=min(f,1.-f);return 1.-smoothstep(width,width+max(aa,.001),d);}
`+s.fragmentShader;
  s.fragmentShader=s.fragmentShader.replace('#include <color_fragment>',`#include <color_fragment>
vec3 cp=vCraftPosition;
float tile=craftIs(10.);
float plaster=craftIs(0.),slate=craftIs(1.)+tile,wood=craftIs(2.),glass=craftIs(3.),brick=craftIs(4.),stone=craftIs(5.),pottery=craftIs(6.),leaf=craftIs(7.),cloth=craftIs(8.),metal=craftIs(9.);
float footprint=max(length(dFdx(cp)),length(dFdy(cp)));
float fineFade=1.-smoothstep(.006,.022,footprint);
float mesoFade=1.-smoothstep(.028,.075,footprint);
float broad=craftNoise(cp*vec3(1.4,2.1,1.7));
float middle=craftNoise(cp*vec3(9.,13.,11.));
float fine=craftNoise(cp*155.);
// Unit-scale patina follows real tile courses; it does not draw a voxel grid.
vec2 tileUV=vec2((cp.x+3.)/.6,(2.7-abs(cp.z))/.45);
float tileTone=craftHash(vec3(floor(tileUV+vec2(.0001)),21.));
float tileJoint=craftEdge(fract(tileUV.x),.008,fwidth(tileUV.x)*.65);
float roofMottle=(broad-.5)*.25+(middle-.5)*.12;
diffuseColor.rgb*=1.+slate*(-.12+roofMottle)+tile*((tileTone-.5)*.40-tileJoint*.14*mesoFade);
diffuseColor.rgb=mix(diffuseColor.rgb,diffuseColor.rgb*vec3(.94,1.035,1.015),slate*smoothstep(.52,.8,broad)*.55);
// Soft plaster clouds and low-level warmth; no photographic dirt layer.
diffuseColor.rgb*=1.+plaster*((broad-.5)*.16+(middle-.5)*.05);
diffuseColor.rgb*=vec3(1.)+plaster*(1.-smoothstep(.5,1.3,cp.y))*vec3(.005,-.025,-.045);
// Grain stays aligned with the beam, including table tops and chair rails.
vec3 grainP=vSubstance.y<.5?cp.yxz:(vSubstance.y>1.5?cp.xzy:cp);
float grain=craftNoise(grainP*vec3(72.,2.,85.));
float grainBroad=craftNoise(grainP*vec3(8.,.65,9.));
diffuseColor.rgb*=1.+wood*((grainBroad-.5)*.19+microDetail*mesoFade*(grain-.5)*.13);
vec2 wallUV=abs(vCraftNormal.x)>.5?cp.zy:cp.xy;
float row=floor(wallUV.y/.15+.0001);
vec2 brickUV=vec2(wallUV.x/.6+mod(row,2.)*.5,wallUV.y/.15);
float fired=craftHash(vec3(floor(brickUV+vec2(.0001)),7.));
diffuseColor.rgb*=1.+brick*((fired-.5)*.18+(middle-.5)*.08);
float mortar=max(craftEdge(fract(brickUV.y),.016,fwidth(brickUV.y)*.65),craftEdge(fract(brickUV.x),.010,fwidth(brickUV.x)*.5));
diffuseColor.rgb*=1.-brick*microDetail*mesoFade*mortar*.10;
diffuseColor.rgb*=1.+stone*((broad-.5)*.13+(middle-.5)*.10);
diffuseColor.rgb*=1.+pottery*((middle-.5)*.08)+cloth*((broad-.5)*.08);
diffuseColor.rgb*=1.+microDetail*fineFade*(fine-.5)*(.035*slate+.018*plaster+.025*stone);
`);
  s.fragmentShader=s.fragmentShader.replace('#include <roughnessmap_fragment>',`#include <roughnessmap_fragment>
roughnessFactor=clamp(.91*plaster+.70*slate+.79*wood+.26*glass+.94*brick+.88*stone+.76*pottery+.87*leaf+.96*cloth+.42*metal+microDetail*mesoFade*(middle-.5)*(.13*slate+.10*wood+.06*plaster+.08*stone),.24,1.);`);
  s.fragmentShader=s.fragmentShader.replace('#include <normal_fragment_maps>',`#include <normal_fragment_maps>
// Only the lighting normal changes. Silhouette and raycast surfaces stay exact.
float relief=microDetail*(mesoFade*((middle-.5)*(.0033*slate+.0008*plaster+.0010*stone+.0007*brick)+(grain-.5)*wood*.00065-tile*tileJoint*.0008)+fineFade*(fine-.5)*(.0004*slate+.00015*plaster));
vec3 cdx=dFdx(-vViewPosition),cdy=dFdy(-vViewPosition);
vec3 cr1=cross(cdy,normal),cr2=cross(normal,cdx);float det=dot(cdx,cr1);
normal=normalize(abs(det)*normal-sign(det)*(dFdx(relief)*cr1+dFdy(relief)*cr2));`);
 };
 material.customProgramCacheKey=()=> 'cafe-sharp-material-v2';
}
