"""Offline Schemdraw sprite for the Q4(a) semi-converter teaching animation.

Promoted from the approved bridge prototype, not imported from scripts/samples.
The explicit AC source is a teaching aid across the printed input terminals;
this auxiliary asset must never replace the original question diagram. S1/S2
stay on the left, D1/D2 on the right, and the lower input crosses without a dot.
The browser owns state/physics; this module supplies only static native artists
and current-route coordinates in the exported SVG's coordinate system.
"""
from collections import defaultdict
from io import StringIO
import json
from pathlib import Path
import re
import xml.etree.ElementTree as ET

import numpy as np
from matplotlib.patches import Arc

import circuit_drawing as C
import plotting as P

SVG_NS = 'http://www.w3.org/2000/svg'
SVG = '{' + SVG_NS + '}'
NAME = 'p2-f26-q4-conduction'
# Screen-pixel width: article scaling must not reduce wires to hairlines.
STROKE_WIDTH = 1.8
KEYS = frozenset(('load', 'source', 'S1', 'S2', 'D1', 'D2', 'top-left', 'bottom-left'))


def bridge(dark=False):
    """Return the native figure and its ordered fragment ownership map.

    Flush each Schemdraw piece separately so every artist (including source
    circles, filled nodes, gates and arrows) has an independently addressable
    group. Labels are separate fragments: host <use> elements can give them a
    readable foreground even when their device strokes are inactive.
    """
    P.setup(dark)
    fig, ax = P.plt.subplots(figsize=(8, 5.4))
    fig.subplots_adjust(left=.02, right=.98, bottom=.02, top=.98)
    P.canvas(ax, (-2.1, 8.2), (-.3, 6.4))
    P.equal_units(ax)
    counters = defaultdict(int)
    parts = {}
    symbols = []

    def piece(key, draw, label=False):
        before = set(ax.lines) | set(ax.patches) | set(ax.texts)
        draw()
        if hasattr(ax, '_fieldnotes_circuit'):
            C.circuit(ax).finish()
            symbols.extend(ax._schemdraw_elements)
            del ax._fieldnotes_circuit
        for artist in [*ax.lines, *ax.patches, *ax.texts]:
            if artist not in before:
                kind = 'label' if label else 'stroke'
                identity = f'{NAME}-{key}-{kind}-{counters[key]}'
                artist.set_gid(identity)
                parts[identity] = {'id': identity, 'key': key, 'label': label}
                counters[key] += 1

    def wires(key, *polylines):
        def draw():
            for points in polylines:
                for a, b in zip(points, points[1:]):
                    C.wire(ax, a, b)
        piece(key, draw)

    def label(key, x, y, text):
        piece(key, lambda: P.label(ax, x, y, text, ha='center', va='center', fontsize=14.5), label=True)

    for x, top, bottom in [(1.8, 'S1', 'S2'), (3.8, 'D1', 'D2')]:
        for key, lo, hi in [(top, 4.2, 5.2), (bottom, .9, 1.9)]:
            piece(key, lambda x=x, lo=lo, hi=hi, key=key:
                  C.diode(ax, (x, lo), (x, hi), scr=key.startswith('S'), gate_left=key.startswith('S')))
            label(key, x+.55, (lo+hi)/2, f'${key[0]}_{key[1]}$')
    wires('S1', [(1.8, 3.7), (1.8, 4.2)], [(1.8, 5.2), (1.8, 5.6)])
    wires('S2', [(1.8, .4), (1.8, .9)], [(1.8, 1.9), (1.8, 2.13)], [(1.8, 2.47), (1.8, 3.7)])
    piece('S2', lambda: ax.add_patch(Arc((1.8, 2.3), .34, .34, theta1=-90, theta2=90, color=P.INK, lw=1.6)))
    wires('D1', [(3.8, 2.3), (3.8, 4.2)], [(3.8, 5.2), (3.8, 5.6)])
    wires('D2', [(3.8, .4), (3.8, .9)], [(3.8, 1.9), (3.8, 2.3)])
    wires('top-left', [(1.8, 5.6), (3.8, 5.6)])
    wires('bottom-left', [(1.8, .4), (3.8, .4)])
    wires('load', [(3.8, 5.6), (6.6, 5.6), (6.6, 5.1)], [(6.6, 4.0), (6.6, 3.4)],
          [(6.6, 1.8), (6.6, .4), (3.8, .4)])
    piece('load', lambda: C.resistor(ax, (6.6, 5.1), (6.6, 4.0)))
    piece('load', lambda: C.inductor(ax, (6.6, 3.4), (6.6, 1.8)))
    label('load', 7.25, 4.55, '$R$')
    label('load', 7.25, 2.6, '$L$')
    label('load', 5.7, 4.9, '$+$')
    label('load', 5.7, 1.0, '$-$')
    label('load', 5.7, 2.95, '$v_0$')
    piece('load', lambda: C.wire(ax, (4.6, 5.6), (5.3, 5.6), arrow='->'))
    label('load', 4.95, 6.02, '$i_0$')
    wires('source', [(-1, 3.7), (1.8, 3.7)], [(-1, 2.3), (3.8, 2.3)])
    piece('source', lambda: C.source(ax, (-1, 2.3), (-1, 3.7), kind='ac', radius=.7))
    piece('source', lambda: C.wire(ax, (-.45, 3.7), (.3, 3.7), arrow='->'))
    label('source', -.05, 4.1, '$i$')
    label('source', -1.82, 3.85, '$+$')
    label('source', -1.82, 2.15, '$-$')
    label('source', -1.85, 3, '$v$')
    for point, key in [((1.8, 3.7), 'source'), ((3.8, 2.3), 'load'),
                       ((3.8, 5.6), 'load'), ((3.8, .4), 'load')]:
        piece(key, lambda point=point: C.terminal(ax, point, radius=.045, open=False))
    # Retain the aggregate for offline geometry/engine inspection despite the
    # per-piece Schemdraw flushing above.
    ax._schemdraw_elements = symbols
    P.prepare_figure(fig)
    fig.canvas.draw()
    return fig, parts


def route_points():
    """Conventional current loops in the approved drawing's data coordinates.

    Load current is downward in all three states. Positive: S1/D2; negative:
    S2/D1 (the source is traversed in reverse); freewheel: D1/D2 only. Include
    the S2 wire jump instead of sending a carrier straight through the crossing.
    These are carrier centrelines, not replacement resistor/inductor symbols.
    """
    hump = [(1.8+.17*np.cos(t), 2.3+.17*np.sin(t))
            for t in np.linspace(-np.pi/2, np.pi/2, 21)]
    return {
        'freewheel': [(3.8, 2.3), (3.8, 5.6), (6.6, 5.6), (6.6, .4), (3.8, .4), (3.8, 2.3)],
        'positive': [(-1, 3.7), (1.8, 3.7), (1.8, 5.6), (6.6, 5.6), (6.6, .4),
                     (3.8, .4), (3.8, 2.3), (-1, 2.3), (-1, 3.7)],
        'negative': [(-1, 2.3), (3.8, 2.3), (3.8, 5.6), (6.6, 5.6), (6.6, .4),
                     (1.8, .4), (1.8, 2.13), *hump[1:], (1.8, 3.7), (-1, 3.7), (-1, 2.3)],
    }


def svg_coordinates(fig, points):
    """Map through the same finalized transform and 72 pt/in as savefig SVG."""
    coords = fig.axes[0].transData.transform(points)*72/fig.dpi
    coords[:, 1] = fig.get_figheight()*72-coords[:, 1]
    return np.round(coords, 6).tolist()


def sprite(dark=False):
    """Return a standalone external-<use> SVG and version-1 geometry contract.

    Keep native artist geometry unchanged; adjust presentation colors, clipping
    and non-scaling stroke widths for readable compact article rendering. Put every fragment directly below the SVG root so a
    fragment reference needs no ancestor transform, stylesheet or sibling defs.
    The two themes intentionally share IDs and geometry; all paint is inherited.
    """
    fig, ownership = bridge(dark)
    try:
        buffer = StringIO()
        fig.savefig(buffer, format='svg', bbox_inches=None,
                    metadata={'Date': None, 'Creator': 'Schemdraw · ECSE 2110 conduction sprite'})
        native = ET.fromstring(buffer.getvalue())
        view_box = [float(value) for value in native.get('viewBox').split()]
        ET.register_namespace('', SVG_NS)
        root = ET.Element(SVG+'svg', {'viewBox': native.get('viewBox'), 'version': '1.1'})
        parts = []
        for group in native.iter(SVG+'g'):
            identity = group.get('id')
            if identity not in ownership:
                continue
            for node in group.iter():
                # All artists lie inside the canvas; eliminating clip references
                # makes an individual fragment entirely self-contained.
                node.attrib.pop('clip-path', None)
                for attr, value in list(node.attrib.items()):
                    paint = value.replace(P.INK, 'currentColor').replace(P.PAPER, 'var(--card)')
                    # Schemdraw also emits a background-colored degenerate
                    # source patch. Only fills may use the card surface token.
                    node.set(attr, paint.replace('stroke: var(--card)', 'stroke: currentColor'))
            if not ownership[identity]['label']:
                for node in group.iter(SVG+'path'):
                    style = node.get('style', '')
                    if 'stroke: currentColor' in style:
                        style = re.sub(r';?\s*stroke-width:[^;]+', '', style)
                        node.set('style', style+f'; stroke-width: {STROKE_WIDTH}')
                        node.set('vector-effect', 'non-scaling-stroke')
            group.set('data-part', ownership[identity]['key'])
            root.append(group)
            parts.append(ownership[identity])
        if len(parts) != len(ownership):
            raise ValueError('A native circuit artist was lost during SVG export')
        # Matplotlib relies on its global stylesheet for these defaults. Scope
        # them to each fragment instead: <use> must not need root inheritance.
        for group in root:
            group.set('fill', 'currentColor')
            group.set('stroke-linejoin', 'round')
            group.set('stroke-linecap', 'butt')
        contract = {'version': 1, 'viewBox': view_box, 'parts': parts,
                    'routes': {key: svg_coordinates(fig, points) for key, points in route_points().items()}}
        return ET.tostring(root, encoding='unicode')+'\n', contract
    finally:
        P.plt.close(fig)


def generate(output):
    """Write an owned light/dark sprite pair and one shared-coordinate sidecar.

    Called only by a paper-local auxiliary-asset hook during offline generation.
    No PDFs, source crops, website builds or authored content are touched here.
    """
    output = Path(output)
    output.mkdir(parents=True, exist_ok=True)
    names = []
    geometry = None
    for dark in (False, True):
        svg, contract = sprite(dark)
        if geometry is not None and geometry != contract:
            raise ValueError('Light/dark sprite geometry must be identical')
        geometry = contract
        name = f'{NAME}{"-dark" if dark else ""}.svg'
        (output/name).write_text(svg)
        names.append(name)
    name = NAME+'.json'
    (output/name).write_text(json.dumps(geometry, indent=2, allow_nan=False)+'\n')
    return [*names, name]
