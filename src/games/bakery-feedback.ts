import {
  bakeryCounts,
  bakeryScore,
  type BakeryCard,
  type BakeryState,
} from "./bakery";

export function bakeryReward(treats: BakeryCard[]) {
  const card = treats.at(-1);
  const previous = treats.slice(0, -1);
  const c = bakeryCounts(treats);
  const gain = bakeryScore(treats) - bakeryScore(previous);
  const combination =
    card === "cookie"
      ? c.cookie % 2 === 0
      : card === "jelly"
        ? c.jelly % 2 === 0
        : card === "cupcake"
          ? c.cupcake <= c.sprinkles
          : card === "sprinkles"
            ? c.sprinkles <= c.cupcake
            : false;
  return {
    gain,
    combination,
    label: combination
      ? card === "cookie" || card === "jelly"
        ? "Pair complete!"
        : "Cake + sprinkles!"
      : card === "jelly"
        ? "One more jelly → 7 pts"
        : "On your counter",
  };
}

export function bakeryPass(
  game: BakeryState,
  me: string,
  name: (id: string) => string,
) {
  const gremlins = game.bakers.filter((b) => b.last === "gremlin").length;
  const revealed = game.bakers.some((b) => b.last !== null);
  const keep = revealed && game.bakers.length === 2 && gremlins % 2 === 1;
  const baker = game.bakers.findIndex((b) => b.id === me);
  const target =
    baker < 0
      ? "the next baker"
      : name(
          game.bakers[
            (baker + game.direction + game.bakers.length) % game.bakers.length
          ].id,
        );
  const action = game.phase === "reveal" ? "Passing" : "Next pass";
  return {
    gremlins,
    keep,
    label:
      game.pick === 6 && revealed
        ? "All six treats collected · batch complete"
        : keep
          ? "Gremlin kept your hand! Next pick stays with you."
          : `${action} ${game.direction === 1 ? "→" : "←"} to ${target}`,
    note: !revealed
      ? "Choose secretly · reveal together"
      : gremlins
        ? gremlins % 2 === 0
          ? `${gremlins} gremlins cancel · passing unchanged`
          : "Spoon gremlin reversed passing!"
        : "Treats stay yours · remaining cards travel",
  };
}
