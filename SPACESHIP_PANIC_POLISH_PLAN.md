# Spaceship Panic polish plan — Task 11

Status: implemented; physical-device acceptance remains. Automated acceptance uses
the complete local and exact-final Ubuntu review gates below.
This refines [Task 11 of the family polish plan](FAMILY_POLISH_PLAN.md#11-spaceship-panic-improve-command-attention-without-drowning-out-voices).

## Outcome and boundaries

Make the next command easy to notice, its deadline easy to read and mistakes
easy to understand, while leaving room for the crew to call requests aloud.
Bring the command and three local panels together into a restrained cockpit.
Preserve the illustrated controls and prominent shared-score results.

Keep 1–8 crew, solo practice, three panels per player, all 24 panel definitions,
direct setting buttons, multiplayer requests assigned to another player,
conflict-free renewals, 1/2/3-minute missions, Standard/Gentle ramps and existing
feedback delays. Correct commands still earn 100–300 points; wrong requested
settings and missed orders reset the streak without losing score. Exploring an
unrequested panel stays harmless. No new countdown before launch, rules, modes,
dependencies, external assets or generated artwork are planned.

## Implementation decisions

The cockpit uses the existing palette and pictures, a fixed 26-second deadline
meter and a five-second static urgency threshold. Wide screens use a command
column beside three panel bays with two-row settings; taller portrait phones
enlarge pictures and short screens retain their compact layout. Error hints
reserve a row on roomy screens and short landscape, and share the legend row on
short portrait phones so attempts do not move buttons. Setup groups its controls beneath
the mission instruction; the finale retains the existing shared statistics.

Optional order generations and one latest mistake record supply bounded identity
without changing rules 2 or inputs. A one-time compatibility check against the
previous checkout's validator accepted launch, wrong, missed and renewed states;
permanent tests also cover missing metadata and reject malformed additions.
Local wrong/missed cues use different soft tones; success goes to caller/owner,
and streak chimes go to the host. Streak 5/10 visuals follow best-streak crossings
and expire after 1800ms. No per-second sound, new delay or panel redraw was added.

## Evidence reviewed

Reviewed checkout `5bc0be7` on October 13, 2026: `ShipGame.tsx`,
`ShipArtwork.tsx`, `ship.ts`, `ship-controls.ts`, Ship CSS in `src/style.css`,
session launch/timer/input code, snapshot/action validators, audio mapping and
synthesizer, Ship/audio tests, README, QA and the review workflow.

Visually reviewed the checked-in Linux ready, active, success, scored-results
and all eight panel-set images, plus the Darwin active image. Also reviewed
existing full-page captures in `test-results`: 1280×720 active, 844×390 active,
390×844 wrong setting and 320×568 active with taller font metrics. Disposable
captures are supplementary evidence, not new baselines or proof of a current
live pass. This planning review ran no browser or physical-device checks.

- The phone and wide desktop images confirm the empty separation between order
  and controls. `.ship-panels` consumes remaining flex space and centers its
  contents. The short-landscape composition already places the command beside
  the panels; preserve that useful arrangement.
- At 390px, the compact media rule makes setting artwork 28px and legend artwork
  26px. Short layouts shrink those to 22px/20px. The 320×568 taller-font capture
  is already dense: enlarge pictures where space exists, without applying the
  same enlargement everywhere.
- All eight panel sets have clear labels, selection checks and consistent SVG
  families. Door, Window and Airlock have different panel icons but share the
  same generic Open/Closed setting drawings. Keep names and matching callout
  pictures; establish whether children confuse them before changing artwork.
- Wrong settings keep the caller's order pending. The owner gets a red panel
  outline and tiny “Try another setting” hint. Misses change the caller's order
  to `missed`. These are different events with different recovery actions.
- `soundFrame()` retains only Ship phase/completed/mistakes. `soundEvents()`
  emits generic success, wrong and win; it cannot identify new local commands
  or distinguish wrong from missed. It currently chooses success ahead of a
  simultaneous mistake. Orders have no durable generation identity.
- `startShip()` increments the room epoch, including rematches. The shared
  audio mapper suppresses changed keys; launch audio must handle that boundary
  deliberately without weakening stale-event suppression for other games.
- The existing finale already emphasizes score, completed commands and best
  streak. Improve its mission identity and composition rather than adding
  competitive rankings to this cooperative game.

## 1. Compose a connected cockpit

Group team status, command/deadline and local panels into a Ship-specific layout.
Use the current ink/mint/cream palette, subtle inset framing and small static
cockpit details. Keep text and picture contrast stronger than decoration.

On portrait phones, place panels directly beneath the command with a deliberate
bounded gap rather than independently centering them in remaining space. Give
the buttons more picture area on taller phones; retain readable setting labels,
selection checks, focus outlines and at least 44×44px targets. Keep all three
panels and Pause/Help visible. Reserve space for feedback so errors do not move
buttons during a timed request.

For landscape iPads, trial a command/status area beside three generous panel
bays, using the existing short-landscape arrangement as a starting point.
Compare it with a closely grouped command-above-panels layout and retain the
one that gives the actual household iPads clearer commands and larger pictures.
Do not stretch the short-phone grid across all tablets or center tiny controls
in a decorative stage. Short landscape keeps its compact two-column treatment.

Visually link the command and local controls through common framing and clear
labels such as “Call this out” and “Your panels.” Do not draw an arrow to, mark,
or auto-select the remote requested control. A player's own incoming request
must still be communicated by their crewmate. Keep solo wording explicit.

## 2. Establish reliable, bounded feedback

Add the smallest additive Ship metadata needed to avoid guessing events:

- An optional per-caller order generation number, starting at launch and
  increasing only when that caller gets a replacement order. It stays unchanged
  while remaining time, status or wrong attempts change. Combined with the room
  epoch, it identifies even consecutive identical panel/setting requests.
- An optional latest mistake record with the existing cumulative mistake count
  as its sequence, a `wrong`/`missed` kind, caller and control index. Write it
  only when a requested wrong setting or deadline miss actually resolves.
  Multiple misses in one step advance the real count for every miss and retain
  one deterministic latest record. No event history or catch-up alarm queue.

Use existing completion, order award, streak and best-streak values for success
and milestones; do not add redundant scoring fields. Copy primitive feedback
values into audio frames because the host room can mutate between snapshots.
Use a small Ship helper for event comparison and urgency rather than a shared
effects framework.

Validate optional metadata in `src/games/validate.ts`, including integer bounds,
sequence/counter consistency, setting/control applicability and caller/crew
relationships. Preserve existing input revision, ownership and protocol guards.
Document the additive fields in `src/network/protocol.ts`; prove compatibility
with metadata absent and with the previous validator before calling it compatible.
An older host supplies existing visual states and conservative generic feedback;
new consumers must omit precise cues they cannot identify. Recommend updating
all devices for the full experience. Change a protocol/rules version only if
actual compatibility testing requires it.

Initialize comparisons silently on mount, late join and recovery. Ignore repeated
or older sequences; clear temporary effects on pause, disconnect, game/epoch
change and background recovery. Resume never counts as a new command. A delayed
snapshot may produce one latest relevant cue; it must not reconstruct every
unseen event or attribute an aggregate mistake delta to a guessed cause.

## 3. Attention, urgency and recovery

Give a newly observed local pending order a brief static emphasis and quiet
neutral synthesized cue. Use the same cue for every panel/setting: it conveys
attention, not an answer. Do not play it for remote orders or spectators.
Repeated 250ms snapshots and changing seconds must remain silent.

Keep remaining seconds and add a compact deadline meter. Prefer an absolute
time scale with a maximum of 26 seconds, so pause or joining midway cannot
reset a misleading “full” meter. At five seconds remaining, add a stable amber
outline and explicit “Time low” wording. No tick, repeated alarm, flashing or
screen shake. The deadline stays authoritative and freezes on pause; urgency
is suspended with the controls. Avoid live-region announcements every second.

Strengthen the owner's wrong-setting state with readable “Wrong setting · try
another” feedback near the affected panel, reserving its space. Keep the order
pending and controls available; never reveal the requested value as a correction.
For a missed local order, show “Time ran out · next command soon,” with a distinct
static expired treatment. Communicate a streak reset without implying score loss.

Use separate short, soft wrong-setting and missed-order sounds. Play wrong
feedback on the panel owner's device and missed feedback on the caller's device;
in solo play that is the same player. Other devices keep synchronized team status
without duplicating each error alarm. Persistent wrong-panel visuals still work
when a coalesced snapshot omits a transient sound event.

Celebrate team best-streak thresholds 5 and 10 once each per mission. Use a compact
“Crew streak 5!”/“Crew streak 10!” treatment by team status; no modal or button
movement. Compare best streak so rebuilding the same streak after an error does
not repeatedly celebrate. A delayed jump across both thresholds shows only the
highest new milestone. Reset milestone tracking on a fresh mission; late joins
and recovery establish a silent baseline.

Bound sound density: prioritize mission finish, relevant local mistake,
new local command, milestone, then ordinary success. Emit at most one selected
Ship cue per snapshot; do not queue lower-priority sounds. Keep ordinary success
quiet and prefer routing it to the caller/panel owner rather than every device.
Spectators receive the shared finale only. Milestone audio should initially play
on the host only; everyone gets the visual celebration. Tune actual loudness
through the existing synthesizer, adding per-cue gain only if its current level
cannot meet the quiet-attention goal. Retain mute-by-default, gesture unlock,
saved preference and bounded voices.

## 4. Mission identity

Give setup a compact cockpit/mission emblem, the call/listen/tap instruction,
existing duration/pace controls and clear solo/team wording. Launch goes straight
to the first command; use its attention cue as the launch sound instead of
stacking two sounds. Handle an observed host launch/rematch across the epoch
boundary narrowly for Ship. An initial snapshot, late join, reconnect or game
switch never produces a launch effect.

At finish, replace the command centerpiece with a persistent “Mission complete”
crew treatment. Keep team score largest, completed commands and best streak
prominent, and pace/duration readable. A zero-command mission still gets a kind,
clear result without fabricated success claims. Preserve host-only Launch Again,
configuration and Help; clients know the host launches the next mission.
Spectator wording does not claim participation. Fit short phones/landscape
without retaining a second full control board alongside results.

Reduced Motion replaces entry/celebration motion with static outlines and labels.
All event meanings remain understandable with sound off. No effect should cover
a command, selected check, deadline or setting name.

## Implementation order and verification

1. Inspect status/diff and preserve unrelated work. At implementation start,
   confirm GitHub CLI authentication, remote and `.github/workflows/review.yml`
   access on a new `codex/ship-polish` review branch. Establish the genuine Ubuntu
   artifact route before adding screenshot states. No Pages deployment.
2. Add bounded metadata/comparison helpers and unit tests, preserving gameplay.
   Cover identical consecutive commands, wrong attempts while already wrong,
   unrelated changes, simultaneous misses, capped scoring, every duration/pace,
   validation, missing metadata and lifecycle resets. Extend audio tests for
   local roles, cue priority, coalesced/repeated/older snapshots, milestones,
   launch epochs, late joins, pause/resume, background recovery and rematches.
3. Implement cockpit, urgency, error and finale presentation. Run
   `npm run check:fast`, build, then `npm run test:game -- ship` while iterating.
   Include `npm run test:network` for wire/session work, affected shared/PWA tests
   for audio/lifecycle changes, and app-layout coverage for global CSS changes.
4. Use the `playwright-interactive` skill for persistent live QA of the production
   `/multiplayer-test/` build. Follow QA.md's stable origins, build/update checks
   and supported dialog handling. Prepare host/client/spectator inventory before
   interactions: setup, launch, remote call/answer, repeated wrong attempts,
   unrelated exploration, recovery, low deadline, miss, milestone, pause/resume,
   results, rematch, late join, departure and switching without re-pairing.
   Exercise touch and keyboard normally; inspect post-action state and screenshots,
   then make a brief exploratory pass. Live QA remains required for implementation.
5. Prioritize QA.md's household viewports: 402×874 and 440×956 phones,
   1180×820 landscape iPad Air, secondary 1080×810 iPad, and phone rotations.
   Retain 390×844, 320×700, 320×568, 844×390, 768×1024 and 1280×720 regressions.
   Check taller fonts, safe-area padding, readable contrast, visible focus,
   44px targets, all three panels/controls above the fold and secondary Help
   scrolling. Batch bounds checks; retain every existing fit assertion.
6. Keep real pairing and eight-player/all-24-panel coverage. Establish visual
   states through normal controls and frozen clocks; assert synchronized scores,
   commands and selected values before capture. Add deterministic low-deadline,
   wrong, missed and milestone states; retain ready/active/success/paused,
   zero/scored results and all eight panel sets. Include muted/reduced-motion
   and household landscape-iPad evidence, preserving strict dimensions, bundled
   fonts and existing pixel budgets. Do not widen comparisons to hide motion.
7. Settle live findings before final baseline generation. Review Darwin changes;
   obtain narrowly scoped genuine Ubuntu renders for affected specs via the
   read-only `linux-baseline-evidence-<sha>` artifact route in QA.md. Review every
   new/changed Linux image, including all refreshed panel sets. Never substitute
   Darwin images. Run complete local `npm run verify`, then push final reviewed
   files and obtain ordinary Ubuntu verification for that exact commit with
   snapshot updates disabled. Generation is evidence, not the final gate.
8. Check production subpath routing, cached offline startup after an online visit,
   saved preferences and waiting updates without active-game reload. Record
   implemented behavior in README, coverage/device follow-up in QA, refreshed
   gallery links in SCREENSHOTS and Task 11 status in FAMILY_POLISH_PLAN. Review
   final diff/status and report local results, exact Linux commit/run URL,
   baseline review and remaining physical checks.

## Physical acceptance and completion

On household Wi-Fi, play Safari and installed-PWA missions on the household
phones and landscape iPads. Confirm actual usable area, safe areas, rotation,
real-thumb panel reach, readable labels and foreground/background recovery.
Have a young player match spoken Door/Window/Airlock and other similar names to
their panel and setting pictures. Redraw only demonstrated recognition problems,
preserving matched command/control artwork and all definitions.

Listen first with two devices, then a busy crew with as many household devices
as available. Verify that commands are noticed while voices stay intelligible,
wrong versus missed is recognizable, and milestone/finish sounds are comfortable.
Test mute, gesture unlock, Safari audio recovery and Gentle/Standard at early and
late pressure; retain automated coverage for all six pace/duration combinations.

Task 11 is implemented only after complete local and exact-final Ubuntu gates,
reviewed platform images and persistent live QA. Physical acceptance remains
explicitly pending until the family confirms recognition, thumb comfort and
multi-device listening. Missing Linux renders/execution or live QA makes the
implementation incomplete, not ready to merge.
