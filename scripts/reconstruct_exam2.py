#!/usr/bin/env python3
"""Typeset the inspected printed Exam 2; never copy submission scan pixels.

This is an offline PDF/asset tool, not a question-bank compiler. The Markdown
articles remain independently authored and are not read or rewritten here.
Run from any directory with Python + reportlab + PyMuPDF. All published PDFs
contain vector/text objects only. The private submission remains in reference/.
"""
from __future__ import annotations

import argparse
import hashlib
import io
import json
from pathlib import Path

import pymupdf
from reportlab.lib import colors
from reportlab.lib.styles import ParagraphStyle
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.pdfgen import canvas
from reportlab.platypus import Paragraph

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / 'reference/Exams/Exam2/submission_369646790(1).pdf'
SOURCE_SHA256 = '835d89bf996ba7fa0f8f92c6ffa835bc79f2ca626386c26feba001891743f792'
PAPER = 'exam2_u00'
WIDTH, HEIGHT = 612, 792

# Transcribed from rendered submission PDF pages 4–7, including printed typos.
# Each tuple is (printed heading, paragraphs). Page breaks are editorial.
QUESTION_PAGES = [
    ('2. (21 points) Single choice questions. 3 points each.', [
        '2-1 &nbsp; Which of the following can change the <i>rotation speed</i> of a synchronous motor:',
        'A. Altering the frequency of voltage applied to stator winding.<br/>B. Altering the current magnitude applied to rotor winding.<br/>C. The sequence of appearance of the three-phase windings on the stator',
        '2-2 &nbsp; Which of the following can change the <i>rotation direction</i> of a synchronous motor:',
        'A. Altering the frequency of voltage applied to stator winding.<br/>B. Altering the current magnitude applied to rotor winding.<br/>C. The sequence of appearance of the three-phase windings on the stator.',
        '2-3 &nbsp; Which of the following can change the <i>magnitude of the internal generated voltage E<sub>A</sub></i> of a synchronous motor:',
        'A. Altering the frequency of voltage applied to stator winding.<br/>B. Altering the current magnitude applied to rotor winding.<br/>C. The sequence of appearance of the three-phase windings on the stator.',
        '2-4 &nbsp; The same synchronous motor is used in two cases. In <i>case one</i>, a three-phase 100V 50Hz AC voltage is applied to its stator winding. The angular speed of its rotor is ω<sub>m1</sub>. The motor delivers 10 hp (horse power) to the load. In <i>case two</i>, a three-phase 100V 60Hz AC voltage is applied to its stator winding. The angular speed of its rotor is ω<sub>m2</sub>. The motor also delivers 10 hp (horse power) to the load.',
        'A. ω<sub>m1</sub> &gt; ω<sub>m2</sub><br/>B. ω<sub>m1</sub> &lt; ω<sub>m2</sub><br/>C. ω<sub>m1</sub> = ω<sub>m2</sub>',
    ]),
    ('2. Single choice questions (continued)', [
        '2-5 &nbsp; If we reconnect an ordinary transformer into an auto-transformer, then the rated apparent power of the autotransformer can be higher than the rated apparent power of the original transformer.',
        'A. True.<br/>B. False.',
        '2-6 &nbsp; A synchronous generator provides power to a RL series circuit. If we increase the angular speed of the rotor of the synchronous generator, which of the following is true?',
        'A. The magnitude of the internal generated voltage E<sub>A</sub> will increase.<br/>B. The frequency of the output voltage will not change.<br/>C. The power factor of the load will increase.',
        '2-7 &nbsp; A synchronous machine has three-phase stator windings evenly placed on its stator with a sequence of a-c’-b-a’-c-b’. Now suppose we supply the windings with AC current with frequency of 60Hz and magnitude of 10A, and the current phasors in three sets of windings have the <i>same angle</i>. Which of the following can be correct about the generated stator magnetic field?',
        'A. counterclockwise rotating magnetic field with constant magnitude,<br/>B. clockwise rotating magnetic field with constant magnitude,<br/>C. The magnetic field has time-varying magnitude but does not rotate.',
    ]),
    ('3. (20 points)', [
        'A three-phase Y-connected synchronous generator is driven by a primer mover to produce 60Hz AC voltage. It has a synchronous reactance of j2 Ω per phase and negligible synchronous resistance. When the excitation current is 10A, and no load is connected to stator windings, the line-to-line voltage at the output is measured to be 100V. Now we increase the excitation current to 20A and connect a three phase Y-connected load with an impedance of 10+j10 Ω per phase to the generator. We adjust the mechanical input to the generator such that the speed of its rotor is the same as before. Under the new condition,',
        '(10 points) Draw the single-phase equivalent circuit of the system and label the impedances.',
        '(10 points) Find the RMS value of the line-to-line voltage at the load side.',
    ]),
    ('4. (22 points)', [
        'A three-phase 1.732-kV 2-pole 60-Hz Y-connected synchronous generator has a synchronous reactance of j1Ω per phase and negligible armature resistance. The synchronous generator is driven by a turbine.',
        'Suppose under certain load condition, the RMS value of the line-to-line terminal voltage of the generator is 1.732kV, and the generator supplies 1.5MW real power to the load. The power angle is 30° at this operating condition.',
        'a) (7 points) How much torque is supplied by the turbine to the generator, assuming that all losses are neglected?',
        'b) (7 points) What is the RMS value of the internal generated voltage in each phase of the generator?',
        'c) (8 points) What is the power factor of the load?',
    ]),
    ('5. (32 points)', [
        'A 600V three-phase Δ-connected synchronous motor is connected to a 600V bus. The motor has a synchronous reactance of j4 Ω per phase and negligible armature.',
        'a) (16 points) Under certain load condition, the internal voltage lags the terminal voltage by 60° in each phase, and the developed power in the motor is 40 kW. Find the RMS value of the line current.',
        'b) (10 points) We increase the field current by 20% and adjust the prime mover such that the motor achieves it maximum developed power. Find the new torque angle and the RMS value of the new line current.',
        'c) (6 points) What is the reactive power the motor consumes? What is the RMS value of the current in each phase of its stator windings?',
    ]),
]

# Independently authored worked PDF. This is not an official answer document.
# Unicode equations remain searchable text; no raster math or scan is embedded.
SOLUTION_PAGES = [
    ('Question 2 · parts 2-1 to 2-4', [
        '<b>2-1.</b> Lecture 10 p. 9: n<sub>s</sub> = 120f/p. For the same pole count, n′/n = f′/f. Field current changes flux and spatial phase sequence changes direction. <b>Choice A.</b>',
        '<b>2-2.</b> Lecture 10 p. 8 constructs the rotating field. Write B(t) = B<sub>0</sub>[cos(ωt)x̂ + sin(ωt)ŷ]. Interchanging two spatial phase assignments gives B<sub>rev</sub>(t) = B<sub>0</sub>[cos(ωt)x̂ − sin(ωt)ŷ]. The field rotates in reverse. <b>Choice C.</b>',
        '<b>2-3.</b> Lecture 10 p. 14: |E<sub>A</sub>| = 4.44fNΦ. At fixed f, field current changes Φ; in a linear magnetic circuit Φ = k<sub>f</sub>I<sub>f</sub>, hence |E′|/|E| = I′<sub>f</sub>/I<sub>f</sub>. <b>Intended choice B at fixed frequency.</b>',
        '<b>Source ambiguity:</b> fixed frequency is not printed. Changing f with unchanged flux also changes internal voltage, so A is possible under a literal reading. Saturation prevents assuming exact field-current proportionality in general.',
        '<b>2-4.</b> Lecture 10 p. 9: ω<sub>m</sub> = (2π/60)(120f/p) = 4πf/p. The pole count is unchanged; ω<sub>m2</sub>/ω<sub>m1</sub> = 60/50 = 1.2. Equal output horsepower changes torque, not synchronous speed. <b>ω<sub>m1</sub> &lt; ω<sub>m2</sub>; choice B.</b>',
    ]),
    ('Question 2 · parts 2-5 to 2-7', [
        '<b>2-5.</b> Lecture 4 p. 26: S<sub>two</sub> = V<sub>1</sub>I<sub>1</sub> = V<sub>2</sub>I<sub>2</sub>. Connect winding 1 as common winding and winding 2 in series-aiding. Output voltage is V<sub>1</sub> + V<sub>2</sub>; series current is limited to I<sub>2</sub>. Therefore S<sub>auto</sub> = (V<sub>1</sub> + V<sub>2</sub>)I<sub>2</sub> = (1 + V<sub>1</sub>/V<sub>2</sub>)S<sub>two</sub> &gt; S<sub>two</sub>, subject to insulation and connection ratings. <b>Choice A, True.</b>',
        '<b>2-6.</b> Lecture 10 pp. 9, 14: f = pn/120 and |E<sub>A</sub>| = 4.44fNΦ. A fixed RL series load has pf = R/√[R² + (2πfL)²]. At fixed flux, increasing n increases f and |E<sub>A</sub>|, while power factor decreases. <b>Choice A under fixed excitation.</b> The question does not specify a regulator; an isolated generator is assumed, not an infinite-bus-constrained machine.',
        '<b>2-7.</b> Use spatial MMF superposition (Lecture 10 pp. 8, 14). All three currents are i(t) = I<sub>pk</sub>cos(120πt + α). With winding axes 0, 2π/3, 4π/3, the fundamental is',
        'F<sub>1</sub>(θ,t) = N<sub>1</sub>i(t)[cos θ + cos(θ − 2π/3) + cos(θ − 4π/3)] = 0.',
        'The cosine coefficients sum to 1 − 1/2 − 1/2 = 0, and the sine coefficients sum to 0 + √3/2 − √3/2 = 0. A third spatial harmonic instead gives',
        'F<sub>3</sub>(θ,t) = 3N<sub>3</sub>I<sub>pk</sub>cos(3θ)cos(120πt + α).',
        'Its nodes are fixed and its amplitude pulsates. <b>C can occur with spatial harmonics; the ideal fundamental is zero.</b> Under the lecture’s purely sinusoidal winding model none of the printed choices describes a nonzero fundamental. Equal phase currents require independent supplies or a neutral/return path; a three-wire star circuit cannot support them. The unspecified RMS/peak current convention does not affect cancellation.',
    ]),
    ('Question 3 · loaded Y-connected generator', [
        '<b>(a)</b> Lecture 10 p. 18: E<sub>A</sub> = V<sub>φ</sub> + jX<sub>s</sub>I<sub>A</sub>, with current flowing out of the generator; V<sub>φ</sub> = Z<sub>L</sub>I<sub>A</sub>. The single-phase circuit below has a common neutral return. The source is in series with Z<sub>s</sub> = j2 Ω and the phase load Z<sub>L</sub> = 10+j10 Ω. Total series impedance is <b>10+j12 Ω</b>. Both Y connections give I<sub>L</sub> = I<sub>A</sub>.',
        '<b>(b)</b> Lecture 10 p. 14 gives |E<sub>A</sub>| proportional to fΦ. At no load the phase current is zero, so |E<sub>A0</sub>| = V<sub>LL0</sub>/√3 = 100/√3 = 57.7350 V.',
        'At unchanged speed and assuming an unsaturated linear magnetic circuit, |E<sub>A1</sub>| = (20/10)(100/√3) = 115.4701 V.',
        'From the series circuit, V<sub>φ</sub> = E<sub>A1</sub>Z<sub>L</sub>/(Z<sub>L</sub> + jX<sub>s</sub>) = (200/√3)(10+j10)/(10+j12) V.',
        '|V<sub>φ</sub>| = (200/√3)√(10²+10²)/√(10²+12²) = 104.5417 V.',
        '<b>V<sub>LL</sub> = √3(104.5417) = 200√(200/244) = 181.0715 V RMS.</b>',
        '<b>Source correction:</b> “primer mover” is printed. The printed j2 Ω is impedance; X<sub>s</sub> = 2 Ω. Doubling field current does not guarantee doubled flux with saturation (Lecture 10 p. 15). Without the assumed linear magnetization and unchanged reactance, no unique numerical loaded voltage follows from the supplied data.',
    ]),
    ('Question 4 · turbine-driven generator', [
        '<b>(a)</b> Lecture 10 p. 9 gives n<sub>s</sub> = 120f/p; mechanical power is P = Tω<sub>m</sub>. Substituting f = 60 Hz and p = 2 gives n<sub>s</sub> = 3600 rpm and ω<sub>m</sub> = 2π(3600)/60 = 120π rad/s. With all losses neglected, P<sub>mech</sub> = 1.5×10⁶ W. <b>T = 1.5×10⁶/(120π) = 3978.87 N m.</b>',
        '<b>(b)</b> Lecture 10 p. 24: P = 3|E<sub>A</sub>|V<sub>φ</sub>sin δ/X<sub>s</sub>. For Y connection, V<sub>φ</sub> = 1732/√3 = 999.970666 V. Therefore',
        '|E<sub>A</sub>| = PX<sub>s</sub>/(3V<sub>φ</sub>sin δ) = (1.5×10⁶)(1)/[3(1732/√3)sin 30°] = <b>1000.029335 V RMS per phase.</b>',
        '<b>(c)</b> Lecture 10 pp. 18, 20 give I<sub>A</sub> = (E<sub>A</sub> − V<sub>φ</sub>)/(jX<sub>s</sub>) and S<sub>load</sub> = 3V<sub>φ</sub>I<sub>A</sub>*. Choose V<sub>φ</sub> as the zero-angle reference and use the result of (b):',
        'I<sub>A</sub> = [1000.029335(cos 30° + j sin 30°) − 999.970666]/j = 500.014667 + j133.919858 A.',
        'Current angle = arctan(133.919858/500.014667) = +14.993727°. The load current leads its voltage, and its received reactive power is negative.',
        '<b>pf = 500.014667/√(500.014667² + 133.919858²) = 0.965954 leading.</b>',
        '<b>Source convention:</b> j1 Ω is the synchronous impedance, so X<sub>s</sub> = 1 Ω. The printed 1.732 kV is retained exactly rather than replaced by 1000√3 V.',
    ]),
    ('Question 5 · delta-connected motor', [
        '<b>(a)</b> Reverse the generator-current convention of Lecture 10 pp. 18, 24. With motor current inward and δ a positive lag, P<sub>dev</sub> = 3V<sub>φ</sub>|E<sub>A</sub>|sin δ/X<sub>s</sub>; I<sub>φ</sub> = [V<sub>φ</sub> − |E<sub>A</sub>|∠(−δ)]/(jX<sub>s</sub>). Delta gives V<sub>φ</sub> = 600 V and I<sub>L</sub> = √3|I<sub>φ</sub>|.',
        '|E<sub>A,a</sub>| = 40000(4)/[3(600)sin 60°] = 102.640048 V.',
        'I<sub>φ,a</sub> = [600 − 102.640048(0.5 − j0.8660254)]/(j4) = 22.222222 − j137.169994 A. Its magnitude is √(22.222222² + 137.169994²) = 138.958391 A. <b>I<sub>L,a</sub> = √3(138.958391) = 240.682993 A RMS.</b>',
        '<b>(b)</b> Differentiate P<sub>dev</sub> with respect to δ: dP/dδ = (3V<sub>φ</sub>|E<sub>A</sub>|/X<sub>s</sub>)cos δ. Its positive maximum is at δ = 90°, where the second derivative is negative. Linear excitation gives |E<sub>A,b</sub>| = 1.2(102.640048) = 123.168057 V.',
        'I<sub>φ,b</sub> = [600 − 123.168057∠(−90°)]/(j4) = 30.792014 − j150 A. |I<sub>φ,b</sub>| = √(30.792014² + 150²) = 153.127882 A.',
        '<b>New torque angle = 90° lag (signed internal-voltage angle −90°); I<sub>L,b</sub> = √3(153.127882) = 265.225271 A RMS.</b>',
        '<b>(c)</b> Lecture 10 p. 20: S<sub>in</sub> = 3V<sub>φ</sub>I<sub>φ</sub>*. Continuing (b), S<sub>in,b</sub> = 3(600)(30.792014 + j150) = 55425.626 + j270000 VA. Positive Q means motor absorption. <b>Q<sub>in,b</sub> = 270.000 kvar and winding current = 265.225271/√3 = 153.127882 A RMS.</b>',
        '<b>Source ambiguities:</b> “negligible armature” is incomplete; negligible armature resistance is assumed. “Adjust the prime mover” is interpreted as adjusting mechanical shaft loading. Exact maximum power is the ideal stability boundary. Field-current scaling assumes no saturation. Part (c) does not identify its operating condition: if it instead refers to (a), Q<sub>in,a</sub> = 3(600)(137.169994) = 246.905989 kvar and winding current = 138.958391 A. The printed data alone do not resolve that wording.',
    ]),
]


def register_fonts():
    # Matplotlib ships the complete family, including italic faces absent on
    # some minimal Linux installations. Use those exact local font files.
    import matplotlib
    base = Path(matplotlib.get_data_path()) / 'fonts/ttf'
    for name, filename in [('ExamSans', 'DejaVuSans.ttf'), ('ExamSans-Bold', 'DejaVuSans-Bold.ttf'),
                           ('ExamSans-Italic', 'DejaVuSans-Oblique.ttf'), ('ExamSans-BoldItalic', 'DejaVuSans-BoldOblique.ttf')]:
        pdfmetrics.registerFont(TTFont(name, str(base / filename)))
    pdfmetrics.registerFontFamily('ExamSans', normal='ExamSans', bold='ExamSans-Bold', italic='ExamSans-Italic', boldItalic='ExamSans-BoldItalic')


def circuit(c, y):
    """Single-phase generator circuit, with native PDF paths and text."""
    c.saveState()
    c.setStrokeColor(colors.HexColor('#15212a'))
    c.setLineWidth(1.4)
    c.circle(115, y, 20)
    c.line(115, y+20, 115, y+55)
    c.line(115, y+55, 220, y+55)
    for i in range(4):
        c.arc(220+i*14, y+48, 234+i*14, y+62, 0, 180)
    c.line(276, y+55, 450, y+55)
    c.line(450, y+55, 450, y+25)
    c.rect(437, y-25, 26, 50)
    c.line(450, y-25, 450, y-55)
    c.line(450, y-55, 115, y-55)
    c.line(115, y-55, 115, y-20)
    c.setFont('ExamSans', 10)
    c.drawString(75, y-3, 'E_A')
    c.drawString(224, y+78, 'j2 Ω')
    c.drawString(472, y-3, '10+j10 Ω')
    c.drawString(115, y+4, '+')
    c.drawString(115, y-13, '−')
    c.drawString(323, y+72, 'I_A →')
    c.drawString(325, y-75, 'neutral return')
    c.restoreState()


def typeset(pages, *, solutions=False):
    register_fonts()
    output = io.BytesIO()
    c = canvas.Canvas(output, pagesize=(WIDTH, HEIGHT), invariant=1, pageCompression=1)
    c.setTitle('Exam 2 — Independent worked solutions' if solutions else 'Exam 2 — Clean reconstructed printed questions')
    c.setAuthor('Fieldnotes — independent reconstruction')
    c.setSubject('Undated archive; no submission images or personal annotations')
    body = ParagraphStyle('body', fontName='ExamSans', fontSize=10.4 if solutions else 11,
                          leading=15.3 if solutions else 16.3, textColor=colors.HexColor('#15212a'))
    head = ParagraphStyle('head', parent=body, fontName='ExamSans-Bold', fontSize=12.5, leading=18)
    rectangles = []
    for index, (heading, paragraphs) in enumerate(pages, 1):
        c.setFillColor(colors.HexColor('#15212a'))
        c.setFont('ExamSans-Bold', 17)
        c.drawString(48, 748, 'Exam 2 · Undated archive')
        c.setFont('ExamSans', 9)
        c.drawString(48, 728, 'Independent worked solutions · not an official answer key' if solutions else 'Clean reconstruction · printed questions only · 95 academic points')
        c.setStrokeColor(colors.HexColor('#b9c5cd'))
        c.line(48, 716, 564, 716)
        y = 694
        for text, style in [(heading, head), *[(p, body) for p in paragraphs]]:
            paragraph = Paragraph(text, style)
            _, h = paragraph.wrap(516, HEIGHT)
            y -= h
            if y < 52:
                raise ValueError(f'Page {index} overflows: {heading}, bottom {y}')
            paragraph.drawOn(c, 48, y)
            y -= 9
        if solutions and index == 3:
            if y < 205:
                raise ValueError('Insufficient room for circuit')
            circuit(c, y-93)
        rectangles.append([round(48/WIDTH,6), round((HEIGHT-694)/HEIGHT,6),
                           round(516/WIDTH,6), round((694-y+3)/HEIGHT,6)])
        c.setFont('ExamSans', 8)
        c.drawString(48, 29, 'Independent typesetting; original numbering retained. Q1 is not reconstructed.')
        c.drawRightString(564, 29, f'{index} / {len(pages)}')
        c.showPage()
    c.save()
    data = output.getvalue()
    with pymupdf.open(stream=data, filetype='pdf') as pdf:
        assert len(pdf) == len(pages)
        assert all(not page.get_images() for page in pdf), 'Reconstruction must contain no raster images'
    return data, rectangles


def write_assets(locale, questions, solutions, rectangles, render_pages):
    directory = ROOT / 'content' / locale / PAPER
    for sub in ['sources', 'pages', 'original-figures', 'figures']:
        (directory/'assets'/sub).mkdir(parents=True, exist_ok=True)
    (directory/'extracted').mkdir(parents=True, exist_ok=True)
    registry = {}
    for doc_id, data, kind in [('e2-u00', questions, 'exam'), ('e2-u00-sol', solutions, 'solution')]:
        path = directory/'assets/sources'/f'{doc_id}.pdf'
        path.write_bytes(data)
        with pymupdf.open(stream=data, filetype='pdf') as pdf:
            title = ('Exam 2 · Clean reconstructed questions · Undated archive' if kind == 'exam'
                     else 'Exam 2 · Independent worked solutions · Not official')
            registry[doc_id] = {'id': doc_id, 'title': title, 'kind': kind, 'pages': len(pdf),
                'pdf': f'sources/{doc_id}.pdf', 'pageBase': f'pages/{doc_id}',
                'sizes': [[float(p.rect.width), float(p.rect.height)] for p in pdf],
                'original': f'scripts/reconstruct_exam2.py#{"printed-questions" if kind == "exam" else "independent-solutions"}',
                'sha256': hashlib.sha256(data).hexdigest()}
            (directory/'extracted'/f'{doc_id}.txt').write_text(
                '\n\n'.join(f'--- Page {i+1} ---\n{p.get_text()}' for i,p in enumerate(pdf)), encoding='utf-8')
            if render_pages:
                target = directory/'assets/pages'/doc_id
                target.mkdir(exist_ok=True)
                for i, p in enumerate(pdf, 1):
                    pix = p.get_pixmap(matrix=pymupdf.Matrix(1.5,1.5), alpha=False)
                    # The shared pipeline's format is WebP, named by PDF page.
                    from PIL import Image
                    Image.frombytes('RGB', [pix.width,pix.height], pix.samples).save(target/f'{i}.webp', 'WEBP', quality=88)
    (directory/'documents.json').write_text(json.dumps(registry, ensure_ascii=False, indent=2)+'\n')
    paper = {'id':'e2-u00', 'number':2, 'term':'Undated archive' if locale=='en' else '年份未注明',
             'year':None, 'points':95, 'doc':'e2-u00', 'solutionDoc':'e2-u00-sol', 'questionsOnly':True}
    (directory/'paper.json').write_text(json.dumps(paper, ensure_ascii=False, indent=2)+'\n')
    figures = {f'e2-u00-q{number}': {'doc':'e2-u00','page':page,'region':rectangles[page-1]}
               for number,page in [(2,1),(3,3),(4,4),(5,5)]}
    (directory/'figure-sources.json').write_text(json.dumps({'figures':figures,'panels':{}},indent=2)+'\n')
    provenance = {'source':str(SOURCE.relative_to(ROOT)), 'sourceSha256':SOURCE_SHA256,
        'sourceIsPublished':False, 'sourcePageMap':{'q2':4,'q3':5,'q4':6,'q5':7},
        'cleanPageMap':{'q2':[1,2],'q3':[3],'q4':[4],'q5':[5]},
        'excludedPages':{'1-2':'Grading summary; not printed question text',
                         '3':'Handwritten reference notes; no recoverable printed Q1 prompt', '8':'Blank'},
        'generator':str(Path(__file__).relative_to(ROOT)),
        'generatorSha256':hashlib.sha256(Path(__file__).read_bytes()).hexdigest(),
        'documents':{key:value['sha256'] for key,value in registry.items()}}
    import reportlab
    import matplotlib
    import platform
    provenance['toolchain']={'python':platform.python_version(), 'reportlab':reportlab.Version,
        'pymupdf':pymupdf.VersionBind, 'matplotlib':matplotlib.__version__}
    (directory/'extracted/reconstruction-provenance.json').write_text(json.dumps(provenance,indent=2)+'\n')
    # The printed questions have no diagrams. Keep their source rectangles for
    # page citations, but do not manufacture prompt-image cards or crops.
    print(f'{locale}/{PAPER}: two vector PDFs, provenance and extracted text written; no prompt diagrams.')


def main():
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--no-pages',action='store_true',help='Skip PDF page preview images')
    args=parser.parse_args()
    if not SOURCE.is_file() or hashlib.sha256(SOURCE.read_bytes()).hexdigest()!=SOURCE_SHA256:
        raise SystemExit('The inspected reference submission is missing or has changed; review it before regenerating.')
    questions,rectangles=typeset(QUESTION_PAGES)
    solutions,_=typeset(SOLUTION_PAGES,solutions=True)
    for locale in ['en','zh-cn']:
        write_assets(locale,questions,solutions,rectangles,not args.no_pages)


if __name__=='__main__':
    main()
