# P2P Game Lab

A small LAN multiplayer game room for family devices. One device hosts; each joining
device has one direct WebRTC DataChannel to that host. There is no gameplay server,
signaling service, STUN/TURN configuration, database, or account.

Pair up to eight devices once using QR codes or copy/paste, then let the host choose
Shared Lights, two-player Pong, three/four-player Arena Pong, Co-op Breakout, or Reaction Race. Switching games keeps the same
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

**Arena Pong** plays three or four people simultaneously in a square arena. The
host assigns bottom/right/top/left seats; leave the fourth seat empty for a wall.
Each player sees their own paddle at the bottom and drags horizontally, uses the
slider, or presses ←/→. The host chooses 1, 3, 5, or 7 lives per player (default 5): missing your side costs a life, eliminated
sides become walls, and the last living player wins. A serve delay follows every
miss, with serves rotating between surviving players. Extra players spectate;
late arrivals join the next match. A participant leaving resets the match while
keeping other connections open. Pause/resume and host background handling match
regular Pong. Simulation and client smoothing use the same rates as Pong.

Both Pong games offer six named paddle color presets. Players choose their own;
colors are shared with all devices and saved with the local player identity.
Duplicate colors are allowed; name/life labels identify Arena players without
relying on color. Update all devices before pairing to use Arena Pong.

Both Pong games keep the original gentle serve, then ramp ball speed after two
seconds of each rally even without paddle hits. Paddle hits also give a stronger speed boost,
with bounded top speeds. Every point/lost life resets the ramp; pausing freezes it.
Update all devices before using the new Arena lives settings.

**Co-op Breakout** is a one-to-four-player team game, with solo practice and
spectators. The host fills bottom/right/top/left seats in order; unused sides are
walls. Each teammate sees their paddle at the bottom and uses horizontal drag,
the slider, or ←/→, with the same local paddle response and smoothed ball as Arena.
Everyone shares five lives: a miss on any occupied edge costs one team life and
never eliminates a teammate. Clear all sixteen central bricks in each of three
levels to win together. Level two adds some two-hit bricks; level three makes all
bricks two-hit (marked with a dark dash). Lives carry between levels. A one-second
serve follows a miss or cleared level; serves rotate between teammates. The host
can pause/resume or start a fresh match after victory/loss. Late arrivals watch
until the next match; a participating player leaving resets the match. Switching,
pairing, background handling, color preferences and muted local sounds use the
existing game lifecycle. Update every device before selecting Co-op Breakout;
older builds cannot validate its room snapshots. No pairing protocol or saved
identity/sound storage change is required.

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

## Sound

Each device has its own Sound toggle in the header. Sound starts off by default;
the versioned local preference survives reloads. Tap Sound to enable it and hear a
quiet confirmation. Browsers require a tap/key gesture to start audio, including
on a visit with Sound already saved on. Keep the device's volume at a comfortable
level. If audio is unavailable, gameplay continues and the toggle offers a retry.

Short synthesized tones cover light on/off, Pong paddle/wall hits, serves, points
and match results, and Reaction Race hit/hold cues, individual feedback and finishes.
Race still requires choosing the correct visual target; a tone alone does not tell
you which button to press. Sound never controls scoring or networking.
No samples, new dependencies, or external downloads are needed, so effects work
offline. Muting stops active tones immediately; hiding the app stops/suspends audio.
After returning, a tap/key gesture resumes enabled sound. No old events replay on
joining, switching games, enabling sound or reconnecting. Rapid cues are bounded.
Pong sounds follow observed state changes; a delayed client update may omit a very
brief bounce. Physical iPhone/iPad audibility and background/resume need device testing.

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

## Camera scanning and touch controls

Scan Invite / Scan Join opens a full-screen native dialog with the camera already
in view. Stop Camera or Escape closes it and returns focus to Scan; backgrounding
the app also closes it. Camera streams are released on close, a decoded code,
permission failure, and leaving the pairing UI. Image import and text pairing
remain available when camera access fails. The dialog blocks background scrolling;
the rest of the app stays scrollable after it closes.

Reaction Race disables touch scrolling/selection on the target grid and scores
touch input on finger-down, so a small drag cannot cancel the tap. Mouse and
keyboard activation still work normally. Scroll using the surrounding page.

## Offline, updates and limitations

The production service worker caches the app shell. After an online visit and cache
completion, reload/launch without internet should work. LAN Wi-Fi still needs to be
connected, and pairing text still needs to be transferred. The app does not load
remote fonts, scripts, or media. Identity/name storage is versioned locally; the games
and connections are intentionally temporary and reset when the host leaves/reloads.
There is no saved game progress requiring export/import.

A new service worker waits rather than forcing an update during play. The footer’s
**Check for updates** fetches the latest service worker when online. Once its assets
are cached, **Update app** activates it and reloads the app. During a session, a
confirmation explains that this ends the connection; canceling keeps the game open.
Updating a host disconnects its players. Update each device between games. Other
open tabs keep playing until their own reload. Failed/offline checks preserve the
current playable build. A small UTC build timestamp appears in the footer, followed
by the short GitHub commit ID in CI or “local” for local builds. Real installed iOS
update behavior still needs device testing.
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
