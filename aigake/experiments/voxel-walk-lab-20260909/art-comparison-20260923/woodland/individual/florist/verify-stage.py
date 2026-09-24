"""Real captured-image diagnostics, no visual scores or automatic approval."""
import json,subprocess,sys
from pathlib import Path
from PIL import Image,ImageDraw
skill=Path('C:/Users/iyomu/.codex/skills/img2threejs');stage,pass_id=sys.argv[1:3]
def run(script,args,out,allow_failure=False):
 r=subprocess.run([sys.executable,'-X','utf8',str(skill/script),*args],capture_output=True,text=True,encoding='utf-8');Path(out).write_text(r.stdout,encoding='utf-8')
 if r.returncode and not allow_failure:print(r.stdout+r.stderr);raise SystemExit(r.returncode)
 return r
colored=stage not in ['blockout','structure','form']
r=run('forge/stage4_review/diagnose_render.py',['--reference','evidence/reference-mask.png','--render',f'evidence/florist-{stage}-match.png','--map-stripped-render',f'evidence/florist-{stage}-match-mask.png','--spec','sculpt-spec.json','--pass-id',pass_id,'--in-place','--json'],f'evidence/{stage}-diagnostics.json',colored)
json.loads(r.stdout)
if colored:
 subprocess.run([sys.executable,'-X','utf8','check-material-footprints.py',stage,pass_id],check=True)
 subprocess.run([sys.executable,'-X','utf8','record-footprint-diagnostic.py',stage],check=True)
run('forge/stage4_review/diagnose_render_multi_angle.py',['--reference',f'evidence/florist-{stage}-match-mask.png','--orbit',f'evidence/florist-{stage}-front-mask.png','--orbit',f'evidence/florist-{stage}-right-mask.png','--json'],f'evidence/{stage}-multi-angle.json')
run('forge/stage4_review/turntable_gate.py',['--capture',f'0=evidence/florist-{stage}-front-mask.png','--capture',f'90=evidence/florist-{stage}-right-mask.png','--capture',f'180=evidence/florist-{stage}-back-mask.png','--capture',f'270=evidence/florist-{stage}-left-mask.png','--allow-holes','--json'],f'evidence/{stage}-turntable.json')
# The generic vertex-ray parity probe remains recorded, not relabelled as passed.
# For this exact axis-grid union, validate the actual browser triangles exhaustively.
subprocess.run(['node','check-boundary.mjs',stage],check=True)
run('forge/stage4_review/attachment_anchor.py',['sculpt-spec.json','--json'],f'evidence/{stage}-anchors.json')
run('forge/stage3_build/orchestrate_passes.py',['check','sculpt-spec.json','--pass-id',pass_id],f'evidence/{stage}-gate.txt')
# Full aspect sheet, no cropping of the chimney or the storefront.
sheet=Image.new('RGB',(1359,664),'#eeece5');draw=ImageDraw.Draw(sheet)
files=[Path('../../references/crops/florist.png')]+[Path(f'evidence/florist-{stage}-{v}.png') for v in ['match','front','right','back','left']]
for i,p in enumerate(files):
 im=Image.open(p).convert('RGB');im.thumbnail((453,310));x=i%3*453;y=i//3*332;sheet.paste(im,(x,y+22));draw.text((x+8,y+4),p.stem,fill='#393e38')
sheet.save(f'evidence/{stage}-comparison.png');print('Image gates and exact voxel boundary passed; visual review remains required. Generic vertex-ray probe is not certified (see validation-scope.md).')
