"""Package a resignable IPA with App Group entitlement intent, not a device signature.

Ad-hoc signatures cannot install on an ordinary iPhone. Sideloadly must provision
and re-sign both host and widget. No identity, profile or credentials needed here.
"""
import argparse, hashlib, json, plistlib, shutil, struct, subprocess, tempfile, zipfile
from pathlib import Path
p=argparse.ArgumentParser();p.add_argument('app',type=Path);p.add_argument('output',type=Path);args=p.parse_args()
info=plistlib.loads((args.app/'Info.plist').read_bytes())
assert info['CFBundleIdentifier']=='com.dayorama.unitybench'
assert info['CFBundleSupportedPlatforms']==['iPhoneOS']
assert info['NSMotionUsageDescription'] and info['UIFileSharingEnabled']
assert not list(args.app.rglob('embedded.mobileprovision'))
assert struct.unpack_from('<II',(args.app/info['CFBundleExecutable']).read_bytes())==(0xfeedfacf,0x100000c)
assert len(list((args.app/'PlugIns').glob('*.appex')))==1
args.output.mkdir(parents=True,exist_ok=True)
def run(*argv):return subprocess.run(argv,check=True,capture_output=True).stdout
for label,bundle in [('Unity-Bench','com.dayorama.unitybench'),('Unity-Bench-TestSlot','com.dayorama.voxelbench')]:
    with tempfile.TemporaryDirectory(prefix='dayorama-package-') as temp:
        stage=Path(temp);app=stage/args.app.name;shutil.copytree(args.app,app)
        extension=next((app/'PlugIns').glob('*.appex'));group='group.'+bundle
        for target,bundle_id in [(app,bundle),(extension,bundle+'.widget')]:
            path=target/'Info.plist';payload=plistlib.loads(path.read_bytes())
            payload['CFBundleIdentifier']=bundle_id;payload['DayoramaWidgetGroup']=group
            path.write_bytes(plistlib.dumps(payload))
        entitlements={'com.apple.security.application-groups':[group]}
        entitlement_path=stage/'widget.entitlements';entitlement_path.write_bytes(plistlib.dumps(entitlements))
        for framework in sorted((app/'Frameworks').glob('*.framework')):
            run('codesign','--force','--sign','-','--timestamp=none',str(framework))
        for dylib in sorted((app/'Frameworks').glob('*.dylib')):
            run('codesign','--force','--sign','-','--timestamp=none',str(dylib))
        for target in [extension,app]:
            run('codesign','--force','--sign','-','--timestamp=none','--entitlements',str(entitlement_path),str(target))
            actual=plistlib.loads(run('codesign','-d','--entitlements',':-',str(target)))
            assert actual['com.apple.security.application-groups']==[group]
        run('codesign','--verify','--deep','--strict',str(app))
        target=args.output/(label+'.ipa')
        with zipfile.ZipFile(target,'w',zipfile.ZIP_DEFLATED,compresslevel=6) as z:
            for file in sorted(app.rglob('*')):
                if not file.is_file():continue
                assert not file.is_symlink(),file
                z.write(file,'Payload/'+app.name+'/'+file.relative_to(app).as_posix())
        report={'file':target.name,'bundleId':bundle,'widgetBundleId':bundle+'.widget','appGroup':group,'bytes':target.stat().st_size,
            'sha256':hashlib.sha256(target.read_bytes()).hexdigest(),'signing':'ad-hoc entitlement template; NOT device signed',
            'requires':'Sideloadly provisioning and re-signing, retaining widget and matching App Group on both targets',
            'replacesBenchmarkSlot':label.endswith('TestSlot')}
        target.with_suffix('.json').write_text(json.dumps(report,indent=2));print(json.dumps(report))
