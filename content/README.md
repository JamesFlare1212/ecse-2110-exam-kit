# Markdown paper library

This document owns the article structure, paper metadata and asset contract.
[The solution style guide](../docs/solution-style.md) owns the worked-example
writing style; [the migration guide](../docs/template-guide.md) explains how to
replace the course without changing the workbench. Copyable, tested articles
live in [templates/](../templates/README.md), outside the active library.

`content/course.json` holds course identity, storage namespace, default problem
and resource navigation; shared formulas and document provenance remain separate.
English and Simplified Chinese papers are independent files and assets:

```text
content/
  en/exam1_f26/
    paper.json
    questions/q1.md
    documents.json
    figure-sources.json
    generate_figures.py
    extracted/
    assets/{sources,pages,figures,original-figures}/
  zh-cn/exam1_f26/
    ...the same independently owned files and directories...
```

Each problem has an [English article](en/exam1_f26/questions/q1.md) and a
[Chinese article](zh-cn/exam1_f26/questions/q1.md). Neither contains the other
language's prose or bilingual frontmatter. PDFs and images are separate copies,
including identical originals; do not introduce cross-language fallbacks or
symlinks. A Chinese asset copy of an English PDF remains that original English
PDF with its original SHA-256 provenance.

Names follow `exam{number}_{f|s}{year}`: `exam1_f26` means Exam 1, Fall 2026.
Both language trees are discovered automatically. This ECSE 2110 fork also reserves
`exam{number}_u00` / `e{number}-u00` for genuinely undated sources, with `year: null`;
`u00` does not mean the year 2000. Other `u` slots are invalid. Matching stable IDs
pair files into one study problem, preserving `/problems/{id}/` and saved records.
A pair counts once in navigation and progress.

Practice sets use the same complete paper structure under `practice1_f26`,
`practice2_f26`, etc., stable IDs `p1-f26`, `p2-f26`, and `kind: "practice"` in
`paper.json`. Their `number` identifies the exam group they prepare for, not a
new fictional exam. A source with no printed marks uses zero declared points
and is displayed as unscored. Both languages, sources and complete worked parts
remain mandatory. Exam-specific reference sheets are configured by
`course.resources.formulaSheets`; indexed formulas and links may not cross those
configured sheet boundaries.

## Paper ownership

Each language's paper owns metadata-only `paper.json`, single-language
`questions/q{number}.md`, PDF provenance in `documents.json`, crop metadata in
`figure-sources.json`, drawing configuration in `generate_figures.py`, extracted
PDF text in `extracted/`, and all PDFs/page images/SVGs/original crops in `assets/`.
SVGs retain both color themes. Document resource paths are relative to that
paper's own `assets/`.

Course PDFs may be published as site assets. Do not commit new large PDF binaries
to Git: provision them separately in the canonical local asset directories before
building or deploying, keeping both language copies and their provenance. This is
not a ban on serving PDFs, nor an instruction to delete or untrack existing files.

Edit each language directly. Stable IDs, points, physical givens and source
metadata must agree across the pair. Guides and solutions are complete independent
Markdown strings: paragraph order, equation groups and formula references may
differ while preserving the same scientific result and full working. Questions
and parts pair by ID, not by paragraph or equation position. Missing counterparts
fail validation instead of silently showing the other language. Shared crib
formulas and lecture provenance remain in `content/formulas.json` and
`content/documents.json`, separate from papers.

## Writing an article

YAML frontmatter holds the stable ID, single-language title/topic, points, given
equations, lecture citations and exceptional figure/part metadata. Never put the
statement, solution or a duplicate answer in frontmatter. Astro and the CLI use
the same schema in `content/metadata.ts`. Plain or single-quoted YAML TeX uses one
backslash: `\epsilon`, not `\\epsilon`.

Avoid repeating defaults:

- The question number comes from the ID; the filename is `q{number}.md`.
- The main figure defaults to the question ID **only when a diagram is actually printed with the question**. Otherwise explicitly set `figure: null`; do not invent a prompt diagram. Pedagogical drawings belong to a part's solution `figure`, never `questionFigure`. The legacy `originalFigure` source rectangle still locates the printed prompt text when no diagram exists and does not create an image card.
- A real question figure's original crop comes from that
  language's `figure-sources.json`, with 0.002 padding on each edge. Keep PDF
  document, page and region provenance there, rather than copying it into articles.
- The main figure caption defaults to the title. Override it only for a meaningful
  caption, such as an explanation of illustrative parameters.
- `parts` is a mapping keyed by the exact printed label, containing overrides only.
  Part IDs derive from the question ID plus the label stripped of punctuation and
  lowercased; preserve exceptions such as `e1-s26-q1-rf` explicitly with `id`.
- A part defaults to zero declared points, the main crop's PDF page, and the same
  solution page. Override `points`, `page` or `solutionPage` when the source differs.
  Zero means the source declares no individual score; do not invent one.
- Optional `figure` names a solution SVG. `questionFigure` names a part-specific
  question SVG, either as a string or `{name, caption}`. Its original crop also
  resolves from `figure-sources.json`. Part captions default to the prompt.

Use these exact structural headings in both languages, with direct prose only in
the file's own language. Do not add `English` or `中文` subsections:

- `## Question`: original English wording, or its faithful Chinese translation.
- `## Guide`: short natural Markdown introducing concepts, givens, goals and the
  starting approach, without mandatory subsections.
- `## Part a` (or the exact printed label, e.g. `## Part a(i)`): the subquestion's
  wording directly beneath the heading.
- `### Solution`: ordinary paragraphs, formula links and displayed TeX blocks.
  The last displayed formula contains the boxed final result, written once.
- Optional `### Source correction`: that part's correction prose.
- Optional `## Source correction` applies to the whole question.

Complete single-language examples, including frontmatter, original prompts,
guides and worked parts, are in [question.en.md](../templates/question.en.md)
and [question.zh-cn.md](../templates/question.zh-cn.md). Numerical substitution,
evaluated multiple integrals, correction prose and anti-patterns are illustrated
in the canonical [solution style guide](../docs/solution-style.md).

Formula IDs refer to the shared formula library. Native Hover Cards preview the
original excerpt and activate its exact PDF location. Keep formula names in the
prose; do not add source tags beside equations. Each language's actual links
determine its reference rail; there is no parallel reference list to maintain.

The last displayed calculation is the sole authored answer. The UI renders it
directly without generating, comparing or appending an answer. Do not restore
`Step`, `Explanation`, `Equation` or `Answer` wrappers. Preserve all source
corrections. Paragraphs, emphasis, lists, code and links are supported; math uses
`$...$` or `$$`. Optional deeper headings belong to the prose, not to a step
protocol. Raw HTML is escaped and script URLs rejected.

## Worked-example style

Follow [docs/solution-style.md](../docs/solution-style.md), including its bilingual
examples and author/reviewer checklist. It is the single authority for worked
prose, formula origins, complete integrals, alignment, result emphasis and source
corrections. This article contract does not introduce a second step protocol.
The parser rejects boxed results in earlier display groups as well as a missing
boxed result in the final calculation; scientific and pedagogical completeness
still require human review.

## Discovery and assets

Astro discovers both language trees through its `questions` collection. Collection
IDs have a language prefix; authored IDs and public URLs do not change. The AST
parser in `content/markdown.ts` reads each single-language article;
`content/localization.ts` pairs it with its counterpart. `content/papers.server.ts`
validates and assembles page data in memory. No question-bank JSON is generated.

Each page contains its own full bilingual problem plus a solution-free navigation
index. The persistent Svelte island preserves state across Astro navigation.
Language switching selects that language's figures, original crops, PDF pages and
downloads at `/papers/en/...` or `/papers/zh-cn/...`. Portals remain attached to
`#fieldnotes-overlays` across swaps.

`bun run papers:prepare` copies only `assets/` into ignored
`static/papers/{en|zh-cn}/`. Markdown, metadata, extraction and Python are not
staged. Never edit staging copies. Development watches both language trees.

## Adding a paper

The following examples describe a hypothetical one-question, 10-point Exam 1,
Fall 2027. Replace all illustrative values with verified source metadata; never
invent questions, scores, citation pages or crop rectangles. Run commands from
the repository root, using the [development prerequisites](../README.md#启动)
and the Python environment described under [regeneration](../README.md#校验与重新生成).

### 1. Create both language folders

Create `content/en/exam1_f27/` and `content/zh-cn/exam1_f27/`, each with the complete
layout shown above. Existing papers are structural examples, not content to keep
under a new ID. Give the new paper, documents, questions and parts their own stable
IDs; do not rename IDs belonging to existing papers or their saved records.

An English `paper.json` for the illustrative paper is:

```json
{
  "id": "e1-f27",
  "number": 1,
  "term": "Fall",
  "year": 2027,
  "points": 10,
  "doc": "e1-f27",
  "solutionDoc": "e1-f27-sol",
  "questionsOnly": true
}
```

The Chinese file uses `"term": "秋季"`; all other fields above agree. `points`
equals the sum of declared problem scores. `doc` and `solutionDoc` are keys in
that paper's `documents.json`, not filenames. `questionsOnly` describes the exam
PDF: if only a combined questions/answers PDF exists, set it to `false` and use
the same document ID for `doc` and `solutionDoc`.

### 2. Register preserved PDFs

Provide separate, byte-identical source copies in each language's
`assets/sources/`, for example `e1-f27.pdf` and `e1-f27-sol.pdf`. Keep new large
PDFs outside Git and provision them before running these tools or building the
site. Do not replace either language's file with a fallback or symlink.

Inspect each real PDF with PyMuPDF and SHA-256. This example prints one registry
entry to stdout; it does not write a manifest or author question content:

```bash
python3 - <<'PY'
from pathlib import Path
import hashlib
import json
import pymupdf

path = Path('content/en/exam1_f27/assets/sources/e1-f27.pdf')
doc_id = 'e1-f27'
with pymupdf.open(path) as pdf:
    entry = {
        'id': doc_id,
        'title': 'Exam 1 · Fall 2027',
        'kind': 'exam',
        'pages': len(pdf),
        'pdf': f'sources/{doc_id}.pdf',
        'pageBase': f'pages/{doc_id}',
        'sizes': [[round(p.rect.width, 2), round(p.rect.height, 2)] for p in pdf],
        'original': 'Exams/Exam_1_F27.pdf',
        'sha256': hashlib.sha256(path.read_bytes()).hexdigest(),
    }
print(json.dumps({doc_id: entry}, ensure_ascii=False, indent=2))
PY
```

Use the actual original filename/archive-relative path for `original`. Repeat
for a separate answer PDF using its own ID, title, path, original filename and
`kind: "solution"`. Merge the keyed entries into each language's `documents.json`;
verify the Chinese copies against the same hashes and page sizes. Do not add
paper PDFs to the shared `content/documents.json`. `sizes` contains one
`[width, height]` pair per PDF page, in PDF points, rounded to two decimals.

The tools validate existing provenance; they do not discover or silently update
SHA-256 records. Normally they read the canonical PDFs above. `--source-dir`
imports from the recorded `original` paths under an external directory and
expects all registered sources for the selected locale to be available there.
Do not use it merely to regenerate pages, or overwrite a hash to accept an
unexpectedly changed PDF.

### 3. Author articles, crops and renderers

Write `questions/q1.md` independently in both languages, following
[Writing an article](#writing-an-article). Required frontmatter fields are `id`,
`title`, `topic`, `points`, `givens` and `lectures`; `parts` contains only overrides.
See [the shared metadata schema](metadata.ts) and the existing
[English article](en/exam1_f25/questions/q1.md) and
[Chinese article](zh-cn/exam1_f25/questions/q1.md) for complete examples. Replace
all example lecture references with verified PDF pages for the new problem.

Each main or part-specific question figure needs an entry in that language's
`figure-sources.json`. For example, the following **illustrative** rectangle
must be replaced with a crop measured on the actual source page:

```json
{
  "figures": {
    "e1-f27-q1": {
      "doc": "e1-f27",
      "page": 1,
      "region": [0.2, 0.2, 0.5, 0.3]
    }
  },
  "panels": {}
}
```

Pages are 1-based PDF pages. Regions use top-left-origin fractional
`[x, y, width, height]` coordinates; leave room for the automatic 0.002 crop
padding on each edge and keep the padded rectangle inside the page. `panels`
may map a figure name to multiple measured regions for a vertically assembled
original crop; otherwise keep it empty.

The article's main figure defaults to its problem ID. Part source pages default
to that main crop's page, and solution pages default to the part source page.
For example, if printed part `a` is on exam PDF page 2 but its worked answer is on
solution PDF page 1, its frontmatter override is:

```yaml
parts:
  a:
    page: 2
    solutionPage: 1
```

`page` addresses `paper.json`'s `doc`; `solutionPage` addresses `solutionDoc`.
Set individual `points` only when printed, and retain exceptional part IDs with
an explicit `id` as described above.

Each language also owns `generate_figures.py`, exporting
`render_figures(save, dark)` and, when needed, its own `SVG_LABELS` translations.
Use existing renderers with the shared Matplotlib primitives as structural
examples, but draw the new source's actual topology, symbols and perspective.
Save each SVG under the names used by the articles and crop registry.

### 4. Generate and verify

Complete both languages' metadata, articles and renderers before invoking the
source tools: discovery reads their frontmatter to resolve asset references.
Then generate missing pages/extracted text and the new paper's diagrams/crops:

```bash
python3 scripts/prepare_sources.py --locale en
python3 scripts/prepare_sources.py --locale zh-cn
python3 scripts/generate_figures.py --paper exam1_f27
python3 scripts/check_sources.py
python3 scripts/check_figures.py
bun run content:check
bun run check
bun test
bun run build
```

No route registration is needed. Inspect the new questions, both languages'
final SVGs/crops and exam/answer page links in the browser at desktop and phone
widths. Shared formulas need `render_excerpts.py` only when their source excerpts
are added or changed. Review the Git diff to exclude new large PDF binaries and
unrelated generated changes; PDFs must still be present in the build environment.

To unplug a paper, move both language folders outside `content/` and rebuild;
routes and both staged copies disappear while saved records survive without
affecting active totals. Removing only one counterpart is an error.

## Drawings and source checks

After `bun install --frozen-lockfile`, install `scripts/requirements.txt` in a
Python virtual environment. The drawing postprocessor also reads the local Noto
font package from `node_modules`. Commands below run from the repository root.

To rebuild **all existing page images** for both languages, then regenerate the
shared formula excerpts and both languages' SVGs/original crops:

```bash
python3 scripts/prepare_sources.py --locale en --force
python3 scripts/prepare_sources.py --locale zh-cn --force
python3 scripts/render_excerpts.py
python3 scripts/generate_figures.py
```

`prepare_sources.py` defaults to `en` only and skips existing page images unless
`--force` is given; omit that flag when only filling missing pages. Extracted text
is refreshed either way. Shared lecture/crib pages use the same common directory
for both calls. `bun run assets:prepare` is the incremental equivalent: it visits
both locales but does not force existing page images to be rendered again.

For a smaller drawing batch or checks without rewriting static assets:

```bash
python3 content/en/exam1_f26/generate_figures.py
python3 content/zh-cn/exam1_f26/generate_figures.py
python3 scripts/generate_figures.py --paper exam1_f26 --locale en
python3 scripts/check_figures.py
python3 scripts/check_sources.py
```

Batch drawings and checks discover both language directories; the drawing batch
can be limited with `--paper` and `--locale`. Figure reports are namespaced by
language. Collision/geometry checks operate on the Matplotlib figures **before**
Chinese SVG label replacement; the delivered SVG checks cover embedded font
characters and size budgets, not final localized text collisions. Visually
inspect final Chinese SVG labels as well as the diagnostic PNGs.

Python reads frontmatter only for offline asset work; it never authors or compiles
the question-bank body. Site development and building use Bun and the installed
JavaScript dependencies without Python; full checks/tests also require Node.js
(Node 24 in CI).
