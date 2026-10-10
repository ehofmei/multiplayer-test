import { expect, it } from "vitest";
import { bakeryPass, bakeryReward } from "./bakery-feedback";
import { newBakery } from "./bakery";
it("explains pair completion, useful singles and matching in either order", () => {
  expect(bakeryReward(["jelly"])).toMatchObject({
    gain: 0,
    combination: false,
    label: "One more jelly → 7 pts",
  });
  expect(bakeryReward(["jelly", "jelly"])).toMatchObject({
    gain: 7,
    combination: true,
  });
  expect(bakeryReward(["cookie", "cookie"])).toMatchObject({
    gain: 4,
    combination: true,
  });
  expect(bakeryReward(["sprinkles", "cupcake"])).toMatchObject({
    gain: 5,
    combination: true,
  });
  expect(bakeryReward(["cupcake", "sprinkles", "sprinkles"])).toMatchObject({
    gain: 1,
    combination: false,
  });
  expect(bakeryReward([]).combination).toBe(false);
});
it("names actual passing destinations and explains odd/even gremlins", () => {
  const game = newBakery(["a", "b", "c"]);
  game.phase = "reveal";
  game.direction = -1;
  game.bakers[0].last = "gremlin";
  const name = (id: string) => id.toUpperCase();
  expect(bakeryPass(game, "a", name)).toMatchObject({
    label: "Passing ← to C",
    note: "Spoon gremlin reversed passing!",
  });
  game.bakers.pop();
  expect(bakeryPass(game, "a", name).keep).toBe(true);
  game.bakers[1].last = "gremlin";
  expect(bakeryPass(game, "a", name)).toMatchObject({
    keep: false,
    note: "2 gremlins cancel · passing unchanged",
  });
});
it("closes the final pick without promising another pass", () => {
  const game = newBakery(["a", "b"]);
  game.pick = 6;
  game.bakers[0].last = "gremlin";
  expect(bakeryPass(game, "a", (id) => id).label).toBe(
    "All six treats collected · batch complete",
  );
});
