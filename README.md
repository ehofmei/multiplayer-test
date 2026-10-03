# P2P Game Lab

A small LAN multiplayer game room for family devices. One device hosts; each joining
device has one direct WebRTC DataChannel to that host. There is no gameplay server,
signaling service, STUN/TURN configuration, database, or account.

Pair up to eight devices once using QR codes or copy/paste, then let the host choose
Shared Lights, two-player Pong, or Reaction Race. Switching games keeps the same
connections. The app is installable and includes latency diagnostics.

## Run and verify

Use Node 22 or newer.

```sh
npm ci
npm run dev
```

Open http://localhost:5173/multiplayer-test/. Localhost is a secure context for
desktop development. A phone visiting a plain HTTP LAN address is not equivalent;
use HTTPS for phone installation and testing.

```sh
npx playwright install chromium
npm run verify
npm run preview
```

Verification checks formatting, protocol/grid unit tests, TypeScript and production
build, then Chromium browser tests against the built app. Tests connect a host and
three separate browser contexts, exercise concurrent/rapid actions and disconnects,
check mobile controls, camera cleanup/denial, actual QR image decoding and cached
offline startup under the repository path. Unit tests cover latency timing,
acknowledgments, timeouts, bounded samples, compressed payloads and malformed input.
Game tests cover physics/scoring, early/wrong/hold race rounds, ten-round results,
host-only selection, spectators, stale input rejection, pause/resume and disconnects.
Grid, Pong court and race target snapshots provide visual regression coverage. QA.md lists the
interactive and real-device checks. Browser tests do not prove iOS LAN connectivity.

## GitHub Pages

The app base path is /multiplayer-test/. The Pages workflow builds and verifies
the app on pushes to main or manual dispatch, then uploads only dist/. In GitHub
repository Settings → Pages, select **GitHub Actions** as the source. Push these
files to main, then check the workflow and open:

https://ehofmei.github.io/multiplayer-test/

Failed workflow runs retain browser traces and error contexts in the
`browser-failure-results` artifact for seven days.

No client-side path routes are used; Create/Join are in-app modes. Refresh returns
to Home, so there are no nested-route refresh errors. If the repository is renamed,
update the Vite base path. Other HTTPS static hosts can serve dist/ under that path,
or rebuild with `npm run build -- --base=/` for root hosting.

## Install and pair

1. On each iPhone/iPad, open the HTTPS site in Safari while online. Let it load.
2. Tap Share → Add to Home Screen. Launch the installed app.
3. Connect every device to the same Wi-Fi. Enter a different display name per device.
4. On the host, tap Create Game, then Add Player.
5. On the client, tap Join Game, then Scan Invite. Allow camera access and scan
   the host's invite QR code. Your join QR code appears and the camera stops.
6. On the host, tap Scan Join and scan the player's join QR code. The camera stops
   and both devices enter the room after the direct connection is acknowledged.
7. If scanning is awkward, use Import Invite/Join QR image with a saved screenshot.
   Copy/paste instead and Paste connection text instead retain the text workflow:
   paste an invite, Create Join Code, then paste that join code on the host and
   Connect Player. AirDrop/Notes can transfer text or screenshots.
8. Repeat Add Player with a fresh invite for each additional client.
9. The host picks a game. Choose Game returns everyone to the picker without
   disconnecting. Return Home leaves the room and closes connections.

## Games

**Shared Lights** retains the original 4×4 shared board. Every device can toggle
cells; the host serializes actions and shares state. Selecting it starts a fresh
board. It remains a cooperative experiment rather than a scored game.

**Pong** plays to seven points. The host chooses any two connected players (they
can be two clients); other players watch. Drag vertically anywhere on the court,
use the paddle slider, or focus the court and press ↑/↓. Your own paddle draws
immediately, and inputs are coalesced at about 30 Hz. The host simulates the ball
in fixed 120 Hz steps, renders at about 60 Hz, and sends state at about 20 Hz.
Clients smooth the ball between updates. Paddle hits increase speed and change
angle according to the impact position. A one-second serve delay follows each
point. The host can pause/resume and choose new players after a match.
This is a simple reliable-channel prototype, with no rollback or collision
prediction; real-device play determines whether its motion feels smooth enough.

**Reaction Race** has six targets and ten rounds for everyone present at the start
(or solo practice). After a random 1.2–3 second wait, hit the marked target within
two seconds. Rounds 3 and 7 say Hold and show a decoy: leave every target alone.
One attempt per round prevents repeated taps. Correct hits earn
`max(10, 100 - floor(response_ms / 20))` points; early/wrong taps cost 25, missed
hit rounds earn zero, and successful hold rounds earn 75. Scores accumulate,
round results show each player's response, and equal final scores share the win.
The host can stop a race or start a rematch.

Reaction response is measured on each device's monotonic clock from receiving the
active cue to tapping. The host accepts bounded 0–2000 ms reports and gives a
50–250 ms delivery allowance based on recent RTT before closing the round.
Device clocks need not agree; network delivery is excluded from the reported
response. This reduces host advantage but does not measure exact cue-to-pixel
latency or eliminate differences in browser rendering, touch hardware, or jitter.
Scores trust family players' reported times; this is not a competitive anti-cheat
system. Late joiners watch until the next race. Losing an active participant
stops the match/race and offers a fresh start; remaining players stay connected.

Opening pairing pauses Pong or stops a race. Backgrounding the host pauses Pong
or cancels a running race; Pong also pauses after a long scheduling stall rather
than fast-forwarding. Finish pairing/return to the app, then resume or start again.
Clients and the host should remain foregrounded while playing. Games, scores and
connections are temporary; leaving/reloading the host ends the room.

Connection text contains LAN connection information; share it only with intended
players. Each invite is single-use and expires after three minutes. Keep both screens
open while pairing. Copy buttons need clipboard permission; select the text and
copy manually if the browser blocks them.

Scanning works inside this app; these QR codes contain connection data rather than
website links. QR payloads use a versioned gzip/Base45 envelope, while copied text
remains the original JSON. Compression/decompression use browser APIs. If a browser
lacks these APIs or the payload would make an excessively dense QR, use raw text.
Stop Camera, leaving pairing, or leaving the app screen releases its stream.
Generation, decoding and compression run locally; the decoder worker is precached
with the app for offline use. Each additional player still needs two scans.

## Inspect and test

Expand Connection details to see connection/ICE/signaling/channel states, sent and
received message counts, and the last-message time. Each established link measures
application round-trip time with a ping/pong about once per second. Current, median
and nearest-rank 95th percentile values use a rolling window of up to 60 samples.
Unanswered probes are counted after five seconds; they are not successful RTT samples.
Timers and pending measurements are cleared when a link closes.

Clients also show Tap response: elapsed time from sending a toggle or target tap
until the host's acknowledgment and resulting state arrive. It excludes screen
rendering and measures only that client's actions. Both measurements use the initiating device's monotonic
clock; device clocks do not need to be synchronized. These are round-trip/application
measurements, not exact one-way or tap-to-pixel latency. Keep devices foregrounded;
background scheduling and Wi-Fi conditions can cause spikes. Malformed messages are
rejected and reported in the UI/console.

Use an iPhone as host and iPad as client, then reverse roles. Try Safari → Safari and
installed PWA → installed PWA, then one host with three clients. Test concurrent taps,
rapid taps, leaving a client, and leaving the host. Rejoining requires a new manual
handshake. Pong and Reaction Race need physical-device playtesting; browser tests cover
synchronization, rules, controls, game switching, and responsive layouts.

| Device/browser combination               | Connection / synchronization             | Application RTT                                                                  |
| ---------------------------------------- | ---------------------------------------- | -------------------------------------------------------------------------------- |
| Real iPhone + iPad, QR pairing (browser) | User confirmed working, hundreds of taps | Median 13 ms, p95 49 ms, zero unanswered probes in the pictured 60-sample window |

## Offline, updates and limitations

The production service worker caches the app shell. After an online visit and cache
completion, reload/launch without internet should work. LAN Wi-Fi still needs to be
connected, and pairing text still needs to be transferred. The app does not load
remote fonts, scripts, or media. Identity/name storage is versioned locally; the games
and connections are intentionally temporary and reset when the host leaves/reloads.
There is no saved game progress requiring export/import.

A new service worker waits rather than forcing an update during play. Finish the
session, close all app windows, and reopen to use the update. Real iOS offline/update
behavior still needs testing.
After deploying this checkpoint, update every participating device before pairing;
earlier app versions do not understand version 2 game messages.

LAN-only ICE may fail on networks with client isolation, guest Wi-Fi, blocked UDP,
or browser restrictions on local candidates/mDNS. Same Wi-Fi is a prerequisite,
not a guarantee. Failures remain visible; this experiment intentionally adds no
relay infrastructure. No host migration, automatic reconnect, or suspension recovery
is implemented. Keep the host foregrounded and awake. A disconnect removes the
player; host loss disables the client board. Closing all tabs can interrupt a game.

The protocol is versioned JSON with size and shape checks. Reliable ordered channels
preserve actions per client; the host serializes actions from all clients. The host
acknowledges pairing with an initial room state; clients retry their introduction
once per second until acknowledged, with a 30-second deadline. Repeated introductions
on the same link resend state without duplicating or changing the bound player.
Networking and state logic live outside React, so a future game can replace the grid
reducer and game messages while retaining pairing and peer lifecycle code.
Every selection/match has a new epoch, so delayed inputs from an earlier game or round cannot affect the next one.
All game timers stop on switching, cancellation, disconnect, and disposal.
Pong skips snapshots while a channel is backed up, then sends the latest state
when it drains; the existing overall buffer limit still bounds slow connections.
