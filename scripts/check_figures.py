"""Render and inspect the actual figure generators without changing static assets."""
import argparse
import base64
from io import BytesIO
import itertools
import json
import math
import re
from pathlib import Path
import xml.etree.ElementTree as ET

import numpy as np
from matplotlib.text import Text
from fontTools.ttLib import TTFont
import generate_figures as figures


def check_embedded_fonts():
    """Inspect the delivered SVGs, including the post-render Chinese labels."""
    count = 0
    for paper in figures.papers():
        for path in (paper['directory'] / 'assets/figures').glob('*.svg'):
            svg = path.read_text()
            text = ''.join(''.join(node.itertext()) for node in ET.fromstring(svg).iter('{http://www.w3.org/2000/svg}text'))
            characters = {ord(char) for char in text}
            chinese = {code for code in characters if 0x4e00 <= code <= 0x9fff}
            payloads = re.findall(r'data:font/woff2;base64,([A-Za-z0-9+/=]+)', svg)
            covered, size = set(), 0
            for payload in payloads:
                data = base64.b64decode(payload)
                size += len(data)
                with TTFont(BytesIO(data)) as font:
                    glyphs = set(font.getBestCmap())
                assert glyphs <= characters, (path, 'embedded unused characters', glyphs - characters)
                covered.update(glyphs)
            assert chinese <= covered, (path, 'missing embedded Chinese glyphs', chinese - covered)
            assert size <= 32 * 1024, (path, 'embedded fonts exceed 32 KiB', size)
            count += bool(payloads)
    print(f'Checked {count} SVGs with embedded fonts: all Chinese labels covered; no unused characters; each below 32 KiB.')


def review(output):
    check_embedded_fonts()
    output.mkdir(parents=True, exist_ok=True)
    results = []

    def inspect(fig, name, dark, paper):
        figures.prepare_figure(fig)
        fig.canvas.draw()
        renderer = fig.canvas.get_renderer()
        collisions, strokes = [], []
        for ax in fig.axes:
            labels = [text for text in ax.texts if text.get_text() and text.get_visible()]
            # Use Text's box: Annotation's own box also includes its leader arrow.
            boxes = [(text, Text.get_window_extent(text, renderer).padded(1)) for text in labels]
            for (a, first), (b, second) in itertools.combinations(boxes, 2):
                if first.overlaps(second):
                    collisions.append([a.get_text(), b.get_text()])
            # Regression: electrical strokes must not pass through these labels.
            guarded = {'e1-f26-q2': {'$Z_0=50$'}, 'e1-s26-q4': {'$Y_d$', '$Y_s$'}}.get(name, set())
            for label, box in boxes:
                if label.get_text() not in guarded:
                    continue
                for stroke in ax.lines:
                    path = stroke.get_path().transformed(stroke.get_transform())
                    if box.overlaps(path.get_extents()) and path.intersects_bbox(box, filled=False):
                        strokes.append([label.get_text(), 'electrical stroke'])
            geometry = getattr(ax, '_projection_geometry', None)
            if geometry:
                camera = geometry['camera']
                assert np.allclose(camera.matrix @ camera.matrix.T, np.eye(2)), (name, 'non-orthonormal camera')
                assert np.allclose(camera.matrix @ camera.view, 0), (name, 'camera direction projects into screen')
                if geometry['kind'] == 'coax':
                    for radius, point, projected in geometry['radii']:
                        assert math.isclose(np.linalg.norm(point), radius, abs_tol=1e-12), (name, 'radius endpoint off cylinder')
                        assert point[2] == 0, (name, 'radii must share the front center')
                        assert np.allclose(camera.project(point), projected), (name, 'radius uses a different projection')
                    for theta in geometry['tangencies']:
                        normal = np.array([math.cos(theta), math.sin(theta), 0])
                        assert abs(np.dot(normal, camera.view)) < 1e-12, (name, 'outline is not tangent to cylinder')
                    if 'R' in geometry:
                        start, end = geometry['normal']
                        radial = np.array([start[0], start[1], 0])
                        assert math.isclose(np.linalg.norm(radial), geometry['R'], abs_tol=1e-12), (name, 'normal starts off Gaussian surface')
                        assert abs((end-start)[2]) < 1e-12 and np.dot(radial, end-start) > 0, (name, 'normal is not radially outward')
                        assert np.linalg.norm(np.cross(radial, end-start)) < 1e-12, (name, 'normal is not radial')
                else:
                    start, end = geometry['current']
                    assert end[0] > start[0] and np.allclose((end-start)[1:], 0), (name, 'current must point along +x')
            if name.startswith('sphere-'):
                patches = {patch.get_gid(): patch for patch in ax.patches if patch.get_gid()}
                for key in ['a', 'b', 'R']:
                    boundary = patches['sphere-boundary-' + key]
                    start, end = map(np.array, patches['sphere-radius-' + key]._posA_posB)
                    assert np.allclose(start, boundary.center), (name, key, 'different centers')
                    assert math.isclose(np.linalg.norm(end-start), boundary.radius, abs_tol=1e-12), (name, key, 'radius endpoint')
                start, end = map(np.array, patches['sphere-outward-normal']._posA_posB)
                assert math.isclose(np.linalg.norm(start), patches['sphere-boundary-R'].radius, abs_tol=1e-12), (name, 'normal must start on Gaussian surface')
                assert np.dot(start, end-start) > 0, (name, 'normal must point outward')
                assert abs(start[0]*end[1]-start[1]*end[0]) < 1e-12, (name, 'normal must be radial')
                for label, box in boxes:
                    for patch in ax.patches:
                        path = patch.get_path().transformed(patch.get_transform())
                        if box.overlaps(path.get_extents()) and path.intersects_bbox(box, filled=False):
                            strokes.append([label.get_text(), patch.get_gid()])
                    for line in ax.lines:
                        path = line.get_path().transformed(line.get_transform())
                        if box.overlaps(path.get_extents()) and path.intersects_bbox(box, filled=False):
                            strokes.append([label.get_text(), 'leader'])
        key = paper['locale'] + '/' + paper['name'] + '/' + name + ('-dark' if dark else '')
        (output/paper['locale']/paper['name']).mkdir(parents=True, exist_ok=True)
        fig.savefig(output/(key+'.png'), bbox_inches='tight', pad_inches=.16, dpi=140)
        results.append({'name': key, 'textCollisions': collisions, 'strokeCollisions': strokes})
        figures.plt.close(fig)

    for dark in [False, True]:
        figures.render_figures(inspect, dark)
    (output/'report.json').write_text(json.dumps(results, ensure_ascii=False, indent=2)+'\n')
    failures = [item for item in results if item['textCollisions'] or item['strokeCollisions']]
    for item in failures:
        print(json.dumps(item, ensure_ascii=False))
    assert not failures, f'{len(failures)} figure/theme pairs have overlapping annotations'
    print(f'Checked {len(results)} figure/theme pairs: no text overlaps; applicable geometric constraints verified.')


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--output', type=Path, default=figures.ROOT/'artifacts/figure-review')
    review(parser.parse_args().output)
