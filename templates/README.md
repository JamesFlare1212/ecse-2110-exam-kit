# Authoring blueprints

These files are **not active papers**. They are a small, self-authored calculus
example for copying structure and worked-solution style, not a transcribed exam
or a claim of verified PDF provenance. Astro discovers only `content/en/` and
`content/zh-cn/`; these examples never change live navigation or progress totals.

| File | Destination after adapting it |
|------|------------------------------|
| `course.json` | `content/course.json` in a separate course project |
| `paper.en.json` / `paper.zh-cn.json` | Each language's `paper.json` |
| `question.en.md` / `question.zh-cn.md` | Each language's `questions/q1.md` |
| `figure-sources.json` | Each language's measured crop registry |
| `formulas.json` | The new course's shared formula library, after verifying sources |

Replace the example year, IDs, scores, prose, givens, source pages and rectangles
with the actual exam's data. Supply real `documents.json` entries, preserved PDFs,
page images, source crops and paper-local renderers using the
[paper onboarding instructions](../content/README.md#adding-a-paper). There is no
fake `documents.json` or bundled course PDF here: checksums and dimensions must
come from the real source files. In particular, the example crop and formula
rectangles are illustrative, **not verified citations**.

Keep both single-language articles complete. Do not copy the example prose into
a transcribed question, leave placeholders in worked solutions, put bilingual
paragraphs inside an article, or change existing stable IDs. Formula IDs are
course-owned; references in a copied article must exist in that course's library.

Read [the migration guide](../docs/template-guide.md) before replacing a course,
and [the solution style guide](../docs/solution-style.md) before writing solutions.
The automated template tests parse both example articles, pair stable IDs,
validate their equations and test a separate, non-ECSE course catalog. An isolated
build smoke test also generates tiny synthetic test PDFs and checks a real static
build under another course identity; it does not borrow or modify shipped PDFs.
