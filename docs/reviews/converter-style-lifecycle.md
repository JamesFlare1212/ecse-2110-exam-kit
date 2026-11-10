# Converter style lifecycle investigation

## Reproduction and scope

The reported screen is an enhanced converter whose layout and circuit styles are
missing, rather than the static fallback or an asset-fetch error message.

With `bun run dev`, open Practice 2 Q4(a), navigate through the native question
links to another converter, then return to Q4(a). The same document and persisted
study island survive, but the drawing becomes unstyled. Reloading restores it.
This reproduces locally without injected network failures and without a browser
JavaScript exception.

Before the fix, a 1440 px test measured:

| Operation | Converter display | Circuit width |
|---|---|---|
| Cold Q4 | `flex` | 352 px |
| Navigate to Q6 | `block` | 840 px |
| Return to Q4 | `block` | 840 px |
| Reload Q4 | `flex` | 352 px |

An independent phone regression also caught `padding: 0`, a `block` transport,
`static` angle markers and black-filled probes with no stroke. These match the
reported layout and black circuit dots.

The current production build's normal Q4 → Q6 → Q4 navigation did **not** reproduce
the failure: Astro includes the converter stylesheet in each problem's initial
HTML. This finding does not establish that every possible loading failure has
the same cause; it does establish a deterministic development-mode defect.

## Cause

`SolutionFigure.svelte` lazily imports `Converter.svelte`, which imports
`ConductionCircuit.svelte`. Their Svelte `<style>` blocks were injected by Vite
when these optional modules first loaded in development.

Astro's ClientRouter swaps `<head>` on navigation. The runtime-injected styles
are absent from the next server-rendered document and are removed. However, the
persistent study island and the browser's imported-module cache remain alive.
Importing the same converter again reuses its exports without executing the
style-injection module again. The application considers the interactive drawing
ready even though both sets of CSS rules are gone. A full reload clears this
lifetime mismatch.

## Fix and safeguards

- The persistent workspace statically imports `src/styles/converter.css` through
  `src/styles/layout.css`. Astro now owns the stylesheet across head swaps.
- Both the converter and circuit/probe rules have this stable owner. Migrating
  only the outer card would leave black probes and oversized circuits unfixed.
- Selectors remain feature-scoped, including the help Popover in its portal.
  Native component variants, scientific models, SVG assets and stored records
  are unchanged. Optional JavaScript still loads only when needed; no forced
  reload, duplicate runtime style registry or router patch is introduced.
- `tests/converter-style-lifecycle.test.ts` guards this ownership contract.
- `scripts/browser-converter-navigation-qa.mjs` checks real computed styles, the
  persisted island, all four converter questions, ordinary questions, history,
  locale/theme changes and navigation during a held lazy import. Run it against
  both development and production; CI covers both, not just cold production URLs.
  Its development step now uses `scripts/browser-cold-dev-qa.mjs` to own an empty
  temporary optimizer cache and ephemeral port, so a warm local cache cannot hide
  [first-request dependency invalidation](ci-cold-dev-imports.md).

## Verification

After the migration, development and production each passed nine navigation
scenarios, with 65 styled-drawing samples per mode. These cover both locales,
both themes, phone/desktop widths and a held module request during navigation.
The production full-converter (40 cases), compact semi-converter, linked-waveform
and complete startup/navigation/font regressions also passed. Type checking,
unit tests and the static build passed; the CI workflow now runs the additional
development regression as well.
