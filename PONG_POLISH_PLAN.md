# Pong polish plan — Task 10

Status: implemented; automated verification is being completed and physical-device
acceptance remains. This
refines [Task 10 of the family polish plan](FAMILY_POLISH_PLAN.md#10-pong-finish-the-ordinary-rally-presentation).

## Implementation decisions

Confirmed ordinary contacts use the optional latest `pongContact` record with a
bounded sequence, kind and canonical coordinates. Wire records survive points
for monotonic sequencing; visual effects clear on point/pause/recovery and fresh
matches reset the record. Existing bumper, point, serve and finish sounds remain.

The steering-strip trial retained a native 44px range control on taller portrait
phones only (width up to 650px, height at least 700px). Short phones, landscape and
iPads retain court/keyboard/Help-slider controls to preserve board space. Physical
thumb comfort remains pending. Finales use a fitted two-column layout on short
landscape screens, retain the selected rematch seats and show persistent results.

## Direction and boundaries

Make ordinary rallies understandable with sound off: players can identify their
paddle, see actual contacts, recognize who earned a point, prepare for the next
serve and read the final winner and score. Keep the ball and bumper warnings the
strongest moving information on the court.

Use existing SVG/CSS artwork, the local synthesizer and small Pong-specific
helpers. Preserve first-to-seven scoring, paddle dimensions and clamps, speed
caps, fixed 120 Hz host simulation, bumper timing/placement/reset rules and the
650:1000 visible court. Both seated players still defend the bottom of their own
view; spectators retain the Player 1 orientation. No new modes, deadlines,
dependencies, external assets or generated artwork are planned.

## Evidence from the current checkout

These are code and documentation findings, not new live-browser or device results.

- `PongGame` in `src/components/Games.tsx` rotates canonical host coordinates for
  each player, renders local paddle movement immediately and interpolates client
  ball snapshots over 50 ms. Preserve these behaviors.
- Paddles currently rely mostly on color. The score number animates whenever its
  keyed element mounts with a positive score; status says “Get ready…” during
  serve and names the winner at finish. There is no separate finale.
- `src/audio/events.ts` detects ordinary paddle/wall cues from velocity sign
  changes, with bumper-hit counters taking priority. Sparse/coalesced snapshots
  can miss or misidentify contacts, so the same inference should not place a
  supposedly exact visual impact.
- Regular Pong physics lives in `src/games/model.ts`, not a standalone `pong.ts`.
  Arena already has optional sequenced confirmed-contact metadata in `PongState`;
  use its validation/lifecycle approach as a reference without reusing Arena's
  field or changing Arena/Breakout behavior.
- `tests/pong.spec.ts` covers real pairing, both bottom views, captured drags,
  mirrored sliders, keyboard movement, bumper states, pause, scoring and recovery.
  Its layout checks retain court proportions and a minimum 200px long axis with
  system/taller fonts. Keep those assertions and existing pixel budgets.
- `BreakoutGame.tsx` provides a useful court/steering-strip input pattern. Pong's
  short-landscape layout already uses two columns; controls must respect it.

## 1. Confirm contacts before decorating them

Add a small optional regular-Pong contact record to `PongState`, produced only by
the authoritative simulation when an actual paddle or wall collision resolves.
Use a monotonic sequence within the match, a paddle/wall kind and bounded
canonical contact coordinates. Keep only the latest record; do not introduce an
unbounded event history or replay every missed contact after delayed snapshots.
At a simultaneous contact, choose a deterministic priority (paddle before wall)
for the single presentation event; physics still resolves every collision.

Record the contact at the actual boundary, not the later snapshot ball position.
Bumper reflections must never generate ordinary paddle/wall events. Clear stale
contact presentation on point/reset; retain sequence monotonicity until a new
match/epoch. Add strict validation in `src/games/validate.ts`, document the wire
addition in `src/network/protocol.ts`, and test valid/invalid coordinates, kinds,
sequences and applicability to regular Pong.

Use a focused feedback helper to compare confirmed records and score transitions.
Initialize from the current snapshot on mount/late join, ignore repeated or older
records and reset the comparison on room epoch/game changes. Pausing,
background recovery, disconnect/reconnect and rematches must not replay stale
impacts or points. A coalesced snapshot shows the newest confirmed contact once;
it need not reconstruct unseen intermediate hits.

New consumers should tolerate an absent optional contact field: omit exact
impact effects rather than invent them. Confirm actual older validators accept
the additive field before claiming compatibility. For absent metadata, retain
the existing audio fallback only if it can stay isolated from confirmed events
without double cues. Document that all devices should update for the complete
feedback experience; preserve protocol version/epochs and existing input messages.

## 2. Make rallies readable

Draw a brief, restrained contact arc/flash at the confirmed location, with
different paddle and wall treatments. Rotate it with the same canonical court
transform as the ball and bumpers. Keep effects behind the solid ball, away from
warning symbols and visibly distinct from a new obstacle. Reuse existing
paddle/wall sounds from the same confirmed event source.

Add a short, faint ball trail following the displayed/interpolated position,
without extrapolating future motion or connecting across a serve teleport.
Bound its sample count and lifetime; clear it on point, pause, epoch change and
background recovery. Reduce Motion disables the trail and expanding motion;
brief static contact emphasis still communicates the event. Animation work must
not rerender network state or affect the simulation/input cadence.

Give the local paddle a small persistent non-color marker, such as an inset
double notch, and connect it to a compact “You · bottom” score label. The mark
must move immediately with the local paddle without changing its dimensions or
hit area. Opponent names and spectator bottom/top identity remain explicit;
spectators never receive a “your paddle” mark or enabled steering control.

## 3. Trial a phone steering strip

Trial a compact strip below the court using Breakout's established approach and
the same `move` function as court dragging, keyboard input and the Help slider.
Keep court dragging available. Label the strip, show its local position and
provide at least a 44px touch target without adding repeated instructions.

Verify left/right mirroring, immediate local response, clamp extremes, pointer
capture outside bounds, release/cancel/lost capture and fresh drags. Only active
play surfaces suppress gesture scrolling; Help remains scrollable. Controls are
disabled when paused, finished, disconnected or watching.

Retain the strip only if live layout/input QA preserves existing court fit and
household iPad board space. Use the short-landscape control column where needed.
Physical thumb-obscuration and comfort remain a device acceptance check; browser
emulation cannot establish that the strip solves them. If fitting it compromises
the court, defer it and retain the proven court/slider/keyboard controls.

## 4. Explain points, serves and the finale

Keep the two scores in stable seat order and label their relationship to the
rotated court. On a confirmed increase, emphasize only the scorer's score and
show a compact “Emma +1” message outside the ball path. Use authoritative score
differences, not ball disappearance. Do not animate old positive scores on mount,
resume or late join; a delayed multi-point jump reports the actual gain once.

During the existing one-second serve, keep the reset ball visible and show
“Get ready” with progress derived from `serveIn`. The ball's authoritative serve
direction can supply a small direction marker; do not add a countdown delay or
suggest a player must press Serve. On resume, use neutral get-ready feedback,
not a fabricated scoring message.

At six points, label that player's “Match point”; at 6–6, label both. Keep it
visible through rallies and pause, without a repeated alarm or flashing banner.
Refine point identity visually first; no extra match-point sound is required.
Prioritize finish over point over contact when one snapshot contains several
outcomes, preserving existing win/finish and serve cues and bounded voices.

At finish, promote the named winner, final score and the local player's result
(or spectator wording) in a persistent compact finale. Retain selected-seat
rematch controls, host-only “Play Again,” Help and Choose Game. Clients can read
that the host starts the next match. Keep scores available until that action;
give short phones a fitted finale rather than stacking a second full board and
result card. Long names must wrap clearly without hiding scores or replay.

## Implementation order and automated checks

1. Inspect status/diff and preserve unrelated work. Check GitHub CLI authentication,
   remote and QA.md's artifact access before adding screenshot states. Use a new
   `codex/pong-polish` review branch and existing non-deploying `review.yml`.
2. Implement confirmed contacts, validation and feedback/audio deduplication.
   Cover paddle contacts on both sides, both walls, bumper-only and simultaneous
   impacts, coalesced/repeated/older snapshots, scoring priority, first snapshot,
   pause/recovery, epoch changes and rematch. Assert unchanged physics outcomes.
3. Implement contact visuals, trail and local identity; then point/serve/match-point
   states and finale. Trial the steering strip and settle layouts before baselines.
4. Extend real-pairing browser tests for both seated orientations and a watching
   host with two clients. Check synchronization, controls, natural points/finish,
   6–6, replay, disconnect/background and switching without re-pairing.
5. Complete persistent live QA and fix findings. Record implemented behavior in
   README, automated/device acceptance in QA and reviewed states in SCREENSHOTS.
   Link this plan from Task 10 and update status only as work actually completes.

Run `npm run check:fast` while editing and `npm run test:game -- pong` after a
production build. Include relevant model, audio and validator unit coverage,
`npm run test:network` for the wire addition, and guarded browser coverage for
`tests/game.spec.ts`, `tests/app-layout.spec.ts` and `tests/updates.spec.ts` as
affected. Shared Pong/audio changes also need Arena/Breakout regressions. Use the
package guards; do not rebuild shared dist or edit files while another suite runs.

## Live QA, visual evidence and completion

During implementation, use the `playwright-interactive` skill with QA.md's stable
production origin, build checks, independent identities and supported update
dialog handling. Apply waiting updates from Home before pairing. Planning alone
does not require browser execution.

Prepare an inventory covering ready/serve/rally/point/match-point/paused/finished;
both seated views and spectators; muted/sound-on/reduced motion; court/strip/slider/
keyboard; long names and full eight-person connected roster with two seats; zero
through four bumpers; Help/focus/scrolling; pairing, switching, recovery and replay.
Exercise ordinary controls, inspect meaningful post-interaction states and do a
brief exploratory pass. Review screenshots and bounds for readability, contrast,
focus, clipping, touch targets and viewport clearance.

Prioritize 402×874 and 440×956 phones with rotations, 1180×820 landscape iPad Air
and secondary 1080×810 iPad. Retain 390×844, 320×700, 320×568, 844×390,
768×1024 and 1280×720 regression checks, safe-area fixtures and taller fonts.
Preserve court proportions, existing minimum bounds and generous clearance.

Capture a minimal deliberate set: local-identity rally/contact, point/next serve,
match point and finale, including mirrored client and spectator meaning, reduced
motion and long-name layouts. Establish states through normal controls and
controlled time, assert synchronized state before capture and freeze at a known
simulation step. Never capture incidental live positions, inject room state or
increase comparison budgets to hide nondeterminism.

Review scoped Darwin images, dispatch narrowly scoped genuine Ubuntu baseline
evidence through `review.yml`, download the matching artifact and review every
new/changed Linux image. Preserve bundled fonts, dimensions and pixel budgets.
After the last substantive fix, run complete local `npm run verify`, including
snapshot-pair checks, then push the final reviewed code/tests/baselines and wait
for ordinary Ubuntu `npm run verify` for that exact commit with snapshot updates
disabled. Baseline generation is evidence only; it is not final verification.

Verify production `/multiplayer-test/` routing, cached offline startup, saved
identity/color/sound preferences and user-controlled updates. No merge or Pages
deployment is needed for verification. Handoff reports diff/status, exact local
commands/results, Linux run URL/commit and reviewed baselines. Missing live QA,
genuine Linux images or exact-final Linux verification leaves implementation
incomplete.

Physical acceptance remains on household iPhones/iPads in Safari and installed
PWAs: actual usable viewport/safe areas, rotation, real-thumb reach/obscuration,
larger text/VoiceOver, Wi-Fi pairing, host background/resume and audio unlock/
recovery. Play a busy bumper rally muted, then with sound across devices. Ask
players to identify their paddle, name the scorer, recognize match point and
identify the final winner. Confirm the ball and warning rings stay readable and
decide whether the steering strip improves comfort. Record pending checks honestly.

Planning changes require formatting and diff checks only. Task 10 succeeds when
ordinary contacts and point ownership are obvious muted, both bottom views and
spectators are clear, and the finale supports replay without changing the game.
