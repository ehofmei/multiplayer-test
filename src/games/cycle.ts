export const CYCLE_SIZE = 32;
export const CYCLE_STEP_MS = 150;
export const CYCLE_COUNTDOWN = 20;
export const CYCLE_LIMIT = 400;
export const cycleDirections = ["up", "right", "down", "left"] as const;
export type CycleDirection = (typeof cycleDirections)[number];
export const cycleColors = [
  "#c9ee87",
  "#82d9ff",
  "#ffbd80",
  "#e3a9ff",
  "#ff91a8",
  "#70e5c6",
  "#ffe477",
  "#c5caff",
];
export interface CycleRider {
  id: string;
  x: number;
  y: number;
  direction: CycleDirection;
  queued: CycleDirection | null;
  alive: boolean;
}
export interface CycleState {
  phase: "ready" | "countdown" | "playing" | "paused" | "finished";
  riders: CycleRider[];
  // One character per cell: 0 is empty, 1–8 identify the trail owner.
  cells: string;
  countdown: number;
  ticks: number;
}
const spawns: [number, number, CycleDirection][] = [
  [4, 8, "right"],
  [27, 23, "left"],
  [23, 4, "down"],
  [8, 27, "up"],
  [4, 23, "right"],
  [27, 8, "left"],
  [8, 4, "down"],
  [23, 27, "up"],
];
export function newCycle(ids: string[] = []): CycleState {
  const cells = Array<string>(CYCLE_SIZE * CYCLE_SIZE).fill("0");
  const riders = ids.map((id, i): CycleRider => {
    const [x, y, direction] = spawns[i];
    cells[y * CYCLE_SIZE + x] = String(i + 1);
    return { id, x, y, direction, queued: null, alive: true };
  });
  return {
    phase: ids.length ? "countdown" : "ready",
    riders,
    cells: cells.join(""),
    countdown: CYCLE_COUNTDOWN,
    ticks: 0,
  };
}
export function turnCycle(
  state: CycleState,
  id: string,
  direction: CycleDirection,
): CycleState {
  const rider = state.riders.find((r) => r.id === id);
  if (
    state.phase !== "playing" ||
    !rider?.alive ||
    rider.queued ||
    !cycleDirections.includes(direction) ||
    cycleDirections.indexOf(direction) % 2 ===
      cycleDirections.indexOf(rider.direction) % 2
  )
    return state;
  return {
    ...state,
    riders: state.riders.map((r) =>
      r === rider ? { ...r, queued: direction } : r,
    ),
  };
}
export function stepCycle(state: CycleState): CycleState {
  if (state.phase === "countdown") {
    const countdown = state.countdown - 1;
    return {
      ...state,
      countdown,
      phase: countdown === 0 ? "playing" : "countdown",
    };
  }
  if (state.phase !== "playing") return state;
  const moves = state.riders.map((r) => {
    const direction = r.queued ?? r.direction;
    const dx = direction === "left" ? -1 : direction === "right" ? 1 : 0;
    const dy = direction === "up" ? -1 : direction === "down" ? 1 : 0;
    return { ...r, direction, queued: null, x: r.x + dx, y: r.y + dy };
  });
  const cells = state.cells.split("");
  // Decide all collisions against the same board before adding any new trails.
  const riders = moves.map((r, i) => {
    if (!r.alive) return state.riders[i];
    const crash =
      r.x < 0 ||
      r.x >= CYCLE_SIZE ||
      r.y < 0 ||
      r.y >= CYCLE_SIZE ||
      state.cells[r.y * CYCLE_SIZE + r.x] !== "0" ||
      moves.some(
        (other, j) =>
          j !== i && other.alive && other.x === r.x && other.y === r.y,
      );
    return crash
      ? {
          ...state.riders[i],
          direction: r.direction,
          queued: null,
          alive: false,
        }
      : r;
  });
  riders.forEach((r, i) => {
    if (r.alive) cells[r.y * CYCLE_SIZE + r.x] = String(i + 1);
  });
  const ticks = state.ticks + 1;
  return {
    ...state,
    riders,
    cells: cells.join(""),
    ticks,
    phase:
      riders.filter((r) => r.alive).length <= 1 || ticks >= CYCLE_LIMIT
        ? "finished"
        : "playing",
  };
}
