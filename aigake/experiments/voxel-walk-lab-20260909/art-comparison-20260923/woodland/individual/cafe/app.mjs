import * as THREE from 'three';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {meshChunk} from '../../../density-core.mjs';
import {createCafeBlockoutCells as createCafeCells,CELL} from './model.mjs';
const $=id=>document.getElementById(id),cells=createCafeCells(),root=new THREE.Group();root.name='cafe';
const scene=new THREE.Scene(),camera=new THREE.OrthographicCamera(-5,5,4,-4,.1,200),renderer=new THREE.WebGLRenderer({antialias:true,preserveDrawingBuffer:true,alpha:true});
renderer.setSize(980,754,false);renderer.setPixelRatio(1);renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1;renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;$('view').append(renderer.domElement);
scene.background=new THREE.Color('#e9e4d7');scene.add(root);const key=new THREE.DirectionalLight('#fff4e3',3);key.position.set(-8,16,14);key.castShadow=true;key.shadow.mapSize.set(2048,2048);Object.assign(key.shadow.camera,{left:-8,right:8,top:8,bottom:-8,near:.1,far:50});key.shadow.bias=-.0001;key.shadow.normalBias=.015;scene.add(key,new THREE.HemisphereLight('#ecf5ff','#918979',1.2));
const material=new THREE.MeshStandardMaterial({vertexColors:true,roughness:.88}),clay=new THREE.Color('#b7b5a6');let triangles=0;
for(const part of new Set([...cells.values()].map(c=>c.part))){const selected=[...cells.values()].filter(c=>c.part===part),m=meshChunk(selected,cells,CELL,{palette:{clay:[clay.r,clay.g,clay.b]},aoStrength:.045});const g=new THREE.BufferGeometry();for(const [name,data] of [['position',m.positions],['normal',m.normals],['color',m.colors]])g.setAttribute(name,new THREE.BufferAttribute(data,3));g.computeBoundingBox();const mesh=new THREE.Mesh(g,material);mesh.name=part;mesh.castShadow=mesh.receiveShadow=true;root.add(mesh);triangles+=m.triangles;}
root.userData.sculptRuntime={parts:root.children.map(m=>({id:m.name,meshName:m.name,pivot:m.geometry.boundingBox.getCenter(new THREE.Vector3()).toArray()})),stage:'blockout',construction:'integer 15cm voxels'};
const controls=new OrbitControls(camera,renderer.domElement);controls.enabled=false;controls.enableDamping=false;controls.enablePan=false;let interactive=false,masked=false;
function fit(name='match'){
 interactive=false;controls.enabled=false;$('orbit').setAttribute('aria-pressed','false');const v=({match:[13.5,11.5,30],front:[0,10,30],right:[30,10,0],back:[0,10,-30],left:[-30,10,0]})[name];camera.position.set(...v);camera.lookAt(0,0,0);camera.updateMatrixWorld();
 const right=new THREE.Vector3().setFromMatrixColumn(camera.matrixWorld,0),up=new THREE.Vector3().setFromMatrixColumn(camera.matrixWorld,1);let x0=Infinity,x1=-Infinity,y0=Infinity,y1=-Infinity;
 for(const mesh of root.children){const a=mesh.geometry.attributes.position;for(let i=0;i<a.count;i++){const p=new THREE.Vector3().fromBufferAttribute(a,i),x=p.dot(right),y=p.dot(up);x0=Math.min(x0,x);x1=Math.max(x1,x);y0=Math.min(y0,y);y1=Math.max(y1,y);}}
 const ratio=490/377,matched=name==='match',height=Math.max((x1-x0)/(ratio*(matched?370/490:.86)),(y1-y0)/(matched?349/377:.86)),width=height*ratio;
 const target=right.clone().multiplyScalar((x0+x1)/2-(matched?(198/490-.5)*width:0)).addScaledVector(up,(y0+y1)/2+(matched?(192.5/377-.5)*height:0));
 camera.position.copy(target).add(new THREE.Vector3(...v));camera.lookAt(target);camera.left=-width/2;camera.right=width/2;camera.top=height/2;camera.bottom=-height/2;camera.zoom=1;camera.updateProjectionMatrix();controls.target.copy(target);draw();
}
function draw(){renderer.render(scene,camera);}
function save(name,url=renderer.domElement.toDataURL('image/png')){const a=document.createElement('a');a.download=name+'.png';a.href=url;a.click();}
function mask(on){masked=on;scene.background=on?null:new THREE.Color('#e9e4d7');scene.overrideMaterial=on?new THREE.MeshBasicMaterial({color:'#696969'}):null;draw();}
$('angle').onchange=()=>fit($('angle').value);$('orbit').onclick=()=>{interactive=!interactive;controls.enabled=interactive;$('orbit').setAttribute('aria-pressed',String(interactive));};controls.addEventListener('change',draw);
$('mask').onclick=()=>mask(!masked);$('save').onclick=()=>save(`cafe-blockout-${$('angle').value}${masked?'-mask':''}`);
$('sheet').onclick=()=>{const c=document.createElement('canvas');c.width=1960;c.height=814;const x=c.getContext('2d');x.fillStyle='#eeece5';x.fillRect(0,0,c.width,c.height);x.drawImage($('reference'),0,60,980,754);x.drawImage(renderer.domElement,980,60,980,754);x.fillStyle='#393e38';x.font='24px sans-serif';x.fillText('Reference — exact crop',24,40);x.fillText('Cafe — blockout',1004,40);save('cafe-blockout-comparison',c.toDataURL());};
$('bundle').onclick=()=>{document.getElementById('proof')?.remove();const proof=document.createElement('details');proof.id='proof';proof.open=true;const summary=document.createElement('summary');summary.textContent='検証画像 — 同じモデルを5方向から描画';proof.append(summary);for(const view of ['match','front','right','back','left']){fit(view);for(const isMask of [false,true]){mask(isMask);const figure=document.createElement('figure'),img=document.createElement('img'),caption=document.createElement('figcaption');img.src=renderer.domElement.toDataURL('image/png');img.alt=`blockout-${view}${isMask?'-mask':''}`;caption.textContent=img.alt;figure.append(img,caption);proof.append(figure);}}fit('match');mask(false);document.body.append(proof);};
$('status').textContent=`${cells.size.toLocaleString()}ボクセル · 輪郭のみ`;fit();
