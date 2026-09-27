import * as THREE from 'three';
import {TownScene} from './scene';
import {World} from './world';
import {buildChunk} from './mesher';
import {storyState,type StorySpec} from './story-state';
import {attachStoryDrawList} from './story-draw-list';

const fallShader=`
 float age=uStoryTime-aStory.x;
 float p=clamp(age/.32,0.,1.);
 transformed.z+=aStory.z*(.60*(1.-p)*(1.-p));
 if(age<0. || uStoryTime>=aStory.y) transformed=vec3(0.);
`;
export class StoryPlayer {
 spec!:StorySpec;root=new THREE.Group();instances!:THREE.InstancedMesh;
 original=new Map<string,THREE.BufferGeometry>();context=new Map<string,THREE.BufferGeometry>();
 actor=new THREE.Group();parts=new Map<string,THREE.Mesh>();
 uniform={value:0};active=false;playing=false;time=0;last=0;
 light={value:1};frames:number[]=[];phaseFrames:Record<string,number[]>={};prepareMs=0;
 spill!:THREE.Mesh;
 audio?:AudioContext;buffers=new Map<string,AudioBuffer>();sources=new Set<AudioBufferSourceNode>();muted=false;
 lastPop=-1;completePlayed=false;lastStep=-1;finalShown=true;
 interrupted=false;
 warmupMs=0;firstReadyMs=0;runNumber=0;
 drawList!:ReturnType<typeof attachStoryDrawList>;
 constructor(public town:TownScene,public changed:(s:ReturnType<typeof storyState>)=>void,public ended:(r:any)=>void){}
 async load(){
  const start=performance.now(),r=await fetch('/story/story.json');if(!r.ok)throw Error('Story data missing');this.spec=await r.json();
  const w=new World(this.town.world.bundle);w.grid=this.town.world.grid.slice();w.owner=this.town.world.owner.slice();w.pieces=this.spec.contextPieces;
  for(const [i,v,o] of this.spec.contextPatch){w.grid[i]=v;w.owner[i]=o;}
  // Cache the context before playback. Keep original GPU resources for an exact final scene.
  for(const [key,mesh] of this.town.meshes){this.original.set(key,mesh.geometry);this.context.set(key,buildChunk(w,key));}
  const geometry=new THREE.BoxGeometry(1,1,1),count=geometry.attributes.position.count;
  geometry.setAttribute('benchEmission',new THREE.Float32BufferAttribute(new Float32Array(count*3),3));
  geometry.setAttribute('benchHero',new THREE.Float32BufferAttribute(new Float32Array(count),1));
  geometry.setAttribute('color',new THREE.Float32BufferAttribute(new Float32Array(count*3).fill(1),3));
  const times=new Float32Array(this.spec.instances.length*3);
  const material=this.town.makeMaterial(),compile=material.onBeforeCompile;
  material.onBeforeCompile=(shader,renderer)=>{compile.call(material,shader,renderer);shader.uniforms.uStoryTime=this.uniform;shader.vertexShader='attribute vec3 aStory;uniform float uStoryTime;\n'+shader.vertexShader;shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\n'+fallShader);};
  material.customProgramCacheKey=()=> 'story-fall-v1';
  const mesh=new THREE.InstancedMesh(geometry,material,this.spec.instances.length),m=new THREE.Matrix4(),p=new THREE.Vector3(),scale=new THREE.Vector3(),q=new THREE.Quaternion();
  this.spec.instances.forEach((r,i)=>{p.set(r[0],r[1],r[2]);scale.set(r[3],r[4],r[5]);m.compose(p,q,scale);mesh.setMatrixAt(i,m);mesh.setColorAt(i,new THREE.Color(r[6],r[7],r[8]));times.set(r.slice(9,12),i*3);});
  geometry.setAttribute('aStory',new THREE.InstancedBufferAttribute(times,3));
  // Local vertex displacement precedes instance scaling, so compensate for z scale.
  const zSizes=new Float32Array(this.spec.instances.map(r=>r[5]));geometry.setAttribute('aHeight',new THREE.InstancedBufferAttribute(zSizes,1));
  const originalCompile=material.onBeforeCompile;material.onBeforeCompile=(shader,renderer)=>{originalCompile.call(material,shader,renderer);shader.vertexShader='attribute float aHeight;\n'+shader.vertexShader;shader.vertexShader=shader.vertexShader.replace('.60*(1.-p)*(1.-p)', '.60/max(.0001,aHeight)*(1.-p)*(1.-p)');};
  const depth=new THREE.MeshDepthMaterial({depthPacking:THREE.RGBADepthPacking});depth.onBeforeCompile=shader=>{shader.uniforms.uStoryTime=this.uniform;shader.vertexShader='attribute vec3 aStory;attribute float aHeight;uniform float uStoryTime;\n'+shader.vertexShader;shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\n'+fallShader.replace('.60*(1.-p)*(1.-p)','.60/max(.0001,aHeight)*(1.-p)*(1.-p)'));};depth.customProgramCacheKey=()=> 'story-depth-v1';
  mesh.customDepthMaterial=depth;mesh.castShadow=true;mesh.receiveShadow=true;mesh.frustumCulled=false;this.instances=mesh;this.root.add(mesh);
  for(const a of [mesh.instanceMatrix,mesh.instanceColor!,geometry.getAttribute('aStory'),geometry.getAttribute('aHeight')]) (a as THREE.BufferAttribute).setUsage(THREE.DynamicDrawUsage);
  this.drawList=attachStoryDrawList(mesh,this.spec);
  for(const [id,position,size,color] of this.spec.actor.boxes){const part=new THREE.Mesh(new THREE.BoxGeometry(...size as [number,number,number]),new THREE.MeshLambertMaterial({color}));part.position.fromArray(position);part.userData.base=part.position.clone();part.castShadow=true;part.receiveShadow=true;this.actor.add(part);this.parts.set(id,part);}
  this.root.add(this.actor);this.root.visible=false;this.town.scene.add(this.root);
  const spillMaterial=new THREE.ShaderMaterial({transparent:true,depthWrite:false,uniforms:{power:{value:0}},vertexShader:'varying vec2 p;void main(){p=uv*2.-1.;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',fragmentShader:'varying vec2 p;uniform float power;void main(){float a=pow(max(0.,1.-dot(p,p)),2.)*.18*power;gl_FragColor=vec4(1.,.64,.27,a);}'});
  this.spill=new THREE.Mesh(new THREE.PlaneGeometry(2.1,2.0),spillMaterial);this.spill.position.set(11.55,5.6,2.407);this.root.add(this.spill);
  this.town.storyLight=this.light;this.town.material.needsUpdate=true;
  this.prepareMs=performance.now()-start;
 }
 async unlockAudio(){
  this.audio??=new AudioContext();await this.audio.resume();
  if(!this.buffers.size)await Promise.all(['place','complete','step'].map(async name=>{const r=await fetch('/story/'+name+'.wav');this.buffers.set(name,await this.audio!.decodeAudioData(await r.arrayBuffer()));}));
 }
 sound(name:string,gain:number){if(this.muted||!this.audio||this.audio.state!=='running'||!this.buffers.has(name))return;const source=this.audio.createBufferSource(),volume=this.audio.createGain();source.buffer=this.buffers.get(name)!;volume.gain.value=gain;source.connect(volume).connect(this.audio.destination);this.sources.add(source);source.onended=()=>{source.disconnect();volume.disconnect();this.sources.delete(source);};source.start();}
 silence(){for(const source of this.sources){try{source.stop();}catch{}}this.sources.clear();}
 async warmup(){
  const start=performance.now(),canvas=this.town.renderer.domElement,visibility=canvas.style.visibility;
  canvas.style.visibility='hidden';this.root.visible=true;
  try{
   for(const t of [16,26.5,0]){
    this.time=t;this.update();
    await new Promise<void>(resolve=>requestAnimationFrame(()=>resolve()));
    this.town.render();
   }
   // A single loading-time fence includes initial shader/buffer GPU work in readiness.
   // Never used in timed playback or to manufacture an FPS result.
   this.town.renderer.getContext().finish();
  }finally{canvas.style.visibility=visibility;this.warmupMs=performance.now()-start;}
 }
 start(){this.runNumber++;this.active=true;this.playing=true;this.frames=[];this.phaseFrames={};this.last=0;this.completePlayed=false;this.lastPop=-1;this.lastStep=-1;this.root.visible=true;this.town.controls.enabled=false;this.seek(0);this.interrupted=false;}
 seek(t:number){this.interrupted=true;this.time=Math.max(0,Math.min(this.spec.duration,t));this.last=0;this.silence();this.completePlayed=this.time>=this.spec.finishTime;this.lastPop=Math.floor(this.time*7);this.update();}
 update(){
  const s=storyState(this.spec,this.time);this.uniform.value=this.time;this.drawList.update(this.time);
  if(this.finalShown!==s.finished){for(const [key,mesh] of this.town.meshes)mesh.geometry=(s.finished?this.original:this.context).get(key)!;this.finalShown=s.finished;}
  this.instances.visible=!s.finished;this.light.value=s.light;
  this.actor.visible=s.actorVisible;this.actor.position.fromArray(s.actorPosition);this.actor.rotation.z=s.heading;
  (this.spill.material as THREE.ShaderMaterial).uniforms.power.value=s.light;
  for(const [id,part] of this.parts){part.position.copy(part.userData.base);part.rotation.set(0,0,0);const side=id.endsWith('L')?1:-1;
   if(id.startsWith('leg')||id.startsWith('shoe')){part.position.y+=s.step*.095*side;part.position.z+=Math.max(0,s.step*side)*.04;}
   if(id.startsWith('arm')||id.startsWith('hand')){const pivot=new THREE.Vector3(side===1?-.285:.285,0,1.095);const rx=-s.step*.22*side,ry=side===-1?-2.2*s.wave:0;part.rotation.set(rx,ry,0);part.position.sub(pivot).applyEuler(part.rotation).add(pivot);}
  }
  this.town.controls.target.fromArray(this.spec.camera.target);this.town.camera.position.copy(this.town.controls.target).add(new THREE.Vector3().fromArray(this.spec.camera.offset));this.town.camera.lookAt(this.town.controls.target);this.town.camera.zoom=s.zoom;this.town.camera.updateProjectionMatrix();
  this.town.renderer.shadowMap.needsUpdate=true;this.changed(s);
 }
 tick(now:number){if(!this.active||!this.playing)return;const dt=this.last?(now-this.last):0;this.last=now;if(dt>0){this.frames.push(dt);const p=storyState(this.spec,this.time).phase;(this.phaseFrames[p]??=[]).push(dt);}this.time=Math.min(this.spec.duration,this.time+dt/1000);this.update();
  const pop=Math.floor(this.time*7);if(this.time>=this.spec.buildStart+this.spec.fallDuration&&this.time<this.spec.finishTime&&pop!==this.lastPop){this.sound('place',.28);this.lastPop=pop;}
  if(this.time>=this.spec.finishTime&&!this.completePlayed){this.sound('complete',.65);this.completePlayed=true;}
  const s=storyState(this.spec,this.time),step=Math.floor((this.time-this.spec.residentTime)*3.6);if(s.walking&&step!==this.lastStep){this.sound('step',.7);this.lastStep=step;}
  if(this.time>=this.spec.duration){this.playing=false;this.ended({id:this.spec.id,revision:'story-v2',runNumber:this.runNumber,sourceGridSha256:this.spec.sourceGridSha256,prepareMs:this.prepareMs,warmupMs:this.warmupMs,firstReadyMs:this.firstReadyMs,intervalsMs:this.frames,phaseIntervalsMs:this.phaseFrames,finalCells:s.n,completed:true,continuousPlayback:!this.interrupted&&this.frames.reduce((a,b)=>a+b,0)>=31000,resolution:this.town.stats().resolution,mode:'instanced-order-presentation-v1',presentationCull:'dense-six-settled-unit-neighbours-v1',note:'Preparation and warmup outside timed playback, reported separately. CPU frame callback cadence, not GPU presentation.'});}
 }
 exit(){this.active=false;this.playing=false;this.silence();this.root.visible=false;this.light.value=1;for(const [key,mesh] of this.town.meshes)mesh.geometry=this.original.get(key)!;this.finalShown=true;this.town.controls.enabled=true;this.town.resetView();this.town.renderer.shadowMap.needsUpdate=true;}
}
