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
}: {
  game: PongState;
  players: Player[];
  session: Session;
  connected: boolean;
}) {
  const [seats, setSeats] = useState(
    [0, 1, 2, 3].map((i) => players[i]?.id ?? ""),
  );
  const [local, setLocal] = useState(0.5);
  const [startingLives, setStartingLives] = useState(game.startingLives ?? 5);
  const side = game.seats.indexOf(session.me.id);
  const rotation = side < 0 ? 0 : side * 90;
  const alive = side >= 0 && !!game.lives?.[side];
  const controllable =
    connected && alive && ["playing", "serve"].includes(game.phase);
  const configure = ["ready", "finished"].includes(game.phase);
  const selected = seats.filter(Boolean);
  const valid =
    seats.slice(0, 3).every(Boolean) &&
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
      className="games-card arena-game-card"
      aria-label="Arena Pong game"
    >
      <div className="board-heading">
        <h2>Arena Pong</h2>
        <span>3–4 players</span>
      </div>
      <p className="game-status" aria-live="polite">
        {!connected
          ? "Host disconnected"
          : game.phase === "finished"
            ? `${name(arenaWinner(game))} wins!`
            : game.phase === "paused"
              ? "Arena paused"
              : game.phase === "serve"
                ? "Get ready…"
                : game.phase === "ready"
                  ? "Choose three or four players."
                  : "Last paddle standing"}
      </p>
      {!!game.seats.length && (
        <ul className="arena-lives" aria-label="Arena lives">
          {game.seats.map((id, i) => (
            <li
              key={id}
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
                {game.lives?.[i]} {game.lives?.[i] ? "lives" : "· Out"}
              </strong>
            </li>
          ))}
        </ul>
      )}
      <div
        className="pong-court arena-court"
        role="group"
        aria-label="Arena court"
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
              const active = !!game.lives?.[i];
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
                    horizontal ? (active ? pos - 120 : 55) : i === 1 ? 935 : 45
                  }
                  y={
                    horizontal ? (i === 0 ? 935 : 45) : active ? pos - 120 : 55
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
            <circle ref={ball} cx="500" cy="500" r="18" fill="#f5f4ee" />
          </g>
        </svg>
      </div>
      <p className="muted">
        {side < 0
          ? "You’re watching. The host picks the players."
          : !alive && !configure
            ? "You’re out. Your side is now a wall."
            : "Your paddle is at the bottom. Drag left/right, use the slider, or press ← / →."}
      </p>
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
      <p className="muted">
        {configure && session.role === "host"
          ? startingLives
          : (game.startingLives ?? 5)}{" "}
        lives each. Miss the ball and lose a life. Empty and eliminated sides
        become walls. Last player remaining wins.
      </p>
      {session.role === "host" && configure && (
        <>
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
          <div className="seat-picker">
            {sideNames.map((label, i) => (
              <label key={label}>
                {label} player{i === 3 ? " (optional)" : ""}
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
                    {i === 3 ? "Wall · three players" : "Choose a player"}
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
          {players.length < 3 && (
            <p className="muted">
              Add at least two other players to play Arena Pong.
            </p>
          )}
          <button
            disabled={!valid}
            onClick={() => session.startPong(selected, startingLives)}
          >
            {game.phase === "finished"
              ? "Play Arena Again"
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
            {game.phase === "paused" ? "Resume Arena" : "Pause Arena"}
          </button>
        )}
    </section>
  );
}
