# Testing and browser QA streamlining

## Purpose and scope

Reduce the time and interruptions needed to develop these family games while retaining meaningful coverage of controls, multiplayer behavior, iPhone/iPad layouts, and PWA behavior. This is a handoff plan for a separate Codex session, based on the Arena Pong polish session in October 2026.

Start with process and tooling improvements that preserve existing assurance. Changes to verification policy are options, not decisions already approved by this document. Read the current `AGENTS.md` before implementation and preserve unrelated work. Do not merge or deploy to obtain test results.

## Current implementation status

The first implementation is complete on `codex/testing-streamlining`. The code
was verified locally and by [the exact-commit Ubuntu run](https://github.com/ehofmei/multiplayer-test/actions/runs/38263760358)
for `913d316d062015d8cde44612b578cb54bfc30b27`. This plan is retained as rationale
and a list of possible follow-ups, not an instruction to repeat completed work.
Use `AGENTS.md` and `QA.md` for the current required workflow.

Completed work includes focused commands, a checkout guard against overlapping
suites, strict preview ports, reusable non-deploying review CI, timing reports,
per-game integration spec files, Breakout profiling and removal of a redundant
DOM read, and a synchronized settled Golf screenshot with reviewed Darwin/Linux
baselines. Both full verification gates and all 64 browser tests remain.

Measured results do not establish an overall speedup: the final local browser
suite took 7.3 minutes and complete local verification took 7.4 minutes; Ubuntu
verification took 12.4 minutes versus 9.9 minutes in the historical successful
run. These are individual samples, not controlled benchmark averages. The main
benefit so far is clearer iteration, safer test execution and repeatable setup.
No browser-trust or app-restart popup appeared during the live pass. Their prior
source remains unidentified, and no browser permission settings were changed.

## Evidence from this session

These are observations from individual runs, not benchmark averages:

| Check                                             | Observed duration |
| ------------------------------------------------- | ----------------: |
| Vitest unit tests                                 |    About 1 second |
| Vite bundling, excluding type checking            | About 0.8 seconds |
| Complete successful local browser suite, 64 tests |       7.1 minutes |
| Browser suite in a failing Ubuntu run             |      12.1 minutes |
| Full paired Breakout victory test locally         |       102 seconds |
| Eight-player Bakery browser test locally          |        72 seconds |
| Full paired Pong browser test locally             |        49 seconds |
| Full five-hole Mini Golf browser test locally     |        47 seconds |

The apparent long build is predominantly browser testing. Optimizing bundling or dependency installation alone will not solve it.

The final successful Ubuntu run was [Arena Pong review](https://github.com/ehofmei/multiplayer-test/actions/runs/38248474458), for commit `747d8f6e80b2eef9e9fb444d0fe5c203d692d073`. Local verification passed 206 Vitest tests, four script tests, 64 browser tests, formatting, production build, and snapshot-pair checks.

Problems that increased elapsed time:

- Full local verification began before the final fixes were settled, requiring repetition.
- Two local suites briefly overlapped, competing for resources and sharing `test-results/`. Missing trace-file errors resulted. Prevent this rather than interpreting those errors as game defects.
- Live-browser recovery consumed substantial time: unavailable browser launch/connect paths, stalled commands, and stale service-worker builds. One command took almost six minutes. Switching origins and ports eventually worked but created setup churn.
- An unrelated paired Breakout victory test reached its 180-second timeout on Ubuntu after 63 other tests passed. An unchanged implementation passed on retry. This is a reliability problem to diagnose, not evidence that retries should become the solution.
- Linux caught a genuine short-phone/taller-font layout defect: a ready court was 175px high against a requirement greater than 180px. The layout was corrected without weakening the assertion. Preserve this useful coverage.

## 1. Establish fast iteration and final verification

Inspect `package.json`, `playwright.config.ts`, existing helpers, and test organization. Add simple documented commands for fast checks and affected-game browser checks. Prefer explicit selection over a complicated dependency-based test selector.

During implementation:

1. Run relevant unit tests and type checks.
2. Run the affected game's browser specs and shared-network smoke coverage when relevant.
3. Complete the planned live functional and visual QA, then resolve its findings.
4. Run complete local verification once the implementation is settled.
5. Obtain complete Ubuntu verification for the exact final commit.

Repeat focused checks during fixes. Repeat complete verification after the last substantive fix, rather than after every small intermediate edit. The final gate still applies.

Prevent simultaneous complete local suites against the same checkout/output directory. Use a portable runner guard with clear diagnostics and safe stale-lock recovery, or equivalent isolation. Never terminate another session's processes. Give intentionally concurrent focused runs distinct artifact directories.

Ensure a reused preview server serves the expected build. Currently `reuseExistingServer` is enabled locally, so an unrelated or stale process can be reused. Fail clearly on a port conflict or verify the build identity before testing.

Record the durable workflow in `AGENTS.md` and commands in `QA.md`; keep detailed rationale here. Include rules for when shared protocol, storage, audio, lifecycle, or global CSS changes justify broader focused coverage.

## 2. Make review CI reusable and avoid wasted runs

Inspect `.github/workflows/arena-pong-review.yml` and `.github/workflows/light-seek-review.yml`.

- Remove the redundant `npm run build` immediately before `npm run verify`; verification already builds.
- Provide a reusable non-deploying review workflow instead of copying a branch-specific workflow for each task. Keep review triggers scoped away from Pages deployment.
- Add branch-scoped concurrency cancellation for superseded runs. Preserve baseline-return work and avoid canceling an unrelated branch.
- Provide explicit focused baseline-generation and complete verification modes. Baseline generation is not the final verification gate.
- Keep Ubuntu, Node 22, `npm ci`, Chromium installation, production-subpath checks, and complete final verification. Grant write permission only to the narrowly scoped baseline-return operation.
- Preserve genuine Ubuntu image generation and review. Fetch returned baselines safely and verify the exact final commit with snapshot updates disabled.
- Retain useful failure traces and screenshots; avoid uploading redundant successful artifacts. Preserve requested baseline evidence.
- Support explicit dispatch of final verification where practical, so a rerun does not require an empty commit merely to trigger CI.

Npm caching is already enabled. Browser installation and duplicate builds are smaller costs than browser execution; measure before investing in more caching machinery.

## 3. Diagnose and shorten expensive browser fixtures

Start with the paired full-victory test in `tests/breakout.spec.ts`. At the time of inspection it could iterate 4,000 times, advancing the host clock in 200ms increments, repeatedly reading DOM state and sending browser inputs to play through three cores.

Measure time spent in simulation advancement, DOM observations, input delivery, pairing, screenshots, and waits. Reduce round trips and redundant observations while retaining correct input synchronization. Confirm determinism under Ubuntu load. Do not simply raise the timeout, increase retries, or loosen assertions.

Audit Bakery, Pong, Mini Golf, and other long tests next. Separate what each test proves:

| Concern                                                | Suitable coverage                                    |
| ------------------------------------------------------ | ---------------------------------------------------- |
| Scoring, collisions, stage transitions, win rules      | Deterministic simulation/unit tests                  |
| Pairing, host authority, remote inputs, disconnects    | Real multi-browser integration tests                 |
| Layout, long names, full rosters, results presentation | Bounded deterministic browser states and screenshots |
| Complete natural match progression                     | A small number of genuine full-journey tests         |

Do not make every visual state require replaying an entire match or pairing eight clients if networking is already covered separately.

The current instructions require deliberate screenshot states established through normal controls and synchronized state. Start by improving existing fixtures within that rule. If direct test-state setup would materially improve performance, propose and document the specific policy change before adopting it. Fixtures should use valid domain state, remain isolated from normal production use, and have separate tests proving real transitions and controls. Synthetic screenshots alone cannot prove a match is playable.

Keep strict snapshot dimensions, pixel budgets, bundled fonts, taller-font tests, and reviewed Darwin/Linux pairs. Never replace missing Linux renders with Darwin files.

## 4. Evaluate balanced CI sharding

After stabilizing expensive fixtures, benchmark splitting the full browser suite across two or three Ubuntu jobs. Keep complete coverage and merged failure evidence.

With `fullyParallel: false`, Playwright shards whole files; large files can cause imbalance. Split broad files such as `tests/game.spec.ts` by game or responsibility before expecting good balance. Enable test-level parallelism only after checking test and artifact isolation. Multiplayer tests create many browser contexts, so increasing workers on one machine can worsen contention and reliability.

Compare wall time, runner minutes, failure rate, and the slowest shard. Adopt sharding only if the measured gain justifies its small amount of workflow complexity. See [Playwright sharding](https://playwright.dev/docs/test-sharding) and [CI guidance](https://playwright.dev/docs/ci).

## 5. Stabilize live-browser QA and investigate popups

The owner reports interruptions even with Codex set to **Approve for me**:

- Prompts asking to restart/reload an app after a change, apparently during browser testing.
- Prompts asking to trust browser access through Firefox or Chrome on a particular port.

The exact wording and originating application have not yet been captured. Codex does not reliably receive dialogs visible only on the owner's screen; a silent wait must not be assumed to be test execution. The owner can call out a popup when it appears, including its title/text and which app shows it. Ask for a screenshot only if needed to identify it. Track permission-wait time separately from execution time.

### Distinguish the sources before changing anything

**Game update confirmation:** `src/App.tsx` calls `window.confirm` when the user selects an available update while connected to a session: “Updating reloads the app and ends your connection to this game. Update now?” `src/pwa/updates.ts` and `vite.config.ts` implement waiting updates. Merely detecting an update should not open that confirmation. If a prompt appears automatically, reproduce and identify it; it may originate elsewhere.

Keep the production rule that updates never automatically reload an active game. Do not remove this protection to speed testing. Run ordinary gameplay QA in a clean, dedicated context with an asserted build identity. Reserve waiting-worker, reload, offline, and persistence checks for deliberate PWA testing. If controlled service-worker blocking is used for gameplay QA, document it and keep a separate pass against the unchanged production PWA.

**Browser/site access:** Current [official browser documentation](https://learn.chatgpt.com/docs/browser?surface=app) describes website exceptions under Settings → Browser → Agent permissions, and separate explicit approval for full CDP access. Availability depends on the installed app and managed settings. Inspect the actual interface before recommending a setting. This does not establish the source of the reported Firefox prompt, or guarantee that Approve for me covers it.

Use one supported browser route and stable loopback origins/ports where possible. Repeated switches between `localhost`, `127.0.0.1`, other addresses, and new ports may change permission scope; verify how the installed app treats them. Investigate narrowly scoped saved permissions for the dedicated QA origins, with the owner's approval. Do not enable unrestricted access, alter permission storage directly, or bypass prompts.

Prefer clean browser contexts or scoped test-origin resets over continually changing ports to escape stale workers. Do not clear the owner's unrelated browsing data or real game progress. Avoid full CDP for ordinary checks when supported basic browser controls suffice.

**Codex/browser restart or OS permission:** If the popup belongs to the desktop app, extension, or operating system, treat it separately from the game's service worker. Record the app/version and exact message. Do not restart Codex mid-run automatically or promise that a repository change can eliminate that prompt.

### Repeatable live QA procedure

- Build a short inventory of relevant controls and states before opening the browser.
- Use the `playwright-interactive` skill and the known-working supported browser route; avoid repeating failed launch/connect experiments in each new session.
- Verify the current build, then exercise real keyboard/touch-style controls, pairing, and meaningful post-interaction states.
- Inspect desktop and phone screenshots; use automated coverage for the repetitive viewport/font matrix.
- Set a short browser setup/recovery budget, such as five minutes. If it fails, report the blocker and continue independent automated checks. A fallback must not silently claim required live QA was completed; document any policy change permitting substitution.
- Document the working route, origins, reset procedure, and permission behavior in `QA.md` for future sessions.

## 6. Optional policy changes, requiring an explicit decision

The first implementation should preserve the existing full local and exact-final Ubuntu gates. Measure its improvements before weakening coverage.

Two further options are available:

1. **Focused local browser coverage plus complete Ubuntu verification.** Continue reviewing changed Darwin snapshots locally, but stop repeating unrelated full journeys on macOS for small game changes. A task like Arena Pong could avoid roughly seven minutes of duplicate local coverage. This reduces broad macOS regression coverage and requires updating the current `AGENTS.md` rule.
2. **Move selected long full-match journeys to an extended pre-merge/release suite.** Keep rules, real pairing/input smoke tests, and affected visual coverage in the normal gate. Some cross-game regressions would be detected later. Define exactly when the extended suite must pass; do not silently omit tests or create scheduled automation without authorization.

## Deliverables and acceptance criteria

- Documented fast and final commands, with clear coverage boundaries.
- No overlapping complete local runs or ambiguous reuse of a stale server.
- Reusable, non-deploying review CI with obsolete-run cancellation and no duplicate build.
- Before/after timings for the complete suite and its slowest tests, including setup and permission waits. Prefer a small machine-readable timing report to a new dashboard.
- Breakout's expensive fixture diagnosed and improved, with focused repeated checks demonstrating reliability. Label unresolved variability honestly.
- Stable live-QA setup and a documented classification of each observed popup; identify external limitations that repository code cannot fix.
- All applicable full gates still pass, with genuine reviewed platform baselines and an exact-final Ubuntu run URL/commit. Workflow/test changes themselves must satisfy the current Linux gate.
- No lowered visual tolerances, skipped comparisons, blanket snapshot refreshes, automatic active-game reloads, or lost real control/network coverage.

Start with sections 1, 2, and 5, then the Breakout fixture. Benchmark sharding afterward. Aim for routine focused iterations under a minute where feasible, but report measured results rather than promising an unproven speedup.

## Suggested next possible steps

These are recommendations, not approved changes to verification policy. Start
with the existing focused workflow in a new session before changing more tools.

1. **Measure a real feature session using the new workflow.** Run relevant units,
   focused game/control/layout checks and shared smoke checks while editing.
   Resolve live QA findings before the complete final gates. Record total session
   time, setup/recovery and permission waits, repeated full runs and failures.
   Compare similar tasks; a single suite duration cannot prove session efficiency.
   Keep the stable in-app browser route and QA origin documented in `QA.md`.
2. **Consider focused local browser coverage plus full Ubuntu verification.**
   This is the clearest immediate opportunity to avoid duplicate full journeys
   for small changes. Keep affected Darwin visual coverage, relevant shared
   behavior checks and complete exact-final Ubuntu coverage. It reduces broad
   macOS regression coverage and requires the owner's explicit decision and an
   update to `AGENTS.md`; the current full local gate remains in force meanwhile.
3. **Reduce natural replay needed solely to reach visual states.** Audit crowded
   rosters and results screens, starting with Bakery and Breakout. Keep real
   pairing, input, authority and disconnect checks, deterministic rule tests and
   a small set of genuine full journeys. If isolated test-state fixtures would
   help, propose their exact boundary and production isolation before adopting
   them. They must create valid domain states and cannot replace tests proving
   actual controls and transitions. This requires an explicit change to the
   current normal-controls screenshot rule. Preserve visual dimensions, fonts,
   pixel budgets and genuine reviewed Darwin/Linux images.
4. **Repeat the optional two-shard benchmark after stability is established.**
   The first experiment was inconclusive: one shard failed on the now-corrected
   Golf interpolation screenshot and another spent 404 seconds installing
   Chromium before being superseded. Use the same final implementation for a
   passing ordinary run and both complete shards. Compare end-to-end wall time,
   setup time, runner minutes, slowest shard and failures. The split integration
   files support file-level scheduling. Adopt sharding only with a worthwhile,
   repeatable gain; do not simply increase workers for context-heavy matches.
5. **Use fixture profiles to decide where further optimization pays off.**
   Breakout's browser-clock advancement consumed roughly 80–85 seconds in two
   serial samples, compared with about eight seconds of DOM observations and
   under one second of pairing. Removing more small reads alone is unlikely to
   yield a large improvement. Investigate whether normal paddle strategies can
   finish the genuine journey sooner, or whether coverage can be divided better
   between rules, bounded integration and visual fixtures. Do not change game
   physics, increase timeouts/retries or skip coverage to improve a benchmark.
6. **Investigate popups only if they recur.** Record their exact text, title,
   originating app/version and triggering action, with permission wait measured
   separately. This session's absence of popups supports continuing the working
   route; it does not prove their original cause was fixed. Preserve production
   update consent and unrelated browser data.

The recommended immediate next step is one normal feature session using the
new commands and documented browser route. Then review its evidence and decide
whether to approve the focused-local/full-Ubuntu policy option. Moving long
journeys to an extended suite remains a separate, later policy decision.
