# Source inspection record

Inspected all 16 rendered PDF pages, including the seven blank answer sheets
(2, 4, 6, 8, 10, 12, 16). The nonblank content is on pages 1, 3, 5, 7, 9, 11,
13, 14 and 15. Text extraction is retained verbatim in `e2-s25-sol.txt`; it is
not a reliable transcription of the handwriting or the single-phase symbol.

- Page 1 explicitly dates the exam July 15, 2025; pages 2–16 say Summer 2023.
  This package uses the cover date without resolving the historical conflict.
- Pages 3, 5, 7 and 9 each print 10 points; pages 11, 13 and 15 each print
  20 points. No individual subpart scores are printed.
- Page 11 handwriting says lap for 120 V, wave for 240 V; both use 120 coils
  and give 2.4 kW. These are intended electrical path-count answers, with the
  conventional wave-winding closure limitation documented in both articles.
- Page 14 gives the HV input-shunt circuit: 2500-ohm core-loss resistor and
  j2237-ohm magnetizing reactance in parallel, followed by 0.18-ohm series
  resistance and j0.4665-ohm leakage reactance. Its 2237-ohm value uses an
  intermediate rounded magnetizing current. The articles keep full precision
  until the final rounding. No answer to part 6(c) appears on pages 13–16.
- Page 15 visibly gives copper loss 19.2 W, not 192 W, and efficiencies
  94.79% and 93.07%.

Measured crop rectangles are recorded in `figure-sources.json` as normalized
PDF coordinates. They include the printed question and subparts only, ending
before the Answer/Solution headings. There are no original question diagrams;
the question SVGs are explicitly captioned illustrative schematics. The
solution equivalent circuit preserves page 14's topology and voltage labels;
the power-angle plot is an explanatory solution figure under its stated model.

Verified lecture PDFs from `reference/Lecture Notes/`: Lecture 6 pages 6, 8,
9 and 10 (equivalent circuit/referral, tests, efficiency and regulation),
Lecture 8 pages 8–9 (generator/motor commutators), Lecture 9 pages 5–6
(simplex lap/wave paths), and Lecture 10 pages 4, 7–9 and 24 (rotor field,
magnetic circuits, rotating fields, speed relation and power-angle law).
These are 1-based PDF pages, regardless of numbers embedded in slide images.
The articles use the shared lecture registry IDs and no formula-sheet links.
