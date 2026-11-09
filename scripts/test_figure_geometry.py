"""Offline regression tests; run in the Matplotlib environment.

python3 -m unittest discover -s scripts -p 'test_figure_geometry.py'
"""
import unittest

import numpy as np
from matplotlib.patches import Circle, Ellipse, Arc
from matplotlib.transforms import Affine2D

import plotting as P
from check_figures import circle_geometry


class CircleGeometryTests(unittest.TestCase):
    def tearDown(self):
        P.plt.close('all')

    def test_detects_the_original_bridge_distortion_and_preserves_drawing_width(self):
        fig, ax = P.plt.subplots(figsize=(10.8, 5.3))
        fig.subplots_adjust(left=.015, right=.985, bottom=.025, top=.975)
        P.canvas(ax, (-.6, 10.6), (-.65, 5.35))
        ax.add_patch(Circle((6, 1.35), .5))
        fig.canvas.draw()
        old_width = ax.bbox.width
        before = circle_geometry(fig)[0]
        self.assertAlmostEqual(before['axisRatio'], 1.11463, places=5)
        self.assertFalse(before['round'])
        P.equal_units(ax)
        fig.canvas.draw()
        self.assertTrue(circle_geometry(fig)[0]['round'])
        self.assertAlmostEqual(fig.get_figwidth(), 10.8)
        self.assertAlmostEqual(ax.bbox.width, old_width)
        self.assertGreater(fig.get_figheight(), 5.3)

    def test_detects_a_rotated_ellipse_with_a_square_bounding_box(self):
        fig, ax = P.plt.subplots()
        circle = Circle((0, 0), 1, transform=Affine2D().scale(40, 20).rotate_deg(45).translate(100, 100))
        ax.add_patch(circle)
        fig.canvas.draw()
        box = circle.get_window_extent()
        self.assertAlmostEqual(box.width, box.height)
        self.assertAlmostEqual(circle_geometry(fig)[0]['axisRatio'], 2)
        self.assertFalse(circle_geometry(fig)[0]['round'])

    def test_keeps_authored_elliptical_traversal_arrows_and_projection_shapes(self):
        fig, ax = P.plt.subplots()
        P.canvas(ax, (0, 10), (0, 4))
        ax.add_patch(Ellipse((4, 2), 2, 1))
        ax.add_patch(Arc((4, 2), 2, 1, theta1=40, theta2=320))
        hidden = Circle((2, 2), .2, visible=False)
        ax.add_patch(hidden)
        fig.canvas.draw()
        self.assertEqual(circle_geometry(fig), [])
        P.equal_units(ax)
        height = fig.get_figheight()
        P.equal_units(ax)
        self.assertAlmostEqual(fig.get_figheight(), height)

    def test_armature_traversal_is_round_and_clockwise_in_both_locales_and_themes(self):
        from paper_assets import papers
        from generate_figures import renderer
        for paper in papers():
            if paper['name'] != 'practice2_f26':
                continue
            for dark in (False, True):
                P.setup(dark)
                fig = renderer(paper).armature_circuit()
                P.prepare_figure(fig); fig.canvas.draw()
                ax = fig.axes[0]
                loop = next(p for p in ax.patches if p.get_gid() == 'kvl-clockwise')
                scale = np.linalg.svd(loop.get_transform().get_affine().get_matrix()[:2, :2], compute_uv=False)
                self.assertAlmostEqual(scale[0] / scale[1], 1)
                arrow = next(t for t in ax.texts if t.get_gid() == 'kvl-direction')
                start, end = np.asarray(arrow.xyann)-loop.center, np.asarray(arrow.xy)-loop.center
                self.assertLess(start[0]*end[1]-start[1]*end[0], 0)
                self.assertEqual(loop.get_linestyle(), 'solid')

    def test_multipanel_figures_retain_the_shared_canvas(self):
        fig, axes = P.plt.subplots(1, 2, figsize=(9, 4))
        original_size = fig.get_size_inches().copy()
        for ax in axes:
            P.canvas(ax, (0, 10), (0, 3))
            ax.add_patch(Circle((4, 1.5), .5))
            P.equal_units(ax)
        fig.canvas.draw()
        np.testing.assert_allclose(fig.get_size_inches(), original_size)
        self.assertTrue(all(circle['round'] for circle in circle_geometry(fig)))


if __name__ == '__main__':
    unittest.main()
