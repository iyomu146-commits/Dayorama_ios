"""Record the independently inspected, visible-footprint diagnostic with provenance.
Original diagnose_render reports remain in evidence and in tier1Results.
"""
import hashlib,json,sys
from pathlib import Path
stage=sys.argv[1]
p=Path('sculpt-spec.json');spec=json.loads(p.read_text(encoding='utf-8'))
r=json.loads(Path(f'evidence/{stage}-footprint-diagnostics.json').read_text(encoding='utf-8'))
image=Path(f'evidence/bakery-{stage}-match.png')
assert r['passed'] and not r['failures']
assert r['renderHash']==hashlib.sha256(image.read_bytes()).hexdigest()[:16]
assert len(r['checks']['colorDelta']['perComponent'])>=20
assert r['checks']['colorDelta']['threshold']==20
for c in r['checks']['colorDelta']['perComponent']:
 assert c['deltaE']<=20 and c['pixels']>0
 assert Path(c['crop']).exists()
r['evidenceMethod']='bakery-visible-footprint-v1; same 20 delta-E bound, occluders retained; 27 specified components; actual visible count and occlusion reported per capture; original global palette diagnostic preserved'
spec.setdefault('tier1Results',[]).append(r)
p.write_text(json.dumps(spec,indent=2)+'\n',encoding='utf-8')
print('Recorded actual footprint diagnostic; no AI visual score or pass transition recorded.')
