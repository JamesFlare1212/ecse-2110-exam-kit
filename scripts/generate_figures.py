"""Discover paper-local Matplotlib renderers and generate only their assets."""
import argparse
import hashlib
import importlib.util
import json
from pathlib import Path

import pymupdf
from PIL import Image
import plotting
from plotting import prepare_figure, plt
from paper_assets import ROOT, papers, documents, asset_source
from svg_labels import localize


def renderer(paper):
    path = paper['directory'] / 'generate_figures.py'
    spec = importlib.util.spec_from_file_location('figures_' + paper['locale'] + '_' + paper['name'], path)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def figure_names(paper, questions_only=False):
    names = set()
    for question in paper['exam']['problems']:
        if question.get('figure'):
            names.add(question['figure'])
        for part in question['parts']:
            if not questions_only and part.get('figure'):
                names.add(part['figure'])
            if part.get('questionFigure'):
                names.add(part['questionFigure']['name'])
    return names


def render_figures(save, dark, selected=None):
    for paper in papers():
        if selected is None or paper['directory'] == selected:
            allowed = figure_names(paper)
            def emit(fig, name, theme):
                if name in allowed:
                    save(fig, name, theme, paper)
                else:
                    plt.close(fig)
            renderer(paper).render_figures(emit, dark)


def generate_paper(directory):
    directory = Path(directory).resolve()
    paper = next(p for p in papers() if p['directory'] == directory)
    output = directory / 'assets/figures'
    output.mkdir(parents=True, exist_ok=True)
    generated = set()

    def save(fig, name, dark, owner):
        if Path(name).name != name:
            raise ValueError(f'Invalid figure name: {name}')
        prepare_figure(fig)
        target = output / f'{name}{"-dark" if dark else ""}.svg'
        fig.savefig(target,
                    bbox_inches='tight', pad_inches=.16,
                    metadata={'Date': None, 'Creator': 'Matplotlib · ECSE 2110 Fieldnotes'})
        localize(target, getattr(renderer(owner), 'SVG_LABELS', {}))
        plt.close(fig)
        generated.add(name)

    for dark in [False, True]:
        render_figures(save, dark, paper['directory'])

    source_path = directory / 'figure-sources.json'
    sources = json.loads(source_path.read_text())
    registry = documents(paper['locale'])
    crops = directory / 'assets/original-figures'
    crops.mkdir(parents=True, exist_ok=True)
    question_names = figure_names(paper, questions_only=True)
    for name, source in sources['figures'].items():
        if name not in question_names:
            continue
        x, y, width, height = source['region']
        region = [max(0, x-.002), max(0, y-.002), width+.004, height+.004]
        with pymupdf.open(asset_source(registry[source['doc']]['pdf'])) as doc:
            page = doc[source['page']-1]
            size = page.rect
            panels = []
            for x, y, width, height in sources['panels'].get(name, [region]):
                rectangle = pymupdf.Rect(x*size.width, y*size.height,
                                         (x+width)*size.width, (y+height)*size.height)
                pix = page.get_pixmap(matrix=pymupdf.Matrix(2, 2), clip=rectangle, alpha=False)
                panels.append(Image.frombytes('RGB', (pix.width, pix.height), pix.samples))
            if len(panels) == 1:
                original = panels[0]
            else:
                original = Image.new('RGB', (max(im.width for im in panels),
                    sum(im.height for im in panels)+24*(len(panels)-1)), 'white')
                top = 0
                for panel in panels:
                    original.paste(panel, ((original.width-panel.width)//2, top))
                    top += panel.height+24
            original.save(crops / f'{name}.webp', 'WEBP', quality=93)
    # Removing a prompt diagram must also remove its previously staged artwork.
    for path in output.glob('*.svg'):
        name = path.stem.removesuffix('-dark')
        if name not in generated:
            path.unlink()
    for path in crops.glob('*.webp'):
        if path.stem not in question_names:
            path.unlink()
    hashes = {str(path.relative_to(ROOT)): hashlib.sha256(path.read_bytes()).hexdigest()
              for path in [directory/'generate_figures.py', source_path,
                           ROOT/'scripts/plotting.py', ROOT/'scripts/question_primitives.py']}
    (output/'manifest.json').write_text(json.dumps({
        'paper': paper['name'], 'matplotlib': plotting.matplotlib.__version__,
        'generator': str((directory/'generate_figures.py').relative_to(ROOT)),
        'sourceSha256': hashes, 'svgFonttype': 'none',
        'textScale': plotting.FIGURE_TEXT_SCALE, 'textWeight': 'bold',
        'questionFigures': sorted(question_names), 'figures': sorted(generated),
    }, indent=2)+'\n')
    print(f'{paper["name"]}: generated {len(generated)} figures in both themes and {len(question_names)} question crops.')


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--paper', help='Paper folder name, for example exam1_f26')
    parser.add_argument('--locale', choices=['en', 'zh-cn'], help='Draw only one language; default draws both')
    args = parser.parse_args()
    selected = [paper for paper in papers(args.locale) if args.paper is None or paper['name'] == args.paper]
    if not selected:
        parser.error('No matching paper')
    for paper in selected:
        generate_paper(paper['directory'])
