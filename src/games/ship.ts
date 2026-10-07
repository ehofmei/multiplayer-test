import { shipPanels, validShipSetting } from "./ship-controls";
export { shipPanels } from "./ship-controls";
export const MISSION_MS = 120_000;
export const validMissionMinutes = (minutes: number) =>
  [1, 2, 3].includes(minutes);
export type ShipDifficulty = "gentle" | "standard";
export const validShipDifficulty = (value: unknown): value is ShipDifficulty =>
  value === "gentle" || value === "standard";
export const shipDuration = (state: ShipState) => state.duration;
export const shipSystems = shipPanels.map((panel) => panel.name);
export interface ShipControl {
  owner: string;
  value: number;
  revision: number;
  wrong: boolean;
}
export interface ShipOrder {
  caller: string;
  control: number;
  value: number;
  remaining: number;
  status: "pending" | "done" | "missed";
  award: number;
}
export interface ShipState {
  rules: 2;
  phase: "ready" | "playing" | "paused" | "finished";
  crew: string[];
  remaining: number;
  duration: number;
  difficulty: ShipDifficulty;
  score: number;
  completed: number;
  streak: number;
  bestStreak: number;
  mistakes: number;
  controls: ShipControl[];
  orders: ShipOrder[];
}
export function newShip(
  crew: string[] = [],
  minutes = 2,
  difficulty: ShipDifficulty = "standard",
): ShipState {
  const duration = (validMissionMinutes(minutes) ? minutes : 2) * 60_000;
  return {
    rules: 2,
    phase: "ready",
    crew,
    duration,
    remaining: duration,
    difficulty: validShipDifficulty(difficulty) ? difficulty : "standard",
    score: 0,
    completed: 0,
    streak: 0,
    bestStreak: 0,
    mistakes: 0,
    controls: crew.flatMap((owner) =>
      Array.from({ length: 3 }, () => ({
        owner,
        value: 0,
        revision: 0,
        wrong: false,
      })),
    ),
    orders: [],
  };
}
const progress = (state: ShipState) => 1 - state.remaining / state.duration;
export const shipDeadline = (state: ShipState) =>
  Math.round(
    state.difficulty === "gentle"
      ? 26_000 - 12_000 * progress(state)
      : 18_000 - 10_000 * progress(state),
  );
export const shipFeedback = (state: ShipState) =>
  Math.round(
    state.difficulty === "gentle"
      ? 3_000 - 1_000 * progress(state)
      : 2_000 - 1_000 * progress(state),
  );
function nextOrder(
  state: ShipState,
  caller: string,
  reserved: ShipOrder[],
  random: () => number,
): ShipOrder {
  const available = state.controls.flatMap((panel, i) =>
    (state.crew.length === 1 || panel.owner !== caller) &&
    !reserved.some((order) => order.control === i)
      ? [i]
      : [],
  );
  // Pick recipients uniformly, then a free panel. Reserve each new order before
  // generating another so simultaneous renewals cannot conflict.
  const owners = [...new Set(available.map((i) => state.controls[i].owner))];
  const owner = owners[Math.floor(random() * owners.length)];
  const panels = available.filter((i) => state.controls[i].owner === owner);
  const control = panels[Math.floor(random() * panels.length)];
  const count = shipPanels[control].settings.length;
  const value =
    (state.controls[control].value + 1 + Math.floor(random() * (count - 1))) %
    count;
  return {
    caller,
    control,
    value,
    status: "pending",
    remaining: shipDeadline(state),
    award: 0,
  };
}
export function launchShip(
  crew: string[],
  random = Math.random,
  minutes = 2,
  difficulty: ShipDifficulty = "standard",
): ShipState {
  const state = {
    ...newShip(crew, minutes, difficulty),
    phase: "playing" as const,
  };
  for (const caller of crew)
    state.orders.push(nextOrder(state, caller, state.orders, random));
  return state;
}
export function stepShip(
  state: ShipState,
  milliseconds: number,
  random = Math.random,
): ShipState {
  if (
    state.phase !== "playing" ||
    !Number.isFinite(milliseconds) ||
    milliseconds <= 0
  )
    return state;
  const remaining = Math.max(0, state.remaining - milliseconds);
  if (!remaining) return { ...state, remaining, phase: "finished" };
  let mistakes = state.mistakes;
  const next = { ...state, remaining };
  const orders = state.orders.map((order) => {
    const left = Math.max(0, order.remaining - milliseconds);
    if (left > 0) return { ...order, remaining: left };
    if (order.status !== "pending") return null;
    mistakes++;
    return {
      ...order,
      remaining: shipFeedback(next),
      status: "missed" as const,
    };
  });
  const reserved = orders.filter((o): o is ShipOrder => o !== null);
  const renewed = orders.map((order, i) => {
    if (order) return order;
    const replacement = nextOrder(
      next,
      state.orders[i].caller,
      reserved,
      random,
    );
    reserved.push(replacement);
    return replacement;
  });
  return {
    ...next,
    mistakes,
    streak: mistakes > state.mistakes ? 0 : state.streak,
    orders: renewed,
    controls: state.controls.map((c, i) =>
      c.wrong && !orders.some((o) => o?.control === i && o.status === "pending")
        ? { ...c, wrong: false }
        : c,
    ),
  };
}
export function setShipControl(
  state: ShipState,
  owner: string,
  control: number,
  value: number,
  revision: number,
): ShipState {
  const panel = state.controls[control];
  if (
    state.phase !== "playing" ||
    !panel ||
    panel.owner !== owner ||
    panel.revision !== revision ||
    !validShipSetting(control, value) ||
    value === panel.value ||
    panel.revision >= 100_000
  )
    return state;
  const order = state.orders.find(
    (o) => o.control === control && o.status === "pending",
  );
  const correct = order?.value === value;
  const wrong = Boolean(order && !correct);
  const streak = correct ? state.streak + 1 : wrong ? 0 : state.streak;
  const award = correct ? 100 + 20 * Math.min(streak - 1, 10) : 0;
  return {
    ...state,
    score: state.score + award,
    completed: state.completed + (correct ? 1 : 0),
    streak,
    bestStreak: Math.max(state.bestStreak, streak),
    mistakes: state.mistakes + (wrong ? 1 : 0),
    controls: state.controls.map((c, i) =>
      i === control ? { ...c, value, revision: c.revision + 1, wrong } : c,
    ),
    orders: state.orders.map((o) =>
      o === order && correct
        ? { ...o, status: "done", remaining: shipFeedback(state), award }
        : o,
    ),
  };
}
