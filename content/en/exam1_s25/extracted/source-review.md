# Source inspection notes

Source: `reference/Exams/Exam1/ECSE2110Test1Sol.pdf`, 14 PDF pages,
612 × 792 points each, 5,053,733 bytes.
SHA-256: `c73b0b4384f86d048146ec6f74d33824677673b5af89d7b6c068aeccf3634cce`.
Each language has its own byte-identical PDF and independently stored page images.

The actual PDF pages were rasterized and inspected, including the cover and the
question/answer pages 3, 5, 7, 9, 11, 12 and 13. The 2025 cover date conflicts
with the 2024 title/footer. The printed question scores total 120 rather than the
cover's 100; section headings also disagree with the question totals. These
conflicts are retained in Question 1's source note and in the paper's neutral term.

Measured original crop rectangles, in PDF points with top-left origin, before
pipeline padding:

| Question | PDF page | x0 | y0 | x1 | y1 | Content |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | 3 | 70 | 100 | 455 | 118 | Original question, no diagram |
| 2 | 5 | 70 | 70 | 505 | 108 | Original question, no question diagram |
| 3 | 7 | 83 | 123 | 538 | 307 | Original delta and star diagrams |
| 4 | 9 | 70 | 100 | 542 | 188 | Original question and three subparts, no diagram |
| 5 | 11 | 176 | 123 | 436 | 211 | Three parallel loads and voltage source |
| 6 | 13 | 69 | 189 | 349 | 343 | Floating-neutral source/load circuit |

Question 2's single-phase sketch occurs in the official answer; its question
figure is explicitly captioned as conceptual. Questions 1 and 4 likewise have
captioned conceptual illustrations rather than invented source diagrams.
Question 6 retains the disconnected neutrals, the unconnected wire crossing,
the series resistance/inductance in phase c, and the phase-b capacitor and -j5 sign.

Verified lecture relations: Lecture 4 PDF pages 15–16 (hysteresis/eddy loss),
Lecture 2 pages 7–9 (instantaneous power), 10–14 (rms complex power and signs),
18–21 (capacitor compensation), and Lecture 3 pages 8–9 (delta currents and
balanced transformation), 12 (balanced current sum), 24–25 (neutral displacement).
The supplied lectures are the Fall 2026 notes; citing them as study resources
does not resolve or change the historical source's date conflict. Lecture 3
page 25 repeats the historical neutral example's sign and unit errors.

Scientific corrections and independently recomputed results are explained in
both language articles. Hysteresis occurs below saturation. Delta branch current
is 29.07601842 A, line current 50.36114119 A, and branch power 1690.829694 W.
The capacitor supplies 35 kvar and requires 47.36754259 microfarads. With the
printed phase voltages in kV and impedances in ohms, the neutral is
(-8.44674009 + j142.23370044) kV and the currents are
(1.68934802 - j8.44674009), (38.44674009 + j19.00985609), and
(-40.13608810 - j10.56311601) kA. Their sum vanishes. No numerical result is
inferred from the erroneous positive-j5 node denominator.
