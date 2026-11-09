"""Focused offline sprite/geometry regression tests, with no PDF inputs.

python3 -m unittest discover -s scripts -p 'test_semi_converter_sprite.py'
"""
import hashlib
import json
import math
from pathlib import Path
import re
import tempfile
import unittest
from unittest.mock import patch
import xml.etree.ElementTree as ET

import numpy as np
from matplotlib.patches import Arc, Circle

from check_figures import circle_geometry
import generate_figures as G
import plotting as P
import semi_converter_sprite as S

ROOT = Path(__file__).resolve().parents[1]


def numbers(path):
    return np.array([float(value) for value in re.findall(r'-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?', path)])


class SemiConverterSpriteTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.light, cls.contract = S.sprite(False)
        cls.dark, cls.dark_contract = S.sprite(True)

    def tearDown(self):
        P.plt.close('all')

    def test_contract_and_self_contained_external_use_fragments(self):
        self.assertEqual(set(self.contract), {'version', 'viewBox', 'parts', 'routes'})
        self.assertEqual(self.contract['version'], 1)
        self.assertEqual(self.contract, self.dark_contract)
        # currentColor/card surface make both separately owned themes identical.
        self.assertEqual(self.light, self.dark)
        for svg in (self.light, self.dark):
            root = ET.fromstring(svg)
            self.assertEqual(root.tag, S.SVG+'svg')
            box = self.contract['viewBox']
            self.assertEqual(box, [float(value) for value in root.get('viewBox').split()])
            self.assertEqual(box[:2], [0, 0])
            self.assertTrue(all(math.isfinite(v) for v in box))
            self.assertTrue(all(v > 0 for v in box[2:]))
            ids = [node.get('id') for node in root.iter() if node.get('id')]
            self.assertEqual(len(ids), len(set(ids)))
            fragments = {node.get('id'): node for node in root}
            self.assertEqual(list(fragments), [part['id'] for part in self.contract['parts']])
            self.assertEqual(set(part['key'] for part in self.contract['parts']), S.KEYS)
            for part in self.contract['parts']:
                self.assertEqual(set(part), {'id', 'key', 'label'})
                self.assertIs(type(part['label']), bool)
                group = fragments[part['id']]
                self.assertEqual(group.tag, S.SVG+'g')
                self.assertEqual(group.get('data-part'), part['key'])
                self.assertGreater(len(group), 0)
                self.assertEqual(bool(list(group.iter(S.SVG+'text'))), part['label'])
                self.assertTrue(any(node.tag in (S.SVG+'text', S.SVG+'path') for node in group.iter()))
                # No ancestor transforms/defs/styles are needed by a <use>.
                self.assertIsNone(group.get('transform'))
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
            card_groups = [part['key'] for part in self.contract['parts']
                           if 'var(--card)' in ET.tostring(fragments[part['id']], encoding='unicode')]
            self.assertTrue(card_groups)
            self.assertEqual(set(card_groups), {'source'})

    def test_compact_wires_keep_a_readable_screen_width_without_changing_geometry(self):
        for svg in (self.light, self.dark):
            root = ET.fromstring(svg)
            stroked = [node for node in root.iter(S.SVG+'path')
                       if 'stroke: currentColor' in node.get('style', '')]
            self.assertGreater(len(stroked), 35)
            for node in stroked:
                self.assertEqual(node.get('vector-effect'), 'non-scaling-stroke')
                widths = re.findall(r'stroke-width:\s*([^;]+)', node.get('style'))
                self.assertEqual(widths, [f'var({S.STROKE_PROPERTY}, {S.STROKE_WIDTH})'])
            for node in root.iter(S.SVG+'text'):
                self.assertIsNone(node.get('vector-effect'))

    def test_native_artist_ownership_topology_and_round_circles(self):
        for dark in (False, True):
            fig, ownership = S.bridge(dark)
            ax = fig.axes[0]
            artists = [*ax.lines, *ax.patches, *ax.texts]
            self.assertEqual({artist.get_gid() for artist in artists}, set(ownership))
            self.assertEqual(len(artists), len(ownership))
            circles = circle_geometry(fig)
            self.assertEqual(len(circles), 5)  # AC source and four actual junctions
            self.assertTrue(all(circle['round'] for circle in circles))
            self.assertEqual(ax._schemdraw_elements.count('SCR'), 2)
            self.assertEqual(ax._schemdraw_elements.count('Diode'), 2)
            self.assertEqual(ax._schemdraw_elements.count('SourceSin'), 1)
            self.assertEqual(ax._schemdraw_elements.count('Inductor2'), 1)
            self.assertEqual(ax._schemdraw_elements.count('ResistorIEEE'), 1)
            expected = {(-1, 3): ('source', .7), (1.8, 3.7): ('source', .045),
                        (3.8, 2.3): ('load', .045), (3.8, 5.6): ('load', .045), (3.8, .4): ('load', .045)}
            groups = {node.get('id'): node for node in ET.fromstring(self.light)}
            for circle in (patch for patch in ax.patches if isinstance(patch, Circle)):
                point = tuple(round(float(v), 9) for v in circle.center)
                key, radius = expected[point]
                self.assertEqual(ownership[circle.get_gid()]['key'], key)
                self.assertAlmostEqual(circle.radius, radius)
                # Check the actual delivered native circle path too, not only
                # the Matplotlib stage; no stretched parent transform can hide.
                path = next(groups[circle.get_gid()].iter(S.SVG+'path'))
                xy = numbers(path.get('d')).reshape(-1, 2)
                self.assertAlmostEqual(np.ptp(xy[:, 0]), np.ptp(xy[:, 1]), places=5)
                expected_xy = np.asarray(S.svg_coordinates(fig, [(point[0]-radius, point[1]-radius),
                                                                (point[0]+radius, point[1]+radius)]))
                np.testing.assert_allclose(xy.min(axis=0), expected_xy.min(axis=0), atol=1e-6)
                np.testing.assert_allclose(xy.max(axis=0), expected_xy.max(axis=0), atol=1e-6)
            # No junction at the lower input/left-leg crossover.
            self.assertNotIn((1.8, 2.3), expected)
            jump = next(patch for patch in ax.patches if isinstance(patch, Arc))
            self.assertEqual(ownership[jump.get_gid()]['key'], 'S2')
            self.assertEqual(tuple(jump.center), (1.8, 2.3))
            self.assertAlmostEqual(jump.width, .34)
            self.assertEqual(jump.width, jump.height)
            self.assertEqual((jump.theta1, jump.theta2), (-90, 90))
            for key, x in [('S1', 1.8), ('S2', 1.8), ('D1', 3.8), ('D2', 3.8)]:
                label = next(text for text in ax.texts if ownership[text.get_gid()]['key'] == key)
                self.assertEqual(label.get_text(), f'${key[0]}_{key[1]}$')
                self.assertAlmostEqual(label.get_position()[0], x+.55)
                self.assertGreater(label.get_position()[1], 4 if key.endswith('1') else 1)
                self.assertLess(label.get_position()[1], 5 if key.endswith('1') else 2)
            for key, y in [('top-left', 5.6), ('bottom-left', .4)]:
                bus = next(line for line in ax.lines if ownership[line.get_gid()]['key'] == key)
                np.testing.assert_allclose(bus.get_xydata(), [(1.8, y), (2.8, y), (3.8, y)])

    def test_routes_match_export_coordinates_directions_and_wire_jump(self):
        self.assertEqual(set(self.contract['routes']), {'freewheel', 'positive', 'negative'})
        fig, _ = S.bridge()
        raw = S.route_points()
        for state, route in self.contract['routes'].items():
            xy = np.asarray(route)
            self.assertEqual(xy.shape, (len(raw[state]), 2))
            self.assertTrue(np.isfinite(xy).all())
            np.testing.assert_equal(xy[0], xy[-1])
            self.assertTrue((np.linalg.norm(np.diff(xy, axis=0), axis=1) > 0).all())
            self.assertTrue((xy >= 0).all())
            self.assertTrue((xy <= self.contract['viewBox'][2:]).all())
            expected = fig.axes[0].transData.transform(raw[state])*72/fig.dpi
            expected[:, 1] = self.contract['viewBox'][3]-expected[:, 1]
            np.testing.assert_allclose(xy, expected, atol=1e-6)
            # All states traverse the load from its top bus to its bottom bus.
            index = raw[state].index((6.6, 5.6))
            self.assertEqual(raw[state][index+1], (6.6, .4))
        self.assertTrue(all(x >= 3.8 for x, _ in raw['freewheel']))
        self.assertIn((1.8, 5.6), raw['positive'])  # S1 -> load -> D2
        self.assertNotIn((1.8, .4), raw['positive'])
        self.assertIn((1.8, .4), raw['negative'])  # D1 -> load -> S2
        self.assertNotIn((1.8, 5.6), raw['negative'])
        self.assertEqual(raw['positive'][-2:], [(-1, 2.3), (-1, 3.7)])
        self.assertEqual(raw['negative'][-2:], [(-1, 3.7), (-1, 2.3)])
        jump = np.asarray(raw['negative'][6:27])
        np.testing.assert_allclose(np.linalg.norm(jump-[1.8, 2.3], axis=1), .17, atol=1e-12)
        np.testing.assert_allclose(jump[[0, -1]], [(1.8, 2.13), (1.8, 2.47)])
        self.assertAlmostEqual(jump[10, 0], 1.97)
        self.assertNotIn((1.8, 2.3), raw['negative'])

    def test_paper_hooks_generate_independent_reproducible_auxiliary_files(self):
        expected = {S.NAME+'.svg', S.NAME+'-dark.svg', S.NAME+'.json'}
        papers = [paper for paper in G.papers() if paper['name'] == 'practice2_f26']
        self.assertEqual({paper['locale'] for paper in papers}, {'en', 'zh-cn'})
        with tempfile.TemporaryDirectory() as tmp:
            files = []
            for paper in papers:
                module = G.renderer(paper)
                self.assertIn(ROOT/'scripts/semi_converter_sprite.py', module.AUXILIARY_INPUTS)
                output = Path(tmp)/paper['locale']
                names = module.generate_auxiliary_assets(output)
                self.assertTrue(expected <= set(names))  # The same paper also owns full-converter auxiliaries.
                first = {name: (output/name).read_bytes() for name in names}
                module.generate_auxiliary_assets(output)
                self.assertEqual(first, {name: (output/name).read_bytes() for name in names})
                self.assertEqual(first[S.NAME+'.svg'].decode(), self.light)
                self.assertEqual(json.loads(first[S.NAME+'.json']), self.contract)
                files.append(output/S.NAME)
            self.assertFalse((files[0].with_suffix('.svg')).samefile(files[1].with_suffix('.svg')))
        # Auxiliaries stay outside the 21 canonical figures, including Q3's matched prompt and fallback.
        for locale in ('en', 'zh-cn'):
            self.assertEqual(sum(len(G.figure_names(paper)) for paper in G.papers(locale)), 21)

    def test_generator_preserves_sprites_during_stale_cleanup_and_tracks_inputs(self):
        paper = next(paper for paper in G.papers('en') if paper['name'] == 'practice2_f26')
        module = G.renderer(paper)
        with tempfile.TemporaryDirectory(dir=ROOT) as tmp:
            directory = Path(tmp)
            (directory/'generate_figures.py').write_bytes((paper['directory']/'generate_figures.py').read_bytes())
            (directory/'figure-sources.json').write_text('{"figures": {}, "panels": {}}')
            output = directory/'assets/figures'
            output.mkdir(parents=True)
            (output/'stale.svg').write_text('<svg/>')
            fake = {**paper, 'directory': directory}
            # Exercise the real generation hook, stale cleanup and manifest
            # writer without redrawing other figures or requiring source PDFs.
            with (patch.object(G, 'papers', return_value=[fake]), patch.object(G, 'renderer', return_value=module),
                  patch.object(G, 'render_figures')):
                G.generate_paper(directory)
            self.assertFalse((output/'stale.svg').exists())
            manifest = json.loads((output/'manifest.json').read_text())
            self.assertEqual(manifest['figures'], [])
            self.assertTrue({S.NAME+'.svg', S.NAME+'-dark.svg', S.NAME+'.json'} <= set(manifest['auxiliaryAssets']))
            for name in manifest['auxiliaryAssets']:
                self.assertTrue((output/name).is_file())
            for name in ('scripts/semi_converter_sprite.py', 'scripts/generate_figures.py'):
                self.assertEqual(manifest['sourceSha256'][name], hashlib.sha256((ROOT/name).read_bytes()).hexdigest())

    def test_checked_in_assets_match_generation_and_remain_outside_main_inventory(self):
        for suffix in ('.svg', '-dark.svg', '.json'):
            en = ROOT/'content/en/practice2_f26/assets/figures'/(S.NAME+suffix)
            zh = ROOT/'content/zh-cn/practice2_f26/assets/figures'/(S.NAME+suffix)
            self.assertFalse(en.samefile(zh))
        for locale in ('en', 'zh-cn'):
            output = ROOT/'content'/locale/'practice2_f26/assets/figures'
            manifest = json.loads((output/'manifest.json').read_text())
            self.assertEqual(len(manifest['figures']), 9)
            self.assertNotIn(S.NAME, manifest['figures'])
            for name, contents in [(S.NAME+'.svg', self.light), (S.NAME+'-dark.svg', self.dark)]:
                path = output/name
                self.assertFalse(path.is_symlink())
                self.assertEqual(path.read_text(), contents)
                self.assertIn(name, manifest['auxiliaryAssets'])
            self.assertEqual(json.loads((output/(S.NAME+'.json')).read_text()), self.contract)
            for name, digest in manifest['sourceSha256'].items():
                self.assertEqual(hashlib.sha256((ROOT/name).read_bytes()).hexdigest(), digest)


if __name__ == '__main__':
    unittest.main()
