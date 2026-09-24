"""Record measured delivery checks, never create visual scores."""
import json,subprocess,sys
from pathlib import Path
skill=Path('C:/Users/iyomu/.codex/skills/img2threejs')
spec=json.loads(Path('sculpt-spec.json').read_text(encoding='utf-8'))
parts=','.join(c['id'] for c in spec['componentTree'])
subprocess.run([sys.executable,'-X','utf8',str(skill/'forge/stage4_review/check_part_coverage.py'),'--spec','sculpt-spec.json','--manifest','evidence/optimization-runtime.json','--require',parts,'--json','evidence/part-coverage.json'],check=True)
r=subprocess.run(['node','--test','runtime.test.mjs'],capture_output=True,text=True,encoding='utf-8')
report={'passed':r.returncode==0,'command':'node --test runtime.test.mjs','stdout':r.stdout,'stderr':r.stderr,'source':'actual node test execution; browser hierarchy from optimization-runtime.json'}
Path('evidence/runtime-tests.json').write_text(json.dumps(report,indent=2)+'\n',encoding='utf-8')
assert report['passed'],r.stdout+r.stderr
for step,evidence in [('part-coverage','evidence/part-coverage.json'),('action-ready','evidence/runtime-tests.json')]:
 subprocess.run([sys.executable,str(skill/'forge/state.py'),'mark',step,'--evidence',evidence],check=True)
spec['implementedVoxelStudy']={'version':'books1','cellSizeMeters':0.15,'cellCount':16671,'modelTriangles':15480,'partCount':27,'verticalBoundaryMapping':'round(sourceBoundary * 1.12), all resulting cells remain identical cubes','architectureXOffsetCells':-3,'hipCourseXInsetCells':2.65,'hipCourseZInsetCells':2,'roofPattern':'2 + 2 + 1 filled joint; subtle color differences','sourceCrop':'../../references/crops/books.png','actualBoundsSource':'evidence/optimization-runtime.json','userAccepted':False,'fullTownIntegrated':False,'pixelation':'off; reconsider weak after whole-town scene','geometryScope':'validation-scope.md'}
Path('sculpt-spec.json').write_text(json.dumps(spec,indent=2)+'\n',encoding='utf-8')
subprocess.run([sys.executable,'-X','utf8',str(skill/'forge/next.py'),'--state','.img2threejs/state.json','sculpt-spec.json'],check=True)
