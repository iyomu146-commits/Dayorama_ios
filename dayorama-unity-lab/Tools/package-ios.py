"""Package unsigned arm64 output and a disposable benchmark-slot variant."""
import argparse, hashlib, json, plistlib, struct, zipfile
from pathlib import Path
p=argparse.ArgumentParser();p.add_argument('app',type=Path);p.add_argument('output',type=Path);args=p.parse_args()
app=args.app;info=plistlib.loads((app/'Info.plist').read_bytes())
assert info['CFBundleIdentifier']=='com.dayorama.unitybench'
assert info['CFBundleSupportedPlatforms']==['iPhoneOS']
assert info['NSMotionUsageDescription'] and info['UIFileSharingEnabled']
assert not (app/'embedded.mobileprovision').exists()
binary=(app/info['CFBundleExecutable']).read_bytes()
assert struct.unpack_from('<II',binary)==(0xfeedfacf,0x100000c),'Expected arm64 Mach-O'
args.output.mkdir(parents=True,exist_ok=True)
for label,bundle in [('Unity-Bench','com.dayorama.unitybench'),('Unity-Bench-TestSlot','com.dayorama.voxelbench')]:
    payload=dict(info);payload['CFBundleIdentifier']=bundle
    target=args.output/(label+'.ipa')
    with zipfile.ZipFile(target,'w',zipfile.ZIP_DEFLATED,compresslevel=6) as z:
        for f in sorted(app.rglob('*')):
            if not f.is_file():continue
            assert not f.is_symlink(),f
            rel=f.relative_to(app).as_posix();name='Payload/'+app.name+'/'+rel
            if rel=='Info.plist':z.writestr(name,plistlib.dumps(payload))
            else:z.write(f,name)
    report={'file':target.name,'bundleId':bundle,'bytes':target.stat().st_size,'sha256':hashlib.sha256(target.read_bytes()).hexdigest(),'unsigned':True,'requires':'Sideloadly signing','replacesBenchmarkSlot':label.endswith('TestSlot')}
    target.with_suffix('.json').write_text(json.dumps(report,indent=2));print(json.dumps(report))
