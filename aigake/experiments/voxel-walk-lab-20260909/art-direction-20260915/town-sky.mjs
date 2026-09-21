import * as THREE from 'three';

export function createTownSky(scene){
 const uniforms={uTop:{value:new THREE.Color()},uHorizon:{value:new THREE.Color()},uNight:{value:0},uTime:{value:0},uAspect:{value:1}};
 const material=new THREE.ShaderMaterial({depthTest:false,depthWrite:false,toneMapped:false,uniforms,
 vertexShader:'varying vec2 vUv; void main(){vUv=uv;gl_Position=vec4(position.xy,1.0,1.0);}',
 fragmentShader:`varying vec2 vUv; uniform vec3 uTop,uHorizon; uniform float uNight,uTime,uAspect;
 float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
 void main(){
  vec2 uv=vUv; vec3 color=mix(uHorizon,uTop,smoothstep(.05,1.0,uv.y));
  vec2 grid=uv*vec2(130.0*uAspect,130.0),cell=floor(grid);float rnd=hash(cell);
  float star=(1.0-smoothstep(.04,.17,length(fract(grid)-.5)))*step(.984,rnd)*smoothstep(.35,.8,uv.y);
  color+=vec3(.72,.80,.95)*star*uNight*(.75+.25*sin(uTime*.25+rnd*160.0));
  gl_FragColor=vec4(color,1.0);
  #include <colorspace_fragment>
 }`});
 const mesh=new THREE.Mesh(new THREE.PlaneGeometry(2,2),material);mesh.frustumCulled=false;mesh.renderOrder=-100;scene.add(mesh);
 const mix=(a,b,t)=>new THREE.Color(a).lerp(new THREE.Color(b),t);
 return{update(c,region,elapsed,aspect){
  // The warm sunset sits at the top of the screen and fades toward a quiet,
  // cooler lower backdrop behind the town.
  uniforms.uTop.value.copy(mix('#13283f',region==='oasis'?'#6bafcc':'#79b8dc',c.daylight)).lerp(new THREE.Color('#eda383'),c.sunset*.94);
  uniforms.uHorizon.value.copy(mix('#354b63','#e3f0ed',c.daylight)).lerp(new THREE.Color('#afbaca'),c.sunset*.6).lerp(new THREE.Color('#efae83'),c.dawn*.48);
  uniforms.uNight.value=c.night;uniforms.uTime.value=elapsed;uniforms.uAspect.value=aspect;
 }};
}
