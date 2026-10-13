import { seatGuidance } from "./gameCatalog";
import { useEffect, useId, useRef, useState } from "react";
import { GameHelp, GameSurface } from "./AppLayout";
import { PaddleColors } from "./ArenaGame";
import { brickBounds, BREAKOUT_BRICKS } from "../games/breakout";
import {
  breakoutContacts,
  breakoutPaddleContact,
  type BrickContact,
} from "../games/breakout-feedback";
import { sideNames, viewPosition } from "../games/arena";
import { clampPaddle, type PongState } from "../games/model";
import { paddleColors, paddleHex } from "../games/colors";
import type { Player } from "../network/protocol";
import type { Session } from "../network/session";

const levelNames = ["First light", "Prism field", "Supernova"];
export function BreakoutGame({
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
  const team = game.breakout!;
  const paint = `breakout-${useId().replace(/[^a-zA-Z0-9_-]/g, "")}`;
  const [seats, setSeats] = useState(
    [0, 1, 2, 3].map((i) => players[i]?.id ?? ""),
  );
  const [local, setLocal] = useState(0.5);
  const localRef = useRef(local);
  const ball = useRef<SVGCircleElement>(null);
  const tail = useRef<SVGLineElement>(null);
  const court = useRef<HTMLDivElement>(null);
  const drawn = useRef({ x: game.ball.x, y: game.ball.y });
  const previous = useRef<PongState | null>(null);
  const effectTimer = useRef<ReturnType<typeof setTimeout> | undefined>(
    undefined,
  );
  const [effects, setEffects] = useState<BrickContact[]>([]);
  const [paddleHit, setPaddleHit] = useState<number | null>(null);
  const side = game.seats.indexOf(session.me.id);
  const controllable =
    connected && side >= 0 && ["playing", "serve"].includes(game.phase);
  const configure = game.phase === "ready" || game.phase === "finished";
  const selected = seats.filter(Boolean);
  const valid =
    !!seats[0] &&
    seats.every((id, i) => !!id === i < selected.length) &&
    new Set(selected).size === selected.length &&
    selected.every((id) => players.some((p) => p.id === id));
  const name = (id: string) =>
    players.find((p) => p.id === id)?.name ?? "Waiting";
  const color = (i: number) =>
    paddleHex(players.find((p) => p.id === game.seats[i])?.color, i);
  const remaining = team.bricks.filter(Boolean).length;
  const cleared =
    (team.level - 1) * BREAKOUT_BRICKS + BREAKOUT_BRICKS - remaining;
  const gameStatus = !connected
    ? "Host disconnected"
    : game.phase === "paused"
      ? "Co-op Breakout paused"
      : game.phase === "finished"
        ? team.lives
          ? "Team victory! All three levels cleared."
          : "Out of lives. Try again together!"
        : game.phase === "ready"
          ? session.role === "host"
            ? seatGuidance(players, seats, 1, session.me.id)
            : "The host picks 1–4 players; others watch."
          : game.phase === "serve"
            ? `Level ${team.level} · Get ready…`
            : "Clear the core. Save the next rebound.";
  const status =
    connected && session.role === "host" && game.phase === "finished" && !valid
      ? `${gameStatus} · ${seatGuidance(players, seats, 1, session.me.id)}`
      : gameStatus;
  useEffect(() => {
    if (!controllable && side >= 0) {
      const next = viewPosition(side, game.paddles[side]);
      localRef.current = next;
      setLocal(next);
    }
  }, [controllable, side, game.paddles]);
  useEffect(() => {
    if (game.phase === "serve") court.current?.focus({ preventScroll: true });
  }, [game.phase]);
  useEffect(() => {
    const contacts = breakoutContacts(previous.current, game);
    const hit = breakoutPaddleContact(previous.current, game);
    previous.current = game;
    if (!connected || game.phase === "paused" || game.phase === "ready") {
      clearTimeout(effectTimer.current);
      setEffects([]);
      setPaddleHit(null);
    } else if (contacts.length || hit !== null) {
      clearTimeout(effectTimer.current);
      setEffects(contacts);
      setPaddleHit(hit);
      effectTimer.current = setTimeout(() => {
        setEffects([]);
        setPaddleHit(null);
      }, 280);
    }
  }, [game, connected]);
  useEffect(() => () => clearTimeout(effectTimer.current), []);
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
      const speed = Math.hypot(game.ball.vx, game.ball.vy) || 1;
      tail.current?.setAttribute(
        "x1",
        String((drawn.current.x - (game.ball.vx / speed) * 0.045) * 1000),
      );
      tail.current?.setAttribute(
        "y1",
        String((drawn.current.y - (game.ball.vy / speed) * 0.045) * 1000),
      );
      tail.current?.setAttribute("x2", String(drawn.current.x * 1000));
      tail.current?.setAttribute("y2", String(drawn.current.y * 1000));
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
  const drag = (e: React.PointerEvent<HTMLElement>) => {
    const box = e.currentTarget.getBoundingClientRect();
    move((e.clientX - box.left) / box.width);
  };
  const pointer = {
    onPointerDown: (e: React.PointerEvent<HTMLElement>) => {
      if (controllable) {
        e.currentTarget.setPointerCapture(e.pointerId);
        drag(e);
      }
    },
    onPointerMove: (e: React.PointerEvent<HTMLElement>) => {
      if (e.currentTarget.hasPointerCapture(e.pointerId)) drag(e);
    },
    onPointerUp: (e: React.PointerEvent<HTMLElement>) => {
      if (e.currentTarget.hasPointerCapture(e.pointerId))
        e.currentTarget.releasePointerCapture(e.pointerId);
    },
  };
  return (
    <section
      className="games-card breakout-game-card"
      data-phase={game.phase}
      aria-label="Co-op Breakout game"
    >
      <div className="breakout-hud" aria-label="Team progress">
        <div className="breakout-level">
          <small>CORE {String(team.level).padStart(2, "0")} / 03</small>
          <strong>{levelNames[team.level - 1]}</strong>
        </div>
        <div className="breakout-health">
          <span className="breakout-life-dots" aria-hidden="true">
            {Array.from({ length: 5 }, (_, i) => (
              <i key={i} data-filled={i < team.lives} />
            ))}
          </span>
          <span>{team.lives} shared lives</span>
        </div>
        <div className="breakout-brick-count">
          <strong>{remaining}</strong>
          <small>bricks left</small>
        </div>
      </div>
      <p
        id="breakout-start-guidance"
        className="game-status breakout-status"
        aria-live="polite"
      >
        {status}
      </p>
      <GameSurface>
        <div
          ref={court}
          className="pong-court arena-court breakout-court"
          role="group"
          aria-label="Breakout court"
          style={{ touchAction: controllable ? "none" : "auto" }}
          tabIndex={controllable ? 0 : -1}
          onKeyDown={(e) => {
            if (["ArrowLeft", "ArrowRight"].includes(e.key) && controllable) {
              e.preventDefault();
              move(localRef.current + (e.key === "ArrowLeft" ? -0.06 : 0.06));
            }
          }}
          {...pointer}
        >
          <svg viewBox="0 0 1000 1000" aria-hidden="true">
            <defs>
              <radialGradient id={`${paint}-floor`}>
                <stop stopColor="#193b48" />
                <stop offset="1" stopColor="#07141e" />
              </radialGradient>
              <linearGradient id={`${paint}-tile`} x2="0.3" y2="1">
                <stop stopColor="#cbffee" />
                <stop offset="0.45" stopColor="#66e2ce" />
                <stop offset="1" stopColor="#238eac" />
              </linearGradient>
              <linearGradient id={`${paint}-armor`} x2="0.3" y2="1">
                <stop stopColor="#ffe9af" />
                <stop offset="0.45" stopColor="#ffb878" />
                <stop offset="1" stopColor="#ad586c" />
              </linearGradient>
              <pattern
                id={`${paint}-grid`}
                width="62.5"
                height="62.5"
                patternUnits="userSpaceOnUse"
              >
                <path
                  d="M62.5 0H0V62.5"
                  fill="none"
                  stroke="#73d9d5"
                  strokeOpacity=".07"
                  strokeWidth="2"
                />
              </pattern>
            </defs>
            <g transform={`rotate(${side < 0 ? 0 : side * 90} 500 500)`}>
              <rect
                width="1000"
                height="1000"
                rx="40"
                fill={`url(#${paint}-floor)`}
              />
              <rect
                x="65"
                y="65"
                width="870"
                height="870"
                fill={`url(#${paint}-grid)`}
              />
              <rect
                x="55"
                y="55"
                width="890"
                height="890"
                rx="24"
                fill="none"
                stroke="#4c8eaa"
                strokeOpacity=".5"
                strokeWidth="3"
              />
              <path
                d="M110 85H85V110M890 85H915V110M110 915H85V890M890 915H915V890"
                fill="none"
                stroke="#99e6ea"
                strokeWidth="5"
              />
              <rect
                x="328"
                y="328"
                width="344"
                height="344"
                rx="16"
                fill="#030f19"
                stroke="#5e9ba5"
                strokeOpacity=".4"
                strokeWidth="2"
              />
              {[0, 1, 2, 3].map((i) => {
                const active = i < game.seats.length;
                const pos =
                  (i === side ? viewPosition(side, local) : game.paddles[i]) *
                  1000;
                const horizontal = i % 2 === 0;
                const x = horizontal
                  ? active
                    ? pos - 120
                    : 55
                  : i === 1
                    ? 935
                    : 45;
                const y = horizontal
                  ? i === 0
                    ? 935
                    : 45
                  : active
                    ? pos - 120
                    : 55;
                const width = horizontal ? (active ? 240 : 890) : 20;
                const height = horizontal ? 20 : active ? 240 : 890;
                return (
                  <g
                    key={i}
                    className="breakout-paddle"
                    data-hit={paddleHit === i}
                    data-local={side === i}
                  >
                    {active && (
                      <rect
                        x={x - 7}
                        y={y - 7}
                        width={width + 14}
                        height={height + 14}
                        rx="14"
                        fill={color(i)}
                        opacity=".12"
                      />
                    )}
                    <rect
                      data-testid={`arena-paddle-${i}`}
                      data-side={sideNames[i]}
                      data-active={active}
                      x={x}
                      y={y}
                      width={width}
                      height={height}
                      rx="7"
                      fill={active ? color(i) : "#386071"}
                    />
                    {active && (
                      <rect
                        x={x + (horizontal ? 20 : 6)}
                        y={y + (horizontal ? 6 : 20)}
                        width={horizontal ? 200 : 8}
                        height={horizontal ? 8 : 200}
                        rx="4"
                        fill={side === i ? "#fff" : "#e5ffff"}
                        opacity={side === i ? ".9" : ".45"}
                      />
                    )}
                  </g>
                );
              })}
              {team.bricks.map((hp, i) => {
                if (!hp) return null;
                const b = brickBounds(i),
                  x = b.x * 1000,
                  y = b.y * 1000;
                return (
                  <g
                    key={i}
                    data-testid={`brick-${i}`}
                    data-hp={hp}
                    className="breakout-brick"
                    data-hit={effects.some((e) => e.index === i)}
                  >
                    <rect
                      x={x}
                      y={y + 5}
                      width="50"
                      height="50"
                      rx="7"
                      fill="#020c16"
                    />
                    <rect
                      x={x}
                      y={y}
                      width="50"
                      height="50"
                      rx="7"
                      fill={`url(#${paint}-${hp === 2 ? "armor" : "tile"})`}
                      stroke={hp === 2 ? "#ffdea5" : "#9df4df"}
                      strokeWidth="2"
                    />
                    <path
                      d={`M${x + 8} ${y + 12}V${y + 8}H${x + 42}`}
                      fill="none"
                      stroke="#fff"
                      strokeOpacity=".6"
                      strokeWidth="2"
                    />
                    {hp === 2 && (
                      <path
                        d={`M${x + 16} ${y + 25}h18m-9 -9v18`}
                        stroke="#59394b"
                        strokeWidth="5"
                        strokeLinecap="round"
                      />
                    )}
                  </g>
                );
              })}
              {effects
                .filter((e) => e.broken)
                .map((e) => {
                  const b = brickBounds(e.index);
                  return (
                    <g
                      key={e.index}
                      className="breakout-break"
                      transform={`translate(${(b.x + b.width / 2) * 1000} ${(b.y + b.height / 2) * 1000})`}
                    >
                      <circle
                        r="30"
                        fill="none"
                        stroke="#b9fff0"
                        strokeWidth="3"
                      />
                      {[0, 1, 2, 3].map((i) => (
                        <path
                          key={i}
                          d="M0 -23l5 -8 -5 -8 -5 8Z"
                          fill="#c9fff0"
                          transform={`rotate(${i * 90 + 45})`}
                        />
                      ))}
                    </g>
                  );
                })}
              <line
                ref={tail}
                className="breakout-ball-tail"
                stroke="#e0fff7"
                strokeWidth="24"
                strokeLinecap="round"
                opacity={game.phase === "playing" ? ".16" : "0"}
              />
              <circle
                ref={ball}
                data-vx={game.ball.vx}
                data-vy={game.ball.vy}
                cx={game.ball.x * 1000}
                cy={game.ball.y * 1000}
                r="18"
                fill="#ffffff"
                stroke="#b2ffef"
                strokeWidth="4"
              />
            </g>
          </svg>
          {(!connected ||
            ["paused", "serve", "finished"].includes(game.phase)) && (
            <div
              className="breakout-overlay"
              data-result={
                game.phase === "finished"
                  ? team.lives
                    ? "win"
                    : "loss"
                  : undefined
              }
            >
              <div className="breakout-message">
                <small>
                  {!connected
                    ? "CONNECTION LOST"
                    : game.phase === "finished"
                      ? "TEAM RESULT"
                      : game.phase === "paused"
                        ? "TAKE A BREATHER"
                        : `CORE ${String(team.level).padStart(2, "0")}`}
                </small>
                <strong>
                  {!connected
                    ? "Host disconnected"
                    : game.phase === "finished"
                      ? team.lives
                        ? "Brilliant together!"
                        : "One more try?"
                      : game.phase === "paused"
                        ? "Paused"
                        : "Ready?"}
                </strong>
                <span>
                  {!connected
                    ? "Return home to reconnect."
                    : game.phase === "finished"
                      ? `${cleared} / 75 bricks cleared · ${team.lives} lives left`
                      : game.phase === "paused"
                        ? "Your game will wait."
                        : levelNames[team.level - 1]}
                </span>
                {game.phase === "finished" && (
                  <div className="breakout-result-stars" aria-hidden="true">
                    {team.lives ? "✦ ✧ ✦" : "◇ ◇ ◇"}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </GameSurface>
      {!configure && (
        <div
          className="breakout-steer"
          style={{ touchAction: controllable ? "none" : "auto" }}
          {...pointer}
        >
          <span className="breakout-steer-rail" aria-hidden="true">
            <i
              style={{
                left: `${local * 100}%`,
                background: color(Math.max(0, side)),
              }}
            />
          </span>
          <span>
            {side < 0
              ? "You’re watching. The host picks the players."
              : controllable
                ? "Drag here or on the court to steer"
                : "Your paddle is resting"}
          </span>
        </div>
      )}
      {configure && session.role === "host" && (
        <div className="breakout-setup">
          <div className="seat-picker">
            {sideNames.map((label, i) => (
              <label key={label}>
                {label}
                {i > 0 ? " (optional)" : " player"}
                <select
                  aria-label={`${label} player`}
                  value={seats[i]}
                  onChange={(e) =>
                    setSeats((old) =>
                      old.map((id, n) => (n === i ? e.target.value : id)),
                    )
                  }
                >
                  <option value="">{i > 0 ? "Wall" : "Choose a player"}</option>
                  {players.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </label>
            ))}
          </div>
        </div>
      )}
      <div className="breakout-footer">
        <GameHelp>
          <p>
            Your paddle is always at the bottom. Drag left/right on the court or
            the strip below it, use the slider, or press ← / →.
          </p>
          {side >= 0 && (
            <>
              <label htmlFor="breakout-paddle">Your paddle</label>
              <input
                id="breakout-paddle"
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
          <p>
            Clear 25 bricks in each of three cores with five shared lives. A
            miss costs one team life; nobody is eliminated. Bricks marked + take
            two hits. Empty sides are walls. Late arrivals watch until the next
            match.
          </p>
          {!!game.seats.length && (
            <ul className="arena-lives" aria-label="Team paddles">
              {game.seats.map((id, i) => (
                <li key={id} style={{ borderColor: color(i) }}>
                  <span>
                    {name(id)}
                    {id === session.me.id ? " · You" : ""}
                  </span>
                  <strong>{sideNames[i]}</strong>
                </li>
              ))}
            </ul>
          )}
        </GameHelp>
        {session.role === "host" ? (
          configure ? (
            <button
              aria-describedby={
                session.role === "host" ? "breakout-start-guidance" : undefined
              }
              disabled={!valid || !connected}
              onClick={() => session.startPong(selected)}
            >
              {game.phase === "finished"
                ? "Play Breakout Again"
                : "Start Co-op Breakout"}
            </button>
          ) : (
            <button
              className="secondary"
              disabled={!connected}
              onClick={() =>
                game.phase === "paused"
                  ? session.resumePong()
                  : session.pauseGames()
              }
            >
              {game.phase === "paused" ? "Resume Breakout" : "Pause Breakout"}
            </button>
          )
        ) : (
          <span className="breakout-host-note">
            {configure
              ? "The host starts the next game"
              : "One team · Every side"}
          </span>
        )}
      </div>
    </section>
  );
}
