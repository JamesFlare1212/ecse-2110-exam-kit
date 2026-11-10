# Clickable course-material citation audit

## Scope and changes

The reported example is historical Exam 2 Q5(a), `e2-s25-q5-a`: the text cited
Lecture 9, pages 5–6, but offered no inline link. Both pages were inspected:
page 5 states the lap-winding path count and page 6 states the wave-winding
path count. Each endpoint now has its own native source-page link.

The audit checked all 39 active questions / 78 independent language articles,
including guides, solutions, correction notes and figure captions (402 authored
text fields). It found 130 unlinked lecture mentions in 66 articles and added
162 links, covering single pages, individually cited pages and range endpoints.
The reference-sheet citations already used native `formula:` links; they remain
separate from lecture sources. Original question wording, mathematics, worked
calculations and correction disclosures were not rewritten. The existing full
content-preservation regression passes without a new baseline for these edits.

Targets come from the registered lecture `pageBase` values and 1-based PDF pages.
Source-page registration, published-image availability and actual native viewer
navigation were checked. Paper-owned links retain their language-specific assets.
This is a link-coverage audit, not a new independent scientific review of every
solution; private or unavailable provenance must never be fabricated or published
merely to make a link.

## Behavior and authoring safeguards

- `AGENTS.md` now explicitly requires clickable citations beside the claim, not
  just metadata badges or the Guide reference row. `docs/solution-style.md`
  remains the canonical detailed writing rule.
- `content/course-citations.ts` lints explicit English/Chinese lecture mentions
  in authored prose, including page-only continuations within the same sentence.
  Existing Markdown links, math and code are excluded. Explicit changes to an
  exam/solution source reset lecture inheritance rather than guessing a wrong
  document. This check is not a replacement for reviewing source support.
- Content validation applies the lint to guides, worked solutions, correction
  notes and captions. Original printed statements/prompts are not rewritten to
  satisfy it. The existing link validator still checks registered pages and
  language ownership.
- Correction notes reuse `ReferencedText` / `PageLink`, like worked solutions:
  hover/focus previews, the native source viewer, usable no-JS hrefs and return
  focus. The subsequently retired question-level Guide is source-only and is
  excluded from reader markup and hydration; it has no component or review row. Referenced multi-block prose uses the shared Markdown
  flow instead of doubled line-break spacing. No links are synthesized at runtime.

## Verification

- `bun run content:check`, `bun run check`, `bun test`, `bun run build`.
- `scripts/browser-course-citations-qa.mjs` audits every question in both locales
  at phone and desktop widths, including both themes. The checked run covered
  156 article layouts, 340 rendered link instances, 168 viewer activations and
  46 published source-image URLs at the original audit, plus the reported range
  without JavaScript. Subsequent runs audit only current reader content after
  removal of the Guide; their live counts are recorded in the browser report.
- The browser regression is included in CI. Unit tests guard bare-citation
  detection, page-continuation behavior, source changes, the reported winding
  pages and the explicit AGENTS requirement.
