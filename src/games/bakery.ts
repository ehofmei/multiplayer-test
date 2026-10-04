export const bakeryCards = [
  "cookie",
  "jelly",
  "cupcake",
  "sprinkles",
  "gremlin",
] as const;
export type BakeryCard = (typeof bakeryCards)[number];
export const BAKERY_PICKS = 6;
export const BAKERY_ROUNDS = 2;
export const BAKERY_REVEAL_MS = 1800;
export const bakeryMenu: Record<
  BakeryCard,
  { name: string; rule: string; color: string }
> = {
  cookie: {
    name: "Googly Cookie",
    rule: "2 each · a pair earns 6",
    color: "#efc991",
  },
  jelly: {
    name: "Wobble Jelly",
    rule: "A pair earns 7 · singles 0",
    color: "#edb3cd",
  },
  cupcake: { name: "Burp Cake", rule: "3 points each", color: "#b8d9ee" },
  sprinkles: {
    name: "Disco Sprinkles",
    rule: "1 each · +2 with a cake",
    color: "#d4d4f3",
  },
  gremlin: {
    name: "Spoon Gremlin",
    rule: "1 point · reverses passing",
    color: "#bcd99e",
  },
};
export interface Baker {
  id: string;
  hand: BakeryCard[] | null;
  choice: number | null;
  locked: boolean;
  treats: BakeryCard[];
  banked: number;
  last: BakeryCard | null;
}
export interface BakeryState {
  phase:
    "ready" | "picking" | "reveal" | "round-results" | "paused" | "finished";
  resumePhase: "picking" | "reveal" | null;
  round: number;
  pick: number;
  direction: 1 | -1;
  reversed: boolean;
  bakers: Baker[];
}
export function bakeryCounts(cards: BakeryCard[]) {
  return Object.fromEntries(
    bakeryCards.map((c) => [c, cards.filter((v) => v === c).length]),
  ) as Record<BakeryCard, number>;
}
export function bakeryBreakdown(
  cards: BakeryCard[],
): Record<BakeryCard, number> {
  const c = bakeryCounts(cards);
  return {
    cookie: c.cookie * 2 + Math.floor(c.cookie / 2) * 2,
    jelly: Math.floor(c.jelly / 2) * 7,
    cupcake: c.cupcake * 3,
    sprinkles: c.sprinkles + Math.min(c.sprinkles, c.cupcake) * 2,
    gremlin: c.gremlin,
  };
}
export const bakeryScore = (cards: BakeryCard[]) =>
  Object.values(bakeryBreakdown(cards)).reduce((a, b) => a + b, 0);
export function newBakery(
  ids: string[] = [],
  random = Math.random,
): BakeryState {
  // A balanced room-wide deck, shuffled locally. Hands are intentionally varied.
  const deck: BakeryCard[] = ids.flatMap(
    () =>
      [
        "cookie",
        "cookie",
        "jelly",
        "cupcake",
        "sprinkles",
        "gremlin",
      ] as BakeryCard[],
  );
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
  return {
    phase: ids.length ? "picking" : "ready",
    resumePhase: null,
    round: ids.length ? 1 : 0,
    pick: ids.length ? 1 : 0,
    direction: 1,
    reversed: false,
    bakers: ids.map((id, i) => ({
      id,
      hand: deck.slice(i * BAKERY_PICKS, (i + 1) * BAKERY_PICKS),
      choice: null,
      locked: false,
      treats: [],
      banked: 0,
      last: null,
    })),
  };
}
export function pickBakery(
  state: BakeryState,
  id: string,
  round: number,
  pick: number,
  index: number,
): BakeryState {
  const me = state.bakers.find((b) => b.id === id);
  if (
    state.phase !== "picking" ||
    state.round !== round ||
    state.pick !== pick ||
    !me?.hand ||
    me.locked ||
    !Number.isInteger(index) ||
    index < 0 ||
    index >= me.hand.length
  )
    return state;
  const bakers = state.bakers.map((b) =>
    b.id === id ? { ...b, choice: index, locked: true } : b,
  );
  if (!bakers.every((b) => b.locked)) return { ...state, bakers };
  const reversed =
    bakers.filter((b) => b.hand![b.choice!] === "gremlin").length % 2 === 1;
  return {
    ...state,
    phase: "reveal",
    reversed,
    direction: reversed ? (state.direction === 1 ? -1 : 1) : state.direction,
    bakers: bakers.map((b) => {
      const card = b.hand![b.choice!];
      return {
        ...b,
        choice: null,
        hand: b.hand!.filter((_, i) => i !== b.choice),
        treats: [...b.treats, card],
        last: card,
      };
    }),
  };
}
export function advanceBakery(
  state: BakeryState,
  random = Math.random,
): BakeryState {
  if (state.phase === "round-results") {
    const next = newBakery(
      state.bakers.map((b) => b.id),
      random,
    );
    return {
      ...next,
      round: 2,
      direction: -1,
      bakers: next.bakers.map((b, i) => ({
        ...b,
        banked: state.bakers[i].banked + bakeryScore(state.bakers[i].treats),
      })),
    };
  }
  if (state.phase !== "reveal") return state;
  if (state.pick === BAKERY_PICKS)
    return {
      ...state,
      phase: state.round === BAKERY_ROUNDS ? "finished" : "round-results",
    };
  return {
    ...state,
    phase: "picking",
    pick: state.pick + 1,
    reversed: false,
    bakers: state.bakers.map((b, i, all) => ({
      ...b,
      hand: all[
        all.length === 2 && state.reversed
          ? i
          : (i - state.direction + all.length) % all.length
      ].hand,
      choice: null,
      locked: false,
    })),
  };
}
// Never send another player's hand or locked choice to a device (including spectators).
export function bakeryView(state: BakeryState, viewer: string): BakeryState {
  return {
    ...state,
    bakers: state.bakers.map((b) => ({
      ...b,
      hand: b.id === viewer ? b.hand : null,
      choice: null,
    })),
  };
}
