import type { GameKind } from "../games/model";
export type LibraryGame = Exclude<GameKind, "lobby">;
export interface GameCard {
  kind: LibraryGame;
  title: string;
  detail: string;
  min: number;
  max: number;
  category: "Competitive" | "Cooperative" | "Shared toy";
  solo?: "Solo practice" | "Play solo";
  selectedSeats: boolean;
}
export const gameCatalog: readonly GameCard[] = [
  {
    kind: "sumo",
    min: 2,
    max: 8,
    category: "Competitive",
    selectedSeats: false,
    title: "Sumo Bumpers",
    detail: "2–8 bumpers. Dash, bump, and stay inside the shrinking ring.",
  },
  {
    kind: "cycle",
    min: 2,
    max: 8,
    category: "Competitive",
    selectedSeats: false,
    title: "Light-cycle Arena",
    detail: "2–8 riders. Leave a trail. Cut them off. Last survivor wins.",
  },
  {
    kind: "ship",
    min: 1,
    max: 8,
    category: "Cooperative",
    selectedSeats: false,
    solo: "Solo practice",
    title: "Spaceship Panic",
    detail: "Call out pictures. Work your panels. Chase a team high score.",
  },
  {
    kind: "breakout",
    min: 1,
    max: 4,
    category: "Cooperative",
    selectedSeats: true,
    solo: "Solo practice",
    title: "Co-op Breakout",
    detail: "One team, five shared lives. Clear three levels together.",
  },
  {
    kind: "pong",
    min: 2,
    max: 2,
    category: "Competitive",
    selectedSeats: true,
    title: "Pong",
    detail: "Two paddles. First to seven. Everyone else can watch.",
  },
  {
    kind: "arena",
    min: 3,
    max: 4,
    category: "Competitive",
    selectedSeats: true,
    title: "Arena Pong",
    detail: "Three or four paddles. Five lives. Last player standing wins.",
  },
  {
    kind: "reaction",
    min: 1,
    max: 8,
    category: "Competitive",
    selectedSeats: false,
    solo: "Solo practice",
    title: "Reaction Race",
    detail: "Six targets, ten rounds. Stay sharp when the rule changes.",
  },
  {
    kind: "lights",
    min: 1,
    max: 8,
    category: "Shared toy",
    selectedSeats: false,
    solo: "Play solo",
    title: "Shared Lights",
    detail: "The original shared board. Tap and experiment together.",
  },
  {
    kind: "bakery",
    min: 2,
    max: 8,
    category: "Competitive",
    selectedSeats: false,
    title: "Midnight Bakery",
    detail: "Pick, reveal, pass. Bake silly treats and dodge spoon gremlins.",
  },
  {
    kind: "minigolf",
    min: 2,
    max: 8,
    category: "Competitive",
    selectedSeats: false,
    title: "Meteor Minigolf",
    detail: "2–8 golfers. One shot each. Five cosmic greens. Aim together.",
  },
  {
    kind: "treasure",
    min: 2,
    max: 8,
    category: "Competitive",
    selectedSeats: false,
    title: "Treasure Dive",
    detail: "2–8 divers. Bank your haul or brave one more sunken room.",
  },
  {
    kind: "picnic",
    min: 2,
    max: 8,
    category: "Competitive",
    selectedSeats: false,
    title: "Patchwork Picnic",
    detail:
      "2–8 puzzlers. Fit food shapes, match neighbors, and fill your blanket.",
  },
  {
    kind: "seek",
    min: 2,
    max: 2,
    category: "Competitive",
    selectedSeats: false,
    title: "Light Seek",
    detail: "Two players. Hide five glowing shapes. Find every tile.",
  },
  {
    kind: "glow",
    min: 3,
    max: 8,
    category: "Competitive",
    selectedSeats: false,
    title: "Glow Clash",
    detail:
      "3–8 players. Pick three secret tiles. Unique claims glow; collisions clash.",
  },
];

export function playerBadge(game: GameCard) {
  if (game.kind === "seek") return "Exactly 2 connected";
  // Ship describes its multiplayer mission separately from solo practice.
  const min = game.kind === "ship" ? 2 : game.min;
  return `${min === game.max ? min : `${min}–${game.max}`} players`;
}
export function rosterRequirement(game: GameCard, count: number) {
  if (count < game.min) {
    const missing = game.min - count;
    return `Needs ${missing} more ${missing === 1 ? "player" : "players"}`;
  }
  if (!game.selectedSeats && count > game.max)
    return game.kind === "seek"
      ? `Exactly 2 connected players needed; ${count} are connected`
      : `At most ${game.max} players can start`;
  return "";
}
export function libraryPage(index: number, pageSize: number) {
  return Math.floor(
    Math.max(0, Math.min(gameCatalog.length - 1, index)) / pageSize,
  );
}

export function startRequirement(kind: LibraryGame, count: number) {
  return rosterRequirement(
    gameCatalog.find((game) => game.kind === kind)!,
    count,
  );
}

export function seatGuidance(
  players: readonly { id: string }[],
  seats: readonly string[],
  min: number,
  me: string,
) {
  if (players.length < min)
    return `Needs ${min - players.length} more ${min - players.length === 1 ? "player" : "players"}`;
  const selected = seats.filter(Boolean);
  if (new Set(selected).size !== selected.length)
    return "Choose different players for each seat.";
  if (selected.length < min || !seats.slice(0, min).every(Boolean))
    return `Choose ${min} ${min === 1 ? "player" : "players"} to start.`;
  if (seats.some((id, index) => !!id !== index < selected.length))
    return "Fill seats in order; leave unused seats at the end.";
  if (selected.some((id) => !players.some((player) => player.id === id)))
    return "Choose connected players for each seat.";
  return `${selected.length} playing · ${players.length - selected.length} watching${selected.includes(me) ? " · You are playing" : " · You are watching"}`;
}
