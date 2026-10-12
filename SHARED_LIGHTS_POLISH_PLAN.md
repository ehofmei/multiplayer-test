# Shared Lights polish plan — Task 8

Status: implemented; physical-device acceptance remains. See README.md for
current behavior and QA.md for automated/live coverage and device follow-up. This refines
[Task 8 of the family polish plan](FAMILY_POLISH_PLAN.md#8-shared-lights-make-a-simple-toy-satisfying).

## Direction

Make sixteen shared lights feel like a pleasant tactile toy: large illuminated
lenses, readable switch states and a crisp response to each press. The board is
the centerpiece. Use one short explanation: “Tap a light to switch it for everyone.”
Keep numbers and ON/OFF labels visible with sound off.

Preserve the open shared toy, host-authoritative toggles, fresh board on selection,
existing pairing and sixteen cells. No scoring, puzzles, modes, new dependencies,
external artwork or new audio architecture. Use scoped CSS and local SVG only if
CSS cannot provide the desired lens treatment. No network additions are expected.

## Evidence from the current implementation

Reviewed the Shared Lights section in `src/App.tsx`, `src/style.css`, audio
mapping/synthesis, session toggle handling, browser tests and README/QA guidance.
These are code findings, not a new visual or physical-device audit.

- Each switch already has a native button, cell number, ON/OFF text,
  `aria-pressed`, and a disconnected disabled state. The lens is only 12×12px.
- The board fills available space as 4×4; short landscape windows use 8×2.
  Its stretched buttons and small lenses explain the diagnostic-panel appearance.
- The primary heading displays the grid revision. Several pairing tests depend
  on that text being visible, so moving it requires updating their assertions.
- Audio emits one on/off cue per advancing revision, choosing by the total lit
  count. Mixed changes with equal totals currently produce “on,” and a revision
  increase can represent toggles whose final cell states did not change.
- Existing real pairing coverage includes four devices, concurrent changes,
  twenty rapid toggles, reconnect and host disconnect. Preserve this coverage.

## 1. Compose a board of real lamps

Give each switch a substantial round lens with a raised rim, a restrained highlight
and a visible unlit interior. On lights should look luminous through depth and
a contained glow; off lights should still look like intentional objects. Keep
glow inside the switch rather than washing over neighboring labels or focus rings.
Use a coherent warm light palette initially; a per-cell pitch/color palette is
optional only after the basic interaction passes listening and readability checks.

Keep the cell number and ON/OFF text in stable positions outside the lens.
Preserve clear contrast in both states and add a non-color difference in lens
appearance. Frame the collection with a restrained bezel and purposeful spacing,
without oversized decorative margins or new text panels.

Keep 4×4 portrait and the existing 8×2 short-landscape layout, with unchanged
row-major numbering and focus order. Compose the landscape iPad board deliberately:
trial the current 4×4 arrangement with larger centered lenses before extending
8×2 to taller landscape tablets. Choose based on actual usable space, label
readability and comfortable reach; do not simply stretch the phone composition.
All sixteen switches should fit without page scrolling and remain at least 44px
in both target dimensions, including the smallest regression viewports.

## 2. Separate pressing from confirmed changes

Use native button activation for touch, mouse, Enter and Space. Add a small lens
depression/border response while pressed, with a distinct visible keyboard focus
ring. A cancelled press must return to rest without toggling. Avoid new drag,
long-press or double-tap gestures and do not block rapid ordinary taps.

The immediate press response is local; ON/OFF and shared light state still come
from the host. Do not optimistically flip client state or claim which player
made a change: current snapshots do not provide that attribution.

On confirmed cell changes, briefly accent the affected lens/rim on every device.
Use the same treatment for local and remote changes so simultaneous taps remain
easy to follow. Compare copied cell values, because host state may be mutable.
Replace/coalesce per-cell feedback rather than queueing animations or allocating
one timer per toggle. At most sixteen cell effects may be active. Effects never
intercept input or delay a subsequent toggle.

Initialize from the first snapshot silently. Reset transition tracking on room
epoch/game changes and lifecycle recovery; joining, returning from background
or reopening the board must not replay old flashes. Reduced motion uses immediate
lighting and a brief static outline rather than scaling or pulsing. Disconnected
buttons retain readable last-known state and cannot imply a successful action.

## 3. Refine the existing optional sound

Keep sound muted by default, gesture-unlocked and controlled by the existing
saved preference. Refine the current on/off tones into short, quiet switch cues:
a brighter click/chime for on and a softer lower click for off. Listen before
adding layers. Emit sound from confirmed changes only, avoiding a second local
cue that duplicates the authoritative response.

Copy the sixteen cell values into the local sound frame and compare actual
changed cells, rather than inferring direction from the total lit count. Emit
at most one short cue per received transition: on for only on changes, off for
only off changes, and a quiet neutral switch cue for mixed changes. If revision
advances but final cells are unchanged, remain silent; snapshots cannot reconstruct
intermediate toggles reliably. Keep the existing synthesizer voice limits and
cooldowns so rapid input cannot create a sound backlog.

Cover duplicate/stale snapshots, skipped revisions, equal-count mixed changes,
first snapshot, epoch changes, reconnect/background recovery and game switching.
Verify that muted play provides equally clear feedback. No historical event log
or wire field is justified for this toy.

## 4. Put technical information in its proper place

Move “Revision N” into the existing Connection details diagnostics, scoped to
Shared Lights and available even when the host has no peers. Keep its accessible
label and current value useful for troubleshooting. Replace the primary technical
heading with a simple board title and the one-sentence explanation; retain clear
disconnection guidance when appropriate.

Update pairing tests to assert synchronized `aria-pressed` states during ordinary
play. When the exact revision matters for rapid-toggle/concurrency checks, open
Connection details explicitly, inspect it, then close the panel before screenshots
or continued play. Do not keep a hidden revision element solely for old tests.

## Implementation order

1. Inspect current status/diff and preserve unrelated work. Before adding visual
   states, check GitHub CLI authentication and the read-only baseline artifact
   route in QA.md. Use a `codex/shared-lights-polish` review branch and the existing
   non-deploying `.github/workflows/review.yml`.
2. Add scoped Shared Lights styling and markup. Extract a small
   `src/components/LightsGame.tsx` only if transition tracking warrants it; keep
   session/network ownership in the existing layers. Settle phone and landscape
   iPad geometry before final artwork or baselines.
3. Implement bounded confirmed-change feedback, refined audio and revision
   diagnostics. Preserve cell accessible names and shared protocol behavior.
4. Update `tests/game.spec.ts`, audio tests and any affected layout/PWA coverage.
   Add a focused Lights spec only if presentation coverage makes the general
   pairing suite unwieldy. Use guarded commands; there is currently no
   `npm run test:game -- lights` target.
5. Document implemented behavior in README.md, QA/device acceptance in QA.md,
   reviewed images in SCREENSHOTS.md, and update the family-plan status accurately.

## Verification and acceptance

Build a short QA inventory before implementation testing: lone host, host plus
clients, all-off/mixed/all-on boards, press/focus, simultaneous changes, rapid
same-cell toggles, disconnected board, diagnostics, muted/reduced-motion play,
rejoin and switching away/back. Every connected player can operate the toy;
do not introduce a spectator restriction.

Retain real WebRTC concurrency and cleanup tests. Verify same-cell toggles from
multiple devices preserve host serialization and parity; check all sixteen
states across devices after rapid input settles. Add meaningful tests for cue
classification/deduplication, bounded feedback cleanup, keyboard activation,
cancelled touch, disabled input and revision access. Preserve existing sequence,
epoch and message-bound tests rather than rewriting the protocol.

Run `npm run check:fast` while editing, `npm run test:network` for the pairing
regression and guarded focused browser runs via
`npm run test:e2e -- tests/game.spec.ts`. Include `tests/app-layout.spec.ts` and
relevant PWA checks for shell, sizing or lifecycle changes. Build the production
preview before browser QA.

Use the `playwright-interactive` skill during implementation for persistent live
QA at QA.md's stable production origin. Verify build identity and apply waiting
updates from Home before pairing. Exercise ordinary controls, inspect post-change
states/screenshots and perform a brief exploratory pass. Check full-screen fit,
contrast, focus order, keyboard input, safe areas, touch targets, taller font
metrics, long names and scrollable secondary diagnostics.

Prioritize QA.md's household inventory: 402×874 and 440×956 phones with rotation,
1180×820 landscape iPad Air and secondary 1080×810 landscape iPad. Retain regression
checks at 390×844, 320×700, 320×568, 844×390, 768×1024 and 1280×720. These are
emulation starting sizes; confirm actual usable space in installed household PWAs.

Capture deterministic all-off, mixed and all-on boards, a focus/interaction state,
short-landscape composition and muted/reduced-motion presentation. Establish
states through normal controls, assert synchronization, and let transient effects
settle for stable snapshots. Test transient feedback separately rather than
loosening screenshot budgets. Review the densest eight-player shell state too.

After live QA and fixes, generate/review Darwin baselines and obtain genuinely
rendered Ubuntu images through narrowly scoped review-workflow generation. Inspect
every changed image on both platforms; preserve the font fixture, dimensions and
existing pixel budgets. Run complete local `npm run verify`, then require ordinary
Ubuntu verification for the exact final commit with snapshot updates disabled.
Report the local result, Linux run URL/commit and baseline review. Documentation-only
planning needs formatting/diff checks, not those implementation gates.

Check production `/multiplayer-test/` routing, cached offline startup, saved sound
preference and user-controlled updates. Physical acceptance remains: real-thumb
press/cancellation and rapid tapping, landscape iPad reach, installed safe areas
and rotation, larger text/VoiceOver, Safari audio unlock/recovery, multiple devices
sounding together, household Wi-Fi synchronization and host background/resume.

The task succeeds when a child can identify each light's state and enjoy switching
it with sound on or off, while changes remain synchronized and calm during busy
multi-device play. Physical checks must be reported as pending until performed;
missing live QA, genuine Linux renders or exact-final Linux verification leave
implementation incomplete.
