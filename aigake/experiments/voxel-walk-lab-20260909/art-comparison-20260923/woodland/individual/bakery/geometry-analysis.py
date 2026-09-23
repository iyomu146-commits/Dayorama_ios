"""Preserve rendered coordinates/triangles; derive welded geometric vertex normals
for a volume test. Renderer facet normals are discontinuous at concave voxel
corners and a single facet normal is not that corner's outward direction.
Original normals and the original gate result remain in separate evidence files.
"""
import hashlib,json,math,sys
from pathlib import Path
stage=sys.argv[1];p=Path(sys.argv[2]) if len(sys.argv)>2 else Path(f'evidence/{stage}-geometry.json');m=json.loads(p.read_text(encoding='utf-8'));groups={}
for v,n in zip(m['vertices'],m['normals']):groups.setdefault(tuple(round(x,6) for x in v),set()).add(tuple(round(x,6) for x in n))
normals=[]
for v in m['vertices']:
 ns=groups[tuple(round(x,6) for x in v)];n=[sum(a[d] for a in ns) for d in range(3)];length=math.sqrt(sum(x*x for x in n));normals.append([x/length for x in n] if length else [0,0,0])
out={**m,'normals':normals,'analysisProvenance':{'source':str(p),'sourceSha256':hashlib.sha256(p.read_bytes()).hexdigest(),'method':'Unique incident facet directions summed at coincident positions; coordinates and triangle indices identical. No rendering geometry or shading changed.'}}
Path(f'evidence/{stage}-geometric-normals.json').write_text(json.dumps(out),encoding='utf-8')
