"""Mounted Fall 2026 Exam 1 diagrams, owned by this English paper.

Only Q5 is a printed question figure. Q6's per-unit circuit and phasors are
revealed-solution figures; no illustrative question diagrams are emitted.
"""
from pathlib import Path
import sys
import math
import numpy as np
from matplotlib.patches import FancyArrowPatch
import schemdraw.elements as E

ROOT = Path(__file__).resolve().parents[3]
sys.path.insert(0, str(ROOT / 'scripts'))
import plotting as p
import circuit_drawing as C

SVG_LABELS = {}


def base(height=5.8):
    fig, ax = p.plt.subplots(figsize=(11, height))
    p.canvas(ax, (-.2, 10.2), (-.6, height))
    p.equal_units(ax)
    return fig, ax


def text(ax, x, y, value, **kw):
    p.label(ax, x, y, value, fontsize=kw.pop('fontsize', 11), **kw)


def wire(ax, a, b, **kw):
    C.wire(ax, a, b, **kw)


def node(ax, at):
    C.terminal(ax, at, radius=.035, open=False)


def phasor(ax, a, b, color, gid):
    """Matplotlib vectors: their data endpoints retain the actual complex sum."""
    artist = FancyArrowPatch((a.real, a.imag), (b.real, b.imag),
                             arrowstyle='-|>', mutation_scale=11, lw=1.6,
                             color=color, shrinkA=0, shrinkB=0, zorder=4)
    artist.set_gid(gid)
    ax.add_patch(artist)


def render_figures(save, dark):
    p.setup(dark)

    fig, ax = base(6.4)
    for y, name, end in [(5.1, 'a', 9), (3.85, 'b', 7.05), (2.6, 'c', 9)]:
        text(ax, .25, y, '$'+name+'$', ha='center', va='center')
        wire(ax, (.55, y), (2.0, y))
        C.inductor(ax, (2.0, y), (2.8, y))
        wire(ax, (2.8, y), (end, y))
        C.terminal(ax, (.55, y), radius=.04)
    text(ax, 2.4, 5.67, r'$j3\ \Omega$', ha='center')
    text(ax, .7, 4.4, r'$|V_L|=346.41\ \mathrm{V}$', fontsize=10)
    # Retain the printed left-middle/right-top/right-bottom delta perspective.
    a, b, c = np.array([9, 5.1]), np.array([7.05, 3.85]), np.array([9, 2.6])
    for start, end in [(a, b), (b, c), (a, c)]:
        d = end-start
        wire(ax, start, start+.35*d)
        C.resistor(ax, start+.35*d, start+.65*d)
        wire(ax, start+.65*d, end)
    for at, name in [(a, 'a'), (b, 'b'), (c, 'c')]:
        node(ax, at)
        text(ax, at[0]-.35 if name == 'b' else at[0]+.25,
             at[1]+.28 if name == 'b' else at[1]+.15, '$'+name+'$')
    text(ax, 9.25, 3.82, r'$18\ \Omega$', va='center', fontsize=10)
    # Crossings are NOT nodes. Only the three printed phase taps are joined.
    for at in [(5.8, 5.1), (4.2, 3.85), (8.1, 2.6)]:
        node(ax, at)
    wire(ax, (5.8, 5.1), (5.8, 2.3))
    C.resistor(ax, (5.8, 2.3), (5.8, 1.5))
    wire(ax, (5.8, 1.5), (5.8, 1.1))
    text(ax, 6.05, 1.95, r'$12\ \Omega$', va='center', fontsize=10)
    wire(ax, (4.2, 3.85), (4.2, .35))
    C.place(ax, E.ResistorIEEE(), (4.2, .35), (5.2, .9), scale=.624)
    wire(ax, (5.2, .9), (5.8, 1.1))
    wire(ax, (8.1, 2.6), (8.1, .35))
    C.place(ax, E.ResistorIEEE(), (8.1, .35), (6.6, .9), scale=.624)
    wire(ax, (6.6, .9), (5.8, 1.1))
    node(ax, (5.8, 1.1))
    text(ax, 5.8, .6, r'$n$', ha='center')
    save(fig, 'e1-f26-q5', dark)

    fig, ax = base()
    top, bottom = 4.1, 1.4
    wire(ax, (.8, top), (5.2, top))
    C.resistor(ax, (5.2, top), (6.3, top))
    C.inductor(ax, (6.3, top), (7.5, top))
    wire(ax, (7.5, top), (9.2, top))
    wire(ax, (.8, bottom), (9.2, bottom))
    for x, component in [(2.4, C.resistor), (3.9, C.inductor)]:
        wire(ax, (x, top), (x, 3.5))
        component(ax, (x, 3.5), (x, 2.0))
        wire(ax, (x, 2.0), (x, bottom))
        node(ax, (x, top))
        node(ax, (x, bottom))
    text(ax, .45, 2.7, r'$v_1$', ha='center')
    text(ax, 8.6, 2.7, r"$v_2'$", ha='center')
    # The standard zigzag/loop symbols are wider than the retired hand strokes.
    text(ax, 2.0, 3.1, r'$R_{c,\mathrm{pu}}$', ha='right', fontsize=10)
    text(ax, 2.0, 2.4, r'$38.4615$', ha='right', fontsize=10)
    text(ax, 4.55, 3.1, r'$jX_{m,\mathrm{pu}}$', fontsize=10)
    text(ax, 4.55, 2.4, r'$j12.5859$', fontsize=10)
    text(ax, 5.65, 5.3, r'$r_{\mathrm{eq}}$', ha='center', fontsize=10)
    text(ax, 5.65, 4.7, r'$0.0405539$', ha='center', fontsize=10)
    text(ax, 7.3, 5.3, r'$jx_{\mathrm{eq}}$', ha='center', fontsize=10)
    text(ax, 7.3, 4.7, r'$j0.0781489$', ha='center', fontsize=10)
    C.wire(ax, (8.1, top), (9.0, top), arrow='->', color=p.INK)
    text(ax, 8.7, 4.7, r"$i_2'$", ha='center', fontsize=10)
    text(ax, 5, .65, 'All impedances in per-unit', ha='center')
    save(fig, 'e1-f26-q6-equivalent', dark)

    fig, axs = p.plt.subplots(1, 2, figsize=(12, 5.4))
    r = 950/55**2/(440**2/25000)
    x = math.sqrt((37.5/55)**2-(950/55**2)**2)/(440**2/25000)
    current = .8-.6j
    dr, dx = current*r, 1j*current*x
    v = 1+dr+dx

    ax = axs[0]
    p.canvas(ax, (-.08, 1.23), (-.55, .28))
    p.equal_units(ax)
    ax.set_anchor('N')
    p.line(ax, [0, 1.16], [0, 0], color=p.GRID)
    phasor(ax, 0j, 1+0j, p.TEAL, 'phasor-v2')
    phasor(ax, 0j, v, p.ORANGE, 'phasor-v1')
    # Show the actual head-to-tail voltage endpoints at the SAME pu scale.
    p.line(ax, [1, (1+dr).real, v.real], [0, dr.imag, v.imag],
           color=p.MUTED, lw=1.2)
    ax.plot([1, (1+dr).real, v.real], [0, dr.imag, v.imag],
            linestyle='none', marker='o', markersize=3, color=p.INK, zorder=5)
    text(ax, .48, .18, r'$v_1=1.08001\angle2.026^\circ$',
         ha='center', fontsize=10, color=p.ORANGE)
    text(ax, .7, -.12, r"$v_2'=1\angle0^\circ$", ha='center', fontsize=10, color=p.TEAL)
    # A translated current origin and explicit scale bar avoid implying that
    # voltage and current magnitudes share one physical drawing scale.
    current_origin, current_scale = .12-.14j, .5
    p.line(ax, [.12, .30], [-.14, -.14], color=p.GRID, ls='--', lw=1)
    phasor(ax, current_origin, current_origin+current_scale*current,
           p.INK, 'phasor-current')
    text(ax, .28, -.52, r"$i_2'=1\angle-36.87^\circ$", ha='center', fontsize=10)
    text(ax, .94, -.30, 'Current scale', ha='center', fontsize=9)
    p.line(ax, [.815, 1.065], [-.41, -.41], lw=1.4)
    for xx in [.815, 1.065]:
        p.line(ax, [xx, xx], [-.43, -.39], lw=1.2)
    text(ax, .94, -.52, r'$0.5\ \mathrm{pu}$', ha='center', fontsize=9)
    ax.set_title('Voltage and current phasors', pad=22)

    ax = axs[1]
    p.canvas(ax, (-.025, .13), (-.055, .075))
    p.equal_units(ax)
    ax.set_anchor('N')
    p.line(ax, [-.01, .115], [0, 0], color=p.GRID)
    phasor(ax, 0j, dr, p.INK, 'phasor-drop-r')
    phasor(ax, dr, dr+dx, p.TEAL, 'phasor-drop-x')
    phasor(ax, 0j, dr+dx, p.ORANGE, 'phasor-drop-sum')
    ax.plot([0, dr.real, (dr+dx).real], [0, dr.imag, (dr+dx).imag],
            linestyle='none', marker='o', markersize=3, color=p.INK, zorder=5)
    text(ax, .002, -.045, r"$i_2'r_{\mathrm{eq}}$", fontsize=10)
    text(ax, .09, .012, r"$ji_2'x_{\mathrm{eq}}$", fontsize=10)
    text(ax, .02, .06, r"$v_1-v_2'$", fontsize=10, color=p.ORANGE)
    ax.set_title('Enlarged voltage-drop construction', pad=22)
    save(fig, 'e1-f26-q6-phasor', dark)


if __name__ == '__main__':
    from generate_figures import generate_paper
    generate_paper(Path(__file__).resolve().parent)
