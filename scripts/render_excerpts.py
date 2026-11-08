"""Render formula source crops from authored JSON; only write image assets."""
import json
from pathlib import Path
import pymupdf
from PIL import Image
from paper_assets import documents, asset_source

ROOT = Path(__file__).resolve().parents[1]
items = json.loads((ROOT / 'content/formulas.json').read_text())
registry = documents()
out = ROOT / 'static/excerpts'
out.mkdir(exist_ok=True, parents=True)
for item in items:
    source = item['source']
    with pymupdf.open(asset_source(registry[source['doc']]['pdf'])) as document:
        page = document[source['page']-1]
        x, y, width, height = source['region']
        size = page.rect
        crop = pymupdf.Rect(x*size.width, y*size.height,
                           (x+width)*size.width, (y+height)*size.height)
        pix = page.get_pixmap(matrix=pymupdf.Matrix(2, 2), clip=crop, alpha=False)
        Image.frombytes('RGB', (pix.width, pix.height), pix.samples).save(
            out / f'{item["id"]}.webp', 'WEBP', quality=92)
print(f'Rendered {len(items)} formula source excerpts.')
