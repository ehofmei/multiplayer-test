import type { PongState } from "./model";

// Distances use court-width units so collisions match circles in the 1000×650 SVG.
export const PONG_ASPECT = 0.65;
export const BUMPER_RADIUS = 0.028;
export const PONG_BALL_RADIUS = 0.017;
export const BUMPER_WARNING = 1.5;
export const BUMPER_FIRST = 8;
export const BUMPER_INTERVAL = 6;
const contactRadius = BUMPER_RADIUS + PONG_BALL_RADIUS;
export interface PongBumper {
  x: number;
  y: number;
  warning: number;
  flash: number;
  hits: number;
}
const positions = [
  [0.38, 0.3],
  [0.62, 0.7],
  [0.38, 0.7],
  [0.62, 0.3],
];
const distance = (a: { x: number; y: number }, b: { x: number; y: number }) =>
  Math.hypot(a.x - b.x, (a.y - b.y) * PONG_ASPECT);

export function advanceBumpers(state: PongState, elapsed: number, dt: number) {
  const bumpers = (state.bumpers ?? []).map((b) => {
    let warning = Math.max(0, b.warning - dt);
    // Keep warning until there is clearance for the ball's entire next step.
    if (
      b.warning > 0 &&
      warning === 0 &&
      distance(b, state.ball) <= contactRadius + 0.02
    )
      warning = Math.min(b.warning, dt);
    return { ...b, warning, flash: Math.max(0, b.flash - dt) };
  });
  if (
    bumpers.length < 4 &&
    elapsed >= BUMPER_FIRST + bumpers.length * BUMPER_INTERVAL
  ) {
    // Try another open spot if the ball is visiting the next planned position.
    const offset = state.score.reduce((a, b) => a + b, 0) % positions.length;
    for (let i = 0; i < positions.length; i++) {
      const [x, y] = positions[(i + offset) % positions.length];
      const candidate = { x, y };
      if (
        !bumpers.some((b) => distance(b, candidate) < BUMPER_RADIUS * 3) &&
        distance(candidate, state.ball) > contactRadius + 0.08
      ) {
        bumpers.push({
          ...candidate,
          warning: BUMPER_WARNING,
          flash: 0,
          hits: 0,
        });
        break;
      }
    }
  }
  return bumpers;
}

export function bounceBumpers(
  ball: PongState["ball"],
  bumpers: PongBumper[],
  dt: number,
) {
  let { x, y, vx, vy } = ball;
  let remaining = dt;
  // Swept circles catch glancing hits as well as head-on hits. The fixed host
  // step is much shorter than the distance between any two bumpers.
  for (let bounce = 0; bounce < 4 && remaining > 0; bounce++) {
    const dx = vx * remaining;
    const dy = vy * PONG_ASPECT * remaining;
    const lengthSquared = dx * dx + dy * dy;
    let first = 2;
    let hit = -1;
    for (const [i, b] of bumpers.entries()) {
      if (b.warning > 0 || lengthSquared === 0) continue;
      const ox = x - b.x;
      const oy = (y - b.y) * PONG_ASPECT;
      const toward = ox * dx + oy * dy;
      if (toward >= 0) continue;
      const c = ox * ox + oy * oy - contactRadius * contactRadius;
      const discriminant = toward * toward - lengthSquared * c;
      if (discriminant < 0) continue;
      const t =
        c <= 0 ? 0 : (-toward - Math.sqrt(discriminant)) / lengthSquared;
      if (t >= 0 && t <= 1 && t < first) {
        first = t;
        hit = i;
      }
    }
    if (hit < 0) {
      x += dx;
      y += dy / PONG_ASPECT;
      break;
    }
    x += dx * first;
    y += (dy * first) / PONG_ASPECT;
    const b = bumpers[hit];
    const length = distance({ x, y }, b);
    const nx = length > 0 ? (x - b.x) / length : -1;
    const ny = length > 0 ? ((y - b.y) * PONG_ASPECT) / length : 0;
    const dot = vx * nx + vy * PONG_ASPECT * ny;
    vx -= 2 * dot * nx;
    vy -= (2 * dot * ny) / PONG_ASPECT;
    x = b.x + nx * (contactRadius + 0.00001);
    y = b.y + (ny * (contactRadius + 0.00001)) / PONG_ASPECT;
    bumpers[hit] = { ...b, flash: 0.24, hits: Math.min(1_000_000, b.hits + 1) };
    remaining *= 1 - first;
  }
  return { x, y, vx, vy };
}
