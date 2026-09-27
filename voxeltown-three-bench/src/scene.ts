import * as THREE from 'three';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import {World,CELL} from './world';import {buildChunk,palettePaint} from './mesher';import {u01} from './hash';import type {V3} from './types';

export class TownScene {
  renderer:THREE.WebGLRenderer;scene=new THREE.Scene();cloudScene=new THREE.Scene();
  camera:THREE.OrthographicCamera;cloudCamera:THREE.PerspectiveCamera;controls:OrbitControls;
  meshes=new Map<string,THREE.Mesh>();material:THREE.MeshLambertMaterial;
  paint:ReturnType<typeof palettePaint>;sun:THREE.DirectionalLight;
  renderCount=0;lastCalls=0;lastTriangles=0;
  constructor(public world:World,public host:HTMLElement,public invalidate:()=>void) {
    THREE.Object3D.DEFAULT_UP.set(0,0,1);
    this.renderer=new THREE.WebGLRenderer({antialias:true,alpha:true,powerPreference:'high-performance',preserveDrawingBuffer:false});
    this.renderer.setClearColor(0,0);this.renderer.autoClear=false;this.renderer.outputColorSpace=THREE.SRGBColorSpace;
    this.renderer.info.autoReset=false;this.renderer.shadowMap.enabled=true;this.renderer.shadowMap.type=THREE.PCFSoftShadowMap;
    this.renderer.shadowMap.autoUpdate=false;
    host.append(this.renderer.domElement);
    this.camera=new THREE.OrthographicCamera(-12,12,9,-9,.1,160);this.camera.up.set(0,0,1);
    this.controls=new OrbitControls(this.camera,this.renderer.domElement);this.controls.enableDamping=false;this.controls.enablePan=false;
    this.controls.minZoom=.65;this.controls.maxZoom=2.8;this.controls.minPolarAngle=.25;this.controls.maxPolarAngle=Math.PI/2-.08;
    this.controls.addEventListener('change',invalidate);
    this.material=this.makeMaterial();this.paint=palettePaint(world);
    this.sun=new THREE.DirectionalLight(new THREE.Color(...world.bundle.look.sun.color),world.bundle.look.sun.power*(world.bundle.look.lightClasses.sun??1));
    this.sun.target.position.set(8.4,6,4);
    this.sun.position.copy(this.sun.target.position).addScaledVector(new THREE.Vector3(...world.bundle.look.sun.dir),-32);
    this.sun.castShadow=true;this.sun.shadow.mapSize.set(2048,2048);this.sun.shadow.camera.near=.1;this.sun.shadow.camera.far=70;
    Object.assign(this.sun.shadow.camera,{left:-14,right:14,top:14,bottom:-14});
    this.sun.shadow.normalBias=.035;this.sun.shadow.bias=-.00015;
    this.scene.add(this.sun,this.sun.target);
    const sky=new THREE.HemisphereLight('#c3bacf','#674c64',world.bundle.look.sky.strength);sky.position.set(0,0,1);this.scene.add(sky);
    for(const key of world.occupiedChunkKeys())this.rebuild(key);
    this.addWires();this.cloudCamera=this.addClouds();
    this.resetView();this.resize();this.renderer.shadowMap.needsUpdate=true;
  }
  makeMaterial() {
    const mat=new THREE.MeshLambertMaterial({vertexColors:true});
    const g=this.world.bundle.look.grade;
    mat.onBeforeCompile=shader=>{
      shader.vertexShader='attribute vec3 benchEmission; attribute float benchHero; varying vec3 vBenchEmission; varying float vBenchHero;\n'+shader.vertexShader;
      shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nvBenchEmission=benchEmission;vBenchHero=benchHero;');
      shader.fragmentShader='varying vec3 vBenchEmission;varying float vBenchHero;\nvec3 hable(vec3 x){return ((x*(.22*x+.03)+.004)/(x*(.22*x+.30)+.06))-.033333333333;}\n'+shader.fragmentShader;
      shader.fragmentShader=shader.fragmentShader.replace('#include <emissivemap_fragment>','#include <emissivemap_fragment>\ntotalEmissiveRadiance += vBenchEmission;');
      shader.fragmentShader=shader.fragmentShader.replace('#include <tonemapping_fragment>',`
        gl_FragColor.rgb=hable(max(vec3(0.),gl_FragColor.rgb)*${(2**g.exposure*2).toFixed(8)})/hable(vec3(${g.white.toFixed(4)}));
      `);
      shader.fragmentShader=shader.fragmentShader.replace('#include <colorspace_fragment>',`#include <colorspace_fragment>
        vec3 c=gl_FragColor.rgb;
        float l=dot(c,vec3(.2126,.7152,.0722));
        c+=vec3(.027,.008,.04)*(1.-smoothstep(.12,.60,l));
        c=pow(clamp(c*vec3(${g.gain.join(',')})+vec3(${g.lift.join(',')})*(1.-c),0.,1.),1./vec3(${g.gamma.join(',')}));
        l=dot(c,vec3(.2126,.7152,.0722)); c=clamp(vec3(l)+(c-vec3(l))*${g.saturation.toFixed(4)},0.,1.);
        l=dot(c,vec3(.2126,.7152,.0722));c*=min(1.,.76/max(.00001,l));
        if(vBenchHero>.5)c=mix(vec3(.985,.925,.705),vec3(1.,.985,.83),clamp(dot(vBenchEmission,vec3(.2126,.7152,.0722)),0.,1.));
        gl_FragColor.rgb=c;
      `);
    };
    mat.customProgramCacheKey=()=> 'voxeltown-minimal-evening-v1';return mat;
  }
  rebuild(key:string) {
    const geometry=buildChunk(this.world,key,this.paint),old=this.meshes.get(key);
    if(old){old.geometry.dispose();old.geometry=geometry;}
    else {const mesh=new THREE.Mesh(geometry,this.material);mesh.castShadow=true;mesh.receiveShadow=true;mesh.userData.chunk=key;this.meshes.set(key,mesh);this.scene.add(mesh);}
  }
  applyEdit(cell:V3,value:number) {
    const start=performance.now(),result=this.world.edit(cell,value),buildStart=performance.now();
    for(const key of result.chunks)this.rebuild(key);
    const end=performance.now();this.renderer.shadowMap.needsUpdate=true;this.invalidate();
    return {operation:value?'add':'remove',cell,value,before:result.before,chunks:result.chunks,brokenPiece:result.brokenPiece,meshMs:end-buildStart,totalMs:end-start};
  }
  pick(clientX:number,clientY:number,add:boolean):V3|null {
    const r=this.renderer.domElement.getBoundingClientRect(),ray=new THREE.Raycaster();
    ray.setFromCamera(new THREE.Vector2((clientX-r.left)/r.width*2-1,-(clientY-r.top)/r.height*2+1),this.camera);
    const hit=ray.intersectObjects([...this.meshes.values()],false)[0];if(!hit?.face)return null;
    const n=hit.face.normal,p=hit.point.clone().addScaledVector(n,-.001).divideScalar(CELL).floor();
    if(add)p.add(n);const out=p.toArray() as V3;return this.world.inside(...out)?out:null;
  }
  addWires() {
    const geometries:THREE.BufferGeometry[]=[];
    for(const w of this.world.bundle.tile.wires) {
      class WireCurve extends THREE.Curve<THREE.Vector3>{constructor(){super();}getPoint(t:number,target=new THREE.Vector3()){return target.set(w.a[0]+(w.b[0]-w.a[0])*t,w.a[1]+(w.b[1]-w.a[1])*t,w.a[2]+(w.b[2]-w.a[2])*t-4*w.sag*t*(1-t));}}
      const path=new WireCurve();
      geometries.push(new THREE.TubeGeometry(path,39,w.radius,4,false));
    }
    if(geometries.length){const merged=mergeGeometries(geometries)!;geometries.forEach(g=>g.dispose());
      const mesh=new THREE.Mesh(merged,new THREE.MeshLambertMaterial({color:'#211a29'}));mesh.castShadow=true;this.scene.add(mesh);}
  }
  addClouds() {
    // Source cloud plates were inverse-projected for this fixed presentation view.
    // Preserve their coordinates in a separate backdrop pass; the town remains interactive/isometric.
    const view=this.world.bundle.tile.views[0] as {position:V3;forward:V3;up:V3;lensMm:number;sensorWidthMm:number;shift:[number,number]};
    const camera=new THREE.PerspectiveCamera(20,1,.1,200);camera.position.set(...view.position);camera.up.set(...view.up);camera.lookAt(new THREE.Vector3(...view.position).add(new THREE.Vector3(...view.forward)));camera.userData.view=view;
    const gs:THREE.BufferGeometry[]=[];
    const entry=this.world.bundle.palette.entries.find(p=>p.surface==='cloud')!;
    this.world.bundle.tile.clouds.forEach((c,i)=>{
      const size=c.max.map((v,k)=>v-c.min[k]),g=new THREE.BoxGeometry(...size as V3);
      g.translate(...c.min.map((v,k)=>v+size[k]/2) as V3);
      const color=new THREE.Color(entry.hex).multiplyScalar(.9+.12*u01(i,0,0,2));
      const cols=Array.from({length:g.getAttribute('position').count},()=>[color.r,color.g,color.b]).flat();
      g.setAttribute('color',new THREE.Float32BufferAttribute(cols,3));gs.push(g);
    });
    if(gs.length){const merged=mergeGeometries(gs)!;gs.forEach(g=>g.dispose());this.cloudScene.add(new THREE.Mesh(merged,new THREE.MeshBasicMaterial({vertexColors:true,transparent:true,opacity:.6})));}
    return camera;
  }
  resetView() {
    this.controls.target.set(8.4,5.9,4.4);
    this.camera.position.copy(this.controls.target).add(new THREE.Vector3(24,-32,28.284));
    this.camera.zoom=1;this.camera.updateProjectionMatrix();this.camera.lookAt(this.controls.target);this.controls.update();this.invalidate();
  }
  resize() {
    const fixed=document.documentElement.dataset.benchBuffer==='1280x720';
    const w=fixed?1280:this.host.clientWidth,h=fixed?720:this.host.clientHeight,ratio=fixed?1:Math.min(window.devicePixelRatio,1280/Math.max(w,h));
    this.renderer.setPixelRatio(ratio);this.renderer.setSize(w,h);
    if(fixed){const scale=Math.min(this.host.clientWidth/w,this.host.clientHeight/h);Object.assign(this.renderer.domElement.style,{width:`${w*scale}px`,height:`${h*scale}px`,position:'absolute',left:'50%',top:'50%',transform:'translate(-50%,-50%)'});}
    const half=9.0;this.camera.left=-half*w/h;this.camera.right=half*w/h;this.camera.top=half;this.camera.bottom=-half;this.camera.updateProjectionMatrix();
    const view=this.cloudCamera.userData.view,hfov=2*Math.atan(view.sensorWidthMm/(2*view.lensMm));
    // Source is square: preserve its vertical field and lens shift on wider screens.
    this.cloudCamera.aspect=w/h;this.cloudCamera.fov=THREE.MathUtils.radToDeg(hfov);this.cloudCamera.updateProjectionMatrix();
    this.cloudCamera.projectionMatrix.elements[8]=2*view.shift[0];this.cloudCamera.projectionMatrix.elements[9]=2*view.shift[1];
    this.cloudCamera.projectionMatrixInverse.copy(this.cloudCamera.projectionMatrix).invert();this.invalidate();
  }
  render() {
    this.renderer.info.reset();this.renderer.clear();
    this.renderer.render(this.cloudScene,this.cloudCamera);this.renderer.clearDepth();this.renderer.render(this.scene,this.camera);
    this.lastCalls=this.renderer.info.render.calls;this.lastTriangles=this.renderer.info.render.triangles;this.renderCount++;
  }
  stats(){const size=this.renderer.getDrawingBufferSize(new THREE.Vector2());return {baseChunks:Object.keys(this.world.bundle.tile.base.chunks).length,resolvedChunks:this.meshes.size,drawCalls:this.lastCalls,triangles:this.lastTriangles,renderCount:this.renderCount,resolution:size.toArray(),geometries:this.renderer.info.memory.geometries,textures:this.renderer.info.memory.textures};}
}
