# P2P Game Lab conventions

- This is an experimental game lab for the owner and their family to play together at home and explore ideas for what they can build with Codex. Prefer simple, enjoyable experiments over production-scale features.
- iPhones and iPads are the target devices, primarily as installed home-screen PWAs on the household Wi-Fi. Prioritize real iOS/iPadOS touch, layout, safe-area, installation, and lifecycle behavior. Android support is not required; desktop browsers remain useful for development and automated testing.
- Aim for an immersive, app-like experience: primary screens and active gameplay should fit the available viewport without page scrolling. Use focused screens and dialogs for setup, help, settings, and diagnostics rather than stacking them around gameplay. Preserve accessible scrolling within secondary content when it is needed for small viewports, larger text, or the on-screen keyboard.
- Keep this a static, offline-capable PWA hosted under `/multiplayer-test/` on GitHub Pages. Pairing stays manual QR/text; do not introduce signaling servers, STUN/TURN, accounts, or external assets without discussing it.
- The host owns game state and simulates Pong in fixed 120 Hz steps. Clients send validated inputs, render local paddles immediately, and smooth received ball snapshots. Keep room epochs, input sequencing, bounded messages, and disconnect cleanup intact.
- Validate any new network fields/actions in `src/games/validate.ts` and `src/network/protocol.ts`. Consider mixed app versions and tell users when all devices need updating. Preserve old versioned identity/sound storage where possible.
- Keep game controls usable on touch screens. Disable gesture scrolling only on active play surfaces; secondary content must remain scrollable when needed. Camera scanning uses a native modal, releases streams on every exit, and retains QR-image/text fallback.
- Sound is synthesized locally, muted by default, and unlocked by a user gesture. Service-worker updates wait for the user; never reload an active game automatically.
- Use `npm run verify` before handoff: formatting, unit tests, production build, and Playwright tests. Cover meaningful game rules and real pairing flows. Preview the production subpath for PWA/cache checks.
- Follow the Linux verification gate below for code, dependency, build, workflow, and browser-test changes. Local macOS verification alone is insufficient for handoff.
- For layout checks, retain readable text, touch targets, QR codes at least 240px wide on narrow phones, and generous viewport clearance. Test alternate/taller font metrics; do not loosen fit assertions to hide a layout bug. Use the `playwright-interactive` skill for live UI QA when available and review saved desktop/mobile screenshots.
- Record product behavior in README.md and manual/device QA in QA.md. Keep AGENTS.md limited to instructions for future coding agents.

## Linux verification gate

The owner has authorized review-branch pushes and non-deploying GitHub Actions
runs as the normal Linux testing process. Use a `codex/` branch; do not merge to
`main` or deploy Pages just to obtain test results. Documentation-only changes
need formatting/diff checks; the full cross-platform gate applies when executable
code, dependencies, build configuration, workflows, tests, or baselines change.

1. Before adding screenshot states, establish how genuine Linux renders will be
   obtained. Prefer the GitHub Actions review-branch process below when the local
   workspace is macOS. Do not defer missing Linux images until after handoff.
2. Inspect `.github/workflows/light-seek-review.yml` as the working reference.
   Its trigger and baseline-return destination are currently specific to
   `codex/light-seek`: for a different task, adapt or copy it with the actual
   review branch, appropriate workflow name, and only the affected test files.
   Keep the Ubuntu runner, Node 22, `npm ci`, Playwright Chromium installation,
   production build, complete `npm run verify`, and browser evidence upload.
   The review workflow must have no Pages deployment job. Verification needs
   read access; grant contents write only when returning generated baselines to
   the same review branch. If no baselines need generation, omit the generation
   and return steps and run normal verification only.
3. Run focused checks locally while implementing. Generate/review Darwin
   baselines on macOS and push the reviewable implementation to its review
   branch. When Linux baselines are missing, use a narrowly scoped, one-time
   generation step on Ubuntu with the affected Playwright spec files and
   `--update-snapshots`. Generate changed existing baselines only after examining
   the mismatch and confirming the intended visual change; use
   `--update-snapshots=all` only for that deliberate, scoped refresh. Never run
   blanket snapshot updates as a way to make failing verification green.
4. Obtain the actual Linux images. The reference workflow commits generated
   `*-linux.png` files back to the review branch; fetch and fast-forward that
   commit, preserving local work, then visually review every new/changed image
   and the final baseline diff. The alternative is the matching run's
   `browser-failure-results` artifact, following QA.md's screenshot portability
   workflow. Keep the bundled font fixture, strict dimensions and existing
   pixel budgets. Never copy Darwin renders into Linux baselines, skip
   comparisons, or loosen tolerances/fit assertions to conceal failures.
5. Every new platform-specific state must include both reviewed `-darwin.png`
   and `-linux.png` files. Run the complete local `npm run verify`, including
   `check:snapshots`. The presence check proves only that files exist; it does
   not establish visual correctness or passing Linux tests.
6. Push the final reviewed code, tests and baselines and wait for a successful
   Ubuntu `npm run verify` run **for that exact final commit**, with snapshot
   update flags disabled. A baseline-generation run, an earlier green commit,
   or a macOS pass cannot substitute for this check. CI commits made with
   `GITHUB_TOKEN` normally do not trigger another push run: make an ordinary
   review-branch push (or explicitly dispatch verification) when a separate
   final run is needed. Diagnose failures and repeat only the affected checks
   while fixing them, then repeat complete verification after the last fix.
7. Before handoff, check the final Git diff/status and report the local command
   result, Linux run URL and verified commit, baseline review, and remaining
   physical iPhone/iPad checks. If Linux execution or its actual renders cannot
   be obtained, continue independent work but explicitly mark the feature
   incomplete. Do not describe it as ready to merge or push with a known
   missing baseline, failing Linux check, or unverified final implementation.
