import * as THREE from 'three';
import {STARS} from './stars.mjs';
import {center} from './model.mjs';
import {RAD,clamp,equatorialVector,skyRotation,localVector,scenicView,constellationView} from './sky-math.mjs';
import {GALACTIC_ROTATION,makeMilkyWayParticles,MILKY_WAY_GLSL,GALAXY_PARTICLE_VERTEX,GALAXY_PARTICLE_FRAGMENT} from './milky-way.mjs';

const skyFragment=`
precision highp float;
varying vec2 vUv;
uniform mat4 inverseProjection, cameraWorld;
uniform mat3 localToEquatorial;
const float PI=3.14159265359;
${MILKY_WAY_GLSL}
float ridge(float a){return .014+.007*sin(a*3.+1.)+.005*sin(a*9.-2.)+.002*sin(a*23.);}
void main(){
 vec4 ray=inverseProjection*vec4(vUv*2.-1.,1.,1.);
 vec3 dir=normalize(mat3(cameraWorld)*(ray.xyz/ray.w));
 vec3 eq=normalize(localToEquatorial*dir);
 vec3 color=vec3(.0009,.0017,.0045)+milkyWay(eq);
 float air=exp(-max(0.,dir.y)*9.);
 color+=vec3(.006,.010,.015)*air;
 color*=smoothstep(-.008,.095,dir.y)*.84+.16;
 float az=atan(dir.x,-dir.z),h=dir.y;
 float farRidge=ridge(az);
 color=mix(color,vec3(.0034,.0050,.0082),1.-smoothstep(farRidge,farRidge+.0016,h));
 float nearRidge=-.018+.009*sin(az*4.+3.)+.003*sin(az*17.);
 color=mix(color,vec3(.0014,.0027,.0046),1.-smoothstep(nearRidge,nearRidge+.001,h));
 // Mild optical vignette, with a dither below one display step to avoid bands.
 float vignette=1.-.14*pow(length(vUv-.5)*1.3,2.);
 color=pow(max(vec3(0.),color*vignette),vec3(1./2.2));
 float dither=fract(sin(dot(gl_FragCoord.xy,vec2(12.9898,78.233)))*43758.5453)-.5;
 gl_FragColor=vec4(color+dither/255.,1.);
}`;
const starVertex=`
attribute float magnitude, tint, phase;
uniform mat3 skyRotation;
uniform float pixelRatio,time,zoom;
varying float vBrightness,vFade,vTint;
void main(){
 vec3 dir=skyRotation*position;
 gl_Position=projectionMatrix*viewMatrix*vec4(dir*100.,1.);
 vBrightness=clamp((6.5-magnitude)/6.5,.04,1.3);
 vFade=smoothstep(.025,.14,dir.y)*(1.+.065*sin(time*(1.1+phase)+phase*23.));
 vTint=tint;
 gl_PointSize=(3.2+pow(vBrightness,1.5)*19.)*pixelRatio*zoom;
}`;
const starFragment=`
varying float vBrightness,vFade,vTint;
void main(){
 vec2 p=(gl_PointCoord-.5)*2.;float r2=dot(p,p);if(r2>1.)discard;
 float core=exp(-r2*85.)*1.75;
 float glow=exp(-r2*24.)*.46+exp(-r2*6.)*.045;
 float spike=(exp(-abs(p.x)*110.)*exp(-abs(p.y)*7.)+exp(-abs(p.y)*110.)*exp(-abs(p.x)*7.))*.022*smoothstep(.55,1.,vBrightness);
 vec3 tint=mix(vec3(.68,.81,1.),vec3(1.,.78,.52),clamp((vTint+.2)/2.,0.,1.));
 vec3 color=mix(tint,vec3(.95,.98,1.),.35);
 gl_FragColor=vec4(color,(core+glow+spike)*vFade*(.44+vBrightness*.8));
}`;

export function createSky(host,{onFrame=()=>{},onTap=()=>{},onError=()=>{}}={}){
 const renderer=new THREE.WebGLRenderer({antialias:false,alpha:false,powerPreference:'low-power'});
 renderer.setPixelRatio(Math.min(devicePixelRatio||1,1.75));
 renderer.domElement.className='star-sky-canvas';renderer.domElement.setAttribute('aria-hidden','true');host.prepend(renderer.domElement);
 const scene=new THREE.Scene(),backgroundScene=new THREE.Scene(),camera=new THREE.PerspectiveCamera(74,1,.1,150);
 const skyToLocal=new THREE.Matrix3(),inverse=new THREE.Matrix3();
 const galactic=new THREE.Matrix3().set(...GALACTIC_ROTATION);
 const screenVertex='varying vec2 vUv;void main(){vUv=uv;gl_Position=vec4(position.xy,1.,1.);}';
 const material=new THREE.ShaderMaterial({depthTest:false,depthWrite:false,uniforms:{equatorialToGalactic:{value:galactic},inverseProjection:{value:camera.projectionMatrixInverse},cameraWorld:{value:camera.matrixWorld},localToEquatorial:{value:inverse}},vertexShader:screenVertex,fragmentShader:skyFragment});
 const screenGeometry=new THREE.PlaneGeometry(2,2),plane=new THREE.Mesh(screenGeometry,material);plane.frustumCulled=false;backgroundScene.add(plane);
 // Cache only the GPU-generated diffuse layer when the view is stationary.
 // This is a render target, not an image asset; every new view is re-shaded.
 const backgroundTarget=new THREE.WebGLRenderTarget(1,1,{depthBuffer:false,stencilBuffer:false});
 const displayMaterial=new THREE.ShaderMaterial({depthTest:false,depthWrite:false,uniforms:{skyFrame:{value:backgroundTarget.texture}},vertexShader:screenVertex,fragmentShader:'varying vec2 vUv;uniform sampler2D skyFrame;void main(){gl_FragColor=texture2D(skyFrame,vUv);}'});
 const display=new THREE.Mesh(screenGeometry,displayMaterial);display.frustumCulled=false;display.renderOrder=-10;scene.add(display);
 const particles=makeMilkyWayParticles(),particleGeometry=new THREE.BufferGeometry();
 particleGeometry.setAttribute('position',new THREE.BufferAttribute(particles.positions,3));particleGeometry.setAttribute('flux',new THREE.BufferAttribute(particles.flux,1));particleGeometry.setAttribute('pointSize',new THREE.BufferAttribute(particles.sizes,1));particleGeometry.setAttribute('particleColor',new THREE.BufferAttribute(particles.colors,3));
 const particleMaterial=new THREE.ShaderMaterial({transparent:true,depthWrite:false,depthTest:false,blending:THREE.AdditiveBlending,uniforms:{skyRotation:{value:skyToLocal},pixelRatio:{value:renderer.getPixelRatio()},zoom:{value:1}},vertexShader:GALAXY_PARTICLE_VERTEX,fragmentShader:GALAXY_PARTICLE_FRAGMENT});
 const particleField=new THREE.Points(particleGeometry,particleMaterial);particleField.frustumCulled=false;scene.add(particleField);
 const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(STARS.flatMap(equatorialVector),3));
 for(const [name,values]of [['magnitude',STARS.map(s=>s[2])],['tint',STARS.map(s=>s[3])],['phase',STARS.map((_,i)=>(i*.61803398875)%1)]])geometry.setAttribute(name,new THREE.Float32BufferAttribute(values,1));
 const starMaterial=new THREE.ShaderMaterial({transparent:true,depthWrite:false,depthTest:false,blending:THREE.AdditiveBlending,uniforms:{skyRotation:{value:skyToLocal},pixelRatio:{value:renderer.getPixelRatio()},time:{value:0},zoom:{value:1}},vertexShader:starVertex,fragmentShader:starFragment});
 const stars=new THREE.Points(geometry,starMaterial);stars.frustumCulled=false;stars.renderOrder=1;scene.add(stars);
 let disposed=false,running=false,raf=0,last=0,width=1,height=1,date=new Date(),site='north',azimuth=180,altitude=32,fov=74,viewShift=0,tween=null,backgroundKey='',skyRevision=0;
 const reduced=matchMedia('(prefers-reduced-motion: reduce)');
 const pointers=new Map();let drag=null,pinch=null,moved=false;
 const v=new THREE.Vector3();
 function orient(){camera.fov=fov;camera.aspect=width/height;if(viewShift)camera.setViewOffset(width,height,0,height*viewShift,width,height);else camera.clearViewOffset();camera.updateProjectionMatrix();camera.lookAt(Math.sin(azimuth*RAD)*Math.cos(altitude*RAD),Math.sin(altitude*RAD),-Math.cos(azimuth*RAD)*Math.cos(altitude*RAD));camera.updateMatrixWorld();starMaterial.uniforms.zoom.value=Math.sqrt(74/fov);}
 function project(star){v.fromArray(localVector(star,date,site));const above=v.y>.018;v.multiplyScalar(100).project(camera);return{x:(v.x+1)*width/2,y:(1-v.y)*height/2,visible:above&&v.z>-1&&v.z<1&&Math.abs(v.x)<1.1&&Math.abs(v.y)<1.1};}
 function render(time){if(disposed||!running||document.hidden)return;
  if(tween){const t=clamp((time-tween.start)/900,0,1),s=t*t*(3-2*t);azimuth=tween.from.azimuth+tween.delta*s;altitude=tween.from.altitude+(tween.to.altitude-tween.from.altitude)*s;fov=tween.from.fov+(tween.to.fov-tween.from.fov)*s;if(t===1)tween=null;}
  orient();starMaterial.uniforms.time.value=reduced.matches?0:time/1000;particleMaterial.uniforms.zoom.value=starMaterial.uniforms.zoom.value;
  const key=[azimuth,altitude,fov,viewShift,width,height,skyRevision].join('/');
  if(key!==backgroundKey){renderer.setRenderTarget(backgroundTarget);renderer.render(backgroundScene,camera);renderer.setRenderTarget(null);backgroundKey=key;}
  renderer.render(scene,camera);onFrame({project,width,height,azimuth,altitude,fov});
 }
 function loop(time){if(!running)return;raf=requestAnimationFrame(loop);if(time-last<32)return;last=time;render(time);}
 function resize(){const rect=host.getBoundingClientRect();if(rect.width<1||rect.height<1)return;width=rect.width;height=rect.height;renderer.setSize(width,height,false);const scale=Math.min(1.2,Math.sqrt(1000000/(width*height)));backgroundTarget.setSize(Math.ceil(width*scale),Math.ceil(height*scale));backgroundKey='';orient();render(performance.now());}
 const observer=new ResizeObserver(resize);observer.observe(host);
 function moveTo(to,animate=true){viewShift=0;const delta=((to.azimuth-azimuth+540)%360)-180;if(animate&&!reduced.matches)tween={start:performance.now(),from:{azimuth,altitude,fov},to,delta};else{azimuth=to.azimuth;altitude=to.altitude;fov=to.fov;tween=null;render(performance.now());}}
 function fit(c){
  const view=constellationView(c,date,site,width/height);({azimuth,altitude,fov,viewShift}=view);tween=null;orient();render(performance.now());
 }
 function distance(){const [a,b]=[...pointers.values()];return Math.hypot(a.x-b.x,a.y-b.y);}
 function down(e){if(e.button!==0||e.target.closest('button'))return;pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});host.setPointerCapture(e.pointerId);tween=null;if(pointers.size===1){moved=false;drag={x:e.clientX,y:e.clientY,azimuth,altitude};}else{pinch={distance:distance(),fov};moved=true;}}
 function move(e){if(!pointers.has(e.pointerId))return;pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});if(pointers.size>1){if(pinch)fov=clamp(pinch.fov*pinch.distance/Math.max(1,distance()),18,170);return;}if(!drag)return;const dx=e.clientX-drag.x,dy=e.clientY-drag.y;if(Math.hypot(dx,dy)>5)moved=true;if(moved){azimuth=drag.azimuth-dx*fov/height;altitude=clamp(drag.altitude+dy*fov/height,-8,89.5);}}
 function up(e){if(!pointers.has(e.pointerId))return;const tap=!moved&&pointers.size===1;pointers.delete(e.pointerId);if(pointers.size){const [p]=pointers.values();drag={x:p.x,y:p.y,azimuth,altitude};pinch=null;moved=true;}else{drag=null;pinch=null;}if(tap){const r=host.getBoundingClientRect();onTap(e.clientX-r.left,e.clientY-r.top);}}
 function cancel(e){pointers.delete(e.pointerId);drag=null;pinch=null;moved=true;}
 function wheel(e){e.preventDefault();tween=null;fov=clamp(fov*Math.exp(e.deltaY*.001),18,170);}
 function key(e){const action={ArrowLeft:()=>azimuth-=7,ArrowRight:()=>azimuth+=7,ArrowUp:()=>altitude=clamp(altitude+7,-8,89.5),ArrowDown:()=>altitude=clamp(altitude-7,-8,89.5),'+':()=>fov=clamp(fov/1.2,18,170),'-':()=>fov=clamp(fov*1.2,18,170)}[e.key];if(action){e.preventDefault();tween=null;action();}}
 function contextLost(e){e.preventDefault();onError('星空の描画が中断されました。復帰するまでお待ちください。');}
 function contextRestored(){backgroundKey='';onError('');}
 host.addEventListener('pointerdown',down);host.addEventListener('pointermove',move);host.addEventListener('pointerup',up);host.addEventListener('pointercancel',cancel);host.addEventListener('wheel',wheel,{passive:false});host.addEventListener('keydown',key);renderer.domElement.addEventListener('webglcontextlost',contextLost);renderer.domElement.addEventListener('webglcontextrestored',contextRestored);
 return{
  setObservation(nextDate,nextSite){date=nextDate;site=nextSite;skyToLocal.set(...skyRotation(date,site));inverse.copy(skyToLocal).transpose();skyRevision++;},
  start(){if(running)return;running=true;resize();raf=requestAnimationFrame(loop);},
  stop(){running=false;cancelAnimationFrame(raf);pointers.clear();drag=null;pinch=null;},
  scenic(animate=true){moveTo(scenicView(date,site),animate);},
  locate(c){const xyz=localVector(center(c),date,site);moveTo({azimuth:Math.atan2(xyz[0],-xyz[2])/RAD,altitude:clamp(Math.asin(xyz[1])/RAD,0,89.5),fov:74});},
  fit,project,
  zoom(factor){tween=null;fov=clamp(fov*factor,18,170);},
  destroy(){disposed=true;running=false;cancelAnimationFrame(raf);observer.disconnect();for(const [event,fn]of [['pointerdown',down],['pointermove',move],['pointerup',up],['pointercancel',cancel],['wheel',wheel],['keydown',key]])host.removeEventListener(event,fn);backgroundTarget.dispose();displayMaterial.dispose();screenGeometry.dispose();material.dispose();particleGeometry.dispose();particleMaterial.dispose();geometry.dispose();starMaterial.dispose();renderer.dispose();renderer.domElement.remove();}
 };
}

