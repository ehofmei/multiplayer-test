import { describe, expect, it } from "vitest";
import { gameNames } from "../games/model";
import {
  gameCatalog,
  libraryPage,
  playerBadge,
  rosterRequirement,
} from "./gameCatalog";

describe("family library requirements", () => {
  it("lists every selectable game once in the established order", () => {
    expect(gameCatalog.map((g) => g.kind)).toEqual([
      "sumo",
      "cycle",
      "ship",
      "breakout",
      "pong",
      "arena",
      "reaction",
      "lights",
      "bakery",
      "minigolf",
      "treasure",
      "picnic",
      "seek",
      "glow",
    ]);
    expect(gameCatalog.map((g) => g.title).sort()).toEqual(
      Object.entries(gameNames)
        .filter(([kind]) => kind !== "lobby")
        .map(([, name]) => name)
        .sort(),
    );
  });
  it("offers solo only where an existing game accepts it", () => {
    expect(
      gameCatalog.filter((g) => !rosterRequirement(g, 1)).map((g) => g.kind),
    ).toEqual(["ship", "breakout", "reaction", "lights"]);
    expect(gameCatalog.filter((g) => g.solo).map((g) => g.kind)).toEqual([
      "ship",
      "breakout",
      "reaction",
      "lights",
    ]);
  });
  it("distinguishes exact connected counts from selected seats", () => {
    const seek = gameCatalog.find((g) => g.kind === "seek")!;
    expect(playerBadge(seek)).toBe("Exactly 2 connected");
    expect(rosterRequirement(seek, 1)).toBe("Needs 1 more player");
    expect(rosterRequirement(seek, 2)).toBe("");
    expect(rosterRequirement(seek, 3)).toBe(
      "Exactly 2 connected players needed; 3 are connected",
    );
    for (const kind of ["pong", "arena", "breakout"])
      expect(
        rosterRequirement(
          gameCatalog.find((g) => g.kind === kind)!,
          8,
        ),
      ).toBe("");
    expect(
      rosterRequirement(
        gameCatalog.find((g) => g.kind === "glow")!,
        1,
      ),
    ).toBe("Needs 2 more players");
  });
  it("preserves the visible game through breakpoints and clamps stale indexes", () => {
    expect(libraryPage(7, 4)).toBe(1);
    expect(libraryPage(7, 6)).toBe(1);
    expect(libraryPage(13, 4)).toBe(3);
    expect(libraryPage(13, 6)).toBe(2);
    expect(libraryPage(-1, 4)).toBe(0);
    expect(libraryPage(100, 6)).toBe(2);
  });
});

it("explains seat conflicts and watching without changing eligibility", async () => {
  const { seatGuidance } = await import("./gameCatalog");
  const players = [{ id: "host" }, { id: "a" }, { id: "b" }, { id: "c" }];
  expect(seatGuidance(players, ["a", "b"], 2, "host")).toBe(
    "2 playing · 2 watching · You are watching",
  );
  expect(seatGuidance(players, ["host", "a", "", ""], 1, "host")).toBe(
    "2 playing · 2 watching · You are playing",
  );
  expect(seatGuidance(players, ["a", "a"], 2, "host")).toBe(
    "Choose different players for each seat.",
  );
  expect(seatGuidance(players, ["a", "", "b", ""], 1, "host")).toBe(
    "Fill seats in order; leave unused seats at the end.",
  );
  expect(seatGuidance(players, ["a", "gone"], 2, "host")).toBe(
    "Choose connected players for each seat.",
  );
});
