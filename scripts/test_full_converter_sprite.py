"""Focused full-converter assets/geometry tests; no PDFs, servers or redraws.

python3 -m unittest discover -s scripts -p 'test_full_converter_sprite.py'
These regressions do not replace scientific/source/translation human review.
"""
import hashlib
import itertools
import json
import math
from pathlib import Path
import re
import tempfile
import unittest
import xml.etree.ElementTree as ET

import numpy as np
from matplotlib.patches import Arc, Circle, Polygon
from matplotlib.text import Text

from check_figures import circle_geometry
import full_converter_sprite as S
import generate_figures as G
import plotting as P
import semi_converter_sprite as SEMI

ROOT = Path(__file__).resolve().parents[1]


class FullConverterSpriteTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.exports = {(q, dark): S.sprite(q, dark) for q in S.QUESTIONS for dark in (False, True)}
        cls.papers = [p for p in G.papers() if p['name'] == 'practice2_f26']

    def tearDown(self):
        P.plt.close('all')

    def test_v2_geometry_contract_and_inert_self_contained_fragments(self):
        for q in S.QUESTIONS:
            light, data = self.exports[q, False]
            self.assertEqual(self.exports[q, False], self.exports[q, True])
            self.assertEqual(set(data), {'version', 'topology', 'viewBox', 'parts', 'routes', 'probes'})
            self.assertEqual((data['version'], data['topology']), (2, 'full-converter'))
            root = ET.fromstring(light)
            self.assertEqual(root.tag, S.SVG+'svg')
            self.assertEqual(data['viewBox'], [float(v) for v in root.get('viewBox').split()])
            self.assertEqual(data['viewBox'][:2], [0, 0])
            self.assertTrue(all(math.isfinite(v) and v > 0 for v in data['viewBox'][2:]))
            ids = [node.get('id') for node in root.iter() if node.get('id')]
            self.assertEqual(len(ids), len(set(ids)))
            fragments = {node.get('id'): node for node in root}
            self.assertEqual(list(fragments), [part['id'] for part in data['parts']])
            expected_keys = S.KEYS if q == 6 else S.KEYS-{'field'}
            self.assertEqual({part['key'] for part in data['parts']}, expected_keys)
            self.assertLess(len(data['parts']), 256)
            for part in data['parts']:
                self.assertEqual(set(part), {'id', 'key', 'label'})
                self.assertIs(type(part['label']), bool)
                group = fragments[part['id']]
                self.assertEqual(group.tag, S.SVG+'g')
                self.assertEqual(group.get('data-part'), part['key'])
                self.assertIsNone(group.get('transform'))
                self.assertEqual(bool(list(group.iter(S.SVG+'text'))), part['label'])
                self.assertRegex(part['id'], r'^[a-zA-Z][a-zA-Z0-9_-]*$')
                self.assertTrue(part['id'].startswith(S.name_for(q)))
            allowed = {S.SVG+tag for tag in ('svg', 'g', 'path', 'text', 'tspan')}
            for node in root.iter():
                self.assertIn(node.tag, allowed)
                for attr, value in node.attrib.items():
                    self.assertFalse(attr.lower().startswith('on'))
                    self.assertNotIn('href', attr.lower())
                    self.assertNotIn('url(', value.lower())
                    self.assertNotIn('clip-path', attr)
                    self.assertFalse(re.search(r'#[0-9a-fA-F]{3,8}\b', value))
                    paint = dict(re.findall(r'(fill|stroke|color)\s*:\s*([^;]+)', value)) if attr == 'style' else {}
                    if attr in ('fill', 'stroke', 'color'):
                        paint[attr] = value
                    for prop, color in paint.items():
                        self.assertIn(color.strip(), ('none', 'currentColor', 'var(--card)'))
                        if prop in ('stroke', 'color'):
                            self.assertNotEqual(color.strip(), 'var(--card)')
            self.assertIn('var(--card)', light)

    def test_screen_width_native_strokes_and_separate_labels(self):
        for svg, _ in self.exports.values():
            root = ET.fromstring(svg)
            paths = [node for node in root.iter(S.SVG+'path') if 'stroke: currentColor' in node.get('style', '')]
            self.assertGreater(len(paths), 35)
            for group in root:
                for node in group.iter(S.SVG+'path'):
                    if 'stroke: currentColor' not in node.get('style',''):
                        continue
                    self.assertEqual(node.get('vector-effect'), 'non-scaling-stroke')
                    expected = '1.8' if '-detail-' in group.get('id','') else 'var(--conduction-stroke-width, 1.8)'
                    self.assertEqual(re.findall(r'stroke-width:\s*([^;]+)', node.get('style')), [expected])
            self.assertTrue(any('-detail-' in group.get('id','') for group in root))
            font_sizes = [float(v) for v in re.findall(r'font-size:\s*([\d.]+)px',svg)]
            self.assertGreaterEqual(max(font_sizes),26)
            for node in root.iter(S.SVG+'text'):
                self.assertIsNone(node.get('vector-effect'))

    def test_native_devices_order_load_variants_and_isolated_field(self):
        for q in S.QUESTIONS:
            fig, ownership = S.bridge(q)
            ax = fig.axes[0]
            artists = [*ax.lines, *ax.patches, *ax.texts]
            self.assertEqual({a.get_gid() for a in artists}, set(ownership))
            self.assertEqual(len(artists), len(ownership))
            symbols = ax._schemdraw_elements
            self.assertEqual(symbols.count('SCR'), 4)
            self.assertNotIn('Diode', symbols)
            self.assertEqual(symbols.count('SourceSin'), 1)
            self.assertEqual(symbols.count('Source'), 1)
            self.assertEqual(symbols.count('ResistorIEEE'), int(q != 5))
            self.assertEqual(symbols.count('Inductor2'), 2 if q == 6 else 1)
            for key, x, y in [('S1', S.LEFT, 5.5), ('S4', S.LEFT, 1.5), ('S3', S.RIGHT, 5.5), ('S2', S.RIGHT, 1.5)]:
                label = next(t for t in ax.texts if ownership[t.get_gid()]['key'] == key)
                self.assertEqual(label.get_text(), f'$S_{key[1]}$')
                self.assertEqual(label.get_position(), (x+.55, y))
            circles = circle_geometry(fig)
            self.assertEqual(len(circles), 8 if q == 6 else 6)
            self.assertTrue(all(c['round'] for c in circles))
            # No junction at the lower AC lead / left bridge-leg crossover.
            centers = [tuple(p.center) for p in ax.patches if isinstance(p, Circle)]
            self.assertNotIn((S.LEFT, S.AC_BOTTOM), centers)
            jump = next(p for p in ax.patches if isinstance(p, Arc))
            self.assertEqual(ownership[jump.get_gid()]['key'], 'S4')
            self.assertEqual(tuple(jump.center), (S.LEFT, S.AC_BOTTOM))
            self.assertEqual(jump.width, jump.height)
            self.assertEqual(jump.width, 2*S.JUMP)
            self.assertEqual((jump.theta1, jump.theta2), (-90, 90))
            field = [a for a in artists if ownership[a.get_gid()]['key'] == 'field']
            self.assertEqual(bool(field), q == 6)
            if q == 6:
                field_lines = [line for line in ax.lines if ownership[line.get_gid()]['key'] == 'field']
                self.assertTrue(all(np.min(line.get_xdata()) >= 8.5 for line in field_lines))

    def test_routes_are_exact_native_export_coordinates_closed_and_ordered(self):
        raw = S.route_points()
        self.assertEqual(set(raw), {'positive', 'negative'})
        for q in S.QUESTIONS:
            fig, _ = S.bridge(q)
            contract = self.exports[q, False][1]
            for route, points in raw.items():
                xy = np.asarray(contract['routes'][route])
                self.assertEqual(xy.shape, (len(points), 2))
                np.testing.assert_equal(xy[0], xy[-1])
                self.assertTrue((np.linalg.norm(np.diff(xy, axis=0), axis=1) > 0).all())
                self.assertTrue(np.isfinite(xy).all())
                self.assertTrue((xy >= 0).all())
                self.assertTrue((xy <= contract['viewBox'][2:]).all())
                # Independent calculation, not a second call to exporter helper.
                expected = fig.axes[0].transData.transform(points)*72/fig.dpi
                expected[:, 1] = contract['viewBox'][3]-expected[:, 1]
                np.testing.assert_allclose(xy, expected, atol=1e-6)
                at = points.index((S.LOAD, S.TOP))
                self.assertEqual(points[at+1], (S.LOAD, S.BOTTOM))
                self.assertTrue(all(x < 8 for x, _ in points))  # never field current
        self.assertIn((S.LEFT, S.TOP), raw['positive'])
        self.assertIn((S.RIGHT, S.BOTTOM), raw['positive'])
        self.assertNotIn((S.LEFT, S.BOTTOM), raw['positive'])
        self.assertIn((S.RIGHT, S.TOP), raw['negative'])
        self.assertIn((S.LEFT, S.BOTTOM), raw['negative'])
        self.assertNotIn((S.LEFT, S.TOP), raw['negative'])
        hump = np.asarray(raw['negative'][6:27])
        np.testing.assert_allclose(np.linalg.norm(hump-[S.LEFT, S.AC_BOTTOM], axis=1), S.JUMP, atol=1e-12)
        np.testing.assert_allclose(hump[[0, -1]], [(S.LEFT, S.AC_BOTTOM-S.JUMP), (S.LEFT, S.AC_BOTTOM+S.JUMP)])
        self.assertNotIn((S.LEFT, S.AC_BOTTOM), raw['negative'])
        # Up through the selected pair; load downward; source reverses.
        self.assertEqual(raw['positive'][-2:], [(S.SOURCE, S.AC_BOTTOM), (S.SOURCE, S.AC_TOP)])
        self.assertEqual(raw['negative'][-2:], [(S.SOURCE, S.AC_TOP), (S.SOURCE, S.AC_BOTTOM)])

    def test_eight_probes_fixed_upper_positive_voltages_and_upward_scr_currents(self):
        for q in S.QUESTIONS:
            fig, _ = S.bridge(q)
            data = self.exports[q, False][1]
            probes = data['probes']
            self.assertEqual([p['key'] for p in probes], ['v', 'i', 'v0', 'i0', 'is1', 'is2', 'is3', 'is4'])
            for probe, raw in zip(probes, S.probe_points()):
                expected_keys = {'key', 'kind', 'pins', 'ends'} if probe['kind'] == 'voltage' else {'key', 'kind', 'point', 'arrow'}
                self.assertEqual(set(probe), expected_keys)
                for key, value in probe.items():
                    if key in ('key', 'kind'):
                        continue
                    points = [value] if key == 'point' else value
                    xy = np.asarray(points)
                    self.assertTrue(np.isfinite(xy).all())
                    self.assertTrue((xy >= 0).all())
                    self.assertTrue((xy <= data['viewBox'][2:]).all())
                    source_points = [raw[key]] if key == 'point' else raw[key]
                    np.testing.assert_allclose(xy, S.svg_coordinates(fig, source_points), atol=1e-6)
                if probe['kind'] == 'voltage':
                    self.assertLess(probe['pins'][0][1], probe['pins'][1][1])
                    self.assertLess(probe['ends'][0][1], probe['ends'][1][1])
                elif probe['key'].startswith('is'):
                    self.assertLess(probe['arrow'][1][1], probe['arrow'][0][1])
                else:
                    self.assertGreater(probe['arrow'][1][0], probe['arrow'][0][0])

    def test_native_fallback_solution_labels_do_not_overlap_in_either_theme(self):
        for q in S.QUESTIONS:
            for dark in (False, True):
                fig, _ = S.bridge(q, dark)
                renderer = fig.canvas.get_renderer()
                boxes = [(t.get_text(), Text.get_window_extent(t, renderer).padded(1)) for t in fig.axes[0].texts]
                collisions = [(a, b) for (a, first), (b, second) in itertools.combinations(boxes, 2) if first.overlaps(second)]
                self.assertEqual(collisions, [], (q, dark))
                P.plt.close(fig)

    def test_q3_static_detail_doubles_scr_bodies_without_resizing_labels_or_moving_terminals(self):
        for dark in (False, True):
            normal, _ = S.bridge(3, dark)
            detail = S.circuit_figure(dark)
            old_ax, new_ax = normal.axes[0], detail.axes[0]
            np.testing.assert_equal(old_ax.get_xlim(), new_ax.get_xlim())
            np.testing.assert_equal(old_ax.get_ylim(), new_ax.get_ylim())
            np.testing.assert_equal(normal.get_size_inches(), detail.get_size_inches())
            for key, x, y in [('S1', S.LEFT, 5.5), ('S4', S.LEFT, 1.5), ('S3', S.RIGHT, 5.5), ('S2', S.RIGHT, 1.5)]:
                bodies = [next(p for p in ax.patches if isinstance(p, Polygon) and f'-{key}-' in p.get_gid())
                          for ax in (old_ax, new_ax)]
                for axis in (0, 1):
                    spans = [np.ptp(body.get_xy()[:, axis]) for body in bodies]
                    self.assertAlmostEqual(spans[1] / spans[0], 2)
                lines = [next(line for line in ax.lines if line.get_gid().endswith(f'-{key}-stroke-0'))
                         for ax in (old_ax, new_ax)]
                np.testing.assert_equal(lines[0].get_xydata()[[0, -1]], lines[1].get_xydata()[[0, -1]])
                labels = [next(t for t in ax.texts if t.get_text() == f'$S_{key[1]}$') for ax in (old_ax, new_ax)]
                self.assertEqual(labels[1].get_position(), (x+.85, y))
                self.assertEqual(labels[0].get_fontsize(), labels[1].get_fontsize())
                label_box = labels[1].get_window_extent(detail.canvas.get_renderer())
                body_box = bodies[1].get_window_extent(detail.canvas.get_renderer())
                self.assertGreater(label_box.x0 - body_box.x1, 4)
            self.assertTrue(all(circle['round'] for circle in circle_geometry(detail)))

    def test_owned_assets_reproducible_manifests_and_preserved_semi_assets(self):
        self.assertEqual({p['locale'] for p in self.papers}, {'en', 'zh-cn'})
        expected_full = {S.name_for(q)+suffix for q in S.QUESTIONS for suffix in ('.svg', '-dark.svg', '.json')}
        expected_semi = {SEMI.NAME+suffix for suffix in ('.svg', '-dark.svg', '.json')}
        all_names = expected_full | expected_semi | {'p2-f26-q6-ripple.json'}
        outputs = []
        with tempfile.TemporaryDirectory() as tmp:
            for paper in self.papers:
                module = G.renderer(paper)
                self.assertIn(ROOT/'scripts/full_converter_sprite.py', module.AUXILIARY_INPUTS)
                self.assertIn(ROOT/'scripts/semi_converter_sprite.py', module.AUXILIARY_INPUTS)
                output = Path(tmp)/paper['locale']
                self.assertEqual(set(module.generate_auxiliary_assets(output)), all_names)
                actual = paper['directory']/'assets/figures'
                manifest = json.loads((actual/'manifest.json').read_text())
                self.assertTrue(all_names <= set(manifest['auxiliaryAssets']))
                self.assertIn('p2-f26-q3-circuit', manifest['figures'])
                self.assertNotIn('p2-f26-q3-circuit', manifest['questionFigures'])
                self.assertTrue(all(S.name_for(q) not in manifest['figures'] for q in S.QUESTIONS))
                for name in all_names:
                    path = actual/name
                    self.assertTrue(path.is_file())
                    self.assertFalse(path.is_symlink())
                    self.assertEqual(path.read_bytes(), (output/name).read_bytes(), name)
                for name, digest in manifest['sourceSha256'].items():
                    self.assertEqual(hashlib.sha256((ROOT/name).read_bytes()).hexdigest(), digest, name)
                for suffix in ('.svg', '-dark.svg'):
                    fallback = actual/('p2-f26-q3-circuit'+suffix)
                    self.assertFalse(fallback.is_symlink())
                    self.assertIn('id="schemdraw-', fallback.read_text())
                outputs.append(actual)
        for name in [*all_names, 'p2-f26-q3-circuit.svg', 'p2-f26-q3-circuit-dark.svg']:
            self.assertFalse((outputs[0]/name).samefile(outputs[1]/name), name)

    def test_ripple_bytes_represent_existing_paper_function_not_new_solver(self):
        for paper in self.papers:
            module = G.renderer(paper)
            values, inductance = module.representative_ripple()
            data = json.loads((paper['directory']/'assets/figures/p2-f26-q6-ripple.json').read_text())
            self.assertEqual(set(data), {'version', 'kind', 'period', 'mean', 'rippleRms', 'inductance', 'values'})
            self.assertEqual((data['version'], data['kind'], data['period']), (1, 'representative-current', 360))
            self.assertEqual((data['mean'], data['rippleRms']), (20, 4))
            self.assertEqual(data['values'], values.tolist())
            self.assertEqual(data['inductance'], inductance)
            self.assertEqual(len(data['values']), 8192)
            self.assertTrue(np.isfinite(values).all())
            self.assertGreater(np.min(values), 0)
            self.assertAlmostEqual(np.mean(values), 20, places=10)
            self.assertAlmostEqual(np.std(values), 4, places=10)
            self.assertAlmostEqual(np.sqrt(np.mean(values**2)), np.sqrt(416), places=10)

    def test_bad_questions_and_bad_ripple_authority_are_rejected(self):
        for q in (0, 4, 7, '3'):
            with self.assertRaises(ValueError):
                S.name_for(q)
        with tempfile.TemporaryDirectory() as output:
            for values, inductance in [(np.ones(8191)*20, .03), (np.ones(8192)*20, .03),
                                       (np.full(8192, np.nan), .03), (np.ones(8192)*20, np.nan)]:
                with self.assertRaises(ValueError):
                    S.generate_ripple(output, lambda: (values, inductance))


if __name__ == '__main__':
    unittest.main()
