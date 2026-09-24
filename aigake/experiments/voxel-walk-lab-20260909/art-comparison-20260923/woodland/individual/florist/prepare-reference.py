"""Manual diagnostic silhouette only; original crop RGB remains unmodified."""
import hashlib,json,subprocess,sys
from pathlib import Path
from PIL import Image,ImageDraw
source=Path('../../references/crops/florist.png');e=Path('evidence');e.mkdir(exist_ok=True)
points=[(180,6),(346,21),(363,32),(377,52),(394,58),(402,75),(415,82),(411,96),(403,96),(403,157),(418,153),(432,159),(431,186),(445,193),(444,215),(418,228),(419,252),(394,266),(395,286),(373,292),(372,300),(354,308),(330,302),(326,309),(302,303),(289,295),(272,296),(250,285),(226,294),(188,296),(149,286),(142,267),(122,276),(108,270),(107,261),(54,270),(7,260),(0,246),(0,220),(12,212),(12,199),(25,190),(23,161),(33,130),(45,122),(49,112),(90,90),(129,84),(126,72),(139,66),(147,48),(164,36),(174,19)]
im=Image.open(source).convert('RGBA');mask=Image.new('L',im.size,0);ImageDraw.Draw(mask).polygon(points,fill=255);im.putalpha(mask);im.save(e/'reference-object.png');sil=Image.new('RGBA',im.size,(104,104,104,0));sil.putalpha(mask);sil.save(e/'reference-mask.png')
(e/'reference-mask-provenance.json').write_text(json.dumps({'source':str(source),'sha256':hashlib.sha256(source.read_bytes()).hexdigest(),'points':points,'method':'Approximate manual observed outline excluding path, neighbouring plants/buildings; not new artwork; original RGB retained.','scope':'Main shop, attached glazed lean-to, flowers and their containers.'},indent=2),encoding='utf-8')
script=Path('C:/Users/iyomu/.codex/skills/img2threejs/forge/stage1_intake/check_reference_admission.py')
for inp,out in [(source,e/'raw-reference-admission.json'),(e/'reference-object.png',Path('reference-admission.json'))]:
 r=subprocess.run([sys.executable,'-X','utf8',str(script),str(inp),'--json'],capture_output=True,text=True,encoding='utf-8');out.write_text(r.stdout,encoding='utf-8');print(r.stdout)
 if inp!=source and r.returncode:raise SystemExit(r.returncode)
