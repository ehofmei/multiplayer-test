# P2P Game Lab

A small LAN multiplayer game room for family devices. One device hosts; each joining
device has one direct WebRTC DataChannel to that host. There is no gameplay server,
signaling service, STUN/TURN configuration, database, or account.

Pair up to eight devices once using QR codes or copy/paste, then let the host choose
Shared Lights, two-player Pong, three/four-player Arena Pong, Co-op Breakout, Spaceship Panic, Light-cycle Arena, Sumo Bumpers, Reaction Race, Midnight Bakery, Treasure Dive, Meteor Minigolf, Patchwork Picnic, Light Seek, or Glow Clash. Switching games keeps the same
connections. The app is installable and includes latency diagnostics.

Browse all 14 games in the [screenshot gallery](SCREENSHOTS.md). It links directly
to the reviewed images in the selected branch, including course variants and
results. Use GitHub's branch selector to compare `main` with proposed changes.

The [family playtest improvement plan](FAMILY_PLAYTEST_PLAN.md) records the eight
completed improvements from the October 2026 family session. Its closing audit
produced the [family game polish plan](FAMILY_POLISH_PLAN.md), which tracks the
next phase: Midnight Bakery and Treasure Dive are implemented; Patchwork Picnic
is next. Current behavior is documented here, and [QA.md](QA.md) tracks browser
coverage and remaining physical-device checks.

For possible future additions, [GAME_IDEAS.md](GAME_IDEAS.md) describes twelve
family game ideas with rules, controls, scoring, timing, and implementation
notes. Treasure Dive, Meteor Minigolf, Patchwork Picnic, Light Seek, and Glow Clash are now available; the remaining entries are
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

The app uses a viewport-filling shell with safe-area padding plus clearance below the iOS status edge
(24px in the installed app, 12px in the browser). Home, the game
library, pairing, setup, and play are focused views rather than a long page.
Phones and short windows show four games per library page across four pages; larger iPad windows
show six games per page across three pages. Cards use local illustrations with player-count, Competitive/Cooperative/Shared toy
badges and explicit solo support. Roster guidance updates when players join or
leave; unavailable games can still be opened for setup and Help. Light Seek needs
exactly two connected players. Pong, Arena Pong and Breakout use selected seats,
with everyone else watching. Setup explains missing or duplicate seats before Start.
Previous games / Next games show the current page. Choose Game restores the last
selected card and keyboard focus; resizing keeps the remembered game visible.
A new room starts on page one. On short screens, flavor descriptions give way to
player requirements and seat guidance.
During games, courts fit their remaining space without changing
the game geometry. Landscape layouts place courts beside controls; very short
setup screens omit the court preview to keep assignments and Start reachable.

Menu (or the player-count button) opens the roster, connection details,
installation help, app build/update controls, and Return Home. Add Player is
available in the lobby; during games use Menu → Invite Player, which retains the
existing pause/stop behavior before pairing. Each game's Help button opens the Controls & help panel, which
contains instructions and, for paddle games, color choices and an alternative
slider. Pause/stop, essential status, and touch controls stay on the play screen.
Detailed rider/bumper lists move into Help while playing and appear with results.
Button labels, arrows and nested artwork cannot be text-selected, including on
iOS. Editing inputs, pairing text and Help remain selectable.

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

Illustrated cards keep a short rule visible on phones and show the exact gain in
selection previews. The personal tray pictures each treat count, completed pairs
and cake/sprinkle matches; a lone jelly explains that one more earns 7 points.
Reveals show each baker's gain and completed combination, with a brief arrival
onto the counter. Passing names the next recipient; gremlins get a shared green
notice explaining reversal, cancellation or the two-player kept hand. The final
pick closes the batch rather than promising another pass. One-card hands stay
centered. Crowded reveals on short phones use pictured gain chips; screen readers
retain full card/reward descriptions, and Table & scores keeps full player names.
Batch and bake-off results highlight ranks, leaders/shared champions
and your total, with full names and batch breakdowns in Table & scores.
Optional synthesized lock, reveal, pass, combination and gremlin cues remain
muted by default. Gremlins take priority over simultaneous rewards; batch and
match endings have their own finish cues. Repeated snapshots, late joining and
pause/resume do not replay old sounds. Reduced motion keeps all reward text and
collection indicators. These presentation changes add no network fields or rules; devices that already
support Bakery remain compatible. Update each device to see the polish and hear
the new cues.

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

The board uses raised lamp lenses, warm on lighting and stable numbered ON/OFF
labels. Pressing gives immediate local feedback; a client's light changes only
when the host confirms it. Confirmed changes briefly accent each affected lens,
including remote changes. Feedback coalesces during rapid tapping, and reduced
motion uses a static accent. First snapshots, late joins and background recovery
do not replay earlier effects. Optional quiet on/off clicks and a neutral cue for
mixed changes use the existing muted-by-default synthesizer; skipped toggles with
no observable cell change remain silent. The technical revision count is in
Menu → Connection details, including when hosting alone. Disconnected switches
preserve their last-known states and disable input. No rules or network fields
changed; this polish does not require a coordinated protocol update.
Short landscape places the title beside the instruction to leave larger lenses.
On short disconnected screens, the app title and disconnect warning stay visible
while the duplicate board title is omitted to preserve readable lamps.

**Pong** plays to seven points. The host chooses any two connected players (they
can be two clients); other players watch. The court is vertical and each player
sees their own paddle at the bottom. Drag horizontally anywhere on the visible
court, use the paddle slider, or focus the court and press ←/→. Spectators see
Player 1 at the bottom. Rotation changes only the view and input mapping; host
physics, paddle sizes and the wire coordinates stay the same. Your own paddle draws
immediately, and inputs are coalesced at about 30 Hz. The host simulates the ball
in fixed 120 Hz steps, renders at about 60 Hz, and sends state at about 20 Hz.
Clients smooth the ball between updates. Paddle hits increase speed and change
angle according to the impact position. A one-second serve delay follows each
point. The host can pause/resume and choose new players after a match.
Your paddle has a double notch as well as its color; the scoreboard labels your
bottom side and the opponent's top side. Taller portrait phones (at least 700px
high, up to 650px wide) show a 44px paddle-steering slider below the court.
Short phones and landscape/tablet layouts retain court dragging, arrows and the
Help slider to preserve court space. Ordinary contacts show a brief confirmed
paddle ring or dashed wall ring, behind the solid ball. A faint, bounded trail
follows the displayed ball; Reduce Motion removes it and keeps static contact
feedback. Points identify the scorer and gain during the existing next-serve
delay, with progress and direction. Delayed score updates show each observed gain
briefly beside the rally status, including both players when both totals changed.
Six points marks match point, including both
players at 6–6. The persistent finale shows the winner, final score and your
result (or spectator wording); the host starts Play Again with selected seats.
Update all devices for confirmed contact feedback. The optional bounded contact
field is additive; older hosts can omit it and new clients omit exact visual
impacts while retaining legacy sound inference. Late joining, repeated snapshots,
pause and background recovery do not replay old effects. A delayed update shows
only the newest confirmed contact, rather than reconstructing missing collisions.
Setup and rematch leave at least 12px above the Start/Play Again and Controls &
help buttons, separating them from the player selectors on phones and landscape.
Paddle sizes stay fixed. Long rallies introduce a small central bumper after
8 seconds, then another every 6 seconds, up to four. Each dashed ring warns for
1.5 seconds before becoming solid; solidity waits if the ball is too close.
Filled bumpers reflect the ball as circles, flash white on impact, and play an
optional synthesized bumper tone. Their positions leave wide lanes beside both
paddles. Nearly vertical rebounds get a gentle sideways tilt to escape bumper
orbits. Every point clears the bumpers; pause and the resume countdown freeze
their timers. Ball speed remains capped at 0.95 normalized units per second.
Update **every device** before playing with bumpers: older builds may accept the
snapshot but cannot display the obstacles. Older hosts without bumper fields
remain readable; saved identity and sound preferences keep their versions.
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

Arena's illuminated square court keeps the ball above all feedback. A white notch
marks your paddle; rail numbers match the compact life display, and direction
arrows follow your rotated view. Life pips/counts show remaining lives, with a
steady amber last-life treatment. Misses briefly mark the actual rail location
and decrement lives; an eliminated paddle becomes a solid wall and its controls
turn off. Sound distinguishes confirmed paddle/wall contact, loss and elimination
without celebrating misses. Effects remain outside the ball's path and work muted
or with reduced motion. A steering strip below the court (beside it in short
landscape) complements court dragging, arrow keys and the Help slider.

**Players & lives** opens the host's seat/lives dialog; setup directions refer to
the host's assignments. Full names, viewed sides and color choices remain in
**Help**. The match finale replaces the stopped court with the champion's
name/number and an immediate replay action; changing settings is separate.
Arena snapshots now optionally include one bounded confirmed contact; older
snapshots remain accepted, but update all devices for consistent feedback. This
adds no input action, server or rule change.

Both Pong games offer six named paddle color presets. Players choose their own;
colors are shared with all devices and saved with the local player identity.
Duplicate colors are allowed; numbered rail markers and matching HUD entries
identify Arena players without relying on color. Update all devices before pairing to use Arena Pong.

Both Pong games keep the original gentle serve, then ramp ball speed after two
seconds of each rally even without paddle hits. Paddle hits also give a stronger speed boost,
with bounded top speeds. Every point/lost life resets the ramp; pausing freezes it.
Update all devices before using the new Arena lives settings.

**Co-op Breakout** is a one-to-four-player team arcade game, with solo practice
and spectators. Its luminous court has a compact, symmetric 5×5 core of 25 bricks,
with broad clear lanes toward all four paddles. Each teammate sees their paddle
at the bottom; drag on the court or the steering strip, use ←/→, or open
**Help** for the slider, paddle colors and full team roster. Local paddle
response is immediate and clients smooth confirmed ball snapshots. The host
fills bottom/right/top/left seats in order; unused sides become walls.

Breakout has its own gentle speed ramp and paddle acceleration, capped at 0.60
court widths per second. The ball has at least 0.267 court widths of clear travel
from the core toward each paddle, approximately 445ms at the cap before network
and rendering delays. Serve speed rises slightly across the three cores:
**First light**, **Prism field** and **Supernova**. Everyone shares five lives;
a miss costs one team life and never eliminates a teammate. Clear every core
to win together. Core two adds some reinforced bricks; core three reinforces
all bricks. Reinforced bricks are amber with a + and take two hits. Lives carry
between cores. A one-second serve follows a miss, cleared core or host resume;
new serves after misses/core clears rotate between teammates and reset the ramp.

Confirmed hits flash, destroyed bricks shatter briefly, and paddle saves light
up the paddle. Optional local sounds distinguish hits, breaks and core clears;
sound remains muted by default. Reduced motion uses static flashes and removes
the ball trail and result entrance motion. Pause and connection messages appear
on the court; team victory/loss stays visible with total cleared bricks and
remaining lives until the host chooses to play again. Late arrivals watch until
the next match; a participating player leaving resets the match. Background
handling, manual pairing, offline startup and stored identity/sound/color
preferences retain the existing lifecycle.

**Update every device before playing this Breakout revision.** The new snapshots
require 25 bricks and bounded Breakout speed; older 16-brick builds cannot
validate them. No new client action, pairing protocol version or storage format
is introduced.

**Sumo Bumpers** is a competitive ring-out game for two to eight players.
Its arcade screen uses locally drawn bumper bots with numbered shells, rubber
rims, visors and ground shadows on a raised, tiled arena. A white halo and
chevron mark your bumper; the illuminated cyan ring is the actual elimination
boundary, and striped amber flooring marks the area outside it. The compact HUD,
thumb deck and footer leave the square arena as much viewport space as possible.
Ready screens preview the connected players; countdown and pause messages appear
on the arena. **Help** opens the instructions and full player roster,
including names truncated in the HUD. The surrounding room controls share the
arena's dark palette. Artwork is bundled SVG and needs no external assets.

Everyone present at Start Bumpers joins; late arrivals watch until Bump Again.
A three-second countdown gives everyone time to find their numbered, colored
bumper. Drag the large thumb pad in any direction to steer, and release to
brake. A small neutral area filters thumb jitter, analog travel controls steering,
and the knob stays inside the pad even when your thumb moves beyond it. While
moving, tap Dash with your other thumb for a stronger forward burst; it recharges
in two seconds. A light around Dash fills during recharge; the remaining time
stays visible. Confirmed bursts show a colored trail and an optional descending
swoosh. Reduced motion hides trails while keeping recharge feedback. On a keyboard, focus the ring and hold arrows/WASD, with Space to
dash. The second thumb works while movement remains held.

Bumpers transfer momentum on contact. Your center crossing the bright ring edge
eliminates you; eliminated bumpers stop colliding. The ring shrinks continuously
and keeps closing after sixty seconds, with a faster final squeeze toward the
center. There is no timed survivor win: last survivor wins and simultaneous final
ring-outs draw. Bump Again
starts a fresh round with everyone currently connected.

The host simulates fixed 120 Hz steps and sends bounded full snapshots. Movement
vectors are normalized, messages use existing epochs/sequences, and held inputs
expire after 375 ms without renewal. Releasing, losing focus or backgrounding a
client clears its input; momentum slows naturally. Pause, host backgrounding,
pairing and scheduling stalls freeze play and clear movement/momentum. Resume
Bumpers uses a fresh three-second countdown with the same ring and recharge timers.
A participant leaving resets the round; a spectator leaving preserves it.
Clients smooth confirmed bumper positions without predicting ring-outs; the host
renders its own physics immediately. Paused/eliminated positions stay exact, with
reduced-motion support. Optional local sounds
announce start, dash, firm impacts, your ring-out and the result; sound remains muted by default.
Confirmed firm contacts show short sparks; contact ticks persist between paired
snapshots so clients can see them too. Ring-outs produce a colored flare and a
numbered OUT label, then leave a dimmed bumper for spectators. Short feedback
expires without replaying on pause/resume or rematch. Reduced motion keeps the
flashes static and skips the result entrance animation. The arena result card
shows the winning bumper and name, or a distinct simultaneous draw. Inactive
thumb controls disappear; Bump Again stays available to the host and the full
roster remains in Help.
Update **every device** before selecting Sumo Bumpers: older builds cannot validate
its state or inputs. Update every device for the continued-pressure rules too:
older Sumo builds reject snapshots beyond sixty seconds. Snapshots now include an optional, bounded last-contact tick per bumper; older
snapshots without it remain accepted, but all devices need the latest build to
share collision feedback. No new input actions were added. Pairing, offline
support and saved preferences are unchanged.

**Spaceship Panic** is a timed cooperative score chase for two to eight players,
with solo practice available. The host chooses 1, 2, or 3 minutes (2 recommended
and selected by default), plus Standard or Gentle command pace. Everyone present
at launch joins the crew. The clock completes the mission for everyone; mistakes
never eliminate anyone or end it early. Results stay visible with team score,
completed commands and highest team streak until the host launches again.

Every phone owns three uniquely named, illustrated panels: a color/number panel,
a shape/direction/picture panel, and a two-state switch. Eight panel sets cover
Lights/Shield/Door, Engine/Radar/Fan, Beacon/Cargo/Radio, Gravity/Dock/Window,
Cabin/Map/Airlock, Fuel/Antenna/Pump, Robot/Badge/Magnet and Speed/Pet Screen/Alarm.
Numbers use 0–3 with matching dots; colors use red/blue/yellow/green with labels
and distinct patterns; shapes use circle/square/triangle/star; arrows use
up/right/down/left. Cargo pictures are apple/banana/carrot/fish, Map pictures are
sun/moon/star/Earth, and Pet Screen pictures are cat/dog/fish/bird. Switches use
explicit off/on or closed/open choices. Every setting takes one tap. Local SVGs
match between commands and panels; selected settings have an outline and check.
No external assets or additional dependencies are required.

The cockpit groups the request, deadline and your three panel bays. Tall phones
use larger pictures; landscape iPads use the command beside a larger two-row
setting grid. Short screens retain compact controls with 44px targets. The
deadline meter uses a fixed 26-second scale; at five seconds, an amber outline
and “Time low” label emphasize urgency without ticking or flashing. Its accessible
value uses seconds. Wrong
settings keep a reserved “Wrong setting · try another” hint on the owner's panel;
missed callers see “Time ran out,” a streak reset and confirmation that points
are kept. Results retain team score, completed commands and best streak.

Optional quiet sounds announce your new request, your wrong setting or your
missed order. Caller/panel-owner success gets a short cue; new best streaks of
5 and 10 have visual celebrations for the crew and a host-only chime. At most
one Ship cue plays for a snapshot, with finish and relevant mistakes ahead of
command attention, milestones and success. Timer updates stay silent. Late
joins, pause/resume and background recovery do not replay old cues; sound starts
muted. Order generation numbers and one latest sequenced mistake record provide
bounded feedback without changing inputs or scoring. Rules-2 hosts without
these optional fields still work, with conservative feedback; update all
devices for the complete polish. Panel artwork remains unchanged pending the
family's Door/Window/Airlock recognition check.

Call out your panel name and setting, listen for yours, and match the pictures.
The host randomly chooses another player's available panel (your own in solo;
the other player's in two-player missions), reserving controls to prevent
conflicts. Each success earns 100 points plus 20 per extra consecutive team
success, capped at 300 points per command. Wrong settings on requested controls
and missed deadlines reset the shared streak without reducing earned score.
Wrong settings can be corrected before expiry; unrelated panels are harmless.
Standard deadlines shorten from 18 to 8 seconds and feedback from 2 to 1 second;
Gentle uses 26 to 14 seconds and 3 to 2 seconds. Both ramps follow the fraction
of the chosen mission already played. Controls remain host-authoritative with
revision checks; rapid/stale duplicate inputs cannot score twice.

Pause/resume freezes timers and preserves settings. Host backgrounding, pairing
and long scheduling stalls pause the mission. Late arrivals watch until the next
launch. A crew departure resets the mission; spectators leaving preserve it.
Sound stays optional and muted by default, and success motion respects reduced
motion. **Update every device together** for ship rules 2: hull-based snapshots
are rejected, and switches no longer accept settings 2 or 3. Identity/sound
storage, pairing formats and other games' protocol behavior are unchanged.

**Light-cycle Arena** is a competitive grid game for two to eight players. Everyone
present when the host starts rides; late arrivals watch until the next round.
After a three-second countdown, riders move automatically one cell every 150 ms
on a shared 32×32 arena. Steer with the four large arrow buttons, swipe on the
arena, or focus the arena and use arrow keys/WASD. Arrow buttons are about 80×64px
with 10px gaps. Narrow phones keep a two-row pad; wider screens use one row.
The square-cornered board fills the available play area, with steering beside it
on desktop and short landscape screens. The timer shares the status row. During
play, long rider names stay in Help so they cannot squeeze the arena. Touch
buttons turn on contact.
Only one perpendicular turn is accepted per step; reversing is forbidden. Each
rider has a distinct color and number, a directional nose, and a persistent white
outline on your head. Your identity and facing arrow stay beside the controls;
names and elimination status remain in Controls & help. Pressed arrows respond
immediately; a requested turn has a light border, and a host-confirmed queued
turn has a green border. The forbidden reverse direction has a dashed border.
These indicators do not move a rider early or buffer another turn.

Walls and all trails—including your own and eliminated riders’ trails—are lethal.
Collisions resolve simultaneously: riders entering the same cell or swapping
positions both crash. The last survivor wins; if everyone crashes on the final
step, the round draws. At sixty seconds of movement, remaining riders share the
win. Crashes briefly mark the attempted collision cell (or wall edge), while
wrecks remain at their last safe cell and all trails stay visible. Reduced motion
uses a static impact mark. The frozen arena remains visible at the finish;
Results lists full rider names and winners. Ride Again starts a fresh round with
everyone currently connected.

The host simulates fixed grid steps and shares compact, bounded full-board
snapshots. Heads and continuous trails animate between confirmed cells over 150 ms,
following corners without predicting future moves. Pauses, crashes and skipped
snapshots snap to the confirmed state; reduced-motion preferences retain grid steps.
Turns use the existing epoch and input sequence checks; the first valid
turn received before a step is applied. There is no client prediction or rollback,
so steer early on slower Wi-Fi. Pause, host backgrounding, pairing, or a scheduling
stall freezes play; Resume Arena gives another three-second countdown. A rider
leaving resets the round; a spectator leaving preserves it. Optional local sounds
announce movement starting, your crash, a quiet shared crash cue, and the result;
simultaneous remote crashes produce one cue and the finale takes priority. Sound remains muted by
default. Update every device before selecting Light-cycle Arena: older builds do
not understand its state or turn input. This presentation polish adds no wire fields;
older Light-cycle builds remain compatible but need updating to see the new feedback.
Pairing and saved preferences are unchanged.

**Reaction Race** has six targets and ten rounds for everyone present at the start
(or solo practice). After a random 1.2–3 second wait, hit the marked target within
two seconds. Rounds 3 and 7 say Hold and show a decoy: leave every target alone.
One attempt per round prevents repeated taps. Correct hits earn
`max(10, 100 - floor(response_ms / 20))` points; early/wrong taps cost 25, missed
hit rounds earn zero, and successful hold rounds earn 75. Scores accumulate,
round results show each player's response, and equal final scores share the win.
The host can stop a race or start a rematch. Arcade pads keep the same positions
through waiting, TAP/HOLD and scored feedback. The personal feedback beside the
pads shows the exact hit reward and response time, hold reward, or penalty/reason;
a scored wrong/early tap marks the touched pad separately from the intended hit
target, without revealing the target before activation. A compact strip shows
your total and round progress; live standings and everyone's latest response
remain available in Controls & help. The finale highlights every shared winner, numbered
ranks and final totals; standings scroll within the results on short screens.
An early attempt has a short double tone distinct from the descending wrong-tap
cue. Feedback works muted and without motion; cues never animate into visibility.
Touch still scores on contact, and keyboard/assistive clicks keep the same rules.
These presentation changes add no network fields or storage migrations. Older
versions still pair and score correctly; devices can update independently to get
the new visuals and cues.

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
Ordinary Pong paddle/wall sounds use confirmed host contacts when available;
bumper, point and finish outcomes take priority. A delayed client update may omit
a very brief bounce. Physical iPhone/iPad audibility and background/resume need device testing.

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
stay secret until the shared reveal. Choosing has no deadline: every exploring
diver must lock before the card is drawn. Return remains an explicit choice.

Return banks your entire haul before a card is drawn. Each dive starts with a
fresh host-shuffled deck: four hazards and treasures 2, 2, 3, 3, 4, 4, 6, 10.
Everyone exploring gets the full treasure value. An unprotected hazard loses
only the temporary haul and sends you to the boat for this dive. One shield per
dive protects one door, even against a hazard, but is spent on treasure too.
Remaining hazard odds are visible; future cards and locked actions stay only on
the host. Survivors bank automatically at door six. Banked points never decrease.

A three-second countdown, two-second reveals, and four-second automatic summaries
pace the action between untimed choices. Empty expeditions skip the remaining
doors. Everyone rejoins each new dive with a fresh shield. Highest banked total
wins, with shared wins for ties. Standings shows full names, per-dive scores,
status, and revealed outcomes. Boat, chest and shield pictures distinguish banked
points, carried haul and protection. Each action shows the exact haul to bank,
risk or protect; selection remains local until Lock choice. Numbered rooms lead
through the underwater wreck. Reveals show treasure joining the haul, returning
to the bank, shield absorption or a catch that leaves the bank safe. Short,
distinct synthesized cues accompany these outcomes when sound is enabled;
muted and reduced-motion play retain the same explicit feedback. Pauses and
late joins do not replay old effects.

The persistent finale replaces live rooms and odds with the winner/shared
winners, your bank and rank, all final banked totals and three-dive breakdowns.
Full names remain available in Standings. Short phones prioritize pictured
actions and readable inventory over scenic decoration.

The host can Pause, Resume (with a three-second reorientation countdown), Stop to
setup, rematch, or switch games without re-pairing. Pauses preserve the phase,
remaining time, deck, and locked choices. Inviting a player, host backgrounding,
or a scheduling stall pauses play. A backgrounded client keeps their choice;
everyone waits until they return and lock, or the host stops the match. Late
arrivals watch until the rematch. A participant disconnect resets
to setup; spectator departures preserve play. Games and scores are temporary.

During a dive, Help and Standings stay beside the host controls. Pending updates
use a short notice; short phone and landscape windows retain the indicator and update
action in Menu to keep the play surface clear.

Update the app on **every device** before selecting Treasure Dive, then pair again
if versions differ. Identity and sound preferences retain their existing storage.
No new services, dependencies, external media, or persistent progression are used.

## Meteor Minigolf

The five greens share a miniature cosmic-garden style: subtle mown-grass texture,
star details, beveled garden edging, stone bank-shot walls, rounded mushroom
caps, and a recessed cup with a golden flag. Meteor landing markers retain the
full warning radius and become a small crater after impact. Shaded balls and
contact shadows keep player colors and numbers readable. All artwork is local
SVG; textures and depth are decorative, with the same flat surface, collision
geometry, shot controls, and scoring on every device.

The course and controls sit in one dark garden frame. The green turns upright
when the available space makes it meaningfully larger, keeping labels and the flag
upright and the whole course visible. Short phones retain a wide green and open sliders
with Adjust aim. Angles and wind directions follow the screen (0° right, 90° down);
turning the view preserves the same shot and shared world on every device.
Weather feedback uses plain language; detailed rules remain in Help.

Two to eight players each take one simultaneous shot on five fixed cosmic greens:
Open green, Bank shot, Mushrooms, Meteor, and Mixed course. Balls pass through one
another. Drag from your numbered ball toward the desired direction; distance sets
power, with the same drag distance giving the same power on every screen. A suggested
direction appears immediately. Release keeps the preview; cancelling restores the
previous aim. The numbered ball has a bright outline and a generous grab area.
The power meter marks Gentle, Medium and Strong; 0% cannot be confirmed.
Angle and Power sliders offer touch and
keyboard alternatives (0° right, 90° down); short phones open them with Adjust aim. Tap Ready to commit; the host confirms
the lock, and shots stay private until launch. Aiming has no deadline. The last
Ready launches everyone together; no shot is skipped automatically. Readiness
counts stay visible, and Standings identifies who is still choosing.

A ball within 24 logical units of the cup at speed ≤170 earns 100 points. Otherwise,
once all balls settle it earns `max(0, 70 - floor(distanceToCup / 8))`. Five hole
scores add up; tied totals share the win. Standings shows each player's five-hole
breakdown. Your total, ball number, readiness, and result stay on your screen without
squeezing in eight names.

The host runs a 1,000 × 700 course at fixed 120 Hz steps. Power 0–1 maps to speed
`1450 × power^1.4`; zero power means zero launch speed and is rejected by the host.
The curve gives finer gentle shots and enough maximum speed for deliberate bank
shots; rolling resistance is `exp(-1.3 × dt)`. Walls and boundaries retain
75% of normal bounce velocity; mushrooms add an outward 160-unit/s impulse with a
0.4-second cooldown. Wind direction is visible before aiming, while a shared
strength of 0, 12, or 24 units/s² is revealed at launch. Wind influence fades
with ball speed below 100 units/s; balls below 3 units/s settle, so wind cannot
keep a resting ball drifting indefinitely. Meteor holes show a radius-90
warning; the shared impact occurs between 4–5.5 seconds and pushes balls outward
by 120 units/s. Captured balls ignore later forces. The arrow previews direction,
not an exact trajectory or distance; its length stays fixed when power changes.

Moving balls keep their shading and contact shadows, with a subtle rolling seam.
The renderer smooths confirmed snapshots over 50ms, passing through detected
rebound points rather than cutting across obstacles. It never extrapolates past
the host's latest position. Pauses, captures, results and gaps over 250ms use exact
positions. Reduced motion uses exact snapshots and brief static contact highlights.

Launch has a small pulse and putter tap; rails and stone walls flash with a soft
knock; mushrooms squash and rebound with an outward pulse and spring cue; a meteor
impact produces a bounded burst and low thump. The visible warning retains its
full force radius and does not reveal impact timing. These cosmetic cues use
confirmed velocity changes, existing mushroom cooldowns and the impact flag;
contacts missed during a longer network gap are omitted instead of replayed.
Impact effects last at most 450ms, share a pulse for simultaneous hits at the same spot,
and are capped at 16. Sounds use the existing local synthesizer, voice limit,
gesture unlock and saved mute preference. Sound stays off by default.

On a newly confirmed capture, the ball shrinks into the recessed cup over 350ms,
with a small sparkle lasting up to 650ms and an optional plop/chime. Ball numbers
remain readable; simultaneous captures share one sparkle and sound. Pauses,
backgrounding, reconnects and late arrival never replay a drop. Reduced motion
hides the captured ball immediately and uses a 150ms static highlight. Cup and
near-cup points appear in a large card beside the green, retaining the short
three-second between-hole sequence.

Final rankings replace the playing workspace and remain until the host starts
another match. Every golfer's full name, total and five-hole breakdown is on the
screen; tied totals share a rank and all highest totals are marked as winners.
Long lists scroll inside a keyboard-focusable ranking area on short screens or
with larger text, while the host's Play Again action stays available.

A 3-second countdown starts the match; each hole has 4 seconds of preview and
3 seconds of scores. Aiming waits for every Ready. Rolling has no cutoff: balls
finish naturally, including a pending meteor that could move a resting ball.
The host preserves fractional 120 Hz step time through pause/resume. Holes then
advance automatically.
Pause/Resume preserves the exact phase, shots, scores, and environmental draw, with
a short resume countdown. Pairing, host backgrounding, or a scheduling stall pauses
play. Late arrivals spectate until the next match; losing a participating player
returns to setup. Rematches reset scores and take the current roster. Stop and
Choose Game keep other connected devices paired.

Update the app on every device before playing Meteor Minigolf, including the host
for the revised power curve and zero-power guard. It uses the existing
version-2 bounded protocol and leaves saved identity and sound preferences intact.
Courses, artwork, rules, and cached startup are local; no new service or dependency
is required. Matches and scores are temporary. Physical iPhone/iPad touch, home-screen
layout, Wi-Fi pairing, and background/resume checks remain in QA.md.

## Patchwork Picnic

A simultaneous spatial puzzle for 2–8 players. Everyone gets the same three food
shapes each round and fills a separate 6×6 picnic blanket. Tap a piece, tap its
top-left anchor, rotate if needed, and Place to lock. Reset clears the local
preview; Skip leaves your blanket unchanged. The score forecast separates points
on Place (cells, new matching edges and completed rows) from the projected bonus
change saved for the finale. New matching edges and completed rows are marked on
the preview. Rotate updates both the selected offer picture and the footprint;
invalid squares carry a cross as well as a red outline. Invalid placements cannot be committed.
On short screens, Arrange piece opens a scrollable panel with full-size tap squares.
Keyboard players can Tab to a piece or the board, move with arrows, rotate with R,
and Place with Enter on the board.

Ten rounds follow a short countdown. Placement has no deadline: everyone must
Place or explicitly Skip. Placements appear together in a three-second reveal,
and the next round starts automatically. Waiting players see readiness counts;
Standings identifies who is still choosing.
No one takes another player's piece, and speed gives no extra points. Previews stay
local; the host retains committed choices until reveal and owns all offers.

Each filled cell earns 1 point, each orthogonal matching-food edge earns 1, and
completed rows earn 6. Rows never disappear. The shared bonus is drawn at Start:
strawberry corners earn 3 each, cheese border cells 1 each, or the middle four
grape cells 2 each. Its projected value appears throughout and is added once at
match end. The main finale identifies the winner or shared winners, your tied rank
and final total. Standings offers larger blanket comparisons with ranks and each
cells/edges/rows/bonus breakdown;
equal highest totals share the win.

Offers use shuffled six-shape and three-food bags. The first round and rounds
7–10 always offer a single square, leaving a useful way to finish crowded rows.
Rotation uses quarter-turns without reflection. Food symbols and outlines supplement
color; gold outlines and small stars mark bonus squares. Centered offer pictures,
subtle stitching and food shadows keep the cell boundaries readable. Placement
and completed-row sounds are distinct; row feedback takes priority, remains visible
when muted and stays still with reduced motion. Repeated snapshots, skips, watching
and pause/resume do not replay placement sounds. No wire fields, assets or dependencies
were added for this polish.

Pause, pairing, host backgrounding, and scheduling stalls preserve the current offer,
remaining time, boards and locks. Resume adds a short countdown. Late arrivals watch
and join the rematch; a participant leaving resets setup, while a spectator leaving
preserves play. Stop returns to setup, and Picnic Again resets the roster and scores.
Switching games retains pairing. Update every device before playing: older builds
cannot understand the new game, while saved identity and sound preferences stay intact.

## Light Seek

Exactly two connected players can Start Seek. Each secretly places five shapes on a
10×10 board: a three-line, three-corner, four-line, four-square and five-plus
(19 tiles). Choose a shape, tap its anchor on the full board, Rotate and Place piece.
Placed pieces can be edited until Ready locks a complete legal layout. Pieces may
touch; overlaps and off-board tiles are rejected. Drafts stay on your device.
Setup and turns are untimed: nobody is auto-readied or given an automatic guess.

After both Ready actions are accepted, a three-second countdown reveals the
host’s single first-player draw. Select a cell and confirm Illuminate. Misses (×)
and hits (●) remain visible; ordinary hits hide the piece identity. The last tile
reveals that piece’s color, symbol and complete outline. Turns alternate after
every valid guess, including hits. Find all five first to win immediately, without
an extra reply turn. Results reveal both boards; there are no scores or ties.

The primary screen has one directly tappable 10×10 board with row letters and
column numbers. Setup uses five pictured piece buttons made from miniature board
tiles; checkmarks show placed pieces. Select a placed piece to move it, preview
its new footprint, then confirm Move piece. Edge and overlap errors are distinct;
an invalid draft leaves its previous position intact. Rotate, Place/Move and Ready
stay explicit. Ready waits for host confirmation.

During play the miniature collection lights up only when a whole piece is found;
ordinary hits reveal no identity or partial piece progress. Turn status, selected
coordinates and the last confirmed result remain separate. Tap a cell or slide a
finger across the board to adjust the preview; release never submits a search.
Cancelling a gesture or releasing outside the board restores the prior selection.
Illuminate names the selected coordinate; already-searched cells cannot be
submitted. Arrow keys navigate without wrapping, R rotates during setup and Enter
confirms. Cell contents remain readable through inset selection marks and brief
confirmed-light feedback. My board shows incoming guesses. Landscape tablets and
short landscape phones keep controls beside the board; portrait phones keep the
tray below it. Secondary views scroll when necessary.

Results promote the winner and reveal both boards, with found counts, dim tiles
that were still hidden and gold dots on illuminated tiles. Portrait phones have
labeled board switches so each revealed board remains large; both are displayed
side by side on wider screens. The host can Seek Again; other players see replay
waiting. Placement, accepted Ready, a new local turn, miss/hit/found and match
finish use optional locally synthesized sounds, muted by default with the existing
saved preference and gesture unlock. The final discovery prioritizes the finish
cue. Repeated snapshots, late joining and pause/resume do not replay old cues.

Spectators follow the board receiving the latest confirmed search, with its owner
labeled above the board and the matching found-piece collection.

The host’s rendered view is filtered just like clients. Only your own committed
layout is visible before results; spectators see readiness, guesses and found
pieces. Late arrivals watch until a fresh match. Pause preserves layouts,
readiness and the turn; Resume gives a short reorientation countdown. Pairing,
host backgrounding and scheduling stalls pause countdowns. A participant leaving
resets setup; a spectator leaving preserves play. Stop resets setup, and Seek
Again resets the epoch, boards and first-player draw. Update every device before
playing; protocol version 2 and saved identity/sound preferences are retained.

## Glow Clash

A simultaneous hidden-choice game for 3–8 players. The host chooses 5, 8 or 12
rounds (8 by default). Everyone gets a random unused one of twelve neon
colors in setup and may claim another free color. Setup uses glowing swatches
without visible color names; accessible labels identify each color and owner. The host resolves competing
color requests; taken colors keep their owner. Settings, colors, participants
and the four-column board (one row per starting player) freeze at Start.

Tap exactly three different cells, then **Lock picks**. **Clear** resets the local
draft; a host-confirmed lock is final. Only readiness and your own confirmed
picks are visible before the last player locks. Selection is untimed: there are
no automatic picks, missing submissions or speed bonuses. **Players & scores**
shows who is still choosing. After the last lock, everyone sees **Everyone’s
locked in · revealing…** for 1.5 seconds. Picks and new scores stay private during
that beat, then every tile reveals and the round scores once. A unique claim earns 1 point; a collision earns nobody points.
Collision tiles show one broad diagonal band per selecting color, ordered by
player number. Tap any revealed tile for full names, numbered identities, color
names and its score explanation.

Reveals show a clear **+0–3 points** gain and your cumulative total above the
board. Your three picks retain an inset outline, including collisions; keyboard
focus has an outer outline. Reveals last six seconds after the settling beat,
then a fresh board opens automatically. The compact round-score strip uses small
color swatches beside names and totals, with space between its two columns.
Numbered player identities remain in setup and detailed views.
After the last reveal, the main screen
shows ranked totals, an explicit winner or shared winners, and your **You** row.
A brief celebratory glow respects reduced motion. Final rankings wait for the host;
**Inspect board** retains the last board and **Players & scores** includes every
per-round gain and full name.
**Clash Again** starts fresh scores with the current roster and retained colors.
Stop during play or **Back to setup** at match end returns to setup, where colors
and round count can be adjusted again.

Keyboard: Tab to the grid, arrows to move focus, Space/Enter to toggle. Narrow
portrait phones keep all four columns and at least 44px tiles. Short landscape
screens use **Pick tiles** / **Inspect board** for a scrollable full-size board;
**Colors & rounds** opens setup there. Full rosters, help and details scroll in
focused dialogs. The tiles stay unmarked: vibrant neon rainbow fills show unique claims, and diagonal
bands show collisions. Numbered identities, coordinates and score explanations
remain available in accessible labels, the legend and tile details. No sound is needed.

Pause, pairing, host backgrounding and long timer stalls preserve locks, scores,
colors and remaining settling/reveal time. Resume adds a three-second countdown. Late
arrivals spectate without resizing the board; a participant leaving resets setup
and releases their color while retaining everyone else's assignments. All devices
must update before playing the revised Glow Clash; older apps reject the new
settling phase. Locally synthesized lock, scoring and result cues use the existing
muted-by-default sound setting and do not replay on resume.
Saved identity and sound settings keep their existing versions. Match length
follows the group's pace because choosing is deliberately untimed.

## Decision timing

Minigolf, Treasure Dive, and Patchwork Picnic wait for every participating
player's explicit confirmation. There are no automatic missed choices or time
penalties. Midnight Bakery, Glow Clash, and Light Seek already use untimed decisions.
Short starts, reveals, reaction measurement, and action-game clocks remain;
Spaceship Panic intentionally retains timed commands and missions. Stop and
participant-disconnect reset provide an exit if someone cannot finish choosing.
Optional synthesized confirmation, score and result sounds follow the existing
saved mute setting, and brief scoring animation respects reduced motion.

Update **every device** before playing these revised rules. The version-2 wire
format remains bounded, but timing validation and Golf's fractional-step field
changed; mixed builds can show the existing unsupported-message update prompt.
Identity and sound storage are unchanged.
