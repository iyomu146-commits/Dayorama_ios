import json,subprocess,sys
from pathlib import Path
script=Path('C:/Users/iyomu/.codex/skills/img2threejs/forge/state.py')
for step,evidence in [('image-analysis','analysis.md'),('reference-suitability','analysis.md'),('reference-admission','reference-admission.json'),('local-spec-search','assessment.json'),('pre-spec-assessment','assessment.json'),('detail-inventory','sculpt-spec.json'),('projection-route',None),('spec-authoring','sculpt-spec.json'),('material-evidence',None),('material-spec-wiring','sculpt-spec.json'),('strict-validation','strict-validation.json')]:
 state=json.loads(Path('.img2threejs/state.json').read_text(encoding='utf-8'))
 if next(s for s in state['checklist'] if s['id']==step)['status']!='pending':continue
 args=['--evidence',evidence] if evidence else ['--status','skipped','--reason','User-approved sharp 15cm editable voxel and procedural finish workflow; see analysis.md. Source is visual comparison, not recovered PBR or projected artwork.']
 r=subprocess.run([sys.executable,'-X','utf8',str(script),'mark',step,'--state','.img2threejs/state.json',*args],capture_output=True,text=True,encoding='utf-8')
 if r.returncode:print(r.stdout+r.stderr);raise SystemExit(r.returncode)
print('Intake evidence recorded in order.')
