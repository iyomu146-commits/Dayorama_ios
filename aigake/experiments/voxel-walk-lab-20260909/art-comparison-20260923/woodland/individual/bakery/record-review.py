"""Serialize the inspecting agent's authored review. Does not compute scores."""
import json,subprocess,sys
from pathlib import Path
skill=Path('C:/Users/iyomu/.codex/skills/img2threejs');r=json.loads(Path(sys.argv[1]).read_text(encoding='utf-8'))
args=[sys.executable,'-X','utf8',str(skill/'forge/stage4_review/append_review.py'),'sculpt-spec.json','--pass-id',r['pass'],'--fidelity',str(r['overall']),'--action',r['action'],'--summary',r['notes'],'--render-screenshot',r['render'],'--reference-screenshot','../../references/crops/bakery.png','--comparison-image',r['comparison'],'--ai-vision-score',str(r['overall']),'--layer-scores-json',json.dumps(r['layers']),'--feature-reviews-json',json.dumps(r['features']),'--review-viewpoints-json',json.dumps(['match','front','right','back','left','thickness-axis','long-axis']),'--require-screenshot-files','--in-place']
if r['pass']=='blockout':args.extend(['--map-stripped-render','evidence/bakery-blockout-match-mask.png'])
def mark(step,evidence):
 state=json.loads(Path('.img2threejs/state.json').read_text(encoding='utf-8'))
 entry=next(e for e in state['checklist'] if e['id']==step)
 if entry['status']!='pending':return
 assert Path(evidence).exists(),evidence
 subprocess.run([sys.executable,str(skill/'forge/state.py'),'mark',step,'--evidence',evidence],check=True,stdout=subprocess.DEVNULL)
if r['action']=='continue':
 stage=Path(r['render']).stem.removeprefix('bakery-').removesuffix('-match')
 for step,evidence in [('build-current-pass','model.mjs'),('render-capture',r['render']),('review-contract-read','validation-scope.md'),('tier1-diagnostics',f'evidence/{stage}-footprint-diagnostics.json' if Path(f'evidence/{stage}-footprint-diagnostics.json').exists() else f'evidence/{stage}-diagnostics.json'),('multi-angle-review',f'evidence/{stage}-multi-angle.json'),('pass-gate-check',f'evidence/{stage}-gate.txt')]:mark(step,evidence)
subprocess.run(args,check=True)
if r['action']=='continue':
 mark('ai-review-recorded','sculpt-spec.json')
 subprocess.run([sys.executable,str(skill/'forge/stage3_build/orchestrate_passes.py'),'sync','sculpt-spec.json','--in-place'],check=True,stdout=subprocess.DEVNULL)
 mark('pipeline-sync','sculpt-spec.json')
subprocess.run([sys.executable,'-X','utf8',str(skill/'forge/next.py'),'--state','.img2threejs/state.json','sculpt-spec.json'],check=True)
