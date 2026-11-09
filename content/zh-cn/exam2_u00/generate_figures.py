"""Independent generator per-phase solution circuit, not a printed prompt.

Only the mounted Q3 solution figure is rendered. The balanced per-phase
reference is not evidence of a fourth physical conductor in the source system.
"""
from pathlib import Path
import sys

ROOT = Path(__file__).resolve().parents[3]
sys.path.insert(0, str(ROOT / 'scripts'))
import plotting as p
import circuit_drawing as C

SVG_LABELS = {
    'Balanced per-phase reference (not an added neutral wire)': '平衡单相等效参考（不代表增设实体中性导线）',
}


def drawing(dark):
    p.setup(dark)
    fig, ax = p.plt.subplots(figsize=(10.8, 5.5))
    p.canvas(ax, (0, 13), (-.55, 6.3))
    p.equal_units(ax)
    # The lower-left source-action area remains free of strokes and labels.
    return fig, ax


def text(ax, x, y, label, **kw):
    p.label(ax, x, y, label, fontsize=kw.pop('fontsize', 12),
            ha=kw.pop('ha', 'center'), va=kw.pop('va', 'center'), **kw)


def render_figures(save, dark):
    fig, ax = drawing(dark)
    top, reference = 3.8, 1.2
    C.source(ax, (2, reference), (2, top), kind='ac', radius=.55)
    C.wire(ax, (2, top), (4, top))
    C.inductor(ax, (4, top), (6.4, top))
    C.wire(ax, (6.4, top), (9.5, top))
    C.wire(ax, (7, top), (8.15, top), arrow='->', color=p.INK)
    # The load is the printed complex impedance, not an invented resistor.
    C.impedance(ax, (9.5, top), (9.5, reference))
    for y in (top, reference):
        C.terminal(ax, (9.5, y), open=False)
    # Dashed closure is an analytical balanced-phase reference only. A
    # physical neutral connection is neither specified nor needed by the model.
    p.line(ax, [2, 9.5], [reference, reference], color=p.MUTED, ls='--')
    text(ax, 6.8, .35, 'Balanced per-phase reference (not an added neutral wire)',
         color=p.MUTED, fontsize=11)
    text(ax, .65, 2.5, r'$E_A$')
    text(ax, 1.05, 3.25, r'$+$')
    text(ax, 1.05, 1.75, r'$-$')
    text(ax, 5.2, 3.08, r'$jX_s=j2\,\Omega$')
    text(ax, 5.2, 4.85, r'$jX_sI_A$')
    text(ax, 4, 4.35, r'$+$')
    text(ax, 6.4, 4.35, r'$-$')
    text(ax, 7.6, 4.35, r'$I_A$')
    text(ax, 8.35, 2.5, r'$V_\phi$')
    text(ax, 8.35, 3.25, r'$+$')
    text(ax, 8.35, 1.75, r'$-$')
    text(ax, 10.45, 2.95, r'$Z_L$', ha='left')
    text(ax, 10.45, 2.25, r'$10+j10\,\Omega$', ha='left')
    text(ax, 6.5, 5.75, r'$E_A=V_\phi+jX_sI_A$')
    save(fig, 'e2-u00-q3-circuit', dark)


if __name__ == '__main__':
    from generate_figures import generate_paper
    generate_paper(Path(__file__).resolve().parent)
