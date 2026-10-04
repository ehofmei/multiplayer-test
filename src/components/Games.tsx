import { GameSurface, GameHelp } from "./AppLayout";
import { PaddleColors } from "./ArenaGame";
import { paddleHex } from "../games/colors";
import { useEffect, useRef, useState } from "react";
import {
  clampPaddle,
  type GameKind,
  type PongState,
  type RaceState,
} from "../games/model";
import type { Player } from "../network/protocol";
import type { Session } from "../network/session";

const choices: {
  kind: GameKind;
  title: string;
  detail: string;
  mark: string;
}[] = [
  {
    kind: "sumo",
    title: "Sumo Bumpers",
    detail: "2–8 bumpers. Dash, bump, and stay inside the shrinking ring.",
    mark: "◎",
  },
  {
    kind: "cycle",
    title: "Light-cycle Arena",
    detail: "2–8 riders. Leave a trail. Cut them off. Last survivor wins.",
    mark: "↱",
  },
  {
    kind: "ship",
    title: "Spaceship Panic",
    detail:
      "Call out orders. Work your controls. Keep the ship alive together.",
    mark: "✧",
  },
  {
    kind: "breakout",
    title: "Co-op Breakout",
    detail: "One team, five shared lives. Clear three levels together.",
    mark: "▤",
  },
  {
    kind: "pong",
    title: "Pong",
    detail: "Two paddles. First to seven. Everyone else can watch.",
    mark: "↔",
  },
  {
    kind: "arena",
    title: "Arena Pong",
    detail: "Three or four paddles. Five lives. Last player standing wins.",
    mark: "□",
  },
  {
    kind: "reaction",
    title: "Reaction Race",
    detail: "Six targets, ten rounds. Stay sharp when the rule changes.",
    mark: "✦",
  },
  {
    kind: "lights",
    title: "Shared Lights",
    detail: "The original shared board. Tap and experiment together.",
    mark: "▦",
  },
  {
    kind: "bakery",
    title: "Midnight Bakery",
    detail: "Pick, reveal, pass. Bake silly treats and dodge spoon gremlins.",
    mark: "♧",
  },
];
export function GamePicker({ session }: { session: Session }) {
  const [page, setPage] = useState(0);
  const [compact, setCompact] = useState(
    () => matchMedia("(max-width: 650px), (max-height: 550px)").matches,
  );
  useEffect(() => {
    const media = matchMedia("(max-width: 650px), (max-height: 550px)");
    const change = () => {
      setCompact(media.matches);
      setPage(0);
    };
    media.addEventListener("change", change);
    return () => media.removeEventListener("change", change);
  }, []);
  const pages = compact ? Math.ceil(choices.length / 4) : 1;
  return (
    <section className="games-card game-library" aria-label="Game picker">
      <p className="eyebrow">WHAT SHALL WE PLAY?</p>
      <h2>
        {session.role === "host"
          ? "Choose a game"
          : "The host is choosing a game"}
      </h2>
      <p className="muted">Pair once. Play as many games as you like.</p>
      <div className="game-choices">
        {choices
          .slice(
            compact ? page * 4 : 0,
            compact ? page * 4 + 4 : choices.length,
          )
          .map((c) => (
            <button
              key={c.kind}
              aria-label={c.title}
              className="game-choice"
              disabled={session.role !== "host"}
              onClick={() => session.selectGame(c.kind)}
            >
              <span className="game-mark" aria-hidden="true">
                {c.mark}
              </span>
              <strong>{c.title}</strong>
              <small>{c.detail}</small>
            </button>
          ))}
      </div>
      {pages > 1 && (
        <nav className="library-pages" aria-label="Game library pages">
          <button
            className="quiet"
            disabled={page === 0}
            onClick={() => setPage((p) => Math.max(0, p - 1))}
          >
            Previous games
          </button>
          <span>
            {page + 1} / {pages}
          </span>
          <button
            className="quiet"
            disabled={page === pages - 1}
            onClick={() => setPage((p) => Math.min(pages - 1, p + 1))}
          >
            More games
          </button>
        </nav>
      )}
    </section>
  );
}
const playerName = (players: Player[], id?: string) =>
  players.find((p) => p.id === id)?.name ?? "Waiting for a player";
export function PongGame({
  game,
  epoch,
  players,
  session,
  connected,
}: {
  game: PongState;
  epoch: number;
  players: Player[];
  session: Session;
  connected: boolean;
}) {
  const [seats, setSeats] = useState([
    players[0]?.id ?? "",
    players[1]?.id ?? "",
  ]);
  const [local, setLocal] = useState(0.5);
  const seat = game.seats.indexOf(session.me.id);
  const controllable =
    connected && seat >= 0 && ["playing", "serve"].includes(game.phase);
  const ball = useRef<SVGCircleElement>(null);
  const drawn = useRef({ x: 0.5, y: 0.5 });
  useEffect(() => setLocal(0.5), [epoch]);
  useEffect(() => {
    if (!controllable && seat >= 0) setLocal(game.paddles[seat]);
  }, [controllable, seat, game.paddles]);
  useEffect(() => {
    const from = drawn.current;
    const target = game.ball;
    const start = performance.now();
    let frame = 0;
    const draw = () => {
      const fraction =
        session.role === "host" || game.phase !== "playing"
          ? 1
          : Math.min(1, (performance.now() - start) / 50);
      drawn.current = {
        x: from.x + (target.x - from.x) * fraction,
        y: from.y + (target.y - from.y) * fraction,
      };
      ball.current?.setAttribute("cx", String(drawn.current.x * 1000));
      ball.current?.setAttribute("cy", String(drawn.current.y * 650));
      if (fraction < 1) frame = requestAnimationFrame(draw);
    };
    draw();
    return () => cancelAnimationFrame(frame);
  }, [game.ball, game.phase, session]);
  const move = (position: number) => {
    if (!controllable) return;
    const next = clampPaddle(position);
    setLocal(next);
    session.move(next);
  };
  const configure = game.phase === "ready" || game.phase === "finished";
  const validSeats =
    seats.length === 2 &&
    seats[0] !== seats[1] &&
    seats.every((id) => players.some((p) => p.id === id));
  const status = !connected
    ? "Host disconnected"
    : game.phase === "ready"
      ? "Choose two players to start."
      : game.phase === "finished"
        ? `${playerName(players, game.seats[game.score[0] === 7 ? 0 : 1])} wins!`
        : game.phase === "paused"
          ? "Match paused"
          : game.phase === "serve"
            ? "Get ready…"
            : "First to seven";
  return (
    <section
      className="games-card pong-game-card"
      data-phase={game.phase}
      aria-label="Pong game"
    >
      <div className="game-score" aria-label="Pong score">
        {[0, 1].map((i) => (
          <div key={i}>
            <span>{playerName(players, game.seats[i])}</span>
            <strong data-testid={`pong-score-${i}`}>{game.score[i]}</strong>
          </div>
        ))}
      </div>
      <p className="game-status" aria-live="polite">
        {status}
      </p>
      <GameSurface ratio={1000 / 650}>
        <div
          className="pong-court"
          role="group"
          aria-label="Pong court"
          tabIndex={controllable ? 0 : -1}
          onKeyDown={(e) => {
            if (e.key === "ArrowUp" || e.key === "ArrowDown") {
              e.preventDefault();
              move(local + (e.key === "ArrowUp" ? -0.06 : 0.06));
            }
          }}
          onPointerDown={(e) => {
            if (controllable) {
              e.currentTarget.setPointerCapture(e.pointerId);
              const bounds = e.currentTarget.getBoundingClientRect();
              move((e.clientY - bounds.top) / bounds.height);
            }
          }}
          onPointerMove={(e) => {
            if (e.currentTarget.hasPointerCapture(e.pointerId)) {
              const bounds = e.currentTarget.getBoundingClientRect();
              move((e.clientY - bounds.top) / bounds.height);
            }
          }}
        >
          <svg viewBox="0 0 1000 650" aria-hidden="true">
            <path
              d="M500 0V650"
              stroke="#63837a"
              strokeWidth="4"
              strokeDasharray="12 16"
            />
            {[0, 1].map((i) => (
              <rect
                key={i}
                data-testid={`paddle-${i}`}
                x={i === 0 ? 35 : 945}
                y={((i === seat ? local : game.paddles[i]) - 0.12) * 650}
                width="20"
                height="156"
                rx="8"
                fill={
                  players.find((p) => p.id === game.seats[i])?.color
                    ? paddleHex(
                        players.find((p) => p.id === game.seats[i])?.color,
                        i,
                      )
                    : i === seat
                      ? "#d9f29d"
                      : "#f5f4ee"
                }
              />
            ))}
            <circle ref={ball} cx="500" cy="325" r="17" fill="#f5f4ee" />
          </svg>
        </div>
      </GameSurface>
      {game.seats.length === 2 && seat < 0 && (
        <p className="spectator-status">
          You’re watching this match. The host can choose you for the next one.
        </p>
      )}
      <GameHelp>
        {game.seats.length === 2 && seat >= 0 && (
          <p className="muted">
            {seat >= 0
              ? `You play ${seat === 0 ? "left" : "right"}. Drag up/down on the court, use the slider, or press ↑ / ↓.`
              : "You’re watching this match. The host can choose you for the next one."}
          </p>
        )}
        {seat >= 0 && (
          <>
            <label htmlFor="paddle">Your paddle</label>
            <input
              id="paddle"
              type="range"
              min="12"
              max="88"
              value={Math.round(local * 100)}
              disabled={!controllable}
              onChange={(e) => move(Number(e.target.value) / 100)}
            />
          </>
        )}
        <PaddleColors
          session={session}
          players={players}
          fallback={seat === 1 ? "White" : "Lime"}
        />
      </GameHelp>
      {session.role === "host" && configure && (
        <>
          <div className="seat-picker">
            {[0, 1].map((i) => (
              <label key={i}>
                {i === 0 ? "Left player" : "Right player"}
                <select
                  aria-label={i === 0 ? "Left player" : "Right player"}
                  value={seats[i]}
                  onChange={(e) =>
                    setSeats((old) =>
                      old.map((id, n) => (n === i ? e.target.value : id)),
                    )
                  }
                >
                  <option value="">Choose a player</option>
                  {players.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </label>
            ))}
          </div>
          {players.length < 2 && (
            <p className="muted">Add another player to play Pong.</p>
          )}
          <button
            disabled={!validSeats}
            onClick={() => session.startPong(seats)}
          >
            {game.phase === "finished" ? "Play Again" : "Start Pong"}
          </button>
        </>
      )}
      {session.role === "host" &&
        ["serve", "playing", "paused"].includes(game.phase) && (
          <button
            className="secondary"
            onClick={() =>
              game.phase === "paused"
                ? session.resumePong()
                : session.pauseGames()
            }
          >
            {game.phase === "paused" ? "Resume Pong" : "Pause Pong"}
          </button>
        )}
      {session.role !== "host" && configure && (
        <p className="muted">
          The host chooses the players and starts the match.
        </p>
      )}
    </section>
  );
}
const resultText = {
  pending: "Waiting",
  hit: "Hit",
  wrong: "Wrong target · −25",
  early: "Too early · −25",
  miss: "Missed",
  held: "Held steady · +75",
};
export function ReactionGame({
  game,
  players,
  session,
  connected,
}: {
  game: RaceState;
  players: Player[];
  session: Session;
  connected: boolean;
}) {
  const touchTap = useRef(false);
  const me = game.entries.find((e) => e.id === session.me.id);
  const active = game.phase === "active";
  const playable =
    connected &&
    me?.result === "pending" &&
    ["waiting", "active"].includes(game.phase);
  const finished = game.phase === "finished";
  const highest = Math.max(...game.entries.map((e) => e.points));
  const winners = game.entries
    .filter((e) => e.points === highest)
    .map((e) => playerName(players, e.id))
    .join(" & ");
  const title = !connected
    ? "Host disconnected"
    : finished
      ? `${winners} ${game.entries.filter((e) => e.points === highest).length > 1 ? "tie!" : "wins!"}`
      : game.phase === "waiting"
        ? "Wait… hands ready!"
        : active
          ? game.rule === "hit"
            ? "Hit the marked target!"
            : "Hold! Don’t tap anything."
          : game.phase === "results"
            ? "Round complete"
            : "Ready for a reaction race?";
  return (
    <section
      className="games-card reaction-game-card"
      data-phase={game.phase}
      aria-label="Reaction Race game"
    >
      <div className="board-heading">
        <h2>Reaction Race</h2>
        <span>Round {game.round} / 10</span>
      </div>
      <p className={`race-cue ${active ? game.rule : ""}`} aria-live="polite">
        {title}
      </p>
      <GameSurface ratio={3 / 2}>
        <div className="race-targets">
          {Array.from({ length: 6 }, (_, i) => (
            <button
              key={i}
              aria-label={`Target ${i + 1}`}
              aria-pressed={active && game.target === i}
              className={`race-target ${active && game.target === i ? (game.rule === "hit" ? "lit" : "decoy") : ""}`}
              disabled={!playable}
              onPointerDown={(e) => {
                touchTap.current = e.pointerType === "touch";
                if (touchTap.current && e.isPrimary && playable) {
                  e.preventDefault();
                  session.tapTarget(i);
                }
              }}
              onClick={(e) => {
                // Touch already scored on contact; keyboard/assistive clicks use detail 0.
                if (e.detail === 0 || !touchTap.current) session.tapTarget(i);
              }}
            >
              <strong>{i + 1}</strong>
              <span aria-hidden="true">
                {active && game.target === i
                  ? game.rule === "hit"
                    ? "✦ TAP"
                    : "✕ HOLD"
                  : "·"}
              </span>
            </button>
          ))}
        </div>
      </GameSurface>
      <p className="race-feedback" aria-live="polite">
        {me && me.result !== "pending"
          ? `${resultText[me.result]}${me.elapsed !== null ? ` · ${me.elapsed} ms` : ""}`
          : me
            ? "One attempt each round. Choose carefully."
            : game.phase !== "ready"
              ? "You’re watching. Join the next race."
              : "Hit the marked target when it lights up. Some rounds say Hold!"}
      </p>
      <GameHelp>
        <p className="muted">
          Faster correct hits earn up to 100 points. Wrong or early taps cost
          25. Hold rounds earn 75 for leaving every target alone.
        </p>
      </GameHelp>
      {!!game.entries.length && (
        <ol className="race-scores" aria-label="Race scores">
          {[...game.entries]
            .sort((a, b) => b.points - a.points)
            .map((e) => (
              <li key={e.id}>
                <span>
                  {playerName(players, e.id)}
                  {e.id === session.me.id ? " · You" : ""}
                  {["results", "finished"].includes(game.phase) && (
                    <small>
                      {resultText[e.result]}
                      {e.elapsed !== null ? ` · ${e.elapsed} ms` : ""}
                    </small>
                  )}
                </span>
                <strong>
                  {e.points} <small>pts</small>
                </strong>
              </li>
            ))}
        </ol>
      )}
      {session.role === "host" && (game.phase === "ready" || finished) && (
        <button onClick={() => session.startRace()}>
          {finished ? "Race Again" : "Start Race"}
        </button>
      )}
      {session.role === "host" &&
        ["waiting", "active", "results"].includes(game.phase) && (
          <button className="quiet" onClick={() => session.pauseGames()}>
            Stop Race
          </button>
        )}
      {session.role !== "host" && (game.phase === "ready" || finished) && (
        <p className="muted">Waiting for the host to start.</p>
      )}
    </section>
  );
}
