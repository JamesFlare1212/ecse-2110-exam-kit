"""Matplotlib recreations of the supplied question figures, not solution plots.

Preserve perspective, topology, dimensions and given/unknown labels. In
particular, coaxial cables and the microstrip retain their original 3D views.
All faces, curves, symbols and labels remain native SVG paths/text.
"""
import math
import numpy as np
import matplotlib.pyplot as plt
from matplotlib.patches import Circle, Ellipse, Polygon, Rectangle, Arc, FancyArrowPatch
from matplotlib.colors import to_rgb

INK = '#263746'
PAPER = '#fff'
MUTED = '#667581'
ACCENT = '#187c78'
RED = '#b65c3b'
FACE = '#e6e6e6'
SIDE = '#aaa'


def setup(colors, dark):
    global INK, PAPER, MUTED, ACCENT, RED, FACE, SIDE
    INK, PAPER, MUTED, ACCENT, RED = colors
    FACE = '#52616a' if dark else '#d9d9d9'
    SIDE = '#374650' if dark else '#aaa'


def canvas(ax, x=(-.3, 9), y=(-.7, 3.2), equal=False):
    ax.set_xlim(*x)
    ax.set_ylim(*y)
    ax.axis('off')
    if equal:
        ax.set_aspect('equal')


def text(ax, x, y, label, **kwargs):
    ax.text(x, y, label, color=kwargs.pop('color', INK), fontsize=kwargs.pop('fontsize', 12), **kwargs)


def wire(ax, points, **kwargs):
    xy = np.array(points)
    ax.plot(xy[:, 0], xy[:, 1], color=kwargs.pop('color', INK), lw=kwargs.pop('lw', 1.5), **kwargs)


def arrow(ax, start, end, label='', offset=(0, 0), color=None, **kwargs):
    ax.add_patch(FancyArrowPatch(start, end, arrowstyle=kwargs.pop('style', '-|>'),
                                mutation_scale=12, lw=kwargs.pop('lw', 1.2), color=color or INK, **kwargs))
    if label:
        text(ax, (start[0]+end[0])/2+offset[0], (start[1]+end[1])/2+offset[1],
             label, ha='center', color=color or INK)


def node(ax, x, y, radius=.045):
    ax.add_patch(Circle((x, y), radius, fc=PAPER, ec=INK, lw=1.1, zorder=8))


class Orthographic:
    """One orthonormal camera for the model, its dimensions and its axes.

    `view` points from the model toward the eye. Project 3D points only after
    constructing the geometry; no independently rotated screen-space ellipses.
    """
    def __init__(self, view, up, origin=(0, 0)):
        self.view = np.asarray(view, dtype=float)
        self.view /= np.linalg.norm(self.view)
        right = np.cross(up, self.view)
        right /= np.linalg.norm(right)
        self.matrix = np.array([right, np.cross(self.view, right)])
        self.origin = np.asarray(origin, dtype=float)

    def project(self, points):
        return np.asarray(points) @ self.matrix.T + self.origin

    def ring(self, radius, z=0, angles=None):
        angles = np.linspace(0, 2*np.pi, 241) if angles is None else np.asarray(angles)
        return self.project(np.column_stack((radius*np.cos(angles), radius*np.sin(angles),
                                            np.full_like(angles, z))))


def projected_axes(ax, camera, origin, length=.85):
    """The same world x/y/z directions used to build the solid."""
    for basis, label in zip(np.eye(3), ['$x$', '$y$', '$z$']):
        delta = camera.matrix @ (basis*length)
        arrow(ax, origin, origin+delta)
        text(ax, *(origin+delta*1.3), label, fontsize=12, ha='center', va='center')


def resistor(ax, a, b):
    a, b = np.array(a), np.array(b)
    delta = b-a
    normal = np.array([-delta[1], delta[0]])/np.linalg.norm(delta)
    pts = [a, a+delta*.13]
    for i in range(8):
        pts.append(a+delta*(.16+.095*i)+normal*(.11 if i % 2 == 0 else -.11))
    pts += [a+delta*.87, b]
    wire(ax, pts)


def source(ax, x=.7, y=1.3, kind='sine', label=r'$V_g$'):
    ax.add_patch(Circle((x, y), .32, ec=INK, fc=PAPER, lw=1.5))
    if kind == 'sine':
        t = np.linspace(-.23, .23, 70)
        wire(ax, np.column_stack((x+t, y+.11*np.sin(t/.23*math.pi))), color=ACCENT, lw=1.2)
    else:
        text(ax, x, y+.18, '+', ha='center', va='center', fontsize=11)
        text(ax, x, y-.18, '−', ha='center', va='center', fontsize=11)
    text(ax, x-.4, y, label, ha='right', va='center')


def ground(ax, x, y):
    wire(ax, [(x,y), (x,y-.19)])
    ax.add_patch(Polygon([(x-.17,y-.19),(x+.17,y-.19),(x,y-.36)], closed=True,
                         fc='none', ec=ACCENT, lw=1.2))


def t1_circuit(ax, rg, load, detail, source_detail, pulse=False, load_symbol=r'$R_L$'):
    """The original T1 two-conductor symbol and stepped return conductor."""
    canvas(ax, (-.2, 9), (-.55, 3.2))
    source(ax, kind='dc' if pulse else 'sine')
    wire(ax, [(.7,1.62),(.7,2.65),(2.2,2.65)])
    resistor(ax, (2.2,2.65), (3.15,2.65))
    wire(ax, [(3.15,2.65),(7.65,2.65),(7.65,1.85)])
    resistor(ax, (7.65,1.85),(7.65,.85))
    wire(ax, [(7.65,.85),(7.65,.1),(6.55,.1),(6.55,2.24),(4.05,2.24),
              (4.05,.1),(.7,.1),(.7,.98)])
    wire(ax, [(4.84,2.65),(5.02,2.56),(5.92,2.56),(6.1,2.65)], color=ACCENT, lw=1.2)
    wire(ax, [(4.84,2.24),(5.02,2.33),(5.92,2.33),(6.1,2.24)], color=ACCENT, lw=1.2)
    text(ax, 2.67, 2.96, r'$R_g$', ha='center')
    text(ax, 2.67, 2.23, rg, ha='center')
    text(ax, 5.47, 2.91, 'T1', ha='center')
    text(ax, 5.47, 1.87, detail, ha='center')
    text(ax, 8.0, 1.53, load_symbol, va='center')
    text(ax, 8.0, 1.1, load, va='center')
    details=source_detail.split()
    if len(details)>2:
        text(ax,1.16,1.71,' '.join(details[:2]),color=ACCENT)
        text(ax,1.16,.81,' '.join(details[2:]),color=ACCENT)
    else:
        text(ax,1.16,1.44,source_detail,color=ACCENT)
    if pulse:
        wire(ax, [(1.25,2),(1.39,2),(1.39,2.2),(1.54,2.2),(1.54,2),(1.69,2)], color=ACCENT, lw=1.2)
    ground(ax, .7, .1)


def tl_circuit(ax, rg, load, z0=r'$Z_0$', length=r'$L$', dc=False,
               switch=False, voltage='', vin=False, capacitor=False,
               damage=False, zeff=False, input_arrow=False):
    canvas(ax, (-.2, 9.5), (-.8, 3.15))
    source(ax, kind='dc' if dc else 'sine')
    if voltage:
        text(ax, 1.12, 1.1, voltage, color=ACCENT)
    wire(ax, [(.7,1.62),(.7,2.4),(1.55,2.4)])
    resistor(ax, (1.55,2.4),(2.7,2.4))
    text(ax, 2.12, 2.8, rg, ha='center')
    if switch:
        wire(ax, [(2.7,2.4),(3.15,2.4)])
        wire(ax, [(3.15,2.4),(3.65,2.7)])
        wire(ax, [(3.8,2.4),(7.55,2.4)])
        node(ax, 3.15, 2.4);node(ax, 3.8, 2.4)
        text(ax, 3.45, 3.0, r'$t=0$', ha='center', fontsize=10)
        arrow(ax, (3.4,2.95),(3.62,2.54), color=ACCENT)
    else:
        wire(ax, [(2.7,2.4),(7.55,2.4)])
    wire(ax, [(.7,.98),(.7,.35),(7.55,.35)])
    if capacitor:
        wire(ax, [(7.55,2.4),(7.55,2.1)])
        resistor(ax, (7.55,2.1),(7.55,1.24))
        wire(ax, [(7.55,1.24),(7.55,.94)])
        wire(ax, [(7.31,.94),(7.79,.94)])
        wire(ax, [(7.31,.74),(7.79,.74)])
        wire(ax, [(7.55,.74),(7.55,.35)])
        text(ax, 7.95, 1.72, load, fontsize=11)
        text(ax, 7.95, .77, r'$C_L=10^{-6}\,\mathrm{F}$', fontsize=11)
    elif zeff:
        wire(ax, [(7.55,2.4),(7.55,1.9)])
        ax.add_patch(Rectangle((7.39,.91),.32,.99,ec=INK,fc=PAPER,lw=1.5))
        wire(ax, [(7.55,.91),(7.55,.35)])
        text(ax, 7.99, 1.42, load, va='center')
    else:
        wire(ax, [(7.55,2.4),(7.55,2.06)])
        resistor(ax, (7.55,2.06),(7.55,.73))
        wire(ax, [(7.55,.73),(7.55,.35)])
        text(ax, 7.97, 1.4, load, va='center', fontsize=11)
    for x in [4.15,6.65]:
        for y in [.35,2.4]:node(ax,x,y)
    text(ax, 4.9 if damage else 5.38, 1.35, z0, ha='center', color=ACCENT, fontsize=13)
    if length:
        arrow(ax, (4.15,.02),(6.65,.02), style='<->')
        text(ax, 5.4, -.34, length, ha='center', fontsize=11,
             bbox={'facecolor':PAPER,'edgecolor':'none','pad':2})
    if vin:
        text(ax, 3.95, 2.04, '+', ha='center')
        text(ax, 3.95, .64, '−', ha='center')
        text(ax, 3.75, 1.3, r'$V_{in}$', ha='center')
        arrow(ax, (3.5,2.67),(4.15,2.67), r'$I_{in}$', offset=(0,.22), color=ACCENT)
    if input_arrow:
        wire(ax, [(3.25,.03),(3.25,1.42),(3.72,1.42)], lw=2)
        arrow(ax, (3.25,1.42),(3.92,1.42))
        text(ax, 3.25,-.46,r'$Z_{in}$',ha='center')
    if damage:
        wire(ax, [(5.9,2.4),(5.72,2.1),(6.1,1.8),(5.72,1.5),(6.1,1.2),
                  (5.72,.9),(6.1,.6),(5.9,.35)], color=ACCENT)
        arrow(ax, (6.65,2.96),(5.95,2.35), color=ACCENT)
        text(ax, 6.65,3.02,'Damage',ha='center',fontsize=10,color=ACCENT)


def stub_network(ax, spring=False, source_circuit=False, spring_c=False):
    canvas(ax, (-.4, 9.8), (-2.4, 3.0))
    left=0
    if source_circuit:
        source(ax,x=.45,y=.95)
        wire(ax,[(.45,1.27),(.45,2.1),(1.15,2.1)])
        resistor(ax,(1.15,2.1),(2.25,2.1))
        wire(ax,[(.45,.63),(.45,.2),(7.6,.2)])
        text(ax,1.7,2.52,r'$R_g=50\Omega$',ha='center',fontsize=11)
        wire(ax,[(2.25,2.1),(7.6,2.1)])
        top,bottom,joint=2.1,.2,4.65
        load = r'$Z_L=(100+j100)\Omega$' if spring_c else r'$Z_L$'+'\n'+r'$16.67+j50$'
        text(ax,3.45,1.13,r'$Z_0$' if spring_c else r'$Z_0=50$',ha='center',color=ACCENT)
    else:
        top,bottom,joint=1.6,0,2.7
        wire(ax,[(0,top),(7.6,top)]);wire(ax,[(0,bottom),(7.6,bottom)])
        load=r'$Z_L=(25+j90)\Omega$' if spring else r'$Z_L=150+j75\,\Omega$'
        text(ax,1.2,2.25,'Feedline',ha='center',fontsize=11)
        text(ax,5.15,2.62,'Through-line' if spring else 'Transmission Line',ha='center',fontsize=11)
        text(ax,1.2,.77,r'$Y_0$' if spring else r'$Z_0$',ha='center')
        text(ax,5.15,.9,r'$Y_0$' if spring else r'$Z_0$',ha='center')
    wire(ax,[(7.6,top),(8.1,top),(8.1,top-.35)])
    if spring or source_circuit:
        ax.add_patch(Rectangle((7.92,bottom+.35),.36,top-bottom-.7,fc=PAPER,ec=INK,lw=1.5))
        wire(ax,[(8.1,top-.35),(8.1,top-.35)])
    else:
        resistor(ax,(8.1,top-.35),(8.1,bottom+.35))
    wire(ax,[(8.1,bottom+.35),(8.1,bottom),(7.6,bottom)])
    text(ax,8.55,(top+bottom)/2,load,va='center',fontsize=11)
    for x in ([joint,7.6] if not source_circuit else [3.2,joint,7.6]):
        node(ax,x,top);node(ax,x,bottom)
    delta=(1.9,-1.6)
    for y in [top,bottom]:
        end=(joint+delta[0],y+delta[1]);wire(ax,[(joint,y),end],color=ACCENT)
        node(ax,*end)
    text(ax,joint+1.12,bottom-.8,r'$Y_0$' if spring else r'$Z_0$',rotation=-39,color=ACCENT)
    if spring_c:
        text(ax,joint, bottom+.23,r'$z=A$',ha='center',fontsize=10)
    elif source_circuit:
        text(ax,joint+.35,top+.86,r'$Y_d=0.02+j0.04\ \mathrm{S}$',ha='center',fontsize=10)
        text(ax,joint-1.15,bottom-.6,r'$Y_s=-j0.04\ \mathrm{S}$',ha='center',fontsize=10)
    else:
        wire(ax,[(2.1,-.4),(2.1,.8),(2.55,.8)],lw=2)
        arrow(ax,(2.1,.8),(2.7,.8))
        text(ax,2.1,-.7,r'$Y_{in}$' if spring else r'$Z_{in}$',ha='center')
        if spring:
            text(ax,joint+1.1,top-.30,r'$Y_d$',fontsize=10)
            text(ax,joint-.1,bottom-1.1,r'$Y_s$',fontsize=10)
    if not spring_c:
        arrow(ax,(joint,top+.32),(7.6,top+.32),style='<->')
        text(ax,(joint+7.6)/2,top+.25,r'$d$' if spring or source_circuit else r'$d_1$',ha='center',
             bbox={'facecolor':PAPER,'edgecolor':'none','pad':2})
    arrow(ax,(joint-.12,bottom-.35),(joint+1.67,bottom-1.9),style='<->')
    text(ax,joint+.7,bottom-1.48,r'$\ell$' if spring or source_circuit else r'$l_1$',rotation=-40,
         bbox={'facecolor':PAPER,'edgecolor':'none','pad':2})
    if not spring and not source_circuit:
        text(ax,joint-.05,bottom-2.16,'Stub',rotation=-40,ha='right',fontsize=10)


def transformer(ax):
    canvas(ax, (-.5, 10.2), (-1.0, 3.1))
    for y in [0,1.9]:wire(ax,[(0,y),(8.1,y)])
    ax.add_patch(Rectangle((7.94,.55),.32,.8,fc=PAPER,ec=ACCENT,lw=1.5))
    wire(ax,[(8.1,1.9),(8.1,1.35)]);wire(ax,[(8.1,.55),(8.1,0)])
    text(ax,8.55,1.12,r'$Z_L$',va='center');text(ax,8.55,.68,r'$150-j50$',va='center')
    for x in [2.45,4.65,7.2]:
        node(ax,x,0);node(ax,x,1.9)
    for x,label in [(2.03,r'$Z_{in,tot}$'),(4.18,r'$Z_{in,d}$')]:
        wire(ax,[(x,2.6),(x,1.31),(x+.45,1.31)],lw=2)
        arrow(ax,(x,1.31),(x+.64,1.31))
        text(ax,x,2.75,label,ha='center',fontsize=11)
    for x,label in [(1.05,r'$Z_0=50$'),(3.55,r'$Z_{0T}$'),(5.95,r'$Z_0=50$')]:
        text(ax,x,.85,label,color=ACCENT,ha='center',fontsize=13)
    text(ax,1,-.33,'Feedline',ha='center',fontsize=11)
    for a,b,label in [(2.45,4.65,r'$L=\lambda/4$'),(4.65,7.2,r'$d$')]:
        arrow(ax,(a,-.33),(b,-.33),style='<->')
        text(ax,(a+b)/2,-.42,label,ha='center',fontsize=11,
             bbox={'facecolor':PAPER,'edgecolor':'none','pad':2})


def distributed(ax):
    canvas(ax, (-.4,9.2), (-.5,2.8))
    for i in range(3):
        x=.4+i*2.35
        wire(ax,[(x,2),(x+.4,2)])
        for k in range(4):
            ax.add_patch(Arc((x+.52+k*.23,2),.23,.39,theta1=0,theta2=180,ec=INK,lw=1.4))
        wire(ax,[(x+1.32,2),(x+2.35,2)])
        wire(ax,[(x,.0),(x+2.35,.0)])
        wire(ax,[(x+1.87,2),(x+1.87,1.17)])
        wire(ax,[(x+1.59,1.17),(x+2.15,1.17)])
        wire(ax,[(x+1.59,.96),(x+2.15,.96)])
        wire(ax,[(x+1.87,.96),(x+1.87,0)])
        text(ax,x+.85,2.48,r'$l\cdot\Delta z$',ha='center')
        text(ax,x+2.2,1.04,r'$c\cdot\Delta z$',va='center',fontsize=11)
        ax.plot([x+1.87,x+1.87],[0,2],'o',color=ACCENT,markersize=3)
    text(ax,-.18,1,'…',ha='center',fontsize=16,color=ACCENT)
    text(ax,8.8,1,'…',ha='center',fontsize=16,color=ACCENT)


def coax_perspective(ax, leaky=True, gaussian=False, *, view, radii, length, radius_angles):
    """A coaxial solid built from circular sections in the world x-y plane.

    The cylinder axis is +z. Its outline generators occur where the radial
    normal is perpendicular to the camera, so they are true ellipse tangents.
    """
    canvas(ax, (-2.4, 7.3), (-2.8, 3.9), equal=True)
    camera = Orthographic(view, up=(1, 0, 0), origin=(.4, .5))
    a, b = radii
    center = camera.project((0, 0, 0))
    facing = math.atan2(camera.view[1], camera.view[0])
    tangencies = [facing+math.pi/2, facing-math.pi/2]
    def point(radius, theta, z=0):
        return camera.project((radius*math.cos(theta), radius*math.sin(theta), z))
    near = camera.ring(b)
    if leaky:
        far_arc = camera.ring(b, length, np.linspace(*tangencies, 121))
        outline = np.vstack((point(b, tangencies[0]), far_arc, point(b, tangencies[1])))
        ax.add_patch(Polygon(outline, closed=True, ec=INK, fc=SIDE, lw=1.8, zorder=1))
    else:
        for theta in tangencies:
            wire(ax, [point(b, theta), point(b, theta, length)], lw=1.8)
    ax.add_patch(Polygon(near, closed=True, ec=INK, fc=FACE if leaky else PAPER, lw=1.8, zorder=4))
    ax.add_patch(Polygon(camera.ring(a), closed=True, ec=INK, fc=PAPER if leaky else FACE, lw=1.5, zorder=5))
    # Both radii start at the same center and end on actual circular sections.
    radii_geometry = []
    for key, radius, theta, offset, color in [
        ('b', b, radius_angles[0], (-.28, .38), INK if leaky else RED),
        ('a', a, radius_angles[1], (.12, .12), INK if leaky else ACCENT),
    ]:
        endpoint = point(radius, theta)
        arrow(ax, center, endpoint, color=color, shrinkA=0, shrinkB=0, zorder=9)
        text(ax, *(endpoint+offset), '$'+key+'$', ha='center', fontsize=14, color=color)
        radii_geometry.append((radius, np.array([radius*math.cos(theta), radius*math.sin(theta), 0]), endpoint))
    ax.add_patch(Circle(center, .022, fc=INK, ec='none', zorder=12))
    text(ax, *(center+[-1.05, .15]), r'$\varepsilon$', fontsize=14, ha='right')
    wire(ax, [center+[-.95, .22], point((a+b)/2, -.95)], color=MUTED, lw=.7, zorder=9)
    if leaky:
        text(ax, *(center+[-1.36, .94]), r'$\varepsilon_0$', fontsize=12, ha='center')
        anchor = point(a, -2.2)
        arrow(ax, center+[-1.18, -.72], anchor, zorder=9)
        text(ax, *(center+[-1.27, -.88]), r'$\rho_{sa}$', fontsize=13, ha='right')
        wire(ax, [point((a+b)/2, 3.0), (.15, -1.5)], color=MUTED, lw=.7, zorder=9)
        text(ax, .15, -2.0, r'$\rho(s)$' if gaussian else r'$\rho(r)$', fontsize=13, ha='center')
    else:
        anchor = point(a, 1.5)
        wire(ax, [anchor, center+[1.12, -.15]], lw=.7, color=MUTED, zorder=9)
        text(ax, *(center+[1.28, -.15]), r'$V(a)=0$', ha='left', va='center', fontsize=12)
        text(ax, *(center+[.15, -1.98]), r'$V(b)=-V_0$', ha='center', fontsize=12)
    projected_axes(ax, camera, np.array([-1.95, -2.15]), length=1.05)
    geometry = {'kind': 'coax', 'camera': camera, 'radii': radii_geometry,
                'radius_b': b, 'tangencies': tangencies, 'length': length}
    if gaussian:
        R = .85*b
        ell = .72*length
        # Closed Gaussian cylinder, including its front and rear end caps.
        for z in [0, ell]:
            wire(ax, camera.ring(R, z), color=RED, lw=1.5, ls='--', zorder=7)
        for theta in tangencies:
            wire(ax, [point(R, theta), point(R, theta, ell)], color=RED, lw=1.4, ls='--', zorder=7)
        theta_R = 1.1
        endpoint = point(R, theta_R)
        arrow(ax, center, endpoint, color=RED, shrinkA=0, shrinkB=0, zorder=10)
        text(ax, *(endpoint+[.45, .03]), '$R$', ha='left', fontsize=14, color=RED)
        world_R = np.array([R*math.cos(theta_R), R*math.sin(theta_R), 0])
        radii_geometry.append((R, world_R, endpoint))
        # Radial outward normal has no axial component.
        theta_n = .4
        normal = np.array([math.cos(theta_n), math.sin(theta_n), 0])
        start = R*normal+np.array([0, 0, .48*ell])
        end = start+.25*normal
        arrow(ax, camera.project(start), camera.project(end), color=RED, shrinkA=0, shrinkB=0, zorder=10)
        text(ax, *(camera.project(end)+[.18, -.03]), r'$\hat{\mathbf{n}}$', fontsize=12, color=RED)
        dimension = center+np.array([.7, -2.1])
        delta = camera.project((0, 0, ell))-center
        arrow(ax, dimension, dimension+delta, color=RED, style='<->', zorder=10)
        text(ax, *(dimension+delta/2+[0, -.48]), r'$\ell$', fontsize=13, ha='center', color=RED)
        text(ax, 5.1, -1.1, r'$a<R<b$', ha='center', fontsize=12, color=RED)
        text(ax, 5.15, -1.75, r'$Q_{\mathrm{enc}}=Q_{sa}+Q_{\mathrm{vol}}$', ha='center', fontsize=10, color=RED)
        geometry.update(R=R, normal=(start, end), ell=ell)
    ax._projection_geometry = geometry


def microstrip(ax, *, view, width, length, height):
    """Six rectangular faces and a current direction in one 3D world frame."""
    canvas(ax, (-1.9, 6.25), (-1.9, 2.4), equal=True)
    camera = Orthographic(view, up=(0, 0, 1))
    # Near cut is x=0; the strip extends toward negative x. Current is +x.
    def face(points, fill):
        ax.add_patch(Polygon(camera.project(points), closed=True, fc=fill, ec=INK, lw=1.5))
    h = height/2
    face([(0,width,-h),(-length,width,-h),(-length,width,h),(0,width,h)], SIDE)
    face([(0,0,h),(0,width,h),(-length,width,h),(-length,0,h)], FACE)
    face([(0,0,-h),(0,width,-h),(0,width,h),(0,0,h)], FACE)
    wire(ax, camera.project([(0,0,0),(0,width,0),(-length,width,0)]), ls='--', lw=1)
    for z, label in [(h, r'$z=0.5h$'), (0, r'$z=0$'), (-h, r'$z=-0.5h$')]:
        endpoint = camera.project((0,0,z))
        text(ax, *(endpoint+[-.14, 0]), label, ha='right', va='center', fontsize=11)
    for y, label in [(0, r'$y=0$'), (width, r'$y=W$')]:
        text(ax, *(camera.project((0,y,-h))+[0, -.27]), label, ha='center', va='top', fontsize=11)
    current_start = np.array([-length*.75, width*.47, h])
    current_end = np.array([-length*.28, width*.47, h])
    arrow(ax, camera.project(current_start), camera.project(current_end), shrinkA=0, shrinkB=0, lw=1.6)
    text(ax, *(camera.project(current_end)+[.50, -.25]), r'$\vec J(z)$', fontsize=14, va='center')
    projected_axes(ax, camera, np.array([4.8, -.8]), length=.90)
    ax._projection_geometry = {'kind': 'microstrip', 'camera': camera,
                               'current': (current_start, current_end),
                               'dimensions': (length, width, height)}


def sphere_question(ax):
    """Orthographic spheres with a shared camera and correct depth ordering.

    A sphere's silhouette is a circle in an orthographic view. Its equator
    projects to an ellipse with minor radius b*sin(elevation). The far arc
    must pass behind the charged sphere; the near arc passes in front of it.
    Both radius arrows lie in the camera plane and end on their silhouettes.
    """
    canvas(ax,(-2.7,2.8),(-2.3,2.6),equal=True)
    a,b=.67,1.94
    elevation=np.deg2rad(10)
    ax.add_patch(Circle((0,0),b,fc=PAPER,ec=INK,lw=1.8,zorder=1))
    far=np.linspace(0,np.pi,181)
    near=np.linspace(np.pi,2*np.pi,181)
    wire(ax,np.column_stack((b*np.cos(far),b*np.sin(far)*np.sin(elevation))),
         color=MUTED,lw=1.15,ls='--',zorder=2)
    ax.add_patch(Circle((0,0),a,fc=FACE,ec='none',zorder=3))
    base=np.array(to_rgb(FACE));highlight=np.array(to_rgb(PAPER))
    for t in np.linspace(.05,1,18):
        shade=base*(1-.26*t)+highlight*.26*t
        ax.add_patch(Circle((-.10*a*t,.12*a*t),a*(1-.85*t),
                            fc=shade,ec='none',zorder=3))
    ax.add_patch(Circle((0,0),a,fc='none',ec=INK,lw=1.1,zorder=4))
    wire(ax,np.column_stack((b*np.cos(near),b*np.sin(near)*np.sin(elevation))),
         color=MUTED,lw=1.2,zorder=5)
    da=np.array([.31,.59]);da=da/np.linalg.norm(da)*a
    db=np.array([.5,1.87]);db=db/np.linalg.norm(db)*b
    arrow(ax,(0,0),da,color=ACCENT,zorder=7,shrinkA=0,shrinkB=0)
    arrow(ax,(0,0),db,color=RED,zorder=7,shrinkA=0,shrinkB=0)
    ax.add_patch(Circle((0,0),.018,fc=INK,ec='none',zorder=8))
    text(ax,da[0]+.19,da[1]+.02,r'$a$',fontsize=14,color=ACCENT)
    text(ax,db[0]+.02,db[1]+.2,r'$b$',fontsize=14,color=RED)
    text(ax,-.23,.045,r'$\rho_0$',ha='center',fontsize=13)
    text(ax,-.94,.86,r'$\varepsilon_0$',fontsize=13)
    text(ax,1.56,1.34,r'$\rho_{sb}$',fontsize=13)


def plates(ax):
    canvas(ax,(-1.2,7.4),(-.7,3.5))
    wire(ax,[(.2,0),(.2,3)],lw=2);wire(ax,[(5.1,0),(5.1,3)],lw=2)
    wire(ax,[(.2,1.5),(5.1,1.5)],ls='--',lw=1)
    text(ax,2.65,2.2,r'$\varepsilon_1$',ha='center',fontsize=15)
    text(ax,2.65,.72,r'$\varepsilon_2$',ha='center',fontsize=15)
    text(ax,.0,1.5,r'$V=V_0$',rotation=90,ha='center',va='center',fontsize=11)
    text(ax,5.36,1.5,r'$V=V_1$',rotation=90,ha='center',va='center',fontsize=11)
    arrow(ax,(-.55,0),(-.55,3.2));arrow(ax,(.2,-.3),(5.7,-.3))
    for z,label in [(3,r'$z=H$'),(1.5,r'$z=H/2$'),(0,r'$z=0$')]:text(ax,-.72,z,label,ha='right',va='center',fontsize=11)
    text(ax,.2,-.62,r'$x=0$',ha='center',fontsize=11);text(ax,5.1,-.62,r'$x=L$',ha='center',fontsize=11)


def boundaries(ax):
    canvas(ax,(-.2,8.3),(-.4,4.2))
    ax.add_patch(Rectangle((.2,.8),4.8,1.8,fc=FACE,ec='none'))
    for y in [.8,2.6]:wire(ax,[(.2,y),(5,y)],lw=2)
    text(ax,.25,2.84,r'$\varepsilon_1$',fontsize=14)
    text(ax,.25,1.5,r'$\varepsilon_2$',fontsize=14)
    text(ax,.25,.38,r'$\varepsilon_3$',fontsize=14)
    arrow(ax,(.95,3.72),(2.18,2.72),color=ACCENT)
    text(ax,.9,3.86,r'$\vec E_1$',fontsize=13,color=ACCENT)
    text(ax,5.2,2.6,r'$y=0.01\ \mathrm{m}$',va='center',fontsize=11)
    text(ax,5.2,.8,r'$y=0\ \mathrm{m}$',va='center',fontsize=11)
    arrow(ax,(6.65,.38),(7.6,.38));arrow(ax,(6.65,.38),(6.65,1.32))
    text(ax,7.77,.37,'$x$',va='center');text(ax,6.64,1.46,'$y$',ha='center')


def charged_spheres(ax):
    canvas(ax,(-3.5,3.9),(-.8,3.4),equal=True)
    arrow(ax,(-2.95,0),(3.2,0));arrow(ax,(-2.95,0),(-2.95,3))
    text(ax,3.36,0,'$x$',va='center');text(ax,-2.95,3.2,'$z$',ha='center')
    text(ax,-3.12,0,r'$z=0$',ha='right',va='center',fontsize=11)
    text(ax,-2.6,2.53,r'$\varepsilon_0$',fontsize=14)
    for x,charge in [(-2.2,'$Q$'),(2.2,'$-Q$')]:
        # Concentric vector discs give the same sphere cue as the source shading.
        ax.add_patch(Circle((x,0),.4,fc=SIDE,ec=INK,lw=1))
        for i in range(12):
            ax.add_patch(Circle((x-.10*i/12,.10*i/12),.39*(1-i/15),
                                fc=FACE,ec='none',alpha=.03))
        arrow(ax,(x,0),(x-.15,.35))
        text(ax,x-.36,.45,'$a$',fontsize=12)
        text(ax,x+.29,.48,charge,fontsize=14)
        text(ax,x,-.72,r'$x=-d$' if x<0 else r'$x=d$',ha='center',fontsize=11)
    ax.plot([0,0],[0,2.4],'.',color=INK,markersize=4)
    text(ax,0,-.35,'$O$',ha='center')
    text(ax,.3,2.4,r'$P=(0,0,z)$',va='center',fontsize=13)


def conducting_plane(ax):
    canvas(ax,(-3.0,4.1),(-1.5,2.8),equal=True)
    ax.add_patch(Rectangle((-2.7,-1.15),4.7,1.15,fc='none',ec=MUTED,hatch='///',lw=0))
    wire(ax,[(-2.7,0),(2,0)],lw=1.7)
    for x,q in [(-1.85,'$-q$'),(.95,'$+q$')]:
        ax.plot([x],[1.8],'.',markersize=6,color=INK)
        text(ax,x-.09,1.92,q,ha='right',fontsize=13)
        wire(ax,[(x,-.06),(x,.06)],lw=1)
        text(ax,x,.13,r'$-x_0$' if x<0 else r'$+x_0$',ha='center',fontsize=11)
    text(ax,-.43,.13,'$0$',ha='center',fontsize=11)
    arrow(ax,(1.38,.05),(1.38,1.8),style='<->')
    text(ax,1.53,.93,'$z_0$',va='center',fontsize=12)
    text(ax,2.12,0,r'$z=0$',va='center',fontsize=12)
    arrow(ax,(3.07,0),(3.87,0));arrow(ax,(3.07,0),(3.07,.9))
    text(ax,4.02,0,'$x$',va='center');text(ax,3.07,1.05,'$z$',ha='center')


def bounce_template(ax):
    canvas(ax,(-.55,1.65),(-.5,4.5))
    arrow(ax,(0,0),(0,4.3));arrow(ax,(1.1,0),(1.1,4.3))
    wire(ax,[(0,0),(1.1,0)],lw=2)
    for i,label in enumerate([r'$V_1^+$',r'$V_1^-$',r'$V_2^+$',r'$V_2^-$']):
        a,b=((0,i),(1.1,i+1)) if i%2==0 else ((1.1,i),(0,i+1))
        arrow(ax,a,b,color=ACCENT)
        text(ax,.55,i+.64,label,ha='center',fontsize=12)
    text(ax,-.09,4.35,'$t$',ha='center',fontsize=12)
    text(ax,0,-.33,r'$z=0$',ha='center',fontsize=11)
    text(ax,1.1,-.33,r'$z=L$',ha='center',fontsize=11)


