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


def board(dark):
    p.setup(dark)
    fig, ax = p.plt.subplots(figsize=(10, 4.8))
    ax.set(xlim=(-.5, 10), ylim=(-1.8, 4.1))
    ax.axis('off')
    p.equal_units(ax)
    return fig, ax


def wire(ax, a, b, **kw):
    C.wire(ax, a, b, lw=kw.pop('lw', 1.8), **kw)


def text(ax, xy, value, **kw):
    p.label(ax, *xy, value, ha=kw.pop('ha', 'center'), va='center',
            fontsize=kw.pop('fontsize', 11), **kw)


def flow(ax, a, b):
    C.wire(ax, a, b, arrow='->', color=p.ORANGE, lw=1.7)


def impedance(ax, a, b):
    # A fixed-size standard IEC body keeps all six symbolic Z branches equal;
    # Schemdraw supplies the leads, including the diagonal ones.
    C.place(ax, E.ResistorIEC(), a, b, scale=.8)


def node(ax, at):
    C.terminal(ax, at, radius=.045, open=False)


def source(ax, a, b, name):
    # Source has a preset theta=90; explicitly orient the diagonal branches.
    delta = np.array(b)-np.array(a)
    angle = np.degrees(np.arctan2(delta[1], delta[0]))
    C.place(ax, E.Source().theta(angle).fill(p.PAPER), a, b, scale=.64)
    text(ax, (np.array(a)+np.array(b))/2, name, fontsize=9)


def render_figures(save, dark):
    fig, ax = board(dark)
    # Preserve the source orientation: a above, c lower left, b lower right.
    for shift, star in [(0, False), (5.2, True)]:
        a, c, b = (shift+2, 2.7), (shift+.45, .1), (shift+3.55, .1)
        if star:
            n = (shift+2, 1.25)
            for end in [a, b, c]:
                impedance(ax, end, n)
            node(ax, n)
            text(ax, (shift+2.6, 2.05), r'$Z_Y$')
            text(ax, (shift+2.95, 1.12), r'$Z_Y$')
            text(ax, (shift+.95, 1.12), r'$Z_Y$')
            text(ax, (shift+2, .8), r'$n$')
        else:
            for start, end in [(a, b), (b, c), (c, a)]:
                impedance(ax, start, end)
            text(ax, (shift+.65, 1.7), r'$Z_\Delta$')
            text(ax, (shift+3.35, 1.7), r'$Z_\Delta$')
            text(ax, (shift+2, -.35), r'$Z_\Delta$')
        for pos, outer, name, current in [
                (a, (a[0], 3.45), r'$a$', r'$I_a$'),
                (c, (c[0]-.4, -.2), r'$c$', r'$I_c$'),
                (b, (b[0]+.4, -.2), r'$b$', r'$I_b$')]:
            wire(ax, outer, pos)
            flow(ax, outer, pos)
            node(ax, pos)
            C.terminal(ax, outer, radius=.04)
            text(ax, (outer[0], outer[1]+(.3 if name == r'$a$' else -.28)), name)
            if name == r'$a$':
                text(ax, (outer[0]+.45, 3.15), current)
            else:
                text(ax, (outer[0]+(-.2 if name == r'$c$' else .2), .4), current)
    save(fig, 'e1-s25-q3', dark)

    fig, ax = board(dark)
    # Printed supply polarity and the three numbered generic loads only;
    # the capacitor requested in part (b) is NOT added to the question figure.
    C.source(ax, (1.5, 0), (1.5, 3), kind='voltage', radius=.38)
    text(ax, (.4, 1.5), r'$1400\,\mathrm{V}$', fontsize=10)
    wire(ax, (1.5, 3), (8.5, 3))
    wire(ax, (1.5, 0), (8.5, 0))
    text(ax, (5, 3.75), r'$60\,\mathrm{Hz}$')
    flow(ax, (2, 3), (2.8, 3))
    text(ax, (2.4, 3.45), r'$I$')
    for x, number in [(3.5, 1), (6, 2), (8.5, 3)]:
        wire(ax, (x, 3), (x, 2.1))
        wire(ax, (x, .9), (x, 0))
        C.place(ax, E.ResistorIEC(), (x, 2.1), (x, .9), scale=1.2)
        text(ax, (x, 1.5), str(number))
        flow(ax, (x, 2.9), (x, 2.25))
        text(ax, (x+.42, 2.55), f'$I_{number}$')
    save(fig, 'e1-s25-q5', dark)

    fig, ax = board(dark)
    n, o = (1.7, 1.15), (6.7, 1.15)
    a, b, c = (1.7, 3.45), (3.4, -.15), (.2, -.15)
    source(ax, n, a, r'$E_{an}$')
    source(ax, n, b, r'$E_{bn}$')
    source(ax, n, c, r'$E_{cn}$')
    # Source neutral n and floating load neutral o are never connected.
    wire(ax, a, (6.7, 3.45))
    wire(ax, (6.7, 3.45), (6.7, 2.8))
    C.resistor(ax, (6.7, 2.8), (6.7, 1.8))
    wire(ax, (6.7, 1.8), o)
    text(ax, (7.4, 2.45), r'$5\,\Omega$')
    # Phase c: the printed 3-ohm resistance and +j4 reactance stay in series.
    lower_c, lower_b = (4.6, -.15), (8.6, -.15)
    u = np.array(o)-np.array(lower_c)
    u /= np.linalg.norm(u)
    mid = np.array(lower_c)+.85*u
    C.resistor(ax, lower_c, mid)
    left, right = mid+.15*u, np.array(o)-.25*u
    wire(ax, mid, left)
    C.inductor(ax, left, right)
    wire(ax, right, o)
    text(ax, (5.0, 1.25), r'$3+j4\,\Omega$')
    # Phase b is capacitive (-j5), not an inductive +j5 element.
    C.place(ax, E.Capacitor(), o, lower_b, scale=.88)
    text(ax, (8.3, 1.25), r'$-j5\,\Omega$')
    wire(ax, b, (3.4, -.6))
    wire(ax, (3.4, -.6), (4.37, -.6))
    wire(ax, (4.63, -.6), (8.6, -.6))
    wire(ax, (8.6, -.6), lower_b)
    # The gap in phase b at x=4.5 preserves the printed unconnected crossing.
    wire(ax, c, (.2, -1))
    wire(ax, (.2, -1), (4.5, -1))
    wire(ax, (4.5, -1), lower_c)
    for pos, name, offset in [(n, r'$n$', (0, -.4)), (o, r'$o$', (0, -.4)),
                              (a, r'$a$', (-.4, 0)), (b, r'$b$', (-.35, 0)),
                              (c, r'$c$', (-.3, 0))]:
        node(ax, pos)
        text(ax, (pos[0]+offset[0], pos[1]+offset[1]), name)
    flow(ax, (3.8, 3.45), (4.8, 3.45))
    text(ax, (4.3, 3.85), r'$I_a$')
    flow(ax, (6, -.6), (7, -.6))
    text(ax, (6.5, -.2), r'$I_b$')
    flow(ax, (2.1, -1), (3.1, -1))
    text(ax, (2.6, -1.4), r'$I_c$')
    save(fig, 'e1-s25-q6', dark)


if __name__ == '__main__':
    from generate_figures import generate_paper
    generate_paper(Path(__file__).resolve().parent)
