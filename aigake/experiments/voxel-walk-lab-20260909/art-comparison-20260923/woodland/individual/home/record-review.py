"""Serialize a review already authored by the inspecting agent; never calculate scores."""
import json, subprocess, sys
from pathlib import Path
skill=Path('C:/Users/iyomu/.codex/skills/img2threejs')
r=json.loads(Path(sys.argv[1]).read_text(encoding='utf-8'))
args=[sys.executable,'-X','utf8',str(skill/'forge/stage4_review/append_review.py'),'sculpt-spec.json','--pass-id',r['pass'],'--fidelity',str(r['overall']),'--action',r['action'],'--summary',r['notes'],'--render-screenshot',r['render'],'--reference-screenshot','../../references/crops/home.png','--comparison-image',r['comparison'],'--ai-vision-score',str(r['overall']),'--layer-scores-json',json.dumps(r['layers']),'--feature-reviews-json',json.dumps(r['features']),'--review-viewpoints-json',json.dumps(['match','front','right','back','left','thickness-axis','long-axis']),'--require-screenshot-files','--in-place']
subprocess.run(args,check=True)
subprocess.run([sys.executable,'-X','utf8',str(skill/'forge/next.py'),'--state','.img2threejs/state.json','sculpt-spec.json'],check=True)
