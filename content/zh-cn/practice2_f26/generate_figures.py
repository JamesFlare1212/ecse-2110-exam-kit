"""Paper-owned Schemdraw circuits and narrative-aligned converter plots.

Only q4/q6 are printed prompt diagrams. Other diagrams are solution-only;
representative ripple dynamics remain a stated modeling choice, not a given.
"""
from pathlib import Path
import sys
import numpy as np
from matplotlib.patches import Arc
ROOT = Path(__file__).resolve().parents[3]
sys.path.insert(0, str(ROOT/'scripts'))
import plotting as P
import circuit_drawing as C
SVG_LABELS = {
    'FIGURE P10.4': '图 P10.4', 'DC supply': '直流电源', 'Back emf': '反电动势',
    'Clockwise': '顺时针', 'On': '导通', 'FW': '续流',
    'FW: diode freewheeling; source current is zero': '续流：电流经过二极管桥臂，电源电流为零',
    'Representative RL-emf ripple: mean 20 A; ripple RMS 4 A': '代表性 RL–反电动势模型：均值 20 A；纹波有效值 4 A',
    'Continuous current; pairs remain on for 180 degrees': '电流连续：每对晶闸管持续导通 180 度',
}
AUXILIARY_INPUTS = (ROOT/'scripts/semi_converter_sprite.py',)


def generate_auxiliary_assets(output):
    # Teaching-only interaction assets; deliberately outside the figure inventory.
    from semi_converter_sprite import generate
    return generate(output)


def wire(ax, pts, **kw):
    for a, b in zip(pts, pts[1:]):
        C.wire(ax, a, b, **kw)


def txt(ax, x, y, s, **kw):
    P.label(ax, x, y, s, ha=kw.pop('ha', 'center'), va='center', fontsize=11, **kw)


def armature_circuit():
    fig, ax = P.plt.subplots(figsize=(9.6, 4.8))
    fig.subplots_adjust(left=.015, right=.985, bottom=.025, top=.975)
    P.canvas(ax, (-1.75, 9.8), (-.9, 4.75)); P.equal_units(ax)
    left, right, top, bottom, center, radius = 1.1, 7.4, 3.5, .25, 1.87, .55
    for x in (left, right):
        wire(ax, [(x, bottom), (x, center-radius)])
        wire(ax, [(x, center+radius), (x, top)])
        C.source(ax, (x, center-radius), (x, center+radius), radius=radius)
    wire(ax, [(left, top), (3.4, top)])
    C.resistor(ax, (3.4, top), (5.1, top))
    wire(ax, [(5.1, top), (right, top)])
    wire(ax, [(left, bottom), (right, bottom)])
    C.wire(ax, (1.55, top), (2.65, top), arrow='->', color=P.ORANGE)
    txt(ax, 2.1, 4.08, r'$I_a=25\,\mathrm{A}$', color=P.ORANGE)
    txt(ax, 4.25, 4.35, r'$R_a=0.2\,\Omega$')
    txt(ax, 3.1, 3.85, '$+$'); txt(ax, 5.4, 3.85, '$-$')
    txt(ax, 4.25, 2.93, r'$I_aR_a=5\,\mathrm{V}$')
    txt(ax, -.05, 2.12, r'$V=200\,\mathrm{V}$', ha='right')
    txt(ax, -.05, 1.58, 'DC supply', ha='right', color=P.MUTED)
    txt(ax, 8.12, 2.12, r'$E_a=195\,\mathrm{V}$', ha='left')
    txt(ax, 8.12, 1.58, 'Back emf', ha='left', color=P.MUTED)
    # Equal data units keep the clockwise traversal mark truly circular.
    cx, cy, loop_radius = 4.25, 1.65, .9
    ax.add_patch(Arc((cx, cy), 2*loop_radius, 2*loop_radius, theta1=42, theta2=320,
                     color=P.TEAL, lw=1.6, gid='kvl-clockwise'))
    points = [(cx+loop_radius*np.cos(np.radians(t)), cy+loop_radius*np.sin(np.radians(t))) for t in (66, 40)]
    direction = ax.annotate('', xy=points[1], xytext=points[0], arrowprops={
        'arrowstyle': '-|>', 'color': P.TEAL, 'lw': 1.6, 'mutation_scale': 12,
        'connectionstyle': 'arc3,rad=-.12', 'shrinkA': 0, 'shrinkB': 0})
    direction.set_gid('kvl-direction')
    txt(ax, cx, cy+.2, 'KVL', color=P.TEAL); txt(ax, cx, cy-.2, 'Clockwise', color=P.TEAL)
    txt(ax, 4.25, -.52, r'$+V-I_aR_a-E_a=0$')
    return fig


def device(ax, x, y, name, scr=True):
    C.diode(ax, (x, y-.4), (x, y+.4), scr=scr, gate_left=scr)
    txt(ax, x+.48, y, name)


def coil(ax, x, y0, y1):
    C.inductor(ax, (x, y1), (x, y0))


def circuit(kind):
    fig, ax = P.plt.subplots(figsize=(10.8, 5.3))
    fig.subplots_adjust(left=.015, right=.985, bottom=.025, top=.975)
    P.canvas(ax, (-.6, 10.6), (-.65, 5.35)); P.equal_units(ax)
    semi, solution = kind == 'semi', kind == 'solution'
    wire(ax, [(2,3.85),(2,4.7),(6,4.7)])
    wire(ax, [(2,.95),(2,.25),(6,.25)])
    wire(ax, [(3.8,3.85),(3.8,4.7)]); wire(ax, [(3.8,.95),(3.8,.25)])
    for x, names, scr in [(2, ('$S_1$', '$S_2$' if semi else '$S_4$'), True),
                          (3.8, ('$D_1$', '$D_2$') if semi else ('$S_3$', '$S_2$'), not semi)]:
        device(ax,x,3.45,names[0],scr); device(ax,x,1.35,names[1],scr)
        if x == 2:
            wire(ax,[(x,1.75),(x,1.95)])
            ax.add_patch(Arc((x,2.13),.36,.36,theta1=-90,theta2=90,color=P.INK,lw=1.5))
            wire(ax,[(x,2.31),(x,3.05)])
        else:
            wire(ax,[(x,1.75),(x,3.05)])
    wire(ax,[(.5,2.8),(2,2.8)]); wire(ax,[(.5,2.13),(3.8,2.13)])
    for point in [(2,2.8),(3.8,2.13),(3.8,4.7),(3.8,.25)]:
        C.terminal(ax,point,radius=.035,open=False)
    C.wire(ax,(.7,2.8),(1.45,2.8),arrow='->',color=P.ORANGE); txt(ax,1.05,3.15,'$i$')
    if semi:
        for y in [2.8,2.13]: C.terminal(ax,(.5,y),radius=.055)
        txt(ax,.13,2.45,'$v$')
        wire(ax,[(6,4.7),(6,4.0)]); C.resistor(ax,(6,4),(6,3.1)); txt(ax,6.55,3.55,'$R$')
        wire(ax,[(6,3.1),(6,2.65)]); coil(ax,6,1.5,2.65)
        wire(ax,[(6,1.5),(6,.25)]); txt(ax,6.65,2.05,'$L$')
        txt(ax,8,2.6,'FIGURE P10.4')
    else:
        C.source(ax,(.5,2.13),(.5,2.8),kind='ac',radius=.335)
        txt(ax,-.15,3.05,'$+$'); txt(ax,-.15,1.9,'$-$'); txt(ax,-.15,2.465,'$v$')
        wire(ax,[(6,4.7),(6,4.35)]); coil(ax,6,3.25,4.35)
        txt(ax,6.68,3.8,'$L$' if solution else '$L_a$')
        wire(ax,[(6,3.25),(6,3)])
        if solution:
            wire(ax,[(6,3),(6,1.85)])
        else:
            C.resistor(ax,(6,3),(6,2.2)); txt(ax,6.55,2.6,'$R_a$')
            wire(ax,[(6,2.2),(6,1.85)])
        C.source(ax,(6,.85),(6,1.85),kind='empty',radius=.5)
        txt(ax,6,1.35,'$E_a$'); txt(ax,6.68,1.85,'$+$'); txt(ax,6.68,.85,'$-$')
        wire(ax,[(6,.85),(6,.25)])
        if not solution:
            wire(ax,[(7.55,.55),(7.55,1.55),(7.8,1.55)])
            C.inductor(ax,(7.8,1.55),(9,1.55))
            wire(ax,[(9,1.55),(9.3,1.55),(9.3,.55)])
            for x in [7.55,9.3]: C.terminal(ax,(x,.55),radius=.055)
            C.wire(ax,(7.55,.75),(7.55,1.3),arrow='->',color=P.ORANGE); txt(ax,8,.85,'$i_f$')
    C.wire(ax,(4.5,4.7),(5.3,4.7),arrow='->',color=P.ORANGE); txt(ax,4.9,5.03,'$i_0$')
    txt(ax,5.15,4.2,'$+$'); txt(ax,5.15,.7,'$-$'); txt(ax,5.15,2.5,'$v_0$')
    return fig


def switching_band(ax, alpha, semi):
    edges = sorted({0.,720.,*[v for cycle in (0,360) for v in (cycle+alpha,cycle+180,cycle+180+alpha,cycle+360) if 0<v<720]})
    if not semi:
        edges = sorted({0.,720.,*[alpha+k*180 for k in range(4) if alpha+k*180<720]})
    for left,right in zip(edges,edges[1:]):
        phase = ((left+right)/2) % 360
        if semi:
            code = 'FW' if phase<alpha or 180<=phase<180+alpha else ('$S_1,D_2$' if phase<180 else '$S_2,D_1$')
        else:
            code = '$S_1,S_2$' if ((phase-alpha)%360)<180 else '$S_3,S_4$'
        color = P.GRID if code=='FW' else P.TEAL if code.startswith('$S_1') else P.ORANGE
        ax.axvspan(left,right,color=color,alpha=.18,ec=P.GRID,lw=.5)
        ax.text((left+right)/2,.5,code,ha='center',va='center',fontsize=9,color=P.INK)
    ax.set_ylim(0,1); ax.set_yticks([]); ax.set_ylabel('On',rotation=0,ha='right',va='center',labelpad=16)
    ax.spines[:].set_visible(False); ax.tick_params(bottom=False,labelbottom=False)


def plot_rows(rows, alpha, *, semi=False, ripple=False):
    fig, all_axes = P.plt.subplots(len(rows)+1,1,figsize=(11.5,1.35*len(rows)+.75),sharex=True,
                                  gridspec_kw={'height_ratios':[.5]+[1]*len(rows)})
    fig.subplots_adjust(left=.18,right=.97,top=.95,bottom=.055,hspace=.38)
    switching_band(all_axes[0],alpha,semi)
    title = 'FW: diode freewheeling; source current is zero' if semi else (
        'Representative RL-emf ripple: mean 20 A; ripple RMS 4 A' if ripple else 'Continuous current; pairs remain on for 180 degrees')
    fig.suptitle(title,fontsize=11)
    degrees = np.linspace(0,720,8193)
    for ax,(label,values) in zip(all_axes[1:],rows):
        ax.plot(degrees,values,color=P.TEAL,lw=1.8)
        ax.axhline(0,color=P.MUTED,lw=.8)
        for x in [alpha,180,180+alpha,360,360+alpha,540,540+alpha,720]:
            ax.axvline(x,color=P.GRID,lw=.7,ls=':')
        limit = max(float(np.max(np.abs(values))),1)
        ax.set_ylim((-.12*limit,1.25*limit) if np.min(values)>=-1e-9 else (-1.25*limit,1.25*limit))
        ax.set_ylabel(label,rotation=0,ha='right',va='center',labelpad=16)
        ax.set_xlim(0,720); ax.spines[['top','right']].set_visible(False); ax.tick_params(labelsize=9)
        if ripple and label.startswith('$i_0'):
            ax.axhline(20,color=P.ORANGE,lw=1.3,ls='--')
            ax.fill_between(degrees,20,values,color=P.TEAL,alpha=.12)
    ticks = [0,alpha,180,180+alpha,360,360+alpha,540,540+alpha,720]
    all_axes[-1].set_xticks(ticks)
    all_axes[-1].set_xticklabels([f'{x:.1f}'.rstrip('0').rstrip('.') if x%1 else str(int(x)) for x in ticks])
    all_axes[-1].set_xlabel(r'$\theta=\omega t\ ({}^\circ)$')
    return fig


def semi_waveforms():
    theta=np.linspace(0,4*np.pi,8193); phase=theta%(2*np.pi); a=np.pi/6
    pos=(phase>=a)&(phase<np.pi); neg=(phase>=np.pi+a)
    v=np.sin(theta); out=np.where(pos,v,np.where(neg,-v,0))
    return plot_rows([(r'$v/V_m$',v),(r'$i_0/I_0$',np.ones_like(v)),(r'$v_0/V_m$',out),
       (r'$i_{s1}/I_0$',pos.astype(float)),(r'$i_{s2}/I_0$',neg.astype(float)),
       (r'$i_{d1}/I_0$',(~pos).astype(float)),(r'$i_{d2}/I_0$',(~neg).astype(float)),
       (r'$i/I_0$',pos.astype(float)-neg.astype(float)),(r'$v_{s1}/V_m$',np.where(pos,0,v))],30,semi=True)


def representative_ripple():
    # Periodic RL-emf solution, not an arbitrary sinusoidal ripple.
    count=8192; theta=np.arange(count)*2*np.pi/count
    sigma=np.where(((theta-np.pi/3)%(2*np.pi))<np.pi,1.,-1.)
    voltage=sigma*np.sqrt(2)*120*np.sin(theta)
    spectrum=np.fft.rfft(voltage); harmonics=np.arange(len(spectrum))
    def current(inductance):
        coeff=spectrum/(.25+1j*harmonics*2*np.pi*60*inductance)
        coeff[0]=20*count
        return np.fft.irfft(coeff,n=count)
    low,high=1e-5,10.
    for _ in range(64):
        mid=(low+high)/2
        if np.std(current(mid))>4: low=mid
        else: high=mid
    return current((low+high)/2),(low+high)/2


def full_waveforms(ripple=False):
    alpha=60 if ripple else np.degrees(np.arccos(55/(2*np.sqrt(2)*120/np.pi)))
    theta=np.linspace(0,4*np.pi,8193); a=np.radians(alpha)
    sigma=np.where(((theta-a)%(2*np.pi))<np.pi,1.,-1.)
    voltage=np.sqrt(2)*120*np.sin(theta)
    if ripple:
        one,_=representative_ripple(); dc=one[np.arange(8193)*2%8192]
    else:
        dc=np.full_like(theta,5*746/110)
    return plot_rows([(r'$v\ (\mathrm{V})$',voltage),(r'$i\ (\mathrm{A})$',sigma*dc),
                      (r'$v_0\ (\mathrm{V})$',sigma*voltage),(r'$i_0\ (\mathrm{A})$',dc)],alpha,ripple=ripple)


def render_figures(save,dark):
    P.setup(dark)
    for name,maker in [('p2-f26-q1-armature',armature_circuit),('p2-f26-q4',lambda:circuit('semi')),
       ('p2-f26-q6',lambda:circuit('full')),('p2-f26-q4-waveforms',semi_waveforms),
       ('p2-f26-q5-circuit',lambda:circuit('solution')),('p2-f26-q5-waveforms',full_waveforms),
       ('p2-f26-q6-waveforms',lambda:full_waveforms(True))]:
        save(maker(),name,dark)


if __name__=='__main__':
    from generate_figures import generate_paper
    generate_paper(Path(__file__).parent)
