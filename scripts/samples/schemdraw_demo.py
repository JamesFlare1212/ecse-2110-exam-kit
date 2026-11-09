"""Offline Schemdraw evaluation only; never writes active paper assets.

This standalone sample remains separate from the active paper renderers.
Schemdraw 0.23 is now pinned in the offline figure requirements after approval;
the frontend and website build still do not require Python or Schemdraw.
"""
from pathlib import Path
import argparse
import json
import re
import sys

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / 'scripts'))
import plotting as P
from check_figures import circle_geometry

try:
    import schemdraw
    import schemdraw.elements as E
except ImportError as error:
    raise SystemExit('This optional prototype needs schemdraw==0.23; use an isolated environment.') from error


def drawing():
    return schemdraw.Drawing(show=False, color=P.INK, bgcolor=P.PAPER,
                             fontsize=12, font='DejaVu Sans', lw=1.8)


def label(d, point, text, color=None, size=12):
    d.add(E.Label().at(point).label(text, fontsize=size, color=color or P.INK))


def symbols():
    d = drawing()
    d.add(E.ResistorIEEE().at((0, 0)).to((2.6, 0)).label('$R$', loc='top'))
    d.add(E.Inductor().at((4, 0)).to((6.6, 0)).label('$L$', loc='top'))
    d.add(E.Inductor2(loops=4).at((8, 0)).to((10.6, 0)).label('$L$', loc='top'))
    label(d, (1.3, -.8), 'Resistor')
    label(d, (5.3, -.8), 'Inductor')
    label(d, (9.3, -.8), 'Inductor2')
    return d


def semi_bridge():
    """Same four devices and R-L topology as the printed p2-f26-q4 circuit.

    Both devices in each leg point UP. D1/D2 form the existing diode leg;
    the AC lower wire crosses the SCR leg without a junction. No extra diode,
    magnetic core, numerical given or pedagogical current path is added.
    """
    d = drawing()
    for y in [0, 5.5]:
        d.add(E.Line().at((2, y)).to((7, y)))
        d.add(E.Dot().at((4, y)))
    for x, upper, lower, cls in [(2, '$S_1$', '$S_2$', E.SCR), (4, '$D_1$', '$D_2$', E.Diode)]:
        for lo, hi, name in [(3.8, 5.5, upper), (0, 1.7, lower)]:
            element = cls().up().at((x, lo)).to((x, hi))
            if cls is E.SCR:
                element.flip()  # put the gate to the outside/left, not inside the diode leg
            d.add(element)
            label(d, (x+.62, (lo+hi)/2), name)
        if x == 2:
            d.add(E.Line().at((x, 1.7)).to((x, 2.0)))
            d.add(E.ArcLoop(radius=.2).at((x, 2.0)).to((x, 2.4)))
            d.add(E.Line().at((x, 2.4)).to((x, 3.8)))
        else:
            d.add(E.Line().at((x, 1.7)).to((x, 3.8)))
    for end in [(2, 3.1), (4, 2.2)]:
        d.add(E.Line().at((0, end[1])).to(end))
        d.add(E.Dot().at(end))
        d.add(E.Dot(open=True).at((0, end[1])))
    d.add(E.Line(arrow='->').at((.45, 3.1)).to((1.2, 3.1)).color(P.ORANGE))
    label(d, (.8, 3.5), '$i$', P.ORANGE)
    label(d, (-.45, 2.65), '$v$')
    d.add(E.Line(arrow='->').at((5.1, 5.5)).to((6.1, 5.5)).color(P.ORANGE))
    label(d, (5.6, 5.95), '$i_0$', P.ORANGE)
    d.add(E.Line().at((7, 5.5)).to((7, 5.15)))
    resistance = d.add(E.ResistorIEEE().down().at((7, 5.15)).to((7, 3.75)))
    label(d, (7.65, 4.45), '$R$')
    d.add(E.Line().at((7, 3.75)).to((7, 3.45)))
    inductance = d.add(E.Inductor2(loops=4).down().at((7, 3.45)).to((7, 1.1)).color(P.TEAL))
    label(d, (7.75, 2.25), '$L$', P.TEAL)
    d.add(E.Line().at((7, 1.1)).to((7, 0)))
    for y, text in [(4.9, '$+$'), (2.8, '$v_0$'), (.6, '$-$')]:
        label(d, (6.25, y), text)
    # Endpoint checks supplement (not replace) human topology inspection.
    assert abs(resistance.start[0] - inductance.end[0]) < 1e-10
    assert resistance.end[1] > inductance.start[1] > inductance.end[1]
    assert sum(isinstance(e, E.SCR) for e in d.elements) == 2
    assert sum(type(e) is E.Diode for e in d.elements) == 2
    return d


def render(out, maker, name, dark):
    P.setup(dark)
    d = maker()
    fig, ax = P.plt.subplots(figsize=(11, 6 if name == 'semi-controlled-bridge' else 2.4))
    d.draw(canvas=ax, show=False)
    ax.axis('off')
    P.equal_units(ax)  # existing Matplotlib axes do not get equal aspect automatically
    P.prepare_figure(fig)
    fig.canvas.draw()
    assert all(circle['round'] for circle in circle_geometry(fig)), 'Native symbols must remain circular'
    svg = out / f'{name}{"-dark" if dark else ""}.svg'
    fig.savefig(svg, bbox_inches='tight', pad_inches=.18,
                metadata={'Date': None, 'Creator': f'Schemdraw {schemdraw.__version__} · Fieldnotes prototype'})
    # Matplotlib emits trailing spaces in multiline path attributes; keep prototype diffs compact.
    svg.write_text('\n'.join(line.rstrip() for line in svg.read_text().splitlines())+'\n')
    fig.savefig(svg.with_suffix('.png'), bbox_inches='tight', pad_inches=.18,
                dpi=150, facecolor=P.PAPER)
    P.plt.close(fig)
    return {'name': name, 'theme': 'dark' if dark else 'light', 'svgBytes': svg.stat().st_size,
            'elements': len(d.elements), 'roundSymbols': True}


def inline_svg(path, prefix):
    """Embed the actual generated SVG, compacting only serialization/styles."""
    svg = path.read_text()
    svg = re.sub(r'<\?.*?\?>|<!DOCTYPE.*?>|<!--.*?-->|<metadata>.*?</metadata>', '', svg, flags=re.S).strip()
    svg = re.sub(r'\b(width|height)="[^"]+pt"', '', svg, count=2)
    svg = re.sub(r'id="([^"]+)"', lambda match: f'id="{prefix}-{match[1]}"', svg)
    svg = re.sub(r'url\(#([^)]+)\)', lambda match: f'url(#{prefix}-{match[1]})', svg)
    for original, token in {'#263746': '--foreground', '#667581': '--muted-foreground',
                            '#187c78': '--chart-2', '#b65c3b': '--chart-3',
                            '#ffffff': '--card', '#dce3e4': '--border'}.items():
        svg = svg.replace(original, f'var({token})')
    svg = re.sub(r'-?\d+\.\d{4,}', lambda match: f'{float(match[0]):.3f}'.rstrip('0').rstrip('.'), svg)
    styles = {}
    def style_class(match):
        value = match[1]
        if value not in styles:
            styles[value] = f'{prefix}-s{len(styles)}'
        return f'class="{styles[value]}"'
    svg = re.sub(r'style="([^"]+)"', style_class, svg)
    css = ''.join(f'.{name}{{{value}}}' for value, name in styles.items())
    svg = re.sub(r'(<svg[^>]*>)', lambda match: match[0]+'<style>'+css+'</style>', svg, count=1)
    return re.sub(r'>\s+<', '><', svg)


def native_samples(out):
    # Also exercise the direct SVG backend: no TeX or optional math packages.
    # Do not use svgconfig.precision: Schemdraw 0.23 requires ziamath for that option.
    schemdraw.svgconfig.text = 'text'
    P.setup(False)
    for name, maker in [('native-symbols', symbols), ('native-bridge', semi_bridge)]:
        d = maker()
        d.draw(canvas='svg', show=False)
        svg = d.get_imagedata('svg').decode()
        svg = re.sub(r'(<svg[^>]*>)', lambda match: match[0]+'<style>text{font-weight:700}</style>', svg, count=1)
        (out/f'{name}.svg').write_text(svg)


def gallery(out):
    symbols_svg = inline_svg(out/'native-symbols.svg', 'symbols')
    bridge_svg = inline_svg(out/'native-bridge.svg', 'bridge')
    html = '''<!doctype html><html lang="en"><head><meta charset="utf-8"><style>
:root{color:var(--foreground);font-family:var(--font-sans)}body{margin:0}main{display:flex;flex-direction:column;gap:18px}.sample{background:var(--card);border-radius:var(--radius);padding:16px}.sample svg{display:block;width:100%;height:auto}.bridge svg{max-width:620px;margin-inline:auto}.caption{font-size:12px;line-height:1.6;margin:8px 0 0;color:var(--muted-foreground)}
</style></head><body><main><section class="sample">'''+symbols_svg+'''<p class="caption">Schemdraw 0.23 · resistor / semicircular inductor / looped inductor</p></section><section class="sample bridge">'''+bridge_svg+'''<p class="caption">Half-controlled bridge · native SCR, diode, resistor and Inductor2 symbols · evaluation only</p></section></main></body></html>'''
    (out/'sample.html').write_text(html)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--output', type=Path, default=ROOT/'artifacts/circuit-library-sample')
    out = parser.parse_args().output.resolve()
    if any(out.is_relative_to(ROOT/name) for name in ['content', 'static', '.public-assets', 'build']):
        parser.error('Prototype output must stay outside active content and public/build asset trees.')
    out.mkdir(parents=True, exist_ok=True)
    results = [render(out, maker, name, dark) for dark in [False, True]
               for name, maker in [('symbols', symbols), ('semi-controlled-bridge', semi_bridge)]]
    native_samples(out)
    gallery(out)
    (out/'report.json').write_text(json.dumps({'package': f'Schemdraw {schemdraw.__version__}',
        'prototypeOnly': True, 'activePaperAssetsModified': False, 'results': results}, indent=2)+'\n')
    print(f'Generated prototype only: {out}')


if __name__ == '__main__':
    main()
