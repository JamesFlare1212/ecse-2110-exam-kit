"""Exam 2 illustrations and the requested generator equivalent circuit.

The scanned questions contain no printed diagrams. Main figures are explicitly
illustrative and contain givens only; the equivalent circuit is solution-only.
"""
from pathlib import Path
import sys
import math

ROOT = Path(__file__).resolve().parents[3]
sys.path.insert(0, str(ROOT / 'scripts'))
import plotting as p
from matplotlib.patches import Circle, Rectangle
import numpy as np

ZH = Path(__file__).resolve().parents[1].name == 'zh-cn'
SVG_LABELS = ({
    'Illustrative winding layout': '绕组位置示意图',
    'Same current angle': '电流相角相同',
    'Illustrative system': '系统连接示意图',
    'Generator': '发电机', 'Load': '负载', 'Turbine': '汽轮机',
    'Illustrative delta connection': '三角形连接示意图',
    'Neutral return': '中性线回路',
} if ZH else {})


def drawing(dark):
    p.setup(dark)
    fig, ax = p.plt.subplots(figsize=(8.4, 4.2))
    ax.set_xlim(0, 12)
    ax.set_ylim(-.7, 5.3)
    ax.set_aspect('equal')
    ax.axis('off')
    # The lower-left action area is deliberately free of strokes and labels.
    return fig, ax


def text(ax, x, y, label, **kw):
    p.label(ax, x, y, label, fontsize=kw.pop('fontsize', 11), **kw)


def box(ax, x, y, w, h, label):
    ax.add_patch(Rectangle((x,y),w,h,facecolor=p.FILL,edgecolor=p.INK,lw=1.8))
    text(ax,x+w/2,y+h/2,label,ha='center',va='center')


def three_lines(ax, x1, x2, y):
    for dy in [-.22,0,.22]:
        p.line(ax,[x1,x2],[y+dy,y+dy],color=p.TEAL,lw=1.7)


def coil(ax, a, b, name='', offset=(0,.5)):
    a=np.array(a,dtype=float); b=np.array(b,dtype=float)
    unit=(b-a)/np.linalg.norm(b-a); normal=np.array([-unit[1],unit[0]])
    start=a+.18*(b-a); end=b-.18*(b-a)
    p.line(ax,[a[0],start[0]],[a[1],start[1]])
    p.line(ax,[end[0],b[0]],[end[1],b[1]])
    t=np.linspace(0,1,160)
    base=start[None,:]+t[:,None]*(end-start)[None,:]
    points=base+(.16*np.sin(8*np.pi*t))[:,None]*normal[None,:]
    p.line(ax,points[:,0],points[:,1])
    if name:
        mid=(a+b)/2
        text(ax,mid[0]+offset[0],mid[1]+offset[1],name,ha='center',va='center')


def render_figures(save,dark):
    fig,ax=drawing(dark)
    text(ax,.45,4.85,'Illustrative winding layout',color=p.MUTED)
    center=np.array([3.25,2.25]); radius=1.65
    ax.add_patch(Circle(center,radius,fc=p.FILL,ec=p.INK,lw=2))
    ax.add_patch(Circle(center,1.15,fc=p.PAPER,ec=p.GRID,lw=1.5))
    # Printed slot sequence; initial orientation is arbitrary in this schematic.
    for index,name in enumerate(['a',"c'",'b',"a'",'c',"b'"]):
        angle=math.pi/2+index*math.pi/3
        pos=center+radius*np.array([math.cos(angle),math.sin(angle)])
        lab=center+(radius+.42)*np.array([math.cos(angle),math.sin(angle)])
        ax.add_patch(Circle(pos,.09,fc=p.ORANGE,ec=p.ORANGE))
        text(ax,*lab,name,ha='center',va='center')
    text(ax,6.5,3.45,'Same current angle',color=p.MUTED)
    text(ax,6.5,2.45,r'$f=60\ \mathrm{Hz}$')
    text(ax,6.5,1.45,r'$I=10\ \mathrm{A}$')
    save(fig,'e2-u00-q2',dark)

    fig,ax=drawing(dark)
    text(ax,.45,4.85,'Illustrative system',color=p.MUTED)
    box(ax,1.1,1.5,2.8,2,'Generator')
    box(ax,8.05,1.5,2.7,2,'Load')
    three_lines(ax,3.9,8.05,2.5)
    text(ax,2.5,1.0,r'$\mathrm{Y},\quad j2\ \Omega$',ha='center')
    text(ax,9.4,1.0,r'$\mathrm{Y},\quad 10+j10\ \Omega$',ha='center')
    text(ax,6,3.7,r'$60\ \mathrm{Hz}$',ha='center')
    text(ax,6,.25,r'$I_f:\ 10\ \mathrm{A}\ \rightarrow\ 20\ \mathrm{A}$',ha='center')
    save(fig,'e2-u00-q3',dark)

    fig,ax=drawing(dark)
    text(ax,.45,4.85,'Illustrative system',color=p.MUTED)
    box(ax,.45,1.75,2.5,1.5,'Turbine')
    p.line(ax,[2.95,4.45],[2.5,2.5],lw=4,color=p.MUTED)
    ax.add_patch(Circle((5.5,2.5),1.05,fc=p.FILL,ec=p.INK,lw=2))
    text(ax,5.5,2.5,'G / Y',ha='center',va='center')
    box(ax,9.45,1.75,2.1,1.5,'Load')
    three_lines(ax,6.55,9.45,2.5)
    text(ax,5.5,3.95,r'$2\mathrm{p},\quad 60\ \mathrm{Hz}$',ha='center')
    text(ax,5.5,.85,r'$j1\ \Omega\ /\ \mathrm{phase}$',ha='center')
    text(ax,9.2,4.1,r'$1.732\ \mathrm{kV}$',ha='center')
    text(ax,9.2,.85,r'$1.5\ \mathrm{MW}$',ha='center')
    save(fig,'e2-u00-q4',dark)

    fig,ax=drawing(dark)
    text(ax,.45,4.85,'Illustrative delta connection',color=p.MUTED)
    # Distinct bus conductors terminate at the three actual delta vertices.
    a=np.array([6.7,4.0]); b=np.array([4.9,.85]); c=np.array([8.5,.85])
    p.line(ax,[1.1,a[0]],[a[1],a[1]],color=p.TEAL)
    p.line(ax,[1.1,3.8,3.8,b[0]],[2.5,2.5,b[1],b[1]],color=p.TEAL)
    p.line(ax,[1.1,2.8,2.8,c[0],c[0]],[1.1,1.1,.1,.1,c[1]],color=p.TEAL)
    for v,w in [(a,b),(b,c),(c,a)]:coil(ax,v,w)
    for point in [a,b,c]:ax.add_patch(Circle(point,.07,fc=p.ORANGE,ec=p.ORANGE))
    text(ax,.65,4,'a',ha='center',va='center')
    text(ax,.65,2.5,'b',ha='center',va='center')
    text(ax,.65,1.1,'c',ha='center',va='center')
    text(ax,6.7,2,'M',ha='center',va='center',fontsize=17)
    text(ax,10.0,3.5,r'$600\ \mathrm{V}$',ha='center')
    text(ax,10.0,2.5,r'$j4\ \Omega$',ha='center')
    text(ax,10.0,1.5,r'$\delta=60^\circ$',ha='center')
    save(fig,'e2-u00-q5',dark)

    fig,ax=drawing(dark)
    # This diagram is attached to the revealed circuit solution, never the prompt.
    ax.add_patch(Circle((1.7,2.3),.55,fc=p.FILL,ec=p.INK,lw=1.7))
    text(ax,1.7,2.3,r'$\sim$',ha='center',va='center',fontsize=17)
    p.line(ax,[1.7,1.7,4.2],[2.85,3.7,3.7])
    coil(ax,(4.2,3.7),(6.7,3.7),r'$jX_s=j2\ \Omega$',offset=(0,.65))
    p.line(ax,[6.7,9.3,9.3],[3.7,3.7,2.9])
    box(ax,8.9,1.6,.8,1.3,'')
    p.line(ax,[9.3,9.3,1.7,1.7],[1.6,.8,.8,1.75])
    p.arrow(ax,(6.8,3.7),(8.0,3.7),color=p.ORANGE)
    text(ax,7.4,4.35,r'$I_A$',ha='center')
    text(ax,.6,2.3,r'$E_A$',ha='center',va='center')
    text(ax,10.8,2.3,r'$10+j10\ \Omega$',ha='center',va='center')
    text(ax,5.5,.15,'Neutral return',ha='center',color=p.MUTED)
    text(ax,7.0,2.5,r'$V_\phi$',ha='center')
    save(fig,'e2-u00-q3-circuit',dark)


if __name__=='__main__':
    from generate_figures import generate_paper
    generate_paper(Path(__file__).parent)
