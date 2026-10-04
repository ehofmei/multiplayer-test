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

- Footer build identifier and 44px update control on desktop and narrow phone.
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

- Reaction Race: touch drag of a few pixels on a live target still scores once and does not scroll; surrounding page can scroll; keyboard activation still works.
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
  touch targets, wrapping, contrast and page scrolling outside active play.
- Live browser pass covers solo start, keyboard movement, palette, pause/resume,
  game selection and phone viewport inspection. Physical iPhone/iPad co-op feel,
  a complete team victory, sound audibility and host background/resume still need
  device testing; update all devices before pairing with this mode.

## Spaceship Panic

- Inventory: host launch/rematch, 2–8 crew plus solo practice, three controls per
  device, orders sent to another panel, setting selection, shared hull/repairs,
  order deadlines, three-minute mission, victory/loss, pause/resume, spectators,
  switching, disconnect and host background/stall handling.
- Rule tests cover ownership, conflict-free assignments, revision rejection,
  wrong-setting damage, unrelated controls, completed/expired orders, deadline
  ramp, terminal states, frozen timers and an entire eight-player successful
  mission. Network tests cover malformed inputs/state, epochs, real session
  synchronization, late spectators, disconnect cleanup and timer disposal.
- Production Chromium tests pair crew through WebRTC, complete each other's
  orders with keyboard/touch input, exercise damage/repair and pause/resume,
  join/leave a spectator, disconnect crew and switch games. Controlled-clock
  tests cover an unattended loss, rematch, background pause and a complete win.
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
