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

- Inventory: host launch/rematch, 2–8 crew plus solo practice, three controls per
  device, orders sent to another panel, setting selection, shared hull/repairs,
  order deadlines, host-selected 1/2/3-minute missions (default 3), victory/loss,
  pause/resume, spectators,
  switching, disconnect and host background/stall handling.
- Rule tests cover ownership, conflict-free assignments, revision rejection,
  wrong-setting damage, unrelated controls, completed/expired orders, deadline
  ramp proportional to each selected duration, terminal states, frozen timers and an entire eight-player successful
  mission. Network tests cover malformed inputs/state, epochs, real session
  synchronization, late spectators, disconnect cleanup and timer disposal.
- Production Chromium tests pair crew through WebRTC, complete each other's
  orders with keyboard/touch input, exercise damage/repair and pause/resume,
  join/leave a spectator, disconnect crew and switch games. Controlled-clock
  tests cover an unattended loss, rematch, background pause and complete wins,
  including one-minute completion, correct flown time and duration changes on rematch.
- Keep the deterministic control-panel screenshot and review desktop,
  320×700/390×844/768×1024 screenshots with normal and taller Arial metrics.
  Check that all three panels fit with viewport clearance, selected numbers
  remain distinct, controls are at least 44px, focus is visible, and surrounding
  content scrolls normally. Review active orders as well as paused/results views.
- Live browser QA covers solo launch, an actual requested repair, pause/resume,
  keyboard controls, responsive screenshots and switching. On physical iPhone/
  iPad devices, play a full co-op mission with everyone talking; check whether
  the 18-to-10-second deadlines feel fair, quiet sound feedback, background pause
  and readability of all 24 system names. Update every device before pairing.

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
