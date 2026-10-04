import { GameSurface, GameHelp } from "./AppLayout";
import { brickBounds } from "../games/breakout";
import { useEffect, useRef, useState } from "react";
import { arenaWinner, sideNames, viewPosition } from "../games/arena";
import { clampPaddle, type PongState } from "../games/model";
import { paddleColors, paddleHex } from "../games/colors";
import type { Player } from "../network/protocol";
import type { Session } from "../network/session";

export function PaddleColors({
  session,
  players,
  fallback = "Lime",
}: {
  session: Session;
  players: Player[];
  fallback?: string;
}) {
  const color = players.find((p) => p.id === session.me.id)?.color ?? fallback;
  return (
    <fieldset className="paddle-colors">
      <legend>Your paddle color</legend>
      <div>
        {paddleColors.map((c) => (
          <button
            key={c.name}
            className="color-swatch"
            aria-label={`${c.name} paddle`}
            aria-pressed={color === c.name}
            style={{ background: c.hex }}
            onClick={() => session.setColor(c.name)}
          >
            <span aria-hidden="true">{color === c.name ? "✓" : ""}</span>
            <small>{c.name}</small>
          </button>
        ))}
      </div>
    </fieldset>
  );
}
export function ArenaGame({
  game,
  players,
  session,
  connected,
  cooperative = false,
}: {
  game: PongState;
  players: Player[];
  session: Session;
  connected: boolean;
  cooperative?: boolean;
}) {
  const title = cooperative ? "Co-op Breakout" : "Arena Pong";
  const team = game.breakout;
  const [seats, setSeats] = useState(
    [0, 1, 2, 3].map((i) => players[i]?.id ?? ""),
  );
  const [local, setLocal] = useState(0.5);
  const [startingLives, setStartingLives] = useState(game.startingLives ?? 5);
  const side = game.seats.indexOf(session.me.id);
  const rotation = side < 0 ? 0 : side * 90;
  const alive =
    side >= 0 && (cooperative ? !!team?.lives : !!game.lives?.[side]);
  const controllable =
    connected && alive && ["playing", "serve"].includes(game.phase);
  const configure = ["ready", "finished"].includes(game.phase);
  const selected = seats.filter(Boolean);
  const valid =
    (cooperative
      ? !!seats[0] && seats.every((id, i) => !!id === i < selected.length)
      : seats.slice(0, 3).every(Boolean)) &&
    new Set(selected).size === selected.length &&
    selected.every((id) => players.some((p) => p.id === id));
  const name = (id?: string) =>
    players.find((p) => p.id === id)?.name ?? "Waiting";
  const ball = useRef<SVGCircleElement>(null);
  const drawn = useRef({ x: 0.5, y: 0.5 });
  useEffect(() => {
    if (!controllable && side >= 0)
      setLocal(viewPosition(side, game.paddles[side]));
  }, [controllable, side, game.paddles]);
  useEffect(() => {
    const from = drawn.current;
    const start = performance.now();
    let frame = 0;
    const draw = () => {
      const t =
        session.role === "host" || game.phase !== "playing"
          ? 1
          : Math.min(1, (performance.now() - start) / 50);
      drawn.current = {
        x: from.x + (game.ball.x - from.x) * t,
        y: from.y + (game.ball.y - from.y) * t,
      };
      ball.current?.setAttribute("cx", String(drawn.current.x * 1000));
      ball.current?.setAttribute("cy", String(drawn.current.y * 1000));
      if (t < 1) frame = requestAnimationFrame(draw);
    };
    draw();
    return () => cancelAnimationFrame(frame);
  }, [game.ball, game.phase, session]);
  const move = (position: number) => {
    if (!controllable) return;
    const next = clampPaddle(position);
    setLocal(next);
    session.move(viewPosition(side, next));
  };
  const drag = (e: React.PointerEvent<HTMLDivElement>) => {
    const box = e.currentTarget.getBoundingClientRect();
    move((e.clientX - box.left) / box.width);
  };
  return (
    <section
      className={`games-card arena-game-card ${cooperative ? "breakout-game-card" : ""}`}
      data-phase={game.phase}
      aria-label={`${title} game`}
    >
      <div className="board-heading">
        <h2>{title}</h2>
        <span>{cooperative ? "1–4 teammates" : "3–4 players"}</span>
      </div>
      <p className="game-status" aria-live="polite">
        {!connected
          ? "Host disconnected"
          : game.phase === "finished"
            ? cooperative
              ? team?.lives
                ? "Team victory! All three levels cleared."
                : "Out of lives. Try again together!"
              : `${name(arenaWinner(game))} wins!`
            : game.phase === "paused"
              ? cooperative
                ? "Co-op Breakout paused"
                : "Arena paused"
              : game.phase === "serve"
                ? cooperative
                  ? `Level ${team?.level} · Get ready…`
                  : "Get ready…"
                : game.phase === "ready"
                  ? cooperative
                    ? "Choose your team. Fill seats in order; unused sides are walls."
                    : "Choose three or four players."
                  : cooperative
                    ? "Clear the bricks. Protect every teammate’s side!"
                    : "Last paddle standing"}
      </p>
      {cooperative && (
        <p className="breakout-progress" aria-label="Team progress">
          <strong>{team?.lives} shared lives</strong>
          <span>Level {team?.level} / 3</span>
          <span>{team?.bricks.filter((n) => n > 0).length} bricks left</span>
        </p>
      )}
      {!!game.seats.length && (
        <ul
          className="arena-lives"
          aria-label={cooperative ? "Team paddles" : "Arena lives"}
        >
          {game.seats.map((id, i) => (
            <li
              key={id}
              title={cooperative ? `${name(id)} · ${sideNames[i]}` : undefined}
              style={{
                borderColor: paddleHex(
                  players.find((p) => p.id === id)?.color,
                  i,
                ),
              }}
            >
              <span>
                {name(id)}
                {id === session.me.id ? " · You" : ""}
              </span>
              <strong data-testid={`arena-lives-${i}`}>
                {cooperative
                  ? sideNames[i]
                  : `${game.lives?.[i]} ${game.lives?.[i] ? "lives" : "· Out"}`}
              </strong>
            </li>
          ))}
        </ul>
      )}
      <GameSurface>
        <div
          className="pong-court arena-court"
          role="group"
          aria-label={cooperative ? "Breakout court" : "Arena court"}
          style={{ touchAction: controllable ? "none" : "auto" }}
          tabIndex={controllable ? 0 : -1}
          onKeyDown={(e) => {
            if (["ArrowLeft", "ArrowRight"].includes(e.key)) {
              e.preventDefault();
              move(local + (e.key === "ArrowLeft" ? -0.06 : 0.06));
            }
          }}
          onPointerDown={(e) => {
            if (controllable) {
              e.currentTarget.setPointerCapture(e.pointerId);
              drag(e);
            }
          }}
          onPointerMove={(e) => {
            if (e.currentTarget.hasPointerCapture(e.pointerId)) drag(e);
          }}
        >
          <svg viewBox="0 0 1000 1000" aria-hidden="true">
            <g transform={`rotate(${rotation} 500 500)`}>
              <rect
                x="55"
                y="55"
                width="890"
                height="890"
                rx="10"
                fill="none"
                stroke="#63837a"
                strokeWidth="3"
                strokeDasharray="10 16"
              />
              {[0, 1, 2, 3].map((i) => {
                const active = cooperative
                  ? i < game.seats.length
                  : !!game.lives?.[i];
                const pos =
                  (i === side ? viewPosition(side, local) : game.paddles[i]) *
                  1000;
                const horizontal = i === 0 || i === 2;
                return (
                  <rect
                    key={i}
                    data-testid={`arena-paddle-${i}`}
                    data-side={sideNames[i]}
                    data-active={active}
                    x={
                      horizontal
                        ? active
                          ? pos - 120
                          : 55
                        : i === 1
                          ? 935
                          : 45
                    }
                    y={
                      horizontal
                        ? i === 0
                          ? 935
                          : 45
                        : active
                          ? pos - 120
                          : 55
                    }
                    width={horizontal ? (active ? 240 : 890) : 20}
                    height={horizontal ? 20 : active ? 240 : 890}
                    rx="8"
                    fill={
                      active
                        ? paddleHex(
                            players.find((p) => p.id === game.seats[i])?.color,
                            i,
                          )
                        : "#63837a"
                    }
                  />
                );
              })}
              {cooperative &&
                team?.bricks.map((hp, i) => {
                  if (!hp) return null;
                  const b = brickBounds(i);
                  return (
                    <g key={i} data-testid={`brick-${i}`} data-hp={hp}>
                      <rect
                        x={b.x * 1000}
                        y={b.y * 1000}
                        width={b.width * 1000}
                        height={b.height * 1000}
                        rx="8"
                        fill={hp === 2 ? "#f4b66c" : "#d9f29d"}
                        stroke="#122c29"
                        strokeWidth="4"
                      />
                      {hp === 2 && (
                        <path
                          d={`M${(b.x + 0.022) * 1000} ${(b.y + 0.038) * 1000}h31`}
                          stroke="#122c29"
                          strokeWidth="8"
                        />
                      )}
                    </g>
                  );
                })}
              <circle ref={ball} cx="500" cy="500" r="18" fill="#f5f4ee" />
            </g>
          </svg>
        </div>
      </GameSurface>
      {!configure && (side < 0 || !alive) && (
        <p className="spectator-status">
          {side < 0
            ? "You’re watching. The host picks the players."
            : "You’re out. Your side is now a wall."}
        </p>
      )}
      <GameHelp>
        {side >= 0 && (
          <p className="muted">
            Your paddle is at the bottom. Drag left/right, use the slider, or
            press ← / →.
          </p>
        )}
        {side >= 0 && (
          <>
            <label htmlFor="arena-paddle">Your paddle</label>
            <input
              id="arena-paddle"
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
          fallback={paddleColors[Math.max(0, side)].name}
        />
        {!cooperative && (
          <p className="muted">
            {configure && session.role === "host"
              ? startingLives
              : (game.startingLives ?? 5)}{" "}
            lives each. Miss the ball and lose a life. Empty and eliminated
            sides become walls. Last player remaining wins.
          </p>
        )}
        {cooperative && (
          <p className="muted">
            Clear all three levels with five shared lives. A miss costs everyone
            one life; nobody is eliminated. Marked bricks take two hits. Late
            arrivals watch until the next match.
          </p>
        )}
      </GameHelp>
      {session.role === "host" && configure && (
        <>
          {!cooperative && (
            <label>
              Lives per player
              <select
                aria-label="Lives per player"
                value={startingLives}
                onChange={(e) => setStartingLives(Number(e.target.value))}
              >
                {[1, 3, 5, 7].map((lives) => (
                  <option key={lives} value={lives}>
                    {lives} {lives === 1 ? "life" : "lives"}
                  </option>
                ))}
              </select>
            </label>
          )}
          <div className="seat-picker">
            {sideNames.map((label, i) => (
              <label key={label}>
                {label} player
                {(cooperative ? i > 0 : i === 3) ? " (optional)" : ""}
                <select
                  aria-label={`${label} player`}
                  value={seats[i]}
                  onChange={(e) =>
                    setSeats((old) =>
                      old.map((id, n) => (n === i ? e.target.value : id)),
                    )
                  }
                >
                  <option value="">
                    {(cooperative ? i > 0 : i === 3)
                      ? "Wall"
                      : "Choose a player"}
                  </option>
                  {players.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </label>
            ))}
          </div>
          {!cooperative && players.length < 3 && (
            <p className="muted">
              Add at least two other players to play Arena Pong.
            </p>
          )}
          <button
            disabled={!valid}
            onClick={() => session.startPong(selected, startingLives)}
          >
            {game.phase === "finished"
              ? cooperative
                ? "Play Breakout Again"
                : "Play Arena Again"
              : cooperative
                ? "Start Co-op Breakout"
                : "Start Arena Pong"}
          </button>
        </>
      )}
      {session.role === "host" &&
        ["playing", "serve", "paused"].includes(game.phase) && (
          <button
            className="secondary"
            onClick={() =>
              game.phase === "paused"
                ? session.resumePong()
                : session.pauseGames()
            }
          >
            {game.phase === "paused"
              ? cooperative
                ? "Resume Breakout"
                : "Resume Arena"
              : cooperative
                ? "Pause Breakout"
                : "Pause Arena"}
          </button>
        )}
    </section>
  );
}
