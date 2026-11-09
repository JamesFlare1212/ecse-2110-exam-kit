"""Compact Q5/Q6 bridges: truthful topology, readable labels and proportional devices."""
import importlib.util
from itertools import chain, combinations
from pathlib import Path
import unittest

import numpy as np
import schemdraw.elements as E
from matplotlib.patches import Arc
from matplotlib.text import Text
import plotting as P


class CompactFullBridgeTests(unittest.TestCase):
    def tearDown(self):
        P.plt.close('all')

    def figures(self, kind='full'):
        root = Path(__file__).resolve().parents[1]
        for locale in ('en', 'zh-cn'):
            path = root / 'content' / locale / 'practice2_f26/generate_figures.py'
            spec = importlib.util.spec_from_file_location('compact_full_bridge_' + locale, path)
            renderer = importlib.util.module_from_spec(spec)
            spec.loader.exec_module(renderer)
            for dark in (False, True):
                P.setup(dark)
                fig = renderer.circuit(kind)
                P.prepare_figure(fig)
                fig.canvas.draw()
                yield fig, fig.axes[0]

    def test_four_upward_scrs_load_and_separate_field_are_preserved(self):
        for fig, ax in self.figures():
            elements = ax._fieldnotes_circuit.drawing.elements
            scrs = [item for item in elements if type(item) is E.SCR]
            self.assertEqual(len(scrs), 4)
            self.assertFalse(any(type(item) is E.Diode for item in elements))
            self.assertEqual(sum(type(item) is E.ResistorIEEE for item in elements), 1)
            self.assertEqual(sum(type(item) is E.Inductor2 for item in elements), 2)
            self.assertEqual(sum(type(item) is E.SourceSin for item in elements), 1)
            self.assertEqual(sum(type(item) is E.Source for item in elements), 1)
            for scr in scrs:
                self.assertLess(scr.gate[0], scr.start[0])
                self.assertGreater(scr.end[1], scr.start[1])
                self.assertAlmostEqual(scr.end[0], scr.start[0])
            # Source labels follow the original S1/S4 left, S3/S2 right layout.
            labels = {text.get_text(): text for text in ax.texts}
            for pair, label in zip(scrs, ('$S_1$', '$S_4$', '$S_3$', '$S_2$')):
                self.assertAlmostEqual(labels[label].get_position()[1], (pair.start[1] + pair.end[1]) / 2)
            self.assertTrue({'$L_a$', '$R_a$', '$E_a$', '$i$', '$v$', '$i_0$', '$v_0$', '$i_f$'} <= labels.keys())
            dots = [item for item in elements if type(item) is E.Dot]
            ports = [item for item in dots if item.params['open']]
            self.assertEqual(len(dots), 6)
            self.assertEqual(len(ports), 2)
            self.assertTrue(all(port.center[0] > scrs[-1].end[0] for port in ports))
            jump = [item for item in ax.patches if isinstance(item, Arc)]
            self.assertEqual(len(jump), 1)
            self.assertTrue(all(not np.allclose(dot.center, jump[0].center) for dot in dots))
            self.assertAlmostEqual(jump[0].width, jump[0].height)

    def test_ideal_motor_keeps_four_scrs_and_series_inductance_without_added_devices(self):
        for fig, ax in self.figures('solution'):
            elements = ax._fieldnotes_circuit.drawing.elements
            self.assertEqual(sum(type(item) is E.SCR for item in elements), 4)
            self.assertEqual(sum(type(item) is E.Inductor2 for item in elements), 1)
            self.assertEqual(sum(type(item) is E.SourceSin for item in elements), 1)
            self.assertEqual(sum(type(item) is E.Source for item in elements), 1)
            self.assertFalse(any(type(item) in (E.ResistorIEEE, E.Capacitor, E.Diode) for item in elements))
            labels = {text.get_text(): text.get_position() for text in ax.texts}
            self.assertEqual(set(labels), {'$S_1$', '$S_4$', '$S_3$', '$S_2$', '$L$', '$E_a$',
                                          '$i$', '$v$', '$i_0$', '$v_0$', '$+$', '$-$'})
            scrs = [item for item in elements if type(item) is E.SCR]
            for device, name in zip(scrs, ('$S_1$', '$S_4$', '$S_3$', '$S_2$')):
                self.assertLess(device.gate[0], device.start[0])
                self.assertGreater(device.end[1], device.start[1])
                self.assertAlmostEqual(labels[name][1], (device.start[1] + device.end[1]) / 2)
            motor = next(item for item in elements if type(item) is E.Source)
            inductor = next(item for item in elements if type(item) is E.Inductor2)
            self.assertAlmostEqual(motor.start[0], inductor.start[0])
            self.assertGreater(min(inductor.start[1], inductor.end[1]), motor.end[1])
            self.assertGreater(motor.end[1], motor.start[1])
            dots = [item for item in elements if type(item) is E.Dot]
            self.assertEqual(len(dots), 4)
            self.assertFalse(any(item.params['open'] for item in dots))
            jumps = [item for item in ax.patches if isinstance(item, Arc)]
            self.assertEqual(len(jumps), 1)
            self.assertTrue(all(not np.allclose(dot.center, jumps[0].center) for dot in dots))
            self.assertLessEqual(fig.get_figwidth() * 72, 360)

    def test_compact_body_sized_labels_clear_all_strokes(self):
        for fig, ax in chain(self.figures(), self.figures('solution')):
            self.assertLessEqual(fig.get_figwidth() * 72, 480)
            self.assertLessEqual(fig.get_figheight() * 72, 280)
            renderer = fig.canvas.get_renderer()
            labels = [text for text in ax.texts if text.get_text()]
            for first, second in combinations(labels, 2):
                self.assertFalse(Text.get_window_extent(first, renderer).padded(1).overlaps(
                    Text.get_window_extent(second, renderer).padded(1)),
                    f'{first.get_text()} overlaps {second.get_text()}')
            for text in labels:
                if not text.get_text():
                    continue
                self.assertGreaterEqual(text.get_fontsize(), 18)
                box = Text.get_window_extent(text, renderer).padded(2)
                for stroke in [*ax.lines, *ax.patches]:
                    path = stroke.get_path().transformed(stroke.get_transform())
                    self.assertFalse(box.overlaps(path.get_extents()) and path.intersects_bbox(box, filled=False),
                                     f'{text.get_text()} touches an electrical stroke')


if __name__ == '__main__':
    unittest.main()
