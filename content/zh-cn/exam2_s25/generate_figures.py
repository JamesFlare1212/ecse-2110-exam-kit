"""Paper-owned solution circuit and static round-rotor power-angle model.

The printed questions contain no diagrams. Only the two mounted solution
figures are rendered; no legacy illustrative prompt schematics are restored.
"""
from pathlib import Path
import sys
import numpy as np

ROOT = Path(__file__).resolve().parents[3]
sys.path.insert(0, str(ROOT / 'scripts'))
import plotting as P
import circuit_drawing as C

SVG_LABELS = {
    'HV-referred equivalent circuit': '折算到高压侧的等效电路',
    'Stable branch': '稳定支路',
    'Unstable branch': '不稳定支路',
    'Round rotor · fixed voltage and excitation': '隐极模型 · 恒定端电压与励磁',
    'Electrical load angle (motor lag)': '电负载角（电动机转子滞后）',
    '90°: static-model boundary, not a universal limit': '90°：静态模型边界，非普遍失步极限',
}


def canvas(height=6):
    fig, ax = P.plt.subplots(figsize=(10.8, height))
    fig.subplots_adjust(left=.025, right=.975, bottom=.025, top=.975)
    P.canvas(ax, (0, 12), (0, height))
    return fig, ax


def text(ax, x, y, label, **kw):
    P.label(ax, x, y, label, ha=kw.pop('ha', 'center'), va='center',
            fontsize=kw.pop('fontsize', 12), **kw)


def wire(ax, points, **kw):
    P.line(ax, [point[0] for point in points], [point[1] for point in points], **kw)


def equivalent():
    fig, ax = canvas()
    P.equal_units(ax)
    top, bottom = 3.7, 1.65
    # Input shunt approximation: both excitation branches precede the
    # combined series impedance. All quantities are referred to the HV side.
    wire(ax, [(.85, top), (6.4, top)])
    C.resistor(ax, (6.4, top), (7.8, top))
    wire(ax, [(7.8, top), (8.5, top)])
    C.inductor(ax, (8.5, top), (10, top))
    wire(ax, [(10, top), (11.1, top)])
    wire(ax, [(.85, bottom), (11.1, bottom)])
    for x, symbol in [(3, C.resistor), (5, C.inductor)]:
        wire(ax, [(x, top), (x, 3.35)])
        symbol(ax, (x, 3.35), (x, 2))
        wire(ax, [(x, 2), (x, bottom)])
        for y in (top, bottom):
            C.terminal(ax, (x, y), open=False)
    for x in (.85, 11.1):
        for y in (top, bottom):
            C.terminal(ax, (x, y))
    text(ax, 7.1, 4.95, r'$R_{eq,H}$')
    text(ax, 7.1, 4.35, r'$0.180\,\Omega$')
    text(ax, 9.25, 4.95, r'$jX_{eq,H}$')
    text(ax, 9.25, 4.35, r'$j0.46648\,\Omega$')
    text(ax, 2.25, 2.95, r'$R_{cH}$', ha='right')
    text(ax, 2.25, 2.3, r'$2.500\,\mathrm{k}\Omega$', ha='right')
    text(ax, 5.65, 2.95, r'$jX_{mH}$', ha='left')
    text(ax, 5.65, 2.3, r'$j2.236\,\mathrm{k}\Omega$', ha='left')
    # The current after the shunt split is the referred load current.
    C.wire(ax, (10.25, top), (10.95, top), arrow='->', color=P.INK)
    text(ax, 10.8, 4.35, r"$I_L'$")
    text(ax, .85, 4.5, r'$V_H$')
    text(ax, .4, top, r'$+$')
    text(ax, .4, bottom, r'$-$')
    text(ax, 11.5, 2.68, r"$V_L'$")
    text(ax, 11.5, 3.3, r'$+$')
    text(ax, 11.5, 2.05, r'$-$')
    text(ax, 6, 5.65, 'HV-referred equivalent circuit', fontsize=13)
    return fig


def power_angle():
    # Unlike circuit geometry, torque and electrical angle have unlike units.
    fig, ax = canvas(6.4)
    P.canvas(ax, (-30, 195), (-.72, 1.8))
    P.arrow(ax, (0, 0), (190, 0), color=P.INK)
    P.arrow(ax, (0, 0), (0, 1.16), color=P.INK)
    stable = np.linspace(0, 90, 181)
    unstable = np.linspace(90, 180, 181)
    P.line(ax, stable, np.sin(np.deg2rad(stable)), color=P.TEAL, lw=2.5)
    P.line(ax, unstable, np.sin(np.deg2rad(unstable)), color=P.ORANGE, lw=2.5, ls='--')
    P.line(ax, [90, 90], [0, 1], color=P.MUTED, ls=':', lw=1.5)
    ax.plot(90, 1, 'o', color=P.INK, markersize=6)
    text(ax, -4, 1.28, r'$T_e/T_{\max}$', ha='right')
    text(ax, -5, 1, r'$1$', ha='right')
    for angle in (0, 90, 180):
        text(ax, angle, -.1, rf'${angle}^\circ$')
    text(ax, 55, .42, 'Stable branch', color=P.TEAL)
    text(ax, 55, .22, r'$dT_e/d\delta>0$', color=P.TEAL)
    text(ax, 125, .42, 'Unstable branch', color=P.ORANGE)
    text(ax, 125, .22, r'$dT_e/d\delta<0$', color=P.ORANGE)
    text(ax, 90, 1.19, r'$\delta=90^\circ:\quad dT_e/d\delta=0$')
    text(ax, 90, 1.68, 'Round rotor · fixed voltage and excitation', fontsize=13)
    text(ax, 90, 1.46, r'$R_a\simeq0,\qquad T_e=T_{\max}\sin\delta$')
    text(ax, 100, -.32, 'Electrical load angle (motor lag)')
    text(ax, 190, -.1, r'$\delta$')
    text(ax, 100, -.6, '90°: static-model boundary, not a universal limit', fontsize=11)
    return fig


def render_figures(save, dark):
    P.setup(dark)
    save(equivalent(), 'e2-s25-q6-equivalent', dark)
    save(power_angle(), 'e2-s25-q4-power-angle', dark)


if __name__ == '__main__':
    from generate_figures import generate_paper
    generate_paper(Path(__file__).resolve().parent)
