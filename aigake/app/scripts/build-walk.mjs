import {readFile,writeFile,mkdir,copyFile,rm} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const app=fileURLToPath(new URL('../',import.meta.url)),source=path.dirname(app.replace(/[\\/]$/,'')),out=path.join(app,'www-walk');
// Delete only the generated output, after checking the resolved destination.
if(path.dirname(path.resolve(out))!==path.resolve(app)||path.basename(out)!=='www-walk')throw Error('Unsafe output path');
await rm(out,{recursive:true,force:true});await mkdir(out,{recursive:true});
const copied=new Set();
async function copy(relative){
 const from=path.resolve(source,relative),rel=path.relative(source,from);if(rel.startsWith('..')||path.isAbsolute(rel))throw Error('Import escapes source');if(copied.has(rel))return;
 const to=path.join(out,rel);await mkdir(path.dirname(to),{recursive:true});await copyFile(from,to);copied.add(rel);
 if(!/\.(mjs|js)$/.test(rel))return;
 const code=await readFile(from,'utf8');
 for(const m of code.matchAll(/(?:\b(?:import|export)\s+(?:[^;]*?\s+from\s*)?|\bimport\s*\()\s*['"]([^'"]+)['"]/g)){
  const id=m[1];if(id==='./capacitor-core.js')continue;
  const dep=id==='three'?'vendor/three/three.module.js':id.startsWith('three/addons/')?'vendor/three/examples/jsm/'+id.slice(13):id.startsWith('.')?path.relative(source,path.resolve(path.dirname(from),id)):null;
  if(!dep)throw Error('Unbundled dependency '+id+' in '+rel);await copy(dep);
 }
}
await copy('walk/app.mjs');await copy('walk/app.css');
await copy('vendor/three/LICENSE');await copy('vendor/three/VERSION.txt');
await copy('experiments/voxel-walk-lab-20260909/art-direction-20260915/profiles.json');
for(const file of ['style.css','about.html','data/LICENSE-d3-celestial.txt','data/SKY-SOURCES.txt'])await copy('experiments/voxel-walk-lab-20260909/stargazing/'+file);
await copyFile(path.join(app,'node_modules/@capacitor/core/dist/index.js'),path.join(out,'walk/capacitor-core.js'));
let html=await readFile(path.join(source,'walk/index.html'),'utf8');
const debugTools=process.env.KOMOREBI_DEBUG_TOOLS==='1';
html=html.replace('<meta name="komorebi-debug-tools" content="0">',`<meta name="komorebi-debug-tools" content="${debugTools?'1':'0'}">`);
html=html.replace('href="./app.css"','href="./walk/app.css"').replace('src="./app.mjs"','src="./walk/app.mjs"').replaceAll('../vendor/','./vendor/');
await writeFile(path.join(out,'index.html'),html);
await writeFile(path.join(out,'build.json'),JSON.stringify({entry:'walk',debugTools,files:copied.size+2,sources:[...copied].map(p=>p.replaceAll('\\','/')).sort()},null,2));
console.log(`Walk app: ${copied.size+2} files bundled, all assets local.`);
