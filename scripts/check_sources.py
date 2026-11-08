"""Check preserved PDFs and the rendering APIs without rewriting course assets."""
import hashlib
from io import BytesIO
import json
from pathlib import Path

import pymupdf
from PIL import Image, ImageDraw
from paper_assets import documents as load_documents, papers, asset_source

ROOT = Path(__file__).resolve().parents[1]


def check_image(page, region=None):
    rect = page.rect
    if region is not None:
        x, y, width, height = region
        assert x >= 0 and y >= 0 and width > 0 and height > 0, region
        assert x + width <= 1 and y + height <= 1, region
        rect = pymupdf.Rect(
            x * rect.width, y * rect.height,
            (x + width) * rect.width, (y + height) * rect.height,
        )
    pix = page.get_pixmap(matrix=pymupdf.Matrix(1, 1), clip=rect, alpha=False)
    image = Image.frombytes('RGB', (pix.width, pix.height), pix.samples)
    assert image.width > 0 and image.height > 0
    image.thumbnail((330, 460))
    sheet = Image.new('RGB', (330, 488), 'white')
    sheet.paste(image, (0, 24))
    ImageDraw.Draw(sheet).text((6, 5), 'PDF source check', fill='black')
    with BytesIO() as output:
        sheet.save(output, 'WEBP', quality=85, method=4)
        output.seek(0)
        with Image.open(output) as decoded:
            decoded.load()
            assert decoded.format == 'WEBP' and decoded.size == sheet.size


def main(locale):
    documents = load_documents(locale)
    formulas = json.loads((ROOT / 'content/formulas.json').read_text())
    exams = [paper['exam'] for paper in papers(locale)]
    citations = [formula['source'] for formula in formulas]
    for exam in exams:
        for problem in exam['problems']:
            citations.append(problem['originalFigure'])
            citations.extend(
                part['questionFigure']['source']
                for part in problem['parts'] if 'questionFigure' in part
            )
    page_count = 0
    for doc_id, entry in documents.items():
        path = asset_source(entry['pdf'])
        assert hashlib.sha256(path.read_bytes()).hexdigest() == entry['sha256'], doc_id
        with pymupdf.open(path) as doc:
            assert len(doc) == entry['pages'] == len(entry['sizes']), doc_id
            for page, size in zip(doc, entry['sizes'], strict=True):
                assert [round(page.rect.width, 2), round(page.rect.height, 2)] == size, (doc_id, page.number)
                assert isinstance(page.get_text(sort=True), str), (doc_id, page.number)
            check_image(doc[0])
            for source in citations:
                if source['doc'] == doc_id:
                    assert 1 <= source['page'] <= len(doc), source
                    check_image(doc[source['page'] - 1], source['region'])
            page_count += len(doc)
        print(f'{doc_id}: SHA-256, {entry["pages"]} pages and source rendering verified', flush=True)
    assert all(source['doc'] in documents for source in citations)
    print(f'Checked {len(documents)} PDFs / {page_count} pages / {len(citations)} citation crops; WebP round trips passed.')


if __name__ == '__main__':
    for locale in ['en', 'zh-cn']:
        main(locale)
