# Browser QA inventory

First checkpoint: app shell, manual pairing, host/client sessions, shared grid.
Use the production build at /multiplayer-test/ for checks.

| Feature / control                           | Functional check                                                                                        | Visual state / evidence                                        |
| ------------------------------------------- | ------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------- |
| Name, Create Game, Join Game, Return Home   | Name persists; create/join modes; leave disposes peers                                                  | Desktop and phone home, host, waiting client                   |
| Add Player, offer/answer text, copy, cancel | Host + 3 independent clients; fresh offer each time; select/copy fallback; cancelled invite closes peer | Expanded pairing and invalid-paste error on phone              |
| Grid                                        | Host/client toggles; concurrent actions; rapid taps; fresh join gets current state                      | Off/on cells; keyboard focus; deterministic grid snapshot      |
| Player list                                 | Join, leave, manually rejoin; host loss disables client board                                           | Four-player list; disconnected client error                    |
| Connection details                          | Expand/collapse; open channel, ICE/signaling, counters                                                  | Expanded connected diagnostics                                 |
| Install instructions and PWA                | Expand instructions; manifest/icons; offline startup; stored name reload                                | Phone instructions, browser/standalone indicator               |
| Page updates                                | New worker waits until the session ends and app windows close                                           | Update notice; no mid-game forced reload                       |
| Layout and accessibility                    | 390px phone, smaller 320px phone, tablet and desktop; no horizontal overflow; board above fold          | Screenshots; focus/contrast/readability and target-size review |

Exploratory checks: malformed offer and answer, cancelled pending invite, rapid/repeated taps,
leave while connected, fresh manual reconnect, long player names, and narrow phone layout.

Real iPhone/iPad Safari and installed-PWA LAN pairing, updates and offline startup require
physical-device testing. Browser emulation does not certify these behaviors.
