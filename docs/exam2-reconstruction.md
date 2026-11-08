# Exam 2: clean reconstruction of an undated submission

The package `content/{en,zh-cn}/exam2_u00/` reconstructs the **printed academic
questions Q2–Q5**, not the submitted work. The stable paper ID is `e2-u00`, the
year is `null`, and the displayed term is “Undated archive” / “年份未注明”. No
date is recoverable from the printed question pages; the dates of neighboring
files and lecture notes are not evidence of this paper's date.

## Source and exclusions

The inspected local input is
`reference/Exams/Exam2/submission_369646790(1).pdf`, SHA-256
`835d89bf996ba7fa0f8f92c6ffa835bc79f2ca626386c26feba001891743f792`.
PyMuPDF rendered fresh page images from this file for inspection. The submitted
answer calculations and circled choices were not treated as authoritative.

| Input PDF pages (1-based) | Treatment |
| --- | --- |
| 1–2 | Grading summaries excluded completely. |
| 3 | Handwritten reference/formula sheet excluded. It has no recoverable printed Q1 prompt. |
| 4 | Printed Q2, seven multiple-choice items, transcribed. |
| 5 | Printed Q3, generator and load, transcribed. |
| 6 | Printed Q4, turbine-driven generator, transcribed. |
| 7 | Printed Q5, delta-connected motor, transcribed. |
| 8 | Blank page excluded. |

Q1 is not reconstructed or renumbered. The available page is a handwritten
reference sheet, **not a verified printed pledge question**. The export's
assessment entry does not recover a printed problem statement. A pledge is
therefore not invented. Student names, identifiers, handwriting, grading marks,
rubrics, submission overlays and photographed surroundings are absent from the
local clean PDFs and published page images, crops, SVGs and articles. The raw export is never
copied into either paper's `assets/`.

## Scores and page mapping

| Printed question | Declared points | Part points | Clean question PDF | Independent solution PDF |
| --- | --- | --- | --- | --- |
| 2 | 21 | Seven items, 3 each | 1–2 | 1–2 |
| 3 | 20 | 10, 10 | 3 | 3 |
| 4 | 22 | 7, 7, 8 | 4 | 4 |
| 5 | 32 | 16, 10, 6 | 5 | 5 |

The reconstructed academic total is **95 points**. Printed Q2 item labels
`2-1` through `2-7` remain intact. Q3's two unlettered printed requests are
assigned stable article labels `a`, `b` without changing their wording or scores.
Q4 and Q5 retain their printed letters. No new Q1 or replacement five-point
exercise is authored.

Each locale independently owns a copy of `e2-u00.pdf` and `e2-u00-sol.pdf`.
The first is a clean typesetting of questions only. The second is explicitly
headed **“Independent worked solutions · not an official answer key”**. Both
contain searchable text and vector paths; neither embeds any raster image.
Consequently `questionsOnly` is `true`, and `solutionDoc` is the distinct
`e2-u00-sol`, never an alleged official key or the raw submission.

The source registry records `scripts/reconstruct_exam2.py#printed-questions`
and `#independent-solutions` as the actual origin of the delivered documents.
The private input hash and original-to-clean page map are preserved separately
in each paper's `extracted/reconstruction-provenance.json`, alongside generator
and delivered-PDF hashes and toolchain versions. `documents.json` contains the
SHA-256 of each actual delivered PDF, not the unrelated raw scan's hash.

## Scientific ambiguities and conventions

The English articles preserve printed wording, including “primer mover”,
“negligible armature”, and “it maximum developed power”. Chinese articles
translate the statements and explain the same defects independently.

- **Q2-3:** B is the usual answer for excitation control at fixed frequency.
  The printed wording omits that restriction. Since generated voltage is
  proportional to frequency times flux, changing frequency (A) can also change
  its magnitude. The unrestricted single-choice question is ambiguous.
- **Q2-6:** A assumes fixed rotor flux and an isolated RL load. Frequency rises
  with mechanical speed and RL power factor decreases. An automatic regulator
  or an infinite-bus connection would change the assumptions.
- **Q2-7:** The printed current phasors have the **same** angle. For equal,
  sinusoidally distributed windings, their fundamental spatial MMFs sum to
  zero, not a nonzero pulsating or rotating field. A third spatial harmonic
  can add to form a standing field with time-varying magnitude, making C
  possible as worded (“can be correct”), but its presence is not specified.
  Both articles show the fundamental cancellation and harmonic alternative.
  Identical phase currents also require separate supplies or a return path;
  they cannot flow in a three-wire star circuit. The RMS/peak ambiguity in
  “magnitude of 10A” does not affect this argument.
- **Q3:** Doubling excitation current only doubles generated voltage in the
  linear, unsaturated approximation. No magnetization curve is given; the
  numerical answer is explicitly conditional on that model and unchanged
  synchronous reactance. The original `j2 Ω` is impedance, with `Xs = 2 Ω`.
- **Q4:** The printed `1732 V` is retained exactly, rather than replaced by
  `1000√3 V`. Outward generator current leads the terminal voltage; the load
  therefore has a **leading**, not lagging, power factor. `j1 Ω` denotes
  impedance and `Xs = 1 Ω`.
- **Q5:** “Negligible armature” is incomplete; negligible armature resistance
  is the stated interpretation. The motor's “prime mover” adjustment is
  interpreted as a shaft-load adjustment. Field-current scaling again assumes
  no saturation. Maximum developed power at a positive lag of 90 degrees is
  the ideal stability boundary, not a stable operating point with margin.
- **Q5(c):** The problem does not identify whether it continues (a) or (b).
  Sequential reading uses (b); the alternative original-condition result is
  explicitly retained in a source-correction note in each article and the
  independent PDF. The submitted calculations are not used to choose a
  condition silently.

## Independently computed numerical results

| Quantity | Result |
| --- | --- |
| Q3 new internal phase voltage, linear magnetization | 115.4701 V RMS |
| Q3 loaded line-to-line voltage | 181.0715 V RMS |
| Q4 synchronous mechanical speed | 3600 rpm; 120π rad/s |
| Q4 turbine torque | 3978.87 N m |
| Q4 internal phase voltage | 1000.0293 V RMS |
| Q4 outward phase current | 500.0147 + j133.9199 A |
| Q4 load power factor | 0.965954 leading |
| Q5(a) internal phase voltage | 102.64005 V RMS |
| Q5(a) winding current | 22.22222 − j137.16999 A; magnitude 138.9584 A |
| Q5(a) line-current magnitude | 240.6830 A RMS |
| Q5(b) internal phase voltage, linear magnetization | 123.16806 V RMS |
| Q5(b) torque angle | 90 degrees lag; internal-voltage signed angle −90 degrees |
| Q5(b) winding current | 30.79201 − j150 A; magnitude 153.1279 A |
| Q5(b) line-current magnitude | 265.2253 A RMS |
| Q5(c), continuing (b) | 270.000 kvar absorbed; 153.1279 A RMS per winding |
| Q5(c), alternative reference to (a) | 246.906 kvar absorbed; 138.9584 A RMS per winding |

## Verified lecture references

All page numbers below are 1-based PDF pages, checked against the actual lecture
PDFs in `reference/Lecture Notes/`. The articles cite lecture origins in prose.
Only relations actually printed on the Exam 2 `Reference_Sheet` receive inline
`formula:` links. Complex power and other lecture-only relations remain ordinary
prose citations, never entries in the formula table. Derived motor and
spatial-field relations retain their actual origin.

| Document ID | Actual source | Pages and purpose |
| --- | --- | --- |
| `lecture-04` | `Lecture4-EES-ECSE_2110-Fall_2026-PN.pdf` | 26: ideal voltage/current ratio and equal apparent-power ratings; the autotransformer capacity expression is then derived in the solution, not attributed as a printed formula on this page. |
| `lecture-10` | `Lecture10-EES-ECSE_2110-Fall_2026.pdf` | 8: rotating-field construction; 9: frequency and speed; 14: sinusoidal distributed windings and generated RMS voltage; 15: saturation; 18: generator circuit; 20: complex power; 24: round-rotor power-angle and reactive-power equations. |

The motor circuit/power-angle equations follow by explicitly reversing the
generator current convention; they are not mislabeled as an independently
printed motor formula. Mechanical torque uses the mechanical power definition.
The spatial-harmonic caveat is a displayed superposition derivation, not an
invented lecture quotation.

## Figures and clean crops

The printed questions have no diagrams, so every article explicitly uses
`figure: null`. No invented winding layout, generator/load picture, turbine
schematic or delta circuit appears in a prompt. The Q3 equivalent circuit is
attached only to its revealed solution. Each language owns that solution SVG in
both themes. Printed-prompt source rectangles still locate the clean question
PDF without producing image cards. Item-level source links for 2-5 through 2-7
open clean page 2; none opens or crops the private submission.

Chinese SVG ordinary labels are translated with the shared SVG font-subsetting
pipeline. The checked Matplotlib diagnostic PNGs precede that replacement;
delivered localized SVGs must also be inspected visually. Source metadata
rectangles are measured from the reconstructed typeset text bounds, stay inside
their pages after standard crop padding, and cite actual clean-PDF page numbers.

## Regeneration and checks

The website publishes only rendered page images, SVGs and crops, never PDF files.
The PDF generator writes only the owned paper metadata and offline assets; it
does not read, synthesize or rewrite Markdown question-bank articles. ReportLab,
PyMuPDF, Pillow and Matplotlib are required. DejaVu font files come from the
installed Matplotlib distribution. The generator checks the private input's
known hash before allowing regeneration, and uses invariant PDF metadata for
deterministic output in the recorded toolchain.

```bash
python3 scripts/reconstruct_exam2.py
python3 content/en/exam2_u00/generate_figures.py
python3 content/zh-cn/exam2_u00/generate_figures.py
python3 scripts/check_sources.py
python3 scripts/check_reconstruction.py
python3 scripts/check_figures.py
bun test tests/exam2-reconstruction.test.ts
bun run content:check
bun run check
bun test
bun run build
```

Both locale copies remain separate files, even though their PDF bytes
are identical English reconstructions. The already tracked small clean PDFs remain offline provenance originals, not
site downloads. Large original PDFs are optional local inputs for offline
regeneration; frontend CI and deployment require neither kind of PDF. Re-run page/crop generation
when changing typesetting, and update independently authored Markdown if a
transcription changes. PDF hashes are computed from actual bytes. Targeted Bun tests check printed scores and defects, exact numerical phasor
calculations, ambiguity notes, independent locale copies and real document hashes
without requiring Python. `check_reconstruction.py` additionally inspects PDF
objects, native text and vector paths and proves the zero-raster boundary. These checks do not substitute for human scientific and translation
review or the parent's desktop/phone integration review.

The clean PDFs have been checked for searchable native text/vector paths,
zero raster images, independent locale copies and deterministic generation in
the recorded toolchain. Repository-wide checks also cover the later practice
packages, text-only prompts, exam-specific reference sheets and clean source
selection. See the root README for the current verification commands; no stale
pre-migration question/figure totals are used as acceptance criteria.
