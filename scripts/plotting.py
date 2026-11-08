"""Reproducible Matplotlib SVG figures; no screenshot-based replacement drawings.

The SVG fonttype stays 'none' to preserve native vector text. Both color themes
are generated from the same geometry. Original figures are cropped separately.
"""
import math
import cmath
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
from matplotlib.patches import Circle, Rectangle, FancyArrowPatch, Arc
from matplotlib.text import Text
import numpy as np

matplotlib.rcParams.update({'svg.fonttype':'none','font.family':'DejaVu Sans','font.size':10,'font.weight':'bold',
    'mathtext.fontset':'custom','mathtext.rm':'DejaVu Sans:weight=bold',
    'mathtext.it':'DejaVu Sans:style=oblique:weight=bold','mathtext.bf':'DejaVu Sans:weight=bold',
    'mathtext.bfit':'DejaVu Sans:style=oblique:weight=bold','mathtext.sf':'DejaVu Sans:weight=bold',
    'mathtext.tt':'DejaVu Sans Mono:weight=bold','mathtext.cal':'DejaVu Sans:style=oblique:weight=bold',
    'axes.spines.top':False,'axes.spines.right':False,'axes.titleweight':'bold','axes.labelweight':'bold',
    'axes.titlesize':11,'axes.labelsize':10,'savefig.transparent':True,'svg.hashsalt':'ecse2110-fieldnotes'})
FIGURE_TEXT_SCALE=1.3
INK='#263746'; MUTED='#667581'; GRID='#dce3e4'; ORANGE='#b65c3b'; TEAL='#187c78'; PAPER='#ffffff'; FILL='#e8f2ef'
def setup(dark):
    global INK,MUTED,GRID,ORANGE,TEAL,PAPER,FILL
    INK='#dbe5e9' if dark else '#263746'; MUTED='#9baeb8' if dark else '#667581'
    GRID='#36464d' if dark else '#dce3e4'; ORANGE='#f0a075' if dark else '#b65c3b'; TEAL='#70c9bb' if dark else '#187c78'
    PAPER='#18252c' if dark else '#ffffff'; FILL='#213e3c' if dark else '#e8f2ef'
    matplotlib.rcParams.update({'text.color':INK,'axes.labelcolor':MUTED,'xtick.color':MUTED,'ytick.color':MUTED,'axes.edgecolor':GRID,'grid.color':GRID,'axes.titlecolor':INK})
def prepare_figure(fig):
    # Apply to every label, tick and legend; mathtext uses matching bold fonts.
    for artist in fig.findobj(match=Text):
        if artist.get_text():
            artist.set_fontsize(max(10.4,artist.get_fontsize()*FIGURE_TEXT_SCALE))
            artist.set_fontweight('bold')
            artist.set_zorder(max(20,artist.get_zorder()))
    if len(fig.axes)>1 and any(ax.axison for ax in fig.axes):
        fig.tight_layout()
def label(ax,x,y,text,**kw): ax.text(x,y,text,color=kw.pop('color',INK),**kw)
def line(ax,x,y,**kw): ax.plot(x,y,color=kw.pop('color',INK),lw=kw.pop('lw',1.5),**kw)
def arrow(ax,a,b,text='',color=None,offset=(0,0)):
    ax.add_patch(FancyArrowPatch(a,b,arrowstyle='-|>',mutation_scale=11,color=color or ORANGE,lw=1.4))
    if text: label(ax,(a[0]+b[0])/2+offset[0],(a[1]+b[1])/2+offset[1],text,color=color or ORANGE,fontsize=10,ha='center')
def canvas(ax,xlim=(-.2,9),ylim=(-.6,3)):
    ax.set_xlim(*xlim); ax.set_ylim(*ylim); ax.axis('off')
def resistor(ax,a,b,text):
    a=np.array(a); b=np.array(b); direction=(b-a); normal=np.array([-direction[1],direction[0]])/np.linalg.norm(direction)
    points=[a]
    for i in range(1,10): points.append(a+direction*i/10+normal*(.09 if i%2 else -.09))
    points.append(b); xy=np.array(points); line(ax,xy[:,0],xy[:,1]); mid=(a+b)/2
    label(ax,mid[0]+(.20 if abs(direction[1]) else 0),mid[1]+(.0 if abs(direction[1]) else .24),text,ha='left' if abs(direction[1]) else 'center',va='center',fontsize=9)
def tidy(ax):
    ax.grid(True,alpha=.65,lw=.6); ax.set_axisbelow(True); ax.spines['left'].set_color(GRID);ax.spines['bottom'].set_color(GRID)
    ax.tick_params(labelsize=12)
def bounce(ax,values,td=1,unit='Td',measurements=(),coefficients=None):
    ax.set_xlim(-1.85,2.35); ax.set_ylim(4.6,-.65);ax.axis('off')
    line(ax,[0,0],[0,4.1],color=GRID,lw=2);line(ax,[1,1],[0,4.1],color=GRID,lw=2)
    label(ax,0,-.38,'Source',ha='center',color=MUTED,fontsize=10);label(ax,1,-.38,'Load',ha='center',color=MUTED,fontsize=10)
    for i,v in enumerate(values):
        # A zero-amplitude reflection is absorption, not another traveling ray.
        if abs(v)<1e-12:continue
        start,end=((0,i),(1,i+1)) if i%2==0 else ((1,i),(0,i+1))
        arrow(ax,start,end,color=ORANGE if i%2==0 else TEAL)
        direction='+' if i%2==0 else '-';order=i//2+1
        label(ax,.5,i+.40,rf'$V_{order}^{direction}={v:g}\,\mathrm{{V}}$',ha='center',va='center',fontsize=10,bbox={'facecolor':PAPER,'edgecolor':'none','pad':2})
    for i in range(5): label(ax,-1.70,i,rf'{i*td:g} {unit}',ha='right',va='center',fontsize=9,color=MUTED)
    for end,time,tex in measurements:
        artist=ax.text(-.12 if end==0 else 1.12,time,tex,ha='right' if end==0 else 'left',va='center',fontsize=11,color=INK)
        artist.set_gid('bounce-measured-'+str(end)+'-'+str(time))
    if coefficients:
        for end,tex in enumerate(coefficients):
            label(ax,end,4.43,tex,ha='center',va='center',fontsize=10,color=MUTED)
def loadsteps(ax,times,vals,xlabel):
    ax.step(times,vals,where='post',color=ORANGE,lw=2.2)
    ax.fill_between(times,vals,step='post',alpha=.08,color=ORANGE)
    ax.set_xlabel(xlabel); ax.set_ylabel('$V_L$ (V)');ax.margins(y=.22);tidy(ax)
    for t,v in list(zip(times,vals))[1:-1]:
        ax.scatter([t],[v],s=20,color=ORANGE,zorder=3);ax.annotate(rf'{v:g} V',(t,v),xytext=(7,8),textcoords='offset points',fontsize=9,color=INK)
def smith(ax,z,admittance=False):
    theta=np.linspace(0,2*np.pi,700); line(ax,np.cos(theta),np.sin(theta),color=GRID,lw=1)
    for r in [.2,.5,1,2,5]:
        xs=np.linspace(-35,35,1600); zz=r+1j*xs; G=(zz-1)/(zz+1); line(ax,G.real,G.imag,color=GRID,lw=.55)
    for x in [.2,.5,1,2,5]:
        for sign in [-1,1]:
            zz=np.linspace(0,50,1000)+1j*sign*x; G=(zz-1)/(zz+1);line(ax,G.real,G.imag,color=GRID,lw=.55)
    line(ax,[-1,1],[0,0],color=GRID,lw=.7)
    Gz=(z-1)/(z+1); G=-Gz if admittance else Gz; radius=abs(G)
    line(ax,radius*np.cos(theta),radius*np.sin(theta),color=TEAL,lw=1.3,ls='--')
    ax.scatter([G.real],[G.imag],color=ORANGE,s=38,zorder=5)
    ax.annotate('$y_L$' if admittance else '$z_L$',(G.real,G.imag),xytext=(9,9) if admittance else (-22,-40),
                textcoords='offset points',ha='left' if admittance else 'right',fontsize=10,color=ORANGE)
    if admittance:
        ax.scatter([Gz.real],[Gz.imag],marker='^',s=27,color=MUTED,zorder=5)
        ax.annotate('$z_L$',(Gz.real,Gz.imag),xytext=(7,7),textcoords='offset points',fontsize=9,color=MUTED)
        line(ax,[Gz.real,G.real],[Gz.imag,G.imag],color=GRID,lw=.8,ls=':')
        y=1/z; g,b=y.real,y.imag; A=abs(y)**2-g;B=-2*b;C=1-g
        branches=[]
        for sign in [-1,1]:
            t=(-B+sign*math.sqrt(B*B-4*A*C))/(2*A);yd=(y+1j*t)/(1+1j*y*t);gd=(yd-1)/(yd+1)
            distance=(math.atan(t)%math.pi)/(2*math.pi);ell=(math.atan(-yd.imag)%math.pi)/(2*math.pi)
            branches.append((distance,ell,gd,yd))
            ax.scatter([gd.real],[gd.imag],s=30,color=TEAL,zorder=5)
            if abs(yd.imag)>2:
                ax.annotate('$1%+gj$'%yd.imag,(gd.real,gd.imag),xytext=(-.56,.96 if gd.imag>0 else -.98),
                            textcoords='data',ha='center',fontsize=8,color=TEAL,
                            arrowprops={'arrowstyle':'-','color':TEAL,'lw':.7})
            else:
                ax.annotate('$1%+gj$'%yd.imag,(gd.real,gd.imag),xytext=(-70 if gd.real>.3 else 5,12 if gd.imag>0 else -18),textcoords='offset points',fontsize=8,color=TEAL)
        distance,ell,gd,yd=min(branches,key=lambda item:item[0]);a0=cmath.phase(G);a1=a0-4*math.pi*distance
        arc=np.linspace(a0,a1,160);line(ax,radius*np.cos(arc),radius*np.sin(arc),color=ORANGE,lw=1.5)
        arrow(ax,(radius*math.cos(arc[-12]),radius*math.sin(arc[-12])),(gd.real,gd.imag),color=ORANGE)
        ys=-1j*yd.imag;gs=(ys-1)/(ys+1);ax.scatter([gs.real],[gs.imag],s=25,facecolors=PAPER,edgecolors=ORANGE,zorder=5)
        ax.annotate('$y_s$',(gs.real,gs.imag),xytext=(6,-14),textcoords='offset points',fontsize=8,color=ORANGE)
        label(ax,0,-1.27,rf'$d_1={distance:.4f}\lambda,\quad\ell_1={ell:.4f}\lambda$',ha='center',fontsize=8,color=MUTED)
    else:
        for sign,name in [(-1,'$R_{min}$'),(1,'$R_{max}$')]:
            ax.scatter([sign*radius],[0],s=28,color=TEAL,zorder=5);ax.annotate(name,(sign*radius,0),xytext=(-10,-18),textcoords='offset points',fontsize=8,color=TEAL)
        distance=(math.pi+cmath.phase(G))/(4*math.pi);arc=np.linspace(cmath.phase(G),-math.pi,160)
        line(ax,radius*np.cos(arc),radius*np.sin(arc),color=ORANGE,lw=1.5)
        arrow(ax,(radius*math.cos(arc[-12]),radius*math.sin(arc[-12])),(-radius,0),color=ORANGE)
        label(ax,0,-1.27,rf'$d_1={distance:.4f}\lambda,\quad d_2=d_1+\lambda/4$',ha='center',fontsize=8,color=MUTED)
    ax.scatter([0],[0],s=15,color=MUTED);ax.set_aspect('equal');ax.axis('off');ax.set_xlim(-1.15,1.17);ax.set_ylim(-1.12,1.12)
    ax.set_title('Admittance Smith chart' if admittance else 'Impedance Smith chart',fontsize=10,pad=4)
def sphere(ax,selected=None):
    ax.set_aspect('equal');ax.axis('off');ax.set_xlim(-4.35,4.55);ax.set_ylim(-3.45,3.25)
    radii=[.6,1.5,2.4]
    selected=0 if selected is None else selected
    R=radii[selected]
    for radius,fill,color,key in [(1,FILL,TEAL,'a'),(2,'none',INK,'b'),(R,'none',ORANGE,'R')]:
        circle=Circle((0,0),radius,fc=fill,ec=color,lw=2 if key=='b' else 1.5,ls=(0,(5,3)) if key=='R' else '-')
        circle.set_gid('sphere-boundary-'+key);ax.add_patch(circle)
    def caption(key,x,y,tex,color,ha='left'):
        artist=ax.text(x,y,tex,color=color,fontsize=12,ha=ha,va='center')
        artist.set_gid('sphere-label-'+key)
    def callout(key,tex,anchor,y,color,side=1):
        # Keep labels in clear gutters; the dot identifies the intended region.
        line(ax,[anchor[0],side*2.83,side*3.03],[anchor[1],y,y],color=MUTED,lw=.65)
        ax.scatter(*anchor,s=8,color=color,zorder=6)
        caption(key,side*3.2,y,tex,color,ha='left' if side>0 else 'right')
    # All actual radius arrows start at O and end on their own boundary.
    for key,radius,angle,y,color,tex in [
        ('a',1,.34,.50,TEAL,'$a$'),('b',2,1.18,1.8,INK,'$b$'),
        ('R',R,-.74,-1.20,ORANGE,rf'$R\;(S_{selected+1})$')]:
        endpoint=radius*np.array([math.cos(angle),math.sin(angle)])
        patch=FancyArrowPatch((0,0),endpoint,arrowstyle='-|>',mutation_scale=12,shrinkA=0,shrinkB=0,color=color,lw=1.25,zorder=8)
        patch.set_gid('sphere-radius-'+key);ax.add_patch(patch)
        callout(key,tex,endpoint,y,color)
    ax.scatter(0,0,s=12,color=INK,zorder=9)
    callout('density',r'$\rho_0$',(-.40,.20),1.45,TEAL,-1)
    callout('permittivity',r'$\varepsilon_0$',(-1.35,.30),.10,MUTED,-1)
    callout('shell-charge',r'$\rho_{sb}$',(-1.6,-1.2),-1.25,INK,-1)
    normal=np.array([math.cos(2.6),math.sin(2.6)])
    patch=FancyArrowPatch(R*normal,(R+.35)*normal,arrowstyle='-|>',mutation_scale=12,shrinkA=0,shrinkB=0,color=ORANGE,lw=1.2,zorder=8)
    patch.set_gid('sphere-outward-normal');ax.add_patch(patch)
    callout('normal',r'$\hat{\mathbf{r}}$',(R+.175)*normal,2.65,ORANGE,-1)
    caption('charge',-2.6,-3.12,'$Q_b=-Q_a$',MUTED)
    caption('domain',.4,-3.12,['$0<R<a$','$a<R<b$','$R>b$'][selected],ORANGE)
def images(ax,fieldlines=False):
    ax.set_aspect('equal');ax.set_xlim(-3.1,3.1);ax.set_ylim(-3.05,3.05);ax.axis('off')
    ax.axhspan(-2.1,0,color=GRID,alpha=.20);line(ax,[-2.9,2.9],[0,0],lw=2);label(ax,3.05,0,'$z=0$',va='center',fontsize=9,color=MUTED)
    charges=[(-1,1,-1),(1,1,1),(-1,-1,1),(1,-1,-1)]
    if fieldlines:
        xx=np.linspace(-2.8,2.8,180);zz=np.linspace(-2,2,160);X,Z=np.meshgrid(xx,zz);Ex=np.zeros_like(X);Ez=np.zeros_like(X);mask=np.zeros_like(X,dtype=bool)
        for x,z,q in charges:
            R2=(X-x)**2+(Z-z)**2;mask|=R2<.13**2;den=np.maximum(R2,.001)**1.5;Ex+=q*(X-x)/den;Ez+=q*(Z-z)/den
        Ex=np.ma.array(Ex,mask=mask);Ez=np.ma.array(Ez,mask=mask)
        ax.streamplot(xx,zz,Ex,Ez,color=TEAL,density=.9,linewidth=.7,arrowsize=.8)
    for x,z,q in charges:
        color=ORANGE if q>0 else TEAL
        # Draw the sign as geometry: font glyphs can exceed the circle or
        # merge with its rim. Image charges use the same unbroken symbol;
        # their lower-half placement and caption identify the image system.
        ax.add_patch(Circle((x,z),.15,fc=PAPER,ec=color,lw=1.6,zorder=10))
        line(ax,[x-.075,x+.075],[z,z],color=color,lw=1.6,solid_capstyle='round',zorder=11)
        if q>0:
            line(ax,[x,x],[z-.075,z+.075],color=color,lw=1.6,solid_capstyle='round',zorder=11)
        if not fieldlines:
            label_x=1.5*x
            line(ax,[x,label_x],[z+(.18 if z>0 else -.18),z+(.65 if z>0 else -.57)],color=MUTED,lw=.6)
            label(ax,label_x,z+(.85 if z>0 else -1.15),('−q' if q<0 else '+q')+'\n'+('$(x_0,0,' if x>0 else '$(-x_0,0,')+('z_0)$' if z>0 else '-z_0)$'),ha='center',fontsize=9)
    label(ax,-2.9,2.75,'Real charges',color=MUTED,fontsize=9);label(ax,-2.9,-2.90,'Image system only',color=MUTED,fontsize=9)

