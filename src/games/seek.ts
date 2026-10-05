export const seekPieces = [
  {
    name: "Three-line",
    symbol: "━",
    color: "#67d8ef",
    cells: [
      [0, 0],
      [1, 0],
      [2, 0],
    ],
  },
  {
    name: "Three-corner",
    symbol: "┗",
    color: "#ffb866",
    cells: [
      [0, 0],
      [0, 1],
      [1, 1],
    ],
  },
  {
    name: "Four-line",
    symbol: "┃",
    color: "#c7a0ff",
    cells: [
      [0, 0],
      [1, 0],
      [2, 0],
      [3, 0],
    ],
  },
  {
    name: "Four-square",
    symbol: "▣",
    color: "#ff8bac",
    cells: [
      [0, 0],
      [1, 0],
      [0, 1],
      [1, 1],
    ],
  },
  {
    name: "Five-plus",
    symbol: "✚",
    color: "#99e181",
    cells: [
      [1, 0],
      [0, 1],
      [1, 1],
      [2, 1],
      [1, 2],
    ],
  },
] as const;
export interface SeekPlacement {
  piece: number;
  x: number;
  y: number;
  rotation: number;
}
export type SeekAction =
  | { kind: "seek-ready"; layout: SeekPlacement[] }
  | { kind: "seek-guess"; turn: number; cell: number };
type ActivePhase = "setup" | "countdown" | "playing";
export interface SeekSeat {
  id: string;
  ready: boolean;
  layout: SeekPlacement[] | null;
  // Incoming guesses: 0 = unsearched, 1 = miss, 2 = hit. No hidden identities.
  search: string;
  found: SeekPlacement[];
}
export interface SeekState {
  phase: "ready" | ActivePhase | "paused" | "reorient" | "finished";
  seats: SeekSeat[];
  current: string | null;
  turn: number;
  remaining: number;
  resumePhase: ActivePhase | null;
  resumeRemaining: number;
  winner: string | null;
  last: {
    event: number;
    player: string;
    cell: number;
    result: "miss" | "hit" | "found";
    piece: number | null;
  } | null;
}
export const seekInteger = (
  v: unknown,
  min: number,
  max: number,
): v is number =>
  typeof v === "number" && Number.isInteger(v) && v >= min && v <= max;
export function validSeekPlacement(v: unknown): v is SeekPlacement {
  if (typeof v !== "object" || !v || Array.isArray(v)) return false;
  const p = v as SeekPlacement;
  return (
    Object.keys(p).length === 4 &&
    seekInteger(p.piece, 0, 4) &&
    seekInteger(p.x, 0, 9) &&
    seekInteger(p.y, 0, 9) &&
    seekInteger(p.rotation, 0, 3)
  );
}
export function seekCells(piece: number, rotation: number): number[][] {
  let cells: number[][] = seekPieces[piece].cells.map(([x, y]) => [x, y]);
  for (let r = 0; r < rotation; r++) cells = cells.map(([x, y]) => [-y, x]);
  const minX = Math.min(...cells.map(([x]) => x)),
    minY = Math.min(...cells.map(([, y]) => y));
  return cells.map(([x, y]) => [x - minX, y - minY]);
}
export function placedSeekCells(p: SeekPlacement): number[] {
  return seekCells(p.piece, p.rotation).map(
    ([x, y]) => (y + p.y) * 10 + x + p.x,
  );
}
export function fitsSeek(layout: SeekPlacement[], p: SeekPlacement): boolean {
  if (!validSeekPlacement(p)) return false;
  const occupied = new Set(
    layout.filter((q) => q.piece !== p.piece).flatMap(placedSeekCells),
  );
  return seekCells(p.piece, p.rotation).every(
    ([x, y]) =>
      x + p.x < 10 && y + p.y < 10 && !occupied.has((y + p.y) * 10 + x + p.x),
  );
}
export function validSeekLayout(v: unknown): v is SeekPlacement[] {
  return (
    Array.isArray(v) &&
    v.length === 5 &&
    v.every(validSeekPlacement) &&
    new Set(v.map((p) => p.piece)).size === 5 &&
    v.every((p) => fitsSeek(v, p))
  );
}
export function newSeek(ids: string[] = [], random = Math.random): SeekState {
  const started = ids.length === 2;
  return {
    phase: started ? "setup" : "ready",
    seats: started
      ? ids.map((id) => ({
          id,
          ready: false,
          layout: null,
          search: "0".repeat(100),
          found: [],
        }))
      : [],
    current: started
      ? ids[Math.min(1, Math.max(0, Math.floor(random() * 2)))]
      : null,
    turn: started ? 1 : 0,
    remaining: 0,
    resumePhase: null,
    resumeRemaining: 0,
    winner: null,
    last: null,
  };
}
export function readySeek(
  state: SeekState,
  id: string,
  layout: SeekPlacement[],
): SeekState {
  const seat = state.seats.find((s) => s.id === id);
  if (
    state.phase !== "setup" ||
    !seat ||
    seat.ready ||
    !validSeekLayout(layout)
  )
    return state;
  const seats = state.seats.map((s) =>
    s.id === id
      ? { ...s, ready: true, layout: layout.map((p) => ({ ...p })) }
      : s,
  );
  return {
    ...state,
    seats,
    phase: seats.every((s) => s.ready) ? "countdown" : "setup",
    remaining: seats.every((s) => s.ready) ? 3000 : 0,
  };
}
export function guessSeek(
  state: SeekState,
  id: string,
  turn: number,
  cell: number,
): SeekState {
  const target = state.seats.find((s) => s.id !== id);
  if (
    state.phase !== "playing" ||
    state.current !== id ||
    state.turn !== turn ||
    !seekInteger(cell, 0, 99) ||
    !target?.layout ||
    target.search[cell] !== "0"
  )
    return state;
  const piece = target.layout.find((p) => placedSeekCells(p).includes(cell));
  const search =
    target.search.slice(0, cell) +
    (piece ? "2" : "1") +
    target.search.slice(cell + 1);
  const found =
    !!piece && placedSeekCells(piece).every((c) => search[c] === "2");
  const discoveries = found ? [...target.found, { ...piece }] : target.found;
  const won = discoveries.length === 5;
  return {
    ...state,
    phase: won ? "finished" : "playing",
    winner: won ? id : null,
    current: won ? null : target.id,
    turn: state.turn + 1,
    seats: state.seats.map((s) =>
      s.id === target.id ? { ...s, search, found: discoveries } : s,
    ),
    last: {
      event: turn,
      player: id,
      cell,
      result: found ? "found" : piece ? "hit" : "miss",
      piece: found ? piece!.piece : null,
    },
  };
}
export function stepSeek(state: SeekState, elapsed: number): SeekState {
  if (
    !["countdown", "reorient"].includes(state.phase) ||
    !Number.isFinite(elapsed) ||
    elapsed <= 0
  )
    return state;
  if (elapsed < state.remaining)
    return { ...state, remaining: state.remaining - Math.floor(elapsed) };
  return state.phase === "countdown"
    ? { ...state, phase: "playing", remaining: 0 }
    : {
        ...state,
        phase: state.resumePhase!,
        remaining: state.resumeRemaining,
        resumePhase: null,
        resumeRemaining: 0,
      };
}
export function pauseSeek(state: SeekState): SeekState {
  if (["ready", "paused", "finished"].includes(state.phase)) return state;
  return state.phase === "reorient"
    ? { ...state, phase: "paused", remaining: state.resumeRemaining }
    : {
        ...state,
        phase: "paused",
        resumePhase: state.phase as ActivePhase,
        resumeRemaining: state.remaining,
      };
}
export function resumeSeek(state: SeekState): SeekState {
  return state.phase === "paused"
    ? { ...state, phase: "reorient", remaining: 3000 }
    : state;
}
export function seekView(state: SeekState, viewer: string): SeekState {
  return {
    ...state,
    // The first-player draw is private until both layouts are locked.
    current:
      state.phase === "setup" || state.resumePhase === "setup"
        ? null
        : state.current,
    seats: state.seats.map((s) => ({
      ...s,
      layout:
        s.id === viewer || state.phase === "finished"
          ? (s.layout?.map((p) => ({ ...p })) ?? null)
          : null,
      found: s.found.map((p) => ({ ...p })),
    })),
    last: state.last ? { ...state.last } : null,
  };
}
export const seekCoordinate = (cell: number) =>
  `${String.fromCharCode(65 + Math.floor(cell / 10))}${(cell % 10) + 1}`;
