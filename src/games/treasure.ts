export const treasureChoices = ["return", "explore", "shield"] as const;
export type TreasureChoice = (typeof treasureChoices)[number];
export type DoorCard = 0 | 2 | 3 | 4 | 6 | 10;
export const TREASURE_DECK: DoorCard[] = [0, 0, 0, 0, 2, 2, 3, 3, 4, 4, 6, 10];
export const TREASURE_TIMES = {
  countdown: 3000,
  choosing: 0,
  reveal: 2000,
  summary: 4000,
  reorient: 3000,
};
type MatchPhase = "countdown" | "choosing" | "reveal" | "summary";
type ActivePhase = MatchPhase | "reorient";
export type DiveOutcome =
  "waiting" | "returned" | "treasure" | "protected" | "caught" | "auto-bank";
export interface Diver {
  id: string;
  scores: number[];
  haul: number;
  status: "exploring" | "boat" | "caught";
  shield: boolean;
  locked: boolean;
  choice: TreasureChoice | null;
  outcome: DiveOutcome;
  change: number;
}
export interface TreasureState {
  phase: "ready" | ActivePhase | "paused" | "finished";
  dive: number;
  door: number;
  remaining: number;
  resumePhase: MatchPhase | null;
  resumeRemaining: number;
  divers: Diver[];
  // Only the authoritative host retains the deck and choices.
  deck: DoorCard[] | null;
  cardsLeft: number;
  hazardsLeft: number;
  card: DoorCard | null;
}
export const treasureTotal = (diver: Diver) =>
  diver.scores.reduce((a, b) => a + b, 0);
function shuffle(random: () => number): DoorCard[] {
  const deck = [...TREASURE_DECK];
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
  return deck;
}
export function newTreasure(
  ids: string[] = [],
  random = Math.random,
): TreasureState {
  return {
    phase: ids.length ? "countdown" : "ready",
    dive: ids.length ? 1 : 0,
    door: ids.length ? 1 : 0,
    remaining: ids.length ? TREASURE_TIMES.countdown : 0,
    resumePhase: null,
    resumeRemaining: 0,
    divers: ids.map((id) => ({
      id,
      scores: [0, 0, 0],
      haul: 0,
      status: "exploring",
      shield: true,
      locked: false,
      choice: null,
      outcome: "waiting",
      change: 0,
    })),
    deck: ids.length ? shuffle(random) : null,
    cardsLeft: 12,
    hazardsLeft: 4,
    card: null,
  };
}
function phase(state: TreasureState, next: ActivePhase): TreasureState {
  return { ...state, phase: next, remaining: TREASURE_TIMES[next] };
}
function bank(diver: Diver, dive: number): Diver {
  const scores = [...diver.scores];
  scores[dive - 1] += diver.haul;
  return { ...diver, scores, change: diver.haul, haul: 0, status: "boat" };
}
export function resolveTreasure(state: TreasureState): TreasureState {
  if (
    state.phase !== "choosing" ||
    !state.deck ||
    state.divers.some((d) => d.status === "exploring" && !d.locked)
  )
    return state;
  let divers = state.divers.map((d) => {
    if (d.status !== "exploring") return { ...d, change: 0 };
    if (d.choice === "return")
      return {
        ...bank(d, state.dive),
        locked: true,
        outcome: "returned" as const,
        choice: null,
      };
    return {
      ...d,
      shield: d.choice === "shield" ? false : d.shield,
      locked: true,
    };
  });
  const exploring = divers.some((d) => d.status === "exploring");
  const card = exploring ? state.deck[0] : null;
  const deck = exploring ? state.deck.slice(1) : state.deck;
  divers = divers.map((d) => {
    if (d.status !== "exploring") return d;
    const protectedDive = d.choice === "shield";
    if (card === 0 && !protectedDive)
      return {
        ...d,
        haul: 0,
        status: "caught",
        outcome: "caught",
        change: -d.haul,
        choice: null,
      };
    const next: Diver = {
      ...d,
      haul: d.haul + (card ?? 0),
      change: card ?? 0,
      outcome: card === 0 ? "protected" : "treasure",
      choice: null,
    };
    return state.door === 6
      ? { ...bank(next, state.dive), outcome: "auto-bank" }
      : next;
  });
  return {
    ...phase(state, "reveal"),
    divers,
    card,
    deck,
    cardsLeft: deck.length,
    hazardsLeft: deck.filter((c) => c === 0).length,
  };
}
export function chooseTreasure(
  state: TreasureState,
  id: string,
  dive: number,
  door: number,
  choice: TreasureChoice,
): TreasureState {
  const me = state.divers.find((d) => d.id === id);
  if (
    state.phase !== "choosing" ||
    state.dive !== dive ||
    state.door !== door ||
    !treasureChoices.includes(choice) ||
    !me ||
    me.status !== "exploring" ||
    me.locked ||
    (choice === "shield" && !me.shield)
  )
    return state;
  const next = {
    ...state,
    divers: state.divers.map((d) =>
      d.id === id ? { ...d, choice, locked: true } : d,
    ),
  };
  return next.divers.every((d) => d.status !== "exploring" || d.locked)
    ? resolveTreasure(next)
    : next;
}
function advance(state: TreasureState, random: () => number): TreasureState {
  switch (state.phase) {
    case "countdown":
      return phase(state, "choosing");
    case "reorient":
      return {
        ...state,
        phase: state.resumePhase!,
        remaining: state.resumeRemaining,
        resumePhase: null,
        resumeRemaining: 0,
      };
    case "choosing":
      return resolveTreasure(state);
    case "reveal":
      if (
        state.door === 6 ||
        state.divers.every((d) => d.status !== "exploring")
      )
        return phase(state, "summary");
      return {
        ...phase(state, "choosing"),
        door: state.door + 1,
        card: null,
        divers: state.divers.map((d) => ({
          ...d,
          locked: false,
          choice: null,
          change: 0,
          outcome: "waiting",
        })),
      };
    case "summary":
      if (state.dive === 3)
        return { ...state, phase: "finished", remaining: 0 };
      return {
        ...newTreasure(
          state.divers.map((d) => d.id),
          random,
        ),
        phase: "choosing",
        remaining: TREASURE_TIMES.choosing,
        dive: state.dive + 1,
        divers: state.divers.map((d) => ({
          ...d,
          haul: 0,
          status: "exploring",
          shield: true,
          locked: false,
          choice: null,
          outcome: "waiting",
          change: 0,
        })),
      };
    default:
      return state;
  }
}
export function stepTreasure(
  state: TreasureState,
  elapsed: number,
  random = Math.random,
): TreasureState {
  if (
    ["ready", "paused", "finished"].includes(state.phase) ||
    !Number.isFinite(elapsed) ||
    elapsed <= 0
  )
    return state;
  // Carry animation overshoot only as far as the next untimed decision.
  let left = Math.floor(elapsed);
  let next = state;
  while (next.phase !== "choosing" && left >= next.remaining) {
    left -= next.remaining;
    const advanced = advance(next, random);
    if (advanced === next || advanced.phase === "finished") return advanced;
    next = advanced;
  }
  return next.phase === "choosing"
    ? next
    : { ...next, remaining: next.remaining - left };
}
export function pauseTreasure(state: TreasureState): TreasureState {
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
export function resumeTreasure(state: TreasureState): TreasureState {
  return state.phase === "paused" ? phase(state, "reorient") : state;
}
export function treasureView(state: TreasureState): TreasureState {
  return {
    ...state,
    deck: null,
    divers: state.divers.map((d) => ({ ...d, choice: null })),
  };
}
