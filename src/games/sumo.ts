export const SUMO_HZ = 120;
export const SUMO_COUNTDOWN = 3 * SUMO_HZ;
export const SUMO_LIMIT = 60 * SUMO_HZ;
export const SUMO_BODY = 0.035;
export const SUMO_LEASE = 45;
export const SUMO_COOLDOWN = 2 * SUMO_HZ;
export interface Bumper {
  id: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  dx: number;
  dy: number;
  inputFor: number;
  cooldown: number;
  alive: boolean;
}
export interface SumoState {
  phase: "ready" | "countdown" | "playing" | "paused" | "finished";
  bumpers: Bumper[];
  ticks: number;
  countdown: number;
}
export const sumoRadius = (ticks: number) =>
  0.44 - 0.24 * Math.min(1, Math.max(0, ticks / SUMO_LIMIT));
export function newSumo(ids: string[] = []): SumoState {
  return {
    phase: ids.length ? "countdown" : "ready",
    ticks: 0,
    countdown: SUMO_COUNTDOWN,
    bumpers: ids.map((id, i) => {
      const angle = Math.PI + (i * Math.PI * 2) / ids.length;
      return {
        id,
        x: 0.5 + Math.cos(angle) * 0.25,
        y: 0.5 + Math.sin(angle) * 0.25,
        vx: 0,
        vy: 0,
        dx: 0,
        dy: 0,
        inputFor: 0,
        cooldown: 0,
        alive: true,
      };
    }),
  };
}
export function moveSumo(
  state: SumoState,
  id: string,
  x: number,
  y: number,
): SumoState {
  if (
    state.phase !== "playing" ||
    !Number.isFinite(x) ||
    !Number.isFinite(y) ||
    Math.abs(x) > 1 ||
    Math.abs(y) > 1
  )
    return state;
  const length = Math.max(1, Math.hypot(x, y));
  return {
    ...state,
    bumpers: state.bumpers.map((b) =>
      b.id === id && b.alive
        ? {
            ...b,
            dx: x / length,
            dy: y / length,
            inputFor: x || y ? SUMO_LEASE : 0,
          }
        : b,
    ),
  };
}
export function dashSumo(state: SumoState, id: string): SumoState {
  if (state.phase !== "playing") return state;
  return {
    ...state,
    bumpers: state.bumpers.map((b) => {
      const length = Math.hypot(b.dx, b.dy);
      if (b.id !== id || !b.alive || b.cooldown || !b.inputFor || length < 0.1)
        return b;
      const vx = b.vx + (b.dx / length) * 0.65,
        vy = b.vy + (b.dy / length) * 0.65;
      const speed = Math.max(1, Math.hypot(vx, vy));
      return { ...b, vx: vx / speed, vy: vy / speed, cooldown: SUMO_COOLDOWN };
    }),
  };
}
export function stopSumo(state: SumoState): SumoState {
  return {
    ...state,
    bumpers: state.bumpers.map((b) => ({
      ...b,
      dx: 0,
      dy: 0,
      inputFor: 0,
      vx: 0,
      vy: 0,
    })),
  };
}
// The host calls this at 120 Hz. Contacts share equal mass, conserve momentum
// along the contact normal and separate overlaps before checking ring-outs.
export function stepSumo(state: SumoState): SumoState {
  if (state.phase === "countdown") {
    const countdown = state.countdown - 1;
    return { ...state, countdown, phase: countdown ? "countdown" : "playing" };
  }
  if (state.phase !== "playing") return state;
  const dt = 1 / SUMO_HZ;
  const bumpers = state.bumpers.map((b) => {
    if (!b.alive) return { ...b };
    const inputFor = Math.max(0, b.inputFor - 1);
    const dx = inputFor ? b.dx : 0,
      dy = inputFor ? b.dy : 0;
    let vx = (b.vx + dx * 1.5 * dt) * Math.exp(-4.5 * dt);
    let vy = (b.vy + dy * 1.5 * dt) * Math.exp(-4.5 * dt);
    const speed = Math.max(1, Math.hypot(vx, vy));
    vx /= speed;
    vy /= speed;
    return {
      ...b,
      dx,
      dy,
      inputFor,
      cooldown: Math.max(0, b.cooldown - 1),
      vx,
      vy,
      x: b.x + vx * dt,
      y: b.y + vy * dt,
    };
  });
  // A few contact passes handle packed groups without persistent overlaps.
  for (let pass = 0; pass < 3; pass++) {
    for (let i = 0; i < bumpers.length; i++) {
      for (let j = i + 1; j < bumpers.length; j++) {
        const a = bumpers[i],
          b = bumpers[j];
        if (!a.alive || !b.alive) continue;
        const x = b.x - a.x,
          y = b.y - a.y;
        const length = Math.hypot(x, y);
        if (length >= SUMO_BODY * 2) continue;
        const nx = length > 1e-9 ? x / length : 1,
          ny = length > 1e-9 ? y / length : 0;
        const overlap = (SUMO_BODY * 2 - length) / 2;
        a.x -= nx * overlap;
        a.y -= ny * overlap;
        b.x += nx * overlap;
        b.y += ny * overlap;
        const approaching = (a.vx - b.vx) * nx + (a.vy - b.vy) * ny;
        if (approaching > 0) {
          const impulse = approaching * 0.95;
          a.vx -= impulse * nx;
          a.vy -= impulse * ny;
          b.vx += impulse * nx;
          b.vy += impulse * ny;
        }
      }
    }
  }
  const ticks = state.ticks + 1;
  const radius = sumoRadius(ticks);
  for (const b of bumpers) {
    // The bumper's center crossing the marked edge is a ring-out.
    if (b.alive && Math.hypot(b.x - 0.5, b.y - 0.5) > radius) {
      b.alive = false;
      b.dx = b.dy = b.vx = b.vy = b.inputFor = 0;
    }
    const speed = Math.max(1, Math.hypot(b.vx, b.vy));
    b.vx /= speed;
    b.vy /= speed;
    b.x = Math.max(0, Math.min(1, b.x));
    b.y = Math.max(0, Math.min(1, b.y));
  }
  return {
    ...state,
    bumpers,
    ticks,
    phase:
      bumpers.filter((b) => b.alive).length <= 1 || ticks === SUMO_LIMIT
        ? "finished"
        : "playing",
  };
}
