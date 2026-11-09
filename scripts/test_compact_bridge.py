"""Compact Q4 prompt: preserve printed topology and keep enlarged labels clear."""
import importlib.util
from pathlib import Path
import unittest

import numpy as np
import schemdraw.elements as E
from matplotlib.patches import Arc
from matplotlib.text import Text
import plotting as P


class CompactBridgeTests(unittest.TestCase):
    def tearDown(self):
        P.plt.close('all')

    def figures(self):
        root = Path(__file__).resolve().parents[1]
        for locale in ('en', 'zh-cn'):
            path = root / 'content' / locale / 'practice2_f26/generate_figures.py'
            spec = importlib.util.spec_from_file_location('compact_bridge_' + locale, path)
            renderer = importlib.util.module_from_spec(spec)
            spec.loader.exec_module(renderer)
            for dark in (False, True):
                P.setup(dark)
                fig = renderer.circuit('semi')
                P.prepare_figure(fig)
                fig.canvas.draw()
                yield fig, fig.axes[0]

    def test_source_devices_ports_and_unconnected_crossing_are_preserved(self):
        for fig, ax in self.figures():
            elements = ax._fieldnotes_circuit.drawing.elements
            scrs = [item for item in elements if type(item) is E.SCR]
            diodes = [item for item in elements if type(item) is E.Diode]
            self.assertEqual(len(scrs), 2)
            self.assertEqual(len(diodes), 2)
            self.assertEqual(sum(type(item) is E.ResistorIEEE for item in elements), 1)
            self.assertEqual(sum(type(item) is E.Inductor2 for item in elements), 1)
            self.assertFalse(any(isinstance(item, E.Source) for item in elements))
            for scr in scrs:
                self.assertLess(scr.gate[0], scr.start[0])
            for device in scrs + diodes:
                self.assertGreater(device.end[1], device.start[1])
                self.assertAlmostEqual(device.end[0], device.start[0])
            self.assertLess(scrs[0].start[0], diodes[0].start[0])
            for left, right in zip(scrs, diodes):
                self.assertAlmostEqual(left.start[1], right.start[1])
                self.assertAlmostEqual(left.end[1], right.end[1])
            # Both open AC ports survive. The lower wire crosses the SCR leg
            # through a jump, not a junction or a new source symbol.
            dots = [item for item in elements if type(item) is E.Dot]
            ports = [item for item in dots if item.params['open']]
            self.assertEqual(len(ports), 2)
            self.assertEqual(len(dots), 6)
            arcs = [item for item in ax.patches if isinstance(item, Arc)]
            self.assertEqual(len(arcs), 1)
            jump = arcs[0]
            np.testing.assert_allclose(jump.center, (scrs[0].start[0], ports[1].center[1]))
            self.assertTrue(all(not np.allclose(dot.center, jump.center) for dot in dots))
            self.assertAlmostEqual(jump.width, jump.height)
            labels = {text.get_text() for text in ax.texts}
            self.assertTrue({'$S_1$', '$S_2$', '$D_1$', '$D_2$', '$R$', '$L$',
                             '$i$', '$v$', '$i_0$', '$v_0$', '$+$', '$-$', 'FIGURE P10.4'} <= labels)

    def test_body_sized_labels_do_not_touch_symbols_or_wires(self):
        for fig, ax in self.figures():
            renderer = fig.canvas.get_renderer()
            self.assertLessEqual(fig.get_figwidth() * 72, 360)
            self.assertLessEqual(fig.get_figheight() * 72, 300)
            for text in ax.texts:
                if not text.get_text():
                    continue
                self.assertGreaterEqual(text.get_fontsize(), 15.6)
                if text.get_text().startswith('$'):
                    self.assertGreaterEqual(text.get_fontsize(), 18)
                box = Text.get_window_extent(text, renderer).padded(2)
                for stroke in [*ax.lines, *ax.patches]:
                    path = stroke.get_path().transformed(stroke.get_transform())
                    self.assertFalse(box.overlaps(path.get_extents()) and path.intersects_bbox(box, filled=False),
                                     f'{text.get_text()} touches an electrical stroke')


if __name__ == '__main__':
    unittest.main()
