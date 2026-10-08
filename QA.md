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

## App updates

- Menu build identifier and 44px update control on desktop and narrow phone.
- Latest build reports up to date; offline check explains retry without interrupting play.
- A new service worker waits during play, caches fully before Update app appears, and reloads on request.
- Canceling an in-game update preserves the session; accepting returns home with the current assets.
- Check installed iPhone/iPad updates and compare build identifiers after deployment.

## Arena Pong and paddle colors

- Host-only game selection and three/four distinct player assignments; fourth empty seat is a wall.
- Four simultaneous paddles, own paddle at bottom on every side, left/right pointer/keyboard/slider controls and spectator restrictions.
- Five lives, paddle/wall/corner collisions, elimination turns sides into walls, winner and rematch.
- Palette names/selection indicators, synchronized colors, reload persistence, regular Pong reuse.
- Pause/resume, background handling, participant disconnect reset, switching games preserves peers.
- Desktop/tablet/320px phone: court proportions, long names, 44px controls, focus, contrast and no horizontal overflow.

## Family play feedback

- Reaction Race: touch drag of a few pixels on a live target still scores once and does not scroll; secondary panels can scroll; keyboard activation still works.
- Both Pong games: gentle opening, acceleration visible by five seconds, capped speed, ramp resets after every miss, pause freezes timing.
- Arena: host picks 1/3/5/7 lives, clients see the chosen setting, rematch keeps it, invalid wire values rejected.
- Scanner: full-screen phone/desktop dialog, focus stays in modal, Escape/Stop restores focus and scrolling, camera tracks end, permission denial retains fallbacks. Check successful scanning and background close on real iPhone/iPad.

## Co-op Breakout

- Inventory: host-only selection/setup, distinct contiguous seats for 1–4 players,
  shared five-life counter, three levels, one/two-hit bricks, team win/loss/rematch,
  own paddle at bottom, pointer/keyboard/slider, palette, pause/resume, spectators,
  switching, participant disconnect and host background pause.
- Automated rules cover every entering brick face, no repeated overlap damage,
  shared misses without elimination, walls, serve timing, level advancement,
  victory/loss, paused/finished freeze, bounded full simulation and malformed wire state.
- Session checks cover synchronized state/input, host permissions, stale epochs,
  pause/resume, disconnect reset, solo restart and timer cleanup.
- Production browser checks pair real WebRTC contexts, exercise rotated keyboard
  and touch input, duplicate setup rejection, spectators, pause/resume, disconnect
  restart and game switching. A deterministic ready court snapshot is retained.
- Review desktop and 320×700/390×844/768×1024 screenshots, including taller Arial
  metrics and four teammates with a long name. Check court clearance, focus,
  touch targets, wrapping, contrast and contained scrolling in secondary panels.
- Live browser pass covers solo start, keyboard movement, palette, pause/resume,
  game selection and phone viewport inspection. Physical iPhone/iPad co-op feel,
  a complete team victory, sound audibility and host background/resume still need
  device testing; update all devices before pairing with this mode.

## Spaceship Panic

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
- Desktop, tablet, 390px and 320px phone layouts; alternate taller font metrics,
  eight long names, numbered riders, focus, roughly 80×64px arrow targets with 10px
  gaps, normal surrounding
  page scrolling, active-surface gesture handling, and no horizontal overflow.
- Motion: continuous head/trail movement between confirmed cells, corners without
  diagonal shortcuts, no extrapolation, exact paused/crashed positions, reduced-motion
  grid steps and recovery after delayed/skipped snapshots.
- Retain a deterministic arena screenshot and review full-page desktop/mobile
  screenshots. Verify cached startup under `/multiplayer-test/` and update messaging.

Automated coverage includes rules/protocol/session tests, actual two- and
eight-player WebRTC rooms, touch-button and swipe input, keyboard steering,
countdown focus, pause/resume, draws/rematches, late arrivals, departures and
host loss. The live browser pass manually paired two players, steered both,
paused/resumed, observed a winner, rematched, and checked a rider leaving.
Desktop and mobile screenshots were reviewed; responsive checks include taller
Arial metrics and all eight long names. Existing production-subpath offline,
manifest, identity, and service-worker update tests remain part of `npm run verify`.

Physical-device follow-up: pair two iPhones/iPads on Wi-Fi, then try a larger room.
Check touch steering and swipe feel, numbered heads on small displays, optional
sound, Safari/installed PWA background-and-resume, and all-device updates. Browser
emulation does not establish physical-device latency or iOS behavior.

## Screenshot portability

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

QA inventory:

- Host starts 2–8 players; three-second countdown, numbered/color seats, moving
  collisions, ring-outs, simultaneous draw, shrinking ring, sixty-second shared
  win, and fresh rematch. Late arrivals watch, eliminated controls disable.
- 144px movement pad with capture/release/cancel and a 96×72px Dash button. Verify
  simultaneous two-thumb movement/dash, diagonal normalization, braking, recharge,
  lost-input expiry, focus loss, arrows/WASD + Space, and normal surrounding scrolling.
- Pause/resume clears velocity/input and freezes ring/recharge timers; pairing,
  background/stall, game switching, participant/spectator departures and host loss.
- Desktop, 320×700/390×844 phones and 768×1024 tablet; taller font metrics, eight
  long names, viewport clearance, contrast, keyboard focus, no overflow, continuous
  confirmed movement, exact paused/eliminated positions and reduced-motion steps.

Rules/protocol tests cover spawns, normalization, expired input, dash limits,
contact separation/momentum, a successful knock-out, simultaneous ring-outs,
terminal states, timeout, a full eight-player simulation and malformed wire state.
Session tests cover actual input sequencing/epochs, permissions, shared movement,
pause/resume, spectators, disconnect cleanup and scheduling stalls. Production
Chromium tests pair two/eight independent WebRTC contexts, exercise physical-style
two-finger touch input, keyboard movement/dash, paused timers, rematch, spectator
controls/departures, background pause, participant loss and host loss. A deterministic
ring snapshot is retained and desktop/mobile/tablet screenshots are reviewed.
Existing production-subpath cache/offline/update checks remain in `npm run verify`.

The attempted live pass was unavailable because the in-app browser blocked local
preview navigation. Native access was also unavailable in the preceding feedback
pass due to pending OS permissions. Automated checks and screenshot inspection
cover this implementation; live interaction remains unverified. Physical iPhone/
iPad follow-up should check two-thumb steering/dash feel, Wi-Fi latency, movement
clarity, optional sound and Safari/installed-PWA background/resume. Update all
devices before selecting this game.

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
hand baselines with the same strict pixel budget; text rasterization differs even
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
  844×390, 768×1024, and 1280×720. Eight long names, taller serif metrics, reduced
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
Ready/active/results regression snapshots use the bundled font fixture and
separate reviewed Darwin/Linux baselines, following the Bakery convention. Text
rasterization differs across these platforms even with identical font metrics;
keep the 180-pixel budget and strict image dimensions on each platform. Regenerate
all three states on the corresponding OS with the helper active, then review the
images before accepting updates. Saved screen checks include taller metrics and
pending-update notices; their fit and touch-target assertions remain strict.

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
- Drag from the ball toward travel, release a short or long drag, then adjust it.
  Cancel a drag or lose focus: the previous aim should return. The arrow previews
  direction, not a complete trajectory. Angle/Power work with touch and arrow keys.
  At short portrait heights use Adjust aim; close the dialog before Ready.
- Tap Ready, see Shot locked after host confirmation, and try to change it. Others'
  shots and actual gust/impact timing remain hidden until launch. Leave one player
  without a shot for at least a minute: everyone stays in aiming with no score
  loss. Confirm that last shot and verify immediate shared launch.
- Watch boundary/wall bounces, mushroom boosts, and the shared meteor. Balls never
  collide with one another; the host awards cup or distance points. Results overlay
  each hole's points; Standings shows all five scores and full names. Ties share wins.
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
identical outcomes, long untimed waits, natural settling, five-hole totals, privacy, bounded eight-player
messages, permissions, stale/duplicate input, pause/resume, disconnects, and timer
cleanup. Browser flows use real WebRTC pairing, drag/keyboard/touch controls,
short-screen adjustments, a deterministic five-hole match, rematch and game switch,
late spectators, host backgrounding, and retained ready/active/result screenshots.
Golf's ready, active and results snapshots use separate reviewed Darwin/Linux
baselines, the bundled font fixture, strict dimensions and a 180-pixel budget.
Follow the screenshot portability workflow above when adding or updating them.
The complete verification command also checks manifest/icons, repository-subpath
startup and caching, offline reload, identity/sound persistence and controlled updates.

Live browser QA paired two current production-preview devices and exercised drag
preview, slider/keyboard adjustment, authoritative Ready locks, pause/resume and
manual app updates. Screenshot reviews complement the strict automated viewport
and touch-target checks. A final development-preview pass at 320×568 exercised
Adjust aim, keyboard edits, Escape dismissal, Ready lock and pause. These checks
use desktop Chromium; they do not establish physical-device behavior.

Physical iPhone/iPad follow-up: play all five holes on household Wi-Fi in Safari
and installed PWAs. Check real touch dragging/cancellation, safe areas and rotation,
Adjust aim with larger text, app background/resume, cached startup and updates.
Family play should tune drag sensitivity and course balance; the
five-minute preference is a pacing goal, not an exact match-time requirement.

## Patchwork Picnic

QA inventory:

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
The production-browser suite pairs real WebRTC contexts and retains ready, active
and result screenshots with the bundled font fixture and strict 180-pixel budget.
`npm run verify` passed locally: formatting, 130 unit/session tests, the production
build and 39 Playwright tests. The live production-preview pass paired two devices,
checked invalid previews, rotation, keyboard anchoring/confirmation, private locks,
pause/resume, simultaneous reveal, untimed waiting, standings/Escape, app updates and
phone/tablet layouts. The 320×568 Arrange panel and full-size squares were visually
reviewed. Saved desktop/mobile/tablet images and all three Darwin regression
baselines were reviewed.

All three Linux baselines were recovered from the `browser-failure-results`
artifact of [the matching CI run](https://github.com/ehofmei/multiplayer-test/actions/runs/37340763661)
for commit `537c41e`. The artifact digest was verified and the actual ready,
active and results images were visually reviewed before adding them. Both platform
baseline sets retain strict dimensions and the unchanged 180-pixel budget.
A passing Linux CI rerun and physical-device behavior remain unverified.

## Light Seek

QA inventory:

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
  must fit with clearance; the full board is a preview. Four 5×5 selection areas
  retain 44px targets; short landscape setup moves the tray into that dialog.
  Check scrolling only in secondary dialogs, contrast, coordinate labels and
  adjacent revealed shapes. Results show both complete boards.

Rules/session/protocol tests cover rotations and invariant square/plus shapes,
19 touching tiles, illegal/incomplete layouts, one-time locks, random draw bounds,
untimed phases, all results, immediate victory, turn/epoch/sequence rejection,
private host/client/spectator views, paused state, fresh matches, disconnects,
countdown stalls, disposal and maximum escaped eight-device messages. Sound tests
cover one event/one cue, found replacing hit, and no replay on view/epoch changes.
The real WebRTC browser flows cover manual setup through a seeded complete match,
eight connected devices/spectators, lifecycle and game switching. Retain separate
setup, active, found-piece and results baselines on Darwin/Linux using the bundled
font fixture, strict dimensions and the unchanged 180-pixel budget.

Live persistent Playwright QA paired two current production-preview devices and
exercised tap placement, editing/rotation, keyboard confirmation, Ready/waiting,
a keyboard-selected hit at 320×568, My board/Escape, sound toggle/unlock and
pause/resume. Desktop/mobile/tablet screenshots are reviewed alongside automated
fit checks. The in-app browser stalled while applying a cached preview update;
the persistent local Playwright session provided the live pass.

Physical iPhone/iPad follow-up: play a complete match on household Wi-Fi in Safari
and installed PWAs. Check comfortable 5×5 selection, larger text, safe areas,
rotation, VoiceOver, sound unlock/volume, background/resume and offline startup
with updated apps on both devices. Existing production-subpath PWA/cache/update
checks remain in the full verification command. Browser emulation does not verify
physical iOS/iPadOS behavior.

Light Seek’s four Linux baselines and refreshed library pagination baseline were
rendered by [the review-branch Linux run](https://github.com/ehofmei/multiplayer-test/actions/runs/37350302052)
and returned in commit `cb82f94`. Every image was visually reviewed alongside its
Darwin counterpart. No cross-OS copying or tolerance changes were used. The
review-only workflow runs on `codex/light-seek`, obtains missing Linux renders
once, returns them to that branch, and runs full verification without deploying
Pages. Subsequent pushes compare the committed baselines normally.

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
