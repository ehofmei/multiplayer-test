# Task 5 plan: Arena Pong

## Goal and priorities

Make Arena Pong feel like a finished local multiplayer arcade game: immediate
steering, an unmistakable ball, a useful court, and clear consequences when a
player misses. Control comfort and uninterrupted play take priority over artwork,
identity labels, life feedback and celebration. This is a proposed implementation
plan, not an implemented feature.

Keep the rules, paddle geometry, speed ramp/caps, fixed 120 Hz host simulation,
client prediction/smoothing, one-second serve delay, rotation and 1/3/5/7 lives.
Do not add decision delays, automatic pauses, gameplay popups or new dependencies.

## Evidence and design direction

Reviewed `FAMILY_POLISH_PLAN.md`, `SCREENSHOTS.md`, Arena's component, simulation,
audio mapping, styles and existing four-player pairing test. The working tree was
clean before this plan was added.

- `docs/screenshots/arena-pong-desktop.png` shows a small square court floating
  inside a wide flat stage. Four detached chips identify players mostly by color;
  two players share Coral in the capture, illustrating why color is insufficient.
  This is a paused desktop evidence capture, not a visual regression baseline or
  evidence of current phone comfort.
- `tests/breakout.spec.ts-snapshots/breakout-active-phone-darwin.png` provides a
  useful reference: restrained illuminated rails, a crisp ball and an unobtrusive
  steering strip outside the court. Borrow the framing and control approach,
  while giving Arena its own competitive identity.
- `tests/pong.spec.ts-snapshots/pong-warning-linux.png` reinforces the value of
  simple, high-contrast paddles and ball. More texture must preserve that clarity.
- Arena increments `score[side]` on a miss. The shared mapper treats that increase
  as a positive Pong point; its ordinary rebound logic also equates velocity axes
  with paddle/wall identity. Arena needs its own event semantics.
- Players already see their paddle at the bottom. On-screen side directions must
  follow that rotated view; host setup directions remain canonical assignments.

Use a compact HUD, a square framed court that dominates the available play area,
and a small control/footer area. On wide screens, use spare lateral space for
secondary information where useful; do not stretch the square physics or fill
the court with text. Keep the local paddle and ball brighter than the decoration.

## Implementation sequence

### 1. Establish reliable feedback and fix sound first

Separate Arena cue handling from ordinary Pong and Breakout. A lost life gets a
short loss cue, elimination a distinct restrained cue, occupied-side contact a
paddle tick and empty/eliminated-side contact a wall tick. No Arena miss emits a
point celebration. Important outcomes take precedence over incidental contacts;
the final elimination and match ending must not produce a pile of sounds.

Use life transitions for loss/elimination. For contact side and exact miss
position, inspect the confirmed collision in `stepArena`: a miss currently resets
the ball to center, so its post-miss position cannot locate the effect. Prefer a
small Arena feedback helper. If snapshot inference cannot reliably preserve the
actual collision through coalesced client updates, add a minimal bounded host
event with sequence, kind, canonical side and position. Do not guess from an axis
flip or a rendered ball. Decide the wire representation during implementation;
avoid an unbounded event log or a shared effects framework.

Any wire addition must be validated in `src/games/validate.ts` and
`src/network/protocol.ts` as applicable, including malformed sides, positions and
sequences. Account for Breakout's reuse of `stepArena` without changing its cues.
Initialize feedback silently on first snapshot and reset it on room epoch,
rematch and game changes. Reject duplicates/stale events and suppress historical
effects after suspension or recovery. Document any all-device update requirement.

### 2. Compose the court around play and test steering

Replace the flat oversized stage with a subtle arcade frame: quiet surface
texture, rail depth and restrained lighting. Keep the interior clear; render the
ball above effects. Trial only a short faint trail if it improves tracking.

Retain immediate local paddle rendering, direct court drag, pointer capture and
keyboard/accessible range input. Trial Breakout's horizontal steering strip below
the court so a thumb can steer without covering the ball. Both surfaces must use
the same rotated coordinate mapping and clamp. Verify drag beyond the surface,
release/cancel, rapid direction changes and start/resume focus. Do not introduce
input easing, dead zones or decorative animation that delays paddle response.

Compare strip and court comfort on phones, including short landscape layouts.
Keep the strip only where it provides useful reach without excessively shrinking
the court. Physical iPhone/iPad testing must settle thumb comfort; browser fit
alone cannot. Secondary help/setup content remains scrollable.

### 3. Identify paddles without crowding the rally

Add a small persistent local-paddle notch/outline and a stable seat number or
symbol shared by paddle-edge markers and HUD entries. Preserve chosen colors,
including duplicate colors. Keep markers outside the interior play area and
upright in each rotated view; no floating name tags following paddles.

Give compact HUD entries a view-relative direction, identity and life pips with
an accessible numeric label. Test seven pips before choosing the final layout;
use a compact count if pips force tiny text or reduce court space. Full names
remain available in Help/players when a compact name is shortened. Mark You and
Out clearly. Spectators use a consistent unrotated view with no local marker.

At one life, use a steady distinct outline/pip treatment and a concise last-life
label where it fits. Avoid continuous pulsing, whole-court danger tint or repeated
alarms. Identity and danger treatments must work without color or sound.

### 4. Make misses and elimination visible at the edge

Briefly mark the actual miss position on the affected rail and update its HUD
life display. Do not put loss text, numbers, bursts or banners over the ball's
path. Fit feedback within the existing serve interval; never delay the next serve.

On elimination, replace that paddle with a clearly solid neutral wall, retain its
small identity marker with Out in the HUD, and disable its controls immediately.
The wall stays readable after the transient effect ends. An eliminated player's
view remains stable so they can follow the rally. Announce the outcome accessibly
without announcing every contact. Reduced motion uses static edge/pip emphasis.

### 5. Finish setup and results as intentional game screens

Keep host seat/lives configuration on a focused ready screen, with a clear court
preview and Start. Separate replay from changing seats/lives so the final screen
does not immediately become a configuration form. Preserve the current settings.

Once simulation is finished, present the winner's full name and paddle identity,
the local player's result, and a prominent host replay action; clients see that
the host can restart. A finished court may support the presentation because play
has stopped. Do not invent points, rankings or match statistics from miss counts.
Keep Help, pause/resume and connection/update access easy to reach.

## Verification and handoff

Build a short QA inventory before implementing. Cover controls, identity, last
life, miss, wall conversion, winner, setup/rematch and lifecycle recovery.

- Unit/audio tests: all four canonical collision sides; occupied/empty/eliminated
  walls; corner ordering; life loss versus elimination; 1/3/5/7 lives; final-cue
  priority; duplicate/coalesced/delayed snapshots; pause/resume, late join, rematch,
  spectators and epoch changes. Confirm ordinary Pong and Breakout cues/rules
  remain correct. Test any new event validation and boundedness.
- Browser regression: extend real three/four-player pairing flows for all rotated
  controls, duplicate colors, long names, elimination, spectator restrictions,
  replay, host background/disconnect and switching without re-pairing. Verify
  steering strip and court agree and local input stays immediate.
- Deterministic visuals: ready, active rotated view, last life/miss, eliminated
  wall and finale, including muted/reduced motion and a dense four-player HUD.
  Establish deliberate game state through controls and assert synchronization
  before capturing; do not capture incidental live-ball positions.
- Live functional and visual QA: use `playwright-interactive` during implementation
  at 390×844, 320×700, 320×568, 844×390, 768×1024 and 1280×720. Review screenshots
  and bounds, taller font metrics, safe areas, keyboard focus, contrast, touch
  targets and footer clearance. Exercise normal pointer/keyboard inputs and a
  brief exploratory pass, rather than relying only on fit assertions.
- Linux gate: before adding snapshots, adapt the non-deploying review workflow
  to `codex/arena-pong-polish` and the affected specs. Obtain actual Ubuntu renders,
  review every changed Darwin/Linux image, and retain strict comparison budgets.
  Run complete local `npm run verify` and obtain green Ubuntu verification for
  the exact final commit with snapshot updates disabled. No Pages deployment.
- Production/PWA: check `/multiplayer-test/` asset routing, navigation/reload,
  offline startup after an online visit, stored colors/sound and user-controlled
  service-worker updates. Check installed iPhone/iPad steering, rotation, safe
  areas, audio unlock/recovery and several devices sounding together on Wi-Fi.
- Update README with implemented behavior, QA with coverage/device follow-up,
  SCREENSHOTS with reviewed Arena states, and the Task 5 status accurately.
  Review final diff/status and report commands, exact Linux commit/run URL,
  reviewed baselines and remaining physical-device checks.

## Acceptance rule

Players can steer comfortably, track the ball continuously, identify their
paddle, notice losing a life and understand a new wall. The game feels more
cohesive without requiring players to read during a rally. Remove or simplify
any proposed effect, marker or control layout that makes those basics worse.
Finish with a short family playtest before expanding polish to other games.
