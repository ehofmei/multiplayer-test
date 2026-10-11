# Family playtest improvement plan

Agreed direction from the October 2026 family play session. **Status: completed.**
All eight implementation tasks are complete. The closing review produced
[FAMILY_POLISH_PLAN.md](FAMILY_POLISH_PLAN.md), the follow-up plan for the next
phase of game polish.

Use [README.md](README.md) for current product behavior and [QA.md](QA.md) for
verification coverage and remaining physical iPhone/iPad checks. Device feedback
and family tuning remain ongoing; implementation completion does not certify
every installed-PWA, touch or audio behavior on real devices.

## Completed scope

| Task      | Improvement                                             | Status    |
| --------- | ------------------------------------------------------- | --------- |
| 1         | Untimed decisions with explicit confirmation            | Completed |
| 2         | Escalating rally bumpers in regular Pong                | Completed |
| 3         | Timed team score chase in Spaceship Panic               | Completed |
| 4         | Prominent rewards and final rankings in Glow Clash      | Completed |
| 5         | Direct Light Seek board and larger Light-cycle Arena    | Completed |
| 6         | Minigolf course, motion and power improvements          | Completed |
| 7         | Sumo controls, dash and outcome-driven ending           | Completed |
| 8         | Breakout reaction space and impact feedback             | Completed |
| Follow-up | Review all games and create the family game polish plan | Completed |

The original briefs and acceptance criteria below preserve the agreed design
intent. Future work should use the follow-up plan and [AGENTS.md](AGENTS.md).

## Shared goals

- Make games feel like games: large boards, simple controls, clear feedback,
  satisfying sound and purposeful animation. Use Glow Clash as the polish benchmark.
- Remove deadlines that skip choices or punish players for taking time to decide.
  Preview a choice, then explicitly tap **Lock In**, **Ready**, or **Confirm**.
  Wait for all participating players; show who is still choosing.
- Keep short start countdowns, animation timing and reaction measurements where
  they serve gameplay. End action games through gameplay outcomes rather than an
  arbitrary timeout. Spaceship Panic intentionally retains timed commands and missions.
- Prioritize installed iPhone/iPad play: maximize boards without page scrolling,
  keep controls comfortable, and move extra details into help or dialogs.
- Keep sound optional and muted by default. Visual feedback must work without it;
  respect reduced motion. Keep the existing local, offline-capable architecture.

## Original implementation briefs

### 1. Remove decision deadlines

Audit all games, starting with Minigolf, Treasure Dive and Patchwork Picnic.
Remove automatic skipped turns and timeout penalties for choosing moves. Keep
explicit skip actions where useful. Reuse existing confirmation buttons instead
of adding duplicates. Minigolf launches when everyone has locked their shot and
finishes shots naturally, without a visible rolling deadline cutting them off.

**Done when:** a player can take their time without losing a choice or score;
locked players see waiting feedback; pause, resume and disconnects cannot leave
the room stuck. Spaceship Panic's command deadlines remain an intentional exception.

### 2. Give regular Pong escalating bumpers

Keep paddles at their current size. As a rally gets longer, gradually introduce
small bumper-pool obstacles, up to **four**. Warn visually before each becomes
solid; keep them away from paddles and avoid appearing on the ball. Give impacts
sound and a flash. Reset bumpers after every point. Keep bounded ball speeds and
tune bumper timing and placement through playtesting.

**Done when:** long rallies become more chaotic, controls stay comfortable, and
bumper collisions, pause/resume and point resets behave consistently on all devices.

### 3. Turn Spaceship Panic into a timed team score chase

Keep **1-, 2- and 3-minute missions**, with **2 minutes recommended and selected
by default**. Replace the health bar and health-based loss with a team score.
Correct commands earn points; consecutive successes build a bonus. Missed or wrong
commands break the streak. The clock ending completes the mission for everyone,
with results showing team score, completed commands and highest streak.

Increase command pressure as the mission progresses, relative to its chosen
length. Randomize command recipients rather than always addressing the next
player, avoiding self-assignments in multiplayer and conflicting active requests.
Keep solo practice. Replace some 0–3 controls with switches or pictured settings.
Use familiar words and matching pictures, plus a gentler difficulty setting for
younger players. Preserve the frantic calling-and-listening teamwork.

**Done when:** every duration feels increasingly hectic, misses affect scoring
without eliminating anyone, recipients vary when the roster permits it, and a
seven-year-old can match commands to controls with much less reading. With two
players, commands necessarily go to the other player.

### 4. Make Glow Clash rewards prominent

Show large, clear point gains after each round. At match end, make the final
ranking the main screen, with an unmistakable winner or shared winners and a
celebratory effect. Keep results available until players choose to continue.

**Done when:** players immediately understand what they earned and who won,
without opening a secondary scores panel.

### 5. Simplify Light Seek and enlarge Light-cycle Arena

Light Seek: remove region selectors and use one large, directly tappable full
board. Retain clear selection, placement previews and confirmation.
Light-cycle Arena: use square arena corners and maximize the board.

**Done when:** both boards are readable on narrow phones, selections are accurate,
and essential controls fit without scrolling. Check Light Seek's full grid with
real thumbs before accepting the layout.

### 6. Improve Minigolf's appearance and shot power

Improve course surfaces, obstacles, depth, cup and ball movement. Tune power and
rolling resistance together so strong shots feel useful and weaker shots remain
controllable. Add clear aiming feedback, impact sounds and cup celebrations.

**Done when:** the courses feel cohesive and playful, and players can make
satisfying shots across all five holes without fighting the power control.
Complete task 1's timing changes first.

### 7. Polish Sumo Bumpers

Redesign the thumb control to look and feel natural. Make dashing noticeably
faster, with a swoosh, motion trail and clear recharge feedback. Improve bumper
appearance, collisions and ring-out celebrations. Replace the hard match timeout
with continued arena pressure until gameplay produces a winner or simultaneous draw.

**Done when:** players can immediately tell when a dash fires, steer comfortably,
and understand collisions, elimination and the final result.

### 8. Give Co-op Breakout more reaction space

Try more, smaller bricks in a tighter central grid, leaving wider clear lanes
between the bricks and every paddle. Tune ball speed alongside the new layout;
smaller bricks alone do not fix reaction time. Add satisfying hit and break feedback.

**Done when:** phone players have time to respond from every occupied side, bricks
remain readable, and clearing levels still feels lively and cooperative.

## Verification expectations

These expectations remain a reference for later changes to the completed work.

- Keep scope to the assigned task; add any missing action, scoring and result
  sounds/animations in the games it touches. Audit remaining games for the shared
  polish goals after these tasks, without unnecessary redesigns.
- Add meaningful rule and pairing tests. Validate network changes and document
  when every device needs updating. Preserve pause/background behavior and storage.
- Follow `AGENTS.md` for live browser QA, desktop/mobile screenshots, reviewed
  Darwin/Linux baselines and complete local plus exact-final-commit Linux
  `npm run verify`. Do not merge or deploy just to obtain verification.
- Update `README.md` with implemented behavior and `QA.md` with device checks.
  Report remaining physical iPhone/iPad checks; use another family play session
  to tune timing, difficulty and feel.
