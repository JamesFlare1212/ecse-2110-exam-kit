"""Keep the compact parallel delta/Y prompt upright and electrically distinct."""
import importlib.util
from pathlib import Path
import unittest

import numpy as np
import schemdraw.elements as E
import plotting as P


class CompactPromptFigureTests(unittest.TestCase):
    def tearDown(self):
        P.plt.close('all')

    def test_both_locale_themes_keep_symmetric_y_and_printed_components(self):
        root = Path(__file__).resolve().parents[1]
        for locale in ('en', 'zh-cn'):
            path = root / 'content' / locale / 'exam1_f26/generate_figures.py'
            spec = importlib.util.spec_from_file_location('compact_y_' + locale, path)
            renderer = importlib.util.module_from_spec(spec)
            spec.loader.exec_module(renderer)
            for dark in (False, True):
                figures = []

                def capture(fig, name, theme):
                    if name == 'e1-f26-q5':
                        P.prepare_figure(fig)
                        figures.append(fig)
                    else:
                        P.plt.close(fig)

                renderer.render_figures(capture, dark)
                self.assertEqual(len(figures), 1)
                ax = figures[0].axes[0]
                elements = ax._fieldnotes_circuit.drawing.elements
                resistors = [item for item in elements if type(item) is E.ResistorIEEE]
                self.assertEqual(len(resistors), 6)
                self.assertEqual(sum(type(item) is E.Inductor2 for item in elements), 3)
                ports = [item for item in elements if type(item) is E.Dot and item.params['open']]
                self.assertEqual(len(ports), 3)
                stem, left, right = resistors[-3:]
                np.testing.assert_allclose(left.end, right.end)
                neutral = np.array(left.end)
                self.assertAlmostEqual(stem.start[0], neutral[0])
                self.assertAlmostEqual(stem.end[0], neutral[0])
                self.assertGreater(stem.start[1], neutral[1])
                self.assertLess(left.start[0], neutral[0])
                self.assertGreater(right.start[0], neutral[0])
                self.assertAlmostEqual(left.start[0] + right.start[0], 2 * neutral[0])
                self.assertAlmostEqual(left.start[1], right.start[1])
                self.assertLess(left.start[1], neutral[1])
                self.assertTrue(any(type(item) is E.Dot and not item.params['open']
                                    and np.allclose(item.center, neutral) for item in elements))


if __name__ == '__main__':
    unittest.main()
