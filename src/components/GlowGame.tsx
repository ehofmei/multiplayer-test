import { useEffect, useState, type CSSProperties } from "react";
import { AppPanel, GameHelp } from "./AppLayout";
import {
  glowColors,
  glowOwners,
  glowTotal,
  type GlowState,
  type GlowRounds,
} from "../games/glow";
import type { Player } from "../network/protocol";
import type { Session } from "../network/session";
const coordinate = (cell: number) =>
  `${"ABCD"[cell % 4]}${Math.floor(cell / 4) + 1}`;
// A complete stripe cycle fits across even a 44px cell, including eight colors.
export function glowStripes(colors: string[]) {
  const band = 3;
  return `repeating-linear-gradient(135deg, ${colors.flatMap((c, i) => [`${c} ${i * band}px`, `${c} ${(i + 1) * band}px`]).join(", ")})`;
}
export function GlowGame({
  game,
  players,
  session,
  connected,
}: {
  game: GlowState;
  players: Player[];
  session: Session;
  connected: boolean;
}) {
  const [draft, setDraft] = useState<number[]>([]),
    [focus, setFocus] = useState(0),
    [scoresOpen, setScoresOpen] = useState(false),
    [detail, setDetail] = useState<number | null>(null);
  useEffect(() => {
    setDraft([]);
    setDetail(null);
    setFocus(0);
  }, [game.round, game.phase === "ready"]);
  useEffect(() => {
    if (game.phase === "choosing") setDetail(null);
  }, [game.phase]);
  const [setupOpen, setSetupOpen] = useState(false);
  const [boardOpen, setBoardOpen] = useState(false);
  const [short, setShort] = useState(
    () => matchMedia("(max-height: 450px) and (min-width: 651px)").matches,
  );
  useEffect(() => {
    const media = matchMedia("(max-height: 450px) and (min-width: 651px)");
    const update = () => setShort(media.matches);
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);
  useEffect(() => {
    if (game.phase !== "choosing") setBoardOpen(false);
  }, [game.phase]);
  const me = game.seats.find((s) => s.id === session.me.id);
  const ready = game.phase === "ready",
    finished = game.phase === "finished";
  const phase = game.resumePhase ?? game.phase;
  const revealed = phase === "reveal" || finished;
  const active = connected && game.phase === "choosing" && !!me && !me.locked;
  const name = (id: string) =>
    players.find((p) => p.id === id)?.name ?? "Player";
  const symbol = (id: string) => game.seats.findIndex((s) => s.id === id) + 1;
  const sorted = [...game.seats].sort((a, b) => glowTotal(b) - glowTotal(a));
  const winners = sorted.filter((s) => glowTotal(s) === glowTotal(sorted[0]));
  const selected = me?.locked ? (me.picks ?? []) : draft;
  const locked = game.seats.filter((s) => s.locked).length;
  const status = !connected
    ? "Host disconnected"
    : ready
      ? "Pick a color. Claim three tiles nobody else picks."
      : game.phase === "paused"
        ? "Paused · picks and scores are safe."
        : game.phase === "countdown" || game.phase === "reorient"
          ? `Get ready · ${Math.ceil(game.remaining / 1000)}`
          : finished
            ? winners.length > 1
              ? `${winners.length} players share the win!`
              : `${name(winners[0].id)} wins!`
            : revealed
              ? me
                ? `+${me.scores.at(-1)} this round · ${glowTotal(me)} total`
                : "Round revealed · tap a tile"
              : !me
                ? "Watching · join the next match."
                : me.locked
                  ? `Picks confirmed · waiting for players · ${locked}/${game.seats.length} locked`
                  : `${draft.length} of 3 selected · ${locked}/${game.seats.length} locked`;
  const toggle = (cell: number) => {
    if (short && !boardOpen) {
      setBoardOpen(true);
      return;
    }
    if (!active) return;
    setDraft((p) =>
      p.includes(cell)
        ? p.filter((c) => c !== cell)
        : p.length < 3
          ? [...p, cell]
          : p,
    );
  };
  const roster = (full: boolean) => (
    <ol className={full ? "glow-standings" : "glow-roster"}>
      {(full ? sorted : game.seats).map((s) => (
        <li key={s.id}>
          <b
            className="glow-symbol"
            style={{ background: glowColors[s.color].hex }}
          >
            {symbol(s.id)}
          </b>
          <span className="glow-name" title={name(s.id)}>
            {name(s.id)}
            {s.id === session.me.id ? " · You" : ""}
          </span>
          <strong>
            {ready ? glowColors[s.color].name : `${glowTotal(s)} pts`}
          </strong>
          {full && (
            <p>
              {ready
                ? "Color confirmed"
                : s.scores.map((n, i) => `R${i + 1}: ${n}`).join(" · ") ||
                  "No rounds scored yet"}
              {!ready && ` · ${s.locked ? "Locked" : "Choosing"}`}
            </p>
          )}
        </li>
      ))}
    </ol>
  );
  const controls = (
    <div className="glow-controls">
      {short && ready && (
        <button onClick={() => setSetupOpen(true)}>Colors & rounds</button>
      )}
      {short && !ready && (
        <button onClick={() => setBoardOpen(true)}>
          {revealed ? "Inspect board" : "Pick tiles"}
        </button>
      )}
      {!ready && !revealed && (
        <>
          <button
            className="secondary"
            disabled={!active || !draft.length}
            onClick={() => setDraft([])}
          >
            Clear
          </button>
          <button
            disabled={!active || draft.length !== 3}
            onClick={() => {
              session.lockGlowPicks(game.round, draft);
              setBoardOpen(false);
            }}
          >
            Lock picks
          </button>
        </>
      )}
      {revealed && <div className="glow-mini-scores">{roster(false)}</div>}
      <GameHelp label="Help">
        <p>
          3–8 players, four columns and one row per starting player. Pick
          exactly three different tiles; tap again to deselect. Clear resets
          your local draft. Lock picks is final after host confirmation.
        </p>
        <p>
          Choices are secret until everyone locks. Selection has no timer or
          automatic picks. Ask the group who is still choosing in Players &
          scores. A unique tile earns its owner 1 point; a collision earns
          everyone 0. Each tile scores independently.
        </p>
        <p>
          Example: you pick A1, B3 and D4. Only B3 collides, so you earn 2
          points. Stripes show every selecting color. Tap revealed tiles to see
          all names and numbered symbols.
        </p>
        <p>
          The host chooses 5, 8 or 12 rounds. Reveals last six seconds; the next
          round starts automatically. Highest total wins; ties share victory.
          The final board stays available.
        </p>
        <p>
          Choose any unused neon color before Start. A taken color keeps its
          owner, even if two people request it together. Colors and board size
          freeze at Start. Late arrivals watch until a rematch.
        </p>
        <p>
          Keyboard: Tab to the board, arrows to move focus, Space or Enter to
          toggle a tile. Short landscape windows use Pick tiles or Inspect board
          for a full-size board. Tiles have no visible markings; coordinates and
          scoring remain available in accessible labels and tile details. Pause
          preserves picks and reveal time; Resume gives a short countdown. A
          participant leaving resets setup. Update every device before playing
          Glow Clash.
        </p>
      </GameHelp>
      <button className="secondary" onClick={() => setScoresOpen(true)}>
        Players & scores
      </button>
      {session.role === "host" &&
        (ready || finished ? (
          <button
            disabled={players.length < 3 || players.length > 8}
            onClick={() => session.startGlow()}
          >
            {finished ? "Clash Again" : "Start Clash"}
          </button>
        ) : (
          <>
            <button
              className="secondary"
              onClick={() =>
                game.phase === "paused"
                  ? session.resumeGlow()
                  : session.pauseGames()
              }
            >
              {game.phase === "paused" ? "Resume" : "Pause"}
            </button>
            <button
              className="quiet"
              onClick={() => session.selectGame("glow")}
            >
              Stop
            </button>
          </>
        ))}
    </div>
  );
  const setupOptions = (
    <div className="glow-options">
      <div className="glow-rounds" role="group" aria-label="Match rounds">
        {([5, 8, 12] as GlowRounds[]).map((n) => (
          <button
            key={n}
            aria-pressed={game.rounds === n}
            disabled={session.role !== "host"}
            onClick={() => session.setGlowRounds(n)}
          >
            {n} rounds
          </button>
        ))}
      </div>
      <p className="glow-own-color">
        Your color:{" "}
        <strong>{me ? glowColors[me.color].name : "Watching"}</strong>
      </p>
      <div className="glow-palette" role="group" aria-label="Neon colors">
        {glowColors.map((c, i) => {
          const owner = game.seats.find((s) => s.color === i);
          return (
            <button
              key={c.name}
              aria-label={`${c.name}${owner ? ` · ${name(owner.id)}` : " · Available"}`}
              aria-pressed={me?.color === i}
              disabled={!connected || !me || !!owner}
              onClick={() => session.claimGlowColor(i)}
              title={owner ? `Taken by ${name(owner.id)}` : "Available"}
            >
              <span
                className="glow-swatch"
                style={
                  { background: c.hex, "--swatch-neon": c.hex } as CSSProperties
                }
              >
                {owner ? symbol(owner.id) : ""}
              </span>
              <small>{c.name}</small>
            </button>
          );
        })}
      </div>
      <div className="glow-setup-roster">{roster(false)}</div>
    </div>
  );
  const board = (
    <div
      className="glow-board"
      role="group"
      aria-label="Clash tiles"
      aria-hidden={short && !boardOpen}
      style={{ "--glow-rows": game.seats.length } as CSSProperties}
      onKeyDown={(e) => {
        const delta = {
          ArrowLeft: -1,
          ArrowRight: 1,
          ArrowUp: -4,
          ArrowDown: 4,
        }[e.key];
        if (delta === undefined) return;
        e.preventDefault();
        e.stopPropagation();
        const next = Math.max(
          0,
          Math.min(game.seats.length * 4 - 1, focus + delta),
        );
        setFocus(next);
        (e.currentTarget.children[next] as HTMLButtonElement).focus();
      }}
    >
      {Array.from({ length: game.seats.length * 4 }, (_, cell) => {
        const owners = revealed ? glowOwners(game, cell) : [];
        const picked = selected.includes(cell);
        const background =
          owners.length > 1
            ? glowStripes(owners.map((s) => glowColors[s.color].hex))
            : owners.length === 1
              ? glowColors[owners[0].color].hex
              : picked && me
                ? glowColors[me.color].hex
                : undefined;
        return (
          <button
            key={cell}
            className="glow-cell"
            style={
              {
                background,
                "--tile-neon":
                  owners.length === 1
                    ? glowColors[owners[0].color].hex
                    : picked && me
                      ? glowColors[me.color].hex
                      : "#b186ff",
              } as CSSProperties
            }
            data-lit={!!background}
            data-collision={owners.length > 1}
            aria-label={`${coordinate(cell)}${revealed ? (owners.length > 1 ? ` · Collision, ${owners.length} players, 0 points` : owners.length ? ` · Player ${symbol(owners[0].id)}, 1 point` : " · Empty") : picked ? " · Selected" : ""}`}
            aria-pressed={!revealed && picked}
            aria-disabled={!active && !revealed}
            tabIndex={!short || boardOpen ? (cell === focus ? 0 : -1) : -1}
            onFocus={() => setFocus(cell)}
            onClick={() =>
              short && !boardOpen
                ? setBoardOpen(true)
                : revealed
                  ? setDetail(cell)
                  : toggle(cell)
            }
          />
        );
      })}
    </div>
  );
  return (
    <section
      className="games-card glow-game-card"
      data-phase={game.phase}
      data-short={short}
      aria-label="Glow Clash"
      style={
        {
          "--glow-accent": me ? glowColors[me.color].hex : "#00cfff",
        } as CSSProperties
      }
    >
      <div className="glow-top">
        <strong>
          {ready ? "Glow Clash" : `Round ${game.round}/${game.rounds}`}
        </strong>
        <span>
          {ready
            ? "3–8 players"
            : `${me ? glowTotal(me) : 0} pts${revealed && !finished ? ` · ${Math.ceil(game.remaining / 1000)}s` : ""}`}
        </span>
      </div>
      <p className="glow-status" aria-live="polite">
        {status}
      </p>
      {ready ? (
        <div className="glow-setup">
          {short ? (
            <p className="glow-own-color">
              {game.rounds} rounds · Your color:{" "}
              {me ? glowColors[me.color].name : "Watching"}
            </p>
          ) : (
            setupOptions
          )}
          {controls}
        </div>
      ) : (
        <div className="glow-workspace">
          {board}
          {controls}
        </div>
      )}
      <AppPanel
        title="Glow colors & rounds"
        open={setupOpen}
        onClose={() => setSetupOpen(false)}
      >
        {setupOptions}
      </AppPanel>
      <AppPanel
        title="Clash board"
        open={boardOpen}
        onClose={() => setBoardOpen(false)}
      >
        <p>{status}</p>
        {board}
        <div className="glow-panel-actions">
          <button
            className="secondary"
            disabled={!active || !draft.length}
            onClick={() => setDraft([])}
          >
            Clear
          </button>
          <button
            disabled={!active || draft.length !== 3}
            onClick={() => {
              session.lockGlowPicks(game.round, draft);
              setBoardOpen(false);
            }}
          >
            Lock picks
          </button>
        </div>
      </AppPanel>
      <AppPanel
        title="Glow players & scores"
        open={scoresOpen}
        onClose={() => setScoresOpen(false)}
      >
        <p>
          {game.rounds} rounds · {game.seats.length}{" "}
          {ready ? "connected" : "participants"}
          {!ready ? ` · ${locked} locked` : " · at least three needed"}
        </p>
        {roster(true)}
      </AppPanel>
      <AppPanel
        title={detail === null ? "Tile details" : `Tile ${coordinate(detail)}`}
        open={detail !== null}
        onClose={() => setDetail(null)}
      >
        {detail !== null && (
          <>
            <p>
              {glowOwners(game, detail).length === 0
                ? "Nobody chose this tile."
                : glowOwners(game, detail).length === 1
                  ? "Unique claim · 1 point"
                  : "Collision · 0 points for every player"}
            </p>
            <ul className="glow-tile-owners">
              {glowOwners(game, detail).map((s) => (
                <li key={s.id}>
                  <b
                    className="glow-symbol"
                    style={{ background: glowColors[s.color].hex }}
                  >
                    {symbol(s.id)}
                  </b>{" "}
                  {name(s.id)} · {glowColors[s.color].name}
                </li>
              ))}
            </ul>
          </>
        )}
      </AppPanel>
    </section>
  );
}
