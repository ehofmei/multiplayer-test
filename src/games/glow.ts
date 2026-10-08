export const glowColors = [
  { name: "Red", hex: "#ff1744" },
  { name: "Orange", hex: "#ff7a00" },
  { name: "Amber", hex: "#ffbf00" },
  { name: "Yellow", hex: "#f4ff00" },
  { name: "Lime", hex: "#8cff00" },
  { name: "Green", hex: "#00ff66" },
  { name: "Teal", hex: "#00ffd5" },
  { name: "Cyan", hex: "#00cfff" },
  { name: "Blue", hex: "#2864ff" },
  { name: "Violet", hex: "#8f3fff" },
  { name: "Magenta", hex: "#f000ff" },
  { name: "Pink", hex: "#ff0096" },
] as const;
export type GlowRounds = 5 | 8 | 12;
export type GlowAction =
  | { kind: "glow-color"; color: number }
  | { kind: "glow-picks"; round: number; picks: number[] };
type ActivePhase = "countdown" | "choosing" | "settling" | "reveal";
export interface GlowSeat {
  id: string;
  color: number;
  locked: boolean;
  picks: number[] | null;
  scores: number[];
}
export interface GlowState {
  phase: "ready" | ActivePhase | "paused" | "reorient" | "finished";
  rounds: GlowRounds;
  round: number;
  remaining: number;
  resumePhase: ActivePhase | null;
  resumeRemaining: number;
  seats: GlowSeat[];
}
export const glowInt = (v: unknown, min: number, max: number): v is number =>
  typeof v === "number" && Number.isInteger(v) && v >= min && v <= max;
export const validGlowRounds = (v: unknown): v is GlowRounds =>
  v === 5 || v === 8 || v === 12;
export const validGlowPicks = (v: unknown, cells = 32): v is number[] =>
  Array.isArray(v) &&
  v.length === 3 &&
  new Set(v).size === 3 &&
  v.every((c) => glowInt(c, 0, cells - 1));
export const glowTotal = (seat: GlowSeat) =>
  seat.scores.reduce((a, b) => a + b, 0);
export function newGlow(rounds: GlowRounds = 8): GlowState {
  return {
    phase: "ready",
    rounds,
    round: 0,
    remaining: 0,
    resumePhase: null,
    resumeRemaining: 0,
    seats: [],
  };
}
// Retain surviving assignments. Only new arrivals draw a random unused color.
export function glowRoster(
  state: GlowState,
  ids: string[],
  random = Math.random,
): GlowState {
  if (
    state.phase !== "ready" ||
    ids.length > 8 ||
    new Set(ids).size !== ids.length
  )
    return state;
  const seats = state.seats.filter((s) => ids.includes(s.id));
  for (const id of ids)
    if (!seats.some((s) => s.id === id)) {
      const free = glowColors
        .map((_, i) => i)
        .filter((c) => !seats.some((s) => s.color === c));
      const color =
        free[
          Math.min(
            free.length - 1,
            Math.max(0, Math.floor(random() * free.length)),
          )
        ];
      seats.push({ id, color, locked: false, picks: null, scores: [] });
    }
  return { ...state, seats: ids.map((id) => seats.find((s) => s.id === id)!) };
}
export function setupGlow(
  state: GlowState,
  ids: string[],
  random = Math.random,
): GlowState {
  return glowRoster(
    {
      ...newGlow(state.rounds),
      seats: state.seats.map((s) => ({
        ...s,
        locked: false,
        picks: null,
        scores: [],
      })),
    },
    ids,
    random,
  );
}
export function claimGlowColor(
  state: GlowState,
  id: string,
  color: number,
): GlowState {
  if (
    state.phase !== "ready" ||
    !glowInt(color, 0, 11) ||
    !state.seats.some((s) => s.id === id) ||
    state.seats.some((s) => s.color === color)
  )
    return state;
  return {
    ...state,
    seats: state.seats.map((s) => (s.id === id ? { ...s, color } : s)),
  };
}
export function startGlow(state: GlowState): GlowState {
  if (
    state.phase !== "ready" ||
    state.seats.length < 3 ||
    state.seats.length > 8 ||
    new Set(state.seats.map((s) => s.color)).size !== state.seats.length ||
    !state.seats.every((s) => glowInt(s.color, 0, 11)) ||
    !validGlowRounds(state.rounds)
  )
    return state;
  return { ...state, phase: "countdown", round: 1, remaining: 3000 };
}
export function glowOwners(state: GlowState, cell: number): GlowSeat[] {
  return state.seats.filter((s) => s.picks?.includes(cell));
}
export function commitGlow(
  state: GlowState,
  id: string,
  round: number,
  picks: number[],
): GlowState {
  if (
    state.phase !== "choosing" ||
    round !== state.round ||
    !validGlowPicks(picks, state.seats.length * 4) ||
    !state.seats.some((s) => s.id === id && !s.locked)
  )
    return state;
  const seats = state.seats.map((s) =>
    s.id === id
      ? { ...s, locked: true, picks: [...picks].sort((a, b) => a - b) }
      : s,
  );
  if (!seats.every((s) => s.locked)) return { ...state, seats };
  return { ...state, phase: "settling", remaining: 1500, seats };
}
// Resolve only after the shared settling period; scores cannot leak early.
function revealGlow(state: GlowState): GlowState {
  return {
    ...state,
    phase: "reveal",
    remaining: 6000,
    seats: state.seats.map((s) => ({
      ...s,
      scores: [
        ...s.scores,
        s.picks!.filter((c) => glowOwners(state, c).length === 1).length,
      ],
    })),
  };
}
export function stepGlow(state: GlowState, ms: number): GlowState {
  if (
    !["countdown", "reorient", "settling", "reveal"].includes(state.phase) ||
    !Number.isFinite(ms) ||
    ms <= 0
  )
    return state;
  const remaining = Math.max(0, state.remaining - Math.floor(ms));
  if (remaining) return { ...state, remaining };
  if (state.phase === "reorient")
    return stepGlow(
      {
        ...state,
        phase: state.resumePhase!,
        remaining: state.resumeRemaining,
        resumePhase: null,
        resumeRemaining: 0,
      },
      Math.max(0, ms - state.remaining),
    );
  if (state.phase === "countdown")
    return { ...state, phase: "choosing", remaining: 0 };
  if (state.phase === "settling")
    return stepGlow(revealGlow(state), Math.max(0, ms - state.remaining));
  if (state.round === state.rounds)
    return { ...state, phase: "finished", remaining: 0 };
  return {
    ...state,
    phase: "choosing",
    round: state.round + 1,
    remaining: 0,
    seats: state.seats.map((s) => ({ ...s, locked: false, picks: null })),
  };
}
export function pauseGlow(state: GlowState): GlowState {
  if (["ready", "paused", "finished"].includes(state.phase)) return state;
  return {
    ...state,
    phase: "paused",
    resumePhase:
      state.phase === "reorient"
        ? state.resumePhase
        : (state.phase as ActivePhase),
    resumeRemaining:
      state.phase === "reorient" ? state.resumeRemaining : state.remaining,
    remaining:
      state.phase === "reorient" ? state.resumeRemaining : state.remaining,
  };
}
export function resumeGlow(state: GlowState): GlowState {
  return state.phase === "paused"
    ? { ...state, phase: "reorient", remaining: 3000 }
    : state;
}
export function glowView(state: GlowState, viewer: string): GlowState {
  const phase = state.resumePhase ?? state.phase;
  const revealed = phase === "reveal" || phase === "finished";
  return {
    ...state,
    seats: state.seats.map((s) => ({
      ...s,
      scores: [...s.scores],
      picks: revealed || s.id === viewer ? s.picks && [...s.picks] : null,
    })),
  };
}
