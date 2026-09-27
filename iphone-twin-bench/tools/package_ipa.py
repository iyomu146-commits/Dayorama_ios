"""Package an unsigned device .app. No certificates or user provisioning files."""
import argparse, hashlib, json, plistlib, stat, zipfile
from pathlib import Path
p=argparse.ArgumentParser();p.add_argument('app',type=Path);p.add_argument('output',type=Path);a=p.parse_args()
info=plistlib.loads((a.app/'Info.plist').read_bytes())
assert info['CFBundleSupportedPlatforms']==['iPhoneOS'], info.get('CFBundleSupportedPlatforms')
assert (a.app/info['CFBundleExecutable']).is_file()
assert not (a.app/'embedded.mobileprovision').exists(), 'Must remain unsigned'
a.output.parent.mkdir(parents=True,exist_ok=True)
with zipfile.ZipFile(a.output,'w',zipfile.ZIP_DEFLATED,compresslevel=6) as z:
    for f in sorted(a.app.rglob('*')):
        if f.is_file():
            assert not f.is_symlink(),f
            z.write(f,'Payload/'+a.app.name+'/'+f.relative_to(a.app).as_posix())
report={'file':a.output.name,'bundleIdentifier':info['CFBundleIdentifier'],'bytes':a.output.stat().st_size,'sha256':hashlib.sha256(a.output.read_bytes()).hexdigest(),'signed':False,'requires':'Sideloadly signing before install'}
a.output.with_suffix('.json').write_text(json.dumps(report,indent=2)+'\n')
print(json.dumps(report))
