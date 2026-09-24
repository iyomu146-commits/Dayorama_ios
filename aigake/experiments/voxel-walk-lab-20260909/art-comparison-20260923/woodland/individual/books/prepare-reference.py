"""Analysis masks only: never repaint or regenerate the approved source image.
The original crop remains the human comparison. Background trees confuse the
generic foreground detector, so explicitly observed object bounds are recorded.
"""
import hashlib,json,subprocess,sys
from pathlib import Path
from PIL import Image,ImageDraw
root=Path(__file__).resolve().parent
source=root/'../../references/crops/books.png';e=root/'evidence';e.mkdir(exist_ok=True)
points=[(11,181),(11,170),(25,165),(25,153),(40,150),(40,138),(56,134),(56,121),(72,116),(72,101),(88,96),(88,82),(111,77),(111,65),(144,60),(144,50),(160,42),(190,39),(213,46),(213,60),(234,64),(239,41),(232,36),(232,24),(241,22),(241,13),(257,9),(276,17),(276,26),(283,28),(283,41),(273,45),(273,80),(295,90),(295,103),(311,109),(311,121),(328,129),(328,142),(350,151),(353,170),(338,180),(338,278),(354,286),(357,279),(374,279),(384,286),(384,301),(377,306),(377,349),(370,357),(352,350),(355,333),(342,335),(342,351),(330,360),(322,358),(322,344),(306,347),(305,360),(293,363),(281,359),(280,349),(274,351),(273,372),(249,374),(232,368),(228,359),(199,351),(177,346),(173,333),(50,319),(44,329),(27,326),(27,315),(21,319),(12,311),(17,300),(20,284),(29,281),(33,207),(16,204)]
im=Image.open(source).convert('RGBA');mask=Image.new('L',im.size,0);ImageDraw.Draw(mask).polygon(points,fill=255)
im.putalpha(mask);im.save(e/'reference-object.png')
sil=Image.new('RGBA',im.size,(104,104,104,0));sil.putalpha(mask);sil.save(e/'reference-mask.png')
(e/'reference-mask-provenance.json').write_text(json.dumps({'source':'../../references/crops/books.png','sha256':hashlib.sha256(source.read_bytes()).hexdigest(),'points':points,'method':'Manual observed silhouette polygon, source RGB unchanged inside; plant occlusion and stepped roof perimeter approximate; NOT replacement artwork.','scope':'Bookshop, side bench, two pots and streetlight; surrounding vegetation and neighbour roofs excluded.'},indent=2),encoding='utf-8')
script=Path('C:/Users/iyomu/.codex/skills/img2threejs/forge/stage1_intake/check_reference_admission.py')
for inp,out in [(source,e/'raw-reference-admission.json'),(e/'reference-object.png',root/'reference-admission.json')]:
 r=subprocess.run([sys.executable,'-X','utf8',str(script),str(inp),'--json'],capture_output=True,text=True,encoding='utf-8');out.write_text(r.stdout,encoding='utf-8');print(r.stdout)
 if inp!=source and r.returncode:raise SystemExit(r.returncode)
