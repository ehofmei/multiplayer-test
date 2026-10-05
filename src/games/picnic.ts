export const PICNIC_SIZE = 6;
export const PICNIC_ROUNDS = 10;
export const PICNIC_TIMES = {
  countdown: 3000,
  placing: 15000,
  reveal: 3000,
  reorient: 3000,
};
export const shapes = [
  "single",
  "domino",
  "line",
  "corner",
  "square",
  "ell",
] as const;
export type Shape = (typeof shapes)[number];
export type Food = 1 | 2 | 3;
export type Bonus = "corners" | "border" | "center";
export type Piece = { shape: Shape; food: Food };
export type Placement = {
  option: number;
  x: number;
  y: number;
  rotation: number;
};
export type PicnicAction = {
  kind: "picnic-place";
  round: number;
  placement: Placement | null;
};
type MatchPhase = "countdown" | "placing" | "reveal";
export interface Picnicker {
  id: string;
  board: string;
  locked: boolean;
  placement: Placement | null;
  outcome: "waiting" | "placed" | "skipped" | "timeout";
  gain: number;
  rows: number[];
}
export interface PicnicState {
  phase: "ready" | MatchPhase | "reorient" | "paused" | "finished";
  round: number;
  remaining: number;
  resumePhase: MatchPhase | null;
  resumeRemaining: number;
  bonus: Bonus;
  offer: Piece[];
  picnickers: Picnicker[];
  bags: { shapes: Shape[]; foods: Food[] } | null;
}
const footprints: Record<Shape, [number, number][]> = {
  single: [[0, 0]],
  domino: [
    [0, 0],
    [1, 0],
  ],
  line: [
    [0, 0],
    [1, 0],
    [2, 0],
  ],
  corner: [
    [0, 0],
    [0, 1],
    [1, 1],
  ],
  square: [
    [0, 0],
    [1, 0],
    [0, 1],
    [1, 1],
  ],
  ell: [
    [0, 0],
    [0, 1],
    [0, 2],
    [1, 2],
  ],
};
export function pieceCells(shape: Shape, rotation: number): [number, number][] {
  let cells = footprints[shape].map(([x, y]): [number, number] => [x, y]);
  for (let i = 0; i < rotation; i++) cells = cells.map(([x, y]) => [-y, x]);
  const minX = Math.min(...cells.map(([x]) => x)),
    minY = Math.min(...cells.map(([, y]) => y));
  return cells.map(([x, y]) => [x - minX, y - minY]);
}
export function validPlacement(v: unknown): v is Placement {
  if (!v || typeof v !== "object") return false;
  const p = v as Placement;
  return (
    [p.option, p.x, p.y, p.rotation].every(Number.isInteger) &&
    p.option >= 0 &&
    p.option < 3 &&
    p.x >= 0 &&
    p.x < 6 &&
    p.y >= 0 &&
    p.y < 6 &&
    p.rotation >= 0 &&
    p.rotation < 4
  );
}
export function fitsPiece(board: string, piece: Piece, p: Placement): boolean {
  return (
    validPlacement(p) &&
    pieceCells(piece.shape, p.rotation).every(
      ([x, y]) =>
        x + p.x < 6 && y + p.y < 6 && board[(y + p.y) * 6 + x + p.x] === "0",
    )
  );
}
export function picnicScore(board: string, bonus: Bonus) {
  let cells = 0,
    edges = 0,
    rows = 0,
    extra = 0;
  for (let i = 0; i < 36; i++) {
    const food = Number(board[i]),
      x = i % 6,
      y = Math.floor(i / 6);
    if (!food) continue;
    cells++;
    if (x < 5 && board[i + 1] === board[i]) edges++;
    if (y < 5 && board[i + 6] === board[i]) edges++;
    if (
      bonus === "corners" &&
      food === 1 &&
      (x === 0 || x === 5) &&
      (y === 0 || y === 5)
    )
      extra += 3;
    if (
      bonus === "border" &&
      food === 2 &&
      (x === 0 || x === 5 || y === 0 || y === 5)
    )
      extra++;
    if (
      bonus === "center" &&
      food === 3 &&
      (x === 2 || x === 3) &&
      (y === 2 || y === 3)
    )
      extra += 2;
  }
  for (let y = 0; y < 6; y++)
    if (!board.slice(y * 6, y * 6 + 6).includes("0")) rows++;
  return {
    cells,
    edges,
    rows,
    bonus: extra,
    base: cells + edges + rows * 6,
    total: cells + edges + rows * 6 + extra,
  };
}
function shuffled<T>(items: readonly T[], random: () => number): T[] {
  const bag = [...items];
  for (let i = bag.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [bag[i], bag[j]] = [bag[j], bag[i]];
  }
  return bag;
}
function offerRound(state: PicnicState, random: () => number): PicnicState {
  if (!state.bags) return state;
  const bags = { shapes: [...state.bags.shapes], foods: [...state.bags.foods] };
  const offer: Piece[] = [];
  for (let i = 0; i < 3; i++) {
    const single = i === 0 && (state.round === 1 || state.round >= 7);
    if (!single && !bags.shapes.length) bags.shapes = shuffled(shapes, random);
    if (!bags.foods.length) bags.foods = shuffled([1, 2, 3] as const, random);
    offer.push({
      shape: single ? "single" : bags.shapes.pop()!,
      food: bags.foods.pop()!,
    });
  }
  return { ...state, offer, bags };
}
export function newPicnic(
  ids: string[] = [],
  random = Math.random,
): PicnicState {
  const state: PicnicState = {
    phase: ids.length ? "countdown" : "ready",
    round: ids.length ? 1 : 0,
    remaining: ids.length ? 3000 : 0,
    resumePhase: null,
    resumeRemaining: 0,
    bonus: ids.length
      ? (["corners", "border", "center"] as const)[Math.floor(random() * 3)]
      : "corners",
    offer: [],
    bags: ids.length ? { shapes: [], foods: [] } : null,
    picnickers: ids.map((id) => ({
      id,
      board: "0".repeat(36),
      locked: false,
      placement: null,
      outcome: "waiting",
      gain: 0,
      rows: [],
    })),
  };
  return ids.length ? offerRound(state, random) : state;
}
export function resolvePicnic(state: PicnicState): PicnicState {
  if (state.phase !== "placing") return state;
  return {
    ...state,
    phase: "reveal",
    remaining: 3000,
    picnickers: state.picnickers.map((p) => {
      if (!p.placement)
        return {
          ...p,
          locked: true,
          outcome: p.locked ? "skipped" : "timeout",
          gain: 0,
          rows: [],
        };
      const board = [...p.board],
        piece = state.offer[p.placement.option];
      for (const [x, y] of pieceCells(piece.shape, p.placement.rotation))
        board[(y + p.placement.y) * 6 + x + p.placement.x] = String(piece.food);
      const next = board.join("");
      const rows = Array.from({ length: 6 }, (_, y) => y).filter(
        (y) =>
          p.board.slice(y * 6, y * 6 + 6).includes("0") &&
          !next.slice(y * 6, y * 6 + 6).includes("0"),
      );
      return {
        ...p,
        board: next,
        placement: null,
        outcome: "placed",
        gain:
          picnicScore(next, state.bonus).base -
          picnicScore(p.board, state.bonus).base,
        rows,
      };
    }),
  };
}
export function commitPicnic(
  state: PicnicState,
  id: string,
  round: number,
  placement: Placement | null,
): PicnicState {
  const me = state.picnickers.find((p) => p.id === id);
  if (
    state.phase !== "placing" ||
    state.round !== round ||
    !me ||
    me.locked ||
    (placement !== null &&
      (!validPlacement(placement) ||
        !fitsPiece(me.board, state.offer[placement.option], placement)))
  )
    return state;
  const next = {
    ...state,
    picnickers: state.picnickers.map((p) =>
      p.id === id
        ? { ...p, locked: true, placement: placement ? { ...placement } : null }
        : p,
    ),
  };
  return next.picnickers.every((p) => p.locked) ? resolvePicnic(next) : next;
}
function advance(state: PicnicState, random: () => number): PicnicState {
  switch (state.phase) {
    case "countdown":
      return { ...state, phase: "placing", remaining: 15000 };
    case "reorient":
      return {
        ...state,
        phase: state.resumePhase!,
        remaining: state.resumeRemaining,
        resumePhase: null,
        resumeRemaining: 0,
      };
    case "placing":
      return resolvePicnic(state);
    case "reveal":
      return state.round === 10
        ? { ...state, phase: "finished", remaining: 0 }
        : offerRound(
            {
              ...state,
              phase: "placing",
              remaining: 15000,
              round: state.round + 1,
              picnickers: state.picnickers.map((p) => ({
                ...p,
                locked: false,
                placement: null,
                outcome: "waiting",
                gain: 0,
                rows: [],
              })),
            },
            random,
          );
    default:
      return state;
  }
}
export function stepPicnic(
  state: PicnicState,
  elapsed: number,
  random = Math.random,
): PicnicState {
  if (
    ["ready", "paused", "finished"].includes(state.phase) ||
    !Number.isFinite(elapsed) ||
    elapsed <= 0
  )
    return state;
  let next = state,
    left = Math.floor(elapsed);
  while (left >= next.remaining) {
    left -= next.remaining;
    const changed = advance(next, random);
    if (changed === next || changed.phase === "finished") return changed;
    next = changed;
  }
  return { ...next, remaining: next.remaining - left };
}
export function pausePicnic(state: PicnicState): PicnicState {
  if (["ready", "paused", "finished"].includes(state.phase)) return state;
  return state.phase === "reorient"
    ? { ...state, phase: "paused", remaining: state.resumeRemaining }
    : {
        ...state,
        phase: "paused",
        resumePhase: state.phase as MatchPhase,
        resumeRemaining: state.remaining,
      };
}
export function resumePicnic(state: PicnicState): PicnicState {
  return state.phase === "paused"
    ? { ...state, phase: "reorient", remaining: 3000 }
    : state;
}
export function picnicView(state: PicnicState): PicnicState {
  return {
    ...state,
    bags: null,
    picnickers: state.picnickers.map((p) => ({ ...p, placement: null })),
  };
}
