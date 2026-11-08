"""Paper-owned ECSE 2110 Fall 2026 static scientific diagrams.

Question figures contain the stated topology/givens only. The equivalent circuit
and phasor construction are solution figures. Run this file from any directory.
"""
from pathlib import Path
import sys
import math
import numpy as np

ROOT = Path(__file__).resolve().parents[3]
sys.path.insert(0, str(ROOT / 'scripts'))
import plotting as p
from matplotlib.patches import Rectangle, Circle

SVG_LABELS = {}


def base(height=5.8):
    fig, ax = p.plt.subplots(figsize=(11, height))
    p.canvas(ax, (-.2, 10.2), (-.6, height))
    return fig, ax


def text(ax, x, y, value, **kw):
    p.label(ax, x, y, value, fontsize=kw.pop('fontsize', 11), **kw)


def wire(ax, a, b, **kw):
    p.line(ax, [a[0], b[0]], [a[1], b[1]], **kw)


def resistor(ax, a, b):
    a, b = np.array(a), np.array(b)
    d = b-a
    n = np.array([-d[1], d[0]])/np.linalg.norm(d)
    pts = [a]
    for i in range(1, 12):
        pts.append(a+d*i/12+n*(.085 if i % 2 else -.085))
    pts.append(b)
    q = np.array(pts)
    p.line(ax, q[:, 0], q[:, 1])


def coil(ax, a, b):
    a, b = np.array(a), np.array(b)
    d = b-a
    n = np.array([-d[1], d[0]])/np.linalg.norm(d)
    t = np.linspace(0, 1, 200)
    q = a+t[:, None]*d+(.14*np.abs(np.sin(5*np.pi*t)))[:, None]*n
    p.line(ax, q[:, 0], q[:, 1])


def dot(ax, a):
    ax.add_patch(Circle(a, .035, fc=p.INK, ec=p.INK))


def voltage_source(ax, x, bottom, top):
    mid=(bottom+top)/2
    wire(ax,(x,bottom),(x,mid-.32))
    wire(ax,(x,mid+.32),(x,top))
    ax.add_patch(Circle((x,mid),.32,fc=p.PAPER,ec=p.INK,lw=1.5))
    t=np.linspace(-np.pi,np.pi,60)
    p.line(ax,x+.21*t/np.pi,mid+.12*np.sin(t))


def transformer(ax, x, y):
    # Two isolated windings with a shared laminated core.
    coil(ax, (x, y), (x, y+1.15))
    coil(ax, (x+1.15, y+1.15), (x+1.15, y))
    for xx in [x+.47, x+.67]:
        wire(ax, (xx, y-.03), (xx, y+1.18), lw=2)


def render_figures(save, dark):
    p.setup(dark)

    fig, ax = base()
    ax.add_patch(Rectangle((2.6, 1.3), 4.7, 3.4, fc=p.FILL, ec=p.INK, lw=2))
    ax.add_patch(Rectangle((3.4, 2.0), 3.1, 2, fc=p.PAPER, ec=p.INK, lw=2))
    for x in [2.45, 6.85]:
        for y in np.linspace(2.2, 3.7, 7):
            wire(ax, (x, y), (x+.6, y+.15), color=p.ORANGE, lw=2.4)
    text(ax, .5, 3.5, 'AC input')
    wire(ax, (1.8, 3.4), (2.45, 3.4))
    text(ax, 7.7, 3.4, 'Output')
    wire(ax, (7.4, 3.2), (7.85, 3.2))
    p.arrow(ax, (4.2, 4.35), (5.8, 4.35), color=p.TEAL)
    text(ax, 5, 5.08, r'$\Phi(t)$', ha='center', color=p.TEAL)
    text(ax, 5, .7, 'Core and windings', ha='center')
    save(fig, 'e1-f26-q1', dark)

    fig, ax = base()
    t = np.linspace(0, 4*np.pi, 500)
    x = .7+8.6*t/(4*np.pi)
    wire(ax, (.5, 2.8), (9.6, 2.8), color=p.MUTED)
    wire(ax, (.7, 1.0), (.7, 4.9), color=p.MUTED)
    p.line(ax, x, 2.8+1.35*np.cos(t), color=p.TEAL, lw=2)
    p.line(ax, x, 2.8+.95*np.cos(t-np.pi/3), color=p.ORANGE, lw=2)
    text(ax, 2.1, 5.2, r'$v(t)=V_m\cos\omega t$', color=p.TEAL)
    text(ax, 5.8, 5.2, r'$i(t)=I_m\cos(\omega t-\theta)$', color=p.ORANGE)
    text(ax, 9.5, 2.35, r'$t$', ha='center')
    text(ax, 5, .7, 'Arbitrary normalized amplitudes', ha='center')
    save(fig, 'e1-f26-q2', dark)

    fig, ax = base()
    ax.set_aspect('equal')
    center = np.array([3.7, 2.9])
    steel = [np.array([0., 0.])]+[.5*np.array([math.cos(a), math.sin(a)]) for a in np.linspace(0, 2*np.pi, 6, endpoint=False)]
    for off in steel:
        ax.add_patch(Circle(center+off, .24, ec=p.INK, fc=p.MUTED, lw=1.6))
    for a in np.linspace(0, 2*np.pi, 12, endpoint=False):
        ax.add_patch(Circle(center+np.array([math.cos(a), math.sin(a)]), .24, ec=p.TEAL, fc=p.FILL, lw=1.6))
    wire(ax, (3.7, 2.9), (6.2, 4.4), color=p.MUTED)
    wire(ax, (4.7, 2.9), (6.2, 2.25), color=p.TEAL)
    text(ax, 6.4, 4.4, 'Steel core', va='center')
    text(ax, 6.4, 2.25, 'Aluminum strands', va='center', color=p.TEAL)
    text(ax, 5, .7, 'Illustrative cross-section', ha='center')
    save(fig, 'e1-f26-q3', dark)

    fig, ax = base()
    text(ax, 5, 5.32, r'$3\phi\quad V_L=12.47\ \mathrm{kV}$', ha='center')
    wire(ax, (.8, 4.6), (9.25, 4.6), lw=2)
    labels = ['Load 1\n60 kW\n660 kvar\nInductive', 'Load 2\n240 kW\nPF = 0.8\nCapacitive', 'Load 3\n60 kW\nResistive', 'Y capacitor\nbank\nC per phase?']
    for x, label in zip([1.15, 3.65, 6.15, 8.65], labels):
        wire(ax, (x, 4.6), (x, 3.9)); dot(ax, (x, 4.6))
        ax.add_patch(Rectangle((x-1.05, 1.6), 2.1, 2.3, ec=p.TEAL if x>8 else p.INK, fc=p.FILL, lw=1.6, ls='--' if x>8 else '-'))
        text(ax, x, 2.75, label, ha='center', va='center', fontsize=10.5)
    text(ax, 5.0, .75, 'Parallel three-phase loads', ha='center')
    save(fig, 'e1-f26-q4', dark)

    fig, ax = base(6.4)
    for y, name, end in [(5.1, 'a', 9), (3.85, 'b', 7.05), (2.6, 'c', 9)]:
        text(ax, .25, y, '$'+name+'$', ha='center', va='center')
        wire(ax, (.55, y), (2.0, y)); coil(ax, (2.0, y), (2.8, y)); wire(ax, (2.8, y), (end, y))
        ax.add_patch(Circle((.55, y), .04, ec=p.INK, fc=p.PAPER))
    text(ax, 2.4, 5.67, r'$j3\ \Omega$', ha='center')
    text(ax, .7, 4.4, r'$|V_L|=346.41\ \mathrm{V}$', fontsize=10)
    # Delta retains the printed left-middle/right-top/right-bottom perspective.
    a, b, c = np.array([9, 5.1]), np.array([7.05, 3.85]), np.array([9, 2.6])
    for start, end in [(a,b),(b,c),(a,c)]:
        d=end-start
        wire(ax, start, start+.35*d); resistor(ax, start+.35*d, start+.65*d); wire(ax, start+.65*d, end)
    for at, name in [(a,'a'),(b,'b'),(c,'c')]:
        dot(ax, at); text(ax, at[0]-.35 if name=='b' else at[0]+.25, at[1]+.28 if name=='b' else at[1]+.15, '$'+name+'$')
    text(ax, 9.25, 3.82, r'$18\ \Omega$', va='center', fontsize=10)
    # Crossings have no junction dots; only the three actual taps are joined.
    for x,y in [(5.8,5.1),(4.2,3.85),(8.1,2.6)]: dot(ax,(x,y))
    wire(ax,(5.8,5.1),(5.8,2.3)); resistor(ax,(5.8,2.3),(5.8,1.5));wire(ax,(5.8,1.5),(5.8,1.1))
    text(ax,6.05,1.95,r'$12\ \Omega$',va='center',fontsize=10)
    wire(ax,(4.2,3.85),(4.2,.35)); resistor(ax,(4.2,.35),(5.2,.9));wire(ax,(5.2,.9),(5.8,1.1))
    wire(ax,(8.1,2.6),(8.1,.35));resistor(ax,(8.1,.35),(6.6,.9));wire(ax,(6.6,.9),(5.8,1.1))
    dot(ax,(5.8,1.1));text(ax,5.8,.6,r'$n$',ha='center')
    save(fig,'e1-f26-q5',dark)

    fig,ax=base(6.4)
    for y, is_open in [(3.8,True),(.8,False)]:
        transformer(ax,4.3,y)
        text(ax,4.1,y+1.5,'220 V',ha='right');text(ax,5.65,y+1.5,'440 V')
        # Outer loop on the energized winding; the other winding is open/shorted.
        if is_open:
            for yy in [y,y+1.15]: wire(ax,(2,yy),(4.3,yy));wire(ax,(5.45,yy),(7.6,yy))
            voltage_source(ax,2,y,y+1.15)
            for yy in [y,y+1.15]: ax.add_patch(Circle((7.6,yy),.055,fc=p.PAPER,ec=p.INK))
            text(ax,1.5,y+.5,'AC',ha='right');text(ax,8,y+.5,'Open',va='center')
            text(ax,5,y-.55,'Open-circuit: 220 V, 9.5 A, 650 W',ha='center')
        else:
            for yy in [y,y+1.15]: wire(ax,(2,yy),(4.3,yy));wire(ax,(5.45,yy),(7.6,yy))
            wire(ax,(2,y),(2,y+1.15));voltage_source(ax,7.6,y,y+1.15)
            text(ax,1.5,y+.5,'Shorted',ha='right');text(ax,8,y+.5,'AC',va='center')
            text(ax,5,y-.55,'Short-circuit: 37.5 V, 55 A, 950 W',ha='center')
    save(fig,'e1-f26-q6',dark)

    fig,ax=base()
    top,bottom=4.1,1.4
    wire(ax,(.8,top),(5.2,top));resistor(ax,(5.2,top),(6.3,top));coil(ax,(6.3,top),(7.5,top));wire(ax,(7.5,top),(9.2,top))
    wire(ax,(.8,bottom),(9.2,bottom))
    for x, kind in [(2.4,'r'),(3.9,'x')]:
        wire(ax,(x,top),(x,3.5))
        (resistor if kind=='r' else coil)(ax,(x,3.5),(x,2.0))
        wire(ax,(x,2.0),(x,bottom));dot(ax,(x,top));dot(ax,(x,bottom))
    text(ax,.45,2.7,r'$v_1$',ha='center');text(ax,8.6,2.7,r"$v_2'$",ha='center')
    text(ax,2.2,2.75,r'$38.4615$',ha='right',fontsize=10)
    text(ax,4.2,2.75,r'$j12.5859$',fontsize=10)
    text(ax,5.65,4.7,r'$0.0405539$',ha='center',fontsize=10)
    text(ax,7.3,5.3,r'$j0.0781489$',ha='center',fontsize=10)
    text(ax,5,.65,'All impedances in per-unit',ha='center')
    save(fig,'e1-f26-q6-equivalent',dark)

    fig,axs=p.plt.subplots(1,2,figsize=(12,5.4))
    r=950/55**2/(440**2/25000)
    x=math.sqrt((37.5/55)**2-(950/55**2)**2)/(440**2/25000)
    dr=(.8-.6j)*r;dx=1j*(.8-.6j)*x;v=1+dr+dx
    ax=axs[0];p.canvas(ax,(-.08,1.23),(-.55,.28));ax.set_aspect('equal')
    def vec(ax,a,b,color):p.arrow(ax,(a.real,a.imag),(b.real,b.imag),color=color)
    wire(ax,(0,0),(1.16,0),color=p.GRID)
    vec(ax,0j,1+0j,p.TEAL);vec(ax,0j,v,p.ORANGE);vec(ax,0j,.6*(.8-.6j),p.INK)
    text(ax,.48,.18,r'$v_1=1.08001\angle2.026^\circ$',ha='center',fontsize=10,color=p.ORANGE)
    text(ax,.7,-.12,r"$v_2'=1\angle0^\circ$",ha='center',fontsize=10,color=p.TEAL)
    text(ax,.28,-.48,r"$i_2'=1\angle-36.87^\circ$",ha='center',fontsize=10)
    ax.set_title('Voltage and current phasors',pad=22)
    ax=axs[1];p.canvas(ax,(-.025,.13),(-.055,.075));ax.set_aspect('equal')
    wire(ax,(-.01,0),(.115,0),color=p.GRID)
    vec(ax,0j,dr,p.INK);vec(ax,dr,dr+dx,p.TEAL);vec(ax,0j,dr+dx,p.ORANGE)
    text(ax,.002,-.045,r"$i_2'r_{\mathrm{eq}}$",fontsize=10)
    text(ax,.09,-.002,r"$ji_2'x_{\mathrm{eq}}$",fontsize=10)
    text(ax,.02,.06,r"$v_1-v_2'$",fontsize=10,color=p.ORANGE)
    ax.set_title('Enlarged voltage-drop construction',pad=22)
    save(fig,'e1-f26-q6-phasor',dark)


if __name__=='__main__':
    from generate_figures import generate_paper
    generate_paper(Path(__file__).resolve().parent)
