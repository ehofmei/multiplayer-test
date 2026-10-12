# Light Seek polish plan — Task 7

Status: implemented; physical-device acceptance remains. See README.md for
current behavior and QA.md for verification evidence and device follow-up. This refines
[Task 7 of the family polish plan](FAMILY_POLISH_PLAN.md#7-light-seek-improve-selection-confidence-and-turn-feedback)
around the owner's priorities: reliable controls, useful feedback and a finished
game presentation. The original brief is guidance, not a checklist of effects
that must be added.

## Direction

Make Light Seek feel like a tactile game of uncovering hidden lights. The board
is the centerpiece; the area below it is a purposeful piece collection and a
clear confirmation control. Players should immediately understand where they
are aiming, what they have completely illuminated and whose turn it is.

Preserve the full 10×10 board, manual secret placement, untimed decisions and
explicit Place/Illuminate confirmation. Keep existing rules and privacy. Favor
small local SVG/CSS improvements using the existing assets and synthesizer.
No new dependencies or network fields are expected.

## Evidence from the current game

Reviewed the Linux setup, active, found-piece and results screenshots in
`tests/seek.spec.ts-snapshots/`, together with the component, rules, styles,
audio mapping, browser coverage and README/QA notes.

- The active screen's lower area shows five bordered symbol-and-number chips.
  They resemble tiny buttons, but cannot be used. A found piece only changes its
  chip's background/border to green; its actual geometry is never pictured.
- Fully illuminated pieces are already tracked in `SeekSeat.found`. A useful
  collection display can use that public information without changing rules.
- Setup hides shapes in a text dropdown. The board and controls are separated
  by substantial blank space in the portrait baseline.
- The default result text says “hits never give extra turns.” The header keeps
  “Opponent ready” during play and even after the match. These are setup/rule
  remnants rather than useful in-game information.
- Selection currently has a gold outline and a coordinate in text. Placement
  previews and invalid outlines already exist; improve their clarity rather
  than replacing the interaction model.
- The result screen shows both boards, but the winner is a small status line;
  the found-piece tray and last search message remain below them.

These are screenshot/code findings, not a new live or physical-device QA pass.

## 1. Build a real piece tray

Use the actual cell geometry from `seekPieces`/`seekCells` to render miniature
pieces. Their tiles should share the main board's corners, spacing, outlines,
lighting and identity treatment. Avoid standalone Unicode approximations and
numeric tile-count badges; the geometry itself communicates size.

During play, show five stable positions in a compact collection row:

- Hidden pieces have readable, subdued miniature shapes. Every shape is known
  from the rules; this reveals no secret location or rotation.
- Completely illuminated pieces light up in their established colors, with a
  small completion mark that works without color perception. Keep the tray's
  canonical orientations stable rather than revealing a layout orientation early.
- A compact label such as “Found 2 / 5” establishes the tray's purpose. Accessible
  names identify each shape and whether it is hidden or found.
- Only a whole-piece discovery updates its miniature. Ordinary hits must never
  light individual miniature tiles or imply which hidden shape was hit.
- These are status objects, not buttons. No interactive styling or focus stops.

During setup, reuse the miniature artwork in five genuine selection buttons
with 44px minimum targets. Distinguish selected, placed and unplaced states;
placed pieces remain selectable for editing until Ready is accepted. Show the
selected piece's rotation in its preview without shuffling the tray. Keep Rotate,
Place and Ready explicit. Trial the tray on the smallest supported screens before
settling its height; it must not reduce the board below existing fit requirements.

## 2. Make aiming and placement dependable

Keep tap-to-select and correct-before-confirming as the baseline. Strengthen the
selected cell with inset corner marks and matching row/column emphasis, preserving
its contents and neighboring cells. Put the coordinate beside the primary action
and retain “Illuminate B7” as its label. Keyboard focus remains distinct.

For setup, show the full legal footprint and distinguish overlap from off-board
failure in the nearby status: “Overlaps another piece” or “Extends past the edge.”
Never snap a piece to a different anchor automatically. When editing a placed
piece, clearly distinguish the proposed position from its committed position;
an invalid move leaves the original intact. Consider “Move piece” for that
confirmation. Ready locks only after host acceptance, with a quiet waiting state.

Trial press-and-slide aiming as a complement to tapping: finger movement adjusts
the local selection, release leaves a preview and Illuminate still commits it.
Show the coordinate in a reserved area outside the board while aiming. An
above-finger preview is optional and should be dropped if it covers useful cells,
jumps at edges or adds complexity without improving accuracy. Handle cancelled
gestures, board exits, phase changes and lost turns without submitting anything.
Apply gesture suppression only to the active board; secondary panels still scroll.

Already-searched cells remain inspectable and clearly marked; Illuminate is
unavailable with a short “Already searched” status. Repeated taps cannot spend
another turn. Retain arrows without wrapping, R to rotate and Enter to confirm.

## 3. Give turns and discoveries useful feedback

Use a compact, stable header for “Your turn” / “Emma's turn” (with safe long-name
handling). Remove persistent readiness text once setup ends. Keep player identity
outside the cells; no name labels or turn banners over the board. Spectators
follow the current player's name and public search results.

Reserve a short feedback line near the action for the last confirmed search,
separate from the current coordinate so aiming does not erase the outcome. Use
plain copy such as “B7 · Hit” or “Three-corner found.” Remove “hits never give
extra turns” from primary play. Put the positive rule “Take turns illuminating
one cell” in Help, alongside the rest of the rules.

On host-confirmed outcomes, give the selected tile a brief light response:
miss leaves ×, hit leaves a neutral lit mark, and discovery illuminates the whole
revealed piece and its tray miniature. Keep established marks and cell boundaries
readable. Effects never intercept input, delay a turn, hide other cells or require
dismissal. Reduced motion uses immediate state changes rather than moving sweeps.
Avoid a full-board spotlight or cinematic reveal.

Add a restrained visual accent when the local player's turn begins. Extend the
existing optional sound mapping with local placement, accepted Ready, turn start
and match finish cues. A rejected placement/Ready must not sound successful.
Use authoritative state transitions for shared cues and local successful commits
for draft placement. Deduplicate snapshots and prevent replay on late joining,
pause/resume, background recovery, rematch or game switching. On the winning
discovery, prioritize the match-finish cue rather than stacking several sounds.

## 4. Finish with an intentional result screen

Give “You win!” / “[Name] wins!” clear prominence outside the board. Replace the
active controls and tray with the result composition rather than leaving setup
readiness or the last-turn message behind. No invented score or ranking system.

Label the revealed boards by owner and distinguish searched hits from tiles that
were still hidden when the match ended. Use the available layout/search state;
revealing a losing player's remaining pieces must not imply they were all found.
Keep both boards visible where readable. If the shortest phone makes them too
small, use an explicitly labeled board switch with a full-size view rather than
shrinking both to decorative thumbnails. Keep winner and replay accessible in
either view. Host replay and participant waiting remain clear.

## Implementation and validation order

1. Start from a clean review of status/diff; use a new `codex/light-seek-polish`
   review branch and the existing non-deploying `.github/workflows/review.yml`.
   Establish the genuine Ubuntu baseline artifact route before adding states.
2. Build shared miniature tile artwork and the setup/play tray in
   `src/components/SeekGame.tsx` and scoped Seek rules in `src/style.css`. Check
   smallest-screen fit before adding decoration. Preserve board size and action
   targets; do not relax existing assertions to accommodate the tray.
3. Implement clearer aiming, editing/error feedback and phase-specific copy.
   Add optional touch refinement only if it improves the interaction in testing.
4. Add bounded outcome/turn feedback, audio transitions and the result layout.
   Use existing public fields; if a new network field proves necessary, validate
   it in the game/protocol validators and cover mixed-version behavior.
5. Update `tests/seek.spec.ts`, relevant Seek/audio tests, README behavior and
   QA/SCREENSHOTS documentation. Keep the family task marked planned until
   implementation; record incomplete acceptance checks accurately afterward.

Meaningful regression coverage must include all five miniatures, placed/editing
states, overlap/edge failures, Ready waiting, ordinary-hit privacy, discovery
completion, searched-cell rejection, keyboard and touch correction/cancellation,
rapid confirmation, turn changes, spectator labels, both result perspectives,
rematch and lifecycle/audio deduplication. Preserve real WebRTC pairing coverage.

Run `npm run check:fast` and `npm run test:game -- seek` while iterating; include
relevant audio/lifecycle tests and app-layout coverage for shared styling changes.
Use the `playwright-interactive` skill for a persistent production-preview pass
at QA.md's stable origin, checking build identity before pairing. Exercise normal
controls through setup, waiting, miss, hit, discovery, victory and rematch; inspect
screenshots and do a brief exploratory pass.

Prioritize the household's iPhone 17 Pro and iPhone 18 Pro Max, plus iPads in
landscape. Nominal phone test sizes are 402×874 and 440×956 CSS pixels in portrait,
with 874×402 and 956×440 for rotation checks. These are starting emulation sizes
based on standard 3× scaling of Apple's display resolutions, not measurements
of the installed app's available area: confirm the actual viewport on the devices
and account for safe areas, Safari chrome and Display Zoom. Sources:
[iPhone 17 Pro specs](https://support.apple.com/en-us/125090) and
[iPhone 18 Pro Max specs](https://www.apple.com/iphone-18-pro/specs/).

The primary tablet is the 10.9-inch iPad Air (5th generation, M1), played in
landscape: start with 1180×820 CSS pixels, based on standard 2× scaling of
[Apple's 2360×1640 display specification](https://support.apple.com/en-us/111887).
The secondary testing tablet is the 10.2-inch iPad (9th generation, 2021, A13):
start with 1080×810 CSS pixels in landscape, based on standard 2× scaling of
[Apple's 2160×1620 display specification](https://support.apple.com/en-us/111898).
Confirm actual usable viewports in Safari and installed PWAs on both tablets.
Landscape iPad composition is a primary design target, not a rotated phone
fallback. Keep existing small-screen and desktop tests as regression
checks; they must not drive compromises to the household's playing experience.
Include alternate taller font metrics, long names, focus/keyboard use, muted
sound and reduced motion.
Review deterministic selected/invalid/found/results screenshot states after
asserting synchronized state. Retain reviewed Darwin and genuine Linux images
with the existing font fixture, strict dimensions and pixel budgets.

After live QA and fixes, run complete local `npm run verify`. Obtain scoped Ubuntu
renders through the review workflow, visually inspect every changed image, then
push the final reviewed implementation and require ordinary Ubuntu verification
for that exact commit, with snapshot updates disabled. Report the command result,
run URL, commit and remaining physical-device checks. No Pages deployment is
needed for review.

## Acceptance priorities

The work succeeds when a player can accurately choose/correct a cell, recognize
all five shapes, see which ones are fully illuminated and follow the turn without
reading a paragraph. Nothing decorative may cover gameplay or make confirmation
slower. Setup and results must feel composed while the board stays generous.

Physical iPhone/iPad acceptance includes real-thumb corners/edges, installed-PWA
safe areas, rotation, larger text/VoiceOver, audio listening/unlock, Wi-Fi play,
background recovery and offline startup after updating both devices. Browser
emulation cannot certify these. If touch refinement causes frustration, retain
the simpler tap-and-confirm interaction and refine its visibility instead.
