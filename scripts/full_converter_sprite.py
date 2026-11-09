"""Offline, solution-only native Schemdraw full-converter teaching assets.

Lecture 11–12 PDF p23 establishes left S1/S4 and right S3/S2. Q3 has no
printed diagram: circuit_figure() is a solution fallback, never a prompt image.
Q5 omits resistance/field; Q6 retains its separately excited field topology.
The fragment-export utility is copied from semi_converter_sprite (which remains
unchanged), so each external <use> is inert, self-contained and theme-inherited.
JSON contains geometry only: physics and translated UI copy live elsewhere.
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
STROKE_WIDTH = 1.8
STROKE_PROPERTY = '--conduction-stroke-width'
QUESTIONS = (3, 5, 6)
KEYS = frozenset(('load', 'source', 'S1', 'S2', 'S3', 'S4', 'top-left', 'bottom-left', 'field'))
# Common coordinates for all profiles: probes/routes never depend on text size.
LEFT, RIGHT, LOAD, SOURCE = 1.8, 3.8, 6.6, -1.
TOP, BOTTOM, AC_TOP, AC_BOTTOM, JUMP = 6.4, .4, 4.2, 2.6, .17


def name_for(question):
    if question not in QUESTIONS:
        raise ValueError(f'Unsupported full-converter question: {question}')
    return f'p2-f26-q{question}-conduction'


def bridge(question=3, dark=False):
    """Return a native figure and ordered per-artist fragment ownership map.

    Flush each Schemdraw piece to keep labels independent of strokes, including
    all circles, gates, nodes and arrows. No invisible browser-drawn circuit is
    substituted for native symbols. Emf polarity is a fixed reference (+ upper)
    even in Q3, where the signed emf is negative.
    """
    name = name_for(question)
    P.setup(dark)
    fig, ax = P.plt.subplots(figsize=(10.2 if question == 6 else 8, 5.6))
    fig.subplots_adjust(left=.02, right=.98, bottom=.02, top=.98)
    P.canvas(ax, (-2.55, 11.05 if question == 6 else 8.3), (-.25, 7.15))
    P.equal_units(ax)
    counters, parts, symbols = defaultdict(int), {}, []

    def piece(key, draw, label=False, detail=False):
        before = set(ax.lines) | set(ax.patches) | set(ax.texts)
        draw()
        if hasattr(ax, '_fieldnotes_circuit'):
            C.circuit(ax).finish()
            symbols.extend(ax._schemdraw_elements)
            del ax._fieldnotes_circuit
        for artist in [*ax.lines, *ax.patches, *ax.texts]:
            if artist not in before:
                kind = 'label' if label else 'detail' if detail else 'stroke'
                identity = f'{name}-{key}-{kind}-{counters[key]}'
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
        # The Q6 field branch widens its canvas: compensate in native type size,
        # not by shrinking the entire interaction or altering component geometry.
        piece(key, lambda: P.label(ax, x, y, text, ha='center', va='center',
              fontsize=24 if question == 6 else 20), label=True)

    # Every SCR conducts upwards. Actual diagonal label order, not Q4's order.
    for x, top, bottom in [(LEFT, 'S1', 'S4'), (RIGHT, 'S3', 'S2')]:
        for key, lo, hi in [(top, 5.0, 6.0), (bottom, 1.0, 2.0)]:
            piece(key, lambda x=x, lo=lo, hi=hi:
                  C.diode(ax, (x, lo), (x, hi), scr=True, gate_left=True))
            label(key, x+.55, (lo+hi)/2, f'$S_{key[1]}$')
    wires('S1', [(LEFT, AC_TOP), (LEFT, 5.0)], [(LEFT, 6.0), (LEFT, TOP)])
    wires('S4', [(LEFT, BOTTOM), (LEFT, 1.0)], [(LEFT, 2.0), (LEFT, AC_BOTTOM-JUMP)],
          [(LEFT, AC_BOTTOM+JUMP), (LEFT, AC_TOP)])
    piece('S4', lambda: ax.add_patch(Arc((LEFT, AC_BOTTOM), 2*JUMP, 2*JUMP,
          theta1=-90, theta2=90, color=P.INK, lw=1.6)))
    wires('S3', [(RIGHT, AC_BOTTOM), (RIGHT, 5.0)], [(RIGHT, 6.0), (RIGHT, TOP)])
    wires('S2', [(RIGHT, BOTTOM), (RIGHT, 1.0)], [(RIGHT, 2.0), (RIGHT, AC_BOTTOM)])
    wires('top-left', [(LEFT, TOP), (RIGHT, TOP)])
    wires('bottom-left', [(LEFT, BOTTOM), (RIGHT, BOTTOM)])
    wires('load', [(RIGHT, TOP), (LOAD, TOP), (LOAD, 6.0)],
          [(LOAD, 1.25), (LOAD, BOTTOM), (RIGHT, BOTTOM)])
    # Preserve the printed Q6 L,R,Ea series topology. Q3 uses the same armature
    # without an invented field circuit; Q5 uses only its ideal L,Ea armature.
    piece('load', lambda: C.inductor(ax, (LOAD, 6.0), (LOAD, 4.65)), detail=True)
    label('load', 7.35, 5.3, '$L$' if question == 5 else '$L_a$')
    if question != 5:
        wires('load', [(LOAD, 4.65), (LOAD, 4.2)], [(LOAD, 3.2), (LOAD, 2.35)])
        piece('load', lambda: C.resistor(ax, (LOAD, 4.2), (LOAD, 3.2)))
        label('load', 7.35, 3.7, '$R_a$')
    else:
        wires('load', [(LOAD, 4.65), (LOAD, 2.35)])
    piece('load', lambda: C.source(ax, (LOAD, 1.25), (LOAD, 2.35), kind='empty', radius=.55))
    label('load', LOAD, 1.8, '$E_a$')
    label('load', 7.35, 2.35, '$+$'); label('load', 7.35, 1.25, '$-$')
    label('load', 5.65, 5.7, '$+$'); label('load', 5.65, 1.0, '$-$')
    label('load', 5.65, 3.4, '$v_0$')
    piece('load', lambda: C.wire(ax, (4.6, TOP), (5.3, TOP), arrow='->'))
    label('load', 4.95, 6.84, '$i_0$')
    wires('source', [(SOURCE, AC_TOP), (LEFT, AC_TOP)], [(SOURCE, AC_BOTTOM), (RIGHT, AC_BOTTOM)])
    piece('source', lambda: C.source(ax, (SOURCE, AC_BOTTOM), (SOURCE, AC_TOP), kind='ac', radius=.8))
    piece('source', lambda: C.wire(ax, (-.45, AC_TOP), (.3, AC_TOP), arrow='->'))
    label('source', -.05, 4.62, '$i$')
    label('source', -1.85, 4.35, '$+$'); label('source', -1.85, 2.45, '$-$')
    label('source', -2.15, 3.4, '$v$')
    for point, key in [((LEFT, AC_TOP), 'source'), ((RIGHT, AC_BOTTOM), 'source'),
                       ((RIGHT, TOP), 'load'), ((RIGHT, BOTTOM), 'load')]:
        piece(key, lambda point=point: C.terminal(ax, point, radius=.045, open=False))
    if question == 6:
        # Open field supply terminals, horizontal winding, upward i_f reference
        # as printed. Deliberately disconnected from the bridge/load route.
        wires('field', [(8.55, .65), (8.55, 1.8), (8.95, 1.8)],
              [(10.15, 1.8), (10.55, 1.8), (10.55, .65)])
        piece('field', lambda: C.inductor(ax, (8.95, 1.8), (10.15, 1.8)), detail=True)
        for x in (8.55, 10.55):
            piece('field', lambda x=x: C.terminal(ax, (x, .65), radius=.055))
        piece('field', lambda: C.wire(ax, (8.55, .85), (8.55, 1.4), arrow='->'))
        label('field', 9.1, 1.0, '$i_f$')
    ax._schemdraw_elements = symbols
    P.prepare_figure(fig)
    fig.canvas.draw()
    return fig, parts


def circuit_figure(dark=False):
    """Q3 canonical static solution fallback only; never a question diagram.

    Retain the canonical inventory's native Schemdraw artist-ID convention;
    external-use fragment IDs belong only to the auxiliary sprite exports.
    """
    fig, ownership = bridge(3, dark)
    for ax in fig.axes:
        for artist in [*ax.lines, *ax.patches]:
            identity = artist.get_gid()
            if identity in ownership and not isinstance(artist, Arc):
                artist.set_gid('schemdraw-'+identity)
    return fig


def route_points():
    """Closed conventional-current centrelines, not replacement load symbols.

    Positive: S1/load/S2/source; negative: S3/load/S4/source. Include the
    non-junction crossing's actual circular wire jump in the negative route.
    The field is not electrically connected to either current path.
    """
    hump = [(LEFT+JUMP*np.cos(t), AC_BOTTOM+JUMP*np.sin(t))
            for t in np.linspace(-np.pi/2, np.pi/2, 21)]
    return {
        'positive': [(SOURCE, AC_TOP), (LEFT, AC_TOP), (LEFT, TOP), (LOAD, TOP),
                     (LOAD, BOTTOM), (RIGHT, BOTTOM), (RIGHT, AC_BOTTOM),
                     (SOURCE, AC_BOTTOM), (SOURCE, AC_TOP)],
        'negative': [(SOURCE, AC_BOTTOM), (RIGHT, AC_BOTTOM), (RIGHT, TOP), (LOAD, TOP),
                     (LOAD, BOTTOM), (LEFT, BOTTOM), (LEFT, AC_BOTTOM-JUMP), *hump[1:],
                     (LEFT, AC_TOP), (SOURCE, AC_TOP), (SOURCE, AC_BOTTOM)],
    }


def probe_points():
    """Geometry-only measurement annotations; arrows are FIXED references.

    Voltage pins/ends are ordered + then - (upper first). All four device
    currents are positive upwards through their own SCR, even on the negative
    source half-cycle. Source i is referenced rightwards; load i0 rightwards on
    the upper bus. Pins are annotation anchors, not added connections/nodes.
    """
    return [
        {'key': 'v', 'kind': 'voltage', 'pins': [(SOURCE, AC_TOP), (SOURCE, AC_BOTTOM)],
         'ends': [(-.08, AC_TOP), (-.08, AC_BOTTOM)]},
        {'key': 'i', 'kind': 'current', 'point': (.65, AC_TOP), 'arrow': [(.15, 3.9), (1.05, 3.9)]},
        {'key': 'v0', 'kind': 'voltage', 'pins': [(LOAD, TOP), (LOAD, BOTTOM)],
         'ends': [(7.95, TOP), (7.95, BOTTOM)]},
        {'key': 'i0', 'kind': 'current', 'point': (5.55, TOP), 'arrow': [(5.1, 6.1), (6.05, 6.1)]},
        {'key': 'is1', 'kind': 'current', 'point': (LEFT, 6.2), 'arrow': [(1.25, 5.05), (1.25, 5.95)]},
        {'key': 'is2', 'kind': 'current', 'point': (RIGHT, .7), 'arrow': [(4.35, 1.05), (4.35, 1.95)]},
        {'key': 'is3', 'kind': 'current', 'point': (RIGHT, 6.2), 'arrow': [(4.35, 5.05), (4.35, 5.95)]},
        {'key': 'is4', 'kind': 'current', 'point': (LEFT, .7), 'arrow': [(1.25, 1.05), (1.25, 1.95)]},
    ]


def svg_coordinates(fig, points):
    """Use the finalized native transform, SVG 72 pt/in and reversed y axis."""
    coords = fig.axes[0].transData.transform(points)*72/fig.dpi
    coords[:, 1] = fig.get_figheight()*72-coords[:, 1]
    return np.round(coords, 6).tolist()


def sprite(question=3, dark=False):
    """Native external-<use> fragments and the version-2 geometry contract.

    Export logic deliberately copied from the approved semi exporter: no ancestor
    transform, defs, stylesheet, clips, scripts, URLs, images or runtime library.
    Native labels remain separate foreground fragments; only strokes receive
    the screen-pixel non-scaling width custom property.
    """
    fig, ownership = bridge(question, dark)
    try:
        buffer = StringIO()
        fig.savefig(buffer, format='svg', bbox_inches=None,
                    metadata={'Date': None, 'Creator': 'Schemdraw · ECSE 2110 full-converter sprite'})
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
                node.attrib.pop('clip-path', None)
                for attr, value in list(node.attrib.items()):
                    paint = value.replace(P.INK, 'currentColor').replace(P.PAPER, 'var(--card)')
                    node.set(attr, paint.replace('stroke: var(--card)', 'stroke: currentColor'))
            if not ownership[identity]['label']:
                for node in group.iter(SVG+'path'):
                    style = node.get('style', '')
                    if 'stroke: currentColor' in style:
                        style = re.sub(r';?\s*stroke-width:[^;]+', '', style)
                        # Keep winding interiors open on phones; contrast still follows
                        # the conducting branch, but fine coils do not become solid bars.
                        width = str(STROKE_WIDTH) if '-detail-' in identity else f'var({STROKE_PROPERTY}, {STROKE_WIDTH})'
                        node.set('style', style+f'; stroke-width: {width}')
                        node.set('vector-effect', 'non-scaling-stroke')
            group.set('data-part', ownership[identity]['key'])
            root.append(group)
            parts.append(ownership[identity])
        if len(parts) != len(ownership):
            raise ValueError('A native circuit artist was lost during SVG export')
        for group in root:
            group.set('fill', 'currentColor')
            group.set('stroke-linejoin', 'round')
            group.set('stroke-linecap', 'butt')
        probes = []
        for probe in probe_points():
            geometry = {key: svg_coordinates(fig, [value])[0] if key == 'point' else svg_coordinates(fig, value)
                        for key, value in probe.items() if key not in ('key', 'kind')}
            probes.append({'key': probe['key'], 'kind': probe['kind'], **geometry})
        contract = {'version': 2, 'topology': 'full-converter', 'viewBox': view_box, 'parts': parts,
                    'routes': {key: svg_coordinates(fig, points) for key, points in route_points().items()},
                    'probes': probes}
        return ET.tostring(root, encoding='unicode')+'\n', contract
    finally:
        P.plt.close(fig)


def generate(output):
    """Write independent owned Q3/Q5/Q6 SVG pairs and matching sidecars."""
    output = Path(output)
    output.mkdir(parents=True, exist_ok=True)
    names = []
    for question in QUESTIONS:
        geometry = None
        for dark in (False, True):
            svg, contract = sprite(question, dark)
            if geometry is not None and geometry != contract:
                raise ValueError('Light/dark sprite geometry must be identical')
            geometry = contract
            name = f'{name_for(question)}{"-dark" if dark else ""}.svg'
            (output/name).write_text(svg)
            names.append(name)
        name = name_for(question)+'.json'
        (output/name).write_text(json.dumps(geometry, indent=2, allow_nan=False)+'\n')
        names.append(name)
    return names


def generate_ripple(output, representative_ripple):
    """Export EXACTLY the paper's existing authoritative current() samples.

    No new forcing, sine surrogate, rescaling or physics solver. Each locale
    calls its own representative_ripple(). The fitted L is illustrative only;
    the original static waveform uses the same samples and is not regenerated.
    """
    values, inductance = representative_ripple()
    values = np.asarray(values, dtype=float)
    if (values.shape != (8192,) or not np.isfinite(values).all() or not (values > 0).all()
            or np.max(values) > 80 or not np.isfinite(inductance) or not 1e-5 <= inductance <= 10
            or abs(np.mean(values)-20) > 1e-9 or abs(np.std(values)-4) > 1e-9):
        raise ValueError('Invalid authoritative representative ripple')
    output = Path(output)
    output.mkdir(parents=True, exist_ok=True)
    name = 'p2-f26-q6-ripple.json'
    data = {'version': 1, 'kind': 'representative-current', 'period': 360, 'mean': 20,
            'rippleRms': 4, 'inductance': float(inductance), 'values': values.tolist()}
    (output/name).write_text(json.dumps(data, indent=2, allow_nan=False)+'\n')
    return [name]
