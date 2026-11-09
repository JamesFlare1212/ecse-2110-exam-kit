"""Practice 1: reproduce only the two original R-X prompt diagrams.

The transformer test circuit is a revealed-solution figure, never a prompt.
Both locales own this renderer and their assets independently. All diagram
labels are the source's mathematical symbols; captions are authored Markdown.
"""
from pathlib import Path
import sys

ROOT = Path(__file__).resolve().parents[3]
sys.path.insert(0, str(ROOT / 'scripts'))
import plotting as p
import circuit_drawing as C

SVG_LABELS = {}


def wire(ax, a, b):
    p.line(ax, [a[0], b[0]], [a[1], b[1]], lw=2)


def terminal(ax, point):
    C.terminal(ax, point, radius=.055)


def label(ax, x, y, text, **kwargs):
    p.label(ax, x, y, text, fontsize=kwargs.pop('fontsize', 15), **kwargs)


def resistor(ax, a, b):
    C.resistor(ax, a, b)


def coil(ax, a, b):
    C.inductor(ax, a, b)


def base(height=5.4):
    fig, ax = p.plt.subplots(figsize=(11, height))
    p.canvas(ax, (0, 12), (0, height))
    p.equal_units(ax)
    return fig, ax


def compact_base(width, xlim, ylim):
    """Size prompt circuits to their content, not the solution diagram canvas."""
    fig, ax = p.plt.subplots(figsize=(width, 2))
    fig.subplots_adjust(left=0, right=1, bottom=0, top=1)
    p.canvas(ax, xlim, ylim)
    p.equal_units(ax)
    return fig, ax


def render_figures(save, dark):
    p.setup(dark)

    # Source PDF page 3: horizontal series R and inductive X, I to the right.
    fig, ax = compact_base(3.8, (-.25, 5.9), (-.85, 1.15))
    y = .2
    wire(ax, (0, y), (1.5, y))
    resistor(ax, (1.5, y), (2.8, y))
    wire(ax, (2.8, y), (3.0, y))
    coil(ax, (3.0, y), (4.4, y))
    wire(ax, (4.4, y), (5.6, y))
    terminal(ax, (0, y))
    terminal(ax, (5.6, y))
    p.arrow(ax, (.15, y), (1.05, y), color=p.INK)
    label(ax, .65, -.3, r'$I$', ha='center', fontsize=12)
    label(ax, 2.15, .8, r'$R$', ha='center', fontsize=12)
    label(ax, 3.7, .8, r'$X$', ha='center', fontsize=12)
    label(ax, 0, -.6, r'$+$', ha='center', fontsize=12)
    label(ax, 2.8, -.6, r'$V$', ha='center', fontsize=12)
    label(ax, 5.6, -.6, r'$-$', ha='center', fontsize=12)
    save(fig, 'p1-f26-q2', dark)

    # Source PDF page 4: vertical input, resistor left and inductive X right.
    fig, ax = compact_base(2.2, (-.3, 3.3), (-.2, 3.45))
    top, bottom = 2.65, .45
    wire(ax, (1.25, 3.15), (1.25, top))
    p.arrow(ax, (1.25, 3.1), (1.25, 2.73), color=p.INK)
    wire(ax, (1.25, bottom), (1.25, 0))
    terminal(ax, (1.25, 3.15))
    terminal(ax, (1.25, 0))
    for y in (top, bottom):
        wire(ax, (.4, y), (2.1, y))
    wire(ax, (.4, top), (.4, 2.3))
    resistor(ax, (.4, 2.3), (.4, .8))
    wire(ax, (.4, .8), (.4, bottom))
    wire(ax, (2.1, top), (2.1, 2.3))
    coil(ax, (2.1, 2.3), (2.1, .8))
    wire(ax, (2.1, .8), (2.1, bottom))
    label(ax, 1.7, 2.95, r'$I$', ha='center', fontsize=12)
    label(ax, -.05, 1.55, r'$R$', ha='center', va='center', fontsize=12)
    label(ax, 3.1, 1.55, r'$X$', ha='center', va='center', fontsize=12)
    label(ax, 1.25, 2.15, r'$+$', ha='center', va='center', fontsize=12)
    label(ax, 1.25, 1.55, r'$V$', ha='center', va='center', fontsize=12)
    label(ax, 1.25, .95, r'$-$', ha='center', va='center', fontsize=12)
    save(fig, 'p1-f26-q3', dark)

    # Pedagogical circuit requested by Q9(b), visible only in its solution.
    fig, ax = base(9.0)
    # Two reference frames of the same transformer, not two separate devices.
    for top, name, side in [(7.1, 'H', 'HV-referred'), (3.55, 'L', 'LV-referred')]:
        bottom = top-1.85
        label(ax, .9, top+.6, side, fontsize=13)
        wire(ax, (.9, top), (7.1, top))
        resistor(ax, (7.1, top), (8.3, top))
        wire(ax, (8.3, top), (8.8, top))
        coil(ax, (8.8, top), (10.1, top))
        wire(ax, (10.1, top), (11.2, top))
        wire(ax, (.9, bottom), (11.2, bottom))
        for x in (.9, 11.2):
            terminal(ax, (x, top))
            terminal(ax, (x, bottom))
        for x, shape in [(3.1, resistor), (5.3, coil)]:
            C.terminal(ax, (x, top), open=False)
            C.terminal(ax, (x, bottom), open=False)
            wire(ax, (x, top), (x, top-.3))
            shape(ax, (x, top-.3), (x, bottom+.3))
            wire(ax, (x, bottom+.3), (x, bottom))
        label(ax, 2.05, top-.925, rf'$R_{{c,{name}}}$', ha='center')
        label(ax, 6.7, top-.925, rf'$jX_{{m,{name}}}$', ha='center')
        label(ax, 7.65, top+.6, rf'$R_{{eq,{name}}}$', ha='center')
        label(ax, 9.65, top+.6, rf'$jX_{{eq,{name}}}$', ha='center')
    label(ax, 6, 4.65, r'$a=V_H/V_L=2,\qquad Z_H=a^2Z_L=4Z_L$', ha='center', fontsize=13)
    label(ax, 6, .7, 'OC (LV): shunt parameters · SC (HV): series parameters', ha='center', fontsize=11)
    save(fig, 'p1-f26-q9-b-solution', dark)


if __name__ == '__main__':
    from generate_figures import generate_paper
    generate_paper(Path(__file__).resolve().parent)
