export const MISSION_MS = 180_000;
export const shipSystems = [
  "Shields",
  "Thrusters",
  "Coolant",
  "Reactor",
  "Oxygen",
  "Radar",
  "Gravity",
  "Airlock",
  "Fuel pump",
  "Navigation",
  "Comms",
  "Deflector",
  "Warp drive",
  "Stabilizer",
  "Solar array",
  "Ion engine",
  "Life support",
  "Tractor beam",
  "Heat vent",
  "Docking gear",
  "Power relay",
  "Gyroscope",
  "Beacon",
  "Escape pod",
];
export interface ShipControl {
  owner: string;
  value: number;
  revision: number;
}
export interface ShipOrder {
  caller: string;
  control: number;
  value: number;
  remaining: number;
  status: "pending" | "done" | "missed";
}
export interface ShipState {
  phase: "ready" | "playing" | "paused" | "finished";
  crew: string[];
  remaining: number;
  hull: number;
  repairs: number;
  mistakes: number;
  controls: ShipControl[];
  orders: ShipOrder[];
}
export function newShip(crew: string[] = []): ShipState {
  return {
    phase: "ready",
    crew,
    remaining: MISSION_MS,
    hull: 100,
    repairs: 0,
    mistakes: 0,
    controls: crew.flatMap((owner) =>
      Array.from({ length: 3 }, () => ({ owner, value: 0, revision: 0 })),
    ),
    orders: [],
  };
}
function nextOrder(
  state: ShipState,
  caller: string,
  random: () => number,
): ShipOrder {
  // Every caller addresses the next crew member. This bijection guarantees that
  // concurrent instructions never demand incompatible settings on one control.
  const owner = (state.crew.indexOf(caller) + 1) % state.crew.length;
  const control = owner * 3 + Math.floor(random() * 3);
  const value =
    (state.controls[control].value + 1 + Math.floor(random() * 3)) % 4;
  return {
    caller,
    control,
    value,
    status: "pending",
    remaining: Math.round(10_000 + (8_000 * state.remaining) / MISSION_MS),
  };
}
export function launchShip(crew: string[], random = Math.random): ShipState {
  const state = { ...newShip(crew), phase: "playing" as const };
  return {
    ...state,
    orders: crew.map((caller) => nextOrder(state, caller, random)),
  };
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
  let hull = state.hull,
    mistakes = state.mistakes;
  const orders = state.orders.map((order) => {
    const left = Math.max(0, order.remaining - milliseconds);
    if (left > 0) return { ...order, remaining: left };
    if (order.status !== "pending")
      return nextOrder({ ...state, remaining }, order.caller, random);
    hull = Math.max(0, hull - 15);
    mistakes++;
    return { ...order, remaining: 2_000, status: "missed" as const };
  });
  return {
    ...state,
    remaining,
    hull,
    mistakes,
    orders,
    phase: hull === 0 ? "finished" : "playing",
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
    !Number.isInteger(value) ||
    value < 0 ||
    value > 3 ||
    value === panel.value ||
    panel.revision >= 100_000
  )
    return state;
  const order = state.orders.find(
    (o) => o.control === control && o.status === "pending",
  );
  const correct = order?.value === value;
  const hull = correct
    ? Math.min(100, state.hull + 3)
    : order
      ? Math.max(0, state.hull - 5)
      : state.hull;
  return {
    ...state,
    hull,
    phase: hull === 0 ? "finished" : "playing",
    repairs: state.repairs + (correct ? 1 : 0),
    mistakes: state.mistakes + (order && !correct ? 1 : 0),
    controls: state.controls.map((c, i) =>
      i === control ? { ...c, value, revision: c.revision + 1 } : c,
    ),
    orders: state.orders.map((o) =>
      o === order && correct ? { ...o, status: "done", remaining: 2_000 } : o,
    ),
  };
}
