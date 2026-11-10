# Cold-development navigation CI failure

Investigated on 2026-11-10, after `6726ad7`.

## Remote evidence

[Run 42802767786](https://github.com/JamesFlare1212/ecse-2110-exam-kit/actions/runs/42802767786)
completed all production browser groups, core checks and both Python jobs. Only
`Browser (navigation)` failed in its development step. The final required app
status correctly failed because that prerequisite failed.

The development browser recorded:

> Failed to fetch dynamically imported module:
> /node_modules/.vite/deps/astro-uWWomyxh.js?v=a54582a8

This is an Astro dev-toolbar chunk, not a missing converter asset or a recurrence
of the previous 15-minute timeout.

## Reproduction and root cause

A fresh, isolated `vite.cacheDir`, with the actual project config and unchanged
navigation regression, reproduces the failure locally on pinned Bun 1.4.3. The
warm development cache used by the previous local verification does not.

The optimizer log shows this sequence:

1. Initial dependency scanning and bundling complete.
2. The first requested page resolves the virtual `astro:transitions/client`
   facade. Its four real `astro/virtual-modules/transitions-*.js` re-exports were
   absent from the initial scan.
3. Vite discovers those entries late, bundles a new generation, renames the old
   dependency directory and reloads the page.
4. Astro's already-served dev toolbar concurrently imports one of its old chunks;
   that dynamic import fails. The browser error is correctly caught by QA.

The local unfixed reproduction failed on a sibling `ui-library-*.js` toolbar
chunk. The common cause is optimizer generation invalidation, not a particular
chunk filename.

## Fix and regression coverage

- `astro.config.ts` explicitly includes all four resolved transition-facade
  re-exports in **client-only** dependency optimization. The virtual facade itself
  cannot be pre-bundled. Do not change server-side Svelte optimization or shipped
  production code.
- The dev toolbar stays enabled, optional converter JavaScript stays lazy, and the
  existing `pageerror` assertions remain strict. No retries, sleeps, error-message
  filters or `ignoreOutdatedRequests` workaround are introduced.
- A unit test compares the configured entries against the installed Astro facade's
  actual re-exports, making future dependency changes require an explicit review.
- `scripts/browser-cold-dev-qa.mjs` starts the real dev server with a unique empty
  temporary optimizer cache and an OS-assigned loopback port, then immediately
  runs the full existing navigation regression. It records optimizer metadata and
  the child exit code, stops only its own server and removes only its own cache.
  Existing local dev servers and `node_modules/.vite` are not stopped or cleared.
- CI's development-navigation step now uses that cold runner rather than a
  background server with potentially prewarmed optimizer state. Existing
  production navigation, matrix coverage and the required aggregate gate remain.

After the optimizer change, the same isolated-cache reproduction passes all nine
navigation scenarios without late re-optimization or module-fetch errors. The
committed revision must still complete its own GitHub run before being described
as remotely verified.
