"""Read paper metadata and Markdown frontmatter for offline asset verification."""
import json
import re
from pathlib import Path
import yaml

ROOT = Path(__file__).resolve().parents[1]
PAPER_NAME = re.compile(r'(?:exam|practice)[1-9]\d*_(?:[fs]\d{2}|u00)')


def papers(locale=None):
    result = []
    directories = [directory for language in ([locale] if locale else ['en', 'zh-cn'])
                   for directory in sorted((ROOT / 'content' / language).iterdir())]
    for directory in directories:
        if directory.is_dir() and PAPER_NAME.fullmatch(directory.name):
            exam = json.loads((directory / 'paper.json').read_text())
            # Only asset/citation metadata is needed here. Python never parses,
            # authors or compiles the Markdown question/solution body.
            exam['problems'] = []
            figures = json.loads((directory / 'figure-sources.json').read_text())['figures']
            def source_for(name):
                source = figures[name]
                x, y, width, height = source['region']
                return dict(source, region=[round(max(0,x-.002),4), round(max(0,y-.002),4), round(width+.004,4), round(height+.004,4)])
            for question in sorted((directory / 'questions').glob('*.md')):
                source = question.read_text()
                header = re.match(r'\A---\n(.*?)\n---(?:\n|$)', source, re.DOTALL)
                if not header:
                    raise ValueError(f'{question}: missing YAML frontmatter')
                metadata = yaml.safe_load(header.group(1))
                figure = metadata.get('figure',metadata['id'])
                overrides = metadata.get('parts',{})
                metadata['figure'] = figure
                metadata['originalFigure'] = source_for(figure or metadata['id'])
                metadata['parts'] = []
                for part in overrides.values():
                    if part.get('figure'):
                        metadata['parts'].append({'figure': part['figure']})
                    name = part.get('questionFigure')
                    if name:
                        name = name if isinstance(name,str) else name['name']
                        metadata['parts'].append({'questionFigure': {'name': name, 'source': source_for(name)}})
                exam['problems'].append(metadata)
            result.append({'name': directory.name, 'locale': directory.parent.name, 'directory': directory, 'exam': exam})
    return result


def documents(locale='en'):
    result = json.loads((ROOT / 'content/documents.json').read_text())
    for paper in papers(locale):
        local = json.loads((paper['directory'] / 'documents.json').read_text())
        for key, value in local.items():
            if key in result:
                raise ValueError(f'Duplicate document: {key}')
            base = '/papers/' + paper['locale'] + '/' + paper['name'] + '/'
            result[key] = dict(value, pdf=base+value['pdf'], pageBase=base+value['pageBase'])
    return result


def asset_source(path):
    parts = Path(path.lstrip('/')).parts
    if '..' in parts:
        raise ValueError(f'Invalid asset path: {path}')
    if parts[0] == 'papers':
        if len(parts) < 4 or parts[1] not in ('en', 'zh-cn') or not PAPER_NAME.fullmatch(parts[2]):
            raise ValueError(f'Invalid paper asset path: {path}')
        return ROOT / 'content' / parts[1] / parts[2] / 'assets' / Path(*parts[3:])
    return ROOT / 'static' / Path(*parts)


def text_source(doc_id, locale='en'):
    for paper in papers(locale):
        local = json.loads((paper['directory'] / 'documents.json').read_text())
        if doc_id in local:
            return paper['directory'] / 'extracted' / f'{doc_id}.txt'
    return ROOT / 'content/extracted' / f'{doc_id}.txt'
