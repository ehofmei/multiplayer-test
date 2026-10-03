# Browser QA inventory

Checkpoint: app shell, QR/text pairing, host/client sessions, shared grid and latency.
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
