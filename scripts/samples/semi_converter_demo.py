"""Build the isolated Q4(a) step-animation sample; never edits course content.

python scripts/samples/semi_converter_demo.py
Uses the same pinned Schemdraw adapter and original S1/S2, D1/D2 leg topology.
The AC source is made explicit across the original input terminals for teaching.
"""
from pathlib import Path
from collections import defaultdict
from io import StringIO
import json
import gzip
import base64
import re
import tempfile
import sys
import xml.etree.ElementTree as ET

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT/'scripts'))
import numpy as np
import plotting as P
import circuit_drawing as C
from matplotlib.patches import Arc
from svg_labels import localize


def bridge():
    P.setup(False)
    fig, ax = P.plt.subplots(figsize=(8, 5.4))
    fig.subplots_adjust(left=.02, right=.98, bottom=.02, top=.98)
    P.canvas(ax, (-2.1, 8.2), (-.3, 6.4)); P.equal_units(ax)
    counters = defaultdict(int)

    def piece(part, draw):
        before = set(ax.lines) | set(ax.patches) | set(ax.texts)
        draw()
        if hasattr(ax, '_fieldnotes_circuit'):
            C.circuit(ax).finish()
            del ax._fieldnotes_circuit
        for artist in [*ax.lines, *ax.patches, *ax.texts]:
            if artist not in before:
                artist.set_gid(f'native-{part}-{counters[part]}')
                counters[part] += 1

    def wires(part, *polylines):
        def draw():
            for points in polylines:
                for a, b in zip(points, points[1:]):
                    C.wire(ax, a, b)
        piece(part, draw)

    def label(part, x, y, text, **kw):
        piece(part, lambda: P.label(ax, x, y, text, ha='center', va='center', fontsize=14.5, **kw))

    for x, top, bottom in [(1.8, 'S1', 'S2'), (3.8, 'D1', 'D2')]:
        for part, lo, hi in [(top, 4.2, 5.2), (bottom, .9, 1.9)]:
            piece(part, lambda x=x, lo=lo, hi=hi, part=part:
                  C.diode(ax, (x, lo), (x, hi), scr=part.startswith('S'), gate_left=part.startswith('S')))
            label(part, x+.55, (lo+hi)/2, f'${part[0]}_{part[1]}$')
    wires('S1', [(1.8, 3.7), (1.8, 4.2)], [(1.8, 5.2), (1.8, 5.6)])
    wires('S2', [(1.8, .4), (1.8, .9)], [(1.8, 1.9), (1.8, 2.13)], [(1.8, 2.47), (1.8, 3.7)])
    piece('S2', lambda: ax.add_patch(Arc((1.8, 2.3), .34, .34, theta1=-90, theta2=90, color=P.INK, lw=1.6)))
    wires('D1', [(3.8, 2.3), (3.8, 4.2)], [(3.8, 5.2), (3.8, 5.6)])
    wires('D2', [(3.8, .4), (3.8, .9)], [(3.8, 1.9), (3.8, 2.3)])
    wires('top-left', [(1.8, 5.6), (3.8, 5.6)])
    wires('bottom-left', [(1.8, .4), (3.8, .4)])
    wires('load', [(3.8, 5.6), (6.6, 5.6), (6.6, 5.1)], [(6.6, 4.0), (6.6, 3.4)], [(6.6, 1.8), (6.6, .4), (3.8, .4)])
    piece('load', lambda: C.resistor(ax, (6.6, 5.1), (6.6, 4.0)))
    piece('load', lambda: C.inductor(ax, (6.6, 3.4), (6.6, 1.8)))
    label('load', 7.25, 4.55, '$R$'); label('load', 7.25, 2.6, '$L$')
    label('load', 5.7, 4.9, '$+$'); label('load', 5.7, 1.0, '$-$'); label('load', 5.7, 2.95, '$v_0$')
    piece('load', lambda: C.wire(ax, (4.6, 5.6), (5.3, 5.6), arrow='->'))
    label('load', 4.95, 6.02, '$i_0$')
    wires('source', [(-1, 3.7), (1.8, 3.7)], [(-1, 2.3), (3.8, 2.3)])
    piece('source', lambda: C.source(ax, (-1, 2.3), (-1, 3.7), kind='ac', radius=.7))
    piece('source', lambda: C.wire(ax, (-.45, 3.7), (.3, 3.7), arrow='->'))
    label('source', -.05, 4.1, '$i$')
    label('source', -1.82, 3.85, '$+$'); label('source', -1.82, 2.15, '$-$')
    label('source', -1.85, 3, '$v$')
    for point, part in [((1.8, 3.7), 'source'), ((3.8, 2.3), 'load'), ((3.8, 5.6), 'load'), ((3.8, .4), 'load')]:
        piece(part, lambda point=point: C.terminal(ax, point, radius=.045, open=False))
    P.prepare_figure(fig); fig.canvas.draw()
    buffer = StringIO()
    fig.savefig(buffer, format='svg', bbox_inches=None, metadata={'Date': None, 'Creator': 'Schemdraw step-animation teaching sample'})
    ET.register_namespace('', 'http://www.w3.org/2000/svg')
    ET.register_namespace('xlink', 'http://www.w3.org/1999/xlink')
    root = ET.fromstring(buffer.getvalue())
    root.set('id', 'bridge'); root.set('role', 'img'); root.set('aria-label', '半控桥导通电路，亮线表示当前导通路径')
    root.attrib.pop('width', None); root.attrib.pop('height', None)
    ns = '{http://www.w3.org/2000/svg}'
    for parent in root.iter():
        for child in list(parent):
            if child.get('id') == 'patch_1' or child.tag == ns+'metadata':
                parent.remove(child)
        name = parent.get('id', '')
        if name.startswith('native-'):
            part = name.removeprefix('native-').rsplit('-', 1)[0]
            parent.set('class', 'component'); parent.set('data-part', part)
    ET.SubElement(root, ns+'path', {'id':'current-route','fill':'none','stroke':'none','aria-hidden':'true'})
    for _ in range(3):
        ET.SubElement(root, ns+'circle', {'class':'carrier','r':'3.7','hidden':'','aria-hidden':'true'})

    def route(points):
        coords = ax.transData.transform(points)*72/fig.dpi
        height = fig.get_figheight()*72
        return ' '.join(f'{"M" if i==0 else "L"}{x:.3f},{height-y:.3f}' for i, (x, y) in enumerate(coords))

    hump = [(1.8+.17*np.cos(t), 2.3+.17*np.sin(t)) for t in np.linspace(-np.pi/2, np.pi/2, 20)]
    paths = {
        'freewheel': route([(3.8,2.3),(3.8,5.6),(6.6,5.6),(6.6,.4),(3.8,.4),(3.8,2.3)]),
        'positive': route([(-1,3.7),(1.8,3.7),(1.8,5.6),(6.6,5.6),(6.6,.4),(3.8,.4),(3.8,2.3),(-1,2.3),(-1,3.7)]),
        'negative': route([(-1,2.3),(3.8,2.3),(3.8,5.6),(6.6,5.6),(6.6,.4),(1.8,.4),(1.8,2.13),*hump,(1.8,3.7),(-1,3.7),(-1,2.3)]),
    }
    raw = ET.tostring(root, encoding='unicode')
    for color, token in [(P.INK,'var(--demo-text)'), (P.PAPER,'var(--demo-surface)'), (P.MUTED,'var(--demo-muted)')]:
        raw = raw.replace(color, token)
    P.plt.close(fig)
    return raw, paths


def main():
    base = Path(__file__).parent
    svg, paths = bridge()
    template = (base/'semi_converter_animation.template.html').read_text()
    shared = (ROOT/'src/lib/visualizations/semi-converter-model.mjs').read_text().replace('export ', '')
    sample = re.sub(r"export \{atAngle\} from [^;]+;", '', (base/'semi_converter_model.mjs').read_text())
    model = shared+'\n'+sample.replace('export ', '')
    html = template.replace('__BRIDGE_SVG__', svg).replace('__MODEL_JS__', model).replace('__ROUTE_DATA__', json.dumps(paths))
    # As with delivered Chinese SVGs, do not depend on an installed CJK font.
    characters = ''.join(sorted(set(re.findall('[\u2e80-\u9fff\uff00-\uffef]', html))))
    with tempfile.TemporaryDirectory(prefix='fieldnotes-sample-font-') as tmp:
        probe = Path(tmp)/'font.svg'
        probe.write_text('<svg><defs></defs><text>'+characters+'</text></svg>')
        localize(probe, {characters: characters})
        css = re.search(r'<style[^>]*>(.*?)</style>', probe.read_text(), re.S).group(1)
    css += "body{font-family:'Fieldnotes Chinese',var(--font-sans,system-ui),sans-serif}"
    html = html.replace('</style>', css+'</style>', 1)
    output = ROOT/'artifacts/semi-converter-animation'
    output.mkdir(parents=True, exist_ok=True)
    (output/'sample.html').write_text(html)
    # Same self-contained page in a compact transport for inline HTML preview.
    # Preserve the host's theme stylesheet instead of document.write/open.
    payload = base64.b64encode(gzip.compress(html.encode(), mtime=0)).decode()
    inline = ('<!doctype html><html lang="zh-CN"><head><meta charset="utf-8">'
              '<meta name="viewport" content="width=device-width,initial-scale=1">'
              '<title>半控桥 · 逐步导通小样</title></head><body><script>'
              '(async()=>{const bytes=Uint8Array.from(atob("'+payload+'"),c=>c.charCodeAt(0));'
              'const html=await new Response(new Blob([bytes]).stream().pipeThrough(new DecompressionStream("gzip"))).text();'
              'const doc=new DOMParser().parseFromString(html,"text/html");'
              'const scripts=[...doc.querySelectorAll("script")].map(s=>{const t=s.textContent;s.remove();return t});'
              'document.head.append(...doc.head.querySelectorAll("style"));document.body.append(...doc.body.childNodes);'
              'for(const source of scripts)new Function(source)();})().catch(e=>{document.body.textContent="小样加载失败："+e.message});'
              '</script></body></html>')
    (output/'inline.html').write_text(inline)
    # html_preview inlines local image assets. An owned SVG metadata envelope
    # transports the exact page without duplicating large font bytes in chat.
    envelope = output/'preview-data.svg'
    envelope.write_text('<svg xmlns="http://www.w3.org/2000/svg" width="1" height="1"><metadata>'+payload+'</metadata></svg>')
    preview = ('<!doctype html><html lang="zh-CN"><head><meta charset="utf-8">'
               '<meta name="viewport" content="width=device-width,initial-scale=1">'
               '<title>半控桥 · 逐步导通小样</title></head><body>'
               '<img id="sample-data" alt="" hidden src="'+str(envelope)+'"><script>'
               '(async()=>{const image=document.getElementById("sample-data");await image.decode();'
               'const src=image.currentSrc||image.src,comma=src.indexOf(",");'
               'const xml=src.slice(0,comma).includes(";base64")?atob(src.slice(comma+1)):decodeURIComponent(src.slice(comma+1));'
               'const payload=new DOMParser().parseFromString(xml,"image/svg+xml").querySelector("metadata").textContent;'
               'const bytes=Uint8Array.from(atob(payload),c=>c.charCodeAt(0));'
               'const html=await new Response(new Blob([bytes]).stream().pipeThrough(new DecompressionStream("gzip"))).text();'
               'const doc=new DOMParser().parseFromString(html,"text/html");'
               'const scripts=[...doc.querySelectorAll("script")].map(s=>{const t=s.textContent;s.remove();return t});'
               'document.head.append(...doc.head.querySelectorAll("style"));image.remove();document.body.append(...doc.body.childNodes);'
               'for(const source of scripts)new Function(source)();})().catch(e=>{document.body.textContent="Sample load failed: "+e.message});'
               '</script></body></html>')
    (output/'preview.html').write_text(preview)
    print(output/'sample.html')


if __name__ == '__main__':
    main()
