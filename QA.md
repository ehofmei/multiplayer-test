## Household device priorities

Design and polish primarily for the devices the family actually plays on, usually
as installed home-screen PWAs on household Wi-Fi. Use this inventory in future
plans instead of inventing a broad device matrix for each task.

| Priority  | Device                                  | Nominal CSS viewport                          |
| --------- | --------------------------------------- | --------------------------------------------- |
| Primary   | iPhone 17 Pro                           | 402×874 portrait; 874×402 for rotation checks |
| Primary   | iPhone 18 Pro Max                       | 440×956 portrait; 956×440 for rotation checks |
| Primary   | 10.9-inch iPad Air, 5th generation (M1) | 1180×820 landscape                            |
| Secondary | 10.2-inch iPad, 9th generation (2021)   | 1080×810 landscape                            |

These are nominal full-screen emulation sizes, not measured available gameplay
areas. The phone sizes use standard 3× scaling of Apple's published display
resolutions, and both iPads use standard 2× scaling. References:
[iPhone 17 Pro](https://support.apple.com/en-us/125090),
[iPhone 18 Pro Max](https://www.apple.com/iphone-18-pro/specs/),
[iPad Air (5th generation)](https://support.apple.com/en-us/111887) and
[iPad (9th generation)](https://support.apple.com/en-us/111898).
Confirm actual usable viewports on the household devices, including safe areas,
Safari controls, installed-PWA behavior and any Display Zoom settings.

For focused iteration, prioritize comfortable phone controls and a deliberate
landscape iPad composition. Use the older iPad for secondary layout/performance
checks when available. Review household-sized screenshots and exercise normal
touch controls; emulator dimensions alone do not establish iOS usability.
Include larger text, reduced motion, muted play, rotation and lifecycle checks
where relevant to the change.

Keep existing smaller-screen, alternate-font and desktop tests as regression
coverage. Desktop remains useful for development and automation. Do not expand
manual QA to unrelated devices by default, hard-code layouts to model names,
relax fit assertions or sacrifice household board size for speculative coverage.
The existing complete local and exact-final Ubuntu verification gates remain
required for implementation changes; this inventory focuses design and manual
iteration without changing the automated gate.

## Iteration and review commands

Use `npm run check:fast` for formatting, types, unit and script tests. For a
single rule change, `npx vitest run src/games/breakout.test.ts` is faster still.
Build once with `npm run build` before focused production-browser checks:

- `npm run test:game -- breakout` selects Breakout and its extracted integration coverage.
  For a bounded control/layout iteration, append `--grep "fits|controls|pause"`;
  this excludes the full victory journey, which stays in final verification.
  Other names: pong, arena, reaction, cycle, sumo, bakery, minigolf, seek, ship,
  picnic, treasure and glow. Append normal Playwright options for narrower checks.
- `npm run test:network` exercises real multi-browser pairing, concurrent inputs
  and disconnect cleanup. Add it for network/session changes.
- `npm run test:e2e -- tests/updates.spec.ts` checks waiting-worker/update behavior.
- `npm run verify` remains the complete final local gate, with snapshot updates
  explicitly disabled. Run it after focused and live findings are resolved.

The checkout guard serializes all scripted browser/full checks and diagnoses a
live owner without stopping it. A dead PID is recovered automatically only after its child process group has also
exited; an invalid
or missing owner requires inspection of `.qa-run.lock/owner.json` before manual
cleanup. Avoid raw `npx playwright test` during guarded runs: it bypasses the guard.
Use separate checkouts for intentionally concurrent work, with distinct `QA_PORT`
and `QA_OUTPUT_DIR` values, and never rebuild a shared `dist` during a test.
The camera fixture's independently launched browser inherits Playwright's
configured base URL too; changing `QA_PORT` must not send it to the default port.
The preview uses a strict port and never reuses an existing process. Stop only
your own preview, or choose an explicit QA port. Default regression origin:
`http://127.0.0.1:4173/multiplayer-test/`.

`test-results/checks-timing.json` records step and total elapsed times;
`browser-timing.json` records individual tests, status and retries. Compare the
same machine/worker count and report failures separately from passing timings.
Setup and permissions before runner startup are manual measurements, not included
in those files. Retain before/after reports outside the disposable output folder.

Shared protocol/session changes need network smoke plus affected multiplayer
specs; storage/audio/lifecycle changes need the matching shared-file tests and
`updates.spec.ts`; global CSS needs `app-layout.spec.ts` and affected game/layout
specs across the existing viewport/font matrix. Complete local/Ubuntu gates remain
required regardless of the focused selection.

`.github/workflows/review.yml` runs non-deploying Ubuntu/Node 22 verification on
`codex/` pushes, and supports explicit dispatch on the review branch. Superseded
runs cancel within the same branch and mode. Optional `benchmark` dispatch adds
two browser shards alongside the ordinary full gate; before dispatch is available
on the default branch, a review commit containing `[benchmark]` requests the same
experiment. Each shard saves separate timing/failure evidence in the matching run.
Sharding is not the default final gate. Select `baselines` only with explicit
existing spec paths; enable refresh only after reviewing an intended mismatch.
Download `linux-baseline-evidence-<sha>`, copy only the requested actual Ubuntu
images into their matching test snapshot directories, visually inspect every
changed image, then commit/push and wait for ordinary **verify** success for that
exact commit. Generation success is not the final gate. This artifact route keeps
repository access read-only; historical branch workflows retain their baseline
return mechanism. Historical review branches are excluded from its push trigger to avoid duplicate
runs; new work should use this reusable workflow.

For an intermediate review-branch commit that still needs Linux images, use
GitHub's [supported `[skip ci]` commit marker](https://docs.github.com/en/actions/how-tos/manage-workflow-runs/skip-workflow-runs)
and explicitly dispatch scoped baseline evidence generation. This avoids an
automatic full run against known incomplete baselines. Use normal verification
on the final reviewed commit, without the marker or snapshot-update flags; an
evidence run or skipped push check never satisfies the final gate.

### Keep expensive verification at the end of iteration

At the start of implementation, locate an available GitHub CLI and run
`gh auth status`; confirm the repository remote and review workflow/artifact
access. Establish the genuine Ubuntu screenshot route before adding states.
Resolve access early while continuing independent local work.

Before final baseline generation, review the diff and exercise the supported
roles: host, client and spectator. Check whose board is displayed, which action
the feedback describes, and which information each role may see. Include setup,
waiting/paused states and both players' result perspectives where relevant.
Settle control behavior and intended pixels through focused tests and live QA,
then generate/review baselines and run the complete gates. Optional visual
refinements belong before this point. A later substantive fix still requires
complete local and exact-final Ubuntu verification again.

For layout checks, collect visibility, classes and bounding rectangles for all
targets in one read-only browser evaluation per state/viewport, then assert the
same target sizes, overflow and clearance in the test. See `fit()` in
`tests/seek.spec.ts`. Avoid separate browser round trips for each property of
each tile. Keep user actions as normal input and preserve all assertions.

Keep low-level touch slide/cancel/release tests in a separate context with
`isMobile: true` and `hasTouch: true`, using touch input for the subsequent
placement and Ready controls too. Retain the mouse/keyboard journey separately.
During Light Seek QA, mixed low-level touch and mouse streams in desktop
emulation delivered pointer/touch events on Ubuntu without the expected Ready
click; the isolated mobile flow passed. If a control stalls, inspect current
state and input events before changing product behavior or repeatedly rerunning
CI. Do not compensate by relaxing screenshots, timeouts or fit assertions.

## Repeatable live-browser setup and popup diagnosis

Inventory for testing-tool changes: current build identity, Create/Return Home,
game selection, Help/Escape/focus, pause/resume, desktop/phone screenshots; explore
invalid pairing and a narrow viewport. Full multiplayer/PWA behavior remains
covered by the production-browser suite and deliberate PWA passes.

Use the `playwright-interactive` skill with the persistent in-app browser through
`mcp__cua_repl`, basic controls, and a dedicated production preview at
`http://127.0.0.1:4174/multiplayer-test/`. Keep that origin stable. Check Menu's
build identifier against the current build before acting. A fresh tab alone does
not prove fresh storage or a cleared worker. If identity is wrong, stop gameplay
QA and use only a supported scoped reset for that origin; preserve real progress
and unrelated browser data. Reserve offline/update/reload checks for deliberate
PWA QA. **Before Create Game or Join Game on every QA device/tab, check the
build and apply any waiting update from Home.** If a QA tab is already in host/join
mode, use Menu → Return Home first, then update and pair again. Join mode counts
as a session even before a peer connects; updating there triggers the game's
confirmation and can block a tool's click until the dialog is answered.

Choose independent QA identities before pairing: use the stable
`127.0.0.1:4174` host, `localhost:4174` client, and, when a spectator is needed,
a dedicated `127.0.0.1:4175` preview, all under `/multiplayer-test/`. Confirm
matching build identifiers on every tab. These distinct origins provide separate
storage identities; keep them stable throughout the pass. Avoid guessing other
loopback addresses. After resizing, verify the intended tab's actual
`innerWidth`/`innerHeight` before judging layout or capturing screenshots.

The observed dialog is titled `<origin> says` and reads “Updating reloads the app
and ends your connection to this game. Update now?” It is the app's JavaScript
confirmation, not a browser trust or Codex restart prompt. Avoid it through the
Home-first workflow; do not remove the production safeguard. If encountered during
an intentional QA update, use the supported `tab.getJsDialog()` API, confirm the
expected text/source from the current observation, and accept or dismiss the
`confirm` dialog according to the intended QA action, then verify the new build.
When the click waits on the dialog, retain its pending promise and handle the
dialog in the next REPL call rather than waiting for the user or blindly clicking
again. Do not update a real user-owned session during QA. Production active-game
updates still require a user action and confirmation.

Budget five minutes for setup/recovery; if blocked, record it and continue
independent checks without claiming live QA passed. Record permission wait separately
from execution. Do not switch ports/origins repeatedly to escape permissions.

Reported restart/reload and Firefox/Chrome trust popups remain unclassified until
observed: record exact title/text, originating app and version, action that triggered
it, and elapsed wait. The game's in-session update confirmation should occur only
when Update is selected. Browser/site permission, full CDP approval, desktop-app
restart and OS permission are separate sources. Do not alter permissions or restart
Codex automatically; only investigate narrowly scoped saved permissions after the
owner approves. Repository changes cannot establish the source of an unseen popup.

The live setup pass on October 12, 2026 used this supported route without CDP or
permission changes. A previous worker initially served build `20261012T013632Z`;
the normal home-screen Update app action loaded `20261012T140348Z` and preserved
the saved name. The pass exercised creation, Breakout selection, Help/Escape,
pause/resume, Return Home and invalid text pairing, and reviewed 390×844 phone
and 1280×720 desktop views. Setup/recovery stayed below five minutes; no browser
trust or desktop restart popup appeared, and no permission wait was observed.
Physical iOS installation/touch/lifecycle checks remain manual.

# Browser QA inventory

Checkpoint: app shell, QR/text pairing, game picker, Pong, Arena Pong, Reaction Race, shared grid and latency.
Use the production build at /multiplayer-test/ for checks.

| Feature / control                           | Functional check                                                                                                                  | Visual state / evidence                                                |
| ------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------- |
| Name, Create Game, Join Game, Return Home   | Name persists; create/join modes; leave disposes peers                                                                            | Desktop and phone home, host, waiting client                           |
| Add Player, offer/answer text, copy, cancel | Host + 3 independent clients; fresh offer each time; select/copy fallback; cancelled invite closes peer                           | Expanded pairing and invalid-paste error on phone                      |
| Grid                                        | Host/client toggles; concurrent actions; rapid taps; fresh join gets current state                                                | Off/on cells; keyboard focus; deterministic grid snapshot              |
| Player list                                 | Join, leave, manually rejoin; host loss disables client board                                                                     | Four-player list; disconnected client error                            |
| Connection details                          | Expand/collapse; open channel, ICE/signaling, counters                                                                            | Expanded connected diagnostics                                         |
| QR generation and image import              | Decode actual compressed offer/answer images; pair with HTTP blocked; reject unrelated, malformed and wrong-role codes            | Complete QR at desktop/phone/tablet sizes; image-import errors         |
| Camera scanning                             | Explicit start; Stop Camera; denied access; stream ends when leaving; repeated scans do not duplicate players                     | Camera preview, readable instructions and reachable stop control       |
| Latency diagnostics                         | Per-peer current/median/p95 RTT; matching local tap acknowledgments; bounded samples; unmatched/late pong handling; timer cleanup | Waiting-for-samples and populated RTT/tap metrics on phone and desktop |
| Install instructions and PWA                | Expand instructions; manifest/icons; offline startup; stored name reload                                                          | Phone instructions, browser/standalone indicator                       |
| Page updates                                | New worker waits until the session ends and app windows close                                                                     | Update notice; no mid-game forced reload                               |
| Layout and accessibility                    | 390px phone, smaller 320px phone, tablet and desktop; no horizontal overflow; board above fold                                    | Screenshots; focus/contrast/readability and target-size review         |

New-game inventory:

- Host-only picker: all devices follow selection; switch games without pairing again.
- Pong: select two distinct players, include two clients with host spectating; drag,
  range and keyboard controls; immediate local paddle, replicated remote paddle,
  ball motion, scoring, win at seven, rematch, pause/resume and serve delay.
- Race: six random targets, early/wrong penalties, one attempt, hold decoys, ten-round
  totals, ties, stop/rematch; local response timing; late joins spectate.
- Lifecycle: stale match/round inputs ignored; participant loss stops play, remaining
  peers survive; host backgrounding and opening pairing stop/pause active games.
- Responsive/visual: picker, courts, targets and results at 1280×720, 768×1024,
  390×844 and 320×700; long names, empty room, spectator and disabled controls;
  primary play surface fits, readable contrast, visible focus and touch targets.
- PWA: production subpath, offline picker/game modules after an online visit; all
  devices updated to game protocol v2 before pairing.

Exploratory checks: malformed offer and answer, cancelled pending invite, rapid/repeated taps,
leave while connected, fresh manual reconnect, long player names, and narrow phone layout.
QR exploration: invalid image, wrong QR type, camera denial, cancelled scanning,
repeated image import, large payload fallback and offline decoder availability.

Real iPhone/iPad Safari and installed-PWA LAN pairing, updates and offline startup require
physical-device testing. Browser emulation does not certify these behaviors.
For the QR checkpoint, scan both directions with real rear cameras, reverse host/client
roles, deny then re-enable camera access, repeat after installing the PWA, and pair
with internet disabled while retaining LAN Wi-Fi. Confirm camera indicators stop
after scanning, cancelling and leaving. Record median/p95 RTT after about a minute
and client tap-response values while tapping normally and rapidly.

For the new games, play Pong on real iPhone/iPad devices with each device hosting,
try fast paddle motion, watch for ball corrections, and test a third spectator.
Play a complete race with several players; check target/hold readability, false
starts, results, and whether response rankings feel reasonable. Background the
host during each game, return, and resume/restart; confirm switching never asks
for new QR scans. Phone emulation cannot certify real iOS scheduling or touch feel.

Sound inventory: muted first visit; per-device saved toggle; keyboard activation;
unlock on a user gesture after reload; light on/off, Pong bounce/serve/point/end,
race target/hold/result/end cues; no repeated cues from diagnostics/state messages;
no replay on game changes; rapid taps remain bounded; mute/background/unmount stop
voices; unavailable audio preserves gameplay; offline effects. Check the header
at 320px and desktop, visible toggle focus, and comfortable volume. Real iOS sound
unlock, device volume/mute behavior, and foreground recovery need physical testing.

## Shared Lights family polish (Task 8)

Inventory: lone host; host/client input; all-off, mixed and all-on boards;
keyboard focus/Space/Enter; cancelled touch; delayed authoritative acceptance;
rapid and simultaneous toggles; revision diagnostics; eight connected players;
disconnect/rejoin; switching away/back; muted sound and reduced motion;
background/page recovery; saved sound and cached offline startup.

`tests/lights.spec.ts` checks lens/label clearance, circular lenses, minimum 44px
targets and actual content bounds with normal and taller font metrics throughout
the household viewport inventory plus 390×844, 320×700, 320×568, 844×390,
768×1024 and 1280×720. Deterministic snapshots cover all-off phone, mixed phone
with visible keyboard focus, all-on landscape iPad, short landscape reduced
motion, and an eight-player phone shell. Every state has separate Darwin/Linux
renders. The pairing suite also compares the confirmed four-device board using
platform-specific images; the earlier shared image remains as historical evidence.
Keep the existing font fixture, dimensions and pixel budgets.

Real WebRTC coverage retains concurrent different-cell input, twenty rapid
toggles, rejoin/disconnect, offline QR-image pairing and latency diagnostics. It
adds four simultaneous same-cell toggles and checks exact revision/parity on every
device. Revision assertions open Connection details explicitly; ordinary play
asserts button states. A delayed-client-send test checks press depression before
host confirmation, then matching host/client states and confirmed visual feedback.
An isolated mobile touch context checks cancellation followed by ordinary taps.
Disconnected 320×568 and 844×390 client boards retain lens/label clearance,
last-known states and disabled controls alongside the connection warning.
Animation checks verify an accepted change produces feedback, same-cell effects
remain bounded and all effects clear. No scoring or spectator restrictions apply.

Audio tests cover copied cell state, on-only/off-only/mixed transitions, duplicate
and stale snapshots, skipped net-zero toggles, first state and epoch/session
changes. Production-browser checks cover mute, gesture unlock, saved preference,
offline cues, recovery suppression and switching. Shared layout and user-controlled
PWA update regressions remain part of complete verification.

The persistent live-browser pass exercised Home updates/build identity on both
QA origins before real text pairing, local/remote toggles, keyboard activation,
revision diagnostics without peers, sound switching, all-on muted desktop play
and host disconnect. Reviewed phone, short-phone, short-landscape, landscape iPad
and desktop views and confirmed matching sixteen-cell states across paired tabs.
This is Chromium emulation, not installed iOS acceptance or family sound tuning.

Physical follow-up: use the household phones and landscape iPads over Wi-Fi;
check real-thumb cancellation/rapid tapping, comfortable reach to all sixteen
lamps, installed safe areas/rotation, larger text/VoiceOver, Safari sound unlock
and recovery, several devices sounding together, host background/resume, saved
preferences and offline startup after updating. Verify volume/timbre by listening
with the family. These checks remain pending.

## App updates

- Menu build identifier and 44px update control on desktop and narrow phone.
- Latest build reports up to date; offline check explains retry without interrupting play.
- A new service worker waits during play, caches fully before Update app appears, and reloads on request.
- Canceling an in-game update preserves the session; accepting returns home with the current assets.
- Check installed iPhone/iPad updates and compare build identifiers after deployment.

## Arena Pong and paddle colors

- Real four-player pairing covers seat assignment, all rotated views, duplicate
  colors, synchronized lives, court/steering-strip pointer and keyboard input,
  accessible slider, pause/resume, spectators and participant disconnect cleanup.
  Three-player play keeps the unused side a wall. Rematch retains selected lives.
- Arena unit/audio tests cover every occupied/empty/eliminated collision side,
  confirmed miss location, wall conversion, bounded optional contact validation
  through the protocol parser, deduplication, stale/initial/paused frames, epoch
  reset and final-cue priority. Breakout retains its own contact representation.
- Deterministic paired screenshots cover ready, rotated active play, desktop,
  short phone, landscape, miss, last life/reduced motion, elimination and finale.
  The host clock establishes actual simulated outcomes and clients must receive
  the matching state before assertions/capture. No live-state injection or physics
  retuning. Darwin and genuine Ubuntu baselines require visual review.
- Strict fit checks cover 390×844, 320×700, 320×568, 844×390, 768×1024 and
  1280×720 with native and taller serif metrics. Check court squareness, actual
  card overflow, 44px controls and footer clearance. Short landscape uses counts
  instead of tiny pips, with controls beside the court. Results retire the court.
- Persistent live in-app browser QA also exercised a real three-player text-paired
  room, natural finish, replay, rotated court/strip keyboard input, Help slider
  clamping, shared color changes and synchronized pause/resume. Automated touch
  emulation and saved phone/tablet/desktop screenshots complement that pass;
  neither establishes physical thumb comfort or Safari behavior.
- Physical iPhone/iPad follow-up: compare court dragging and the steering strip
  with real thumbs, especially reach, release/cancel and fast reversals; confirm
  ball visibility, installed safe areas, rotation and background/resume. Listen
  to the short loss/elimination cues with several devices and family conversation,
  including Safari gesture unlock and audio recovery. Keep sound muted by default.

## Family play feedback

- Reaction Race: touch drag of a few pixels on a live target still scores once and does not scroll; secondary panels can scroll; keyboard activation still works.
- Both Pong games: gentle opening, acceleration visible by five seconds, capped speed, ramp resets after every miss, pause freezes timing.
- Arena: host picks 1/3/5/7 lives, clients see the chosen setting, rematch keeps it, invalid wire values rejected.
- Scanner: full-screen phone/desktop dialog, focus stays in modal, Escape/Stop restores focus and scrolling, camera tracks end, permission denial retains fallbacks. Check successful scanning and background close on real iPhone/iPad.

## Co-op Breakout

- Inventory: 1–4 contiguous, distinct seats; ready core preview; 25-brick central
  grid; five shared lives; three named cores and reinforcement; own paddle at
  bottom; court/steering-strip pointer and touch, keyboard and help slider;
  palette/roster; confirmed hit/break/paddle feedback; pause/resume countdown;
  spectators; persistent team victory/loss and rematch; disconnect reset.
- Rules tests cover symmetric 445ms minimum geometric reaction travel at the
  0.60 speed cap, nearest entering brick faces/corners, no repeat overlap damage,
  ramp and paddle acceleration limits, shared misses/walls, pause/finished
  freezing, a complete steering-driven victory with lives carried between cores,
  bounded simulations and malformed/old 16-brick wire state. Arena retains its
  original speed defaults. Feedback/audio tests distinguish damage, destruction
  and core clear, without replay on repeated snapshots, paused transitions,
  new epochs or late joins.
- Real WebRTC tests retain four-player rotated controls, spectators and departure
  recovery. `tests/breakout.spec.ts` adds paired confirmed destruction,
  steering-strip input, help focus return/palette, pause/resume, natural loss,
  persistent results/rematch, complete paired victory through three cores using
  normal pointer/touch input, and cached production-subpath offline startup.
  Core-transition snapshots center both paddles with the help sliders, flush
  queued input and confirm remote positions before capture. They retain the
  strict 160-pixel comparison budget; live rally endpoints are not baseline poses.
  The final victory fixture also centers both paddles through those controls
  while the last brick approach is clear of the occupied sides, then asserts the
  shared centered pose before capture. Frozen-clock advances cover both queued
  input and snapshot delivery; no game state is injected or pixels masked.
- Review phone, 320×700 short-phone, portrait-tablet, desktop and landscape ready,
  active, destroyed-brick, paused, reinforced-core and result screenshots. Include
  taller font metrics, long names, reduced motion and safe-area clearance. Keep
  the compact core legible, the ball clear of effects, the whole court and footer
  visible, and all secondary content scrollable. Results must retain the court;
  old generic finished-game CSS must not hide it.
- Use `playwright-interactive` for a persistent live pass: start, keyboard/court
  and strip input, pause/resume, slider, palette and help focus return. Explore
  rapid pause/resume and invalid duplicate/noncontiguous team choices. Inspect
  desktop/phone/tablet/landscape screenshots and actual element bounds.
- New baselines have reviewed Darwin/Linux pairs. Obtain genuine Linux renders
  with `.github/workflows/breakout-review.yml` on `codex/breakout-reaction-space`;
  after reviewing every returned image, remove generation/return steps and run
  complete local and exact-final-commit Ubuntu `npm run verify` with snapshot
  updates disabled. No Pages deployment belongs in that review workflow.
- Physical device checks remain essential: install/update every iPhone/iPad,
  pair on household Wi-Fi, play from every occupied side at maximum rally speed,
  check thumbs on both court and strip, reinforced-brick readability, optional
  sound and muted/reduced-motion feedback, safe areas and rotation, all three
  cores through a complete victory, host background/resume, offline relaunch,
  and waiting service-worker updates without an automatic in-game reload.
- Family tuning: judge time to react after core rebounds and paddle saves,
  especially the busiest four-player room. Check the last few bricks and the
  all-reinforced final core for a lively pace. The geometric 445ms budget does
  not establish human comfort or compensate for network/display delay.

## Spaceship Panic

Task 11 coverage adds quiet command identity, local wrong/missed routing,
five-second deadline urgency, once-per-mission best-streak thresholds 5/10,
and a connected cockpit with larger pictures. The gameplay inventory below
remains required. Unit tests cover bounded optional metadata and legacy rules-2
snapshots, identical consecutive requests, repeated wrong attempts, simultaneous
misses, role-specific successes/errors, priority, silent initialization,
launch epochs and paused/recovered comparisons. A separate one-time test used
the previous checkout's validator on actual new launch/wrong/missed/renewed
states and confirmed additive compatibility.

The Ship browser suite retains real WebRTC pairing and eight-player/all-panel
coverage and adds controlled-clock low-deadline, wrong/missed, milestone and
landscape-iPad states. Browser audio instrumentation checks neutral new-command
notes, silent timer snapshots, distinct mistakes, pause/background recovery,
rematch attention and mute. Synthesizer tests check the reduced Ship gain and
shared voice bound. Fit checks retain prior bounds/clearance/44px assertions,
with horizontal order/panel clearance for the intentional wide cockpit.
Household 402×874, 440×956, 1180×820 and 1080×810 sizes supplement the existing
viewport and taller-font matrix. New/changed platform images require genuine
Darwin and Ubuntu review through the current reusable `review.yml` artifact route;
the historical `codex/ship-controls` workflow below describes earlier coverage.

Physical acceptance: installed-PWA usable space, safe areas, phone rotation,
real-thumb comfort, young-player Door/Window/Airlock recognition, Safari audio
unlock/recovery and busy multi-device listening remain manual. Check Standard
and Gentle at early/late pressure; keep voices intelligible and no repeated
alarms. Do not redraw similar panel pictures until the recognition check
demonstrates a problem.

- Inventory: host-selected 1/2/3-minute missions (2 recommended/default),
  Standard/Gentle pace, score/completed/current/best streak, all six setting
  families and 24 illustrated panels, command/panel picture matching, direct
  touch and keyboard selection, wrong-setting recovery, pause/resume, rematch,
  spectators, crew departure and host background/stall behavior.
- Rules tests exercise 1–8 crew with seeded randomized recipients, concurrent
  conflict-free renewals, no multiplayer self-assignments, all setting domains,
  capped streak bonuses, misses and wrong settings without score loss, stale
  revisions/ownership, both difficulty ramps across every duration, terminal
  states, and rejection of malformed/old ship snapshots and switch actions.
- Real WebRTC browser tests pair crew, synchronize scores, recover from wrong
  requests, pause and disconnect. Eight connected players exercise every setting
  in all 24 panels with normal taps; controlled clocks finish all durations and
  unattended missions. Rematches reset scores. Review saved screenshots of ready,
  active, success, paused, results and each panel set. Platform baselines use the
  bundled font and strict dimensions; obtain genuine Linux images through the
  non-deploying `codex/ship-controls` review workflow before final verification.
- Layout inventory: 320×568, 320×700, 390×844, 844×390, 768×1024 and 1280×720,
  including taller serif metrics. Check actual content bounds, order/panel
  separation, 44px minimum targets, all settings above the fold, visible focus,
  selected outlines/checks, pattern recognition and muted/reduced-motion feedback.
- Physical iPhone/iPad checks remain required: installed PWA safe areas and
  orientation, matching SVG recognition with a seven-year-old, comfortable thumb
  targets, color-pattern distinction, calling/listening clarity for Door versus
  Airlock and other similar panels, LAN pairing, background/pause recovery,
  offline startup after an online visit and the user-controlled update flow.
  Update every device together; use family play to tune timing and streak bonuses.

## Light-cycle Arena

QA inventory for this game:

- Start requires 2–8 players and host authority; countdown, live movement,
  elimination, simultaneous draw, sixty-second shared win, and fresh rematch.
- Steering: all four touch buttons, keyboard arrows/WASD, swipe, one turn per
  step, rejected reversals and rapid duplicate inputs, disabled spectator controls.
- Pause/resume with a new countdown, pairing pause, host background/stall,
  late spectators, rider/spectator departures, host loss, and game switching.
- Desktop, tablet, 390px, 360px and 320px phones, including 320×568 and 844×390;
  taller font metrics, eight long names, numbered riders, focus and at least
  72×64px arrow targets. Narrow phones retain the two-row pad; wider screens use
  one row, and desktop/short landscape puts steering beside the board. Verify
  square arena corners, a square court filling the available play area, clearance
  between court and controls, and no page/card scrolling or horizontal overflow.
  Long identity text truncates on the primary screen; complete rider names remain
  in Help. Check active-surface gesture handling and scrollable secondary content.
- Feedback: directional numbered heads, local outline, requested versus confirmed
  queued turns, quiet reversal treatment, collision-cell/edge marks, and bounded
  remote crash sounds. No turn prediction or extra buffering. Check stale/duplicate
  snapshots and reduced motion without replaying historical effects.
- Finale: retain the frozen arena, distinguish last survivor/draw/time-limit shared
  win, remove the running timer, and keep Results/Help/rematch reachable. Results
  lists full names and winners, including eight long names.
- Motion: continuous head/trail movement between confirmed cells, corners without
  diagonal shortcuts, no extrapolation, exact paused/crashed positions, reduced-motion
  grid steps and recovery after delayed/skipped snapshots.
- Retain a deterministic arena screenshot and review full-page desktop/mobile
  screenshots. Verify cached startup under `/multiplayer-test/` and update messaging.

Automated coverage includes rules/protocol/session tests, actual two- and
eight-player WebRTC rooms, touch-button and swipe input, keyboard steering,
confirmed queue feedback without early movement, collision-cell/wall-edge marks,
countdown focus, pause/resume, draws/rematches, late arrivals, departures and
host loss. A deliberate paired route survives all 400 steps to verify the actual
sixty-second shared win without state injection. Screenshot coverage includes
queued turns, phone play, eight riders with reduced motion, a wall crash, champion,
draw and the dense final shared-win board. Keep both genuine platform renders
and strict dimensions/pixel budgets.

The live browser pass paired two independent local identities through manual
text, exercised Help/Escape, host/client turning, pause/resume, natural victory,
Results with full names, rematch and player departure. Reviewed live 390×844
client and 1280×720 host views and client bounds. Scripted layout coverage adds
short phones, landscape, tablet, taller fonts and safe areas. Cached preview
builds were updated with normal app controls before gameplay QA; use the
Home-first update process above to prevent modal interruptions. These are
browser checks, not physical iOS claims. Existing production-subpath offline,
manifest, identity and service-worker update tests remain in `npm run verify`.

Physical-device follow-up: pair two iPhones/iPads on Wi-Fi, then try a larger room.
Check touch steering and swipe feel, numbered heads on small displays, optional
sound, Safari/installed PWA background-and-resume, and all-device updates. Browser
emulation does not establish physical-device latency or iOS behavior.

The earlier enlarged arena’s shared `cycle-court.png` baseline was rendered on Darwin
and Ubuntu. The genuine Ubuntu image came from
[the family-playtest review run](https://github.com/ehofmei/multiplayer-test/actions/runs/37865516178)
and returned in `dbbdcf8`. Both renders were visually reviewed; the 64-pixel
budget and strict dimensions remain unchanged.
Task 6's nine platform-specific states have genuine Darwin and Ubuntu renders,
reviewed visually with unchanged 64-pixel comparison budgets and strict dimensions.
Ubuntu evidence was generated only for `tests/cycle-integration.spec.ts` in
[the scoped review run](https://github.com/ehofmei/multiplayer-test/actions/runs/38270400330)
and returned in `8264954` (the earlier seven images came from `73cd2be`). The
one-time write-enabled generation workflow is removed after review; ordinary
review verification remains read-only and uses no snapshot update flags.

Physical iPhone/iPad checks remain: comfortable steering reach, legible riders
and trails, safe areas and rotation, especially the shortest phone viewport.

## Verification and CI failure diagnosis

`npm run verify` runs formatting, unit/script tests, the TypeScript/production
build, Playwright browser tests, and the screenshot-pair presence check in order.
It stops at the first failed command. A browser failure therefore skips
`check:snapshots`; the Pages workflow also skips deployment when verification
fails. Fix the failure and rerun the complete command to reach every check.

In CI, Playwright emits both its normal text output and GitHub check annotations.
Start with the annotations for the failed test name, source location and assertion.
For screenshot failures, inspect the actual/diff images and retained trace in that
run's `browser-failure-results` artifact. Downloading detailed logs or artifacts
may require GitHub sign-in; check annotations also provide a concise diagnostic
through the GitHub API. The absence of failure annotations alone does not
establish success: confirm the complete workflow result for the exact commit.

Negative network tests deliberately inject stale or duplicate inputs and may log
`Ignored an unexpected client message.` Confirm the associated test passed before
treating that output as an expected diagnostic. Investigate the same warning
during normal play. Keep runtime validation and warnings; if cleaner test output
is needed, explicitly assert and suppress only expected warnings within those tests.

Before comparing dynamic game screenshots, establish a known pose through normal
controls, flush queued input, and assert the synchronized state on both devices.
Font normalization and a stable capture do not make incidental live positions
deterministic. Preserve strict dimensions and existing comparison budgets.

## Screenshot portability

The persistent [screenshot gallery](SCREENSHOTS.md) uses versioned baseline paths
instead of temporary `test-results/` files or expiring Actions artifacts. After a
game's visual change, review its gallery entry as well as its baseline diff. Keep
the entry's representative image and links current when renaming or adding states.
Arena Pong's gallery now uses the paired, deterministic `tests/arena.spec.ts`
baselines, with separate Darwin/Linux renders. The old saved desktop capture
remains as historical evidence; new visual comparisons use the new states.

For tests that include `process.platform` in screenshot names, retain reviewed
`-darwin.png` and `-linux.png` files for every captured state in
`tests/<test-file>-snapshots/`. `npm run verify` on macOS checks only Darwin
baselines; the Pages workflow runs on Linux. A successful local run does not
establish that Linux baselines exist or match.

`npm run verify` finishes with `npm run check:snapshots`, which fails if a
platform baseline lacks its Darwin/Linux counterpart in the same test folder.
This catches missing Linux files during local macOS verification. It checks file
presence only; review genuine OS renders and run Linux CI to verify their contents.
The check runs after Playwright so a failing Linux run can still retain actual
images in its failure artifact for review.

When adding or changing screenshots:

1. Build the app, then generate the focused baselines on each corresponding OS,
   for example `npm run build` followed by
   `npx playwright test tests/minigolf.spec.ts --update-snapshots`.
   Keep the screenshot helper active and visually review every updated image.
2. If Linux CI reports missing baselines, download `browser-failure-results` from
   that exact run within its seven-day retention period. Review the relevant
   `*-linux-actual.png` images in the failed test's directory. For an intentional
   new state, copy each accepted image to the reported expected snapshot path,
   removing `-actual` from its filename. Existing-baseline mismatches require
   investigating the difference before accepting an update.
3. Confirm every new platform-specific state has both OS baselines, preserve
   strict dimensions and existing pixel budgets, and run `npm run verify`.
   Commit the reviewed baselines with the test change. Confirm a passing Linux
   CI run before claiming cross-platform verification; if it has not run, say so.

Never substitute a Darwin render for a Linux baseline or disable comparisons to
resolve a missing file. The font fixture stabilizes metrics but does not make
text rasterization identical across operating systems.

Ship-panel and Light-cycle arena regression snapshots temporarily use the checked-in,
OFL-licensed Atkinson Hyperlegible font fixture. The app continues to use system
fonts. The helper waits for the fixture faces, aligns the region to whole pixels, compares strict image dimensions,
and permits at most 64 differing pixels for the arena. Ship panels explicitly allow
512 pixels (the shared-font Linux run differed by 396, under 0.3% of that region).
Ship legends, all twelve buttons, and selected values are also asserted directly.
It removes
the fixture before the normal and taller-font responsive checks, whose viewport,
clearance, overflow, and touch-target assertions remain strict. Update these two
baselines with the helper active; do not increase tolerances to hide layout changes.

## Control and motion follow-up

The larger Light-cycle arrows and the Spaceship mission-length selector are
covered by desktop, 320×700, 390×844 and 768×1024 production-browser checks.
Light-cycle coverage includes eight long names, taller fonts, intermediate head
and trail positions, paused alignment and reduced-motion grid steps. All three
mission lengths have rules/session coverage; browser tests verify a complete
one-minute win, correct flown time, pause/resume and choosing a new length for
the next launch. Desktop/mobile/tablet screenshots were reviewed.

A fresh live pass for these changes was unavailable: the in-app browser blocked
localhost navigation and native Firefox access remained pending OS Accessibility
and Screen Recording permissions. The earlier live game passes above predate this
follow-up. Physical iPhone/iPad checks of the larger targets and animation feel
remain useful; browser emulation does not establish device performance or latency.

## Sumo Bumpers

Feedback and results checks:

- Dash two paired bumpers into each other. Both devices should show brief contact
  sparks, with one optional soft impact cue per confirmed contact snapshot.
  Gentle resting overlap should not chatter or replay old contacts.
- Ring out one of three players: a colored flare and numbered OUT label appear
  while the remaining two keep playing. The eliminated player cannot steer or
  dash. Feedback expires, including after the round finishes; pause/resume and
  rematches do not replay it. Reduced motion uses static, short-lived feedback.
- Confirm the winner's bumper, full name and local You win verdict; simultaneous
  elimination gets a distinct draw card. Bump Again resets the result and effects
  for both devices. Help retains the full roster and returns keyboard focus.
- Review collision, ring-out, draw and winner snapshots at phone, tablet, desktop,
  landscape and short-phone sizes. Check long names, 320×700, taller fonts and
  a 20px bottom safe area. Result text must remain inside its card, and the arena
  and rematch footer must stay visible without page scrolling.
- The non-deploying codex/sumo-feedback review branch uses
  .github/workflows/sumo-feedback-review.yml. Generate only the new feedback
  states on Ubuntu once, review actual Linux/Darwin pairs, then require a separate
  normal complete verify run for the exact final commit without snapshot updates.
- Live native Chromium QA checked a real paired winner screen, help/roster,
  Escape focus return, Bump Again, the new countdown, pause/resume and a rejected
  stationary dash after the rematch. Deterministic paired tests cover impacts
  and short-lived ring-outs that the native tool cannot reliably stage by hand.
- Physical iPhone/iPad checks remain: installed portrait/landscape result fit,
  spark/flare clarity during fast collisions, sound when enabled, actual two-thumb
  comfort, safe areas, backgrounding and service-worker updates on every device.

Pass two checks:

- Compare ordinary steering with the stronger short dash, release braking and
  small neutral area. Check that the knob remains inside the pad during off-pad
  captured input, including diagonal drags and pointer cancellation.
- Confirm the dash trail on both paired devices, a rejected stationary dash,
  two-thumb input, numeric recharge and its filling light. Reduced motion hides
  trails while preserving charge feedback; optional swoosh remains muted by default.
- Bring both bumpers inward and continue beyond sixty seconds. Final squeeze
  must continue play until ring-outs leave one winner or a simultaneous draw.
  Pause/resume freezes pressure and recharge, with the usual resume countdown.
- Rule/sound tests cover burst distance, bounded speed, braking, dead-zone travel,
  post-minute pressure, terminal validation and the gesture-unlocked swoosh.
  The host draws confirmed physics immediately; clients retain snapshot smoothing.
  The paired Sumo specs retain phone/tablet/desktop/landscape states and add
  confirmed dash and final squeeze snapshots on Darwin and genuine Linux.
  Linux verification uses codex/sumo-controls and
  .github/workflows/sumo-controls-review.yml; its normal workflow compares reviewed
  baselines with read-only permissions, no update flags and no deployment.
- Live native Chromium QA used a real paired production room at phone size and
  checked start, stationary-dash rejection, pause/resume, help/roster readability
  and Escape focus return. The native tool does not support holding a steering
  key while pressing Dash; deterministic paired/two-thumb tests cover that flow.
  A separate Firefox pairing attempt failed ICE locally.
- Physical iPhone/iPad checks remain for thumb comfort, response under Wi-Fi
  latency, optional sound, safe areas, cancellation/backgrounding and PWA updates.
  Update every device: older builds reject Sumo ticks beyond sixty seconds.

Artwork and composition QA:

- Check the dark room chrome, raised arena, tiled floor, cyan playable boundary,
  striped danger zone, numbered bumper bots, and white local-player halo/chevron.
  Decorative shells use the existing collision radius; the boundary uses the
  simulation radius. Confirm the danger zone expands as the ring shrinks.
- Ready screens preview connected players and hide the inactive thumb deck.
  Start requires two players. Countdown, pause and host loss appear on the arena;
  active play clears the overlay. Help contains the full roster and
  names; Escape/Close returns focus to its opener. Finished rounds show the
  arena result card and host rematch control. Controls, dash and arena pressure use the
  pass-two behavior above.
- Review phone/tablet/desktop/landscape snapshots from tests/sumo.spec.ts and the
  two/eight-player Sumo cases in tests/game.spec.ts, with genuine Darwin/Linux
  pairs. Check 320×700 with a 20px bottom safe area, taller fonts, reduced motion,
  long names, square arena bounds and full controls/footer clearance. The old
  portable court snapshot is superseded by platform-specific court snapshots.
- Linux verification runs on the non-deploying codex/sumo-artwork branch with
  .github/workflows/sumo-artwork-review.yml. Its normal workflow has read-only
  permissions and compares committed baselines without update flags. For future
  artwork changes, obtain genuine renders with temporary generation scoped to
  the Sumo specs, review the returned images, then require a separate successful
  normal verify run for the final commit, following AGENTS.md.
- Physical iPhone/iPad checks remain required: installed portrait/landscape fit,
  actual safe areas, readable small bumper numbers, thumb comfort, simultaneous
  movement/dash, and contrast in bright rooms. Use the feedback/results checks above for the final polish pass.

QA inventory:

- Host starts 2–8 players; three-second countdown, numbered/color seats, moving
  collisions, ring-outs, simultaneous draw, shrinking ring, continued final
  squeeze, and fresh rematch. Late arrivals watch, eliminated controls disable.
- 104–120px movement pad (96px in landscape) with capture/release/cancel and a
  92px-wide Dash button. Verify
  simultaneous two-thumb movement/dash, diagonal normalization, braking, recharge,
  lost-input expiry, focus loss, arrows/WASD + Space, and normal surrounding scrolling.
- Pause/resume clears velocity/input and freezes ring/recharge timers; pairing,
  background/stall, game switching, participant/spectator departures and host loss.
- Desktop, 320×700/390×844 phones and 768×1024 tablet; taller font metrics, eight
  long names, viewport clearance, contrast, keyboard focus, no overflow, continuous
  confirmed movement, exact paused/eliminated positions and reduced-motion steps.

Rules/protocol tests cover spawns, normalization, expired input, dash limits,
contact separation/momentum, a successful knock-out, simultaneous ring-outs,
terminal states, continued pressure, a full eight-player simulation and malformed wire state.
Session tests cover actual input sequencing/epochs, permissions, shared movement,
pause/resume, spectators, disconnect cleanup and scheduling stalls. Production
Chromium tests pair two/eight independent WebRTC contexts, exercise physical-style
two-finger touch input, keyboard movement/dash, paused timers, rematch, spectator
controls/departures, background pause, participant loss and host loss. A deterministic
ring snapshot is retained and desktop/mobile/tablet screenshots are reviewed.
Existing production-subpath cache/offline/update checks remain in `npm run verify`.

Physical iPhone/iPad follow-up should check two-thumb steering/dash feel, Wi-Fi
latency, movement clarity, optional sound and Safari/installed-PWA background/resume.
Update all devices before selecting this game. Live coverage and its limits are
recorded above.

## Immersive iPhone/iPad app shell

Inventory: compact Home/name/Create/Join; two phone library pages and full iPad
library; host selection and waiting clients; setup assignments/options; play,
pause/stop, results/rematch; Players/Menu and Help open/close/Escape/focus restore;
paddle sliders/colors in Help; QR scan/image/text fallbacks, cancel and invalid
text; connection loss; update checking and offline startup under the subpath.

The live production-browser pass checked phone QR pairing and invalid text feedback,
cancelled pairing, solo Breakout start/pause, paddle color selection in Help,
Escape/focus restoration, and landscape rotation. Automated tests cover every
game's setup, play, pause and results, with saved phone/tablet/desktop screenshots.
Physical iPhone/iPad checks remain required below.

- Check 320×700 and 390×844 phones, 844×390 landscape, 768×1024 and 1024×768 iPads,
  plus a desktop development viewport. Check long names, four/eight participants,
  spectators, and alternate/taller font metrics.
- Measure primary content and card scroll dimensions, not just body overflow;
  verify courts have nonzero bounds and review saved whole-screen screenshots.
- Keep touch targets at least 44px; steering, thumb pad and Dash must stay together.
  Short landscape setups may omit the preview but must retain every assignment,
  options and Start. QR codes remain at least 240px wide on narrow portrait phones.
- Dialogs contain focus, support Escape, return focus to the opener, and scroll
  internally. Menu and Help preserve the room; Invite Player retains host pause
  behavior. Help keyboard navigation must not steer a game through portal events.
- On real installed iPhones/iPads, verify notch/home-indicator clearance, status
  area contrast, portrait/landscape transitions, iPad split windows, name/text entry
  with the keyboard, larger system text, two-thumb input and VoiceOver navigation.
- Recheck real-camera pairing in both directions, denied access, text/image fallback,
  foreground recovery, offline launch, and user-controlled updates across devices.
  Chromium viewport tests do not certify Safari or installed-PWA behavior.

## Midnight Bakery

Polish QA includes short rule hints, personality motion, the illustrated personal
tray, pair/match progress, +0 jelly explanation, public gains on reveal, persistent
passing destinations, green gremlin reversal/cancellation/keep-hand notices, a
centered last card, and ranked batch/final results. Regression captures cover
setup, untouched/selected hands, a muted reduced-motion reveal, collection,
one-card hands, wide cards, eight-player hands, compact eight-player pair/gremlin
reveals and shared eight-player champions. Exercise
320×568 in addition to the sizes below, keeping all fit/pixel assertions strict.
Sound tests use confirmed model transitions and cover combinations in either
order, cue priority, shared gremlins, spectators, duplicate/delayed snapshots,
first state, pause/resume, rematch and room changes. Physical listening still
needs to check cue distinction, volume and several devices sounding together.
Ask children to point to a pair reward and explain where the remaining hand went;
check the short-phone compact artwork and passing names with real thumbs.

QA inventory:

- Select the ninth game through all three phone library pages; follow host selection.
- Open Bakery with 2–8 players; select by touch or keyboard, preview score gains,
  lock exactly once, wait for every baker, reveal together, and pass remaining hands.
- Cookie/jelly pairs, sprinkle/cake matching, odd gremlin reversals, even gremlin
  cancellation, two-player skipped passes, fresh batch-two hands, carried scores, ties, and Bake Again.
- Pause/resume during choosing and revealing; preserve already locked picks.
  Pairing pauses play; a late arrival spectates and joins the rematch. Participant
  loss resets; host loss disables choices. Reject stale batch/pick/epoch inputs.
- Table & scores and Controls & help open/close with focus containment; instructions
  and scoring breakdowns remain accessible in their scrollable panels.
- Setup, six-card hand, selected card, reveal, and results at 320×700, 390×844,
  844×390, 768×1024 and 1280×720, including taller font metrics and long names.
  Check child bounds as well as page overflow: the hand, preview, lock action and
  counter must never overlap. Review card focus and 44px minimum touch targets.

Automated coverage includes model scoring/passing, full two-batch play, private and
bounded snapshots, malformed state/actions, stale/duplicate picks, paused reveals,
real WebRTC text pairing, two-player completion/rematch, larger rosters, late joins,
and disconnect cleanup. The deterministic hand snapshot uses local vector art.
Saved full-screen evidence covers portrait/landscape play and results.

Physical iPhone/iPad checks remain required: play with both children and parents,
measure an ordinary session against the five-minute target, ask whether +0 jelly
and the pair bonus are understandable, and whether gremlin reversals are fun.
Check installed-PWA safe areas, touch focus, background/resume, updates on every
device, and offline startup/pairing after an online visit. Browser tests cannot
establish real iOS behavior or whether the family enjoys the balance.

Bakery cross-platform regression checks: keep separate reviewed Darwin and Linux
Bakery state baselines with the same strict pixel budgets; text rasterization differs even
with the bundled fixture font. Exercise tied results with long names and taller
Arial metrics at every Bakery viewport. Primary results show compact names and
final scores; Table & scores retains full names and both batch totals. Fit
assertions remain unchanged.

## Treasure Dive

QA inventory:

- Select through the paged picker; Start requires 2–8 players. Three dives, six
  numbered doors, secret preview/lock/confirmation, full shared treasure,
  Return before hazards, shield consumption on both card types, caught/boat
  waiting, untimed locked waiting, sixth-door auto-bank, automatic summaries and ties.
- Pause/Resume in countdown, choices, reveal and summary preserves state and
  remaining time. Reorientation pauses can repeat without losing the saved phase.
  Stop returns to setup; rematch resets scores/epoch/deck; switching retains pairing.
- Standings and Help open/close/Escape/focus restore; full names and dive-score
  breakdowns remain in scrollable dialogs. Keyboard Tab/Enter and tap controls.
- Ready, choosing, lock, reveal, boat, summary, and results at 320×700, 390×844,
  320×568, 844×390, 768×1024, and 1280×720. Eight long names, taller serif metrics, reduced
  motion, 44px targets, region bounds, readable contrast and no primary overflow.
- Host background/stall pauses; clients retain unconfirmed choices; stale/duplicate
  epoch/dive/door actions are rejected. Late arrivals spectate and join the next
  match; spectator departures preserve play, participant loss resets, host loss
  disables input. Timer disposal and game switching stop all game timers.
- Verify production `/multiplayer-test/` assets, refresh, manifest/icons, cached
  offline startup, persistence and user-controlled updates with the existing PWA suite.

Automated coverage includes scoring/odds, Return-before-hazard, protected and
unprotected outcomes, shields spent on treasure, sixth-door banking, untimed
waiting and animation overshoot, ties, paused phases, private views,
stale/duplicate inputs, disposal, and complete maximal eight-player messages
(including escaped names/IDs). Real WebRTC tests complete a seeded match, test
rematch/switching, eight long names, spectators, disconnects and background pause.
Ready/active/selected, treasure, bank, protected, caught, sixth-door auto-bank,
final and eight-player tied-result regression snapshots use the bundled font
fixture and separate reviewed Darwin/Linux baselines. Keep the 180-pixel budget
and strict dimensions. The outcome tests use actual paired players and seeded
decks; caught feedback checks a previously banked total stays safe. Audio unit
tests cover all outcome cues, shield spent on treasure, sixth-door protection,
duplicate/late snapshots, pause/reorientation, old boat outcomes and epoch changes.
Saved screen checks include taller metrics and pending-update notices; their fit
and touch-target assertions remain strict.

Physical device checks for the expedition polish: installed iPhone/iPad safe
areas, rotation and thumb accuracy; explain bank versus haul and shield spending
from the screen alone; listen to treasure/bank/protection/catch cues with several
devices, then play muted and reduced motion. Verify Safari gesture audio unlock,
background recovery and no replay of old outcomes. Desktop Chromium emulation
cannot establish these physical-device behaviors.

The live production preview paired two players, confirmed a secret shield lock,
paused/resumed without losing it, revealed shared treasure, and Returned to bank
the haul before another draw. Phone and desktop screenshots were inspected;
manual Help/Standings, keyboard and responsive follow-up checks complement the
deterministic suite. The existing production-subpath offline/update tests remain
in the complete verification command.

Physical iPhone/iPad follow-up: pair on household Wi-Fi, play all three dives in
Safari and installed PWAs, check safe areas, readable risk/haul/shield feedback,
touch selection/lock, background/resume, and updates across devices. Ask whether
the shield creates an interesting decision and the short boat wait stays fun.
Browser emulation cannot establish real iOS lifecycle or family balance.

## Meteor Minigolf

Inventory for 2–8 players on desktop, iPad, and narrow iPhones:

- Find Golf through More games. Start requires two players. Update every device
  first; an old build should give the existing unsupported-game/update message.
- Preview each of the five greens with all walls, mushrooms, cup rings, and meteor
  warnings visible. Check your numbered ball, total, phase feedback, and wind direction.
- Inspect the cosmic-garden artwork on small phones: subtle grass and stars must
  stay behind the ball, aim arrow, cup and obstacles. Stone walls retain rectangular
  collision faces and mushrooms retain circular caps. The meteor's dashed warning
  remains radius 90 before and after impact; its crater is decoration, not an obstacle.
  Check the cup rim, golden flag, player colors/numbers and contact shadows in bright
  room light. Textures imply no rough, slopes or new surface rules.
- Enter aiming: a suggested direction is visible and Ready accepts it without a
  slider adjustment. Inspect the numbered ball outline and grab it just outside
  the small artwork. Drag from the ball toward travel, release a short or long drag, then adjust it.
  Cancel a drag or lose focus: the previous aim should return. The arrow previews
  direction, not a complete trajectory. Angle/Power work with touch and arrow keys.
  Compare equal drag distances on phone, tablet and desktop: 120 CSS pixels from
  the tee means 100% on each. Ready stays disabled while dragging. Check the meter
  at 0%, gentle, medium and 100%, including keyboard steps and visible focus. Zero
  power blocks Ready, and changing power never changes the direction-guide length.
  At short portrait heights use Adjust aim; close the dialog before Ready.
- Turn between a tall phone, short phone, landscape and tablet. The course should
  turn upright only when it becomes larger and stays readable. The cup's flagpole
  stays upright with its flag pointing right in both orientations. Tee numbers, cup
  points, meteor labels and result points stay upright. Angle and wind directions
  follow the screen; a saved draft or locked shot must retain its world direction
  and power. Resize during a drag: restore the previous draft instead of committing
  an accidental shot. Check the complete green against its frame and controls.
- Tap Ready, see Shot locked after host confirmation, and try to change it. Others'
  shots and actual gust/impact timing remain hidden until launch. Leave one player
  without a shot for at least a minute: everyone stays in aiming with no score
  loss. Confirm that last shot and verify immediate shared launch.
- Check gentle 10% and 25% shots in still air, the suggested 60% Open green shot,
  and a strong Bank shot using the top rail. Low power should permit small changes
  near the cup; strong shots can reach a bank. Repeat all five greens under still
  air and both gust strengths; shots must settle consistently on both devices.
- With normal motion, watch both devices' rolling balls and subtle seams. Movement
  should stay continuous between confirmed snapshots, rebound at the collision
  face, and never coast beyond the host position. Pause mid-roll: positions snap
  exactly and effects clear. Resume must not repeat the launch or previous hits.
  Capture and final results use the host's exact position. Interrupt connectivity
  or background a device; long gaps must snap without replaying stale contacts.
- Inspect the launch pulse, rail/stone contact flash, mushroom squash/rebound and
  outward pulse, and meteor burst. They must stay brief, bounded and behind readable
  ball numbers; simultaneous hits at one spot share a pulse. Check eight golfers.
  With reduced motion, positions are exact and contacts use static highlights;
  mushroom caps stay their normal shape. Changing the preference during play works.
- Sound starts muted. Turn it on with a tap: hear a putter tap, soft wall knock,
  rising mushroom spring and low meteor thump. Mute again during play. No cue should
  replay on duplicate snapshots, pause/resume, rematch, game switch or late arrival.
  Check iOS volume and speaker audibility in a real family session; visuals must
  remain sufficient while muted.
- Watch boundary/wall bounces, mushroom boosts, and the shared meteor. Balls never
  collide with one another; the host awards cup or distance points. Results overlay
  each hole's points; Standings shows all five scores and full names. Ties share wins.
- Confirm slow cup entry shrinks the ball into the rim once, with a brief sparkle
  and optional plop/chime. Fast pass-through must stay visible and earn distance
  points. Read the large +100 or near-cup reward while the three-second hole
  sequence continues. Pause during a drop; resume, background, late arrival and
  duplicate states must not replay it. Reduced motion uses an immediate drop and
  static highlight. Eight simultaneous captures share one sparkle and sound.
- At match end, final rankings replace the green. Check a single winner, tied
  leaders, tied lower ranks, a spectator and eight long names. Every full name,
  total and H1–H5 score stays available without opening Standings. Scroll the
  ranking region with touch or keyboard on short screens/large text; Play Again
  stays visible. Results persist until a rematch, which restores the course.
- Pause/Resume during aiming and rolling, open pairing, and background the host.
  Preserve locks, remaining time, balls, and the current random conditions. Resume
  adds a countdown. Backgrounding only a client must not stall everyone.
- Join mid-match to watch. Losing a spectator preserves play; losing a participant
  resets setup. Rematch includes the current roster and zeroes scores. Stop and
  switch to Shared Lights without pairing again. Leaving the host ends the room.
- Inspect 320×568, 320×700, 390×844, 844×390, 768×1024, and 1280×720 with long names,
  eight golfers, taller font metrics, and reduced motion. Keep the full green,
  essential controls and results on-screen, with 44px buttons and no overlapping
  footer. Help, Standings and Adjust shot retain scrolling, Escape and focus return.

Regression coverage lives in `src/games/minigolf.test.ts`, the Golf session tests,
and `tests/minigolf.spec.ts`. It covers fixed-step scheduling, cup speed thresholds,
bounce components and separation, cooldowns, shared/exact-center meteor effects,
identical outcomes, calibrated still-air shots and every wind direction at 0/12/24,
zero-power rejection, long untimed waits, natural settling, five-hole totals, privacy, bounded eight-player
messages, permissions, stale/duplicate input, pause/resume, disconnects, and timer
cleanup. Browser flows use real WebRTC pairing, drag/keyboard/touch controls,
short-screen adjustments, a deterministic five-hole match, rematch and game switch,
late spectators, host backgrounding, and retained ready/active/result screenshots.
Golf's ready, active and results snapshots use separate reviewed Darwin/Linux
baselines, the bundled font fixture, strict dimensions and a 180-pixel budget.
Course snapshots also cover Bank shot, Mushrooms, Meteor and Mixed course on
portrait phones, Mixed course on desktop, and the post-impact meteor crater.
Short-phone and portrait-tablet snapshots retain the complete course/control frame.
Browser assertions cover orientation changes, screen-relative wind and angles,
preserved drafts, upright text, generous grab targets and enlarged phone course bounds.
Additional paired baselines cover zero power, strong power and the short-phone aim dialog.
`src/games/golf-motion.test.ts` checks real-physics contact detection, rebound paths,
mutable-host copies and stale/pause/gap suppression. Audio tests check distinct,
deduplicated contact cues and the shared mute/voice limit. `tests/minigolf-motion.spec.ts`
pairs actual devices for normal and reduced motion, verifies interpolation and exact
paused/final positions, exercises all contact types, and retains ten paired impact
and rolling snapshots. These captures freeze known moments in actual shots.
`tests/minigolf-results.spec.ts` pairs a perfect five-hole scorer with a lower
scorer in normal/reduced motion and verifies capture, near-cup points, pause
suppression, persistent rankings and rematch. Five additional paired baselines
show the cup drop, static cup highlight, near-cup card and phone/desktop winner.
The existing eight-player flow adds a shared-winners baseline with long names;
`src/components/GolfResults.test.ts` covers totals and competition ranks.
Follow the screenshot portability workflow above when adding or updating them.
The complete verification command also checks manifest/icons, repository-subpath
startup and caching, offline reload, identity/sound persistence and controlled updates.

Live browser QA paired two current production-preview devices and exercised drag
preview, slider/keyboard adjustment, authoritative Ready locks, pause/resume and
manual app updates. Screenshot reviews complement the strict automated viewport
and touch-target checks. A final development-preview pass at 320×568 exercised
Adjust aim, keyboard edits, Escape dismissal, Ready lock and pause. These checks
use desktop Chromium; they do not establish physical-device behavior.

The cup/results production-preview pass paired independent players, played all
five greens with actual dragging and Ready controls, paused/resumed a meteor shot,
and reviewed matching final totals/breakdowns on phone and tablet layouts. It also
checked a short-phone results screen, Standings/Help with Escape, mute/unmute,
and rematch restoring the course on both devices. Physical iPhone/iPad dragging,
visibility under thumbs, speaker audibility and background/resume still require
a family device playtest.

The adaptive layout was also exercised in a persistent paired browser room: an
upward portrait drag, a saved draft after switching to a short phone, keyboard
power edits, Ready locking, pause/resume, shared launch, Standings and Help.
Phone, short-landscape and tablet views were inspected. Automated current-version
pairing complements a live updated-host/older-client pass; the layout adds no
network fields. Physical iOS rotation and pointer-capture behavior remain open.

Physical iPhone/iPad follow-up: play all five holes on household Wi-Fi in Safari
and installed PWAs. Check real touch dragging/cancellation, safe areas and rotation,
Adjust aim with larger text, app background/resume, cached startup and updates.
Family play should tune drag sensitivity and course balance; the
five-minute preference is a pacing goal, not an exact match-time requirement.

## Patchwork Picnic

QA inventory:

- Task 3 score forecast: compare cell/matching-edge/row points with the actual
  reveal, with projected bonus changes kept separate until the finale. Check
  normalized rotated offer pictures, new-edge markers, row celebration, invalid
  crosses and Reset. On short screens keep forecast and explicit Place/Skip together
  while the Arrange panel scrolls. Main results show winner/shared winners, your
  tied rank and total; Standings has larger blanket comparisons.
- Listen to placement versus completed-row cues, including a delayed snapshot,
  repeated snapshots, Skip, spectators, pause/reorient/resume, rematch and switching.
  Sounds remain muted by default. Verify the same feedback without sound/motion.
- Find the game on the paged picker; Start requires two players. Select one of the
  shared shapes, preview an anchor, Rotate, Reset, Place and Skip. Try blocked,
  off-board and crowded previews. Confirm exactly one lock and a simultaneous reveal.
- Play ten rounds with explicit Place/Skip, late single squares, completed rows,
  food-edge scoring and a separately added shared bonus. Standings shows every
  blanket and a readable cells/edges/rows/bonus breakdown. Ties share the win.
- Check keyboard Tab/Enter, arrows and R, touch targets, colored food symbols,
  bonus outlines, invalid outlines and focus. Short screens use Arrange piece;
  its native dialog scrolls, contains focus, closes with Escape and restores focus.
- Check 320×568, 320×700, 390×844, 844×390, 768×1024 and 1280×720. Include taller
  serif metrics, reduced motion, eight long names, waiting and results. Primary
  content must fit; placement squares and essential buttons remain at least 44px.
- Pause/Resume preserves offers, boards, locks and remaining active time, including
  repeated reorientation pauses. Pairing/background/stalls pause; clients retain unconfirmed choices.
  Late arrivals spectate, spectator loss preserves play, participant loss resets,
  host loss disables controls. Rematch and game switching retain normal lifecycle cleanup.
- Run the existing production-subpath manifest/icons/offline/update/storage checks.
  On real iPhones/iPads, check installation, safe areas, touch accuracy, rotation,
  larger text, foreground recovery and household-Wi-Fi pairing. Ask the family whether
  waiting feedback is clear and whether matching edges and the shared bonus are clear.

Rules tests cover every rotation, bounds/overlap, one-time edge/row/bonus scoring,
shuffled bags, forced singles, seeded ten-piece play, crowded rotated fits and Skip,
untimed waiting/overshoot, frozen pauses, ties and maximal eight-player wire messages.
Session tests cover host permissions, privacy, epochs/sequences, duplicate locks,
pause/resume, late arrivals, departures, stalls, rematches and timer disposal.
The production-browser suite pairs real WebRTC contexts and covers private preview,
lock, pause/resume, untimed waiting, simultaneous reveal, rematch, switching and
spectators. A deterministic ten-round packing flow checks every forecast against
host score gains, separately accumulated bonuses, row completion and final totals.
The eight-player tie fixes the shared bonus before capture and uses long names.
Ten Darwin/Linux screenshot pairs cover setup, placement, short-phone Arrange,
matching edges, row reveal, sparse/packed finales and blanket comparisons. All
actual platform images were visually reviewed; strict dimensions, the bundled font
fixture and the 180-pixel comparison budget remain unchanged.

Task 3 complete local `npm run verify` passed: formatting, 203 unit/session tests,
four script tests, production build, 61 Playwright tests and baseline-pair checking.
Production-subpath manifest/icons, cached offline startup, identity/sound persistence
and user-controlled updates are covered by the shared browser suite. Genuine Ubuntu
renders are returned by the non-deploying Picnic review workflow; its final phase
runs normal verification with read-only permissions and no snapshot updates.

The Task 3 persistent browser pass remains incomplete while the Mac is locked:
manual pairing and setup were reached, but the app reload and subsequent interaction
checks could not be completed. Complete live preview/Rotate/Reset/Place/Skip,
row reveal, finale/Standings/Escape and short-screen scrolling after unlocking.
Physical iPhone/iPad installation, safe areas, real-thumb edge/corner accuracy,
rotation, Safari sound unlock/recovery and household multi-device listening still
need the device pass. No timing, scoring rules or network fields changed.

## Light Seek

Task 7 polish QA inventory:

- Primary layout targets: 402×874 and 440×956 phones; 1180×820 M1 iPad Air and
  1080×810 ninth-generation iPad in landscape. Phone rotation and the existing
  small-screen/desktop/alternate-font matrix remain regression coverage.
- Five miniature tiled pieces match board geometry. Setup buttons show selection,
  rotation and placement checks. The play collection is noninteractive and lights
  up only for complete discoveries; an ordinary hit never changes a miniature.
- Tap/slide correction, gesture cancellation and off-board release never submit.
  Coordinate status and Illuminate agree; the last confirmed outcome remains
  visible while selecting. Edge and overlap errors differ; invalid moves preserve
  committed pieces. Already-searched cells disable confirmation.
- Spectators follow the latest public search on its correctly labeled target board,
  including hit/miss alternation and whole-piece discoveries without secret layouts.
- Results show owner labels, found counts, gold hit dots and dim remaining tiles.
  Phone board switches preserve readable boards and accessible winner/replay.
  The completed screen retires the active tray and last-turn controls.
- Local valid placement, accepted Ready, local turn and prioritized finish audio
  retain muted defaults and deduplication across lifecycle/view/epoch changes.

Existing rules and lifecycle inventory:

- Exactly two connected players can Start. Select each shape, tap an anchor,
  preview, rotate, place and edit placed pieces. Try overlap, off-board placement,
  incomplete Ready, untimed waiting and authoritative Ready confirmation. Both
  layouts lock before the countdown; the first-player draw happens once.
- Select and confirm a search, including keyboard arrows/Enter and touch. Alternate
  after misses, hits and discoveries; reject repeats, stale turns and out-of-turn
  actions without consuming a turn. Ordinary hits show occupancy only; found
  pieces reveal their whole color/symbol outline even when adjacent.
- Find all five for immediate victory with no reply turn. Review both full boards,
  My board/incoming guesses, Help/Escape/focus return, fresh rematch and switching
  games without reconnecting. Optional miss/hit/found sounds follow the existing
  saved mute preference and gesture unlock; completing hits play only found, and
  repeated snapshots/view reopening never replay effects.
- Pause/Resume preserves layout, readiness, searches and turn, including repeated
  reorientation pauses. Pairing/background/stalls pause active countdowns. Late
  arrivals see only public boards and can leave without changing the match;
  participant loss resets setup, host loss disables controls, and disposal clears
  timers. More than two connected players prevents starting a fresh match.
- Check 320×568, 320×700, 390×844, 844×390, 768×1024 and 1280×720, taller serif
  metrics, reduced motion, eight long names, waiting and results. Primary content
  must fit with clearance. The full 10×10 board is directly tappable, with no
  region selector or selection dialog. Full-board cells are intentionally compact
  (at least 20px in these viewports); action buttons and setup piece buttons retain
  44px targets. Verify all 100 cells, highlighted selection, colored previews,
  invalid edge/overlap outlines and explicit confirmation. Tap adjacent cells
  and check their displayed coordinates before confirming. Keyboard movement
  stays at edges and crosses the former 5×5 boundaries without wrapping.
  Short landscape puts controls beside the board. Check scrolling only in
  secondary dialogs, contrast, coordinate labels and
  adjacent revealed shapes. Results show both complete boards.

Rules/session/protocol tests cover rotations and invariant square/plus shapes,
19 touching tiles, illegal/incomplete layouts, one-time locks, random draw bounds,
untimed phases, all results, immediate victory, turn/epoch/sequence rejection,
private host/client/spectator views, paused state, fresh matches, disconnects,
countdown stalls, disposal and maximum escaped eight-device messages. Sound tests
cover one event/one cue, found replacing hit, and no replay on view/epoch changes.
The real WebRTC browser flows cover manual setup through a seeded complete match,
eight connected devices/spectators, lifecycle and game switching. Retain separate
setup, invalid edge, active, selected phone cell, landscape iPad, found-piece and
results baselines on Darwin/Linux using the bundled
font fixture, strict dimensions and the unchanged 180-pixel budget.

Live browser QA pairs two production-preview players and covers direct placement,
rotation/editing, invalid previews, keyboard movement, Help/My board and Escape,
Ready/waiting, confirmed hits and pause/resume. Review the saved desktop, phone
and tablet screenshots alongside automated fit checks, including the selected
coordinate before Illuminate. The four Darwin baselines are reviewed for setup,
active play, a found piece and results.

Physical iPhone/iPad follow-up: play a complete match on household Wi-Fi in Safari
and installed PWAs. Check accurate full-grid selection with real thumbs, larger text, safe areas,
rotation, VoiceOver, sound unlock/volume, background/resume and offline startup
with updated apps on both devices. Existing production-subpath PWA/cache/update
checks remain in the full verification command. Browser emulation does not verify
physical iOS/iPadOS behavior.

The previous Light Seek layout’s four Linux baselines and refreshed library pagination baseline were
rendered by [the review-branch Linux run](https://github.com/ehofmei/multiplayer-test/actions/runs/37350302052)
and returned in commit `cb82f94`. Every image was visually reviewed alongside its
Darwin counterpart. No cross-OS copying or tolerance changes were used. The
review-only workflow runs on `codex/light-seek`, obtains missing Linux renders
once, returns them to that branch, and runs full verification without deploying
Pages. Subsequent pushes compare the committed baselines normally.

### Light Seek full-board verification

On short Light Seek screens, pending-update feedback stays in Menu (including
the indicator dot) so the notice does not shrink the grid.

All four full-board Darwin/Linux states were visually reviewed. Genuine Ubuntu
renders came from
[the family-playtest review run](https://github.com/ehofmei/multiplayer-test/actions/runs/37865516178)
and returned in `dbbdcf8`; the bundled font, strict dimensions and 180-pixel
budget remain unchanged. The non-deploying family-playtest workflow compares
committed images with snapshot updates disabled. Real iPhone/iPad thumb accuracy
remains an acceptance check.

### Task 7 polish evidence

The persistent production-preview pass used matching build
`20261012T183658Z · local` at QA.md's stable origin and its independent localhost
client origin. Normal controls covered manual pairing, all five placements,
rotation, keyboard correction, invalid corner/overlap edits, Ready waiting,
Help/My board and Escape, paused setup, play pause/resume, repeated-cell rejection,
ordinary-hit privacy, discoveries, complete host and client victories, phone
board switching, dim remaining tiles, replay and Stop. Reviewed phone screens at
402×874/440×956, landscape tablets at 1180×820/1080×810 and the desktop host.
The final live pass found no clipping or page scrolling on those household sizes.

The focused Seek suite compares seven deterministic states: setup, invalid edge,
active, selected phone cell, landscape iPad, discovery and results. Every Darwin
and Linux image was visually reviewed. Genuine Ubuntu images came from
[the scoped review run](https://github.com/ehofmei/multiplayer-test/actions/runs/38293301198)
for `2aed986`, downloaded through the read-only baseline artifact route. No
cross-platform copying, relaxed fit assertions or pixel-budget increases were
used. The 180-pixel budget and bundled font fixture remain intact.

A three-device persistent follow-up on `20261012T192038Z · local` verified the
spectator correction: hit/miss alternation and a complete discovery switch to the
correct receiving board, with its owner label and matching collection. The
primary host/client origins stayed on 4174; a dedicated 4175 preview provided an
independent spectator identity. Reviewed the landscape spectator screenshot and
phone viewport bounds; automated saved phone/font screenshots cover the long-name
spectator states.

Touch correction/cancellation/off-board release and a complete touch-only setup
use their own mobile context. Keep low-level touch streams separate from the
mouse/keyboard journey: mixed streams in desktop emulation produced pointer
and touch events without a compatibility click on Ubuntu. The isolated mobile
flow and ordinary Ready taps passed there. Layout assertions measure all targets
in one browser call without reducing viewport, target-size or clearance coverage.

Focused checks passed: `npm run check:fast`, Seek/audio unit tests,
`npm run test:game -- seek` with snapshot updates disabled, and
`npm run test:e2e -- tests/app-layout.spec.ts tests/updates.spec.ts` (8 tests).
Complete local `npm run verify` passed with 210 unit tests, 10 script tests and
66 browser tests. Ordinary exact-final
[Ubuntu verification](https://github.com/ehofmei/multiplayer-test/actions/runs/38297978937)
passed for `b3988b8e009268bc8df1cef3c875b1392ad79cd6`, with snapshot updates
disabled. Generation alone was not used as the final gate.

Physical acceptance remains on the household devices: real-thumb corners/edges,
installed-PWA safe areas, larger text/VoiceOver, rotation, audio listening/unlock,
Wi-Fi play, background recovery and offline startup with updated apps on both
players. Desktop Chromium touch emulation does not certify Safari/iPadOS behavior.

## Glow Clash

QA inventory:

- Find Glow Clash through the paged library; Start requires 3–8 players. Verify
  5/8/12 rounds, random unique colors, taken-color owner labels, changing colors,
  conflicting claims retaining the old color, and frozen setup settings at Start.
  Swatches have no visible color names; accessible names and owner details remain.
- Toggle three distinct tiles, reject a fourth until deselection, Clear, Lock
  picks, authoritative confirmation, untimed waiting and Players & scores
  readiness. Before reveal, other devices and spectators see no picks or counts.
- After the last lock (including on that player’s device), show Everyone’s locked
  in for 1.5 seconds; keep all other picks and current-round scores private.
  Pause/background/pairing during this beat and resume the exact remaining time.
- Reveal mixed unique/colliding cells together, independently score 0–3 points,
  inspect every selecting player, check one broad diagonal band per color (all eight),
  six-second automatic advancement after the beat, clear +0–3 gains, cumulative
  scores, and outlines on your three picks (including collisions).
  Round-score strips use unnumbered color swatches and separated columns; names
  and scores stay readable with eight players, including long names. Setup and
  detailed views retain player numbers; final rankings retain placement numbers.
- Final ranking is the main screen: explicit winner/shared winners, tied ranks,
  readable totals and You row. Inspect board preserves final picks without lock
  controls; standings retain per-round breakdowns. Clash Again resets scores; Back
  to setup retains colors. Results persist until the host chooses either action.
  Check one brief celebratory glow, reduced motion, optional lock/point/result
  sounds and no sound replay on resume or reopening panels.
- Tab/arrows/Space/Enter, focus visibility, Help/score/tile dialogs, Escape and
  restored focus. Check 320×568, 320×700, 390×844, 844×390, 768×1024 and 1280×720,
  including eight long names, taller serif metrics and reduced motion. Portrait
  tiles retain 44px targets. Short landscape uses a preview plus Pick tiles /
  Inspect board; the dialog has the full four-column board with 44px cells.
- Pause/resume preserves secret locks and reveal time; repeating reorientation
  pauses does not replace the saved phase. Pairing/background/stalls pause the
  host; backgrounding a client cannot stall the host timer. Spectators preserve
  board dimensions and cannot claim colors or pick. Participant loss resets to
  setup, releasing the departed color; spectator loss preserves play. Stop,
  rematch, switching without pairing again, host loss and disposal stop timers.
- Reuse the complete production-subpath manifest/icons/offline/update/identity/
  sound-persistence suite. Update every device before playing.

Rules and session tests cover all six board sizes, exact/distinct pick validation,
all round options, zero/one/two/eight claimants, mixed gains, arrival-order
independence, duplicate scoring prevention, untimed selection, shared ties,
random color boundaries/conflicts, retained assignments, private host/client/
spectator snapshots, maximal escaped eight-player envelopes, invalid inputs,
epochs/sequences, pauses, long stalls, rematches, disconnects and disposal.
Real WebRTC browser flows complete five-round three- and eight-player matches,
exercise touch and keyboard input, setup colors, pause/resume, tile detail,
standings, rematch, game switching, late spectators and background pauses.

Retain separate genuine Darwin/Linux setup, secret-selection, mixed-reveal,
eight-color collision and final-result snapshots using the bundled font fixture,
strict dimensions and the unchanged 180-pixel budget. The genuine Linux images
were generated by [the review-branch run](https://github.com/ehofmei/multiplayer-test/actions/runs/37365548468)
and returned in commit `28b1c4b`. Every image was visually reviewed alongside its
Darwin counterpart. No cross-OS copying or tolerance changes were used. The
non-deploying `codex/glow-clash` workflow now compares committed baselines with
snapshot updates disabled and read-only repository access. Require a normal
full Ubuntu verification for the exact final commit before merging.

Live production-preview QA paired three independent players through text invites,
changed their colors, and exercised mouse/keyboard selection, rejecting a fourth
pick, Clear, private locks, paused locks, resume countdown, mixed 2/1/1 scoring,
tile details, Escape/focus restoration, standings, Help, automatic next round,
and Stop retaining colors. Review the live preview and saved desktop/phone/tablet
images separately from physical-device behavior.

Verification includes formatting, 157 Vitest tests, four script tests, the
production build, all 43 Playwright tests and `check:snapshots`. Both platform
baseline sets and representative desktop/phone/tablet renders were visually
reviewed. The live paired pass covered the game rules; the final cosmetic
revision was checked with production-browser regression flows and screenshots
after live preview controls stalled during an update.

Physical iPhone/iPad follow-up: play with three and eight family members over
household Wi-Fi in Safari and installed PWAs. Check all twelve color names,
numbered identity, readable eight-color stripes, comfortable untimed choosing,
zero-point frustration, touch accuracy, 44px selection, safe areas, larger text,
rotation, VoiceOver, background/resume, installation, cached startup and updates.
Browser checks cannot establish real iOS lifecycle or family enjoyment/balance.

Glow rewards coverage adds the 1.5-second private settling beat, +0/+2 gains,
own-pick collision outlines, main-screen single/shared winners and ranked totals,
board inspection, setup exit and rematch. Automated layout checks include all
eight long names at the existing desktop, phone and tablet sizes with taller font
metrics; the ranking rows and all totals fit without scrolling. Full names remain
in accessible text and Players & scores when narrow rows use ellipses.

The genuine Linux settling, mixed reveal, eight-color collision, single-winner
and eight-way shared-winner renders came from the [Glow rewards review run](https://github.com/ehofmei/multiplayer-test/actions/runs/37786469451)
and returned in commit `12d53f2`. Every new/changed Darwin and Linux baseline was
visually reviewed; the bundled font fixture, dimensions and 180-pixel budget were
preserved. `glow-rewards-review.yml` now runs ordinary full verification on
`codex/glow-rewards`, with read-only access, no generation flags and no deployment.

The compact score strip has a 12px column gap and small unnumbered color swatches.
Its refreshed mixed-reveal and eight-color baselines were visually reviewed on
Darwin and genuine Ubuntu, returned in commit `f0fe200` by the [score-strip review run](https://github.com/ehofmei/multiplayer-test/actions/runs/37793703020).
The live three-player production-preview pass checked mixed 2/1/1 totals,
phone and desktop layouts, retained numbered identities in Players & scores,
and Escape/focus restoration. Existing six-size layout checks retain strict fit
assertions, eight long names and taller font metrics. Physical iOS/VoiceOver
checks remain part of the device follow-up above.

Live production-preview QA paired three independent current-build players through
text invites. It exercised keyboard selection, fourth-pick rejection, private
locks, host-last and client-last settling feedback, mixed/zero scoring, retained
collision outlines, tile details, Escape, standings, pause/resume, automatic
round advancement and a five-round shared win. Desktop screenshots and live
390px layout measurements complement the saved phone/tablet screenshots; they
cannot establish real iOS touch or installed-PWA behavior.

Physical follow-up for rewards: installed-PWA safe areas, thumb selection,
VoiceOver score announcements, optional sound/volume, backgrounding during the
settling beat, rotation, offline startup and updating every paired device together.
Tune the 1.5-second beat with the next family play session.

## Untimed decision regression inventory

- Minigolf: leave one Ready pending past the former 20-second limit, inspect
  private shots and named readiness in Standings, pause/resume twice, then Ready
  to launch immediately. Watch natural settling in all five courses and winds,
  including a shot still moving after ten seconds and a pending meteor near a
  resting ball. Scores appear only after every ball finishes.
- Treasure: leave Explore/Return/Shield pending past eight seconds; no banking,
  hazard draw, score change or shield use occurs. Locked players see waiting.
  Pause/resume preserves the deck and locks; all explorers confirm to reveal.
  Boat/caught players do not block the next door. Complete three explicit dives.
- Picnic: retain a local preview and a different player's lock past fifteen
  seconds. No automatic Skip or board/score change occurs. Rotate, Reset, Place,
  explicit Skip, compact Arrange panel, keyboard confirmation and crowded boards
  remain usable. Complete ten rounds with explicit actions.
- For all three: check named Choosing/Locked feedback in Standings, muted visuals,
  optional confirmation/scoring/result sound without replay on repeated snapshots
  or resume, reduced motion, Stop/rematch/switch, stale inputs, spectators,
  host background/stalls, host loss and participant-disconnect reset.
- Review ready/active/results at 320×568 or 320×700, 390×844, 844×390,
  768×1024 and 1280×720, with taller fonts, eight long names, keyboard focus,
  44px controls, readable contrast and primary viewport clearance. Retain the
  existing production-subpath offline/cache/update/persistence checks.

Update every physical iPhone/iPad first, then play all three games on household
Wi-Fi in Safari and installed PWAs. Leave a device choosing for several minutes,
background it, resume it, and disconnect it while others are locked. Check touch
accuracy, safe areas, rotation, larger text, VoiceOver and sound unlock/volume.
These physical-device checks and family tuning remain manual.

The decision revision's complete local `npm run verify` covers 159 Vitest tests,
four script tests, the production build, all 43 Playwright tests and paired
snapshot presence. Real WebRTC browser flows wait a simulated minute with
unconfirmed choices, complete explicit matches, and retain strict viewport,
font, touch-target, cache and lifecycle checks. Live production-preview QA pairs
two independent players and checks named waiting, keyboard confirmation, private
locks, pause/resume, Golf launch/cup scoring, Treasure shields/Return, Picnic
invalid previews/rotation/Reset/Place/Skip, standings/Escape and game switching.
Saved desktop, phone and tablet renders complement the live desktop pass.

Four changed Darwin baselines and the four genuine Ubuntu counterparts returned
by [the decision review run](https://github.com/ehofmei/multiplayer-test/actions/runs/37633921310)
in commit `200a2dc` were visually reviewed. Existing image dimensions, bundled
fonts, fit assertions and pixel budgets remain unchanged. The review workflow
now uses read-only repository access and ordinary `npm run verify`, with
snapshot updates disabled; require its success for the exact final commit.

## Regular Pong escalating bumpers

QA inventory: manual two-device pairing; keyboard, touch court and help slider;
warning → solid → impact; four-bumper rally; pause/resume and background;
point reset and participant disconnect; desktop/phone/tablet/landscape fit,
taller fonts, visible focus, reduced motion and muted-by-default sound.

Automated coverage:

- Fixed 120 Hz rule tests cover gradual warnings at 8/14/20/26 seconds, ball
  clearance before placement/solidity, circular head-on/vertical/grazing hits,
  non-colliding passes, separating contacts, escape from near-vertical orbits,
  capped speeds, frozen timers and
  point/victory resets. A full-minute simulated rally reaches four bumpers and
  repeated impacts while every snapshot stays valid.
- Session tests pair host/client, share warnings and flashes, preserve timers
  through pause and resume countdown, and clear bumpers on points/disconnects.
  Wire parsing rejects malformed, overlapping, oversized and out-of-range bumper
  state; optional fields allow reading an older host.
- `tests/pong.spec.ts` uses genuine text pairing and ordinary pointer/keyboard/touch
  controls to sustain a rally. It covers warning, solidity, shared impacts, four
  bumpers, pause/resume, real scoring resets, host background and participant loss.
  Layout checks exercise 320×568, 320×700, 390×844, 844×390, 768×1024 and 1280×720
  with system/taller serif fonts. New warning, impact and four-bumper phone/desktop
  baselines must be reviewed on both Darwin and Linux.
- The production `/multiplayer-test/` build and existing PWA/update/offline tests
  run in complete verification. The review workflow has no deployment job.

Local live QA used the persistent in-app browser with two separate origins for
player identities and genuine text pairing. Ordinary pointer input sustained a
four-bumper rally with an impact; controlled host timing checked warning freeze
and resume. Client keyboard input, the help slider, Escape/focus return, a real
match finish and rematch were exercised. Desktop and phone layouts were inspected
alongside the saved Playwright screenshots; physical iOS behavior remains open.

Physical iPhone/iPad checks still required:

- Update every device, install/start the PWA on household Wi-Fi, and try each
  device as host. Check thumb comfort, paddle response, readability of dashed
  warning rings and solid bumpers, safe areas, rotation and large text.
- Sustain a rally past 30 seconds. Check that up to four bumpers add enjoyable
  chaos, retain reaction space, never become solid on the ball and flash on hits.
  Tune the initial 8-second delay, 6-second spacing and central placement after
  another family play session.
- Pause while a bumper warns or flashes; background/foreground the host and a
  client. Resume should preserve the rally and bumper timers after the short
  countdown. Score several points and rematch; bumpers should always reset.
- Start muted, enable sound by a tap, compare bumper/paddle/wall/point/result cues,
  mute again and enable Reduce Motion. Check visual feedback without sound.
- Confirm offline startup after an online visit, saved names/colors/sound after
  reload, and user-controlled service-worker updates between games.

## Portrait Pong and iPhone status clearance

QA inventory: Player 1/2 assignments and host spectators; each player's paddle at
the bottom; horizontal touch, captured drags outside the court, keyboard and help
slider; mirrored opponent, ball and bumper positions; warning/impact/four-bumper
views; pause/resume, scoring, disconnects; portrait/landscape phones, tablet and
desktop, taller fonts, focus, reduced motion and simulated iPhone insets.

Pong setup and rematch reserve at least 12px between the player selectors and
Start Pong/Play Again and Controls & help. Check two paired players (without the
one-player instruction), 320×568 through desktop and short landscape, long names
and taller fonts. The paired setup screenshot uses separate Darwin/Linux renders
with the bundled font and the existing 250-pixel budget. Active play retains its
court space.

Across every game, drag over button labels and nested artwork, then activate with
mouse, touch and keyboard. Labels must not become selected or trigger iOS's text
callout; arrow drags must still steer on contact. Name inputs, pairing text and
scrollable Help content retain normal editing/selection. Automated checks cover
all game setups, label dragging and an actual Light-cycle direction change.
Repeat press/hold and slight-drag checks on physical iPhone/iPad Safari and
installed PWAs; Chromium cannot certify Safari's callout behavior.

Live current-build QA paired two players, checked 12px phone setup clearance,
swapped both selectors, opened Help and returned with Escape, and started,
paused and resumed Pong. A drag across Resume activated without selecting text;
a drag across Light-cycle's down arrow changed direction after the next step.
Saved phone, landscape, tablet and desktop screenshots complement these checks.

The browser runner uses two workers for consistent local/Ubuntu verification.
The paired setup, inset setup and court preview have reviewed Darwin/Linux
images. The genuine Ubuntu renders came from
[the family-playtest review run](https://github.com/ehofmei/multiplayer-test/actions/runs/37865516178)
and returned in `dbbdcf8`. The family-playtest review workflow now uses read-only
repository access and ordinary complete verification, with no baseline generation
or Pages deployment.

The shell adds 24px beyond the status inset in the installed app (12px in the
browser), including when iOS reports a zero inset, plus 12px beyond the home-indicator inset. Test Home,
library, pairing, setup, active play and scrollable dialogs with 59px top / 34px
bottom insets. Keep actual SVG bounds aligned with the visible portrait court and
its input area, so taps and drags never include a dark letterboxed region.
Portrait tests check the long play axis remains over 200px, the same minimum
previously used for the horizontal court, with the original 650:1000 geometry.

The non-deploying `portrait-pong-review.yml` workflow runs ordinary verification
with read-only repository access and snapshot updates disabled. The affected
Pong screenshots and status-clearance view have separate genuine Darwin/Linux
renders. Short landscape Pong views keep pending updates in Menu to preserve
court space; the update badge and action remain available.

Physical iPhone/iPad checks: update all devices; compare the supplied screenshot
with Home, library, pairing and Pong in Safari and the installed PWA. Confirm the
header clears iOS's blur, including after rotation, keyboard dismissal and
background/resume. Browser inset emulation cannot reproduce that native effect.
Pair two devices, swap player assignments, drag near the bottom with a thumb,
leave/re-enter the court while dragging and confirm comfortable mirrored control.
Check long rallies, bumps, pause/resume, point resets, offline relaunch and
user-controlled updates. No protocol/storage migration is needed; all devices
should update for matching controls.

## Reaction Race family polish (Task 4)

- Focused rules tests cover hit reward boundaries (0, 19, 20, 200, 1800 and
  2000 ms), penalties, successful holds, missed hits and one attempt per round.
  Audio events distinguish early from wrong attempts and deduplicate outcomes.
- `tests/reaction.spec.ts` covers immediate target activation, unchanged target
  bounds, exact keyboard hit reward/total, help, missed hits, stopping, eight real
  paired players sharing a win, scrollable standings and rematch reset.
  `tests/game.spec.ts` retains real paired early/wrong/hit/hold play, synthesized
  sound, the full ten-round flow and touch contact with a slight drag.
- Layout checks and saved screenshots cover 390×844, 320×700, 320×568, 844×390,
  768×1024 and 1280×720, including taller serif metrics and the full update
  notice. On short screens, its duplicate banner yields to the Menu dot and update
  controls. Deterministic Darwin
  and Linux snapshots cover ready pads, hit reward, wrong pad versus intended
  target, HOLD, successful hold and eight shared winners; reduced motion and
  muted play are included. The short landscape finale uses side-by-side results.
- Review workflow: `.github/workflows/reaction-review.yml` on
  `codex/reaction-polish`, Ubuntu/Node 22 and complete verification without
  snapshot updates or deployment. Genuine Linux renders were returned by the
  initial scoped generation run; all six Darwin/Linux pairs were visually
  reviewed. The final workflow has read-only repository permission.
- A persistent production-preview browser pass exercised help, visible keyboard
  focus, early and wrong attempts, a timed valid keyboard hit, natural holds and
  misses, final totals, replay, stopping, and the normal user-controlled update.
  Desktop, phone and tablet layouts were reviewed alongside saved screenshots
  and actual element bounds. No cue transition or decorative motion delays TAP.
- Physical iPhone/iPad follow-up: installed PWA safe areas and rotation, six-pad
  thumb reach, single contact scoring, VoiceOver TAP/HOLD and scored-pad
  descriptions, Safari gesture audio unlock/recovery and eight devices sounding
  together. Check host background/resume and confirm every outcome is clear
  muted. Browser timing checks cannot certify hardware cue-to-pixel latency.

## Fixture timing and screenshot stability

The Breakout full-victory fixture keeps real host/client pairing and normal
pointer/touch/slider controls. It reads level, ball and HUD in one DOM observation
per step instead of making a second level read. Per-phase profile attachments are
included in the timing report. Two serial Darwin samples took 96.2/100.9 seconds;
clock advancement used 79.6/84.9 seconds, DOM reads 8.1/8.2 seconds, input delivery
2.8/1.8 seconds and pairing 0.8 seconds. The two stage screenshots used about
0.3 seconds; final assertions/controls and the victory screenshot are outside
those phase totals. Simulation still dominates, so this is a modest optimization,
not a demonstrated dramatic speedup. Do not replace it with injected game state.

Game integration flows are split from `game.spec.ts` into explicit per-game files
for selection and file-level scheduling. All 64 tests remain. Seventeen existing
baseline files moved with their tests and retain identical image bytes.

Golf smooth-motion screenshots previously sampled a partial interpolation frame.
Real snapshot arrival timing can change that frame even when simulation ticks
match. The fixture still asserts non-exact interpolation, then advances only the
client clock, confirms exact received ball positions and matching host/client
ticks, and captures the settled rolling scene. Three two-worker repetitions
passed without image updates. The single desktop Darwin/Linux pair was reviewed
at the existing strict dimensions and 180-pixel budget. Genuine Ubuntu evidence
came from [the scoped render run](https://github.com/ehofmei/multiplayer-test/actions/runs/38263195758)
and was returned in `8d3fd96`; unrelated images remain unchanged.

The Cycle queued-turn capture follows the same separation: its earlier assertion
still proves smooth head/trail interpolation, while the screenshot uses exact
confirmed cells under reduced motion. Before capture, the fixture checks the
host-confirmed queued turn, matching host/client ticks, both logical rider
positions and both rendered transforms. Roster membership is not an input
acknowledgment. Smooth motion resumes for the remaining controls journey. Keep
the existing 64-pixel budget and genuine Darwin/Linux references; sampling a
paused partial animation cannot establish a deterministic pose.

The first two-shard experiment is inconclusive: shard 1 took 300 seconds and
failed on the prior Golf timing flaw; shard 2 spent 404 seconds installing Chromium
and was superseded during its browser run. The ordinary run was also superseded,
so none is a passing before/after comparison. Retain normal full verification;
measure another explicit benchmark after stability is established rather than
adopting sharding or more workers from this sample. Timing records distinguish
failed/canceled attempts from passing measurements. No retries/timeouts/visual
budgets were increased and no coverage moved to a later suite.

## Library and shared shell polish (Task 9)

Implementation and visual review are complete. Local `npm run verify` passed
formatting, TypeScript, 216 unit tests, 10 script tests, production build, all
76 browser tests and screenshot-pair checks. Require ordinary Ubuntu verification
for the exact final review-branch commit, with updates disabled; use
[the branch's checks](https://github.com/ehofmei/multiplayer-test/actions?query=branch%3Acodex%2Flibrary-shell-polish)
and [the Task 9 plan](LIBRARY_SHELL_POLISH_PLAN.md). Physical acceptance remains pending. Catalog/unit tests cover all fourteen games, solo eligibility,
exact-two connected requirements, selected-seat spectators, page clamping and
seat conflict guidance. tests/library.spec.ts checks all cards at household phone
and landscape iPad sizes, plus 320×568 and short landscape, strict content bounds,
taller fonts, page/focus restoration through resize, actual paired roster changes,
disabled client browsing and eight-player reduced-motion keyboard focus.

Live production QA reviewed all fourteen marks and pagination, missing-player
setup, Help/Escape/focus return, host/client text pairing, duplicate paddle seats,
a watching host, pause/resume, switching without re-pairing, synchronized Lights,
diagnostics/update access and host departure cleanup. A solo Race finished
naturally and replayed; the final corrected Breakout setup was checked on the
short phone and landscape iPad. Phone (402×874, 440×956, 320×568), short landscape
(844×390) and iPad (1180×820) screenshots and actual bounds were inspected.
Final executable live build: `20261013T010647Z · local`.

Reviewed platform pairs cover all four phone library pages, six-card landscape
iPad, disabled client choices and eight connected players with reduced-motion
keyboard focus. Shared Help/setup changes refresh existing full-screen states;
original court geometry, font fixtures, dimensions and pixel budgets remain.
Ubuntu evidence runs 38329979084, 38331222373 and 38331877161 supplied genuine
Linux renders. Evidence-generation success does not replace ordinary final
verification with snapshot updates disabled. Keep app-layout, all games, real
pairing, audio, offline/update and snapshot-presence checks in the full gate.

Physical follow-up: installed household iPhone/iPad viewport, safe areas and
rotation, real-thumb card/control reach, larger text/VoiceOver, household Wi-Fi
pairing and background recovery. Ask family members to choose a suitable game
for one, two, three and larger rosters and identify who plays versus watches.

## Ordinary Pong rally and finale polish — Task 10

Inventory: confirmed paddle/both-wall contacts and bumper priority; both bottom
views and local notches; court drag/capture/release, arrows, Help slider and taller
phone steering; point/serve progress/direction, both match points at 6–6, paused
and persistent results, selected-seat replay; watching host and five late arrivals
for eight connected devices; long names, muted/reduced motion, safe areas/taller
fonts, background/disconnect, switching and updates.

Unit coverage verifies boundary contacts, missed paddles and bumper-only rebounds,
simultaneous paddle priority, sequence retention through points, score priority,
coalesced/repeated/older snapshots, first frame, pause/serve suppression and optional
metadata validation. Delayed score updates work even when a client missed the
serve/rally; both observed gains are shown when both totals changed, without
guessing the last scorer. The browser journey checks the gain persists briefly
into play and then clears. Audio tests verify confirmed cues, fallback, deduplication
and bumper/point/finish priority. `test:game -- pong` includes the new polish spec;
its 6–6 and 6–7 states use real independent pairing and ordinary pointer controls
with the host clock, never score/state injection. Clients wait for a subsequent
20 Hz broadcast before synchronized point assertions. Late spectators receive
current standings without old contact/point effects; replay retains the two
selected client seats when the host watches.

Reviewed visual states cover confirmed contact, mirrored client identity, warning,
bumper impact/four bumpers, scorer/next serve, mirrored match point, phone/iPad
finale, short-landscape finale with explicit 12px control separation, and setup/insets. Keep separate genuine Darwin/Linux images, bundled fonts,
strict dimensions and existing budgets. The contact/rally states use deliberate
fixed steps; comparison states use Reduce Motion to remove time-dependent trails.
A separate normal-motion assertion verifies trail presence and pause cleanup.

Live QA uses production `/multiplayer-test/` at the stable 4174 host and independent
localhost client, with both builds checked and Home-first waiting updates applied.
It exercises real text pairing, both keyboard orientations, steering limits,
Help/Escape/focus, pause/resume, natural points/finish/replay, game switching and
viewport screenshots/bounds. Live screenshots/bounds covered 402×874, 440×956 and 320×568 phones, 844×390
landscape, 1180×820 iPad and 1280×720 desktop; the 1080×810 finale and full
taller-font matrix are automated coverage. Final live executable build:
`20261013T202414Z · local`. Device metrics were checked against actual inner dimensions.
Use full-viewport captures rather than cropped native Retina surfaces.
The final live pass uses ordinary controls and `screenshot({fullPage:true})`;
raw CDP can request full-DevTools permission separately for each origin. Prefer
project Playwright for viewport/capture work when that extra permission is unwanted.
A long permission wait interrupted the QA links; fresh text pairing restored them.
Do not count that wait as game execution or bypass the permission safeguard.

The first genuine Ubuntu images came from
[scoped Pong evidence](https://github.com/ehofmei/multiplayer-test/actions/runs/38401283773)
for `f13f62f`; every changed image was visually reviewed. [Additional scoped evidence](https://github.com/ehofmei/multiplayer-test/actions/runs/38461092192)
for `a339e2e` supplied the reviewed short-landscape result and invalid rematch.
Only these two new Linux images changed; the five existing polish states were
unchanged. All fourteen affected Darwin/Linux state pairs were visually reviewed.

The new review branch uses `review.yml`'s read-only, explicitly scoped Linux
baseline artifact route. Review every changed Darwin and genuine Ubuntu image,
then run complete local `npm run verify` and ordinary Ubuntu verification for the
exact final handoff commit with snapshot updates disabled. Report the matching
run URL/commit at handoff; generation success does not satisfy final acceptance.
Production/offline, saved preferences and user-controlled updates stay covered by
the complete browser gate. Physical device acceptance remains separate.

Physical follow-up: update every household iPhone/iPad, then play in Safari and
installed PWAs on Wi-Fi with either seat/host and spectators. Confirm safe areas,
rotation, larger text/VoiceOver, thumb reach and whether taller-phone steering
reduces court obscuration. Check contact/point/match-point ownership muted, ball
and warning readability during a busy four-bumper rally, sound unlock/recovery,
multiple devices sounding together, background/resume and offline startup after
an online visit. Ask players to identify their paddle, scorer and final winner.
The short/landscape/iPad control choice preserves court space; browser fit does
not certify physical comfort. Keep these checks pending until performed.
