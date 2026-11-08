"""Deep, read-only checks of the four delivered clean Exam 2 PDFs.

Uses delivered files only: CI must never need the private Gradescope export.
The frontend suite has lightweight equivalent metadata checks without Python.
"""
import hashlib
import json
from pathlib import Path
import pymupdf

ROOT = Path(__file__).resolve().parents[1]
FORBIDDEN = ['Graded', 'Total Points', 'Question assigned to the following page', 'Student']


def main():
    copies = {}
    for locale in ['en', 'zh-cn']:
        folder = ROOT / 'content' / locale / 'exam2_u00'
        registry = json.loads((folder / 'documents.json').read_text())
        for doc_id in ['e2-u00', 'e2-u00-sol']:
            path = folder / 'assets' / registry[doc_id]['pdf']
            data = path.read_bytes()
            assert hashlib.sha256(data).hexdigest() == registry[doc_id]['sha256'], path
            with pymupdf.open(path) as pdf:
                assert len(pdf) == 5, path
                assert all(not page.get_images(full=True) for page in pdf), (path, 'raster image')
                assert all(page.get_text().strip() for page in pdf), (path, 'missing native text')
                assert all(page.get_drawings() for page in pdf), (path, 'missing vector paths')
                text = '\n'.join(page.get_text() for page in pdf)
                assert all(word not in text for word in FORBIDDEN), (path, 'grading record')
                assert '1.732' in text and '600' in text, path
                if doc_id.endswith('-sol'):
                    assert 'not an official answer key' in text, path
                else:
                    for label in ['2-1', '2-2', '2-3', '2-4', '2-5', '2-6', '2-7']:
                        assert label in text, (path, label)
                    assert '95 academic points' in text, path
            if doc_id in copies:
                assert copies[doc_id][0] == data, doc_id
                assert copies[doc_id][1] != path.stat().st_ino, (doc_id, 'shared file instead of separate locale copies')
            else:
                copies[doc_id] = (data, path.stat().st_ino)
    print('Verified four independent clean PDF copies: 20 pages, native text/vector paths, zero raster images, no grading records.')


if __name__ == '__main__':
    main()
