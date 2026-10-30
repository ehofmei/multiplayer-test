# Glow Clash polish plan — Task 13

Status: implemented; physical-device acceptance remains. Automated acceptance
uses complete local and exact-final Ubuntu verification, as specified below. This refines
[Task 13 of the family polish plan](FAMILY_POLISH_PLAN.md#13-glow-clash-give-the-reveal-its-own-sound-and-pacing).

## Outcome and boundaries

Make the reveal explain why your three picks earned 0–3 points, with distinct,
brief sounds for unique claims and clashes. Keep the neon identity, unmarked
tiles, accessible numbered identities, large round gain, persistent final
rankings and existing winner celebration. Prioritize household phones and
landscape iPads. This is a focused feedback refinement, not another art pass.

Preserve 3–8 players, four columns and one row per starting player, twelve colors,
5/8/12 rounds, untimed private selection, exactly three distinct picks, explicit
host-confirmed Lock picks, independent tile scoring and shared victories. Keep
the existing 1.5-second private settling beat, simultaneous reveal, six-second
reveal duration and automatic next round. No extra phase, sequential tile
disclosure, new deadline, scoring change, dependency or external asset is planned.

Existing revealed picks, ownership and scores supply the necessary information;
no network fields or protocol version change should be needed. Preserve room
epochs, input sequencing, host authority, filtered views, participant-disconnect
reset and late spectators. Do not infer opponents' picks from the host's private
state before reveal. Saved identity and sound preference versions stay intact.

## Implemented decisions

The local summary uses a solid +1 or striped zero beside each coordinate, plus
unique/clash counts. Short phones move the total beside those contributions;
constrained and dense-phone layouts keep full standings in the existing dialog.
Short dense final rankings retain their type size with tighter row spacing.
All tile fills/bands and existing final rankings/celebration remain intact.

A small primitive observation helper retains progress across stale snapshots.
Personal reveal effects last 400ms and their trigger clears after 450ms; initial
observation, pause/reorientation, viewer changes and lifecycle recovery establish
a quiet baseline. Glow's single reveal phrase uses claim, mixed or all-clash
identity, with accepted-lock and win/finish behavior preserved. No wire fields,
protocol version, rules, duration, dependencies or saved storage versions changed.

## Evidence reviewed

Reviewed checkout `c52b09f` on October 30, 2026, with a clean working tree:
`GlowGame.tsx`, Glow CSS in `src/style.css`, `glow.ts`, `glow-validate.ts`,
audio event mapping/hook/synthesizer and relevant tests, `tests/glow.spec.ts`,
README, QA, the Task 12 plan and `.github/workflows/review.yml`.
Visually inspected checked-in Linux mixed-reveal, eight-color collision and
eight-way shared-winner images. This was a planning review; no current live
gameplay, audio listening, physical-device QA or verification suite was run.

Findings that drive the work:

- The reveal already shows a large +0–3 gain, cumulative total and an inset
  outline on your picks. It does not directly connect each of those picks to
  its contribution. The mixed-reveal image requires interpreting fills/stripes
  or opening tile details to explain +2.
- `soundEvents()` uses the generic decision-game result path: positive gain
  plays `point`, while zero plays `success`. The Glow audio test explicitly
  expects that zero-point success cue. Lock and final win/finish already exist.
- All players submit three picks, so a resolved round cannot have no selected
  tiles. A player earning zero means all three picks clashed; it does not mean
  the board was empty. Untouched cells should remain quiet and unlit.
- Broad, equal-width diagonal bands already show every claimant's color.
  Tiles intentionally contain no visible numbers or coordinates; numbered
  identities and full names live in setup, accessible labels and tile details.
  Retain that choice rather than crowding eight-player tiles with tiny symbols.
- Short landscape uses a compact board preview plus a scrollable Pick tiles /
  Inspect board dialog. Existing coverage checks dialog cell height, but does
  not exercise a complete eight-player compact-dialog lock journey.
- Existing paired tests cover private locks, settling, mixed 2/1/1 gains,
  five-round completion, eight-way zero-point ties, rematch, switching and late
  spectators. Their viewport/font checks predate the household viewport inventory
  and need actual-child enclosure assertions alongside overflow checks.
- The audio frame copies primitives to survive host mutation. Glow currently
  shares a decision frame that normalizes paused phases; it needs explicit
  suspension/recovery handling for any new transient cue. The sound hook has
  visibility resets for some games, which should be extended narrowly for Glow.

## 1. Explain your three picks at reveal

Create a small pure Glow feedback helper, for example
`src/games/glow-feedback.ts`, shared by presentation and audio where useful.
For a revealed view and a participant ID, derive three entries in stable cell
order: coordinate, unique/clash, claimant count and contribution (1 or 0).
Derive the unique/clash counts and verify their sum explains the authoritative
round score. Never calculate new scores or modify game state in the component.
Return no outcome before reveal or for a spectator; a paused/reorienting reveal
may retain its static explanation without triggering effects.

Keep the large gain and clearly labeled cumulative total. Add a compact
three-item “Your picks” summary: a unique entry reads, for example, `B1 +1`
with a small solid-fill mark; a clash reads `A1 Clash · 0` with a striped mark.
Accessible text spells out coordinate, outcome and points. A short aggregate
such as “2 unique · 1 clash” connects these entries to +2. For +0, say
“All 3 picks clashed”; use a calm treatment without failure colors or a penalty
message. Do not describe unchosen cells as losing points.

Fit this into the existing reveal status/control space. On constrained screens,
place the explanation in the control area rather than adding another full-width
row above the eight-row board. Keep the compact score strip where it fits;
use the existing Players & scores dialog for full standings if the constrained
composition needs that space. Preserve immediate access to the local total and
all three outcomes. Settle these layouts before producing final baselines;
do not shrink 44px interactive cells, reduce readable type or add page scrolling
to accommodate the summary. No new pick-summary controls are needed.

Keep revealed tile labels and tile-detail dialogs as the complete ownership
explanation. Spectators see shared ownership and standings without a fabricated
“Your picks” or personal +0. Final rankings remain the main finished screen;
the last-round explanation belongs with secondary Inspect board, not above the
rankings. Keep single/shared winners, tied placement numbers, You marking,
Clash Again, Back to setup and the existing celebration.

## 2. Give the existing reveal a brief visual rhythm

At the authoritative reveal, expose every tile, all contributions and the gain
immediately. Use one short arrival effect: unique local claims get a restrained
glow, local clashes a distinct border/stripe emphasis, then the large gain
settles. Keep the whole effect under roughly half a second within the existing
six-second reveal. Do not delay information, animate through cumulative scores,
shake tiles, flash repeatedly or imply extra collisions.

Preserve all collision bands, the local inset outline and the separate outer
keyboard-focus outline. Effects must not wash out bright colors or obscure
ownership, especially eight narrow bands. Reduced Motion shows the same complete
static ownership and outcome distinctions with arrival effects disabled.
Muted play receives every explanation.

Gate transient effects by an observed new reveal for the same session/epoch,
round and local viewer. Repeated snapshots, timer ticks, panel reopening,
resize, pause/resume, reorientation and recovery must not restart them. A late
join or initial load into an already revealed board shows the static result.
Clear comparison state on session/game/epoch/viewer changes and background or
reconnection recovery; do not reconstruct missed celebrations. Keep state local
and bounded rather than adding an event history or general effects framework.
Announce the result once in the polite status region; leave the reveal countdown
outside live announcements.

## 3. Add a bounded personal reveal sound

Retain the current lock confirmation and shared win/finish behavior. Replace
Glow's generic result mapping with one short synthesized cue per local reveal:

| Local outcome                     | Cue intent                                                            | Equivalent visual explanation       |
| --------------------------------- | --------------------------------------------------------------------- | ----------------------------------- |
| 3 unique, 0 clashes               | `glow-claim`: light, clear chime                                      | Three +1 entries and +3             |
| 1–2 unique, remaining picks clash | `glow-mixed`: one brief phrase combining claim and soft clash timbres | Each contribution, counts and +1/+2 |
| 0 unique, 3 clashes               | `glow-clash`: soft, neutral overlapping notes                         | All 3 picks clashed and +0          |

The mixed phrase is a single bounded cue, not a sound per tile/player. Keep
phrases below roughly 400ms and within the current voice cap. Avoid error
buzzers, escalating volume, continuous ambience or counting points aloud.
No cue plays for an empty cell or for a spectator's personal outcome. Preserve
the existing neutral match-finish treatment for spectators.

Add a primitive Glow audio frame containing viewer identity, participation,
round/result identity, actual phase/suspension and outcome counts. Use the
filtered revealed view, not component render timing. Copy values instead of
retaining mutable seat objects. Scope handling to Glow so the generic decision
path cannot also emit `point` or `success` for the same reveal. Finish has
priority if a delayed snapshot skips directly to finished; never replay a
backlog of round cues. Keep lock confirmation tied to accepted state, not taps.

Suppress cues across pause/reorientation, background/pageshow, reconnect,
session/epoch/viewer changes, switching games and initial observation. A normal
delayed same-round reveal can sound once; stale, duplicate or already-observed
results cannot. Extend `useGameSounds.ts` only as needed for Glow's comparison
reset and stop behavior. Keep muted-by-default preference, gesture unlock,
unavailable-audio feedback and existing shared-game behavior.

## 4. Check crowded boards and compact dialogs

Review three- and eight-player reveals with similar bright colors, long names,
the local player in the first and eighth seats, mixed outcomes and all-clash
ties. Preserve one broad band per owner in seat order. Retain readable numbered
symbols and complete names in tile details and standings, with accessible
owner/color labels; do not repopulate unmarked tiles with tiny identity badges.

Exercise the full compact flow: open Pick tiles, select/deselect, reject a fourth
pick, Clear, close/Escape without committing, reopen with the draft intact,
then Lock picks exactly once. Confirm host acceptance and synchronization on
other devices. Scroll the eight-row dialog to bottom-row cells and lock controls,
using touch and keyboard. All actual dialog cells and controls need at least
44px targets; the small main-board preview must route to the full-size dialog.
Check pause, rotation and an arriving reveal while the dialog is open, with
valid focus restoration if the previous trigger or cell is no longer present.

## Implementation order and files

1. At implementation start, inspect status and existing work, locate/authenticate
   GitHub CLI, and confirm the non-deploying review workflow/artifact route.
   Use a new `codex/glow-clash-polish` review branch rather than the historical
   excluded `codex/glow-clash` or `codex/glow-rewards` branches. Do not merge or
   deploy to obtain verification.
2. Add the small feedback derivation helper and meaningful unit coverage.
   Implement the three-pick explanation in `src/components/GlowGame.tsx` and
   scoped Glow rules in `src/style.css`; settle phone/iPad/compact composition.
3. Add local reveal effect deduplication and the Glow audio frame/cues in
   `src/audio/events.ts`, `sounds.ts` and, where needed, `useGameSounds.ts`.
   Update `events.test.ts` and `sounds.test.ts`; preserve other games' mappings.
4. Extend the existing real-pairing journeys in `tests/glow.spec.ts` and reuse
   the audio fixture in `tests/audio.ts`. Keep deterministic states established
   through normal controls and an explicitly advanced host clock. Add a separate
   spec only if it meaningfully simplifies the journeys; include it in the
   guarded `test:game -- glow` group if added.
5. Complete focused automated and persistent live QA, resolve findings, then
   capture/review the final platform baselines and run the complete gates.
6. Document actual behavior in README, coverage and remaining household checks
   in QA, and reviewed images in SCREENSHOTS. Update this plan and Task 13's
   family-plan status only to match the evidence obtained.

No rule/session/validator changes are planned. If a real wire addition becomes
necessary, reassess scope, bound/validate it in the game validator and protocol,
use strict literal enum checks, test legacy/mixed-version views and explain
whether all devices must update. Do not expand this polish into unrelated
protocol cleanup.

## Verification and acceptance

### Meaningful automated coverage

- Unit-test contribution derivation for 0/1/2/3 unique picks, two/eight claimants,
  stable ordering, empty cells, private choosing/settling views, paused revealed
  views and spectators. Assert agreement with authoritative scores and privacy;
  reuse the existing rule tests for match lengths and scoring itself.
- Audio tests cover each cue, accepted locks, finish priority, copied primitive
  frames, repeated/delayed/stale snapshots, timer-only changes, pause/reorient,
  background/pageshow and reconnect recovery, initial/late reveal observation,
  spectator silence for personal rewards, viewer/epoch/game changes and rematch.
  Verify voice bounds, short phrases, mute/stop and gesture unlock in synth and
  browser coverage. Test the same no-replay boundaries for visual effects.
- Paired browser flows assert three-pick breakdowns and totals on host/client,
  no opponent picks or new scores before reveal, synchronized settling/reveal,
  +0 and mixed rewards, a +3 reveal, tile details and eight-player ownership.
  Retain complete five-round single/shared-winner journeys, all match-length
  rule coverage, retained results, rematch, switching and participant/spectator
  lifecycle coverage. Exercise the full compact-dialog journey and local seat 8.
- Keep deterministic ready, selection, settling, mixed reward, zero reward and
  single/shared-result images. Reuse current states where sufficient; add only
  useful missing coverage, including the compact dialog, landscape iPad and a
  muted/reduced-motion dense reveal. Review changed existing comparisons before
  refreshing; preserve bundled fonts, strict dimensions and the 180-pixel budget.

### Layout and persistent live pass

Build a QA inventory before interaction: host, client and spectator; selecting,
locked, settling, +0/+1/+2/+3 reveals, tile details, compact picking, pause,
single/shared results and rematch. Apply the `playwright-interactive` skill at
implementation time. Use QA.md's stable production origins, matching build IDs
and Home-first waiting-update flow before pairing; use its supported dialog
handling if an intentional update encounters the confirmation.

Prioritize 402×874 and 440×956 phones, 1180×820 landscape M1 iPad Air and
1080×810 secondary landscape iPad. Retain phone rotation at 874×402/956×440,
plus the existing 390×844, 320×700, 320×568, 844×390, 768×1024 and 1280×720
regression sizes. Confirm actual viewport dimensions and usable installed-PWA
space on devices; nominal browser sizes do not certify physical hardware.

Use normal mouse, keyboard and touch input, keeping gesture tests in a separate
mobile context. Inspect meaningful post-interaction screenshots and batch layout
measurements per state/viewport. Check actual-child enclosure, viewport clearance,
overflow, 44px active targets, stripe/outline contrast, readable gain/total,
eight long names, taller fonts, visible focus and safe areas. Keep secondary
dialogs/rankings scrollable and primary play free of page scrolling. Explore
rapid taps, reopen/resize during reveal, bottom-row selection and switching after
pause. Resolve findings before the final complete verification.

### Local, Linux and PWA gates

During implementation, use Node 22 and run focused helper/audio/Glow unit tests
and `npm run check:fast`. Build with `npm run build` before guarded
`npm run test:game -- glow` checks. Audio/lifecycle changes also require relevant
shared-file tests and `tests/updates.spec.ts`; scoped CSS changes need app-layout
coverage plus the affected Glow viewport/font matrix. Add `npm run test:network`
if protocol/session changes prove necessary. Do not bypass checkout guards or
rebuild another suite's shared production output.

Establish genuine Ubuntu screenshot access before adding states. Use the
read-only `.github/workflows/review.yml` baseline artifact route with explicitly
scoped affected spec paths. Download actual Linux images for the matching commit,
review each changed/new image and its Darwin counterpart, and commit only the
intended baselines. Never copy Darwin images to Linux paths, blanket-update
snapshots, relax budgets or treat a generation run as final verification.

After the last substantive fix and live pass, run complete local
`npm run verify`, including `check:snapshots`, then obtain an ordinary successful
Ubuntu `npm run verify` for the exact final pushed commit with updates disabled.
Keep Ubuntu/Node 22, `npm ci`, Chromium installation, production build, evidence
upload, read-only permissions and no Pages deployment. A previous green commit
does not satisfy the final gate.

Check production `/multiplayer-test/` routing, manifest/icons, cached offline
startup, manual waiting-worker updates, retained identity/sound settings and no
automatic reload during play, using existing PWA coverage and a deliberate
production-browser pass. Report exact commands/results, final status/diff,
verified commit/run URL, reviewed baselines and anything unavailable.

### Household acceptance

Update every household device, then play three-player and crowded matches over
Wi-Fi in Safari and installed PWAs. Ask players to identify their three picks,
explain a mixed gain and +0, and identify the winner without opening Help. Check
thumb accuracy, bottom-row reach, compact-dialog scrolling, actual safe areas,
rotation, larger text and VoiceOver on the primary phones and landscape iPad.

Listen with two devices, then as many as available: unique, mixed and all-clash
outcomes should be recognizable without sounding punitive or covering family
conversation. Check sound enable/unlock, mute, background/audio recovery and
host pause/resume. Confirm the unchanged reveal duration is long enough to read
the explanation; timing changes require family evidence and separate review.

Task 13 is implemented only after reviewed Darwin/Linux images, persistent live
QA, complete local verification and exact-final Ubuntu verification. Physical
acceptance remains pending until household testing confirms touch comfort,
comprehension and listening. Missing live QA, Linux execution or actual Linux
renders leaves implementation incomplete.
