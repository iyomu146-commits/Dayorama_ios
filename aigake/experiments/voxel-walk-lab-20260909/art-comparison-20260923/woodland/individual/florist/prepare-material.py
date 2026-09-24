"""Add observed flower-zone palette recipes; preserve intake and all prior reviews."""
import json
from pathlib import Path
p=Path('sculpt-spec.json');s=json.loads(p.read_text(encoding='utf-8'))
tones={'flowers-yellow':'#dcb84f','flowers-side-front':'#dcb84f','flowers-side-middle':'#dcb84f','flowers-purple':'#a391bb','flowers-white':'#e7d9b4','display-flowers':'#d69c54'}
for c in s['componentTree']:
 if c['id'] in tones:
  h=tones[c['id']];c['colorMaterialRecipe']['dominantAlbedo']='rgba('+', '.join(str(int(h[i:i+2],16)) for i in [1,3,5])+', 1)'
  c['colorMaterialRecipe']['notes']='Observed flower-zone hue; petals have a contrasting raised center and separate green leaves. Sharp 15cm cells retained.'
s['materialImplementationNotes']={'roof':'2+2+1 columns; the joint is a subdued olive color, not missing cells.','walls':'Staggered four-cell masonry tone clusters, occasional warmer/lighter blocks.','flowers':'21 rooted blooms; pink, yellow, white, lilac and orange petals, contrasting gold/cream center; low-confidence exact hue inference from supplied image.'}
p.write_text(json.dumps(s,indent=2)+'\n',encoding='utf-8')
for name in ['check-material-footprints.py','record-footprint-diagnostic.py']:
 t=Path('../books',name).read_text(encoding='utf-8').replace('books-','florist-').replace('27 specified','35 specified')
 if name=='check-material-footprints.py':
  t=t.replace("['building','roof','display-glass','florist-lower','florist-upper','door','bench','herb-left','herb-right','chimney-rim']","['building','roof','display-glass','greenhouse-glass','door','flowers-yellow','flowers-purple','flowers-white','display-flowers','side-flowers']")
 else:t=t.replace('>=20','>=28')
 Path(name).write_text(t,encoding='utf-8')
