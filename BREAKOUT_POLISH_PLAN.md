# Co-op Breakout polish plan — Task 15

Status: implemented; physical-device acceptance remains. Local/live and exact-final
Ubuntu verification are required for handoff as specified below; pending or
failed execution gates leave the implementation incomplete. This refines
[Task 15 of the family polish plan](FAMILY_POLISH_PLAN.md#15-co-op-breakout-finish-feedback-balance-and-last-brick-clarity).

## Outcome and boundaries

Help the team see the last remaining targets, notice a lost shared life and
find the next serve immediately, including with sound off. Keep the ball more
prominent than contact effects. Balance the existing sounds during crowded
four-player rallies without making the room harder to talk in.

Preserve the compact symmetric 5×5 core, 25 bricks per core, generous reaction
lanes, current paddle and ball sizes, steering strip, immediate local steering,
client smoothing and fixed host simulation. Keep the 0.60 court-widths/second
speed cap, ramp, acceleration and minimum 0.267-width geometric reaction travel
(about 445ms at the cap before network/display delay). No physics, control,
difficulty or timing changes belong in this task without new family evidence.

Keep one-to-four contiguous seats, unused-side walls, five shared lives,
reinforcement rules, three named cores, existing one-second serves and serve
rotation, pause/resume, spectators, retained team results and rematch. No new
mode, dependency, external asset, storage version or general effects framework
is planned. Existing lives, level, brick HP and phases should supply the needed
feedback without a wire change.

## Evidence reviewed

### Implemented decisions

The last five targets receive a static light outline. Remaining-target text uses
the singular form and an accessible label reports the separate hit count.
Shared-life loss keeps a short explanation during the existing serve, with a
400ms static emptied-pip emphasis. Core clears use the reserved status line;
the compact banner retains its existing geometry and the full next-core name
so it cannot grow over a rotated serve ball. Contact brightness/shard expansion
are reduced; the white ball remains above all contact art.

Copied, bounded observations drive visual and sound transitions and retain
monotonic progress against stale snapshots within an epoch. Lifecycle recovery
establishes a quiet baseline. Breakout alone uses quieter rally sounds with a
100ms supporting-cue gap and a 350ms protected outcome phrase; important team
outcomes release its prior voices. No wire fields, storage, rules, controls,
simulation or dependencies changed. Test evidence includes a normal-control
solo one-brick serve, paired loss/recovery, four-player landscape iPad and the
existing complete three-core paired victory.

### Planning evidence

Reviewed checkout `e823228` on October 31, 2026, with a clean working tree:
`BreakoutGame.tsx`, `breakout.ts`, Breakout feedback helpers/tests, scoped rules
in `src/style.css`, audio mapping/hook/synthesizer, both Breakout browser specs,
README, QA and `.github/workflows/review.yml`. Visually inspected the checked-in
Linux active-phone, core-three serve and active-landscape images.
This was a planning review; no live rally, listening test, physical-device pass
or verification suite was run.

Findings that drive the work:

- Remaining bricks already have bright mint or amber faces against a dark core,
  and the HUD counts surviving bricks. Reinforced bricks have a + and take two
  hits. The reviewed images show full cores; they do not establish whether the
  final scattered bricks are easy to find during play.
- Five life pips and the numeric total update, but the component has no dedicated
  life-loss treatment. Every serve uses the same “Ready?” banner, so a miss,
  core clear and host resume are visually similar. The compact serve banner
  already leaves the ball visible; retain that useful composition.
- Confirmed HP drops drive damage/destruction feedback; paddle flashes use
  near-edge velocity reversals. A single 280ms timer clears both effects.
  The ball is drawn after these effects, but brightness and expanding shards
  still need evaluation during busy play. Velocity inference cannot recover
  every contact from coalesced snapshots and should not claim exact history.
- Audio already chooses one event per comparison: finale, life loss, core
  clear, destruction, damage, serve, then paddle/wall contact. The synthesizer
  has an eight-voice cap and a general 60ms same-cue gap; Breakout has no
  dedicated contact-voice priority, so existing voices could crowd a later
  important cue. Damage/break/clear notes currently use the louder generic gain.
- The sound hook resets some games on visibility/pageshow, but Breakout is not
  among them. Its visual observer retains a `PongState` reference. Use copied
  primitive observations for new comparison state so host mutation and lifecycle
  recovery cannot manufacture or replay feedback.
- Existing real-pairing coverage already includes all four rotations,
  spectators, controls, shared loss, offline startup and a full three-core
  victory. Reuse those journeys; extend them at meaningful transitions rather
  than adding another expensive victory simulation.

## 1. Make the last targets easy to find

First inspect deliberate five-, three- and one-brick states in the existing
steering-driven victory journey, including the last reinforced brick at 2 HP
and after its first hit. Check all four rotated views at phone and landscape
iPad sizes, muted and with Reduced Motion.

If the sparse core needs emphasis, give the last five or fewer surviving bricks
a restrained, static outline or backing contrast within the existing gaps.
Use the same treatment for every surviving target. Keep brick positions,
dimensions, hitboxes, amber/+ reinforcement identity and damaged mint identity
unchanged. Avoid pulsing, flashing, enlarged bricks, directional aiming hints
or decoration in the reaction lanes. If current contrast proves sufficient,
retain it and add the missing regression coverage instead.

Keep the HUD count tied to nonzero bricks, with singular “1 brick left.” A
reinforced brick is one target with two hits remaining, not two bricks. Make
that distinction available in accessible progress text or Help without adding
a second prominent counter. Do not announce every brick hit through a live
region. Keep decorative SVG marks hidden from assistive technology.

## 2. Show a shared-life loss and the next serve

Extend `src/games/breakout-feedback.ts` with a small primitive observation and
transition helper. Observe phase, level, lives and a copied brick-HP list;
retain only the bounded state needed to recognize new outcomes. Distinguish
initial serve, life-loss serve, next-core serve and pause/resume baseline.
Use authoritative life/level changes, not ball teleportation or render timing.

On a newly observed nonfinal life decrement:

- Update the authoritative total immediately. Briefly distinguish the newly
  emptied pip and show “Team life lost · 4 left” in the existing status space.
  Use the actual total; if a delayed observation spans multiple losses, report
  the observed decrement once rather than replaying a sequence of effects.
- Keep the loss emphasis short, approximately 350–450ms, within the existing
  serve interval. Then leave a calm ready state. Preserve reserved text space
  so the court, footer and steering strip never jump.
- Keep the stationary serve ball and paddles unobscured, and clear loss/contact
  decoration before active play resumes. Do not add a full-screen tint, shake,
  countdown phase, delay or blame attached to the missing player's name.

Use a single polite status announcement for the event; avoid competing HUD and
banner live regions. Reduced Motion retains the text and a static emptied-pip
emphasis without movement. With one life remaining, the persistent total/pips
must stay clear without a repeating alarm. At zero lives, the existing team-loss
finale takes priority and remains visible until the host's current action.

On a genuine core advance, use the existing compact serve banner to say
“Core 1 cleared” and show “Core 2 of 3 · Prism field,” then return to ordinary
play. Keep all three full names readable at narrow widths, permitting a compact
two-line composition without covering the serve ball. An initial observation
or resume shows the current core/ready state without inventing a clear or loss.
Preserve the final three-core victory and 75/75 total.

## 3. Keep contact feedback subordinate to the ball

Review paddle saves, 2→1 damage and 1→0 destruction together during a normal
four-player rally. Use the existing effects first; reduce brightness, shard
extent, opacity or duration only where the visual pass finds competition with
the white ball. Keep effects anchored to their actual brick/paddle, draw the
ball above them and leave the central reaction lanes clear. Preserve the local
paddle identity and steering strip. Avoid extra particles or a new trail.

Keep damage and destruction distinct, including a coalesced 2→0 observation.
A level change must clear old brick effects rather than appearing as 25 new
hits. Finale/life-loss/core advance supersede ordinary contacts, and ordinary
snapshots must not prolong an old effect. Keep timers bounded and clean them
up on unmount. Reduced Motion uses short static marks and retains no ball trail.

For new visual and audio comparisons, initial observation, late join, pause,
background/pageshow, reconnect, session/epoch or game change and rematch
establish a quiet baseline. Suppress effects across recovery; do not reconstruct
missed rallies. Retain only enough progress to reject repeated/stale observations
within the existing ordered session delivery. Do not build a local event log
or promise exact paddle/wall counts from velocity samples.

## 4. Balance the existing sound vocabulary

Keep the existing paddle/wall, damage, break, core-clear, miss and win/finish
identities. Add no new sound unless listening reveals a specific missing
distinction. Retain muted default, saved preference, gesture unlock, audio
failure handling and the global eight-voice bound.

Make priority explicit in the Breakout path:

| Priority | Outcome                         | Behavior                                                        |
| -------- | ------------------------------- | --------------------------------------------------------------- |
| 1        | Team victory or final loss      | One finale; suppress simultaneous ordinary cues                 |
| 2        | Shared-life decrement           | One loss cue; no brick/contact cue for the same observation     |
| 3        | Core advance                    | One core-clear phrase; no extra last-brick phrase               |
| 4        | Brick destruction, then damage  | One highest-value cue per observation, including coalesced hits |
| 5        | Serve, then paddle/wall contact | Brief supporting cues; never a backlog                          |

Listen before choosing final gains/gaps. Favor quieter, short damage/contact
notes and a readable clear/loss cue over more volume or more notes. If voice
saturation can suppress a priority cue, narrowly track Breakout contact voices
so that cue can release them; do not stop unrelated games' voices or introduce
a shared audio scheduler. If rate limiting is needed, scope it to Breakout
rally cues so ordinary Pong/Arena retain their accepted sound behavior.

Extend `src/audio/useGameSounds.ts` narrowly for Breakout visibility/recovery
resets and stopping stale voices. Static core/life information remains available
muted and to spectators; spectators may hear shared team outcomes but receive
no personal-save claim. Listening on multiple physical devices remains the
authority for household volume/timbre, beyond automated event/voice checks.

## Implementation order and files

1. Inspect status and preserve existing work. Locate GitHub CLI, run
   `gh auth status`, confirm the remote and establish the read-only Linux
   artifact route before adding screenshot states. Use a new
   `codex/breakout-polish` branch with `.github/workflows/review.yml`; historical
   Breakout branches are excluded from that workflow. Do not merge or deploy.
2. Build a short QA inventory and audit sparse targets/busy feedback. Add the
   bounded observation helper/tests, then implement life/core explanations in
   `src/components/BreakoutGame.tsx` and scoped rules in `src/style.css`.
3. Settle target contrast, effects and phone/landscape-iPad composition. Update
   audio priority/gains only as justified in `events.ts`, `sounds.ts` and the
   hook; add focused tests in the corresponding audio/feedback test files.
4. Extend `tests/breakout.spec.ts` and `tests/breakout-integration.spec.ts`,
   reusing real pairing, clock advancement and existing normal-control victory
   steering. Finish focused and persistent live QA before final baselines.
5. Review Darwin/Linux evidence, run both final verification gates and document
   actual behavior in README, coverage/physical follow-up in QA and reviewed
   images in SCREENSHOTS. Update this plan and Task 15's status to match evidence.

No rule/session/validator changes are planned. If an event cannot be identified
reliably from current state, first keep that effect best-effort or omit it.
Any necessary wire addition needs explicit scope review, bounds/strict literal
validation in `src/games/validate.ts` and `src/network/protocol.ts`, legacy tests
and a clear mixed-version/update requirement. Preserve current protocol,
epochs, input sequencing and stored identity/sound/color formats otherwise.

## Verification and acceptance

### Meaningful regression coverage

- Unit-test remaining-target/HP semantics, life loss, final loss priority, core
  transitions and helper isolation from later host mutation. Cover duplicate,
  coalesced and stale observations; initial/late state, pause/resume, background
  recovery, reconnect, epoch/game changes and rematch. Test all four occupied
  paddle sides and unused-side walls without inferring a brick hit from them.
- Audio tests cover priority when counters change together, no replay, one cue
  for coalesced destruction, short bounded voices, meaningful cue admission
  under busy contact load, mute/stop and unlock. Add browser audio assertions
  through the existing fixture where hook/lifecycle behavior changes.
- Extend a paired normal-control journey through a deliberate miss: assert one
  decrement and synchronized total, visible loss/serve reset, cleared effects
  on the next ball, and no new loss on host resume. Retain natural final loss,
  persistent results and rematch. Exercise four rotations plus a spectator.
- Reuse the full three-core victory to check sparse 5/3/1 targets, final
  reinforced 2→1→0, readable core names and carry-over lives. Keep normal
  pointer/touch/slider actions; never inject game state for screenshots.
  Before dynamic captures, establish a deliberate pose through those controls,
  flush queued input and the next 50ms broadcast, and assert synchronized
  phase/core/lives/bricks/paddles. Do not capture incidental rally endpoints.
- Reuse existing ready, break, core-two/core-three and result images where
  useful. Add only missing sparse-target, life-loss and dense four-player
  evidence, including muted/Reduced Motion and landscape iPad. Review intended
  mismatches before refreshing; retain bundled fonts, strict dimensions and
  the current 160-pixel budget in `tests/breakout.spec.ts`.

### Persistent live and layout pass

At implementation time use the `playwright-interactive` skill. Inventory ready,
busy rally, sparse/reinforced targets, life-loss serve, core advance, pause,
team victory/loss, Help, rematch and spectator states across host/client views.
Use QA.md's stable production origin, matching build IDs and Home-first waiting
update procedure, including its supported confirmation-dialog handling.

Prioritize 402×874 and 440×956 phones, rotations at 874×402/956×440, 1180×820
landscape M1 iPad Air and secondary 1080×810 landscape iPad. Retain existing
390×844, 320×700, 320×568, 844×390, 768×1024 and desktop regression coverage,
including 1280×720 and the current 1280×900 screenshot state.

Exercise ordinary court/strip steering, keyboard, Help slider/palette, focus
return and pause/resume. Keep low-level touch checks in a separate mobile touch
context. Batch read-only measurements per state/viewport, checking actual-child
enclosure as well as page overflow and viewport clearance. Review screenshots
for readable full core names, singular counts, lost-pip distinction, ball/target
contrast, safe areas, taller font metrics, long names, focus and 44px controls.
Keep primary play free of page scrolling and secondary Help content scrollable.
Explore rapid pause/resume, loss near a core transition, rotation during serve
and background recovery. Resolve findings before the final complete local gate.

### Local, Linux and PWA gates

Use Node 22. Run focused Breakout/feedback/audio unit tests and
`npm run check:fast` during implementation; build the production output before
guarded `npm run test:game -- breakout` checks. Audio/lifecycle changes also need
the relevant shared-file tests and `tests/updates.spec.ts`. Global CSS changes
need app-layout and affected game viewport/font coverage; add
`npm run test:network` if session/protocol changes become necessary.

On macOS apply `taskpolicy -a -l 0 -t 0` to guarded browser/full commands with
Node 22 on PATH. Respect checkout locks and other sessions' processes/dist.
Preserve trace/timing evidence and inspect unrelated clock-driven failures
before rerunning; keep assertions and deadlines unchanged.

Use `.github/workflows/review.yml` with explicitly scoped affected spec paths
for genuine Ubuntu baseline evidence. Download the matching commit's
`linux-baseline-evidence-<sha>` artifact and review every new/changed Linux image
and Darwin counterpart. Commit only intended baselines; never copy Darwin
renders into Linux files, blanket-update images or loosen comparison budgets.
Baseline generation is evidence, not final verification.

After the last substantive fix and live pass, run complete local
`taskpolicy -a -l 0 -t 0 npm run verify`, including `check:snapshots`. Push the
final reviewed implementation and obtain ordinary successful Ubuntu
`npm run verify` for that exact final commit with snapshot updates disabled.
Keep Ubuntu/Node 22, `npm ci`, Chromium installation, production build, evidence
upload, read-only permissions and no Pages deployment.

Check production `/multiplayer-test/` routing, manifest/icons, cached offline
startup, saved preferences and user-controlled waiting-worker updates without
automatic in-game reload. Report commands/results, final diff/status, Linux
run URL/verified commit, reviewed baselines and remaining physical checks.
Missing live QA, actual Linux renders or exact-final Linux execution leaves
implementation incomplete; documentation-only planning needs formatting/diff
checks rather than these execution gates.

### Household acceptance

Update every household device, then play solo and a busy four-player match over
Wi-Fi in Safari and installed PWAs. Play from every occupied side through all
three cores. Ask players to point out the last target, explain why a reinforced
brick remains after one hit, identify the lost team life and find the next ball
with sound off. Check real-thumb court/strip use, installed safe areas, rotation,
larger text/VoiceOver, host background/resume and offline relaunch.

Listen with two devices, then four: paddle saves, dense damage/destruction,
shared loss, core transition and finale should remain distinct without
overpowering voices. Confirm sound unlock and recovery on Safari. Physical
comfort and listening remain pending until performed; emulator fit and the
445ms geometric budget cannot establish them. Record any requested physics or
control retuning as separate family-playtest work.
