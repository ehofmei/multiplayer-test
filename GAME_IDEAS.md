# Short family game ideas

This is a design catalog for ten additions to P2P Game Lab. Treasure Dive and
Meteor Minigolf have been implemented; see README.md for their shipped behavior.
The remaining entries are proposals. Each proposal defines a first
playable version closely enough that a later Codex session can choose one and
build it without inventing the core rules. Implement the game the user selects;
the catalog is not an instruction to build all ten.

The goal is meaningful participation plus enough uncertainty for an occasional
underdog win. Choices, observation, coordination, or touch skill should improve
your chances, while a single mistake should not make the remaining match feel
pointless. Numeric values below are proposed starting defaults, not proven
balance. Preserve each concept's identity when tuning them after family play.

| Idea                                               | Type                   | Main interaction                   |
| -------------------------------------------------- | ---------------------- | ---------------------------------- |
| [1. Treasure Dive](#1-treasure-dive)               | Push your luck         | Return, explore, or spend a shield |
| [2. Meteor Minigolf](#2-meteor-minigolf)           | Touch aiming / physics | Aim and power a single shot        |
| [3. Patchwork Picnic](#3-patchwork-picnic)         | Spatial puzzle         | Select, rotate, and place shapes   |
| [4. Secret Suitcases](#4-secret-suitcases)         | Bluffing / deduction   | Claim, trust, or challenge         |
| [5. Cloud Couriers](#5-cloud-couriers)             | Route-planning race    | Choose a route and optional boost  |
| [6. Monster Market](#6-monster-market)             | Auction / prediction   | Bid on one item or pass            |
| [7. Treasure Shuffle](#7-treasure-shuffle)         | Memory / observation   | Follow chests and choose one       |
| [8. Castle Critters](#8-castle-critters)           | Tactics / dice         | Allocate three critters            |
| [9. Doodle Dice](#9-doodle-dice)                   | Creative party game    | Draw, guess, and award pictures    |
| [10. Kitchen Catastrophe](#10-kitchen-catastrophe) | Cooperative planning   | Prepare, serve, or clean together  |

## Shared product and implementation requirements

### Audience and match length

- Support two to eight connected players unless a proposal explicitly adds solo
  practice. Everyone connected at Start participates, including the host; late
  arrivals spectate until the next match. Disable Start with fewer than two
  players in these first versions.
- Use simultaneous decisions or parallel activity. Avoid a queue of eight
  sequential turns and avoid permanent elimination. Show what happened and why
  after a resolution, including a readable score breakdown.
- Aim for games that ideally finish in five minutes or less. This is a design
  preference, not a hard time limit. The phase timers below are starting ideas
  to tune through playtesting, not measured or guaranteed match durations.
  Pairing, instructions before Start, deliberate pauses, and reviewing final
  results are separate from playing the match.
- Advance rounds automatically. Never require every player to tap Continue or
  the host to start the next round. Every input window has a timeout fallback;
  distracted players cannot stall the whole room. Tune the proposed phase timers
  for comfortable family play rather than treating them as fixed budgets.
- Competitive ties share the win. Do not add a potentially unbounded tiebreaker.
  Cooperative games give everyone the same team result.
- Prefer pictures, small integers, plain labels, and one short example in Help.
  Secret Suitcases and Doodle Dice require some reading or an adult reading the
  prompt aloud; do not assume every game is equally accessible to a non-reader.

### Touch screens and presentation

Target installed iPhone/iPad PWAs first. The main board, essential status, and
controls should fit the viewport with safe-area clearance. Keep instructions,
full score tables, and roster details in focused dialogs with accessible
internal scrolling. Large rooms must not shrink every control to make space for
eight names: emphasize your own state and put the full roster behind a player
button.

Use at least 44px touch targets, clear selection/locked/disabled states, visible
keyboard focus, and symbols or numbers alongside colors. Prefer tap-to-select
and tap-to-place as an alternative to dragging. Provide keyboard equivalents
where the interaction makes sense. Disable gesture scrolling only on a play
surface that needs it. Sound stays optional, synthesized locally, and muted by
default; all game information must be visible without sound. Respect reduced
motion.

Create simple local SVG, CSS, or canvas artwork. No remote fonts, downloaded
assets, image-generation dependency, new service, account, or backend is needed
for these first versions. Do not require a shared television or one device that
everyone must gather around: each phone should show enough to play.

### Fair decisions and randomness

The host owns randomness and outcomes. Inject a deterministic random source into
game logic for tests. Draw future events only on the host; do not expose a seed,
future random schedule, hidden hands, or other players' locked decisions in
client snapshots. Share current forecasts, visible probabilities, and revealed
outcomes. Where everyone faces the same challenge, use the same layout and
environmental random outcome rather than favoring one player's device.

For discrete competitive decisions, keep draft selection local and send a final
locked action. Kitchen intentionally shares revisable team intents, and Doodle
shares bounded drawing revisions before its final lock; their exceptions are
specified below. The host accepts it only for the current epoch, phase, round,
and participating player. Show authoritative confirmation of a lock. Conflicting
simultaneous actions resolve by an explicit game rule, not network arrival
order. Do not score how quickly an auction bid, puzzle placement, or tactical
order reaches the host. Use host-owned remaining active time; client countdowns
are presentation only.

Chance should be understandable: show the range of a gust, the remaining hazard
odds, or the possible customer preferences before a decision. Avoid hidden
handicaps, secretly boosting the last-place player, or completely rerolling the
winner at the end. State any catch-up opportunity as an ordinary rule available
to everyone. Doodle Dice intentionally has softer, subjective competition; it is
not as strong a fit for literal randomized winning chances as Treasure Dive.

### Existing architecture and lifecycle

Keep the static, offline-capable app under `/multiplayer-test/`. Reuse manual
QR/text WebRTC pairing and the existing room rather than making a separate app.
Useful existing integration points are:

- [src/games/model.ts](src/games/model.ts): `GameKind`, `GameInput`, `Room`,
  names, and initial state.
- [src/games/validate.ts](src/games/validate.ts) and
  [src/network/protocol.ts](src/network/protocol.ts): bounded state/action
  validation. The current protocol is version 2 and rejects JSON strings longer
  than `MAX_MESSAGE = 16_384` characters. Budget the complete serialized
  message, including the room, players, names, and envelope, not just the game
  payload.
- [src/network/session.ts](src/network/session.ts): host orchestration, timers,
  input sequencing, state broadcasts, participant membership, and cleanup.
- [src/games/bakery.ts](src/games/bakery.ts): a useful example of private hands,
  locked simultaneous choices, a pure reducer, injected randomness, and a
  recipient-specific view. Bakery is currently untimed; do not copy its timing
  behavior without adding sensible timeout fallbacks.
- [src/components](src/components) and [src/App.tsx](src/App.tsx): game screens,
  host controls, help, and the picker. Extend the paged picker rather than
  squeezing more cards onto a small phone.
- [src/audio](src/audio) and [src/pwa](src/pwa): existing sound preferences and
  user-controlled updates.

Put pure rules in `src/games/<game>.ts` and UI in a focused component. Proposed
state fields and action names in each idea are conceptual, not a requirement to
copy a particular schema. Derive scores when practical; do not maintain multiple
independent copies of the same total. Bound every array, numeric value, drawing,
and enum. Reject actions from spectators, invalid indices, duplicate locks,
outdated phases/rounds, and earlier room epochs. Player identity comes from the
connection, not a client-supplied target identity. Validate new network fields
in both the protocol and room validators. Adding a new game requires updating
every participating device; tell users this in README and help without changing
saved identity/sound storage unnecessarily.

Hidden state stays only on the authoritative host. Filter every outgoing view,
including the host's rendered view and spectator views, to what that viewer may
know. This remains a trusted family-host system, not an anti-cheat project.

The host can Pause, Resume, stop back to setup, start a rematch, or choose
another game. Opening pairing, host backgrounding, and a long scheduling stall
pause active timers rather than fast-forwarding through decisions. Preserve
committed choices, scores, boards, and already drawn randomness. On resume,
restore the same phase and remaining time after a short reorientation countdown;
do not reroll an unfavorable result. Pauses and resume countdowns may
extend a match; preserving a comfortable pace matters more than an exact total.
Clear held touch input when hiding or losing focus. A backgrounded client may miss decisions and receives
the normal timeout fallback; its device must not freeze the host's match.

A participant disconnect resets the match to setup while preserving remaining
connections. A spectator disconnect preserves play. Losing/reloading the host
ends the room; no host migration is required. Stop all timers on game switch,
reset, finish, or session disposal. Replay starts a fresh epoch, roster, and
random draw. Games and scores remain temporary; no persistent progression is
required.

### Build and validation expectations

For a selected game, cover its specific acceptance checks below plus these
common checks:

- Unit-test meaningful scoring, random-boundary outcomes, simultaneous
  resolution, timeout fallbacks, ties, phase limits, and paused/finished state.
  Use seeded fixtures rather than flaky assertions that someone randomly wins.
- Session/protocol tests cover invalid or oversized messages, private-view
  filtering, permissions, stale/duplicate actions, pause/resume, spectator
  joins, disconnect behavior, rematch, and timer disposal. Test maximum
  eight-player serialized snapshots with maximum-length names and IDs.
- Retain deterministic Playwright flows that pair real host/client contexts,
  complete a short seeded match, and exercise switching without re-pairing.
  Include visual snapshots of a ready, active, and meaningful result state.
- Use the `playwright-interactive` skill for a live functional/visual pass.
  Build a small inventory of controls and states, test normal
  touch/mouse/keyboard input, and review screenshots at desktop, tablet, 390px,
  and 320px phone sizes. Include eight players, long names, taller font metrics,
  reduced motion, focus, empty/missed-input states, and awkward dense states. Do
  not loosen fit checks to hide overflow.
- Verify the production subpath, cached offline startup after an online visit,
  and user-controlled service-worker updates. Real iPhone/iPad touch, LAN play,
  standalone layout, and background/resume still need device checks.
- Update README with shipped behavior and QA.md with the selected game's manual
  inventory; keep this proposal catalog clearly separate from shipped features.
  Run `npm run verify` before implementation handoff.

## 1. Treasure Dive

### Experience and match structure

A competitive push-your-luck expedition through a sunken ship. The central
question is always: bank this haul, or risk one more room? Use three dives, each
containing at most six shared door decisions. Everyone starts each dive together
and makes decisions simultaneously; people who return or get caught watch only
the rest of that short dive, then rejoin automatically.

Start with a 3-second countdown. Each door has an 8-second choice window and a
2-second reveal; each dive ends with a 4-second summary. The worst-case total is
`3 + 3 × (6 × 10 + 4) = 195 seconds`. If no one is still exploring, skip
remaining doors and go straight to the dive summary. The third summary becomes
final results.

### Rules and scoring

- Everyone begins with zero banked points. At the start of each dive, reset each
  player's temporary haul to zero, exploring status to active, and used shield
  status to false. Give everyone one shield for that dive.
- Before each door, choose **Return**, **Explore**, or **Explore with shield**.
  Return banks your entire temporary haul and ends your participation in this
  dive before the next hazard is drawn. A missing choice defaults to Return.
  Choices stay secret until everyone locks or the window ends.
- Each dive has a fresh hidden deck of twelve door cards: four hazards and eight
  treasure values `[2, 2, 3, 3, 4, 4, 6, 10]`. Shuffle once on the host and draw
  without replacement, at most six cards. Display the remaining deck size and
  hazard count before each decision; show treasure possibilities in Help. Do not
  reveal the next card or the order of future cards.
- A treasure card adds that value to every player who explored; it is not
  divided among them. An unshielded hazard erases your temporary haul and sends
  you back to the boat for this dive. Already banked points are never lost.
- Explore with shield consumes the shield even if the card is treasure. On a
  hazard, it preserves your haul and lets you continue, but awards no points for
  that door. Reject the shield action if the player has already used it.
- After resolving door six, automatically bank the haul of every surviving
  explorer. No seventh decision or hazard occurs. Reset the deck and shield for
  the next dive. Highest banked total after three dives wins; equal totals share
  the win.

Example: you have 7 temporary points, one shield, and three hazards among ten
remaining cards. Return guarantees those 7 points. Explore risks losing them for
a possible treasure gain. Shield protects this step but leaves later steps
exposed.

### Screens and controls

Show a compact ship path with six numbered doors, current dive/door, remaining
hazard odds, your banked score, temporary haul, and shield. Use three large
choice buttons with a local preview and **Lock choice**. After a reveal, show
the card, who returned/continued/got caught, and the reason for your own score
change. Returned players see “Safe on the boat; next dive starts soon” and can
follow the remaining action. Show the full standings in a dialog and the dive
summary.

### Skill, luck, and comeback potential

Track remaining hazards, protect a valuable haul, and choose when to spend your
shield. A bold player can pull a rare 10-point treasure; a cautious player can
win by banking consistently. Every new dive gives everyone a fresh shield and
fresh chance. Banked points keep bad luck from wiping out the entire match. The
brief boat wait is a trade-off of this concept, not permanent elimination; keep
it visible and bounded to at most the remaining door windows.

### State and implementation notes

Keep phase, dive/door indices, remaining phase time, participants,
banked/temporary points, exploration status, shield availability, readiness, and
last public reveal. The authoritative state also holds the deck and locked
choices. Public views contain readiness but hide others' choices until
resolution. A conceptual `dive-choice` input contains dive, door, and choice
enum; the host verifies active explorer status and shield availability. Resolve
Returns first, draw one shared card only if explorers remain, then apply its
effect to all continuing players.

### First-version scope and acceptance checks

Use only this deck and shield rule: no shopping, permanent upgrades, loot
trading, or random events that change banked scores. Verify Return precedes
hazards, protected/unprotected players resolve correctly on the same card,
shield use is consumed on treasure too, deck odds update without replacement,
timeouts bank, the sixth door banks survivors, and empty expeditions skip
safely. Playtest whether shields create interesting decisions and whether boat
waits feel short enough for younger players.

## 2. Meteor Minigolf

### Experience and match structure

A simultaneous five-hole minigolf match: everyone lines up one swipe-controlled
shot, watches the balls travel together, and gets another fresh chance on the
next hole. Support 2–8 players, each with their own colored ball on the same
course. Balls never collide with one another. Use a 3-second starting countdown,
then five holes of 4 seconds of preview, 20 seconds of aiming, 10 seconds of
simulation, and 3 seconds of results: 188 seconds total. These are proposed
playtest defaults.

The five fixed templates use the following starting geometry. Coordinates are
logical course units; rectangles are `[x, y, width, height]`. Walls are solid
obstacles, bumpers are circles of radius 30, and meteor centers mark the visible
warning circle. Course boundaries are always solid.

| Hole            | Tee        | Cup        | Walls               | Mushroom centers       | Meteor center |
| --------------- | ---------- | ---------- | ------------------- | ---------------------- | ------------- |
| 1: Open green   | (200, 350) | (750, 350) | None                | None                   | None          |
| 2: Bank shot    | (250, 500) | (700, 200) | [450, 180, 40, 320] | None                   | None          |
| 3: Mushrooms    | (200, 350) | (750, 350) | None                | (450, 350), (600, 250) | None          |
| 4: Meteor       | (200, 500) | (700, 200) | None                | None                   | (500, 320)    |
| 5: Mixed course | (200, 500) | (700, 200) | [440, 260, 40, 180] | (600, 380)             | (530, 210)    |

Keep every obstacle and scoring area visible on one screen. There are no
additional strokes or waiting for individual players to finish. These layouts
can be tuned for enjoyable shots without changing the rules.

### Rules and scoring

Use a 1,000 × 700 logical course, fitted into the available play area. Place
each tee 450–600 units from the cup. Balls have radius 10. A shot has a
normalized direction and power from 0–1, mapping to an initial speed of
`100 + 1,000 × power` units per second. Simulate all balls in fixed 120 Hz
steps; multiply velocity by `exp(-1.25 × dt)` for rolling resistance. Boundary
and ordinary obstacle bounces reverse and retain 75% of the normal velocity
component, leaving the tangential component unchanged. Resolve circle/rectangle
collisions using ball radius and separate overlapping objects before the next
step. Mushroom bumpers apply an outward 160-unit-per-second impulse, with a
0.4-second cooldown per ball/bumper to avoid repeated contact impulses.

A cup captures a ball within 24 units when its speed is at most 170 units per
second, awarding 100 points. Otherwise, at the 10-second simulation deadline,
score `max(0, 70 - floor(distanceToCup / 8))`. Stop every uncaptured ball and
show its score. Total all five holes; tied totals share the win. The final
distance score rewards useful placement even when nobody sinks a shot.

All shots start together after aiming ends. Players can revise their aim until
tapping **Ready**, which locks it. A player without a committed valid shot skips
this hole and receives 0 points, then rejoins normally on the next hole. Reveal
everyone’s shots only at launch so watching another player cannot improve a
later shot.

### Screens and controls

Show the hole number, total score, timer, a large course, and a compact legend.
Drag from the ball toward the desired travel direction; drag length sets power,
and release keeps the preview arrow. Provide accessible angle/power adjustments
and a large Ready button. Show the cup’s scoring rings and trajectory direction,
without promising an exact final path. The result view overlays points on the
course before the next hole loads.

### Skill, luck, and comeback potential

For each hole, preview a wind direction and a meteor warning circle where
applicable. Choose the visible wind direction uniformly from the four cardinal
directions. The host secretly chooses wind strength uniformly from 0, 12, or 24
units per second squared, applied throughout simulation. On meteor holes, draw
impact time uniformly from 4.0–5.5 seconds. At impact, balls whose centers are
within 90 units receive a 120-unit-per-second outward impulse; an exact-center
hit uses the fixed upward direction. Captured balls stay captured and ignore all
later forces. These shared conditions apply equally to every ball; different
paths create different outcomes. Reveal the actual conditions at launch. Skill
improves aim and obstacle use, while uncertain gust strength and impact timing
permit funny recoveries and unlucky misses. Each new hole resets positions
without resetting earned points.

### State and implementation notes

Keep course ID, phase/deadline, committed shots, ball positions/velocities,
captured status, totals, and event cooldowns in host state. Generate one seeded
environmental schedule per hole; do not reroll events on rendering or
reconnection. Clients render snapshots and aim previews, never award points.
Course graphics can use local canvas/SVG primitives.

### First-version scope and acceptance checks

Implement exactly five templates and the two environmental effects. Check cup
capture, bounce energy, mushroom cooldowns, identical shots receiving identical
outcomes, deadline scoring, missing-shot zeroes, shared ties, and the 188-second
schedule. Verify a short drag, cancelled drag, adjusted aim, and locked Ready
state on narrow phones.

## 3. Patchwork Picnic

### Experience and match structure

A simultaneous spatial puzzle: fill a little picnic blanket with food shapes,
complete tidy rows, and group matching foods. Each player has their own 6×6
board. Support 2–8 players with a 3-second countdown followed by 10 rounds, each
containing 14 seconds to place a piece and a 3-second scoring reveal. Active
play lasts 173 seconds. Everyone stays involved even when their blanket becomes
crowded.

Each round shows the same three randomly generated piece options to everybody.
Players choose one and fit it on their own board; nobody can take somebody
else's choice. This avoids a network race and makes comparing strategies fun.

### Rules and scoring

Use a fixed catalog of connected shapes: a single square, two-square domino,
three-square straight, three-square L, four-square square, and four-square L.
Every piece has one food color: red strawberries, yellow cheese, or green
grapes, reinforced by symbols. Use these unrotated footprints, relative to a
top-left anchor: single `[(0,0)]`; domino `[(0,0),(1,0)]`; straight-three
`[(0,0),(1,0),(2,0)]`; L-three `[(0,0),(0,1),(1,1)]`; square-four
`[(0,0),(1,0),(0,1),(1,1)]`; L-four `[(0,0),(0,1),(0,2),(1,2)]`. A rotation is a
clockwise quarter-turn, normalized back to a top-left bounding-box anchor. No
reflections.

Maintain a shuffled six-shape bag and a shuffled three-food bag, refilling and
reshuffling each when exhausted. Normally draw three shapes per round. In rounds
1 and 7–10, pin option 0 to a single square without consuming the shape bag, and
draw the other two shapes normally. Draw one food for every option, including
forced singles. Duplicate shapes in an offer are allowed when a bag refills.

Cells must be inside the board and cannot overlap. Pieces remain permanently;
full rows do not disappear. After a placement, award 1 point per newly occupied
cell, 1 point per orthogonal same-food edge where at least one endpoint is a new
cell, and 6 points for each row becoming completely filled. Count each edge
once; never score previously occupied edges again. Ignore diagonals. A skip
scores zero.

At countdown, reveal one match-wide bonus drawn from three cards: “Strawberry
corners,” “Cheese border,” or “Grape center.” Strawberry corners awards 3 points
per strawberry corner; cheese border awards 1 per cheese cell on the outer ring;
grape center awards 2 per grape cell in the central 2×2 square. Apply the bonus
once, at match end, separately from placement points. Show its current projected
value throughout. Highest total wins; equal totals share victory.

### Screens and controls

Show the bonus, round countdown, three illustrated choices, large board, score,
and compact opponent progress. Choosing a piece opens a placement preview.
Tapping an anchor cell previews it, Rotate changes orientation, and Place
commits it. Invalid previews visibly outline blocked cells and disable Place.
Provide Reset preview before committing and an explicit Skip action. Place or
Skip sends a final lock; it cannot be undone after host confirmation.
Uncommitted previews are local only. Use taps instead of requiring precise
dragging. Keyboard users select options and cells with arrows, rotate with R,
and confirm with Enter.

Show completed rows and point additions in the reveal without making the board
move. Final results include each player's blanket and a breakdown of cells,
matching edges, rows, and bonus.

### Skill, luck, and comeback potential

Players balance immediate matching points against preserving useful spaces.
Everyone faces the same lucky offers, but those offers benefit different board
arrangements. Late single squares can complete several near-finished rows; the
public bonus rewards foresight. Avoid targeted punishments or stealing pieces. A
crowded board is a puzzle to rescue, rather than elimination.

### State and implementation notes

The host owns the offer, round deadline, bonus, committed boards, and scoring.
An input includes round, choice index, anchor coordinates, and rotation 0–3;
Skip is explicit. Validate catalog-derived occupied cells on the host. Accept
exactly one committed placement or Skip per player per round. A timeout without
a committed action skips; preview cells never alter the authoritative board.
Store each board as 36 bounded cell values and retain separate score counters.
Generate randomness on the host from a match seed and catalog bags; clients
never independently roll offers.

### First-version scope and acceptance checks

Use flat local symbols and CSS/SVG food shapes. Exclude inventory, power-ups,
larger boards, and animated characters. Test every shape rotation, overlap and
bounds rejection, edge counting, one-time row and bonus scoring, forced-single
bag behavior, duplicate-lock rejection, and timeout. Retain a seeded example
that fits ten pieces, plus a crowded-board fixture using both rotation and Skip.
A board with no legal placement can always Skip.

## 4. Secret Suitcases

### Experience and match structure

A bluffing and deduction game for 2–8 players: inspect your suitcase, make a
claim, and judge a rival. Use five rounds: a 3-second countdown, then 12 seconds
for claims, 12 seconds for assessments, and 8 seconds for results per round,
followed by a 5-second winner screen: at most 168 seconds. All-ready decisions
may end early. Nobody is eliminated. Numbers are proposed playtest defaults, not
proven balance.

### Rules and scoring

Each player independently receives five items drawn without replacement from an
identical virtual bag containing six gems, four relics, and eight socks. Gems
are worth 2, relics 3, and socks 0; gems and relics both count as treasure.
These item values define claims, not an additional endgame bonus. Contents stay
fixed throughout the match. Shuffle each suitcase's five positions independently
to establish its reveal order.

Choose one unused claim each round from this five-button menu:

- “I have at least three treasures.”
- “I have at least one relic.”
- “My suitcase is worth at least eight.”
- “I have more gems than socks.”
- “I have exactly two socks.”

Claims describe the entire original suitcase, including already revealed items.
Players may deliberately choose false claims. A randomly shuffled seating ring
assigns each player exactly one rival to assess; in round `r`, use offset
`1 + ((r - 1) mod (playerCount - 1))`. Thus every claim receives one assessment,
including with two players. The assessor chooses **Trust** or **Challenge**.

| Assessment | Claim truth | Claimant points | Assessor points |
| ---------- | ----------- | --------------: | --------------: |
| Trust      | True        |              +2 |              +1 |
| Trust      | False       |              +3 |               0 |
| Challenge  | True        |              +2 |              -1 |
| Challenge  | False       |               0 |              +3 |

Scores may be negative. After assessments lock, reveal each claim's truth, apply
points, and publicly open the next item in every suitcase. Previous claim
results and revealed items remain available as clues. After round five all
contents are visible; highest score wins, with a shared win on ties.

### Screens and controls

Planning shows your suitcase and remaining claim buttons. Assessment emphasizes
your assigned rival's name, current claim, revealed items, and previous
true/false claims. Two large buttons select Trust or Challenge; Lock confirms
either assessment. Claims likewise use a local selected button followed by Lock.
Other current claims appear in a compact roster. Results explain your two
scoring events separately: your claim and judgment. Use local item icons with
text labels; do not rely on color alone.

### Skill, luck, and comeback potential

Players use remembered clues, probability, and knowledge of their family to
judge claims. Choosing when to bluff or spend an easily believable claim
matters. Random contents create different believable stories, while the assigned
rivals change each round. Short scoring swings preserve comeback chances. A
known false claim is legal and may still fool someone who missed a clue;
certainty naturally increases near the end.

### State and implementation notes

Track private contents, reveal order, used-claim IDs, current claim, assessment
assignment, locked assessments, public clues, and signed scores. Keep unopened
contents private to their owner. Validate claim IDs and reuse, but **never
reject a submitted claim because it is false**. Truth is computed privately and
published only after assessments close. On a claim timeout, choose the first
unused claim in the listed order; on assessment timeout, choose Trust. Lock
simultaneous choices before publishing them. Resolve in stable seating order so
submission arrival cannot affect points or assignments.

### First-version scope and acceptance checks

Build one suitcase theme, the five fixed claims, and the five-round flow. Check
all four scoring outcomes, reused-claim rejection, negative scores, tie results,
deterministic timeouts, and two-player assignment. Verify that public clues
evolve correctly and that opponents cannot receive unopened contents or
premature truth values. Use buttons and short result animations; exclude
freeform chat, trading, and drawing.

## 5. Cloud Couriers

### Experience and match structure

Players pilot colorful balloons around a small route map, carrying packages from
a central depot to destinations. Everyone chooses a route simultaneously, then
watches deliveries and gusts resolve together. This is a light planning race
with no steering precision requirement. Support 2–8 players with independent
balloons: sharing a node never blocks anyone.

Use a 3-second countdown and 12 turns. Each turn has 10 seconds to choose, 3
seconds to animate its outcome, and 1 second to show scoring, for 171 seconds
total. The decision timer continues even when everyone selects early, keeping a
predictable rhythm. These timings and scoring values are proposed playtest
defaults.

### Rules and scoring

Build a seven-node map: depot H in the center; N, E, S, and W around it; X
between N and W; Y between N and E. Safe edges are H–N, H–E, H–S, H–W, N–X, W–X,
N–Y, and E–Y. Exposed shortcuts are W–E, S–X, and S–Y. Every successful move
traverses one edge per turn. Safe edges always succeed; shortcuts can save
several moves but risk leaving the balloon at its starting node.

Every player begins at H with three boosts and a package addressed to X or Y.
Use the same seeded destination sequence for everyone: draw the first
destination uniformly from X or Y, then draw subsequent destinations from
shuffled five-item bags containing X, Y, E, W, and S. Refill and reshuffle an
exhausted bag; repeated destinations across bag boundaries are allowed. Arriving
at the current destination delivers automatically for 3 points and clears the
package. A player without a package must return to H to collect the next
destination. Arriving at H from another node also restores one boost, capped at
three. Staying at H gives no additional boosts. Highest delivery score wins;
ties share the win.

Each exposed edge gets a public directional wind forecast: tailwind succeeds
with 75% probability, crosswind with 50%, and headwind with 25%. The reverse
direction has the opposite forecast; crosswind remains crosswind. Spending one
boost raises the success chance by 25 percentage points, capped at 100%. Consume
the boost on both success and failure. Safe routes cannot spend boosts.

### Screens and controls

Show the whole map, current package destination, score, boost count, and turn
timer. Tap an adjacent destination node to select a route; highlight it and
display its success percentage. A large **Use boost** toggle updates that
percentage for an exposed route. Tap **Ready** to lock the selection. No
selection means **Stay**, with no movement or resource consumption. A Stay
button also makes that choice explicit. Keep route taps forgiving and labels
readable; give each destination a distinctive icon as well as a letter.

### Skill, luck, and comeback potential

Planning the outward and return journeys, evaluating shortcuts, and conserving
boosts supply the skill. The host rolls one secret uniform random value per
exposed edge per turn, revealed only during resolution; everyone taking the same
directed shortcut with the same boost choice gets the same outcome. For each
undirected shortcut, draw its forward forecast uniformly from tailwind,
crosswind, or headwind at each turn; forward follows the listed edge order. The
reverse direction has the corresponding opposite forecast. Show forecasts before
decisions. Use the same underlying edge roll in both directions, comparing it
with each direction's success threshold. At turns 3, 6, 9, and 12, a visible
supply drop appears at a uniformly selected non-depot node; it expires after
that turn. Arriving there that turn grants one boost, capped at three, to every
arriving player; it never awards points. Favorable forecasts, a lucky shortcut,
and a useful supply drop can recover lost time without taking points away from
others.

### State and implementation notes

Store turn/phase/deadline, map edges, forecasts, secret edge rolls, supply node,
destination deck, each player’s position/package/deck index/boosts/score, and
committed choices. Generate the complete seeded schedule at match start; publish
forecasts only when their turn begins. Validate adjacency and available boosts
before accepting a choice. Animate host-resolved movement using local SVG paths.

### First-version scope and acceptance checks

Keep one map and this delivery loop. Check every legal route, safe travel, all
forecast thresholds, shared shortcut outcomes, boost consumption/cap/refill,
Stay fallback, destination progression, supply collection, simultaneous
arrivals, ties, and the 171-second schedule. Make the next destination and the
reason for a failed shortcut understandable without opening help.

## 6. Monster Market

### Experience and match structure

A simultaneous auction game for 2–8 players: bid on goofy goods, then discover
which goods the monster wants. Run six rounds: a 3-second countdown, 18 seconds
for bidding and 10 seconds for results per round, then a 5-second winner screen.
Maximum duration is 176 seconds; all-ready bidding may end earlier. No one is
eliminated. Economy and probabilities are proposed playtest defaults.

### Rules and scoring

Start each player with 12 coins. Coins are both spending money and the final
score; there is no separate revenue score. Present two lots with 2–4 players and
three lots with 5–8 players. Categories are **Food**, **Shiny**, and **Cozy**,
represented by an illustrated snack, trinket, or scarf. When there are two lots,
uniformly omit one category; otherwise show all three. Each lot contains one
item and can have one winner.

Shuffle categories into a forecast: **Likely** has 60% probability, **Possible**
25%, and **Unlikely** 15%. Display labels and percentages before bidding. Draw
an integer uniformly from 0–19: 0–11 selects Likely, 12–16 Possible, and 17–19
Unlikely. The actual favored category stays hidden until bids lock.

Each player either passes or secretly bids 1–4 whole coins, bounded by their
current wallet, on exactly one lot. Losing bidders pay nothing. The highest bid
on each lot wins. For tied highest bids, use a uniform shuffled priority list
generated separately for each lot before decisions; reveal that list alongside
the result. The tied player appearing first wins. Priority has no relationship
to network arrival time or lobby order.

Deduct the winner's bid, then automatically sell their purchased item to that
round's customer: favored-category goods return 7 coins; other goods return 2.
For example, winning a favored scarf for 4 changes a wallet from 12 to 15. An
unfavored scarf bought for 4 leaves 10. Goods do not persist between rounds.
Passing or losing leaves the wallet unchanged. Even six maximum-price
unfavorable purchases cannot exhaust the starting wallet before the last round;
players retain opportunities throughout the match.

After round six, the largest wallet wins; tied wallets share the win.

### Screens and controls

Show the forecast, your wallet, and large lot cards. Tap a card and use four
numbered bid buttons; Pass clears the choice. Revise the local draft until
tapping Lock bid; a confirmed bid cannot change. Confirmation reads “Bid 3 on
Cozy.” Show readiness counts without exposing bids. Results reveal all bids,
relevant tie priority, customer preference, and each wallet's
before/bid/revenue/after calculation. Local animations give the monster
personality.

### Skill, luck, and comeback potential

Players estimate expected returns, budget across rounds, and anticipate where
opponents will bid. A likely-category item is attractive but may attract
expensive competition; a cheap unlikely-category item can be profitable and
occasionally pays a windfall. Customer preferences and tied-auction lotteries
create uncertainty. Lower bids protect a trailing player's money while
preserving chances for a lucky profitable sale.

### State and implementation notes

Track wallets, lot IDs/categories, forecast order, the hidden customer draw,
private bids and per-lot tie priority. Keep bid drafts local and expose only
readiness before resolution; filter other players' locked bids out of every
viewer snapshot. Validate integer amounts, available coins, one lot, and the
active round; stale or malformed bids must not spend money. Missing bids resolve
as Pass. Resolve lots in stable ID order, deduct once, then credit revenue once.
Announce everyone’s locked decisions together. Keep the forecast probability
mapping explicit in game rules and avoid consuming randomness in response to
packet arrivals.

### First-version scope and acceptance checks

Use the three categories, one-item lots, automatic sales, and fixed payouts.
Exclude inventory storage, negotiated trades, debts, and variable item powers.
Check forecast interval boundaries, ties with several bidders, all-pass lots,
insufficient-wallet rejection, lost-bid refunds, and wallet accounting across
six rounds. Confirm no bidder can win two lots or spend twice after duplicated
messages, and that a full match ends within the time cap.

## 7. Treasure Shuffle

### Experience and match structure

Six treasure chests open briefly, close, and exchange positions. Remembering
contents improves the choice, while a mystery chest can reward a risky guess.
Support 2–8 players choosing independently: multiple players can select the same
chest and receive its contents.

Play six rounds after a 3-second countdown. Each round has a 3-second contents
preview, five 1-second swaps, 12 seconds to choose, and a 3-second reveal, for
141 seconds total. Values and timing are proposed playtest defaults.

### Rules and scoring

Each round contains exactly six contents: ruby worth 2 points, amber worth 3,
emerald worth 4, sapphire worth 5, a trap worth −3, and a mystery chest. Shuffle
their initial placement uniformly among slots A–F. Ordinary contents are visible
during preview; the mystery shows only a question mark. The host secretly draws
its payout from 0, 4, 8, or 12 with equal probability, then reveals it after
choices close.

Before preview, privately give each player a bonus key depicting one of the four
gem types, drawn uniformly. Selecting the matching gem replaces its normal value
with 8 points; the key does not affect traps or mystery payouts. Thus every key
offers the same potential reward, with different things for players to track.
Show the key throughout the round, including its “matching gem = 8” rule.

For each swap, uniformly select two different slots and exchange their chest
identities. Allow consecutive swaps to involve the same slots; do not prevent
reversals. Chests retain their hidden contents throughout the round. Selecting a
chest locks that choice immediately. At the deadline, unselected players receive
0 points and still watch the reveal. Negative totals are allowed. Sum all six
rounds and share the win between players tied for the highest score; nobody is
eliminated.

### Screens and controls

Show a two-row, three-column chest arrangement with generous gaps, fixed slot
labels, round/timer/score, and a large bonus-key badge. Tapping a chest during
selection locks it, marks it clearly, and displays **Waiting for reveal**.
Preview and shuffle phases disable selection. At reveal, open all chests,
identify each player’s selected slot, and show their earned points beside their
total. No text entry or scrolling is needed.

Offer an **Observe swaps** view to everyone. It is also the reduced-motion
default: instead of moving chests along paths, instantly exchange the two closed
chests and display the current swap as “B ↔ E” for that one-second step. The
ordinary animated view shows the same current-swap label. Both views expose
identical information at identical times; neither preserves a swap history or
reveals contents early. Make switching available before a round, not during it.
This gives children, screen-reader users, and people who find motion
uncomfortable a viable memory-and-deduction path.

### Skill, luck, and comeback potential

Players can track their key’s gem for a reliable 8 points, follow another known
gem as a safer fallback, or choose the mystery for a possible 12-point recovery.
Luck determines initial placement, swap sequence, keys, and mystery payouts. The
trap keeps blind guesses meaningful, but the six short rounds ensure a bad pick
does not remove someone from play. Clearly distinguish a known gem reward from
the mystery’s four possible payouts before the first round.

### State and implementation notes

Store round/phase/deadline, six stable chest identities, slot permutation, five
swap pairs, contents, mystery payout, per-player key/choice/totals, and reveal
status. Generate seeded round schedules on the host and use authoritative phase
timestamps for animation. Send private keys only to their owners and publish the
mystery payout only during reveal. Local SVG/canvas chests and gem shapes need
no external art.

### First-version scope and acceptance checks

Implement one difficulty, six contents, keys, and both viewing modes. Check
permutation integrity, repeated/reversed swaps, equal key rewards, mystery
bounds, traps/negative totals, selection locking, timeout scores, shared
selections/ties, identical phase timing across views, and the 141-second
schedule. Ensure slot focus and keyboard selection remain stable during swaps.

## 8. Castle Critters

### Experience and match structure

A simultaneous tactics game for 2–8 players. Send three critters to score map
spaces, let dice decide contests, then bring everyone home. Play six turns: a
3-second countdown, 20 seconds of orders and 10 seconds of results per turn,
then a 5-second winner screen: at most 188 seconds. All-ready planning may end
sooner. Nobody loses critters permanently or leaves the game. Values are
proposed playtest defaults.

### Rules and scoring

Use four spaces arranged 2×2 for 2–3 players, six spaces arranged 2×3 for 4–5,
and nine spaces arranged 3×3 for 6–8. Players have separate home markers outside
the board; homes cannot be attacked. Spaces are Gardens worth 2 points, Towers
worth 3, or Treasure Patches worth 4. Assign types cyclically in row-major
order: Garden, Tower, Treasure, then repeat. All spaces are accessible from
every home; routes are visual, not movement restrictions.

At each turn's start, uniformly select one space for a **bonus chest**,
increasing that space's reward by 3 for that turn. Reveal its location before
orders. Each player has exactly three critters and may allocate zero to three of
them across at most two spaces. Unallocated critters stay home and earn nothing.
Players may revise local orders during planning; Ready sends the final
allocation, which stays secret until resolution.

After all orders lock, animate critters moving simultaneously. An empty space
earns nobody points. A space visited by exactly one player awards that player
its full current reward. At a contested space, each assigned critter rolls one
six-sided die; sum each player's dice there, and award the space's full reward
to the player with the largest sum. If multiple players tie for the highest
total, each tied player receives the full reward and the space displays their
joint claim. There is no reroll or secondary arrival-based tiebreaker.

Example: two critters roll 2 and 5, beating a rival's single roll of 6. Larger
forces offer stronger odds but leave fewer critters elsewhere. Independent dice
let smaller forces sometimes win.

After results, every critter returns home and all claims clear. Places confer no
persistent ownership, defensive bonus, or future income. Each new turn starts
with three available critters per player and a newly drawn bonus chest. After
six turns the highest accumulated score wins; tied leaders share the win.

### Screens and controls

Fit the board, remaining critter indicators, timer, and score strip in the
viewport. Tap a space; large Plus and Minus controls change its allocation. Mark
chosen spaces and show “3 of 3 assigned,” followed by Ready. Home/reset clears
orders. Results expose allocations, dice totals, and points on spaces. Critter
shapes and player labels supplement colors. Make nine-space touch targets usable
on narrow phones.

### Skill, luck, and comeback potential

Players predict opponents, spread out or concentrate, and weigh garden points
against a crowded bonus chest. Dice and chest location add uncertainty. Shared
victories soften ties, and resetting forces prevents an unbeatable army.
Everyone retains three critters, allowing final-turn scoring swings.

### State and implementation notes

Track board layout, turn number, bonus location, private allocation arrays,
scores, and public resolved dice/results. Validate integer counts from 0–3,
total allocation at most three, at most two occupied spaces, and current space
IDs. Publish allocations only after planning closes. A timeout without a
committed allocation sends all critters home for this turn; a local preview
never counts as an order. Generate rolls in stable space/player/critter order
after locking orders, never as messages arrive. End-state scoring must occur
exactly once.

### First-version scope and acceptance checks

Build one static illustrated board theme, three space types, the shared chest,
and six turns. Exclude pathfinding, combat damage, upgrades, and permanent
territory. Verify all three board sizes, allocation limits,
empty/uncontested/tied contests, per-critter dice ranges, force resets, and
shared final wins. Check that eight players' markers and contested dice remain
readable and that late or duplicate orders cannot alter resolved turns.

## 9. Doodle Dice

### Experience and match structure

A drawing party game with randomized prompts, guessing, and friendly awards. Use
cooperative play with two players and friendly competition with three to eight,
selected automatically from the starting roster. Both modes have three rounds.
After a 3-second countdown, each round has 30 seconds to draw, up to 28 seconds
for a simultaneous guessing gallery, 8 seconds for awards, and 4 seconds for
results: no more than 213 seconds altogether.

Each player receives a different secret prompt combining a character, action,
and object—for example, “a robot juggling bananas.” Local catalogs: cat, robot,
dragon, penguin; eating, juggling, carrying, selling; bananas, ice cream, pizza,
umbrellas. Recognition adds a challenge, including with two players.

### Rules and scoring

At round start, the host draws distinct prompt combinations uniformly without
replacement from the 64 possible combinations. For each picture it also
generates two distinct decoy prompts differing in one ingredient. During the
gallery, every player sees each other picture for 4 seconds and picks its real
prompt from three options. Their own picture is omitted. Shuffle options
consistently for that viewer. In competitive mode, a correct guess earns the
guesser 1 point and the artist 2 points; an incorrect or missing guess earns
neither. The host does not reveal correctness until the gallery finishes.

Then each player awards one “Funniest,” one “Clearest,” and one “Most
imaginative” vote to other players' pictures. Each received award vote earns 1
point in competitive mode. A voter may choose the same picture for several
categories, but cannot vote for their own. Missing votes abstain. Blank drawings
do not prevent voting. Highest cumulative score after three rounds wins, with
shared victory for ties.

With two players, count each correct guess as one shared recognition instead of
individual points. The pair wins together if at least four of their six pictures
are correctly identified across three rounds. Awards are optional compliments
and do not affect this goal. Show a shared progress counter instead of
standings. This avoids forced reciprocal votes and makes clear drawing and
sincere guessing help both players. Awards in either mode remain subjective
family choices.

### Screens and controls

Drawing uses a large square pad, four high-contrast colors, a single comfortable
line width, Undo stroke, Clear, and Hand in. The countdown and three prompt
ingredients remain visible above the pad. Hand in sends the current bounded
drawing and locks it after host acknowledgement; there is no Edit after a
confirmed lock. Until then, edits replace the draft sent to the host. At the
deadline, the host freezes its last acknowledged draft, or an empty drawing if
none arrived. Display saved-to-host status so an unacknowledged last edit is not
mistaken for the submitted picture.

Gallery cards use anonymous round-local symbols. Each page has three large guess
buttons and a timer. The award screen shows all other pictures in a compact grid
with a zoom dialog and three award selectors. Reveal names only when results
appear. Real family members may recognize drawing styles, so anonymity is
practical rather than guaranteed.

### Skill, luck, and comeback potential

Clear visual communication and inventive humor matter more than polished
drawing. Random combinations sometimes produce an easier or funnier idea, and a
later prompt can suit a different player. This is softer luck than dice or
treasure draws: award preferences are subjective, and the randomized prompt is
the primary chance mechanism.

### State and implementation notes

Transmit vector strokes, never screenshots or uploaded images. Limit each
drawing to 16 strokes and 128 points total, four color IDs, and packed 64×64
point integers: `packed = x + 64 × y`, with x and y each 0–63 (therefore packed
0–4095). Each stroke is a color ID plus its point list; a one-point stroke is a
dot. Resample locally as a stroke grows; reaching the cap preserves what is
drawn and displays “Drawing full—Undo to make room.” Send bounded full-drawing
replacements at most once per second plus final submission, with monotonically
increasing drawing revisions. Host acknowledgement determines the deadline
fallback.

The existing protocol caps messages at 16,384 characters. Eight bounded drawings
should fit a shared snapshot, but verify serialization with maximal strokes,
room metadata, and long player names before implementation is accepted. Validate
all coordinates, stroke counts, colors, revisions, votes, prompt indices, and
phase boundaries. Keep player-to-symbol mappings host-owned until results;
gallery snapshots identify drawings only by their round-local symbol. Deliver
each private prompt through a recipient-filtered room view, extending the
existing private-view pattern rather than adding a separate messaging path.
Generate the real prompt plus two decoys at round start, keep their correct
index private, and send candidate choices only when that drawing's gallery page
opens. A viewer gets a shuffled, fixed list of the other players' drawings; the
gallery lasts exactly `4 × (playerCount - 1)` seconds. Validate each guess
against the viewer's current page, allow one locked guess per page, and prevent
award votes from targeting the viewer's own drawing.

### First-version scope and acceptance checks

Use three small bundled word catalogs, vector drawing, fixed timed phases,
guessing, and awards. Exclude photos, text entry, chat, brushes, and recognition
services. Test the two-player shared recognition target, competitive scoring,
anonymous order mappings, forbidden self-votes, deadline submissions, blank
drawings, payload maximums, and no early answer leakage. Check drawing on real
touch devices without accidental page scrolling, and confirm the host can render
all eight final pictures offline.

## 10. Kitchen Catastrophe

### Experience and match structure

A cooperative kitchen puzzle with shared pictured recipes, stock, tasks, and
deadlines. Players coordinate preparation, serving, and cleanup. All information
is shared, distinguishing this from a private-instruction control game.

Support 2–8 players. A 3-second countdown leads into 40 four-second work beats,
followed by a 4-second result reveal: 167 seconds total. Players choose one task
per beat, see teammates' choices, and may change them until cutoff. Tasks
execute together; conversation matters more than reactions.

### Rules and scoring

Use three ingredients: tomato, carrot, and cheese. Recipes are tomato+carrot
soup, carrot+cheese toast, tomato+cheese salad, and all-three party bowls. Each
recipe consumes one of each pictured ingredient and earns points equal to its
ingredient count. Start with one of each ingredient in shared stock. Fix
ingredient order as tomato, carrot, cheese for all fallback rules; bound each
stock counter to `80 × startingPlayerCount + 1`, safely above what the match can
produce.

Available tasks are Prepare one ingredient, Serve a visible order, and Clean a
messy preparation station. Preparing normally creates one stock token; serving
consumes the complete recipe. Maintain `min(4, ceil(playerCount / 2) + 1)`
visible orders. Fill empty slots at the start of the next beat. An order created
at the start of beat b can be served during beats b through b+5, then expires
after resolving beat b+5 tasks, awarding zero; show their remaining beats. Stop
accepting tasks after beat 40 and score dishes already served. The family wins
at `12 × startingPlayerCount` points; otherwise celebrate progress toward that
target.

Generate recipes from a shuffled four-recipe bag. Every fifth generated order is
a randomly chosen “Very hungry” customer worth 2 extra points. Every fourth beat
randomly marks one ingredient as an abundant delivery for that beat: each
successful Prepare of that ingredient creates two tokens. At beats 8, 16, 24,
and 32, one randomly chosen preparation station becomes messy. That station
produces nothing until cleaned; existing stock remains usable. Skip mess events
while one remains unresolved. Announce events before task selection.

### Screens and controls

Show pictured orders across the upper area, ingredient stock and the point
target, then three large Prepare buttons and context buttons for Serve and
Clean. Selecting an order previews its requirements and highlights any missing
ingredients. A single tap sends the current task intent; selecting another
replaces it with a newer revision before cutoff. Kitchen deliberately shows
these revisable intents to teammates and does not use the competitive
secret-lock model. Show the host-confirmed intent. Show teammates' colors and
intents in a compact strip so eight players can divide work. Voice coordination
is optional.

Use large touch targets and symbols plus labels. Results show team points,
dishes, expirations, and cleanups; omit individual rankings.

### Skill, luck, and comeback potential

The team anticipates recipes, prepares stock, and prioritizes expiring orders.
Lucky abundant deliveries and bonus customers create scoring opportunities;
recoverable spills disrupt plans. Nobody loses access to the game after a
mistake. A setback costs a few beats, and the shared inventory allows a
well-prepared team to keep serving during a mess.

### State and implementation notes

The host owns beat deadlines, orders, stock, seeded bags/events, intents, and
team score. Inputs contain beat, task type, and bounded ingredient or order ID.
At cutoff, resolve Clean tasks, then Prepare tasks, then Serve tasks. Multiple
cleaners for one mess credit one cleanup; extra cleaners queue one token of that
newly cleaned ingredient. Those extra-cleaner tokens are added only after all
Serve attempts, alongside failed-Serve fallback tokens. Ordinary Prepare tokens
are added in the Prepare stage and are available to Serve in this beat.

Resolve competing Serve tasks in a fixed seating order rotated one seat each
beat, displayed beforehand; never use packet arrival order. Capture each
selected order's recipe from the cutoff snapshot before resolving Serve tasks,
even if another player removes the order first. If an order is gone or stock
insufficient, queue preparation of its first ingredient missing from the
then-current stock, or its first ingredient if none is missing. Fallback
requires a clean station and always creates exactly one token, even on an
abundant-delivery beat. Credit all queued fallback tokens only after all Serve
attempts. Extra cleaners likewise create exactly one token of the actually
cleaned ingredient; abundance does not double this fallback. A Clean intent is
valid only for the current mess, and a Serve intent must reference a visible
current order when accepted. Timeout repeats the player's last Prepare
ingredient, defaulting to tomato; never repeat Serve or Clean automatically.
Include these fallback previews in the help text.

### First-version scope and acceptance checks

Build three stations, four recipes, shared tasks, up to four recoverable messes,
and the fixed player-scaled scoring target. Exclude movement, cooking minigames,
personal inventories, and individual competition. Test simultaneous serving and
cleaning, rotating priority, missing-ingredient fallback, exact six-beat
expiration, event timing, and score thresholds for 2 and 8 players. Simulate
coordinated and random teams across many seeds to confirm the target is
attainable and tune documented numbers before shipping.
