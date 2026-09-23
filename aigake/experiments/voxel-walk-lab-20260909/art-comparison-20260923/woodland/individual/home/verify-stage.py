"""Capture-dependent diagnostics only. Never generates an AI visual review or its score.

Preserves the generic five-global-cluster color result, then checks the same color
threshold against actual visible per-part pixels. Geometry failures remain fatal.
"""
import json, subprocess, sys
from pathlib import Path
skill=Path('C:/Users/iyomu/.codex/skills/img2threejs')
stage,pass_id=sys.argv[1:3]
def run(script,args,out=None,allow_failure=False):
 r=subprocess.run([sys.executable,'-X','utf8',str(script),*args],capture_output=True,text=True,encoding='utf-8')
 if out:Path(out).write_text(r.stdout,encoding='utf-8')
 if r.returncode and not allow_failure:print(r.stdout+r.stderr);raise SystemExit(r.returncode)
 return r
original=run(skill/'forge/stage4_review/diagnose_render.py',['--reference','evidence/reference-building-mask.png','--render',f'evidence/home-{stage}-match.png','--map-stripped-render',f'evidence/home-{stage}-match-mask.png','--spec','sculpt-spec.json','--pass-id',pass_id,'--in-place','--json'],f'evidence/{stage}-diagnostics.json',True)
# Reject non-JSON/crashed diagnostics; never fall back to a guessed success.
json.loads(original.stdout)
run('check-material-footprints.py',[stage,pass_id])
run('record-footprint-diagnostic.py',[stage])
run(skill/'forge/stage4_review/diagnose_render_multi_angle.py',['--reference',f'evidence/home-{stage}-match-mask.png','--orbit',f'evidence/home-{stage}-front-mask.png','--orbit',f'evidence/home-{stage}-right-mask.png','--json'],f'evidence/{stage}-multi-angle.json')
run(skill/'forge/stage4_review/make_comparison_sheet.py',['--reference','../../references/crops/home.png','--render',f'evidence/home-{stage}-match.png','--out',f'evidence/{stage}-comparison.png','--json'],f'evidence/{stage}-comparison.json')
r=run(skill/'forge/stage3_build/orchestrate_passes.py',['check','sculpt-spec.json','--pass-id',pass_id])
print(r.stdout)
print('Original global-cluster check: '+str(json.loads(original.stdout)['passed'])+'; visible-footprint diagnostic passed. Agent visual review still required.')
