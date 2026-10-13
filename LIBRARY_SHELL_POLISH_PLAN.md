# Library and shared shell polish plan — Task 9

Status: implementation and visual review complete; physical-device acceptance
remains. Automated acceptance uses the final review-branch verification described
below. This refines
[Task 9 of the family polish plan](FAMILY_POLISH_PLAN.md#9-library-and-shared-shell-make-the-collection-feel-intentional).

## Completion and acceptance

Task 9 is implemented on `codex/library-shell-polish`: catalog and fourteen SVG
marks, badges and roster requirements, page/focus restoration, setup/rematch seat
and spectator guidance, consistent Help, gallery repairs and regression coverage.
Existing game action rows, themes and replay wording remain. Breakout guidance
uses its existing status area, preserving the original court baseline.

Complete local `npm run verify` passed: formatting, TypeScript, 216 unit tests,
10 script tests, production build, all 76 browser tests and screenshot-pair checks.
Every changed/new Darwin and genuine Linux baseline was visually reviewed;
dimensions, budgets and fit assertions remain strict. Linux evidence runs
38329979084, 38331222373 and 38331877161 supplied the reviewed renders. Evidence
runs do not replace the ordinary final verification gate.

Ordinary Ubuntu `npm run verify` passed for implementation commit
`6973b87a97c17b46d77a51a70ee055cd321fb043`, with snapshot updates disabled:
[final implementation verification](https://github.com/ehofmei/multiplayer-test/actions/runs/38335898739).
The owner authorized merging to `main` after these checks passed. Any final
review-branch checks must pass before merging; the main workflow then verifies
and deploys Pages. Merge and deployment results are available in
[the repository's pull requests](https://github.com/ehofmei/multiplayer-test/pulls?q=is%3Apr+head%3Acodex%2Flibrary-shell-polish)
and [Pages workflow](https://github.com/ehofmei/multiplayer-test/actions/workflows/pages.yml).
The authenticated CLI is
`/private/tmp/shared-lights-gh/gh_2.102.0_macOS_arm64/bin/gh` (not on PATH).
The complete local log is `/private/tmp/task9-verify-final.log`.

Live production QA covered library/card/control layouts, Help/Escape/focus,
independent host/client text pairing, disabled client browsing, duplicate seats,
watching host, pause/resume, switching, diagnostics, synchronized Lights,
disconnects and a natural solo Race finish/replay. The corrected Breakout setup
was reviewed on the short phone and landscape iPad. Final executable live build:
`20261013T010647Z · local`. README describes behavior; QA.md and SCREENSHOTS.md
record coverage, evidence and household-device acceptance.

Physical acceptance remains: installed iPhone/iPad safe areas and usable viewport,
rotation, real-thumb reach, larger text/VoiceOver, household Wi-Fi and background
recovery. Ask the family to choose suitable games for one, two, three and larger
rosters and explain who plays versus watches. These checks stay pending until
performed; automated verification does not replace physical-device acceptance.

## Direction

Make the collection feel like fourteen games belonging to one family game room.
Players should recognize each game, understand who can play, and return to their
place in the library without trial and error. Keep the themed game boards as the
centerpieces, with familiar help, results and replay access around them.

Use local SVG/CSS artwork, existing native dialogs and small presentation helpers.
Preserve game order, four/six-card pages, eligibility rules, seat assignment,
spectators, pairing, offline startup and user-controlled updates. No filters,
new modes, dependencies, generated media, audio changes or wire fields are planned.

## Evidence from the current checkout

Reviewed Games.tsx, AppLayout.tsx, App.tsx, shared styles, session start guards,
game setup controls, README.md, QA.md, layout tests, screenshot paths and the
review workflow. These are code findings, not a new live or physical-device audit.

- All fourteen library entries live in Games.tsx and use Unicode marks. Player
  counts appear in some descriptions but are absent from others. The picker
  receives only the session, rather than the reactive snapshot roster.
- The picker owns its page locally, so Choose Game remounts it on page one. Its
  media-query change handler also resets to page one. Pagination says “More
  games” and shows an unlabeled fraction.
- Start guards distinguish exact-two Light Seek, minimum-two games, minimum-three
  Glow Clash, selected paddle seats, and solo-capable games. Card copy should
  describe those existing rules rather than infer eligibility from prose.
- GameHelp already shares the accessible name and dialog title “Controls & help,”
  but visible labels include Help, How to play and Help & players. Shared CSS
  positions some actions absolutely; other games have purpose-built control rows.
- The Sumo gallery image is missing at its current path. Existing alternatives
  include tests/sumo-integration.spec.ts-snapshots/sumo-court-linux.png and
  tests/sumo.spec.ts-snapshots/sumo-active-phone-linux.png.
- app-layout.spec.ts already covers all setups, pagination, long names, safe
  areas, help focus and compact layouts. Preserve and extend this coverage.

## 1. Give every game a recognizable card

Create a small typed catalog, either beside the picker or in a focused module,
with title, short description, illustrated mark, player requirement, category,
solo support and existing seat policy. Keep room state and network actions in
their current layers. Test that every selectable game appears exactly once.

Use these badge meanings, confirming them against start guards before coding:

| Game              | Player badge        | Category    | Solo badge / seat policy                        |
| ----------------- | ------------------- | ----------- | ----------------------------------------------- |
| Sumo Bumpers      | 2–8 players         | Competitive | Everyone present at start plays                 |
| Light-cycle Arena | 2–8 players         | Competitive | Everyone present at start plays                 |
| Spaceship Panic   | 2–8 players         | Cooperative | Solo practice                                   |
| Co-op Breakout    | 1–4 players         | Cooperative | Solo practice; host selects seats, others watch |
| Pong              | 2 players           | Competitive | Host selects two seats, others watch            |
| Arena Pong        | 3–4 players         | Competitive | Host selects seats, others watch                |
| Reaction Race     | 1–8 players         | Competitive | Solo practice                                   |
| Shared Lights     | 1–8 players         | Shared toy  | Play solo; everyone can toggle                  |
| Midnight Bakery   | 2–8 players         | Competitive | Everyone present at start plays                 |
| Meteor Minigolf   | 2–8 players         | Competitive | Everyone present at start plays                 |
| Treasure Dive     | 2–8 players         | Competitive | Everyone present at start plays                 |
| Patchwork Picnic  | 2–8 players         | Competitive | Everyone present at start plays                 |
| Light Seek        | Exactly 2 connected | Competitive | No extra connected players at Start             |
| Glow Clash        | 3–8 players         | Competitive | Everyone present at start plays                 |

Solo badges supplement the normal multiplayer description; Shared Lights is a
toy rather than practice for a scored match. Do not imply solo support for games
whose host guard rejects one player. Late arrivals watching a running match are
separate from selectable seats and from initial roster eligibility.

Draw compact marks from actual game motifs: bumper/ring, directional rider/trail,
cockpit panel, paddle/core, Pong ball/paddles, four-sided arena, TAP target, lamp,
bakery treat, meteor/cup, treasure/shield, stitched food patch, glowing hidden
shape, and claimed/clashing tiles. Reuse lightweight artwork primitives where
practical; avoid importing whole game components or shrinking a full board into
an unreadable thumbnail. Marks are decorative, static and aria-hidden. Titles
and text carry the meaning without color or artwork.

Keep descriptions short and badges readable. Prioritize title, player count and
category on short phones; never hide eligibility to fit decoration. Retain the
last page's intentional two-card composition and native card buttons. Preserve
exact title accessible names used by existing tests, associating practical
details with aria-describedby where needed.

## 2. Explain suitability before Start

Pass the current snapshot roster to the picker so suitability updates immediately
after join/leave. Add compact, calm guidance only where a requirement is unmet:
“Needs 1 more player,” “Needs 2 more players,” or “Exactly 2 connected players
needed; 3 are connected.” Available cards need no extra status paragraph.

Allow the host to open an unavailable game's setup and read its help; selection
does not start the game. Keep client cards disabled for host-only selection, with
the existing host-choosing explanation and independently usable pagination.
Do not communicate disabled state through low contrast alone.

Near each setup's disabled Start, state the actual reason in visible text and
associate it with the control. Paddle games must distinguish connected roster,
valid selected seats, duplicate/missing assignments and unselected watchers.
Show selected names and “You are watching” where appropriate, including a host
who selects two clients for Pong. Preserve existing assignment ordering and
validation. For Light Seek, explicitly explain that extra connected players
prevent Start; do not silently select two seats or invent spectators at setup.

Use a small pure presentation helper for count guidance if it prevents drift
between cards and setup. Existing authoritative session guards remain decisive.
Handle disconnect status separately from player-count requirements and avoid
asserting that a room is ready while it is disconnected.

## 3. Make pagination clear and restore the browsing position

Keep Previous games and replace More games with Next games; show “Page N of M”
and an unobtrusive current-page indicator. Keep at least 44px button targets and
announce page changes politely. Do not add fourteen tabs or a filter bar.

Lift browsing position above the picker mount into local App UI state. Remember
the first visible game index, so returning through Choose Game restores the page
and a four/six-card breakpoint change keeps that game visible. No localStorage or
network persistence is needed. A fresh room starts on page one; returning from
a game restores keyboard focus to its card when visible. Clamp position safely
and keep logical focus order through cards and pagination.

Update chooseGame/test navigation helpers to search from any current page rather
than assume page one or loop only forward. Cover every card from both page sizes,
the final partial page, repeated switching and resizing while away from the picker.

## 4. Harmonize shared controls without flattening the themes

Use “Help” as the consistent visible button label while retaining “Controls &
help” as the accessible name and dialog title. Preserve full instructions,
rosters, sliders, color choices and native focus restoration inside existing
dialogs. Shared Lights can retain its short inline explanation; do not add a
redundant empty help panel just for symmetry.

Establish consistent action priority: Start/Pause/Resume/Replay as the primary
game action, Help and existing Standings/Results as secondary actions, Choose
Game in the room toolbar. Keep playful replay wording such as Seek Again or
Bump Again, and keep essential result information visible until the existing
continue action. Do not rebuild every game finale or move useful standings
behind a new universal results dialog.

Audit setup, active, paused and finished controls across all fourteen games.
Change placement only where it improves consistency or fixes crowding; preserve
proven steering strips, thumb pads, short-screen dialogs and landscape board
space. Prefer scoped action-row styling over a new universal game framework.

Use restrained shared frame colors, borders and spacing to connect the library
and toolbar to themed screens. Preserve safe-area clearance, wrapping for long
status text, visible connection failures, Players/Menu access and update controls.
Keep detailed connection/build data in the existing secondary panel. Never hide
an actionable update or reload an active match automatically.

## 5. Refresh the gallery and document behavior

Repair the Sumo image using an existing reviewed Linux baseline. Audit every
local image and link in SCREENSHOTS.md for existence, platform labeling and a
representative current state. Prefer reviewed Linux images where available;
retain honest macOS labels when used. Add reviewed library imagery once generated,
without duplicating baseline assets or claiming physical-device evidence.

Document roster badges, page restoration and common controls in README.md.
Record automated/live coverage and device acceptance in QA.md. Link this refined
plan from Task 9 in FAMILY_POLISH_PLAN.md now, retaining Planned status; change
status only as implementation and verification actually complete.

## Implementation sequence and verification

1. Inspect status/diff, preserve unrelated work, and check gh authentication and
   QA.md's artifact route before adding screenshot states. Use a
   codex/library-shell-polish review branch with the existing non-deploying review
   workflow. No workflow edits are expected.
2. Implement and test catalog/count guidance, then card artwork and layout. Settle
   phone and landscape iPad composition before generating final baselines.
3. Implement page restoration and focus behavior, setup explanations and the
   scoped shared-control pass. Update affected navigation helpers and assertions.
4. Repair/audit gallery links, document final behavior, and complete live QA before
   final snapshot generation and complete verification.

Build a QA inventory covering lone host; two, three, four and eight connected
players; host/client/spectator perspectives; all library pages; unmet and met
requirements; duplicate seats; long names; disconnected clients; setup/play/pause/
results/replay; dialogs; switching without re-pairing; and waiting updates.
Use genuine pairing for roster changes and spectator flows. Include Light Seek
with one, two and three connected players, Glow with two/three, and Pong with a
watching host. Preserve privacy and existing epochs/cleanup during switching.

Run npm run check:fast while editing, focused catalog tests, and guarded browser
runs for tests/app-layout.spec.ts, tests/game.spec.ts, tests/seek.spec.ts and
affected games. Include tests/updates.spec.ts for shell/update regressions and
npm run test:network for cross-game/pairing coverage. Build the production preview
before browser testing; use the package guards and avoid concurrent shared-dist
rebuilds. Keep changes to game tests proportional to actual affected controls.

During implementation, use the playwright-interactive skill for persistent live
functional and visual QA at QA.md's stable production origin. Confirm each tab's
build and apply waiting updates from Home before pairing. Exercise normal touch,
mouse and keyboard controls; inspect screenshots, bounds, focus, contrast,
44px targets, clipping, awkward empty states and secondary-content scrolling.
Do a brief exploratory pass after the inventory.

Prioritize 402×874 and 440×956 phones with rotations, 1180×820 landscape iPad Air,
and secondary 1080×810 iPad. Retain 390×844, 320×700, 320×568, 844×390, 768×1024
and 1280×720 regression coverage. Test taller font metrics and safe-area fixtures
without weakening fit assertions or shrinking household play surfaces.

Capture deliberate stable library states across all fourteen marks, unmet roster
requirements, a six-card landscape iPad page, the final partial page, keyboard
focus, disabled client cards and the densest realistic shell/setup. Reuse existing
game snapshots where the shared controls change; add only states that protect
meaningful behavior. Include muted/reduced-motion presentation. Establish states
through ordinary controls and assert synchronization before capture.

Generate/review Darwin baselines, obtain genuine Ubuntu renders through scoped
review-workflow baseline evidence, and visually inspect every changed image on
both platforms. Retain font fixtures, dimensions and pixel budgets. Run complete
local npm run verify after the last substantive fix, then obtain a successful
Ubuntu npm run verify for the exact final commit with snapshot updates disabled.
Report the local result, Linux run URL/commit, reviewed baselines and final diff.

Verify production /multiplayer-test/ routing, cached offline startup, saved
identity/sound preferences and user-controlled service-worker updates. Physical
acceptance remains: installed iPhone/iPad safe areas, usable viewport, rotation,
larger text/VoiceOver, real-thumb card and control reach, household pairing and
background/resume. Ask a family member to choose a suitable game from one-, two-,
three- and larger-player rooms and explain who plays versus watches.

Planning changes require formatting and diff checks only. Implementation succeeds
when all fourteen cards communicate requirements, navigation restores position,
shared controls are predictable and the collection fits the target viewports.
Missing live QA, genuine Linux renders or exact-final Linux verification leaves
implementation incomplete; report physical-device checks as pending until done.
