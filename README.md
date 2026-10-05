# P2P Game Lab

A small LAN multiplayer game room for family devices. One device hosts; each joining
device has one direct WebRTC DataChannel to that host. There is no gameplay server,
signaling service, STUN/TURN configuration, database, or account.

Pair up to eight devices once using QR codes or copy/paste, then let the host choose
Shared Lights, two-player Pong, three/four-player Arena Pong, Co-op Breakout, Spaceship Panic, Light-cycle Arena, Sumo Bumpers, Reaction Race, Midnight Bakery, Treasure Dive, Meteor Minigolf, Patchwork Picnic, or Light Seek. Switching games keeps the same
connections. The app is installable and includes latency diagnostics.

For possible future additions, [GAME_IDEAS.md](GAME_IDEAS.md) describes eleven
family game proposals with rules, controls, scoring, timing, and implementation
notes. Treasure Dive, Meteor Minigolf, Patchwork Picnic, and Light Seek are now available; the remaining entries are
design proposals. Ideally games finish within five minutes; proposed timers are
playtest starting points, not hard limits.

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

Platform-specific screenshot tests need reviewed macOS (`darwin`) and Linux
baselines. Local verification compares only the current OS's images; GitHub
Actions verifies Linux. See [QA.md](QA.md#screenshot-portability) for baseline
generation and recovery from CI artifacts.

## GitHub Pages

The app base path is /multiplayer-test/. The Pages workflow builds and verifies
the app on pushes to main or manual dispatch, then uploads only dist/. In GitHub
repository Settings → Pages, select **GitHub Actions** as the source. Push these
files to main, then check the workflow and open:

https://ehofmei.github.io/multiplayer-test/

Failed workflow runs retain browser screenshots, traces and error contexts in the
`browser-failure-results` artifact for seven days.

No client-side path routes are used; Create/Join are in-app modes. Refresh returns
to Home, so there are no nested-route refresh errors. If the repository is renamed,
update the Vite base path. Other HTTPS static hosts can serve dist/ under that path,
or rebuild with `npm run build -- --base=/` for root hosting.

## App experience on iPhone and iPad

This is a household game lab for experimenting with Codex, designed primarily
for iPhones and iPads installed from Safari using Add to Home Screen. Android
support is not a project requirement. Desktop browsers remain useful for testing.

The app uses a viewport-filling shell with safe-area padding. Home, the game
library, pairing, setup, and play are focused views rather than a long page.
Phones and short windows show four games per library page across three pages; larger iPad windows
show six games per page across two pages. During games, courts fit their remaining space without changing
the game geometry. Landscape layouts place courts beside controls; very short
setup screens omit the court preview to keep assignments and Start reachable.

Menu (or the player-count button) opens the roster, connection details,
installation help, app build/update controls, and Return Home. Add Player is
available in the lobby; during games use Menu → Invite Player, which retains the
existing pause/stop behavior before pairing. Each game's Controls & help panel
contains instructions and, for paddle games, color choices and an alternative
slider. Pause/stop, essential status, and touch controls stay on the play screen.
Detailed rider/bumper lists move into Help while playing and appear with results.

Pairing keeps the QR and scan action prominent. Import QR image expands the image
fallback; Other ways to connect opens the text-transfer panel. Closing that panel
preserves the invite and entered text. Camera scanning remains a separate native
modal and releases the stream when closed. Selecting another game keeps the room
connected; Return Home ends the local session.

Primary screens aim to fit without scrolling at ordinary text sizes. Secondary
panels can scroll, and constrained windows, larger text, or the on-screen keyboard
can use contained scrolling to keep content accessible. The installed PWA removes
browser navigation UI; iOS still controls its status area and home indicator.

## Install and pair

1. On each iPhone/iPad, open the HTTPS site in Safari while online. Let it load.
2. Tap Share → Add to Home Screen. Launch the installed app.
3. Connect every device to the same Wi-Fi. Enter a different display name per device.
4. On the host, tap Create Game, then Add Player. During a game, use Menu → Invite Player.
5. On the client, tap Join Game, then Scan Invite. Allow camera access and scan
   the host's invite QR code. Your join QR code appears and the camera stops.
6. On the host, tap Scan Join and scan the player's join QR code. The camera stops
   and both devices enter the room after the direct connection is acknowledged.
7. If scanning is awkward, use Import Invite/Join QR image with a saved screenshot.
   Under Other ways to connect, Copy/paste instead and Paste connection text instead retain the text workflow:
   paste an invite, Create Join Code, then paste that join code on the host and
   Connect Player. AirDrop/Notes can transfer text or screenshots.
8. Repeat Add Player with a fresh invite for each additional client.
9. The host picks a game. Choose Game returns everyone to the picker without
   disconnecting. Return Home leaves the room and closes connections.

## Games

**Midnight Bakery** is a silly competitive pick-and-pass card game for two to eight
players. Everyone present when the host opens the bakery joins; late arrivals watch
until Bake Again. Two batches of six simultaneous picks target a 3–5 minute game.
Choices are untimed, so chatting or taking longer to think can extend the session.
Tap a card to preview its exact score gain, then Lock my pick. Picks cannot change
once locked. Everyone reveals together, then remaining hands pass after 1.8 seconds.
The host starts batch two after everyone has had a chance to see the first scores.

Googly Cookies earn 2 each plus 2 per pair (a pair earns 6). Wobble Jelly pairs earn
7; unpaired jelly earns 0. Burp Cakes earn 3 each. Disco Sprinkles earn 1 each plus
2 when matched with a cake, with one sprinkle per cake. Spoon Gremlins earn 1 and
reverse passing on that reveal; even numbers cancel out. With two bakers, an odd
number skips that pass instead, so the gremlin still changes your choices. Passing begins clockwise
in batch one and counterclockwise in batch two. Gremlins affect remaining hands,
never treats already collected. Each batch scores separately; scores add together,
and ties share the win. Results keep names compact; Table & scores shows full names
and both batch totals. A shuffled room-wide deck contains two cookies and one of
each other card per player per batch, giving varied hands without additional assets
or dependencies. The characters are local SVG artwork and work offline.

The host owns the shuffled hands and resolves picks. Personalized snapshots send
only the recipient's hand and public counters/readiness; other hands and locked
choices are removed, including from the host's rendered view and spectator views.
This is a trusted family-host game, not an anti-cheat system. Epoch, sequence,
batch and pick checks reject outdated/repeated inputs. Pause, pairing and host
backgrounding preserve hands and locked picks; Resume Bakery continues the same
pick or restarts the short reveal delay. A participating player leaving resets the
game; a spectator leaving preserves it. Reloading/leaving the host still ends the
room. **Update every device before selecting Midnight Bakery**: older builds cannot
validate its new state and action. Existing pairing and saved preferences remain.

**Shared Lights** has sixteen shared cells, arranged as 4×4 in portrait and 8×2
in short landscape windows. Every device can toggle cells; the host serializes
actions and shares state. Selecting it starts a fresh board. It remains a
cooperative experiment rather than a scored game.

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

**Sumo Bumpers** is a competitive ring-out game for two to eight players.
Everyone present at Start Bumpers joins; late arrivals watch until Bump Again.
A three-second countdown gives everyone time to find their numbered, colored
bumper. Drag the large thumb pad in any direction to accelerate, and release to
brake. While moving, tap Dash with your other thumb for a short burst; it recharges
in two seconds. On a keyboard, focus the ring and hold arrows/WASD, with Space to
dash. The second thumb works while movement remains held.

Bumpers transfer momentum on contact. Your center crossing the bright ring edge
eliminates you; eliminated bumpers stop colliding. The ring shrinks continuously
through a maximum sixty-second round. Last survivor wins, simultaneous final
ring-outs draw, and any survivors at the time limit share the win. Bump Again
starts a fresh round with everyone currently connected.

The host simulates fixed 120 Hz steps and sends bounded full snapshots. Movement
vectors are normalized, messages use existing epochs/sequences, and held inputs
expire after 375 ms without renewal. Releasing, losing focus or backgrounding a
client clears its input; momentum slows naturally. Pause, host backgrounding,
pairing and scheduling stalls freeze play and clear movement/momentum. Resume
Bumpers uses a fresh three-second countdown with the same ring and recharge timers.
A participant leaving resets the round; a spectator leaving preserves it.
Confirmed bumper positions are smoothed without predicting ring-outs, with exact
paused/eliminated positions and reduced-motion support. Optional local sounds
announce start, dash, your ring-out and the result; sound remains muted by default.
Update **every device** before selecting Sumo Bumpers: older builds cannot validate
its state or inputs. Pairing, offline support and saved preferences are unchanged.

**Spaceship Panic** is a cooperative mission for two to eight
players, with solo practice available. The host chooses 1, 2, or 3 minutes before
launch or a rematch; the default is 3 minutes. Everyone present at launch joins
the crew.
Each device owns three uniquely named controls with settings 0–3, and sees one
instruction for the next crew member's panel. Read your order aloud, listen for
orders naming your controls, and set the requested number. Solo orders address
your own panel. Controls are host-authoritative; selected settings update after
confirmation. Per-control revisions reject stale/repeated settings.

The ship starts with 100 hull. Completed orders restore 3 hull (capped at 100);
a missed deadline costs 15, and a wrong setting on a currently requested control
costs 5. Changing an unrelated control does not damage the ship. Orders reset
after two seconds of feedback, and deadlines shorten from 18 to 10 seconds as
the mission progresses. Orders never conflict on a control. Keep hull above zero
until the mission timer ends to win together; zero hull ends the mission early.
The host can pause/resume with timers frozen, or launch again after either result.
Pairing/backgrounding the host pauses the mission; a long scheduling stall pauses
instead of fast-forwarding. Late arrivals watch until the next launch. Losing a
crew member resets the mission, while a spectator leaving preserves it. Existing
connections, offline support and muted local sound preferences remain in use.
Update every device before selecting Spaceship Panic; older builds do not
understand its new room state and control action. Update all devices to use the
mission-length options; snapshots without a duration retain the three-minute
default. Saved identities/sound settings
and pairing formats are unchanged.

**Light-cycle Arena** is a competitive grid game for two to eight players. Everyone
present when the host starts rides; late arrivals watch until the next round.
After a three-second countdown, riders move automatically one cell every 150 ms
on a shared 32×32 arena. Steer with the four large arrow buttons, swipe on the
arena, or focus the arena and use arrow keys/WASD. Arrow buttons are about 80×64px
with 10px gaps, including on narrow phones. Touch buttons turn on contact.
Only one perpendicular turn is accepted per step; reversing is forbidden. Each
rider has a distinct color and number, with names and elimination status below.

Walls and all trails—including your own and eliminated riders’ trails—are lethal.
Collisions resolve simultaneously: riders entering the same cell or swapping
positions both crash. The last survivor wins; if everyone crashes on the final
step, the round draws. At sixty seconds of movement, remaining riders share the
win. Ride Again starts a fresh round with everyone currently connected.

The host simulates fixed grid steps and shares compact, bounded full-board
snapshots. Heads and continuous trails animate between confirmed cells over 150 ms,
following corners without predicting future moves. Pauses, crashes and skipped
snapshots snap to the confirmed state; reduced-motion preferences retain grid steps.
Turns use the existing epoch and input sequence checks; the first valid
turn received before a step is applied. There is no client prediction or rollback,
so steer early on slower Wi-Fi. Pause, host backgrounding, pairing, or a scheduling
stall freezes play; Resume Arena gives another three-second countdown. A rider
leaving resets the round; a spectator leaving preserves it. Optional local sounds
announce movement starting, your crash, and the result; sound remains muted by
default. Update every device before selecting Light-cycle Arena: older builds do
not understand its state or turn input. Pairing and saved preferences are unchanged.

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

A new service worker waits rather than forcing an update during play. Menu’s
**Check for updates** fetches the latest service worker when online. Once its assets
are cached, **Update app** activates it and reloads the app. During a session, a
confirmation explains that this ends the connection; canceling keeps the game open.
Updating a host disconnects its players. Update each device between games. Other
open tabs keep playing until their own reload. Failed/offline checks preserve the
current playable build. A small UTC build timestamp appears in Menu, followed
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

## Treasure Dive

A 2–8 player push-your-luck expedition through a sunken ship. Everyone connected
at Start joins three dives of up to six shared doors. Select Return, Explore, or
Explore with shield, then Lock choice. The host confirms the lock; other choices
stay secret until the shared reveal. Each door allows at most eight seconds to
choose; a missing choice Returns safely. All locks can reveal early.

Return banks your entire haul before a card is drawn. Each dive starts with a
fresh host-shuffled deck: four hazards and treasures 2, 2, 3, 3, 4, 4, 6, 10.
Everyone exploring gets the full treasure value. An unprotected hazard loses
only the temporary haul and sends you to the boat for this dive. One shield per
dive protects one door, even against a hazard, but is spent on treasure too.
Remaining hazard odds are visible; future cards and locked actions stay only on
the host. Survivors bank automatically at door six. Banked points never decrease.

A three-second countdown, two-second reveals, and four-second automatic summaries
keep the match within 3:15 of active time. Empty expeditions skip the remaining
doors. Everyone rejoins each new dive with a fresh shield. Highest banked total
wins, with shared wins for ties. Standings shows full names, per-dive scores,
status, and revealed outcomes; the main screen emphasizes your own haul and choices.

The host can Pause, Resume (with a three-second reorientation countdown), Stop to
setup, rematch, or switch games without re-pairing. Pauses preserve the phase,
remaining time, deck, and locked choices. Inviting a player, host backgrounding,
or a scheduling stall pauses play; a backgrounded client gets the normal timeout
fallback. Late arrivals watch until the rematch. A participant disconnect resets
to setup; spectator departures preserve play. Games and scores are temporary.

During a dive, Help and Standings stay beside the host controls. Pending updates
use a short notice; short landscape windows retain the indicator and update
action in Menu to keep the play surface clear.

Update the app on **every device** before selecting Treasure Dive, then pair again
if versions differ. Identity and sound preferences retain their existing storage.
No new services, dependencies, external media, or persistent progression are used.

## Meteor Minigolf

Two to eight players each take one simultaneous shot on five fixed cosmic greens:
Open green, Bank shot, Mushrooms, Meteor, and Mixed course. Balls pass through one
another. Drag from your numbered ball toward the desired direction; distance sets
power. Release keeps the preview arrow. Angle and Power sliders offer touch and
keyboard alternatives (0° right, 90° down); short phones open them with Adjust aim. Tap Ready to commit; the host confirms
the lock, and shots stay private until launch. Missing Ready skips just that hole
for 0 points. The next hole always gives everyone a fresh chance.

A ball within 24 logical units of the cup at speed ≤170 earns 100 points. Otherwise,
at the rolling deadline it earns `max(0, 70 - floor(distanceToCup / 8))`. Five hole
scores add up; tied totals share the win. Standings shows each player's five-hole
breakdown. Your total, ball number, timer, and result stay on your screen without
squeezing in eight names.

The host runs a 1,000 × 700 course at fixed 120 Hz steps. Power 0–1 maps to speed
100–1,100; rolling resistance is `exp(-1.25 × dt)`. Walls and boundaries retain
75% of normal bounce velocity; mushrooms add an outward 160-unit/s impulse with a
0.4-second cooldown. Wind direction is visible before aiming, while a shared
strength of 0, 12, or 24 units/s² is revealed at launch. Meteor holes show a radius-90
warning; the shared impact occurs between 4–5.5 seconds and pushes balls outward
by 120 units/s. Captured balls ignore later forces. The arrow previews direction,
not an exact trajectory.

Starting timers are a 3-second countdown followed by 4 seconds of course preview,
20 seconds of aiming, 10 seconds of rolling, and 3 seconds of scores per hole.
Holes advance automatically; these defaults can be tuned after family play.
Pause/Resume preserves the exact phase, shots, scores, and environmental draw, with
a short resume countdown. Pairing, host backgrounding, or a scheduling stall pauses
play. Late arrivals spectate until the next match; losing a participating player
returns to setup. Rematches reset scores and take the current roster. Stop and
Choose Game keep other connected devices paired.

Update the app on every device before playing Meteor Minigolf. It uses the existing
version-2 bounded protocol and leaves saved identity and sound preferences intact.
Courses, artwork, rules, and cached startup are local; no new service or dependency
is required. Matches and scores are temporary. Physical iPhone/iPad touch, home-screen
layout, Wi-Fi pairing, and background/resume checks remain in QA.md.

## Patchwork Picnic

A simultaneous spatial puzzle for 2–8 players. Everyone gets the same three food
shapes each round and fills a separate 6×6 picnic blanket. Tap a piece, tap its
top-left anchor, rotate if needed, and Place to lock. Reset clears the local
preview; Skip leaves your blanket unchanged. Invalid placements cannot be committed.
On short screens, Arrange piece opens a scrollable panel with full-size tap squares.
Keyboard players can Tab to a piece or the board, move with arrows, rotate with R,
and Place with Enter on the board.

Ten rounds follow a short countdown. Each placement window lasts up to 15 seconds;
when everyone locks it ends early. Placements appear together in a three-second
reveal, and the next round starts automatically. Missing input skips that round.
No one takes another player's piece, and speed gives no extra points. Previews stay
local; the host retains committed choices until reveal and owns all offers.

Each filled cell earns 1 point, each orthogonal matching-food edge earns 1, and
completed rows earn 6. Rows never disappear. The shared bonus is drawn at Start:
strawberry corners earn 3 each, cheese border cells 1 each, or the middle four
grape cells 2 each. Its projected value appears throughout and is added once at
match end. Standings shows everyone's blanket and cells/edges/rows/bonus breakdown;
equal highest totals share the win.

Offers use shuffled six-shape and three-food bags. The first round and rounds
7–10 always offer a single square, leaving a useful way to finish crowded rows.
Rotation uses quarter-turns without reflection. Food symbols and outlines supplement
color; the gold outline marks bonus squares. No extra assets or dependencies are needed.

Pause, pairing, host backgrounding, and scheduling stalls preserve the current offer,
remaining time, boards and locks. Resume adds a short countdown. Late arrivals watch
and join the rematch; a participant leaving resets setup, while a spectator leaving
preserves play. Stop returns to setup, and Picnic Again resets the roster and scores.
Switching games retains pairing. Update every device before playing: older builds
cannot understand the new game, while saved identity and sound preferences stay intact.

## Light Seek

Exactly two connected players can Start Seek. Each secretly places five shapes on a
10×10 board: a three-line, three-corner, four-line, four-square and five-plus
(19 tiles). Select a piece, Choose anchor, tap an anchor, Rotate and Place piece.
Placed pieces can be edited until Ready locks a complete legal layout. Pieces may
touch; overlaps and off-board tiles are rejected. Drafts stay on your device.
Setup and turns are untimed: nobody is auto-readied or given an automatic guess.

After both Ready actions are accepted, a three-second countdown reveals the
host’s single first-player draw. Select a cell and confirm Illuminate. Misses (×)
and hits (●) remain visible; ordinary hits hide the piece identity. The last tile
reveals that piece’s color, symbol and complete outline. Turns alternate after
every valid guess, including hits. Find all five first to win immediately, without
an extra reply turn. Results reveal both boards; there are no scores or ties.

The primary screen shows a whole-board preview. Its focused selection dialog has
four 5×5 areas with large touch targets, row letters and column numbers. Arrow
keys navigate the whole grid, R rotates during setup and Enter confirms. My board
shows incoming guesses; changing views preserves the turn. On short landscape
screens the piece tray lives inside the placement dialog. Help and secondary
views scroll when necessary. Miss, hit and found use distinct locally synthesized
sounds, with the existing muted-by-default preference and gesture unlock.

The host’s rendered view is filtered just like clients. Only your own committed
layout is visible before results; spectators see readiness, guesses and found
pieces. Late arrivals watch until a fresh match. Pause preserves layouts,
readiness and the turn; Resume gives a short reorientation countdown. Pairing,
host backgrounding and scheduling stalls pause countdowns. A participant leaving
resets setup; a spectator leaving preserves play. Stop resets setup, and Seek
Again resets the epoch, boards and first-player draw. Update every device before
playing; protocol version 2 and saved identity/sound preferences are retained.
