# Browser QA inventory

Checkpoint: app shell, QR/text pairing, game picker, Pong, Reaction Race, shared grid and latency.
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
