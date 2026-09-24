"""Check the actual crop against the admitted full-town pixels without rewriting either."""
import hashlib,json
from pathlib import Path
from PIL import Image,ImageChops
base=Path('../../references');manifest=json.loads((base/'crops/manifest.json').read_text(encoding='utf-8'))
record=next(c for c in manifest['crops'] if c['id']=='florist');path=base/'crops'/record['file'];full=base/'town-voxel-v2.png'
x,y,w,h=record['rect'];actual=Image.open(path).convert('RGB');expected=Image.open(full).convert('RGB').crop((x,y,x+w,y+h))
assert actual.size==(w,h) and ImageChops.difference(expected,actual).getbbox() is None
assert hashlib.sha256(path.read_bytes()).hexdigest()==record['sha256']
assert hashlib.sha256(full.read_bytes()).hexdigest()==manifest['sourceSha256']
report={'passed':True,'rect':record['rect'],'sourceSha256':manifest['sourceSha256'],'cropSha256':record['sha256'],'method':'Pixel-for-pixel RGB equality to an integer crop of the original full town; no regeneration.'}
Path('evidence/crop-verified.json').write_text(json.dumps(report,indent=2)+'\n',encoding='utf-8')
print('Original crop pixels and both SHA256 hashes verified.')
