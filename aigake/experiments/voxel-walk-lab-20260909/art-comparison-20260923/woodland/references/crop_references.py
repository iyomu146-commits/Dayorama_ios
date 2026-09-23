"""Extract literal reference pixels. No resize, retouching or generated replacement."""
from pathlib import Path
import hashlib
import json
from PIL import Image

root = Path(__file__).resolve().parent
source = root / 'town-voxel-v2.png'
manifest = json.loads((root / 'regions.json').read_text(encoding='utf-8'))
out = root / 'crops'
out.mkdir(exist_ok=True)
image = Image.open(source).convert('RGB')
records = []
for region in manifest['regions']:
    if region['id'] not in ['home', 'bakery', 'books', 'florist', 'cafe']:
        continue
    x, y, width, height = region['rect']
    assert 0 <= x < x + width <= image.width
    assert 0 <= y < y + height <= image.height
    crop = image.crop((x, y, x + width, y + height))
    target = out / (region['id'] + '.png')
    crop.save(target)
    assert Image.open(target).tobytes() == crop.tobytes()
    records.append({**region, 'file': target.name,
                    'sha256': hashlib.sha256(target.read_bytes()).hexdigest(),
                    'pixelEqualityVerified': True})
(out / 'manifest.json').write_text(json.dumps({
    'source': '../town-voxel-v2.png',
    'sourceSha256': hashlib.sha256(source.read_bytes()).hexdigest(),
    'sourceSize': list(image.size),
    'method': 'Integer rectangle crop only; original RGB pixels, no resampling or regeneration.',
    'crops': records
}, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
print('Saved and verified:', ', '.join(r['file'] for r in records))
