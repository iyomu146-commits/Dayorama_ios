"""Supplement a known global-palette diagnostic limitation with actual visible pixels.
Preserves the original failed report. Same delta-E threshold; does not alter the skill.
Missing masks, geometry failures or a visible material failure stop acceptance.
"""
import hashlib,json,sys
from pathlib import Path
from PIL import Image
skill=Path('C:/Users/iyomu/.codex/skills/img2threejs')
sys.path.insert(0,str(skill))
sys.path.insert(0,str(skill/'forge/stage4_review'))
from forge.stage4_review.diagnose_render import srgb_to_lab,lab_distance,lab_kmeans_palette,COLOR_DELTA_E_THRESHOLD
stage,pass_id=sys.argv[1:3]
spec_path=Path('sculpt-spec.json'); spec=json.loads(spec_path.read_text(encoding='utf-8'))
original=json.loads(Path(f'evidence/{stage}-diagnostics.json').read_text(encoding='utf-8'))
render_path=Path(f'evidence/bakery-{stage}-match.png'); render=Image.open(render_path).convert('RGBA')
reports=[]; hidden=[]; unresolved=[]; crops=Path('evidence')/(stage+'-visible-materials');crops.mkdir(exist_ok=True)
for component in spec['componentTree']:
 name=component['id'];mask_path=Path(f'evidence/bakery-{stage}-footprint-{name}.png')
 if not mask_path.exists(): unresolved.append(name);continue
 mask=Image.open(mask_path).convert('L').point(lambda n:255 if n>240 else 0)
 bounds=mask.getbbox()
 if bounds is None: hidden.append(name);continue
 rgba=render.copy();rgba.putalpha(mask);cut=crops/(name+'.png');rgba.crop(bounds).save(cut)
 recipe={**component['colorMaterialRecipe'],'componentId':name}
 # A window includes both ivory frame and glass. One average would test neither.
 pixels=[p[:3] for p in rgba.crop(bounds).get_flattened_data() if p[3]>0]
 clusters=lab_kmeans_palette([srgb_to_lab(p) for p in pixels],k=min(5,len(set(pixels))))
 rgb=[int(n.strip()) for n in recipe['dominantAlbedo'].split('(')[1].split(')')[0].split(',')[:3]]
 delta=min(lab_distance(srgb_to_lab(tuple(rgb)),c['center']) for c in clusters)
 reports.append({'id':name,'pixels':len(pixels),'bbox':bounds,'deltaE':round(delta,2),'maskSha256':hashlib.sha256(mask_path.read_bytes()).hexdigest(),'crop':str(cut)})
failures=[f for f in original['failures'] if not f.startswith('max per-part color delta-E ')]
failures += [f"{r['id']} visible delta-E {r['deltaE']} exceeds {COLOR_DELTA_E_THRESHOLD}" for r in reports if r['deltaE']>COLOR_DELTA_E_THRESHOLD]
if unresolved:failures.append('Missing footprint masks: '+','.join(unresolved))
for name in ['building','roof','wing','awning','shop-left','shop-right','door','bread-left','bread-right','herb-left','herb-right','chimney-rim']:
 if name not in [r['id'] for r in reports]:failures.append('Required visible material not measured: '+name)
report={**original,'passed':not failures,'failures':failures,'checks':{**original['checks'],'colorDelta':{'gated':True,'method':'palette measured only within each component visible footprint, not overall image clusters','threshold':COLOR_DELTA_E_THRESHOLD,'perComponent':reports,'occludedNotMeasured':hidden,'unresolved':unresolved}},'originalDiagnostic':f'evidence/{stage}-diagnostics.json','originalPassed':original['passed'],'scopeNote':'Original global-palette result retained, not overwritten. Rendered occlusion masks select actual visible pixels. No claim for hidden material or reference PBR recovery.'}
Path(f'evidence/{stage}-footprint-diagnostics.json').write_text(json.dumps(report,indent=2),encoding='utf-8')
print(json.dumps({'passed':report['passed'],'components':[(r['id'],r['deltaE']) for r in reports],'hidden':hidden,'failures':failures},indent=2))
# No pipeline mutation here. Results must be inspected before recording them.
raise SystemExit(0 if report['passed'] else 1)
