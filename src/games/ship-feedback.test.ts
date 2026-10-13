import { describe, expect, it } from "vitest";
import { launchShip, setShipControl, stepShip } from "./ship";
import { shipFeedback, shipFrame, shipUrgent } from "./ship-feedback";

const launch = () => launchShip(["a", "b"], () => 0);
describe("Ship attention and feedback", () => {
  it("identifies consecutive identical requests without mistaking timer updates for orders", () => {
    const start = launch();
    const before = shipFrame(start, "a");
    const missed = stepShip(start, 18000, () => 0);
    const renewed = stepShip(missed, 2000, () => 0);
    expect(renewed.orders[0].control).toBe(start.orders[0].control);
    expect(renewed.orders[0].value).toBe(start.orders[0].value);
    expect(shipFeedback(before, shipFrame(renewed, "a")).attention).toBe(true);
    expect(
      shipFeedback(before, shipFrame(stepShip(start, 250), "a")).attention,
    ).toBe(false);
    expect(shipFeedback(null, shipFrame(renewed, "a")).attention).toBe(false);
    expect(shipFeedback(shipFrame(renewed, "a"), before).attention).toBe(false);
  });
  it("routes wrong settings to owners, misses to callers, and skips unrelated exploration", () => {
    const start = launch();
    const unrelated = setShipControl(start, "b", 4, 1, 0);
    expect(
      shipFeedback(shipFrame(start, "b"), shipFrame(unrelated, "b")).mistake,
    ).toBeNull();
    const wrong = setShipControl(start, "b", 3, 2, 0);
    expect(
      shipFeedback(shipFrame(start, "a"), shipFrame(wrong, "a")).mistake,
    ).toBeNull();
    expect(
      shipFeedback(shipFrame(start, "b"), shipFrame(wrong, "b")).mistake,
    ).toBe("wrong");
    const wrongAgain = setShipControl(wrong, "b", 3, 3, 1);
    expect(
      shipFeedback(shipFrame(wrong, "b"), shipFrame(wrongAgain, "b")).mistake,
    ).toBe("wrong");
    const missed = stepShip(start, 18000, () => 0);
    expect(missed.mistakes).toBe(2);
    expect(missed.lastMistake).toEqual({
      sequence: 2,
      kind: "missed",
      caller: "b",
      control: 0,
    });
    expect(
      shipFeedback(shipFrame(start, "b"), shipFrame(missed, "b")).mistake,
    ).toBe("missed");
    expect(
      shipFeedback(shipFrame(missed, "b"), shipFrame(missed, "b")).mistake,
    ).toBeNull();
  });
  it("celebrates only new best thresholds and does not replay on resume or spectating", () => {
    const start = shipFrame(launch(), "a");
    const five = { ...start, bestStreak: 5 };
    const ten = { ...start, bestStreak: 12 };
    expect(shipFeedback(start, five).milestone).toBe(5);
    expect(shipFeedback(start, ten).milestone).toBe(10);
    expect(shipFeedback(five, five).milestone).toBe(0);
    expect(shipFeedback({ ...start, phase: "paused" }, ten).milestone).toBe(0);
    expect(shipFeedback(start, { ...ten, crew: false }).milestone).toBe(0);
    expect(shipFeedback(null, ten).milestone).toBe(0);
    expect(shipUrgent(5001)).toBe(false);
    expect(shipUrgent(5000)).toBe(true);
    expect(shipUrgent(0)).toBe(false);
  });
  it("copies mutable values and recognizes local caller and owner success only", () => {
    const start = launch();
    const before = shipFrame(start, "a");
    const done = setShipControl(start, "b", 3, 1, 0);
    expect(shipFeedback(before, shipFrame(done, "a")).success).toBe(true);
    expect(
      shipFeedback(shipFrame(start, "b"), shipFrame(done, "b")).success,
    ).toBe(true);
    expect(
      shipFeedback(shipFrame(start, "spectator"), shipFrame(done, "spectator"))
        .success,
    ).toBe(false);
    start.orders[0].status = "done";
    expect(before.successes[0].status).toBe("pending");
  });
});
