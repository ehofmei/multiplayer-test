# Family game polish plan

This follow-up plan was created as the final deliverable of
[FAMILY_PLAYTEST_PLAN.md](FAMILY_PLAYTEST_PLAN.md). **Implementation is in progress:**
Tasks 1–2 and 4 are implemented; Task 3 is implemented with live QA pending;
Tasks 5–8 are implemented with physical-device QA pending; Tasks 9–10 are implemented with physical-device QA pending; Tasks 11–15 remain planned. Read
[AGENTS.md](AGENTS.md) before implementing. Each remaining numbered task can be
assigned to a separate Codex session.

## Implementation status

| Task | Game or area             | Status                                             |
| ---- | ------------------------ | -------------------------------------------------- |
| 1    | Midnight Bakery          | Implemented; local and Linux verification complete |
| 2    | Treasure Dive            | Implemented; local and Linux verification complete |
| 3    | Patchwork Picnic         | Implemented; live QA pending                       |
| 4    | Reaction Race            | Implemented; physical-device QA pending            |
| 5    | Arena Pong               | Implemented; physical-device QA pending            |
| 6    | Light-cycle Arena        | Implemented; physical-device QA pending            |
| 7    | Light Seek               | Implemented; physical-device QA pending            |
| 8    | Shared Lights            | Implemented; physical-device QA pending            |
| 9    | Library and shared shell | Implemented; physical-device QA pending            |
| 10   | Pong                     | Implemented; physical-device QA pending            |
| 11   | Spaceship Panic          | Planned                                            |
| 12   | Meteor Minigolf          | Planned                                            |
| 13   | Glow Clash               | Planned                                            |
| 14   | Sumo Bumpers             | Planned                                            |
| 15   | Co-op Breakout           | Planned                                            |

For completed tasks, [README.md](README.md) describes the implemented behavior,
[SCREENSHOTS.md](SCREENSHOTS.md) links reviewed visual states, and [QA.md](QA.md)
records automated coverage and physical-device follow-up. Installed iPhone/iPad
touch, safe areas, rotation, Safari audio and family listening/tuning remain manual
checks. Keep this table current as each remaining task is completed.

## Where the biggest gains are

Before moving to Task 6, complete the remaining live/device checks for Tasks 3–5
in QA.md and run the short family playtest described below. Midnight Bakery,
Treasure Dive, Patchwork Picnic, Reaction Race and Arena Pong now have their
implemented polish. These five games were identified as having the clearest gaps
in action feedback, sound, score communication or results. Then do **tasks 6–10** for control
clarity, atmosphere and navigation. **Tasks 11–15** are smaller refinements to
games that already received substantial polish.

Glow Clash's prominent rewards and rankings, Minigolf's course/motion work,
Sumo's thumb pad and effects, and Breakout's core presentation are useful
benchmarks. Preserve their successful work. Give each game its own character
while keeping familiar confirmation, help, pause and replay behavior.

## Basis of this review

Reviewed the current checkout at `3b34861` on October 10, 2026, using the completed
plan, README, components, game rules, styles, audio event mapping, tests and
representative existing visual baselines. A temporary browser audit paired
three independent player contexts and captured setup and in-game screens for
all games at **390×844** and **1280×720**; Light Seek used a separate two-player
room. Inspected the captures and content bounds. Sampled card/route/placement
previews and Glow's lock flow. A persistent live-browser pass additionally
exercised Breakout start/help/pause, Reaction Race keyboard input and its natural
finish, Shared Lights toggles, and Spaceship Panic panel input/success/pause.

This was a polish discovery pass, not full regression certification. Audio
coverage below comes from the implemented event mapping and synthesizer; actual
volume, timbre and eight devices sounding together need listening tests.
Physical iPhone/iPad thumb accuracy, installed-PWA layout and Safari audio
remain unverified. Large-roster and later-round findings drawn from code or
existing baselines are distinguished from the new three-player captures.

## Shared direction

- **Make actions visible.** Selection, confirmation, waiting, resolution and
  rewards should look different. Local previews must remain local until the
  existing commit action; presentation must not expose secret choices.
- **Make points understandable.** Show the gain next to the action that earned
  it. Finish with an obvious winner/shared winners, your total, readable
  standings and replay. Keep results available until the existing continue action.
- **Use the space purposefully.** Several games have a small visual centerpiece
  surrounded by empty space or an oversized plain container. Improve composition
  and atmosphere without stretching court geometry or filling space with text.
  Preserve comfortable phone controls and maximize iPad play surfaces.
- **Keep touch predictable.** Add direct manipulation only where useful, with
  an accessible button/keyboard alternative and explicit confirmation. Keep
  scrolling available in secondary panels. No new decision deadlines.
- **Improve local artwork first.** Extend existing SVG/CSS assets for depth,
  texture, lighting and character. Keep offline startup and avoid new packages
  or external assets. If generated art is useful, retain versioned candidates
  and get approval before integration.
- **Keep sound optional and informative.** Use the current local synthesizer,
  gesture unlock, saved preference and bounded voices. Sound starts muted.
  Favor short, distinct action/outcome cues over continuous sound; keep speech
  easy to hear. Every cue needs equivalent visual feedback and reduced-motion
  treatment.

### Sound coverage at the original review

This table records the October 10 discovery review before Tasks 1–2 were
implemented. Bakery now has game-specific lock, passing, reward, gremlin and
finish feedback; Treasure now has distinct pickup, banking, shield and hazard
cues. Consult README and QA for current coverage. Shared cue names below describe
code coverage at the review, not a claim about how polished the sounds were.

| Game              | Current coverage                                               | Next useful sound work                                                            |
| ----------------- | -------------------------------------------------------------- | --------------------------------------------------------------------------------- |
| Midnight Bakery   | No Bakery events in the shared sound mapping                   | Pick lock, reveal/pass, combination reward, gremlin, batch and match finish       |
| Treasure Dive     | Generic lock, positive/negative/zero result and match-end cues | Treasure pickup, banking, hazard and shield protection as distinct outcomes       |
| Patchwork Picnic  | Generic lock, score and match-end cues                         | Placement, matching neighbors, completed row and final bonus                      |
| Reaction Race     | Go/hold, success, wrong, miss and finish                       | Clear personal reward and distinct early/wrong feedback; preserve timing fairness |
| Arena Pong        | Shared Pong cues and finish                                    | Correct life-loss/elimination cues and distinguish paddle from wall collisions    |
| Light-cycle Arena | Start, your crash and finish                                   | Accepted turn, visible/audible crash location and round finish identity           |
| Light Seek        | Miss, hit and found-piece cues                                 | Placement/ready, your-turn notification and separate match finish                 |
| Shared Lights     | On/off tones                                                   | More satisfying switches, optionally a small per-cell pitch palette               |
| Pong              | Paddle/wall, bumper, serve, point and finish                   | Match-point/point identity and visual pairing for existing collision sounds       |
| Spaceship Panic   | Generic team success, mistake and mission finish               | New personal command, streak milestone and distinct wrong/missed feedback         |
| Meteor Minigolf   | Launch, rail/stone, mushroom, meteor, cup, score and finish    | Balance overlapping cues; refine shot lock and reward identity                    |
| Glow Clash        | Generic lock, score/zero result and finish                     | Distinguish unique claims, clashes and genuinely empty rounds                     |
| Sumo Bumpers      | Start, dash, impact, your ring-out and finish                  | Consider a subtle dash-ready cue after real-device listening                      |
| Co-op Breakout    | Paddle/wall, damage, break, core clear, life loss and finish   | Balance busy rallies and reinforce shared-life loss visually                      |

For each sound change, test repeated/delayed snapshots, pause/resume, rematch,
spectators, switching games and background recovery. Emit an outcome once;
prioritize the important cue when several events arrive together. A late join
must not replay old effects. If state differences cannot identify an event
reliably, use the smallest bounded, validated event field rather than guessing
from rendering or emitting a sound every frame.

## Task briefs and acceptance criteria

Completed-task briefs retain the original gaps and design intent. Use the status
table above to choose remaining work, and README for completed behavior.

### 1. Midnight Bakery: make the cards and passing come alive

**Observed gap:** the characters are appealing, but very small inside large,
flat cards on both phone and desktop. On phones, card rules disappear into the
selection preview. Passing and collected treats are mainly communicated with
text. Bakery has no game-specific audio wiring.

- Enlarge the treat illustrations, improve card shading/selected state and give
  each character a small personality effect on selection or reveal.
- Turn the counter into a compact visual collection with pair/combination
  indicators. Explain why a zero-point jelly is useful without adding a wall of text.
- Make the confirmed card move to the counter and show the next passing direction.
  Give gremlin reversal/keep-hand feedback an unmistakable shared moment.
- Add lock, reveal/pass, combination and gremlin sounds; make batch results and
  the final winner/standings feel like a bake-off finale.

**Done when:** a child can recognize cards, understand a pair reward and see
where the hand went. One-card hands still look intentional. Two-player keep-hand,
multiple gremlins, eight bakers and shared winners remain clear; secret hands
stay private and sound never replays on resume.

**Start in:** `src/components/BakeryGame.tsx`, Bakery styles, `src/audio/events.ts`,
`src/audio/sounds.ts`, `tests/bakery.spec.ts` and audio event tests.

### 2. Treasure Dive: turn the static diagram into an expedition

**Observed gap:** the same simple ship dominates every door; choices use an
anchor and geometric symbols. Banked points, carried haul and the shield are
numbers. The final baseline still devotes most of its space to the ship and
hazard odds, with a small winner message and scores.

- Add a coherent underwater scene with readable room/door progression,
  treasure and hazard artwork, and an unmistakable shield-used state.
- Replace placeholder choice symbols with matching boat, exploration and shield
  pictures. Show the exact haul being banked or risked next to the chosen action.
- Animate the confirmed reveal: treasure joins the haul, returning moves it to
  the bank, the shield absorbs a hazard, and a catch visibly loses only the haul.
  Give these outcomes distinct sounds.
- At match end, promote the winner, final banked totals and dive breakdown;
  retire irrelevant live odds from the primary finale.

**Done when:** players can explain bank versus haul and shield protection from
the screen alone. Protected hazards, catches, everyone returning and sixth-door
automatic banking each have clear feedback; ties and eight-player results fit.
Do not change the deck, odds, secret choices or untimed decisions.

**Start in:** `src/components/TreasureGame.tsx`, Dive styles,
`src/audio/events.ts`, `tests/treasure.spec.ts`.

### 3. Patchwork Picnic: show why a placement is good

**Observed gap:** pieces are tiny inside the offer cards. Placement previews say
whether a shape fits, but do not preview its score. Final rankings and other
blankets remain behind Standings, while the main result shows your own blanket.

- Enlarge and center the offered shapes. Add restrained blanket stitching,
  food depth and clearer bonus-square markers without obscuring cell boundaries.
- Preview the committed placement's base-score gain and projected bonus change
  separately; highlight new matching edges and any completed row.
- Make Rotate visibly update the preview and clearly mark overlap/off-board
  placement. Keep tap-to-anchor and the existing Place confirmation; optional
  drag placement must complement those controls.
- Add placement/row sounds and a row celebration. Put the winner, your rank and
  final totals on the main result screen, with larger blanket comparisons in Standings.

**Done when:** the preview agrees with the actual cells/matches/rows gained;
the bonus is counted once at the end. Rotate, Reset, explicit Skip and the short-screen
Arrange dialog remain comfortable. Ten-round filled blankets and eight-player
ties stay legible, including muted/reduced-motion play.

**Start in:** `src/components/PicnicGame.tsx`, Picnic styles, `src/games/picnic.ts`
scoring helpers, `tests/picnic.spec.ts` and audio tests.

### 4. Reaction Race: give hits, holds and penalties a stronger identity

**Observed gap:** the play screen is six plain numbered tiles with substantial
empty space. Personal feedback is a small line near the bottom; a correct hit
reports latency but does not explicitly show its point gain. Sound exists already.

- Give targets a cohesive arcade appearance and a strong, readable TAP/HOLD
  treatment. Keep the layout and target locations stable between rounds.
- Place personal hit/hold/early/wrong feedback near the play area, with earned
  points and reaction time. Visually distinguish the tapped wrong tile and the
  intended target after the attempt has been scored.
- Compose the phone screen around the targets and feedback; use the spare space
  for a compact personal total/round progress, not extra instructions.
- Give results prominent ranks, totals and shared winners; consider a personal
  best valid hit from that match. Refine existing cues before adding more.

**Done when:** a player immediately knows why an attempt earned or lost points.
Contact still scores exactly once; keyboard/assistive input works. Decoration
and sounds cannot reveal the target before activation, slow its visibility or
change measured response time. Test hit, hold, wrong, early, miss and eight-player results.

**Start in:** `ReactionGame` in `src/components/Games.tsx`, Race styles,
`src/audio/events.ts`, `tests/game.spec.ts` and `src/games/model.test.ts`.

### 5. Arena Pong: communicate danger, losing lives and elimination

**Observed gap:** the arena is a plain court inside a large dark stage. The
life chips truncate names and do not show seat direction. The sound mapper
interprets increasing Arena miss counters as positive Pong points, and classifies
some paddle/wall impacts by axis rather than the actual occupied side.

- Correct audio first: life lost, elimination, occupied paddle hit and empty/
  eliminated wall hit must mean different things. Test all four sides and rotations.
- Add clear side/seat identity, a local-paddle marker, readable life pips and
  danger feedback at one life. Preserve player colors and alternate visual identifiers.
- Show the miss at its location, the life decrement and the eliminated side
  becoming a wall. Keep the ball readable through every effect.
- Improve court lighting/depth and the final winner presentation. Add a steering
  strip if phone testing shows thumbs obscure the court, reusing Breakout's approach.

**Done when:** nobody hears a scoring celebration for losing a life. Players
know which side they defend, when someone is out and why that side is now a wall.
Three/four-player games, client rotation, spectators and all lives settings work.

**Start in:** `src/components/ArenaGame.tsx`, `src/games/arena.ts`,
`src/audio/events.ts`, `tests/game.spec.ts`, Arena unit and audio tests.

### 6. Light-cycle Arena: make direction and crashes readable

**Observed gap:** riders are small numbered squares without a directional nose.
The arena and controls are functional, but sit in a largely plain composition.
Only your own crash gets a generic sound; results use basic status/roster treatment.

- Give rider heads a clear facing direction, distinguish the local rider and
  make heads easier to separate from permanent trails.
- Improve trail lighting and board framing, keeping square corners and the
  maximized grid. Add a brief crash burst at the actual collision cell.
- Show a pressed/accepted/queued turn state; communicate ignored reversals
  without a noisy error on every repeated input. A quiet accepted-turn tick is optional.
- Give last survivor, simultaneous crash and time-limit shared winners distinct
  result treatments. Let eliminated players continue following the board clearly.

**Done when:** players can identify their rider and direction at a glance.
Buttons, swipes and arrows/WASD preserve one turn per step and reversal rules.
Eight overlapping trail colors, muted crashes and reduced motion remain readable.
Keep the existing sixty-second shared-win rule; this task changes presentation.

**Start in:** `src/components/CycleGame.tsx`, cycle motion/styles,
`src/audio/events.ts`, cycle unit tests and `tests/game.spec.ts`.

### 7. Light Seek: improve selection confidence and turn feedback

Implemented using [the refined Light Seek plan](LIGHT_SEEK_POLISH_PLAN.md). See
README for current behavior and QA for verification and physical-device follow-up.

**Observed gap:** the full board is much better than region selection, but a
10×10 grid still means small phone cells. Setup uses a text shape selector, and
turn/results messages carry most of the feedback. Found-piece sounds exist;
there is no separate match-finish event in the sound mapping.

- Add a strong selected-cell crosshair, nearby coordinate readout and visible
  preview footprint. Trial an above-finger coordinate/preview during touch;
  keep the whole board and explicit Illuminate confirmation.
- Add a pictured shape preview or compact shape tray showing placed/remaining
  pieces. Make overlap, edge failure, repositioning and Ready state obvious.
- Animate a confirmed search light, distinguish miss/hit/whole-piece discovery,
  and notify the local player when their turn begins.
- Add placement/ready and match-end cues, a winner treatment and clear final-board
  labels. Do not reveal an ordinary hit's piece identity early.

**Done when:** real thumbs can reliably select edge/corner cells and correct a
preview before committing. Keyboard navigation still works; setup and guessing
remain untimed. Test already-searched cells, found pieces, final reveal and spectators.
Do not restore region selectors or add automatic placement.

**Start in:** `src/components/SeekGame.tsx`, Seek styles, `src/audio/events.ts`,
`tests/seek.spec.ts`.

### 8. Shared Lights: make a simple toy satisfying

Implemented using [the refined Shared Lights plan](SHARED_LIGHTS_POLISH_PLAN.md).
See README for current behavior and QA for coverage and physical-device follow-up.

**Observed gap:** the enormous rectangular switches look like a diagnostic
panel, with a small dot and prominent revision count. On/off sound is already wired.

- Give switches a larger lamp/lens with convincing on/off lighting, a crisp
  press response and quiet local click/chime. Preserve numbers and ON/OFF labels.
- Improve board framing and spacing in portrait and the existing 8×2 landscape
  arrangement; make simultaneous remote changes feel visible.
- Move technical revision information to diagnostics or secondary help, and
  explain the toy in one short sentence.

**Done when:** toggling feels responsive and pleasant with sound both on and off;
rapid multi-device changes stay bounded and synchronized. Keep it an open shared
toy, without scoring, puzzles, additional modes or a new audio architecture.

**Start in:** the Shared Lights section of `src/App.tsx`, grid styles,
`src/audio/events.ts`, `tests/game.spec.ts`.

### 9. Library and shared shell: make the collection feel intentional

Implementation plan: [Library and shared shell polish plan](LIBRARY_SHELL_POLISH_PLAN.md).
Status: implemented; physical-device acceptance remains. See the refined plan for automated verification gates.

**Observed gap:** game cards use generic Unicode marks, and several descriptions
leave practical player/solo requirements to setup. The neutral room chrome feels
disconnected from some themed play screens. Help labels vary. The screenshot
gallery's Sumo image currently points to a missing `sumo-court.png`.

- Give each card a small local illustrated mark based on its actual game art,
  plus consistent player-count, cooperative/competitive/toy and solo-practice badges.
- Explain unmet player requirements before Start; Light Seek currently requires
  exactly two connected players. Clearly distinguish playable seats from spectators
  where a game already supports them. Changing eligibility rules is separate work.
- Make library pagination more recognizable and evaluate preserving the last
  page after Choose Game. Keep four/six-card layouts and avoid adding filters prematurely.
- Harmonize Help, standings and replay placement while retaining each game's
  theme. Keep connection/update information readable without crowding active play.
  Refresh the screenshot gallery to the current reviewed states and repair its Sumo link.

**Done when:** a family member can choose a suitable game from the current roster
without trial and error. All 14 cards, focus order, disabled-host/client states,
short phones and long names work; header changes preserve safe areas and update access.

**Start in:** `src/components/Games.tsx`, `src/components/AppLayout.tsx`,
`src/App.tsx`, shared styles, `tests/app-layout.spec.ts`, `SCREENSHOTS.md`.

### 10. Pong: finish the ordinary rally presentation

Implementation plan: [Pong polish plan](PONG_POLISH_PLAN.md).
Status: implemented; physical-device acceptance remains. See README and QA for
behavior, regression coverage and verification requirements.

**Observed gap:** escalating bumpers already have warnings, flashes and sound.
Ordinary paddle/wall contact remains visually sparse; the local paddle is mainly
identified by color. The final winner is a status message rather than a finale.

- Pair existing paddle/wall cues with brief contact feedback and a subtle ball
  trail that keeps the current ball position unmistakable.
- Give the local paddle a small persistent identity mark and test a steering
  strip for phones if dragging on the court hides the action.
- Make point changes and the next serve easier to follow; mark match point and
  present a clear final score/winner with replay.

**Done when:** impacts and point ownership are obvious muted, with spectators
and either client at the bottom. Preserve paddle size, speed caps, bumpers and
court proportions; effects cannot imply a new collision or obscure a warning.

**Start in:** `PongGame` in `src/components/Games.tsx`, Pong styles,
`src/audio/events.ts`, `tests/pong.spec.ts` and `tests/game.spec.ts`.

### 11. Spaceship Panic: improve command attention without drowning out voices

**Observed gap:** illustrated settings and team scoring are already strong.
The order and panels are separated by a large plain gap in the sampled layouts;
audio only reports team success/mistakes/finish, rather than a new local order.

- Add restrained cockpit framing and visually connect the command/deadline to
  the controls. Improve panel picture scale where space permits.
- Add a quiet local new-command cue, a clear deadline urgency treatment, and
  distinct wrong-setting versus missed-order feedback. Make streak milestones
  celebratory without repeated alarms or sound on every second.
- Improve mission-start and mission-complete identity while keeping team score,
  completed commands and best streak prominent. Test Door versus Airlock and
  other similar picture names with a young player before redrawing them.

**Done when:** crew notice a new request and can still hear one another calling
it out. Standard/Gentle, all durations and all 24 panels stay readable; sounds
do not hint which remote control to press or replay after pause.

**Start in:** `src/components/ShipGame.tsx`, `src/components/ShipArtwork.tsx`,
Ship styles, `src/audio/events.ts`, `tests/ship.spec.ts`.

### 12. Meteor Minigolf: refine aiming and crowded-ball readability

**Already strong:** course surfaces, impact motion/sounds, power feedback, cup
celebrations and final rankings. Focus on playing comfort rather than another art pass.

- Improve the aiming arrow's length/contrast and power relationship; make
  wind direction legible with a picture as well as words. The guide must not
  promise a deterministic path when launch gusts remain unknown.
- Check eight-ball launches for overlapping labels and local-ball tracking;
  emphasize your ball while retaining useful information about others.
- Tune angle/power controls and the compact Aim dialog with real thumbs.
  Keep direct course aiming, accessible sliders and explicit Ready.
- Balance simultaneous impacts/cup captures so the important outcome stays audible.

**Done when:** players can distinguish angle from power, track their own shot and
understand the score. All five holes, zero/strong power, portrait/landscape and
reduced-motion effects remain correct; no physics retuning without new family feedback.

**Start in:** `src/components/MinigolfGame.tsx`, golf motion/results components,
`src/audio/events.ts`, `tests/minigolf*.spec.ts`.

### 13. Glow Clash: give the reveal its own sound and pacing

**Already strong:** color identity, accessible symbols, large point gains,
persistent final rankings and winner celebration. Generic result sounds still
treat a zero-point round as a success.

- Give unique claims and clashes distinct brief sounds and matching reveal
  effects. Distinguish zero unique claims from earning points without making
  a losing round punitive.
- Improve the connection between your three selections, the revealed ownership
  and the large gain; keep total versus round gain visually separate.
- Review eight-player stripe/symbol legibility and the short-screen Pick tiles
  dialog. Keep final rankings as the main result and Inspect board secondary.

**Done when:** players can explain their gain or zero directly from the reveal.
Secret picks remain private; duplicate snapshots, ties, muted play and reduced
motion remain correct. Preserve match lengths and the existing final celebration.

**Start in:** `src/components/GlowGame.tsx`, Glow styles, `src/audio/events.ts`,
`tests/glow.spec.ts`.

### 14. Sumo Bumpers: tune the new controls on actual devices

**Already strong:** bumper artwork, collision/ring-out effects, dash trail/sound,
thumb pad, arena pressure and winner/draw treatment. The sampled wide desktop
layout leaves the ring relatively small above a separate control panel.

- Trial a side-by-side arena/control composition on wide iPads/desktop to give
  the ring more room while preserving the proven portrait-phone layout.
- Tune thumb-pad dead zone, reach and release behavior with real hands; make
  intended dash direction and recharge completion easier to recognize.
- Consider a quiet local dash-ready cue only if it helps. Check busy collisions
  and near-final pressure for readable bodies, edge danger and fair visual feedback.

**Done when:** direction/dash feel natural on iPhone and iPad, the ring remains
readable with eight bumpers, and no effect covers the closing edge. Preserve
outcome-driven ending, pressure rules and existing results; change control tuning
only with tests and physical-device evidence.

**Start in:** `src/components/SumoGame.tsx`, Sumo artwork/effects/styles,
`src/audio/events.ts`, `tests/sumo.spec.ts` and Sumo feedback tests.

### 15. Co-op Breakout: finish feedback balance and last-brick clarity

**Already strong:** generous reaction lanes, small central core, reinforced-brick
identity, steering strip, distinct hit/break/core sounds and team finale.

- Check the last few bricks for contrast and obvious remaining targets. Improve
  target highlighting if needed without larger bricks or flashing distractions.
- Pair shared-life loss with a clear, short visual decrement and serve reset;
  tune paddle saves, damage and destruction effects so the ball always wins visually.
- Balance sound during busy four-player rallies and core transitions. Make core
  names/progression readable on narrow phones with sound off.

**Done when:** the team knows what remains and notices a lost shared life without
losing the next ball. A full three-core victory, final reinforced bricks, reduced
motion and every rotated player view remain clear. Preserve the new reaction
space and ball speed; further tuning needs another family playtest.

**Start in:** `src/components/BreakoutGame.tsx`, Breakout feedback/styles,
`src/audio/events.ts`, `tests/breakout.spec.ts` and Breakout feedback tests.

## Completion checks for each implementation task

1. Keep the task focused. Record implemented behavior in README and physical
   device checks in QA; do not turn either into a session log. Favor small local
   helpers over a new universal game UI/effects framework.
2. Cover meaningful behavior: cue deduplication, score previews, confirmation,
   privacy and affected controls. Reuse existing real pairing tests. Add deterministic
   visual states for ready, interaction, reward and results where the task changes
   them; include a muted/reduced-motion state and the densest realistic roster.
3. Use the persistent live-browser QA skill. Review screenshots and actual element
   bounds at 390×844, 320×700, a short 320×568 phone, 844×390 landscape,
   768×1024 tablet and 1280×720 desktop as relevant. Include safe areas, taller
   font metrics, long names, visible focus, keyboard use and comfortable touch
   targets. Compact board cells need real-thumb testing; a viewport-fit pass
   does not establish touch usability.
4. Keep networking and lifecycle intact: host authority, fixed simulation,
   sequencing/epochs, bounded messages, pause/background handling, disconnects,
   spectators and switching without re-pairing. Validate any wire additions in
   `src/games/validate.ts` and `src/network/protocol.ts`; explain mixed-version
   compatibility and when every device must update.
5. Follow the Linux gate in AGENTS. Establish genuine Ubuntu renders before
   adding visual states; adapt the non-deploying review workflow to the actual
   `codex/` branch and affected specs. Review both Darwin and Linux images,
   retain strict budgets, and run complete local `npm run verify` plus a green
   Ubuntu verification for the **exact final commit**, without snapshot updates.
6. Check the production `/multiplayer-test/` build, cached offline startup,
   user-controlled updates and saved preferences. Test real installed iPhone/iPad
   play on household Wi-Fi: thumbs, rotation, audio unlock/recovery, multiple
   devices sounding together and host background/resume. Report what remains
   physical-device-only; do not describe an unverified implementation as ready.

After tasks 1–5, run a short family session before taking on the rest. Ask players
to point out their choice, explain their latest reward and identify the winner;
then try a busy action round muted and with sound on. Use those observations to
choose the next task and tune effects, rather than adding effects everywhere.
