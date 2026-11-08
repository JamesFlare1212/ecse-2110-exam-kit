"""Restore local original PDFs for optional offline rendering/auditing only.

The website uses checked-in page images and never calls this tool. No network,
ZIP bundle, CI secret or deployment variable is needed by the frontend build.
"""
import argparse
import hashlib
import json
from pathlib import Path
import shutil

ROOT = Path(__file__).resolve().parents[1]


def sources():
    for doc in json.loads((ROOT / 'content/documents.json').read_text()).values():
        yield ROOT / 'static' / doc['pdf'].lstrip('/'), doc
    for language in ['en', 'zh-cn']:
        for registry in sorted((ROOT / 'content' / language).glob('*/documents.json')):
            for doc in json.loads(registry.read_text()).values():
                yield registry.parent / 'assets' / doc['pdf'], doc


def digest(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--reference-dir', type=Path, help='Local instructor archive; never published')
    parser.add_argument('--verify-only', action='store_true')
    args = parser.parse_args()
    records = list(sources())
    if args.reference_dir and not args.verify_only:
        reference = args.reference_dir.resolve()
        for path, doc in records:
            if path.exists():
                continue
            original = doc['original'].replace('\\', '/')
            if not original.endswith('.pdf'):
                continue
            candidates = [p for p in reference.rglob(Path(original).name) if p.is_file()]
            matches = [p for p in candidates if digest(p) == doc['sha256']]
            if matches:
                path.parent.mkdir(parents=True, exist_ok=True)
                shutil.copyfile(matches[0], path)
    errors = []
    for path, doc in records:
        if not path.exists():
            errors.append(f'Missing local audit input: {path.relative_to(ROOT)}')
        elif digest(path) != doc['sha256']:
            errors.append(f'SHA-256 mismatch: {path.relative_to(ROOT)}')
    if errors:
        raise SystemExit('\n'.join(errors) + '\nThese PDFs are optional offline inputs, not website build requirements. Restore them from the local archive for PDF auditing.')
    print(f'Verified {len(records)} local PDF copies for offline tools; provenance unchanged.')


if __name__ == '__main__':
    main()
