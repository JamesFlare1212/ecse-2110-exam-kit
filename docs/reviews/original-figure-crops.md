# Original question-figure crop audit

Scope: every mounted original question diagram, including part-level diagrams
(discovered from the active paper catalog). Solution-only drawings do not expose
an Original switch and are not additional source diagrams.

| Question | Source PDF page | Result |
| --- | --- | --- |
| `e1-f26-q5` | `e1-f26-sol`, 12 | Already diagram-only; complete three-phase circuit and labels retained. |
| `e1-s25-q3` | `e1-s25-sol`, 7 | Already diagram-only; both delta and star drawings retained. |
| `e1-s25-q5` | `e1-s25-sol`, 11 | Already diagram-only; source, three loads and current labels retained. |
| `e1-s25-q6` | `e1-s25-sol`, 13 | Already diagram-only; original question circuit, not the solution thumbnail. |
| `p1-f26-q2` | `p1-f26-sol`, 3 | Removed surrounding question text; retained both terminals, R/X, current and voltage polarity. |
| `p1-f26-q3` | `p1-f26-sol`, 4 | Removed surrounding question text and right-hand whitespace; retained the complete parallel circuit and labels. |
| `p2-f26-q4` | `p2-f26-sol`, 5 | Removed question/subpart text and the separate printed figure-number caption; retained all circuit labels, polarities, input terminals and crossing. |
| `p2-f26-q6` | `p2-f26-sol`, 9 | Removed question/subpart text and right-hand whitespace; retained the bridge, motor, separate field winding and `(a)` label. |

The four practice diagrams use exact single-panel rectangles in each locale's
`figure-sources.json`. The broader `figures` rectangles remain unchanged as
printed-prompt provenance. Panel coordinates are measured on the source PDF page,
not on a recreated SVG. Both locales own separately rendered WebP files; no PDF,
question wording, numerical givens, solution or SVG drawing was changed by this
crop fix. Existing 2x PDF rasterization and WebP quality 93 are retained.

Verification:

- Compared all eight original crops against their full source PDF pages.
- `tests/original-figure-crops.test.ts` requires the audit to cover every mounted
  question figure, checks delivered image dimensions and independent locale
  files, and checks the measured panel coordinates without changing provenance.
- `scripts/browser-original-crops-qa.mjs` verified all eight figures in 64 cases:
  English/Chinese × light/dark × 390/1440 px. Original assets resolve to the
  selected locale, image/card height stays stable when switching, original
  backgrounds remain white, and enlargement uses the selected crop. Reviewed
  the delivered desktop and phone figure screenshots as well.
- Focused source/practice tests (30 tests), `bun run check`, `bun run build`, and
  `python3 scripts/check_sources.py` passed. Source verification covered both
  locales, including PDF hashes, page sizes and citation rendering.

Reproduce the browser audit against the built-site preview:

```bash
PLAYWRIGHT_MODULE=/path/to/playwright/index.mjs \
QA_BASE=http://127.0.0.1:4173 \
QA_ORIGINAL_CROP_ARTIFACTS=/tmp/original-crops-browser \
bun scripts/browser-original-crops-qa.mjs
```

Full offline paper regeneration uses the existing `generate_figures.py` and its
`panels` support; frontend builds continue to require no PDFs or Python.
