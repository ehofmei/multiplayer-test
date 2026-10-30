# Meteor Minigolf polish plan — Task 12

Status: implemented; physical-device acceptance remains. Automated acceptance
uses complete local and exact-final Ubuntu verification, as specified below.
This refines [Task 12 of the family polish plan](FAMILY_POLISH_PLAN.md#12-meteor-minigolf-refine-aiming-and-crowded-ball-readability).

## Outcome and boundaries

Make it easy to choose a direction and strength, understand the wind, follow your
ball through a crowded launch and recognize your reward. Preserve the existing
cosmic-garden artwork, motion, cup celebration and final rankings. Prioritize
the household phones and landscape iPads; this is a playing-comfort refinement.

Keep all five courses, 2–8 players, one simultaneous shot per hole, untimed aiming,
explicit Ready, private shots and launch-only condition disclosure. Preserve
the 120 Hz host simulation, power curve, friction, collision geometry, wind,
meteor timing/forces, cup thresholds, scoring, preview/results durations and
natural settling. No physics retuning, predicted trajectories, camera following,
new modes, dependencies, external assets or generated artwork are planned.

The proposed work is local presentation and feedback. No wire fields or protocol
version changes should be needed. Keep existing validation, room epochs, input
sequencing, pause/recovery and spectator behavior intact. If implementation
reveals a genuine need for network additions, reassess that scope and validate
them in the game validator and protocol before proceeding.

## Implementation decisions

Feedback stays graphic: a filled direction shaft, compass pointer, local ring and
compact number/You badge. Full explanations remain in Help; no new gameplay
instruction block was added. Equal-width phone sliders preserve green size;
separate rows are reserved for taller phones and wide control panels. The compact
Aim dialog replaces its instruction paragraph with a graphical preview.

Labels use deterministic screen-space overlap groups and bounded nearby slots,
placing the local identity first. A bounded nearest-free grid handles packed
edges when nearby slots are blocked. Crowded opponents share +N; their complete
identities remain in the accessible course summary and numbered Standings.
Physics, calibration and the wire protocol are unchanged. Golf audio chooses one
relevant cue per snapshot, with personal rewards ahead of impacts; reward/finish
preempt active Golf voices and missed events are not reconstructed after recovery.

## Evidence reviewed

Reviewed checkout `161d769` on October 30, 2026, with a clean working tree:
`MinigolfGame.tsx`, `GolfCourseArtwork.tsx`, `GolfMotion.tsx`, `GolfResults.tsx`,
Golf CSS in `src/style.css`, `minigolf.ts`, `golf-motion.ts`, shot/snapshot
validation, audio mapping/hook/synthesizer, relevant unit and browser tests,
README, QA, SCREENSHOTS and the non-deploying review workflow.

Visually inspected checked-in Linux phone aiming/strong-power, short-phone/Aim
dialog, portrait tablet, all five course compositions, launch, desktop rolling,
cup, near-cup, reduced-motion meteor, single-winner and eight-winner images.
Also compared the Darwin active image and inspected existing full-page
`test-results` captures for short landscape and eight-player short-phone aiming
with alternate font metrics. Those disposable captures are supplementary evidence
with unverified provenance; they do not establish a current live pass. This
planning review did not run gameplay, audio listening or physical-device QA.

Findings that drive the work:

- The direction guide is fixed at 180 world units, with a dark underlay and white
  dashed stroke. Its apparent length shrinks with course scale; 60% and 100%
  screenshots show the same arrow. The power meter already has useful human
  labels. Keep its distinction from direction while making their relationship
  easier to read directly on the green.
- Wind is currently a Unicode arrow and direction word in a sentence. Both wind
  and angle already rotate into screen coordinates; preserve that correct mapping.
  Actual strength and meteor time are hidden by `golfView()` until launch.
- The aiming ball has an outline. Rolling only makes the local ball larger
  (radius 15 versus 10), and array order can paint another ball over it. Labels
  use separate per-ball proximity lists and fixed world-space offsets. That
  does not establish a consistent layout for overlapping groups, screen edges
  or a rotated course. The two-ball launch already bunches the labels.
- The eight-player browser journey launches identical shots and checks eight
  numbers, then captures final rankings. It does not assert label separation
  or retain an eight-ball rolling baseline. Final rankings are already readable
  and scroll internally; retain them.
- The compact Aim dialog provides sliders and Close, but the course is behind
  the modal. The main angle slider gets one third of the slider-row width;
  fine adjustment deserves particular attention on narrow phones. Both slider
  hit areas are already at least 44px high. Touch comfort remains unproven.
- Audio deduplicates contact kinds within a snapshot, but can emit several
  different kinds together. Contacts retain ball IDs; mapping immediately
  discards them. Any golfer's cup contact can suppress the local points cue,
  and a golfer captured earlier can hear points again when the hole settles.
  Lock and ordinary results still use generic cues. The synthesizer's eight-voice
  cap and 60ms per-cue suppression are safeguards, not an outcome-priority policy.

## 1. Clarify direction, power and wind

Keep a fixed direction shaft with a clear arrowhead and dark contrast outline.
Increase its useful on-screen reach on small greens, using a bounded scale-aware
length and screen-stable stroke rather than enlarging the course or its ball.
Keep the arrowhead and shaft readable against grass, walls and meteor markings.
At outward angles, clip decoration inside the green without changing the shot;
do not insist that the entire guide fit by shrinking the board.

Show power through a filled portion or segmented accent along the fixed shaft,
with a distinguishable unfilled remainder. The arrowhead continues to identify
direction; changing power changes the accent, not the endpoint. Retain the
percentage and Gentle/Medium/Strong meter as the precise strength control.
At zero, show an empty accent and the existing explanation/disabled Ready.
At 100%, show a full accent without implying a landing point. Avoid distance
rings, collision previews or a line that bends with unrevealed gusts. Explain
briefly in Help that the guide shows direction and strength, while the gust
strength is revealed at launch. Use static geometry under Reduced Motion.

Add a small local SVG wind pointer beside the weather text, using the same
screen-relative transform as the shot controls. Keep direction words for
accessibility and comprehension; before launch, retain “Gust revealed at launch.”
After launch, retain Still air/Light gust/Strong gust. The pointer describes
direction, even when the revealed strength is zero; it must not invent a
strength animation or suggest a known pre-launch force. Avoid timer announcements.

## 2. Make aim adjustment comfortable

Keep direct tee dragging, the current generous grab area, release-to-preview,
cancel-to-restore and Ready-after-release behavior. Preserve the existing
120 CSS-pixel full-power drag calibration initially. Change gesture sensitivity
only if household thumb testing demonstrates a problem, with focused regression
coverage for the chosen change.

Give Angle and Power visibly separate rows on roomy portrait phones and in the
compact dialog, so angle is not a short track beside a much longer power track.
Retain the compact arrangement where height requires it; do not sacrifice board
area merely to force the same controls everywhere. Landscape iPads should keep
a generous green beside a compact control area. The portrait-tablet screenshot
is evidence for that orientation only; validate the household landscape layout.

Add a small, noninteractive direction/power preview inside Adjust shot, sharing
the main guide's screen-relative semantics. This allows adjustment while the
course is obscured. Keep native range inputs, 1°/1% keyboard steps, visible focus,
readable values and at least 44px target height. Add concise angle value text
explaining the screen convention, with visual right/down reference marks where
space permits. Avoid a new dial or precision mode unless device testing requires it.

Closing/Escape preserves the draft and returns focus to Adjust aim; it never
locks or fires. Ready stays on the main screen. Resize, pause, background,
disconnect and pointer cancellation must restore an interrupted drag and must
not commit. Rotation preserves world angle/power while updating screen labels,
guide and wind together. Keep Help, Standings and dialog content scrollable.

## 3. Follow your ball through eight-player shots

Use a persistent high-contrast local ring and a compact number/“You” badge,
matching the aiming identity. Render the local ball and identity above other
balls and cosmetic effects. Keep its true host-confirmed position, smoothing
and capture behavior; never separate overlapping bodies to make them readable.
Do not pulse continuously or add a trail that suggests an unconfirmed path.

Replace independent proximity offsets with one small deterministic label-layout
helper. Work in the displayed orientation and account for actual scale, text
bounds and course edges. Reserve the local badge first, then place other numbers
in stable roster order using a bounded set of nearby slots. Keep labels upright
and use a short leader only when needed to identify their ball. Avoid random
offsets and labels that swap order every snapshot.

When a dense cluster cannot show every number legibly, preserve the local
identity and use a compact “+N other balls” cluster badge rather than drawing
overlapping text. Count other balls accurately, keep separated numbers visible,
and expose full identities through an accessible summary and Standings. Add ball
numbers to Standings so the course and full names can be matched without placing
eight names on the green. Spectators get neutral numbers/clusters without a
fabricated local identity. Captured balls no longer occupy moving-ball label
slots; retain the shared cup highlight and readable capture/reward feedback.

Test identical positions, partially overlapping chains, separated balls,
all four edges/corners, rotated courses and a local player late in roster order.
Reserve label space for local near-cup points, or rely on the existing large
reward card when an extra on-course score would collide. Keep +100/near-cup gain
separate from the total, and retain the persistent final standings and ties.

## 4. Give important outcomes audible priority

Select Golf cues before discarding contact ball IDs. Start with at most one Golf
cue per snapshot, in this order: match finish, your new cup capture, your new
hole result, shared launch/local lock, shared meteor, your mushroom/rail contact,
then a remote cup capture. A launch replaces a simultaneous last-player lock.
Keep distinct putter/knock/spring/thump/cup identities. Give lock a quiet
confirmation and distinguish positive distance points from a neutral zero result.

Play ordinary contact and personal reward cues only on the relevant golfer's
device. For a remote cup capture, use the host as the single shared playback
device, with its own higher-priority feedback taking precedence. Everyone still
sees all contacts and rewards; spectators receive shared launch/meteor/finish
feedback but no personal cues. Multiple same-snapshot captures share one cue.
This is the initial listening policy, to be tuned with the family.

Do not replay points for a ball whose cup capture has already been observed,
or let somebody else's capture erase your distance reward. A later observer can
still read the authoritative reward card without reconstructing missed sounds.
Use existing captured flags, hole scores, phase, ticks and contact IDs; no event
history or new network metadata. Keep repeated/older frames, gaps, pause/resume,
reconnect, background recovery, new epochs and late joins silent. Establish
comparisons silently on recovery and clear temporary effects.

Retain mute-by-default, saved preference, gesture unlock and bounded voices.
If rapid consecutive contacts remain noisy, add a small Golf-specific contact
cooldown/gain adjustment in the existing audio path, not a shared audio framework.
Never queue suppressed contacts; cup/finish must remain clear even when recent
contact voices are active. Test that case at the synthesizer boundary as well as
the event mapper. Final loudness and multi-device density require listening.

## Implementation order and verification

1. Inspect status/diff and preserve unrelated work. At implementation start,
   check GitHub CLI authentication, remote and `.github/workflows/review.yml`
   access on a new `codex/minigolf-polish` branch. Establish the genuine Ubuntu
   artifact route before adding visual states. No Pages deployment.
2. Implement small Golf-specific guide/coordinate and label-layout helpers,
   followed by cue selection. Cover rotated direction/wind, power endpoints,
   stable clustering, bounds, local paint priority, spectators, simultaneous
   contacts/captures, zero/positive rewards, lock/launch and lifecycle suppression.
   Retain all existing physics/validation/session tests. Update the fixed-guide
   test to assert that power changes its accent while leaving direction/endpoints
   unchanged; test scale-aware length separately.
3. Implement presentation and controls. Run `npm run check:fast`,
   `npm run build` and `npm run test:game -- minigolf` while iterating. Add
   `npm run test:network` if session/protocol code changes; cover shared audio/PWA
   behavior for audio/lifecycle edits and app-layout for shared CSS edits.
4. Use the `playwright-interactive` skill for persistent live production-preview
   QA under `/multiplayer-test/`. Follow QA.md's stable 4174 host/client origins,
   4175 spectator, build checks, Home-first updates and supported dialog handling.
   Prepare the inventory below, use normal controls, inspect meaningful states
   and screenshots, then make a brief exploratory pass. Keep low-level touch
   gestures in their own context. Resolve findings before final baselines/gates.
5. Extend real-pairing browser coverage, reusing the existing eight-player journey.
   Establish crowded states through deliberate normal shots and frozen clocks;
   assert equal host/client hole, phase, ticks and ball positions before capture.
   Let cosmetic interpolation reach a known point. Capture eight identical
   launches, a dispersed/busy shot, local ball 8, short-phone dialog, power
   extremes and household landscape iPad. Include muted/reduced-motion evidence.
   Test label bounds/separation or deliberate cluster fallback, child enclosure,
   focus/keyboard use, 44px controls and viewport fit. Do not assert only that
   eight text nodes exist. Keep all five holes and existing results regressions.
6. Prioritize 402×874 and 440×956 phones, their rotations, 1180×820 landscape
   iPad Air and secondary 1080×810 iPad. Retain 390×844, 320×700, 320×568,
   844×390, 768×1024 and 1280×720 regressions, taller fonts and long names.
   Inspect actual usable bounds, safe areas, contrast and screenshots; retain
   existing fit assertions and maximize the green within comfortable controls.
7. Review changed Darwin images, then obtain scoped genuine Ubuntu renders for
   the affected Minigolf specs using QA.md's read-only
   `linux-baseline-evidence-<sha>` route. Review every new/changed image on both
   platforms. Keep bundled fonts, strict dimensions and the current 180-pixel
   comparison budgets. No blanket snapshot refresh or Darwin-to-Linux copying.
   Run complete local `npm run verify`, then obtain ordinary Ubuntu verification
   for the exact final pushed commit with snapshot updates disabled.
8. Check production subpath startup, offline reload after an online visit,
   saved identity/sound and user-controlled updates without active-game reload.
   Update README behavior, QA coverage/device follow-up, SCREENSHOTS links and
   Task 12 status. Review final diff/status and report local commands/results,
   exact verified Linux commit/run URL, baseline review and physical checks.

## Live and physical acceptance inventory

Exercise host, client, ball 8 and late spectator perspectives: setup, suggested
aim, 0/low/60/100% power, cardinal/diagonal angles, direct drag/release/cancel,
slider keyboard/touch, compact dialog close/Escape, Ready and last-player launch.
Play all five holes, eight identical and divergent shots, edge/corner clusters,
shared meteor, simultaneous local/remote capture, near-cup/zero points, pause
during aiming/rolling/capture, background/recovery, long snapshot gap, results,
rematch, spectator/participant departure and switching without pairing again.
Every draft remains local and no guide discloses gust strength or meteor time.

On household Wi-Fi, verify installed iPhone/iPad PWA safe areas, actual board
size, rotation and real-thumb reach/visibility. Ask a player to distinguish angle
from power, point out the wind, follow their own ball in an eight-ball launch and
explain their latest gain/total. Compare direct drag and short-phone dialog;
record demonstrated comfort issues before changing calibration. Check bright-room
legibility, Reduced Motion, mute, gesture unlock and Safari background audio
recovery. Listen first with two devices, then as many as available: cup/reward
and finish should remain recognizable during busy impacts without drowning out
conversation. Automated desktop viewports cannot establish these outcomes.

Task 12 is implemented only after reviewed platform images, persistent live QA,
complete local verification and exact-final Ubuntu verification. Physical
acceptance remains explicitly pending until the family confirms thumb comfort,
shot tracking and multi-device listening. Missing live QA, Linux execution or
actual Linux renders leaves implementation incomplete.
