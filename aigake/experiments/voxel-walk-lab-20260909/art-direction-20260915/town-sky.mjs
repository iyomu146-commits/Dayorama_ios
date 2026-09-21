import * as THREE from 'three';

export function createTownSky(scene){
 const uniforms={uTop:{value:new THREE.Color()},uHorizon:{value:new THREE.Color()},uCloud:{value:new THREE.Color()},uNight:{value:0},uTime:{value:0},uAspect:{value:1},uSun:{value:new THREE.Vector2(.76,.73)}};
 const material=new THREE.ShaderMaterial({depthTest:false,depthWrite:false,toneMapped:false,uniforms,
 vertexShader:'varying vec2 vUv; void main(){vUv=uv;gl_Position=vec4(position.xy,1.0,1.0);}',
 fragmentShader:`varying vec2 vUv; uniform vec3 uTop,uHorizon,uCloud; uniform float uNight,uTime,uAspect; uniform vec2 uSun;
 float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
 float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.0-2.0*f);return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+1.0),f.x),f.y);}
 void main(){
  vec2 uv=vUv; vec3 color=mix(uHorizon,uTop,smoothstep(.05,1.0,uv.y));
  vec2 p=vec2(uv.x*uAspect*2.2+uTime*.002,uv.y*7.0);
  float n=noise(p)*.58+noise(p*2.03)*.28+noise(p*4.01)*.14;
  float cloud=smoothstep(.49,.76,n)*smoothstep(.25,.74,uv.y)*.48;
  color=mix(color,uCloud,cloud);
  vec2 light=(uv-uSun)*vec2(uAspect,1.0);float d=length(light);
  color+=vec3(.13,.095,.05)*exp(-d*8.0)*(1.0-uNight);
  float sun=1.0-smoothstep(.025,.029,d);color=mix(color,vec3(1.0,.88,.63),sun*(1.0-uNight)*.65);
  vec2 moon=(uv-vec2(.79,.82))*vec2(uAspect,1.0);
  float disc=1.0-smoothstep(.018,.021,length(moon));
  float cut=smoothstep(.017,.020,length(moon-vec2(.010,.005)));
  color+=vec3(.65,.73,.85)*disc*cut*uNight;
  vec2 grid=uv*vec2(130.0*uAspect,130.0),cell=floor(grid);float rnd=hash(cell);
  float star=(1.0-smoothstep(.04,.17,length(fract(grid)-.5)))*step(.984,rnd)*smoothstep(.35,.8,uv.y);
  color+=vec3(.72,.80,.95)*star*uNight*(.75+.25*sin(uTime*.25+rnd*160.0));
  gl_FragColor=vec4(color,1.0);
  #include <colorspace_fragment>
 }`});
 const mesh=new THREE.Mesh(new THREE.PlaneGeometry(2,2),material);mesh.frustumCulled=false;mesh.renderOrder=-100;scene.add(mesh);
 const mix=(a,b,t)=>new THREE.Color(a).lerp(new THREE.Color(b),t);
 return{update(c,region,elapsed,aspect){
  uniforms.uTop.value.copy(mix('#13283f',region==='oasis'?'#6bafcc':'#79b8dc',c.daylight)).lerp(new THREE.Color('#8974a5'),c.sunset*.65);
  uniforms.uHorizon.value.copy(mix('#354b63','#e3f0ed',c.daylight)).lerp(new THREE.Color('#efae83'),Math.max(c.sunset*.85,c.dawn*.48));
  uniforms.uCloud.value.copy(mix('#566782','#fff5e5',c.daylight));
  uniforms.uNight.value=c.night;uniforms.uTime.value=elapsed;uniforms.uAspect.value=aspect;
  uniforms.uSun.value.set(.2+.6*Math.max(0,Math.min(1,(c.hour-6)/12)),.62+.18*Math.sin(Math.max(0,Math.min(1,(c.hour-6)/12))*Math.PI));
 }};
}
