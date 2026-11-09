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

SVG_LABELS = {
    'HV-referred': '折算到高压侧',
    'LV-referred': '折算到低压侧',
    'OC (LV): shunt parameters · SC (HV): series parameters': '空载试验（低压侧）：并联参数 · 短路试验（高压侧）：串联参数',
}


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


def render_figures(save, dark):
    p.setup(dark)

    # Source PDF page 3: horizontal series R and inductive X, I to the right.
    fig, ax = base()
    y = 3.1
    wire(ax, (1.7, y), (4.1, y))
    resistor(ax, (4.1, y), (5.5, y))
    wire(ax, (5.5, y), (6.2, y))
    coil(ax, (6.2, y), (7.7, y))
    wire(ax, (7.7, y), (10.3, y))
    terminal(ax, (1.7, y))
    terminal(ax, (10.3, y))
    p.arrow(ax, (2.3, y), (3.4, y), color=p.INK)
    label(ax, 2.8, 2.52, r'$I$', ha='center')
    label(ax, 4.8, 3.72, r'$R$', ha='center')
    label(ax, 6.95, 3.72, r'$X$', ha='center')
    label(ax, 1.7, 2.28, r'$+$', ha='center')
    label(ax, 6, 2.28, r'$V$', ha='center')
    label(ax, 10.3, 2.28, r'$-$', ha='center')
    save(fig, 'p1-f26-q2', dark)

    # Source PDF page 4: vertical input, resistor left and inductive X right.
    fig, ax = base()
    top, bottom = 3.95, 1.6
    wire(ax, (6, 4.7), (6, top))
    p.arrow(ax, (6, 4.55), (6, 4.13), color=p.INK)
    wire(ax, (6, bottom), (6, 1.08))
    terminal(ax, (6, 4.7))
    terminal(ax, (6, 1.08))
    for y in (top, bottom):
        wire(ax, (4.5, y), (7.5, y))
    wire(ax, (4.5, top), (4.5, 3.48))
    resistor(ax, (4.5, 3.48), (4.5, 2.08))
    wire(ax, (4.5, 2.08), (4.5, bottom))
    wire(ax, (7.5, top), (7.5, 3.48))
    coil(ax, (7.5, 3.48), (7.5, 2.08))
    wire(ax, (7.5, 2.08), (7.5, bottom))
    label(ax, 6.65, 4.43, r'$I$', ha='center')
    label(ax, 3.7, 2.78, r'$R$', ha='center')
    label(ax, 8.3, 2.78, r'$X$', ha='center')
    label(ax, 6, 3.48, r'$+$', ha='center')
    label(ax, 6, 2.78, r'$V$', ha='center')
    label(ax, 6, 2.08, r'$-$', ha='center')
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
