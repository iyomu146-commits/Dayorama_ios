// Reuse the comparison/capture infrastructure, never another building's geometry.
import fs from 'node:fs';
const here=new URL('./',import.meta.url),source=new URL('../home/',import.meta.url);
if(fs.existsSync(new URL('app.mjs',here)))throw Error('Viewer already exists; edit instead of resetting it.');
let app=fs.readFileSync(new URL('app.mjs',source),'utf8').replaceAll('createHomeCells','createBakeryCells').replaceAll('homeChannels','bakeryChannels').replaceAll("const STAGE='home1'","const STAGE='blockout'").replaceAll('home4','bakery1').replaceAll('home-','bakery-').replaceAll('individual-home','individual-bakery').replaceAll('dayorama-home','dayorama-bakery').replaceAll("root.name='home'","root.name='bakery'").replaceAll('708,846','770,666').replaceAll('[708,846]','[770,666]').replaceAll('236,282','256,222').replaceAll('354/423','385/333').replaceAll('320/354','356/385').replaceAll('356/423','292/333').replaceAll('166/354','195.5/385').replaceAll('188/423','154/333').replaceAll('住宅','パン屋');
app=app.replace('installMaterialStudy(material);material.userData.microDetail.value=1;',"// Finish is introduced only after the structure/form reviews.\nif(!['blockout','structure','form'].includes(STAGE)){installMaterialStudy(material);material.userData.microDetail.value=STAGE==='material'?0:1;}");
app=app.replace("for(const [id,part,p] of [['entrance','door',[1.35,0,3.6]],['smoke','chimney-cap',[2.175,8.1,-1.125]]]){","for(const [id,part,p] of [['entrance','door',[.45,0,3.0]],['smoke','chimney-rim',[.525,6.3,-.975]]]){if(!groups.has(part))continue;");
fs.writeFileSync(new URL('app.mjs',here),app);
let html=fs.readFileSync(new URL('index.html',source),'utf8').replaceAll('住宅','パン屋').replaceAll('home.png','bakery.png').replaceAll('354/423','385/333').replaceAll('width:354px','width:385px').replaceAll('v=home1','v=bakery1').replace('<strong>パン屋</strong>','<a href="../home/">住宅</a><strong>パン屋</strong>');
fs.writeFileSync(new URL('index.html',here),html);
let doc=fs.readFileSync(new URL('voxel-document.mjs',source),'utf8').replaceAll('home','bakery').replaceAll('Home','Bakery');fs.writeFileSync(new URL('voxel-document.mjs',here),doc);
let material=fs.readFileSync(new URL('material.mjs',source),'utf8').replaceAll('home','bakery').replaceAll('Home','Bakery');fs.writeFileSync(new URL('material.mjs',here),material);
