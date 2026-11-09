"""Schemdraw circuit symbols on paper-owned Matplotlib coordinates.

Paper renderers retain topology, labels, numeric data and translations. This
adapter only supplies standard symbols (in particular looped inductors), then
flushes them before Matplotlib font/layout checks and SVG export.
"""
import numpy as np
import schemdraw
import schemdraw.elements as E
import plotting as P

VERSION = schemdraw.__version__


class _Circuit:
    def __init__(self, ax):
        self.ax = ax
        self.drawing = schemdraw.Drawing(show=False, color=P.INK, bgcolor=P.PAPER,
                                        lw=1.6, fontsize=11, font='DejaVu Sans')
        self.drawn = False

    def add(self, element):
        if self.drawn:
            raise RuntimeError('Add circuit symbols before preparing/exporting the figure')
        return self.drawing.add(element)

    def finish(self):
        if self.drawn:
            return
        ax = self.ax
        limits = ax.get_xlim(), ax.get_ylim()
        aspect, adjustable, axis_on = ax.get_aspect(), ax.get_adjustable(), ax.axison
        old_artists = set(ax.lines) | set(ax.patches) | set(ax.texts)
        self.drawing.draw(canvas=ax, show=False)
        ax.set_xlim(*limits[0]); ax.set_ylim(*limits[1])
        ax.set_aspect(aspect, adjustable=adjustable)
        if not axis_on:
            ax.axis('off')
        for index, artist in enumerate([*ax.lines, *ax.patches, *ax.texts]):
            if artist not in old_artists:
                artist.set_gid(f'schemdraw-a{ax.figure.axes.index(ax)}-{index}')
        ax._schemdraw_elements = [type(element).__name__ for element in self.drawing.elements]
        self.drawn = True


def circuit(ax):
    if not hasattr(ax, '_fieldnotes_circuit'):
        ax._fieldnotes_circuit = _Circuit(ax)
    return ax._fieldnotes_circuit


def place(ax, element, a, b, *, scale=None, fraction=.78, color=None):
    """Place a standard two-terminal element with exact authored endpoints.

    A proportional symbol scale leaves short connecting leads, and also permits
    the small/diagonal branches used by the source diagrams without overshoot.
    """
    a, b = np.asarray(a, float), np.asarray(b, float)
    length = float(np.linalg.norm(b-a))
    if length <= 0:
        raise ValueError('Circuit symbol endpoints must differ')
    angle = float(np.degrees(np.arctan2((b-a)[1], (b-a)[0])))
    element.theta(angle).at(tuple(a)).to(tuple(b)).scale(scale if scale is not None else length*fraction)
    if color:
        element.color(color)
    result = circuit(ax).add(element)
    if not np.allclose(result.start, a) or not np.allclose(result.end, b):
        raise AssertionError(f'{type(element).__name__}: symbol endpoints do not match the circuit')
    return result


def resistor(ax, a, b, *, color=None):
    return place(ax, E.ResistorIEEE(), a, b, color=color)


def impedance(ax, a, b, *, color=None):
    return place(ax, E.ResistorIEC(), a, b, color=color)


def inductor(ax, a, b, *, color=None, loops=4):
    return place(ax, E.Inductor2(loops=loops), a, b, color=color)


def capacitor(ax, a, b, *, color=None):
    return place(ax, E.Capacitor(), a, b, color=color)


def source(ax, a, b, *, kind='voltage', radius=.32, color=None):
    cls = {'voltage': E.SourceV, 'ac': E.SourceSin, 'empty': E.Source}[kind]
    return place(ax, cls().fill(P.PAPER), a, b, scale=2*radius, color=color)


def terminal(ax, point, *, radius=.05, open=True, color=None):
    element = E.Dot(radius=radius, open=open).at(tuple(point))
    if color:
        element.color(color)
    return circuit(ax).add(element)


def diode(ax, a, b, *, scr=False, gate_left=False, color=None):
    element = E.SCR() if scr else E.Diode()
    if scr and gate_left:
        element.flip()
    return place(ax, element, a, b, fraction=.62, color=color)


def wire(ax, a, b, *, color=None, arrow=None, lw=1.6):
    element = E.Line(arrow=arrow).at(tuple(a)).to(tuple(b)).linewidth(lw)
    if color:
        element.color(color)
    return circuit(ax).add(element)
