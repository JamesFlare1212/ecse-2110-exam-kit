"""Practice Set 2: only PDF p5/p9 circuits are prompt figures.

All other drawings are explicitly solution-only. No question-bank compilation.
Each locale owns this renderer and its independent assets.
"""
from pathlib import Path
import sys
import numpy as np
from matplotlib.patches import Circle, Polygon, Arc
ROOT = Path(__file__).resolve().parents[3]
sys.path.insert(0, str(ROOT/'scripts'))
import plotting as P
SVG_LABELS = {'FIGURE P10.4': '图 P10.4'}


def wire(ax, pts, **kw):
    P.line(ax, [p[0] for p in pts], [p[1] for p in pts], **kw)


def txt(ax, x, y, s, **kw):
    P.label(ax, x, y, s, ha=kw.pop('ha', 'center'), va='center', fontsize=11, **kw)


def device(ax, x, y, name, scr=True):
    # Both AC-side devices in a leg point upward toward the positive DC bus.
    wire(ax, [(x,y-.40),(x,y-.18)])
    ax.add_patch(Polygon([(x-.14,y-.18),(x+.14,y-.18),(x,y+.12)], closed=True,
                         fc=P.TEAL, ec=P.INK, lw=1.6))
    wire(ax,[(x-.18,y+.13),(x+.18,y+.13)])
    wire(ax,[(x,y+.13),(x,y+.40)])
    if scr: wire(ax,[(x-.28,y-.28),(x-.07,y-.05)])
    txt(ax,x+.48,y,name)


def coil(ax, x, y0, y1):
    yy=np.linspace(y0,y1,160)
    P.line(ax,x+.13*np.sin(np.linspace(0,8*np.pi,len(yy))),yy)


def circuit(kind):
    fig,ax=P.plt.subplots(figsize=(10.8,5.3))
    fig.subplots_adjust(left=.015,right=.985,bottom=.025,top=.975)
    P.canvas(ax,(-.6,10.6),(-.65,5.35))
    semi=kind=='semi'; solution=kind=='solution'
    # Upper/lower buses and offset AC midpoint wires preserve the source layout.
    wire(ax,[(2,3.85),(2,4.7),(6,4.7)])
    wire(ax,[(2,.95),(2,.25),(6,.25)])
    wire(ax,[(3.8,3.85),(3.8,4.7)])
    wire(ax,[(3.8,.95),(3.8,.25)])
    for x,names,scr in [(2,('$S_1$','$S_2$' if semi else '$S_4$'),True),
                        (3.8,('$D_1$','$D_2$') if semi else ('$S_3$','$S_2$'),not semi)]:
        device(ax,x,3.45,names[0],scr);device(ax,x,1.35,names[1],scr)
        if x==2:
            wire(ax,[(x,1.75),(x,1.95)])
            # Jump across the B input conductor: never a junction at this crossing.
            ax.add_patch(Arc((x,2.13),.36,.36,theta1=-90,theta2=90,color=P.INK,lw=1.5))
            wire(ax,[(x,2.31),(x,3.05)])
        else: wire(ax,[(x,1.75),(x,3.05)])
    wire(ax,[(.5,2.8),(2,2.8)]);wire(ax,[(.5,2.13),(3.8,2.13)])
    for x,y in [(2,2.8),(3.8,2.13),(3.8,4.7),(3.8,.25)]:ax.plot(x,y,'o',ms=4,color=P.INK)
    P.arrow(ax,(.7,2.8),(1.45,2.8));txt(ax,1.05,3.15,'$i$')
    if semi:
        for y in [2.8,2.13]:ax.add_patch(Circle((.5,y),.055,fc=P.PAPER,ec=P.INK,lw=1.5))
        txt(ax,.13,2.45,'$v$')
        wire(ax,[(6,4.7),(6,4.0)])
        P.resistor(ax,(6,4),(6,3.1),'$R$')
        wire(ax,[(6,3.1),(6,2.65)]);coil(ax,6,1.5,2.65)
        wire(ax,[(6,1.5),(6,.25)]);txt(ax,6.65,2.05,'$L$')
        txt(ax,8,2.6,'FIGURE P10.4')
    else:
        ax.add_patch(Circle((.5,2.465),.335,fc=P.PAPER,ec=P.INK,lw=1.6))
        txt(ax,.5,2.465,r'$\sim$');txt(ax,-.15,3.05,'$+$');txt(ax,-.15,1.9,'$-$');txt(ax,-.15,2.465,'$v$')
        wire(ax,[(6,4.7),(6,4.35)]);coil(ax,6,3.25,4.35);txt(ax,6.68,3.8,'$L_a$' if not solution else '$L$')
        wire(ax,[(6,3.25),(6,3)])
        if not solution:
            P.resistor(ax,(6,3),(6,2.2),'$R_a$');wire(ax,[(6,2.2),(6,1.85)])
        else: wire(ax,[(6,3),(6,1.85)])
        ax.add_patch(Circle((6,1.35),.5,fc=P.PAPER,ec=P.INK,lw=1.6))
        txt(ax,6,1.35,'$E_a$');txt(ax,6.68,1.85,'$+$');txt(ax,6.68,.85,'$-$')
        wire(ax,[(6,.85),(6,.25)])
        if not solution:
            # The separate field loop and its open terminals are in the source.
            wire(ax,[(7.55,.55),(7.55,1.55),(7.8,1.55)])
            xx=np.linspace(7.8,9,160);P.line(ax,xx,1.55+.13*np.sin(np.linspace(0,8*np.pi,len(xx))))
            wire(ax,[(9,1.55),(9.3,1.55),(9.3,.55)])
            for x in [7.55,9.3]:ax.add_patch(Circle((x,.55),.055,fc=P.PAPER,ec=P.INK,lw=1.5))
            P.arrow(ax,(7.55,.75),(7.55,1.3));txt(ax,8,.85,'$i_f$')
    P.arrow(ax,(4.5,4.7),(5.3,4.7));txt(ax,4.9,5.03,'$i_0$')
    txt(ax,5.15,4.2,'$+$');txt(ax,5.15,.7,'$-$');txt(ax,5.15,2.5,'$v_0$')
    return fig


def plot_rows(rows, alpha):
    fig,axes=P.plt.subplots(len(rows),1,figsize=(11.5,1.45*len(rows)),sharex=True)
    fig.subplots_adjust(left=.19,right=.97,top=.975,bottom=.07,hspace=.34)
    degrees=np.linspace(0,720,8193)
    for ax,(label,values) in zip(axes,rows):
        ax.plot(degrees,values,color=P.TEAL,lw=1.7)
        ax.axhline(0,color=P.MUTED,lw=.8)
        for x in [alpha,180,180+alpha,360,360+alpha,540,540+alpha,720]:
            ax.axvline(x,color=P.GRID,lw=.65,ls=':')
        limit=max(float(np.max(np.abs(values))),1)
        ax.set_ylim(-1.25*limit,1.25*limit)
        ax.set_ylabel(label,rotation=0,ha='right',va='center',labelpad=16)
        ax.set_xlim(0,720);ax.spines[['top','right']].set_visible(False)
        ax.tick_params(labelsize=10)
    alpha_text=f'{alpha:.1f}'.rstrip('0').rstrip('.')
    axes[-1].set_xticks([0,alpha,180,360,540,720])
    axes[-1].set_xticklabels(['0',rf'${alpha_text}^\circ$','180','360','540','720'])
    axes[-1].set_xlabel(r'$\theta=\omega t\ ({}^\circ)$')
    return fig


def semi_waveforms():
    theta=np.linspace(0,4*np.pi,8193);phase=theta%(2*np.pi);a=np.pi/6
    pos=(phase>=a)&(phase<np.pi);neg=(phase>=np.pi+a)
    v=np.sin(theta);out=np.where(pos,v,np.where(neg,-v,0))
    # Original D1 is upper, D2 lower. Blocking S1 has vAK=v for all negative half-cycle.
    return plot_rows([(r'$v/V_m$',v),(r'$i_0/I_0$',np.ones_like(v)),(r'$v_0/V_m$',out),
       (r'$i_{s1}/I_0$',pos.astype(float)),(r'$i_{s2}/I_0$',neg.astype(float)),
       (r'$i_{d1}/I_0$',(~pos).astype(float)),(r'$i_{d2}/I_0$',(~neg).astype(float)),
       (r'$i/I_0$',pos.astype(float)-neg.astype(float)),(r'$v_{s1}/V_m$',np.where(pos,0,v))],30)


def representative_ripple():
    # Periodic linear RL-emf solution, not an arbitrary sinusoidal current.
    # Match average20 A and ripple RMS4 A by choosing the illustrative L.
    count=8192;theta=np.arange(count)*2*np.pi/count
    sigma=np.where(((theta-np.pi/3)%(2*np.pi))<np.pi,1.,-1.)
    voltage=sigma*np.sqrt(2)*120*np.sin(theta)
    spectrum=np.fft.rfft(voltage);harmonics=np.arange(len(spectrum))
    def current(inductance):
        coeff=spectrum/(.25+1j*harmonics*2*np.pi*60*inductance)
        coeff[0]=20*count
        return np.fft.irfft(coeff,n=count)
    low,high=1e-5,10.
    for _ in range(64):
        mid=(low+high)/2
        if np.std(current(mid))>4:low=mid
        else:high=mid
    return current((low+high)/2), (low+high)/2


def full_waveforms(ripple=False):
    alpha=60 if ripple else np.degrees(np.arccos(55/(2*np.sqrt(2)*120/np.pi)))
    theta=np.linspace(0,4*np.pi,8193);a=np.radians(alpha)
    sigma=np.where(((theta-a)%(2*np.pi))<np.pi,1.,-1.)
    voltage=np.sqrt(2)*120*np.sin(theta)
    if ripple:
        one,_=representative_ripple()
        indices=np.arange(8193)*2%8192
        dc=one[indices]
    else:dc=np.full_like(theta,5*746/110)
    return plot_rows([(r'$v\ (\mathrm{V})$',voltage),(r'$i\ (\mathrm{A})$',sigma*dc),
                      (r'$v_0\ (\mathrm{V})$',sigma*voltage),(r'$i_0\ (\mathrm{A})$',dc)],alpha)


def render_figures(save,dark):
    P.setup(dark)
    for name,maker in [('p2-f26-q4',lambda:circuit('semi')),('p2-f26-q6',lambda:circuit('full')),
       ('p2-f26-q4-waveforms',semi_waveforms),('p2-f26-q5-circuit',lambda:circuit('solution')),
       ('p2-f26-q5-waveforms',full_waveforms),('p2-f26-q6-waveforms',lambda:full_waveforms(True))]:
        save(maker(),name,dark)


if __name__=='__main__':
    from generate_figures import generate_paper
    generate_paper(Path(__file__).parent)
