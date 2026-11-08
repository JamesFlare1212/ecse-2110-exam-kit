"""Paper-local Exam 2 drawings; illustrative question schematics, sourced solution circuit.

The two locales own independent copies of this renderer and its outputs. No
question text or worked solution is authored or compiled by this drawing script.
"""
from pathlib import Path
import sys
import numpy as np
from matplotlib.patches import Circle, Rectangle, Arc, Wedge

ROOT = Path(__file__).resolve().parents[3]
sys.path.insert(0, str(ROOT / 'scripts'))
import plotting as P

SVG_LABELS = {}


def canvas():
    fig, ax = P.plt.subplots(figsize=(10.8, 3.8))
    fig.subplots_adjust(left=.025, right=.975, bottom=.025, top=.975)
    P.canvas(ax, (0, 12), (0, 4.5))
    return fig, ax


def text(ax, x, y, label, **kw):
    P.label(ax, x, y, label, ha=kw.pop('ha', 'center'), va='center', fontsize=kw.pop('fontsize', 11), **kw)


def wire(ax, points, **kw):
    P.line(ax, [p[0] for p in points], [p[1] for p in points], **kw)


def box(ax, x, y, w, h):
    ax.add_patch(Rectangle((x, y), w, h, facecolor=P.FILL, edgecolor=P.TEAL, lw=1.8))


def coil(ax, x0, x1, y):
    x = np.linspace(x0, x1, 220)
    P.line(ax, x, y+.17*np.sin(np.linspace(0, 8*np.pi, len(x))), color=P.ORANGE, lw=2)


def resistor(ax, x0, x1, y):
    P.resistor(ax, (x0, y), (x1, y), '')


def machine_axes(ax, center, radius=1.05):
    x, y = center
    ax.add_patch(Circle(center, radius, fc='none', ec=P.MUTED, lw=1.8))
    ax.add_patch(Circle(center, radius*.65, fc=P.FILL, ec=P.TEAL, lw=1.8))
    P.arrow(ax, center, (x+.30, y+.58), color=P.TEAL)
    P.arrow(ax, center, (x+.73, y+.73), color=P.ORANGE)
    text(ax, x-.75, y+.85, 'S', color=P.ORANGE)
    text(ax, x+.60, y-.66, 'N', color=P.TEAL)


def question1():
    fig, ax = canvas()
    text(ax, 6, 4, 'Rotor field winding')
    wire(ax, [(1.0, 2.8), (2, 2.8)])
    for x in [2, 4, 6, 8]:
        coil(ax, x, x+1.2, 2.8)
        wire(ax, [(x+1.2, 2.8), (x+2.0, 2.8)])
        text(ax, x+.6, 2.05, '$N_f$')
    wire(ax, [(10, 2.8), (10.3, 2.8), (10.3, 1.25), (1, 1.25)])
    text(ax, .8, 2.6, '+')
    text(ax, .8, 1.3, '−')
    text(ax, 6.1, .85, 'DC excitation')
    return fig


def question2():
    fig, ax = canvas()
    machine_axes(ax, (4.0, 2.5), 1.2)
    text(ax, 4.0, 4.1, 'Rotating fields')
    P.arrow(ax, (5.6, 2.9), (6.5, 2.9), color=P.ORANGE)
    text(ax, 8.7, 3.1, 'Stator field')
    text(ax, 11, 3.1, '$n_s$')
    text(ax, 8.7, 2.1, 'Rotor field')
    text(ax, 11, 2.1, '$n_r$')
    text(ax, 9, 1.1, r'$f,\ P$')
    return fig


def question3():
    fig, ax = canvas()
    ax.add_patch(Wedge((5.5, 2.5), .9, 95, 265, fc=P.ORANGE, ec=P.INK, lw=1.5))
    ax.add_patch(Wedge((5.5, 2.5), .9, 275, 445, fc=P.FILL, ec=P.TEAL, lw=1.5))
    box(ax, 4.15, 2.31, .5, .38)
    box(ax, 6.35, 2.31, .5, .38)
    wire(ax, [(4.15, 2.5), (2.3, 2.5), (2.3, 1.05), (4.0, 1.05)])
    wire(ax, [(6.85, 2.5), (8.8, 2.5), (8.8, 1.05), (7.0, 1.05)])
    for x in [4.0, 7.0]:
        ax.add_patch(Circle((x, 1.05), .045, fc=P.PAPER, ec=P.INK, lw=1.5))
    text(ax, 5.5, 4.0, 'Two copper segments')
    text(ax, 2.3, 3.25, 'Brush')
    text(ax, 8.8, 3.25, 'Brush')
    text(ax, 5.5, 1.05, 'DC terminals')
    text(ax, 5.5, 2.5, r'$\omega$')
    return fig


def question4():
    fig, ax = canvas()
    machine_axes(ax, (3.2, 2.5), 1.1)
    text(ax, 3.2, 4.05, 'Synchronous machine')
    wire(ax, [(4.3, 2.5), (7.0, 2.5)], lw=2.5)
    box(ax, 7.0, 1.65, 2.9, 1.7)
    text(ax, 8.45, 2.5, 'Mechanical load')
    text(ax, 5.6, 3.15, '$T_L$')
    text(ax, 8.1, 1.0, 'Rotor–field angle')
    text(ax, 10.7, 1.0, r'$\delta$')
    return fig


def question5():
    fig, ax = canvas()
    for x, title, voltage in [(1.0, 'Machine 1', '120 V'), (7.1, 'Machine 2', '240 V')]:
        box(ax, x, 1.45, 3.9, 2.25)
        text(ax, x+1.95, 3.2, title)
        text(ax, x+1.95, 2.5, voltage)
        text(ax, x+1.95, 1.85, '1500 rpm · 4 poles')
    text(ax, 6, .85, 'Available coils: 4 V, 5 A')
    return fig


def transformer(ax, x, y):
    box(ax, x, y, 3.6, 1.7)
    text(ax, x+1.8, y+1.12, 'Transformer')
    text(ax, x+1.8, y+.52, r'$1\phi$')


def question6():
    fig, ax = canvas()
    transformer(ax, .5, 2.0)
    text(ax, 2.3, 4.0, '100 kVA · 1000/100 V')
    text(ax, 8.25, 3.7, 'Open circuit: HV open')
    text(ax, 8.25, 3.0, 'LV: 100 V, 6.0 A, 400 W')
    text(ax, 8.25, 2.0, 'Short circuit: 50 V, 100 A, 1800 W')
    text(ax, 8.25, 1.2, 'Full load · PF 0.6 leading')
    return fig


def question7():
    fig, ax = canvas()
    transformer(ax, .4, 2.0)
    text(ax, 2.2, 4.05, '5 kVA · 240/120 V · 60 Hz')
    box(ax, 6.2, 2.75, 4.8, .9)
    text(ax, 8.6, 3.2, '(a) 5 kVA · PF 0.8')
    box(ax, 6.2, 1.4, 4.8, .9)
    text(ax, 8.6, 1.85, '(b) 2 kVA · PF 0.8')
    text(ax, 6.6, .75, 'Core: 100 W · rated copper: 120 W')
    return fig


def equivalent():
    fig, ax = canvas()
    # Input shunt branch followed by combined leakage series impedance.
    wire(ax, [(1.3, 2.8), (5.3, 2.8)])
    resistor(ax, 5.3, 6.4, 2.8)
    wire(ax, [(6.4, 2.8), (7.4, 2.8)])
    coil(ax, 7.4, 8.6, 2.8)
    wire(ax, [(8.6, 2.8), (10.5, 2.8)])
    wire(ax, [(1.3, 1.25), (10.5, 1.25)])
    # Core-loss resistor with horizontal labels placed away from both branches.
    wire(ax, [(2.6, 2.8), (2.6, 2.55)])
    yy=np.linspace(2.55, 1.5, 11);xx=2.6+.1*np.array([0,1,-1,1,-1,1,-1,1,-1,1,0])
    P.line(ax, xx, yy)
    wire(ax, [(2.6, 1.5), (2.6, 1.25)])
    yy=np.linspace(1.5, 2.55, 180)
    P.line(ax, 4.1+.13*np.sin(np.linspace(0,8*np.pi,len(yy))), yy, color=P.ORANGE)
    wire(ax, [(4.1, 2.55), (4.1, 2.8)])
    wire(ax, [(4.1, 1.5), (4.1, 1.25)])
    text(ax, 5.85, 3.5, r'$0.180\,\Omega$')
    text(ax, 8.0, 3.5, r'$j0.46648\,\Omega$')
    text(ax, 1.8, 2.0, r'$2.5\,\mathrm{k}\Omega$', ha='right', fontsize=10)
    text(ax, 4.1, .75, r'$j2.236\,\mathrm{k}\Omega$', fontsize=10)
    text(ax, .8, 3.5, '$V_H$', fontsize=10)
    text(ax, 11.1, 2.0, "$V_L'$", fontsize=10)
    text(ax, 6, 4.1, 'HV-referred equivalent circuit')
    return fig


def power_angle():
    fig, ax = canvas()
    origin=(1.7,1.0)
    P.arrow(ax, origin, (11.0, 1.0), color=P.INK)
    P.arrow(ax, origin, (1.7, 4.0), color=P.INK)
    theta=np.linspace(0,np.pi,250)
    P.line(ax, 1.7+8.5*theta/np.pi, 1+2.2*np.sin(theta), color=P.TEAL, lw=2.5)
    P.line(ax, [5.95,5.95], [1,3.2], color=P.MUTED, ls='--')
    text(ax, 1.1, 3.7, '$T_e$')
    text(ax, 11.2, 1.0, r'$\delta$')
    text(ax, 5.95, .6, r'$90^\circ$')
    text(ax, 10.2, .6, r'$180^\circ$')
    text(ax, 5.95, 3.8, r'$T_{\max}$')
    text(ax, 3.6, 3.4, 'Stable branch', fontsize=10)
    text(ax, 8.6, 3.4, 'Unstable branch', fontsize=10)
    text(ax, 9.7, 4.0, r'$T_e=T_{\max}\sin\delta$', fontsize=10)
    return fig


def render_figures(save, dark):
    P.setup(dark)
    for number, draw in enumerate([question1, question2, question3, question4, question5, question6, question7], 1):
        save(draw(), f'e2-s25-q{number}', dark)
    save(equivalent(), 'e2-s25-q6-equivalent', dark)
    save(power_angle(), 'e2-s25-q4-power-angle', dark)


if __name__ == '__main__':
    from generate_figures import generate_paper
    generate_paper(Path(__file__).resolve().parent)
