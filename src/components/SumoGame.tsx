import { GameSurface, GameHelp } from "./AppLayout";
import { useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import {
  SUMO_HZ,
  SUMO_COOLDOWN,
  sumoDashing,
  sumoStick,
  sumoRadius,
  type SumoState,
} from "../games/sumo";
import { SumoArenaArtwork, SumoBumperArtwork } from "./SumoArtwork";
import { cycleColors } from "../games/cycle";
import type { Player } from "../network/protocol";
import type { Session } from "../network/session";
const keyDirections: Record<string, [number, number]> = {
  ArrowUp: [0, -1],
  ArrowDown: [0, 1],
  ArrowLeft: [-1, 0],
  ArrowRight: [1, 0],
  w: [0, -1],
  s: [0, 1],
  a: [-1, 0],
  d: [1, 0],
};
export function SumoGame({
  game,
  players,
  session,
  connected,
}: {
  game: SumoState;
  players: Player[];
  session: Session;
  connected: boolean;
}) {
  const paint = `sumo-${useId().replace(/[^a-zA-Z0-9_-]/g, "")}`;
  const court = useRef<HTMLDivElement>(null);
  const bodies = useRef<(SVGGElement | null)[]>([]);
  const positions = useRef<Record<string, { x: number; y: number }>>({});
  const previous = useRef<SumoState | null>(null);
  const keys = useRef(new Set<string>());
  const stickPointer = useRef<number | null>(null);
  const dashTouch = useRef(false);
  const movement = useRef({ x: 0, y: 0 });
  const [stick, setStick] = useState({ x: 0, y: 0 });
  const [travel, setTravel] = useState(28);
  const pointStick = (element: HTMLElement, x: number, y: number) => {
    const r = element.getBoundingClientRect();
    const range = Math.max(1, r.width / 2 - 24);
    setTravel(range);
    const input = sumoStick(
      (x - r.left - r.width / 2) / range,
      (y - r.top - r.height / 2) / range,
    );
    send(input.x, input.y);
  };
  const me = game.bumpers.find((b) => b.id === session.me.id);
  const seat = game.bumpers.indexOf(me!);
  const active = connected && game.phase === "playing" && !!me?.alive;
  const configure = game.phase === "ready" || game.phase === "finished";
  const send = (x: number, y: number) => {
    const length = Math.max(1, Math.hypot(x, y));
    movement.current = { x: x / length, y: y / length };
    setStick(movement.current);
    session.moveBumper(movement.current.x, movement.current.y);
  };
  const stop = () => {
    keys.current.clear();
    stickPointer.current = null;
    send(0, 0);
  };
  useEffect(() => {
    if (!active) {
      movement.current = { x: 0, y: 0 };
      keys.current.clear();
      stickPointer.current = null;
      setStick({ x: 0, y: 0 });
      return;
    }
    const timer = setInterval(() => {
      const { x, y } = movement.current;
      if (x || y) session.moveBumper(x, y);
    }, 100);
    const reset = () => stop();
    const hide = () => {
      if (document.hidden) reset();
    };
    window.addEventListener("blur", reset);
    document.addEventListener("visibilitychange", hide);
    return () => {
      clearInterval(timer);
      window.removeEventListener("blur", reset);
      document.removeEventListener("visibilitychange", hide);
      session.moveBumper(0, 0);
    };
  }, [active, session]);
  useEffect(() => {
    if (game.phase === "countdown") {
      court.current?.focus({ preventScroll: true });
      court.current?.scrollIntoView({ block: "center" });
    }
  }, [game.phase]);
  // Smooth confirmed snapshots without extrapolating a bumper across the edge.
  useLayoutEffect(() => {
    const before = previous.current;
    previous.current = game;
    const animate =
      connected &&
      game.phase === "playing" &&
      before?.phase === "playing" &&
      game.ticks > before.ticks &&
      game.ticks - before.ticks <= SUMO_HZ / 4 &&
      !matchMedia("(prefers-reduced-motion: reduce)").matches;
    const starts = game.bumpers.map((b) => positions.current[b.id] ?? b);
    const started = performance.now();
    let frame = 0;
    const draw = () => {
      const fraction = animate
        ? Math.min(1, (performance.now() - started) / 50)
        : 1;
      game.bumpers.forEach((b, i) => {
        const f = b.alive ? fraction : 1;
        const x = starts[i].x + (b.x - starts[i].x) * f;
        const y = starts[i].y + (b.y - starts[i].y) * f;
        positions.current[b.id] = { x, y };
        bodies.current[i]?.setAttribute(
          "transform",
          `translate(${x * 1000} ${y * 1000})`,
        );
      });
      if (fraction < 1) frame = requestAnimationFrame(draw);
    };
    draw();
    return () => cancelAnimationFrame(frame);
  }, [game.ticks, game.phase, connected]);
  const shownBumpers = game.bumpers.length
    ? game.bumpers
    : players.map((player, i) => {
        const angle = Math.PI + (i * Math.PI * 2) / players.length;
        return {
          id: player.id,
          x: 0.5 + Math.cos(angle) * 0.25,
          y: 0.5 + Math.sin(angle) * 0.25,
          alive: true,
          dx: 0,
          dy: 0,
          cooldown: 0,
          vx: 0,
          vy: 0,
        };
      });
  const alive = game.bumpers.filter((b) => b.alive);
  const name = (id: string) =>
    players.find((p) => p.id === id)?.name ?? "Player";
  const roster = (
    <ol className="cycle-riders" aria-label="Bumpers">
      {shownBumpers.map((b, i) => (
        <li key={b.id} className={b.alive ? "" : "crashed"}>
          <span className="cycle-number" style={{ background: cycleColors[i] }}>
            {i + 1}
          </span>
          <span className="cycle-name">
            {name(b.id)}
            {b.id === session.me.id ? " · You" : ""}
          </span>
          <small>
            {game.phase === "ready" ? "Ready" : b.alive ? "In" : "Out"}
          </small>
        </li>
      ))}
    </ol>
  );
  const status = !connected
    ? "Host disconnected"
    : game.phase === "ready"
      ? "Ready to rumble?"
      : game.phase === "countdown"
        ? `Get ready… ${Math.ceil(game.countdown / SUMO_HZ)}`
        : game.phase === "paused"
          ? "Ring paused"
          : game.phase === "finished"
            ? alive.length === 0
              ? "Draw! Everyone is out."
              : alive.length === 1
                ? `${name(alive[0].id)} wins!`
                : "Round complete"
            : `${alive.length} bumpers remain · ${game.ticks >= 60 * SUMO_HZ ? "Final squeeze" : "Ring shrinking"}`;
  const keyboardMove = () => {
    let x = 0,
      y = 0;
    keys.current.forEach((key) => {
      const d = keyDirections[key];
      if (d) {
        x += d[0];
        y += d[1];
      }
    });
    send(Math.max(-1, Math.min(1, x)), Math.max(-1, Math.min(1, y)));
  };
  return (
    <section
      className="games-card sumo-game-card"
      data-phase={game.phase}
      aria-label="Sumo Bumpers game"
      onKeyDown={(e) => {
        if (!e.currentTarget.contains(e.target as Node)) return;
        const key = e.key.length === 1 ? e.key.toLowerCase() : e.key;
        if (!active || (!keyDirections[key] && key !== " ")) return;
        // Leave ordinary buttons usable with Space/assistive activation.
        if (key === " " && e.target instanceof HTMLButtonElement) return;
        e.preventDefault();
        if (key === " ") {
          if (!e.repeat) session.dashBumper();
        } else {
          keys.current.add(key);
          keyboardMove();
        }
      }}
      onKeyUp={(e) => {
        if (!e.currentTarget.contains(e.target as Node)) return;
        const key = e.key.length === 1 ? e.key.toLowerCase() : e.key;
        if (keyDirections[key]) {
          e.preventDefault();
          keys.current.delete(key);
          if (active) keyboardMove();
        }
      }}
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget)) stop();
      }}
    >
      <div className="sumo-heading">
        <h2>Sumo Bumpers</h2>
        <span className="sumo-timer" aria-label="Arena pressure">
          {game.phase === "ready"
            ? "2–8 players"
            : game.ticks >= 60 * SUMO_HZ
              ? "Final squeeze"
              : "Ring closing"}
        </span>
      </div>
      <div className="sumo-hud">
        <p className="sumo-status" aria-live="polite">
          {status}
        </p>
        <p
          className="sumo-feedback"
          title={me ? `You are bumper ${seat + 1} · ${name(me.id)}` : undefined}
        >
          {me
            ? !me.alive
              ? "You’re out. Watch the remaining bumpers."
              : `You · ${seat + 1} · ${name(me.id)}`
            : configure
              ? players.length < 2
                ? "Add another player to start."
                : "Everyone here bumps"
              : "You’re watching. Join the next round."}
        </p>
      </div>
      <GameSurface>
        <div
          className="sumo-court"
          ref={court}
          tabIndex={0}
          role="group"
          aria-label="Sumo ring. Use arrow keys or WASD to move and Space to dash."
          data-tick={game.ticks}
        >
          <svg viewBox="0 0 1000 1000" aria-hidden="true">
            <SumoArenaArtwork
              radius={sumoRadius(game.ticks) * 1000}
              paint={paint}
            />
            {shownBumpers.map((b, i) => (
              <g
                key={b.id}
                ref={(element) => {
                  bodies.current[i] = element;
                }}
                transform={`translate(${b.x * 1000} ${b.y * 1000})`}
                data-testid={
                  game.bumpers.length ? `sumo-bumper-${i}` : undefined
                }
                data-preview={!game.bumpers.length || undefined}
                data-dx={b.dx}
                data-dy={b.dy}
                data-x={b.x}
                data-y={b.y}
                data-alive={b.alive}
                data-cooldown={b.cooldown}
                data-dashing={
                  game.phase === "playing" && b.alive && sumoDashing(b.cooldown)
                }
                opacity={b.alive ? 1 : 0.4}
              >
                {game.phase === "playing" &&
                  b.alive &&
                  sumoDashing(b.cooldown) && (
                    <g
                      className="sumo-dash-trail"
                      transform={`rotate(${(Math.atan2(b.vy, b.vx) * 180) / Math.PI})`}
                    >
                      <path
                        d="M-35 -18 Q-88 -24 -142 -10 M-40 0 H-170 M-35 18 Q-88 24 -142 10"
                        stroke={cycleColors[i]}
                        strokeWidth="12"
                        strokeLinecap="round"
                        opacity="0.75"
                        fill="none"
                      />
                    </g>
                  )}
                <SumoBumperArtwork
                  color={cycleColors[i]}
                  number={i + 1}
                  local={b.id === session.me.id}
                  alive={b.alive}
                  paint={paint}
                />
              </g>
            ))}
          </svg>
          {(!connected ||
            ["ready", "countdown", "paused"].includes(game.phase)) && (
            <div className="sumo-arena-message" data-phase={game.phase}>
              <span>
                {!connected
                  ? "Connection lost"
                  : game.phase === "countdown"
                    ? "Get ready"
                    : game.phase === "paused"
                      ? "Take a breather"
                      : "Bumper arena"}
              </span>
              <strong>
                {!connected ? (
                  "Host disconnected"
                ) : game.phase === "countdown" ? (
                  Math.ceil(game.countdown / SUMO_HZ)
                ) : game.phase === "paused" ? (
                  "Paused"
                ) : (
                  <>
                    Hold your
                    <br />
                    ground
                  </>
                )}
              </strong>
              {game.phase !== "countdown" && (
                <small>
                  {!connected
                    ? "Waiting for the host"
                    : game.phase === "ready"
                      ? "Steer · Dash · Stay in"
                      : "The ring is frozen"}
                </small>
              )}
            </div>
          )}
        </div>
      </GameSurface>
      <div className="sumo-controls">
        <div
          className="sumo-stick"
          role="group"
          aria-label="Movement thumb pad"
          aria-disabled={!active}
          data-active={active}
          onPointerDown={(e) => {
            if (!active || stickPointer.current !== null) return;
            e.preventDefault();
            stickPointer.current = e.pointerId;
            e.currentTarget.setPointerCapture(e.pointerId);
            pointStick(e.currentTarget, e.clientX, e.clientY);
          }}
          onPointerMove={(e) => {
            if (!active || stickPointer.current !== e.pointerId) return;
            pointStick(e.currentTarget, e.clientX, e.clientY);
          }}
          onPointerUp={(e) => {
            if (stickPointer.current === e.pointerId) stop();
          }}
          onPointerCancel={(e) => {
            if (stickPointer.current === e.pointerId) stop();
          }}
          onLostPointerCapture={(e) => {
            if (stickPointer.current === e.pointerId) stop();
          }}
        >
          <span className="sumo-stick-up" aria-hidden="true">
            ↑
          </span>
          <span className="sumo-stick-down" aria-hidden="true">
            ↓
          </span>
          <span className="sumo-stick-left" aria-hidden="true">
            ←
          </span>
          <span className="sumo-stick-right" aria-hidden="true">
            →
          </span>
          <span
            className="sumo-stick-knob"
            style={{
              transform: `translate(${stick.x * travel}px, ${stick.y * travel}px)`,
            }}
            aria-hidden="true"
          />
        </div>
        <div className="sumo-dash-control" data-ready={active && !me?.cooldown}>
          <svg
            preserveAspectRatio="none"
            className="sumo-recharge"
            viewBox="0 0 100 100"
            aria-hidden="true"
          >
            <circle cx="50" cy="50" r="47" className="sumo-recharge-track" />
            <circle
              cx="50"
              cy="50"
              r="47"
              pathLength="1"
              strokeDasharray={`${1 - (me?.cooldown ?? 0) / SUMO_COOLDOWN} 1`}
            />
          </svg>
          <button
            aria-label="Dash"
            aria-describedby={`${paint}-charge`}
            disabled={!active || !!me?.cooldown}
            onPointerDown={(e) => {
              dashTouch.current = e.pointerType === "touch";
              // The second thumb must work while the movement thumb is held.
              if (dashTouch.current && active && !me?.cooldown) {
                e.preventDefault();
                session.dashBumper();
              }
            }}
            onClick={(e) => {
              if (e.detail === 0 || !dashTouch.current) session.dashBumper();
            }}
          >
            Dash
          </button>
          <span id={`${paint}-charge`}>
            {me?.cooldown
              ? `${(me.cooldown / SUMO_HZ).toFixed(1)}s recharge`
              : !active
                ? "Move + dash"
                : Math.hypot(stick.x, stick.y) > 0.08
                  ? "Ready!"
                  : "Steer to dash"}
          </span>
        </div>
      </div>
      {game.phase === "finished" && roster}
      <div className="sumo-footer">
        <GameHelp label="Help & players">
          <p className="muted sumo-help">
            Drag the thumb pad to move; release to brake. Move and tap Dash to
            burst forward (2s recharge). The light around Dash fills as it
            recharges. Keyboard: arrows / WASD + Space. Your center crossing the
            shrinking edge means you’re out. Last survivor wins. The ring keeps
            closing; after a minute the final squeeze speeds up.
          </p>
          {roster}
        </GameHelp>
        {session.role === "host" ? (
          configure ? (
            <>
              <button
                disabled={players.length < 2}
                onClick={() => session.startSumo()}
              >
                {game.phase === "finished" ? "Bump Again" : "Start Bumpers"}
              </button>
            </>
          ) : (
            <button
              className="secondary"
              onClick={() =>
                game.phase === "paused"
                  ? session.resumeSumo()
                  : session.pauseGames()
              }
            >
              {game.phase === "paused" ? "Resume Bumpers" : "Pause Bumpers"}
            </button>
          )
        ) : (
          configure && <p className="muted">Waiting for the host to start.</p>
        )}
      </div>
    </section>
  );
}
