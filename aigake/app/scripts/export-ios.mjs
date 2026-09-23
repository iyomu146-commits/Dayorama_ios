import {readFile,writeFile,mkdir,copyFile,rm,readdir} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const app=fileURLToPath(new URL('../',import.meta.url)),source=path.resolve(app,'..'),repo=path.resolve(app,'../..'),dist=path.join(app,'dist'),out=path.join(dist,'komorebi-ios');
if(path.dirname(path.resolve(out))!==path.resolve(dist)||path.basename(out)!=='komorebi-ios')throw Error('Unsafe export path');
await rm(out,{recursive:true,force:true});
const manifest=JSON.parse(await readFile(path.join(app,'www-walk/build.json'),'utf8')),files=new Set(),visited=new Set();
async function copy(from,to){if(/\.(p12|p8|mobileprovision|key|pem)$/i.test(from))throw Error('Signing material cannot be exported');const dest=path.resolve(out,to);if(!dest.startsWith(path.resolve(out)+path.sep))throw Error('Export escapes output');await mkdir(path.dirname(dest),{recursive:true});await copyFile(from,dest);files.add(to.replaceAll('\\','/'));}
async function copySource(relative){
 const from=path.resolve(source,relative),rel=path.relative(source,from);
 if(rel.startsWith('..')||path.isAbsolute(rel))throw Error('Source escapes project: '+relative);
 if(visited.has(rel))return;visited.add(rel);await copy(from,path.join('aigake',rel));
 if(!/\.(mjs|js)$/.test(rel))return;
 const code=await readFile(from,'utf8');
 for(const m of code.matchAll(/(?:\b(?:import|export)\s+(?:[^;]*?\s+from\s*)?|\bimport\s*\()\s*['"]([^'"]+)['"]/g)){
  const id=m[1];if(id.startsWith('node:')||id==='./capacitor-core.js')continue;
  const dep=id==='three'?'vendor/three/three.module.js':id.startsWith('three/addons/')?'vendor/three/examples/jsm/'+id.slice(13):id.startsWith('.')?path.relative(source,path.resolve(path.dirname(from),id)):null;
  if(!dep)throw Error('Unbundled source dependency '+id+' in '+rel);await copySource(dep);
 }
}
for(const rel of [...manifest.sources,'walk/index.html','walk/README.md','walk/LIVING-TOWN.md','walk/MONETIZATION.md','walk/RELEASE-PLAN-20260920.md','experiments/voxel-walk-lab-20260909/stargazing/README.md'])await copySource(rel);
// Standalone art study stays out of the native bundle, but remains reviewable in GitHub.
const artStudy='experiments/voxel-walk-lab-20260909/art-comparison-20260923/';
for(const name of ['index.html','style.css','app.mjs','voxel-worker.mjs','design.test.mjs','refined.test.mjs','scene.test.mjs','refinement-spec.json','scene-spec.json','README.md','reference.png','reference-prompt.txt','sculpt-spec.json','build-spec.mjs','assessment.json','evidence/intake.md','evidence/refinement-review.md','evidence/site-review.md'])await copySource(artStudy+name);
for(const name of ['density.html','density.css','density-app.mjs','density-worker.mjs','density.test.mjs','evidence/density-review.md'])await copySource(artStudy+name);
for(const name of ['coarse.html','coarse.css','coarse-app.mjs','coarse-cafe.test.mjs','evidence/coarse-review.md'])await copySource(artStudy+name);
// Test commands evolve independently of the app's runtime imports. Include their
// entry points and dependency graph so a fresh GitHub checkout can run them all.
const pkg=JSON.parse(await readFile(path.join(app,'package.json'),'utf8'));
for(const [name,command] of Object.entries(pkg.scripts).filter(([name])=>name.startsWith('test:'))){
 if(!command.startsWith('node --test '))throw Error('Unsupported test command in export: '+name);
 for(const test of command.slice('node --test '.length).trim().split(/\s+/)){
  if(!test.endsWith('.mjs'))throw Error('Expected explicit test entry in '+name);
  await copySource(path.relative(source,path.resolve(app,test)));
 }
}
for(const rel of ['package.json','package-lock.json','capacitor.config.json','README-ios.md','WIDGET-PLAN.md'])await copy(path.join(app,rel),path.join('aigake/app',rel));
async function tree(dir,rel){for(const e of await readdir(dir,{withFileTypes:true})){
 if(['node_modules','public','Pods','build','.build','DerivedData','xcuserdata','__pycache__'].includes(e.name))continue;
 const next=path.join(rel,e.name),from=path.join(dir,e.name);if(next.replaceAll('\\','/')==='ios/App/App/capacitor.config.json')continue;if(e.isSymbolicLink())throw Error('Unexpected symbolic link: '+next);
 if(e.isDirectory())await tree(from,next);
 else if(e.name==='.gitignore'||/\.(swift|plist|entitlements|xcprivacy|pbxproj|xcscheme|xcconfig|storyboard|xcworkspacedata|resolved|json|png|mjs|py)$/.test(e.name))await copy(from,path.join('aigake/app',next));
}}
await tree(path.join(app,'ios'),'ios');
for(const name of ['build-walk.mjs','export-ios.mjs','verify-ios.mjs','prepare-audio.mjs','prepare-signing.py','test_signing.py','package-sideload.py','test_sideload.py','widget-model-check.swift'])await copy(path.join(app,'scripts',name),path.join('aigake/app/scripts',name));
await copy(path.join(repo,'.github/workflows/komorebi-ios.yml'),'.github/workflows/komorebi-ios.yml');
await writeFile(path.join(out,'.gitignore'),'node_modules/\naigake/app/www-walk/\naigake/app/dist/\naigake/app/ios/App/App/public/\naigake/app/ios/App/App/capacitor.config.json\naigake/app/ios/App/App/config.xml\n.build/\nDerivedData/\nxcuserdata/\n__pycache__/\n.env\n.env.*\n.dev.vars\n*.p12\n*.p8\n*.mobileprovision\n*.pem\n*.key\n*.ipa\n*.xcarchive/\n.DS_Store\n');
await writeFile(path.join(out,'README.md'),'# Dayorama — iPhone / WidgetKit\n\nこのフォルダーの内容をGitHubリポジトリのルートに配置してください。`.github` も含めます。\n\n- push / Pull Requestではビルドしません。実機確認するときに Actions → Komorebi iOS → Run workflow から、ブランチ `main`・`testflight` オフで手動実行します。\n- Sideloadly：ActionsのArtifactsから `Komorebi-iPhone-Unsigned` を取得し、解凍して `Komorebi-unsigned.ipa` を渡します。CIのSecretsは不要です。\n- `Komorebi-Simulator` はMacのSimulator専用で、iPhoneには入りません。\n- TestFlightを使う場合は署名設定後に Run workflow の `testflight` をオンにします。\n\n[実機確認手順・歩数とWidgetの権限・TestFlight設定](aigake/app/README-ios.md)\n\nWindows：`cd aigake/app` → `npm ci` → `npm run test:walk` → `npm run sync:ios` → `npm run verify:ios`。\n\n生成物と証明書は含みません。元の作業環境で更新したら `npm run export:ios` で再作成します。\n');
await writeFile(path.join(out,'source-manifest.json'),JSON.stringify({files:[...files].sort()},null,2));
console.log(`GitHub project exported: ${out} (${files.size} source files; no dependencies, signing keys or generated app bundle).`);
