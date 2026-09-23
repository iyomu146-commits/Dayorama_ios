"""Analysis-only mask, not replacement artwork. Points manually observed from home.png.
Vegetation occludes the lower corners; the silhouette there is explicitly inferred.
"""
from PIL import Image, ImageDraw
from pathlib import Path
root=Path(__file__).resolve().parent
(root/'evidence').mkdir(exist_ok=True)
mask=Image.new('RGBA',(354,423),(0,0,0,0))
points=[(6,151),(47,47),(49,38),(234,59),(234,32),(232,19),(245,10),(275,13),(275,30),(269,35),(269,62),(280,65),(286,81),(326,124),(326,139),(302,134),(302,291),(229,356),(18,337),(18,157)]
ImageDraw.Draw(mask).polygon(points,fill=(104,104,104,255))
mask.save(root/'evidence/reference-building-mask.png')
