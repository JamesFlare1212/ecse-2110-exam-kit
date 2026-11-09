"""Mounted Fall 2026 Exam 1 diagrams, owned by this English paper.

Only Q5 is a printed question figure. Q6's per-unit circuit and phasors are
revealed-solution figures; no illustrative question diagrams are emitted.
"""
from pathlib import Path
import sys
import math
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

    # Compact prompt-only canvas; leave the solution figures' scale unchanged.
    fig, ax = p.plt.subplots(figsize=(6, 3.5))
    fig.subplots_adjust(left=0, right=1, bottom=0, top=1)
    p.canvas(ax, (-.3, 8.9), (-.35, 4.55))
    p.equal_units(ax)
    for y, name, end in [(3.7, 'a', 7.65), (2.8, 'b', 6.2), (1.9, 'c', 7.65)]:
        text(ax, 0, y, '$'+name+'$', ha='center', va='center', fontsize=13)
        wire(ax, (.3, y), (1.2, y))
        C.inductor(ax, (1.2, y), (2.15, y))
        wire(ax, (2.15, y), (end, y))
        C.terminal(ax, (.3, y), radius=.04)
    text(ax, 1.675, 4.15, r'$j3\ \Omega$', ha='center', fontsize=13)
    text(ax, .35, 3.26, r'$|V_L|=346.41\ \mathrm{V}$', fontsize=12)
    # Retain the printed left-middle/right-top/right-bottom delta perspective.
    a, b, c = (7.65, 3.7), (6.2, 2.8), (7.65, 1.9)
    for start, end in [(a, b), (b, c), (a, c)]:
        C.place(ax, E.ResistorIEEE(), start, end, scale=.85)
    for at, name in [(a, 'a'), (b, 'b'), (c, 'c')]:
        node(ax, at)
        text(ax, at[0]-.25 if name == 'b' else at[0]+.25,
             at[1]+.3 if name == 'b' else at[1]+.1, '$'+name+'$', fontsize=13)
    text(ax, 8.0, 2.8, r'$18\ \Omega$', va='center', fontsize=12)
    # Crossings remain unjoined; dots mark only the printed phase taps.
    # Mirror the two lower Y arms exactly about the upright a--n branch.
    neutral = (4.55, .6)
    for at in [(4.55, 3.7), (3.1, 2.8), (6.0, 1.9)]:
        node(ax, at)
    wire(ax, (4.55, 3.7), (4.55, 1.65))
    C.place(ax, E.ResistorIEEE(), (4.55, 1.65), (4.55, .75), scale=.8)
    wire(ax, (4.55, .75), neutral)
    text(ax, 4.95, 1.2, r'$12\ \Omega$', va='center', fontsize=12)
    for x, y in [(3.1, 2.8), (6.0, 1.9)]:
        wire(ax, (x, y), (x, -.05))
        C.place(ax, E.ResistorIEEE(), (x, -.05), neutral, scale=.8)
    node(ax, neutral)
    text(ax, 4.55, .1, r'$n$', ha='center', fontsize=13)
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
