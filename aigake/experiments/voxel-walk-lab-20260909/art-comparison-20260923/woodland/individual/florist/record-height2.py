"""Record the user-requested lean-to height correction without rewriting prior reviews."""
import json,subprocess,sys
from pathlib import Path
from PIL import Image,ImageDraw
stage='glass-height2';skill=Path('C:/Users/iyomu/.codex/skills/img2threejs')
runtime=json.loads(Path(f'evidence/{stage}-runtime.json').read_text(encoding='utf-8'))
perf=json.loads(Path(f'evidence/{stage}-performance.json').read_text(encoding='utf-8'))
diagnostic=json.loads(Path(f'evidence/{stage}-diagnostics.json').read_text(encoding='utf-8-sig'))
assert diagnostic['passed']
r=subprocess.run([sys.executable,'-X','utf8',str(skill/'forge/stage4_review/diagnose_render_multi_angle.py'),'--reference',f'evidence/florist-{stage}-match-mask.png','--orbit',f'evidence/florist-{stage}-front-mask.png','--orbit',f'evidence/florist-{stage}-left-mask.png','--json'],capture_output=True,text=True,encoding='utf-8')
Path(f'evidence/{stage}-multi-angle.json').write_text(r.stdout,encoding='utf-8');assert r.returncode==0,r.stderr
sheet=Image.new('RGB',(1359,664),'#eeece5');draw=ImageDraw.Draw(sheet)
for i,(label,p) in enumerate([('Reference','../../references/crops/florist.png'),('Before','evidence/florist-optimization-match.png'),('After',f'evidence/florist-{stage}-match.png'),('Front',f'evidence/florist-{stage}-front.png'),('Left',f'evidence/florist-{stage}-left.png'),('Back',f'evidence/florist-{stage}-back.png')]):
 im=Image.open(p).convert('RGB');im.thumbnail((453,310));x=i%3*453;y=i//3*332;sheet.paste(im,(x,y+22));draw.text((x+8,y+4),label,fill='#393e38')
sheet.save(f'evidence/{stage}-comparison.png')
p=Path('sculpt-spec.json');spec=json.loads(p.read_text(encoding='utf-8'))
prior=next((r for r in spec.get('postReviewRevisions',[]) if r['id']==stage),{})
revision={'id':stage,'reason':'User reported the left sunroom-like extension is too short. Raise front by five 15cm courses and rear by two; reduce roof slope while keeping footprint.','frontLiftCells':5,'rearLiftCells':2,'frontRoofTopMeters':2.7,'rearRoofTopMeters':3.0,'evidence':f'evidence/{stage}-comparison.png','priorParameters':prior.get('priorParameters',{}),'initialAttempt':'evidence/glass-height2-initial-comparison.png; uniform five-course lift made rear too tall','scope':'Only greenhouse-frame and greenhouse-glass change; all shop/flower cells are equal to optimization baseline. Prior eight-pass review history remains unchanged.'}
for component in spec['componentTree']:
 if component['id'] not in ['greenhouse-frame','greenhouse-glass']:continue
 revision['priorParameters'].setdefault(component['id'],component['geometryDescriptor']['parameters'])
 part=next(item for item in runtime['runtime']['parts'] if item['id']==component['id'])
 size=part['collider']['size'];position=[part['pivot'][i]+part['collider']['center'][i]-size[i]/2 for i in range(3)]
 component['geometryDescriptor']['parameters']={'pos':[round(v/.15) for v in position],'size':[round(v/.15) for v in size]}
 component['dimensions'].update(dict(zip(['width','height','depth'],size)))
 component['transform']['position']=position
spec['postReviewRevisions']=[r for r in spec.get('postReviewRevisions',[]) if r['id']!=stage]+[revision]
spec['implementedVoxelStudy'].update({'version':'florist2','revision':stage,'cellCount':perf['cellCount'],'modelTriangles':perf['modelTriangles'],'actualBoundsSource':f'evidence/{stage}-runtime.json'})
p.write_text(json.dumps(spec,indent=2)+'\n',encoding='utf-8')
r=subprocess.run([sys.executable,'-X','utf8',str(skill/'forge/stage2_spec/validate_sculpt_spec.py'),'sculpt-spec.json','--strict-quality','--json'],capture_output=True,text=True,encoding='utf-8')
Path(f'evidence/{stage}-spec-validation.json').write_text(r.stdout,encoding='utf-8');assert r.returncode==0,r.stdout+r.stderr
print('Height amendment recorded; prior review history preserved.')
