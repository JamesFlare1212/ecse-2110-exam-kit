"""Mounted historical Exam 1 question figures, owned by this Chinese paper.

Q3, Q5 and Q6 retain the printed topology and givens. This renderer emits no
unmounted conceptual question figures and authors no question/solution text.
"""
from pathlib import Path
import sys
import numpy as np
import schemdraw.elements as E

sys.path.insert(0, str(Path(__file__).resolve().parents[3] / 'scripts'))
import plotting as p
import circuit_drawing as C

SVG_LABELS = {}


def board(dark, width, xlim, ylim):
    p.setup(dark)
    fig, ax = p.plt.subplots(figsize=(width, 3))
    fig.subplots_adjust(left=0, right=1, bottom=0, top=1)
    p.canvas(ax, xlim, ylim)
    p.equal_units(ax)
    return fig, ax


def wire(ax, a, b, **kw):
    C.wire(ax, a, b, lw=kw.pop('lw', 1.8), **kw)


def text(ax, xy, value, **kw):
    p.label(ax, *xy, value, ha=kw.pop('ha', 'center'), va='center',
            fontsize=kw.pop('fontsize', 13), **kw)


def flow(ax, a, b):
    C.wire(ax, a, b, arrow='->', color=p.ORANGE, lw=1.7)


def impedance(ax, a, b):
    # A fixed-size standard IEC body keeps all six symbolic Z branches equal;
    # Schemdraw supplies the leads, including the diagonal ones.
    C.place(ax, E.ResistorIEC(), a, b, scale=.95)


def node(ax, at):
    C.terminal(ax, at, radius=.045, open=False)


def source(ax, a, b, name):
    # Source has a preset theta=90; explicitly orient the diagonal branches.
    delta = np.array(b)-np.array(a)
    angle = np.degrees(np.arctan2(delta[1], delta[0]))
    C.place(ax, E.Source().theta(angle).fill(p.PAPER), a, b, scale=.95)
    text(ax, (np.array(a)+np.array(b))/2, name)


def render_figures(save, dark):
    fig, ax = board(dark, 5.8, (-.8, 8.7), (-.75, 3.9))
    # Preserve the source orientation: a above, c lower left, b lower right.
    for shift, star in [(0, False), (4.6, True)]:
        a, c, b = (shift+1.7, 2.4), (shift+.4, 0), (shift+3.0, 0)
        if star:
            n = (shift+1.7, 1.0)
            for end in [a, b, c]:
                impedance(ax, end, n)
            node(ax, n)
            text(ax, (shift+2.35, 1.95), r'$Z_Y$')
            text(ax, (shift+2.85, 1.05), r'$Z_Y$')
            text(ax, (shift+.55, 1.05), r'$Z_Y$')
            text(ax, (shift+1.7, .5), r'$n$')
        else:
            for start, end in [(a, b), (b, c), (c, a)]:
                impedance(ax, start, end)
            text(ax, (shift+.15, 1.4), r'$Z_\Delta$')
            text(ax, (shift+3.25, 1.4), r'$Z_\Delta$')
            text(ax, (shift+1.7, -.48), r'$Z_\Delta$')
        for pos, outer, name, current in [
                (a, (a[0], 3.2), r'$a$', r'$I_a$'),
                (c, (c[0]-.45, -.3), r'$c$', r'$I_c$'),
                (b, (b[0]+.45, -.3), r'$b$', r'$I_b$')]:
            wire(ax, outer, pos)
            flow(ax, outer, pos)
            node(ax, pos)
            C.terminal(ax, outer, radius=.04)
            text(ax, (outer[0], outer[1]+(.36 if name == r'$a$' else -.32)), name)
            if name == r'$a$':
                text(ax, (outer[0]+.45, 2.85), current)
            else:
                text(ax, (outer[0]+(-.08 if name == r'$c$' else .08), .35), current)
    save(fig, 'e1-s25-q3', dark)

    fig, ax = board(dark, 4.9, (-1.0, 6.5), (-.25, 3.2))
    # Printed supply polarity and the three numbered generic loads only;
    # the capacitor requested in part (b) is NOT added to the question figure.
    C.source(ax, (1.15, 0), (1.15, 2.4), kind='voltage', radius=.4)
    text(ax, (-.05, 1.2), r'$1400\,\mathrm{V}$')
    wire(ax, (1.15, 2.4), (5.7, 2.4))
    wire(ax, (1.15, 0), (5.7, 0))
    text(ax, (4.35, 2.9), r'$60\,\mathrm{Hz}$')
    flow(ax, (1.5, 2.4), (2.2, 2.4))
    text(ax, (1.85, 2.85), r'$I$')
    for x, number in [(2.8, 1), (4.25, 2), (5.7, 3)]:
        wire(ax, (x, 2.4), (x, 1.85))
        wire(ax, (x, .55), (x, 0))
        C.place(ax, E.ResistorIEC(), (x, 1.85), (x, .55), scale=1.3)
        text(ax, (x, 1.2), str(number))
        flow(ax, (x, 2.35), (x, 1.96))
        text(ax, (x+.44, 2.15), f'$I_{number}$')
    save(fig, 'e1-s25-q5', dark)

    fig, ax = board(dark, 6.0, (-.85, 7.85), (-1.5, 3.05))
    n, o = (1.2, .85), (5.5, .85)
    a, b, c = (1.2, 2.3), (2.6, -.05), (-.2, -.05)
    source(ax, n, a, r'$E_{an}$')
    source(ax, n, b, r'$E_{bn}$')
    source(ax, n, c, r'$E_{cn}$')
    # Source neutral n and floating load neutral o are never connected.
    wire(ax, a, (5.5, 2.3))
    wire(ax, (5.5, 2.3), (5.5, 1.95))
    C.resistor(ax, (5.5, 1.95), (5.5, 1.1))
    wire(ax, (5.5, 1.1), o)
    text(ax, (6.2, 1.55), r'$5\,\Omega$')
    # Phase c: the printed 3-ohm resistance and +j4 reactance stay in series.
    lower_c, lower_b = (3.8, -.05), (7.2, -.05)
    u = np.array(o)-np.array(lower_c)
    u /= np.linalg.norm(u)
    mid = np.array(lower_c)+.85*u
    C.resistor(ax, lower_c, mid)
    left, right = mid+.12*u, np.array(o)-.15*u
    wire(ax, mid, left)
    C.inductor(ax, left, right)
    wire(ax, right, o)
    text(ax, (4.0, 1.0), r'$3+j4\,\Omega$')
    # Phase b is capacitive (-j5), not an inductive +j5 element.
    C.place(ax, E.Capacitor(), o, lower_b, scale=.95)
    text(ax, (6.95, 1.0), r'$-j5\,\Omega$')
    wire(ax, b, (2.6, -.5))
    wire(ax, (2.6, -.5), (3.67, -.5))
    wire(ax, (3.93, -.5), (7.2, -.5))
    wire(ax, (7.2, -.5), lower_b)
    # The gap in phase b at x=3.8 preserves the printed unconnected crossing.
    wire(ax, c, (-.2, -.95))
    wire(ax, (-.2, -.95), (3.8, -.95))
    wire(ax, (3.8, -.95), lower_c)
    for pos, name, offset in [(n, r'$n$', (0, -.45)), (o, r'$o$', (0, -.45)),
                              (a, r'$a$', (-.4, 0)), (b, r'$b$', (.35, 0)),
                              (c, r'$c$', (-.3, 0))]:
        node(ax, pos)
        text(ax, (pos[0]+offset[0], pos[1]+offset[1]), name)
    flow(ax, (3.4, 2.3), (4.3, 2.3))
    text(ax, (3.85, 2.7), r'$I_a$')
    flow(ax, (5.3, -.5), (6.3, -.5))
    text(ax, (5.8, -.12), r'$I_b$')
    flow(ax, (1.3, -.95), (2.3, -.95))
    text(ax, (1.8, -1.3), r'$I_c$')
    save(fig, 'e1-s25-q6', dark)


if __name__ == '__main__':
    from generate_figures import generate_paper
    generate_paper(Path(__file__).resolve().parent)
