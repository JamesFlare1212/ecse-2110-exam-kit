# Question-owned waveform defaults and CI timeout investigation

Reviewed 2026-11-10 against `ba49c1e` and the four active converter interactions.

## Question audit

The corpus has 39 questions / 90 parts, with four enhanced parts. Both language
articles were checked; no prompt, solution equation, source correction, model,
static asset or stored progress record was changed.

| Enhanced part | Printed request | Initial highlighted signals |
|---|---|---|
| Practice 2 Q3(a) | Average machine current I₀ | `i0` |
| Practice 2 Q4(a) | i₀, v₀, iₛ₁, iₛ₂, iᴅ₁, iᴅ₂, i, vₛ₁ | `i0, v0, is1, is2, id1, id2, i, vs1` |
| Practice 2 Q5(b)(iv) | Supply voltage/current and output voltage/current | `v, i, v0, i0` |
| Practice 2 Q6(a) | Supply voltage/current and output voltage/current | `v, i, v0, i0` |

Q4's old preset highlighted an unrequested supply voltage while leaving five
requested device quantities gray. Q3 also incorrectly inherited the generic four
signals. Q5/Q6 already matched their requests; their defaults are retained but now
explicitly declared. All gray reference curves, live values and manual toggles
remain available.

Each language declares the same required `interaction.defaultSignals` metadata.
The shared Astro/CLI interaction schema rejects absent, empty, duplicate, unknown
or wrong-topology selections. The UI creates independent initial state per part;
locale/theme changes do not overwrite manual selections, and transient choices
are not written to learning records. Browser assertions compare the delivered
pressed rows, visible probes and count, including native navigation between the
four questions, rather than checking only authored metadata.

## Actual CI failure

The [latest investigated run](https://github.com/JamesFlare1212/ecse-2110-exam-kit/actions/runs/42795260129)
started at 09:59:14 UTC. The app job's GitHub check annotation says:

> The job has exceeded the maximum execution time of 15m0s

The job was canceled at approximately 10:14:24 UTC, during compact-converter QA.
Content validation, type checking, unit tests, build, startup QA, full-corpus QA,
reader layouts, sidebar controls and continuous-conduction QA had already passed.
The subsequent `ERR_CONNECTION_REFUSED` was secondary: cancellation ran the
preview-server cleanup trap while a browser was navigating, not evidence of an
application server defect. Both Python 3.12/3.14 figure jobs succeeded in this run.

Earlier failures in run `42689790562` involved a retired figure-source selector
and a figure-only test importing PyMuPDF. Those were already fixed in the baseline;
the current run confirms they are not the outstanding failure. No PDF dependency
or retired UI was restored.

## CI change

- Keep type/content checks, tests and build in `app-checks`. Preserve the existing
  `App checks, tests and build` status name as an always-running final gate that
  requires both core checks and every browser shard to succeed; failed, canceled
  or skipped prerequisites must not turn an existing required check green early.
- Run browser coverage on six separate runner jobs: `startup`, `reading`,
  `conduction`, `converter-focus`, `sources`, `navigation`.
- Keep each job's 15-minute limit and use `fail-fast: false`; do not drop any of
  the prior production scripts. Add the defaults regression to `converter-focus`.
- Resolve the requested ref once in core checks and pass its immutable checkout
  SHA to every browser runner, so a moving branch cannot change the revision
  between shards. Each runner builds that SHA with frozen dependencies; no
  compiled artifact, PDF bundle or remote source service is needed.
- Keep production navigation and the additional development-navigation check in
  the navigation shard, with separate server cleanup.
- Give failure artifacts unique shard names; record each script's result and
  elapsed time in `artifacts/ci-suite-{suite}.json` and the job log.
- Unit-check the workflow matrix against the executable suite registry so missing,
  duplicated or silently dropped regressions fail locally.

Running every new shard locally also exposed a stale navigation-QA assertion:
`conduction-boundaries` was still required to be relatively positioned, although
the approved slider alignment now positions it absolutely below a relative,
isolated phase field. The production and development navigation regression now
checks that complete current anchoring contract instead of the retired layout.

## Local verification

- Pinned CI Bun 1.4.3: content validation, type checks (zero errors/warnings),
  228 passing tests / 44 course-inapplicable skips / zero failures, and the static
  build (41 routes, 39 problem pages, 90 parts).
- All six browser suites / all 16 production scripts passed locally; observed
  shard times were approximately 0.6–7.2 minutes, not a guarantee of runner timing.
- 33 default-selection cases passed, including desktop/phone, both languages and
  themes, manual toggles, legacy records and native question navigation. Repeated
  with pinned Bun, along with production and development style navigation.
- Python 3.12 and 3.14: 38 tests each passed; each checked 84 figure/theme pairs
  and delivered font coverage without rewriting canonical assets.
- actionlint 1.7.12 and `git diff --check` passed.

The changed workflow must be pushed before GitHub can validate that revision;
local checks are not a claim that the new remote run has already passed.
