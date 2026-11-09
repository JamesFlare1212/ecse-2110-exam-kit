"""Schemdraw/Matplotlib adapter tests, without PDF inputs or asset writes."""
import unittest
import numpy as np
import schemdraw.elements as E
from matplotlib.text import Text
import plotting as P
import circuit_drawing as C
from check_figures import circle_geometry


class CircuitDrawingTests(unittest.TestCase):
    def tearDown(self):
        P.plt.close('all')

    def axes(self, dark=False):
        P.setup(dark)
        fig, ax = P.plt.subplots(figsize=(9, 5))
        P.canvas(ax, (-2, 10), (-2, 5))
        P.equal_units(ax)
        return fig, ax

    def test_exact_endpoints_and_round_sources_at_every_orientation(self):
        for angle in [0, 45, 90, 130, 180, -90]:
            fig, ax = self.axes()
            start = np.array([1., 1.])
            end = start+2*np.array([np.cos(np.radians(angle)), np.sin(np.radians(angle))])
            for kind in ['voltage', 'ac', 'empty']:
                element = C.source(ax, start, end, kind=kind, radius=.35)
                np.testing.assert_allclose(element.start, start, atol=1e-10)
                np.testing.assert_allclose(element.end, end, atol=1e-10)
            P.prepare_figure(fig); fig.canvas.draw()
            self.assertTrue(all(circle['round'] for circle in circle_geometry(fig)))

    def test_preparation_preserves_paper_coordinates_and_is_idempotent(self):
        fig, ax = self.axes()
        limits, size = (ax.get_xlim(), ax.get_ylim()), fig.get_size_inches().copy()
        C.resistor(ax, (0, 3), (1, 3)); C.inductor(ax, (1, 3), (2, 3))
        C.capacitor(ax, (2, 3), (3, 3)); C.terminal(ax, (0, 3))
        C.wire(ax, (0, 0), (4, 0), arrow='->')
        P.label(ax, 5, 2, '$R_a$', fontsize=11)
        P.prepare_figure(fig); fig.canvas.draw()
        counts = len(ax.lines), len(ax.patches), len(ax.texts)
        sizes = [text.get_fontsize() for text in fig.findobj(match=Text) if text.get_text()]
        P.prepare_figure(fig); fig.canvas.draw()
        self.assertEqual(counts, (len(ax.lines), len(ax.patches), len(ax.texts)))
        self.assertEqual(sizes, [text.get_fontsize() for text in fig.findobj(match=Text) if text.get_text()])
        self.assertEqual(limits, (ax.get_xlim(), ax.get_ylim()))
        np.testing.assert_allclose(fig.get_size_inches(), size)
        self.assertFalse(ax.axison)
        self.assertIn('Inductor2', ax._schemdraw_elements)
        self.assertIn('ResistorIEEE', ax._schemdraw_elements)

    def test_short_diagonal_branches_use_native_symbols_without_endpoint_overshoot(self):
        fig, ax = self.axes(True)
        for index, component in enumerate([C.resistor, C.inductor, C.capacitor, C.impedance]):
            a, b = (index, 1), (index+.3, 1.25)
            element = component(ax, a, b)
            np.testing.assert_allclose(element.start, a)
            np.testing.assert_allclose(element.end, b)
        P.prepare_figure(fig); fig.canvas.draw()
        self.assertEqual(len(ax._schemdraw_elements), 4)

    def test_switching_symbols_preserve_forward_current_and_native_gate(self):
        fig, ax = self.axes()
        scr = C.diode(ax, (2, 0), (2, 2), scr=True, gate_left=True)
        diode = C.diode(ax, (4, 0), (4, 2))
        self.assertIsInstance(scr, E.SCR)
        self.assertIsInstance(diode, E.Diode)
        self.assertGreater(scr.end[1], scr.start[1])
        self.assertGreater(diode.end[1], diode.start[1])
        self.assertLess(scr.gate[0], scr.start[0])
        P.prepare_figure(fig)
        with self.assertRaises(RuntimeError):
            C.resistor(ax, (2, 2), (3, 2))


if __name__ == '__main__':
    unittest.main()
