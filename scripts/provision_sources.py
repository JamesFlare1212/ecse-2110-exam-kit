"""Restore ignored original PDFs without changing their registered provenance.

Use --reference-dir for the instructor archive or --bundle-url (HTTPS ZIP) for
CI. A ZIP contains canonical repository-relative PDF paths, not student exports.
Only registered files are read; unregistered ZIP members are never extracted.
"""
import argparse
import hashlib
import io
import json
import os
from pathlib import Path
import shutil
import urllib.parse
import urllib.request
import zipfile

ROOT = Path(__file__).resolve().parents[1]


def sources():
    for doc in json.loads((ROOT / 'content/documents.json').read_text()).values():
        yield ROOT / 'static' / doc['pdf'].lstrip('/'), doc
    for language in ['en', 'zh-cn']:
        for registry in sorted((ROOT / 'content' / language).glob('*/documents.json')):
            for doc in json.loads(registry.read_text()).values():
                yield registry.parent / 'assets' / doc['pdf'], doc


def digest(data):
    return hashlib.sha256(data).hexdigest()


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    group = parser.add_mutually_exclusive_group()
    group.add_argument('--reference-dir', type=Path)
    group.add_argument('--bundle-url', default=os.environ.get('COURSE_SOURCES_URL'))
    parser.add_argument('--verify-only', action='store_true')
    parser.add_argument('--create-bundle', type=Path, help='Create a local, private deployment ZIP after verification')
    args = parser.parse_args()
    records = list(sources())
    missing = [(path, doc) for path, doc in records if not path.exists()]
    if missing and not args.verify_only:
        if args.bundle_url:
            if urllib.parse.urlsplit(args.bundle_url).scheme != 'https':
                parser.error('The source bundle must use HTTPS')
            # Do not log URLs, which may contain a deployment token.
            with urllib.request.urlopen(args.bundle_url, timeout=120) as response:
                if urllib.parse.urlsplit(response.geturl()).scheme != 'https':
                    raise ValueError('Source-bundle redirect must remain HTTPS')
                payload = response.read(512 * 1024 * 1024 + 1)
            if len(payload) > 512 * 1024 * 1024:
                raise ValueError('Source bundle exceeds 512 MiB')
            with zipfile.ZipFile(io.BytesIO(payload)) as archive:
                for path, doc in missing:
                    member = path.relative_to(ROOT).as_posix()
                    info = archive.getinfo(member)
                    if info.file_size > 64 * 1024 * 1024:
                        raise ValueError(f'Source exceeds 64 MiB: {member}')
                    data = archive.read(info)
                    if digest(data) != doc['sha256']:
                        raise ValueError(f'Source SHA-256 mismatch: {member}')
                    path.parent.mkdir(parents=True, exist_ok=True)
                    path.write_bytes(data)
        elif args.reference_dir:
            reference = args.reference_dir.resolve()
            for path, doc in missing:
                original = doc['original'].replace('\\', '/')
                candidates = list(reference.rglob(Path(original).name))
                matches = [p for p in candidates if p.is_file() and digest(p.read_bytes()) == doc['sha256']]
                if matches:
                    path.parent.mkdir(parents=True, exist_ok=True)
                    shutil.copyfile(matches[0], path)
        else:
            parser.error('Original PDFs are missing. Supply --reference-dir reference, or set COURSE_SOURCES_URL to a canonical PDF ZIP. See README.md.')
    errors = []
    for path, doc in records:
        if not path.exists():
            errors.append(f'Missing: {path.relative_to(ROOT)}')
        elif digest(path.read_bytes()) != doc['sha256']:
            errors.append(f'SHA-256 mismatch: {path.relative_to(ROOT)}')
    if errors:
        raise SystemExit('\n'.join(errors))
    if args.create_bundle:
        args.create_bundle.parent.mkdir(parents=True, exist_ok=True)
        with zipfile.ZipFile(args.create_bundle, 'w', compression=zipfile.ZIP_DEFLATED) as archive:
            for path, _ in records:
                archive.write(path, path.relative_to(ROOT).as_posix())
        print(f'Created private PDF bundle: {args.create_bundle}')
    print(f'Verified {len(records)} canonical PDF copies; provenance unchanged.')


if __name__ == '__main__':
    main()
