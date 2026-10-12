import { GameSurface, GameHelp, AppPanel } from "./AppLayout";
import { useEffect, useRef, useState } from "react";
import { arenaWinner, sideNames, viewPosition } from "../games/arena";
import { clampPaddle, type PongState, type ArenaContact } from "../games/model";
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
  const [startingLives, setStartingLives] = useState(game.startingLives ?? 5);
  const [settings, setSettings] = useState(false);
  const [local, setLocal] = useState(0.5);
  const localRef = useRef(local);
  const [effect, setEffect] = useState<ArenaContact | null>(null);
  const previous = useRef<PongState | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const court = useRef<HTMLDivElement>(null);
  const ball = useRef<SVGCircleElement>(null);
  const drawn = useRef({ x: game.ball.x, y: game.ball.y });
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
  const color = (i: number) =>
    paddleHex(
      players.find(
        (p) => p.id === (game.phase === "ready" ? seats[i] : game.seats[i]),
      )?.color,
      i,
    );
  const viewSide = (i: number) => (i - Math.max(0, side) + 4) % 4;
  const status = !connected
    ? "Host disconnected"
    : game.phase === "finished"
      ? `${name(arenaWinner(game))} wins!`
      : game.phase === "paused"
        ? "Arena paused"
        : game.phase === "serve"
          ? "Get ready…"
          : game.phase === "ready"
            ? "Defend your side. Last paddle standing wins."
            : side < 0
              ? "You’re watching. The host picks the players."
              : !alive
                ? "You’re out. Your side is now a wall."
                : "";
  useEffect(() => {
    if (!controllable && side >= 0) {
      const next = viewPosition(side, game.paddles[side]);
      localRef.current = next;
      setLocal(next);
    }
  }, [controllable, side, game.paddles]);
  useEffect(() => {
    const before = previous.current;
    previous.current = game;
    const c = game.arenaContact;
    if (
      !connected ||
      !before ||
      before.phase === "paused" ||
      before.phase === "ready" ||
      before.phase === "finished" ||
      game.phase === "paused" ||
      game.phase === "ready"
    ) {
      clearTimeout(timer.current);
      setEffect(null);
    } else if (
      before.phase === "playing" &&
      c &&
      c.sequence > (before.arenaContact?.sequence ?? 0)
    ) {
      clearTimeout(timer.current);
      setEffect(c);
      timer.current = setTimeout(
        () => setEffect(null),
        c.kind === "miss" || c.kind === "out" ? 650 : 140,
      );
    }
  }, [game, connected]);
  useEffect(() => () => clearTimeout(timer.current), []);
  useEffect(() => {
    if (game.phase === "serve" && alive)
      court.current?.focus({ preventScroll: true });
  }, [game.phase, alive]);
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
    localRef.current = next;
    setLocal(next);
    session.move(viewPosition(side, next));
  };
  const pointer = (e: React.PointerEvent<HTMLElement>) => {
    const box = e.currentTarget.getBoundingClientRect();
    move((e.clientX - box.left) / box.width);
  };
  const dragProps = {
    onPointerDown: (e: React.PointerEvent<HTMLDivElement>) => {
      if (!controllable) return;
      e.currentTarget.setPointerCapture(e.pointerId);
      pointer(e);
    },
    onPointerMove: (e: React.PointerEvent<HTMLDivElement>) => {
      if (e.currentTarget.hasPointerCapture(e.pointerId)) pointer(e);
    },
    onPointerUp: (e: React.PointerEvent<HTMLDivElement>) => {
      if (e.currentTarget.hasPointerCapture(e.pointerId))
        e.currentTarget.releasePointerCapture(e.pointerId);
    },
    onPointerCancel: (e: React.PointerEvent<HTMLDivElement>) => {
      if (e.currentTarget.hasPointerCapture(e.pointerId))
        e.currentTarget.releasePointerCapture(e.pointerId);
    },
    onKeyDown: (e: React.KeyboardEvent<HTMLDivElement>) => {
      if (controllable && ["ArrowLeft", "ArrowRight"].includes(e.key)) {
        e.preventDefault();
        move(localRef.current + (e.key === "ArrowLeft" ? -0.06 : 0.06));
      }
    },
  };
  const markerPositions = [
    [500, 980],
    [980, 500],
    [500, 20],
    [20, 500],
  ];
  const miss = effect && ["miss", "out"].includes(effect.kind);
  return (
    <section
      className="games-card arena-game-card arena-polished"
      data-phase={game.phase}
      aria-label="Arena Pong game"
    >
      <div className="arena-hud">
        {game.seats.length ? (
          <ul className="arena-lives" aria-label="Arena lives">
            {game.seats.map((id, i) => (
              <li
                key={id}
                data-local={id === session.me.id}
                data-lives={game.lives?.[i]}
                style={{ borderColor: color(i) }}
                title={`${name(id)} · ${sideNames[viewSide(i)]} · ${game.lives?.[i]} lives`}
              >
                <span className="arena-player">
                  <b>{i + 1}</b>
                  <span>{id === session.me.id ? "You" : name(id)}</span>
                  <small>{["↓", "→", "↑", "←"][viewSide(i)]}</small>
                </span>
                <strong
                  data-testid={`arena-lives-${i}`}
                  aria-label={`${name(id)}: ${game.lives?.[i]} lives${game.lives?.[i] === 1 ? ", last life" : ""}`}
                >
                  <span className="arena-pips" aria-hidden="true">
                    {Array.from({ length: game.startingLives ?? 5 }, (_, n) => (
                      <i key={n} data-filled={n < (game.lives?.[i] ?? 0)} />
                    ))}
                  </span>
                  <span className="arena-life-count">
                    {game.lives?.[i]
                      ? `${game.lives[i]} ${game.lives[i] === 1 ? "life" : "lives"}`
                      : "· Out"}
                  </span>
                </strong>
              </li>
            ))}
          </ul>
        ) : (
          <div className="arena-intro">
            <small>ARENA PONG</small>
            <strong>Last paddle standing</strong>
            <span>3–4 players · {startingLives} lives each</span>
          </div>
        )}
      </div>
      <p className="game-status arena-status" aria-live="polite">
        {(miss && game.phase === "serve"
          ? `${name(game.seats[effect.side])}${effect.kind === "out" ? " is out · side becomes a wall" : " lost a life"}`
          : status) ||
          (miss
            ? `${name(game.seats[effect.side])}${effect.kind === "out" ? " is out · side becomes a wall" : " lost a life"}`
            : "Your paddle is at the bottom")}
      </p>
      <GameSurface>
        <div
          ref={court}
          className="pong-court arena-court"
          role="group"
          aria-label="Arena court"
          style={{ touchAction: controllable ? "none" : "auto" }}
          tabIndex={controllable ? 0 : -1}
          {...dragProps}
        >
          <svg viewBox="0 0 1000 1000" aria-hidden="true">
            <defs>
              <pattern
                id="arena-grid"
                width="70"
                height="70"
                patternUnits="userSpaceOnUse"
              >
                <path
                  d="M70 0H0V70"
                  fill="none"
                  stroke="#7cabbc"
                  strokeOpacity=".07"
                  strokeWidth="2"
                />
              </pattern>
            </defs>
            <rect
              x="55"
              y="55"
              width="890"
              height="890"
              rx="10"
              fill="url(#arena-grid)"
              stroke="#4b7589"
              strokeWidth="4"
            />
            <g transform={`rotate(${rotation} 500 500)`}>
              {[0, 1, 2, 3].map((i) => {
                const active = !!game.lives?.[i];
                const preview = game.phase === "ready" && !!seats[i];
                const enabled = active || preview;
                const pos =
                  (i === side ? viewPosition(side, local) : game.paddles[i]) *
                  1000;
                const horizontal = i === 0 || i === 2;
                const x = horizontal
                  ? enabled
                    ? pos - 120
                    : 55
                  : i === 1
                    ? 935
                    : 45;
                const y = horizontal
                  ? i === 0
                    ? 935
                    : 45
                  : enabled
                    ? pos - 120
                    : 55;
                return (
                  <g key={i}>
                    <rect
                      data-testid={`arena-paddle-${i}`}
                      data-side={sideNames[i]}
                      data-active={active}
                      x={x}
                      y={y}
                      width={horizontal ? (enabled ? 240 : 890) : 20}
                      height={horizontal ? 20 : enabled ? 240 : 890}
                      rx={enabled ? 8 : 3}
                      fill={enabled ? color(i) : "#476477"}
                      stroke={enabled ? "#ffffff66" : "#8eafba55"}
                      strokeWidth="3"
                    />
                    {i === side && active && (
                      <rect
                        x={horizontal ? pos - 24 : x + 5}
                        y={horizontal ? y + 5 : pos - 24}
                        width={horizontal ? 48 : 10}
                        height={horizontal ? 10 : 48}
                        rx="4"
                        fill="#fff"
                      />
                    )}
                  </g>
                );
              })}
              {effect && (
                <rect
                  className="arena-contact"
                  data-kind={effect.kind}
                  x={
                    effect.side % 2 === 0
                      ? effect.position * 1000 - 40
                      : effect.side === 1
                        ? 958
                        : 30
                  }
                  y={
                    effect.side % 2
                      ? effect.position * 1000 - 40
                      : effect.side === 0
                        ? 958
                        : 30
                  }
                  width={effect.side % 2 === 0 ? 80 : 12}
                  height={effect.side % 2 ? 80 : 12}
                  rx="6"
                  fill={miss ? "#ffbd83" : "#fff"}
                />
              )}
              <circle
                ref={ball}
                cx={drawn.current.x * 1000}
                cy={drawn.current.y * 1000}
                r="18"
                fill="#fffef5"
                stroke="#b4f5ff"
                strokeWidth="3"
              />
            </g>
            {game.seats.map((id, i) => {
              const [x, y] = markerPositions[viewSide(i)];
              return (
                <text
                  key={id}
                  x={x}
                  y={y}
                  textAnchor="middle"
                  dominantBaseline="central"
                  fill={id === session.me.id ? "#fff" : "#a4bdc8"}
                  fontSize="28"
                  fontWeight="700"
                >
                  {i + 1}
                </text>
              );
            })}
          </svg>
        </div>
      </GameSurface>
      {game.phase === "finished" && (
        <div className="arena-finale" aria-label="Arena results">
          <span
            className="arena-champion"
            aria-hidden="true"
            style={{
              background: color(game.seats.indexOf(arenaWinner(game)!)),
            }}
          >
            {game.seats.indexOf(arenaWinner(game)!) + 1}
          </span>
          <small>LAST PADDLE STANDING</small>
          <strong>{name(arenaWinner(game))}</strong>
          <span>
            {arenaWinner(game) === session.me.id
              ? "You won the arena!"
              : side < 0
                ? "Arena champion"
                : "Good game. Ready for another?"}
          </span>
        </div>
      )}
      {!configure && side >= 0 && alive && (
        <div
          className="arena-steering"
          role="group"
          aria-label="Paddle steering strip"
          tabIndex={controllable ? 0 : -1}
          aria-disabled={!controllable}
          style={{ touchAction: controllable ? "none" : "auto" }}
          {...dragProps}
        >
          <span className="arena-steering-track">
            <i style={{ left: `${local * 100}%`, background: color(side) }} />
          </span>
          <small>Drag here or on the court to steer</small>
        </div>
      )}
      <div className="arena-footer">
        <GameHelp label="How to play">
          {side >= 0 && (
            <>
              <p>
                Your paddle is at the bottom. Drag left/right, use the slider,
                or press ← / →.
              </p>
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
          <p>
            {game.startingLives ?? startingLives} lives each. Miss your side and
            lose a life. Empty and eliminated sides become walls. Last player
            remaining wins.
          </p>
          <ul>
            {game.seats.map((id, i) => (
              <li key={id}>
                Paddle {i + 1} · {sideNames[viewSide(i)]} · {name(id)}
                {id === session.me.id ? " · You" : ""}
              </li>
            ))}
          </ul>
          <PaddleColors
            session={session}
            players={players}
            fallback={paddleColors[Math.max(0, side)].name}
          />
        </GameHelp>
        {session.role === "host" && configure && (
          <>
            <button
              className="quiet arena-settings-button"
              onClick={() => setSettings(true)}
            >
              Players & lives
            </button>
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
        {session.role !== "host" && configure && (
          <p className="arena-waiting">
            {game.phase === "finished"
              ? "The host can start another match."
              : "The host picks the players and starts."}
          </p>
        )}
        {session.role === "host" && !configure && (
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
      </div>
      {session.role === "host" && configure && (
        <AppPanel
          title="Players & lives"
          open={settings}
          onClose={() => setSettings(false)}
        >
          <label>
            Lives per player
            <select
              aria-label="Lives per player"
              value={startingLives}
              onChange={(e) => setStartingLives(Number(e.target.value))}
            >
              {[1, 3, 5, 7].map((n) => (
                <option key={n} value={n}>
                  {n} {n === 1 ? "life" : "lives"}
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
                    {i === 3 ? "Wall" : "Choose a player"}
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
          {!valid && <p>Choose three or four different connected players.</p>}
          <p>
            Directions here are the host’s seat assignments. Each player sees
            their own paddle at the bottom.
          </p>
        </AppPanel>
      )}
    </section>
  );
}
