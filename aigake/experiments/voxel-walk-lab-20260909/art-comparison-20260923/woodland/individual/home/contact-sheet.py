import sys
from pathlib import Path
from PIL import Image,ImageOps,ImageDraw
stage=sys.argv[1]
files=[Path('../../references/crops/home.png')]+[Path(f'evidence/home-{stage}-{v}.png') for v in ['match','front','right','back','left']]
sheet=Image.new('RGB',(1062,890),'#eeece5');draw=ImageDraw.Draw(sheet)
for i,p in enumerate(files):
 im=Image.open(p).convert('RGB');im.thumbnail((354,423));x=(i%3)*354;y=(i//3)*445
 sheet.paste(im,(x,y+22));draw.text((x+8,y+5),p.stem,fill='#393e38')
sheet.save(f'evidence/{stage}-full-comparison.png')
