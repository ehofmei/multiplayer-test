export const GOLF_TIMES = {
  countdown: 3000,
  preview: 4000,
  aiming: 20000,
  rolling: 10000,
  results: 3000,
  reorient: 3000,
};
export const GOLF_STEP = 1 / 120;
export const GOLF_MATCH_MS = 188000;
export const courses = [
  {
    name: "Open green",
    tee: [200, 350],
    cup: [750, 350],
    walls: [],
    mushrooms: [],
    meteor: null,
  },
  {
    name: "Bank shot",
    tee: [250, 500],
    cup: [700, 200],
    walls: [[450, 180, 40, 320]],
    mushrooms: [],
    meteor: null,
  },
  {
    name: "Mushrooms",
    tee: [200, 350],
    cup: [750, 350],
    walls: [],
    mushrooms: [
      [450, 350],
      [600, 250],
    ],
    meteor: null,
  },
  {
    name: "Meteor",
    tee: [200, 500],
    cup: [700, 200],
    walls: [],
    mushrooms: [],
    meteor: [500, 320],
  },
  {
    name: "Mixed course",
    tee: [200, 500],
    cup: [700, 200],
    walls: [[440, 260, 40, 180]],
    mushrooms: [[600, 380]],
    meteor: [530, 210],
  },
] as const;
export type GolfPhase =
  "countdown" | "preview" | "aiming" | "rolling" | "results";
export interface GolfShot {
  angle: number;
  power: number;
}
export interface GolfBall {
  id: string;
  scores: number[];
  locked: boolean;
  shot: GolfShot | null;
  x: number;
  y: number;
  vx: number;
  vy: number;
  captured: boolean;
  skipped: boolean;
  cooldowns: number[];
}
export interface GolfState {
  phase: "ready" | GolfPhase | "paused" | "reorient" | "finished";
  hole: number;
  remaining: number;
  resumePhase: GolfPhase | null;
  resumeRemaining: number;
  wind: number;
  // Only revealed at launch; the host keeps the same schedule through pauses.
  conditions: { strength: number; impact: number | null } | null;
  ticks: number;
  impacted: boolean;
  balls: GolfBall[];
}
export const golfTotal = (ball: GolfBall) =>
  ball.scores.reduce((a, b) => a + b, 0);
export const validShot = (angle: unknown, power: unknown): boolean =>
  typeof angle === "number" &&
  Number.isFinite(angle) &&
  angle >= 0 &&
  angle < 360 &&
  typeof power === "number" &&
  Number.isFinite(power) &&
  power >= 0 &&
  power <= 1;
function environment(hole: number, random: () => number) {
  return {
    wind: Math.floor(random() * 4),
    conditions: {
      strength: Math.floor(random() * 3) * 12,
      impact: courses[hole - 1].meteor ? 4 + random() * 1.5 : null,
    },
  };
}
function resetBalls(
  balls: Pick<GolfBall, "id" | "scores">[],
  hole: number,
): GolfBall[] {
  const c = courses[hole - 1];
  return balls.map((b) => ({
    ...b,
    locked: false,
    shot: null,
    x: c.tee[0],
    y: c.tee[1],
    vx: 0,
    vy: 0,
    captured: false,
    skipped: false,
    cooldowns: c.mushrooms.map(() => 0),
  }));
}
export function newGolf(ids: string[] = [], random = Math.random): GolfState {
  return {
    phase: ids.length ? "countdown" : "ready",
    hole: ids.length ? 1 : 0,
    remaining: ids.length ? GOLF_TIMES.countdown : 0,
    resumePhase: null,
    resumeRemaining: 0,
    ...(ids.length ? environment(1, random) : { wind: 0, conditions: null }),
    ticks: 0,
    impacted: false,
    balls: resetBalls(
      ids.map((id) => ({ id, scores: [0, 0, 0, 0, 0] })),
      1,
    ),
  };
}
export function commitGolf(
  state: GolfState,
  id: string,
  hole: number,
  angle: number,
  power: number,
): GolfState {
  const ball = state.balls.find((b) => b.id === id);
  if (
    state.phase !== "aiming" ||
    state.hole !== hole ||
    !ball ||
    ball.locked ||
    !validShot(angle, power)
  )
    return state;
  return {
    ...state,
    balls: state.balls.map((b) =>
      b.id === id ? { ...b, locked: true, shot: { angle, power } } : b,
    ),
  };
}
// Bounce only the inward normal component; tangential velocity stays unchanged.
export function bounce(ball: GolfBall, nx: number, ny: number): void {
  const normal = ball.vx * nx + ball.vy * ny;
  if (normal < 0) {
    ball.vx -= 1.75 * normal * nx;
    ball.vy -= 1.75 * normal * ny;
  }
}
export function physicsGolf(state: GolfState): GolfState {
  if (state.phase !== "rolling" || !state.conditions || state.ticks >= 1200)
    return state;
  const course = courses[state.hole - 1];
  const ticks = state.ticks + 1;
  const impact =
    !state.impacted &&
    state.conditions.impact !== null &&
    ticks / 120 >= state.conditions.impact;
  const windX = [1, 0, -1, 0][state.wind] * state.conditions.strength;
  const windY = [0, 1, 0, -1][state.wind] * state.conditions.strength;
  const balls = state.balls.map((source) => {
    if (source.captured || source.skipped) return source;
    const b = { ...source, cooldowns: [...source.cooldowns] };
    if (impact && course.meteor) {
      const dx = b.x - course.meteor[0],
        dy = b.y - course.meteor[1],
        distance = Math.hypot(dx, dy);
      if (distance <= 90) {
        b.vx += distance ? (dx / distance) * 120 : 0;
        b.vy += distance ? (dy / distance) * 120 : -120;
      }
    }
    const friction = Math.exp(-1.25 * GOLF_STEP);
    b.vx = (b.vx + windX * GOLF_STEP) * friction;
    b.vy = (b.vy + windY * GOLF_STEP) * friction;
    b.x += b.vx * GOLF_STEP;
    b.y += b.vy * GOLF_STEP;
    if (b.x < 10) {
      b.x = 10;
      bounce(b, 1, 0);
    }
    if (b.x > 990) {
      b.x = 990;
      bounce(b, -1, 0);
    }
    if (b.y < 10) {
      b.y = 10;
      bounce(b, 0, 1);
    }
    if (b.y > 690) {
      b.y = 690;
      bounce(b, 0, -1);
    }
    for (const [x, y, w, h] of course.walls) {
      const dx = b.x - Math.max(x, Math.min(x + w, b.x));
      const dy = b.y - Math.max(y, Math.min(y + h, b.y));
      const distance = Math.hypot(dx, dy);
      if (distance >= 10) continue;
      if (distance > 0) {
        b.x += (dx / distance) * (10 - distance);
        b.y += (dy / distance) * (10 - distance);
        bounce(b, dx / distance, dy / distance);
      } else {
        const sides = [b.x - x, x + w - b.x, b.y - y, y + h - b.y];
        const side = sides.indexOf(Math.min(...sides));
        const nx = [-1, 1, 0, 0][side],
          ny = [0, 0, -1, 1][side];
        b.x += nx * (sides[side] + 10);
        b.y += ny * (sides[side] + 10);
        bounce(b, nx, ny);
      }
    }
    course.mushrooms.forEach(([x, y], i) => {
      const dx = b.x - x,
        dy = b.y - y,
        distance = Math.hypot(dx, dy);
      if (distance >= 40) return;
      const nx = distance ? dx / distance : 0,
        ny = distance ? dy / distance : -1;
      b.x = x + nx * 40;
      b.y = y + ny * 40;
      bounce(b, nx, ny);
      if (ticks >= b.cooldowns[i]) {
        b.vx += nx * 160;
        b.vy += ny * 160;
        b.cooldowns[i] = ticks + 48;
      }
    });
    if (
      Math.hypot(b.x - course.cup[0], b.y - course.cup[1]) <= 24 &&
      Math.hypot(b.vx, b.vy) <= 170
    ) {
      b.x = course.cup[0];
      b.y = course.cup[1];
      b.vx = 0;
      b.vy = 0;
      b.captured = true;
    }
    return b;
  });
  return { ...state, ticks, impacted: state.impacted || impact, balls };
}
export function scoreGolf(ball: GolfBall, hole: number): number {
  const cup = courses[hole - 1].cup;
  return ball.skipped
    ? 0
    : ball.captured
      ? 100
      : Math.max(
          0,
          70 - Math.floor(Math.hypot(ball.x - cup[0], ball.y - cup[1]) / 8),
        );
}
function phase(state: GolfState, next: GolfPhase | "reorient"): GolfState {
  return { ...state, phase: next, remaining: GOLF_TIMES[next] };
}
function advance(state: GolfState, random: () => number): GolfState {
  switch (state.phase) {
    case "countdown":
      return phase(state, "preview");
    case "preview":
      return phase(state, "aiming");
    case "aiming":
      return {
        ...phase(state, "rolling"),
        balls: state.balls.map((b) => {
          const speed = b.shot ? 100 + 1000 * b.shot.power : 0;
          const angle = ((b.shot?.angle ?? 0) * Math.PI) / 180;
          return {
            ...b,
            skipped: !b.shot,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed,
          };
        }),
      };
    case "rolling":
      return {
        ...phase(state, "results"),
        balls: state.balls.map((b) => ({
          ...b,
          vx: 0,
          vy: 0,
          scores: b.scores.map((n, i) =>
            i === state.hole - 1 ? scoreGolf(b, state.hole) : n,
          ),
        })),
      };
    case "results":
      return state.hole === 5
        ? { ...state, phase: "finished", remaining: 0 }
        : {
            ...phase(state, "preview"),
            hole: state.hole + 1,
            ...environment(state.hole + 1, random),
            ticks: 0,
            impacted: false,
            balls: resetBalls(state.balls, state.hole + 1),
          };
    case "reorient":
      return {
        ...state,
        phase: state.resumePhase!,
        remaining: state.resumeRemaining,
        resumePhase: null,
        resumeRemaining: 0,
      };
    default:
      return state;
  }
}
export function stepGolf(
  state: GolfState,
  elapsed: number,
  random = Math.random,
): GolfState {
  if (
    ["ready", "paused", "finished"].includes(state.phase) ||
    !Number.isFinite(elapsed) ||
    elapsed <= 0
  )
    return state;
  let left = Math.floor(elapsed),
    next = state;
  while (left > 0) {
    const used = Math.min(left, next.remaining);
    next = { ...next, remaining: next.remaining - used };
    if (next.phase === "rolling") {
      const target = Math.min(
        1200,
        Math.floor(((GOLF_TIMES.rolling - next.remaining) * 120) / 1000),
      );
      while (next.ticks < target) next = physicsGolf(next);
    }
    left -= used;
    if (next.remaining === 0) next = advance(next, random);
    if (next.phase === "finished") break;
  }
  return next;
}
export function pauseGolf(state: GolfState): GolfState {
  if (["ready", "paused", "finished"].includes(state.phase)) return state;
  return state.phase === "reorient"
    ? { ...state, phase: "paused", remaining: state.resumeRemaining }
    : {
        ...state,
        phase: "paused",
        resumePhase: state.phase as GolfPhase,
        resumeRemaining: state.remaining,
      };
}
export function resumeGolf(state: GolfState): GolfState {
  return state.phase === "paused" ? phase(state, "reorient") : state;
}
export function golfView(state: GolfState): GolfState {
  const effective =
    state.phase === "paused" || state.phase === "reorient"
      ? state.resumePhase
      : state.phase;
  const revealed = ["rolling", "results", "finished"].includes(effective ?? "");
  return {
    ...state,
    conditions: revealed ? state.conditions && { ...state.conditions } : null,
    balls: state.balls.map((b) => ({
      ...b,
      scores: [...b.scores],
      cooldowns: [...b.cooldowns],
      shot: revealed && b.shot ? { ...b.shot } : null,
    })),
  };
}
