import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
import xcode from 'xcode';
import * as plist from 'plist';
import YAML from 'yaml';
const app=fileURLToPath(new URL('../',import.meta.url)),root=path.resolve(app,'../..'),native=path.join(app,'ios/App');
const text=p=>fs.readFileSync(p,'utf8'),unquote=s=>typeof s==='string'&&s.startsWith('"')?JSON.parse(s):s,ref=r=>r?.value??r;
const project=xcode.project(path.join(native,'App.xcodeproj/project.pbxproj'));project.parseSync();
const o=project.hash.project.objects,flat=Object.fromEntries(Object.values(o).flatMap(section=>Object.entries(section).filter(([id])=>!id.endsWith('_comment'))));
const targets=Object.entries(o.PBXNativeTarget).filter(([,v])=>typeof v==='object'),main=targets.find(([,v])=>v.name==='App'),widget=targets.find(([,v])=>v.name==='KomorebiWidget');assert.ok(main&&widget,'both native targets exist');
assert.ok(main[1].dependencies.some(r=>flat[ref(r)].target===widget[0]),'app depends on widget');
const copy=main[1].buildPhases.map(r=>flat[ref(r)]).find(p=>p.isa==='PBXCopyFilesBuildPhase'&&p.dstSubfolderSpec===13);
assert.ok(copy?.files.some(r=>flat[ref(r)].fileRef===widget[1].productReference),'app embeds widget in PlugIns');
function checkGroup(id,dir){
 const group=flat[id];for(const r of group.children||[]){const f=flat[ref(r)];assert.ok(f,'file/group reference resolves');const tree=unquote(f.sourceTree),p=unquote(f.path||'');if(tree==='BUILT_PRODUCTS_DIR')continue;
  const resolved=path.resolve(tree==='SOURCE_ROOT'?native:dir,p);
  if(f.isa==='PBXGroup'||f.isa==='PBXVariantGroup')checkGroup(ref(r),resolved);else assert.ok(fs.existsSync(resolved),'native source exists: '+resolved);
 }
}
checkGroup(project.getFirstProject().firstProject.mainGroup,native);
const sharedFile=Object.keys(flat).find(id=>flat[id].path==='WidgetSnapshot.swift');
for(const [id,target]of targets){
 const sources=target.buildPhases.map(r=>flat[ref(r)]).filter(p=>p.isa==='PBXSourcesBuildPhase').flatMap(p=>p.files.map(r=>flat[ref(r)].fileRef));assert.ok(sources.includes(sharedFile),target.name+' includes shared model');
 for(const r of flat[target.buildConfigurationList].buildConfigurations){const config=flat[ref(r)],s=config.buildSettings,ent=plist.parse(text(path.join(native,unquote(s.CODE_SIGN_ENTITLEMENTS)))),info=plist.parse(text(path.join(native,unquote(s.INFOPLIST_FILE))));
  assert.deepEqual(ent['com.apple.security.application-groups'],['$(KOMOREBI_APP_GROUP)']);assert.equal(info.KomorebiAppGroup,'$(KOMOREBI_APP_GROUP)');assert.equal(Number(s.IPHONEOS_DEPLOYMENT_TARGET),16.4);
  assert.equal(unquote(s.PRODUCT_BUNDLE_IDENTIFIER),id===main[0]?'$(KOMOREBI_APP_ID)':'$(KOMOREBI_WIDGET_ID)');
  assert.equal(unquote(s.PROVISIONING_PROFILE_SPECIFIER),id===main[0]?'$(KOMOREBI_APP_PROFILE)':'$(KOMOREBI_WIDGET_PROFILE)');
  if(id===main[0]){assert.equal(ent['com.apple.developer.healthkit'],true);assert.ok(info.CFBundleURLTypes.some(t=>t.CFBundleURLSchemes.includes('komorebi')));}
  else{assert.equal(s.APPLICATION_EXTENSION_API_ONLY,'YES');assert.equal(s.SKIP_INSTALL,'YES');assert.equal(ent['com.apple.developer.healthkit'],undefined);assert.equal(info.NSExtension.NSExtensionPointIdentifier,'com.apple.widgetkit-extension');}
 }
}
const config=text(path.join(native,'Config/Komorebi.xcconfig')),appID=/^KOMOREBI_APP_ID\s*=\s*(\S+)/m.exec(config)[1];assert.equal(JSON.parse(text(path.join(app,'capacitor.config.json'))).appId,appID);
const mainInfo=plist.parse(text(path.join(native,'App/Info.plist')));
assert.ok(mainInfo.NSMotionUsageDescription?.trim(),'Motion consent explanation is required to avoid a native crash');
assert.match(text(path.join(app,'ios/debug.xcconfig')),/App\/Config\/Komorebi.xcconfig/);
assert.match(text(path.join(native,'App.xcodeproj/xcshareddata/xcschemes/App.xcscheme')),/buildImplicitDependencies="YES"/);
plist.parse(text(path.join(native,'App/PrivacyInfo.xcprivacy')));
const workflow=YAML.parse(text(path.join(root,'.github/workflows/komorebi-ios.yml')));
assert.ok(workflow.on.push&&workflow.on.pull_request);assert.equal(workflow.on.workflow_dispatch.inputs.testflight.default,false);
assert.equal(workflow.jobs.build.env.KOMOREBI_DEBUG_TOOLS,"${{ inputs.testflight && '0' || '1' }}",'TestFlight builds disable debug tools');
const build=JSON.parse(text(path.join(app,'www-walk/build.json'))),debugTools=process.env.KOMOREBI_DEBUG_TOOLS==='1';
assert.equal(build.debugTools,debugTools,'generated debug gate matches build environment');
assert.ok(text(path.join(app,'www-walk/index.html')).includes(`<meta name="komorebi-debug-tools" content="${debugTools?'1':'0'}">`));
const steps=workflow.jobs.build.steps;assert.ok(steps.some(s=>s.env?.WIDGET_PROFILE_BASE64));assert.ok(steps.some(s=>s.run?.includes('KOMOREBI_WIDGET_PROFILE=')));assert.ok(!steps.some(s=>s.run?.includes(' PROVISIONING_PROFILE_SPECIFIER=')),'do not force a single profile on both targets');
const workflowSource=JSON.stringify(workflow);assert.match(workflowSource,/PlugIns\/KomorebiWidget.appex/);assert.match(workflowSource,/CODE_SIGNING_ALLOWED=NO/);
const deviceBuild=steps.find(s=>s.run?.includes('package-sideload.py'));assert.ok(deviceBuild,'unsigned device IPA build exists');assert.equal(deviceBuild.if,'${{ !inputs.testflight }}');assert.match(deviceBuild.run,/generic\/platform=iOS'/);assert.match(deviceBuild.run,/CODE_SIGNING_ALLOWED=NO/);assert.match(deviceBuild.run,/Release-iphoneos\/App.app/);assert.ok(steps.some(s=>s.with?.name==='Komorebi-iPhone-Unsigned'));
console.log('iOS configuration verified: 2 targets, shared data, embedded widget, per-target signing, sources, plist and workflow YAML.');
