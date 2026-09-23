"""Run real diagnostics for a captured pass; does not assign visual scores."""
import json, subprocess, sys
from pathlib import Path
skill=Path('C:/Users/iyomu/.codex/skills/img2threejs')
stage,pass_id=sys.argv[1:3]
def run(script,args,out):
 r=subprocess.run([sys.executable,'-X','utf8',str(skill/script),*args],capture_output=True,text=True,encoding='utf-8')
 Path(out).write_text(r.stdout,encoding='utf-8')
 if r.returncode: print(r.stdout+r.stderr); raise SystemExit(r.returncode)
run('forge/stage4_review/diagnose_render.py',['--reference','evidence/reference-building-mask.png','--render',f'evidence/home-{stage}-match.png','--map-stripped-render',f'evidence/home-{stage}-match-mask.png','--spec','sculpt-spec.json','--pass-id',pass_id,'--in-place','--json'],f'evidence/{stage}-diagnostics.json')
run('forge/stage4_review/diagnose_render_multi_angle.py',['--reference',f'evidence/home-{stage}-match-mask.png','--orbit',f'evidence/home-{stage}-front-mask.png','--orbit',f'evidence/home-{stage}-right-mask.png','--json'],f'evidence/{stage}-multi-angle.json')
run('forge/stage4_review/make_comparison_sheet.py',['--reference','../../references/crops/home.png','--render',f'evidence/home-{stage}-match.png','--out',f'evidence/{stage}-comparison.png','--json'],f'evidence/{stage}-comparison.json')
subprocess.run([sys.executable,'-X','utf8',str(skill/'forge/stage3_build/orchestrate_passes.py'),'check','sculpt-spec.json','--pass-id',pass_id],check=True)
print(stage+' diagnostics saved; agent visual review still required')
