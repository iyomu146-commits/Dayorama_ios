import * as THREE from 'three';

// A render-only comparison. No cell data, materials, or model geometry changes.
export class Pixelation {
 constructor(renderer){
  this.renderer=renderer;this.size=new THREE.Vector2();
  this.target=new THREE.WebGLRenderTarget(1,1,{type:THREE.HalfFloatType,minFilter:THREE.NearestFilter,magFilter:THREE.NearestFilter,generateMipmaps:false});
  this.material=new THREE.ShaderMaterial({
   depthTest:false,depthWrite:false,blending:THREE.NoBlending,
   uniforms:{source:{value:this.target.texture},background:{value:new THREE.Color()},opaqueBackground:{value:false}},
   vertexShader:`varying vec2 vUv;void main(){vUv=uv;gl_Position=vec4(position.xy,0.0,1.0);}`,
   fragmentShader:`uniform sampler2D source;uniform vec3 background;uniform bool opaqueBackground;varying vec2 vUv;
    void main(){
     vec4 sampleColor=texture2D(source,vUv);
     // The transparent intermediate contains premultiplied, linear HDR color.
     gl_FragColor=vec4(sampleColor.rgb/max(sampleColor.a,0.00001),sampleColor.a);
     #include <tonemapping_fragment>
     #include <colorspace_fragment>
     gl_FragColor.rgb*=sampleColor.a;
     if(opaqueBackground){gl_FragColor.rgb+=background*(1.0-sampleColor.a);gl_FragColor.a=1.0;}
    }`
  });
  this.scene=new THREE.Scene();this.camera=new THREE.Camera();
  this.quad=new THREE.Mesh(new THREE.PlaneGeometry(2,2),this.material);this.quad.frustumCulled=false;this.scene.add(this.quad);
 }
 render(scene,camera,mode='none'){
  const renderer=this.renderer,pixelSize=({weak:3,medium:5})[mode];
  renderer.domElement.style.imageRendering=pixelSize?'pixelated':'auto';
  if(!pixelSize){renderer.render(scene,camera);return;}
  renderer.getDrawingBufferSize(this.size);
  const width=Math.max(1,Math.ceil(this.size.x/pixelSize)),height=Math.max(1,Math.ceil(this.size.y/pixelSize));
  if(this.target.width!==width||this.target.height!==height)this.target.setSize(width,height);
  const previousTarget=renderer.getRenderTarget(),background=scene.background,clearColor=renderer.getClearColor(new THREE.Color()),clearAlpha=renderer.getClearAlpha();
  this.material.uniforms.opaqueBackground.value=Boolean(background?.isColor);
  // Scene color backgrounds bypass tone mapping in the ordinary render too.
  if(background?.isColor)this.material.uniforms.background.value.copy(background).convertLinearToSRGB();
  try{
   scene.background=null;renderer.setClearColor(0,0);renderer.setRenderTarget(this.target);renderer.render(scene,camera);
   renderer.setRenderTarget(previousTarget);renderer.render(this.scene,this.camera);
  }finally{
   scene.background=background;renderer.setRenderTarget(previousTarget);renderer.setClearColor(clearColor,clearAlpha);
  }
 }
 dispose(){this.target.dispose();this.quad.geometry.dispose();this.material.dispose();}
}
