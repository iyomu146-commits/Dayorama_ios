"""Record only the agent's already-written, evidence-backed blockout review."""
import json, subprocess, sys
from pathlib import Path
skill=Path('C:/Users/iyomu/.codex/skills/img2threejs')
review=json.loads(Path('evidence/blockout-vision-review.json').read_text(encoding='utf-8'))
args=[sys.executable,'-X','utf8',str(skill/'forge/stage4_review/append_review.py'),'sculpt-spec.json','--pass-id','blockout','--fidelity',str(review['overall']),'--action','continue','--summary',review['limits'],'--render-screenshot','evidence/home-blockout-match.png','--reference-screenshot','../../references/crops/home.png','--comparison-image','evidence/blockout-comparison.png','--ai-vision-score',str(review['overall']),'--layer-scores-json',json.dumps(review['layers']),'--feature-reviews-json',json.dumps(review['features']),'--map-stripped-render','evidence/home-blockout-match-mask.png','--review-viewpoints-json',json.dumps(['match','front','right','back','left','thickness-axis','long-axis']),'--ai-vision-notes','Front/right screenshots directly inspected by agent. Surface and local-detail scores zero because this pass intentionally has no materials or openings. No whole-asset completion claim.','--in-place']
subprocess.run(args,check=True)
