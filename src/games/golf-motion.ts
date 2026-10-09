import { courses, type GolfState } from "./minigolf";

export interface GolfPoint {
  x: number;
  y: number;
}
export function golfMotionFrame(game: GolfState) {
  return {
    phase: game.phase,
    hole: game.hole,
    ticks: game.ticks,
    impacted: game.impacted,
    balls: game.balls.map((b) => ({
      id: b.id,
      x: b.x,
      y: b.y,
      vx: b.vx,
      vy: b.vy,
      captured: b.captured,
      skipped: b.skipped,
      cooldowns: [...b.cooldowns],
    })),
  };
}
export type GolfMotionFrame = ReturnType<typeof golfMotionFrame>;
type Ball = GolfMotionFrame["balls"][number];
export interface GolfContact extends GolfPoint {
  kind: "launch" | "wall" | "mushroom" | "meteor" | "cup";
  ball?: string;
  mushroom?: number;
  corner?: GolfPoint;
}
export function consecutiveGolfFrames(
  before: GolfMotionFrame | null,
  after: GolfMotionFrame,
) {
  return (
    !!before &&
    before.hole === after.hole &&
    before.phase === "rolling" &&
    ["rolling", "results"].includes(after.phase) &&
    after.ticks > before.ticks &&
    after.ticks - before.ticks <= 30
  );
}
// Cosmetic contacts use confirmed velocity changes and existing boost cooldowns.
// They do not add network fields or predict gameplay. A gap over 250ms snaps
// to the received state rather than inventing missed contacts or trajectories.
export function golfContacts(
  before: GolfMotionFrame | null,
  after: GolfMotionFrame,
): GolfContact[] {
  if (!before || before.hole !== after.hole) return [];
  const course = courses[Math.max(0, after.hole - 1)];
  if (before.phase === "aiming" && after.phase === "rolling")
    return [{ kind: "launch", x: course.tee[0], y: course.tee[1] }];
  if (!consecutiveGolfFrames(before, after)) return [];
  const meteor = !before.impacted && after.impacted && course.meteor;
  const contacts: GolfContact[] = meteor
    ? [{ kind: "meteor", x: meteor[0], y: meteor[1] }]
    : [];
  const dt = (after.ticks - before.ticks) / 120;
  for (const b of after.balls) {
    const old = before.balls.find((p) => p.id === b.id);
    if (!old || old.captured || b.skipped) continue;
    if (b.captured) {
      contacts.push({
        kind: "cup",
        x: course.cup[0],
        y: course.cup[1],
        ball: b.id,
      });
      continue;
    }
    let boosted = false;
    b.cooldowns.forEach((tick, i) => {
      if (tick <= (old.cooldowns[i] ?? 0)) return;
      boosted = true;
      const [x, y] = course.mushrooms[i];
      const dx = old.x - x,
        dy = old.y - y;
      const speed2 = old.vx ** 2 + old.vy ** 2;
      const dot = dx * old.vx + dy * old.vy;
      const root = dot ** 2 - speed2 * (dx ** 2 + dy ** 2 - 40 ** 2);
      const t = speed2 && root >= 0 ? (-dot - Math.sqrt(root)) / speed2 : -1;
      contacts.push({
        kind: "mushroom",
        x,
        y,
        mushroom: i,
        ball: b.id,
        corner:
          t >= 0 && t <= dt + 1 / 120
            ? { x: old.x + old.vx * t, y: old.y + old.vy * t }
            : undefined,
      });
    });
    if (boosted || meteor || b.captured || Math.hypot(old.vx, old.vy) < 20)
      continue;
    const contact = wallContact(old, b, course.walls, dt);
    if (contact) contacts.push({ ...contact, kind: "wall", ball: b.id });
  }
  return contacts.slice(0, 16);
}
function wallContact(
  old: Ball,
  ball: Ball,
  walls: readonly (readonly number[])[],
  dt: number,
) {
  const candidates: (GolfPoint & { corner: GolfPoint; time: number })[] = [];
  const face = (
    axis: "x" | "y",
    edge: number,
    surface: number,
    low: number,
    high: number,
  ) => {
    const velocity = axis === "x" ? old.vx : old.vy;
    const nextVelocity = axis === "x" ? ball.vx : ball.vy;
    if (velocity * nextVelocity >= 0) return;
    const time = (edge - old[axis]) / velocity;
    const other = axis === "x" ? "y" : "x";
    const at = old[other] + (other === "x" ? old.vx : old.vy) * time;
    if (time < -0.001 || time > dt + 1 / 120 || at < low - 10 || at > high + 10)
      return;
    candidates.push({
      x: axis === "x" ? surface : at,
      y: axis === "y" ? surface : at,
      corner: { x: axis === "x" ? edge : at, y: axis === "y" ? edge : at },
      time,
    });
  };
  face("x", old.vx > 0 ? 990 : 10, old.vx > 0 ? 990 : 10, 10, 690);
  face("y", old.vy > 0 ? 690 : 10, old.vy > 0 ? 690 : 10, 10, 990);
  for (const [x, y, w, h] of walls) {
    face(
      "x",
      old.vx > 0 ? x - 10 : x + w + 10,
      old.vx > 0 ? x : x + w,
      y,
      y + h,
    );
    face(
      "y",
      old.vy > 0 ? y - 10 : y + h + 10,
      old.vy > 0 ? y : y + h,
      x,
      x + w,
    );
  }
  return candidates.sort((a, b) => a.time - b.time)[0];
}
export function golfDrawPoint(
  from: GolfPoint,
  corner: GolfPoint | undefined,
  target: GolfPoint,
  fraction: number,
): GolfPoint {
  const turn = corner ?? from;
  const first = Math.hypot(turn.x - from.x, turn.y - from.y);
  const second = Math.hypot(target.x - turn.x, target.y - turn.y);
  const travel = (first + second) * Math.max(0, Math.min(1, fraction));
  const a = travel < first ? from : turn,
    b = travel < first ? turn : target;
  const length = travel < first ? first : second;
  const ratio = length
    ? Math.min(1, (travel < first ? travel : travel - first) / length)
    : 1;
  return { x: a.x + (b.x - a.x) * ratio, y: a.y + (b.y - a.y) * ratio };
}
