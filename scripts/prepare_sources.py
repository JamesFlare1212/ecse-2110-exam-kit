"""Render PDF page images from the preserved JSON source manifest.

Use --source-dir to copy original PDFs after verifying SHA-256. --locale selects
the independent paper assets; shared lecture/crib assets remain common. No JSON is written.
"""
from pathlib import Path
import argparse
import hashlib
import json
import shutil
import pymupdf
from PIL import Image, ImageDraw
from paper_assets import documents as load_documents, asset_source, text_source

ROOT = Path(__file__).resolve().parents[1]
parser = argparse.ArgumentParser()
parser.add_argument('--source-dir', type=Path)
parser.add_argument('--force', action='store_true')
parser.add_argument('--locale', choices=['en','zh-cn'], default='en')
parser.add_argument('--shared-only', action='store_true', help='Render shared course materials without reading paper folders')
args = parser.parse_args()
documents = json.loads((ROOT / 'content/documents.json').read_text()) if args.shared_only else load_documents(args.locale)
(ROOT / 'content/extracted').mkdir(parents=True, exist_ok=True)
for doc_id, entry in documents.items():
    preserved = asset_source(entry['pdf'])
    source = args.source_dir / entry['original'] if args.source_dir else preserved
    if not source.exists():
        raise FileNotFoundError(f'Missing source PDF: {source}')
    if hashlib.sha256(source.read_bytes()).hexdigest() != entry['sha256']:
        raise ValueError(f'Source SHA-256 differs from content/documents.json: {doc_id}')
    if source.resolve() != preserved.resolve():
        preserved.parent.mkdir(parents=True, exist_ok=True)
        shutil.copyfile(source, preserved)
    previews = asset_source(entry['pageBase'])
    previews.mkdir(parents=True, exist_ok=True)
    with pymupdf.open(preserved) as doc:
        if len(doc) != entry['pages']:
            raise ValueError(f'PDF page count differs from the manifest: {doc_id}')
        for number, page in enumerate(doc, 1):
            size = [round(page.rect.width, 2), round(page.rect.height, 2)]
            if size != entry['sizes'][number-1]:
                raise ValueError(f'PDF page dimensions differ: {doc_id}, page {number}')
            dest = previews / f'{number}.webp'
            if dest.exists() and not args.force:
                continue
            target_width = 1000 if entry['kind'] == 'lecture' else 1100
            scale = target_width / page.rect.width
            pix = page.get_pixmap(matrix=pymupdf.Matrix(scale, scale), alpha=False)
            Image.frombytes('RGB', (pix.width, pix.height), pix.samples).save(
                dest, 'WEBP', quality=85, method=4)
        extracted = ROOT / 'content/extracted' / f'{doc_id}.txt' if args.shared_only else text_source(doc_id, args.locale)
        extracted.parent.mkdir(parents=True, exist_ok=True)
        extracted.write_text(
            '\n'.join(f'\n--- PAGE {index+1} ---\n'+page.get_text(sort=True)
                      for index, page in enumerate(doc)))
        if entry['kind'] in ('exam', 'crib'):
            columns = 3 if entry['kind'] == 'crib' else 4
            thumb_w, thumb_h = 330, 460
            sheet = Image.new('RGB', (columns*thumb_w, ((len(doc)+columns-1)//columns)*(thumb_h+28)), '#e9e9e9')
            draw = ImageDraw.Draw(sheet)
            for index in range(len(doc)):
                with Image.open(previews / f'{index+1}.webp') as image:
                    image.thumbnail((thumb_w-8, thumb_h))
                    x, y = (index % columns)*thumb_w, (index // columns)*(thumb_h+28)
                    sheet.paste(image, (x, y+24))
                    draw.text((x+6, y+5), f'{doc_id} / PDF {index+1}', fill='black')
            sheet.save(f'/tmp/ecse-{doc_id}-contact.jpg')
    print(f'{doc_id}: {entry["pages"]} page images ready', flush=True)
print(f'{len(documents)} documents / {sum(entry["pages"] for entry in documents.values())} pages ready; JSON sources unchanged.')
