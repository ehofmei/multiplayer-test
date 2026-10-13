import {
  seatGuidance,
  gameCatalog,
  libraryPage,
  playerBadge,
  rosterRequirement,
  type LibraryGame,
} from "./gameCatalog";
import { GameMark } from "./GameMark";
import { GameSurface, GameHelp } from "./AppLayout";
import { PaddleColors } from "./ArenaGame";
import { paddleHex } from "../games/colors";
import { pongFrame, pongFeedback } from "../games/pong-feedback";
import { BUMPER_RADIUS } from "../games/pong-bumpers";
import { useEffect, useRef, useState } from "react";
import {
  clampPaddle,
  raceHitPoints,
  type PongState,
  type RaceState,
} from "../games/model";
import type { Player } from "../network/protocol";
import type { Session } from "../network/session";

export function GamePicker({
  session,
  players,
  position,
  onPosition,
  returnTo,
  onSelect,
}: {
  session: Session;
  players: Player[];
  position: number;
  onPosition: (index: number) => void;
  returnTo: LibraryGame | null;
  onSelect: (kind: LibraryGame) => void;
}) {
  const root = useRef<HTMLElement>(null);
  const [compact, setCompact] = useState(
    () => matchMedia("(max-width: 650px), (max-height: 550px)").matches,
  );
  useEffect(() => {
    const media = matchMedia("(max-width: 650px), (max-height: 550px)");
    const change = () => setCompact(media.matches);
    media.addEventListener("change", change);
    return () => media.removeEventListener("change", change);
  }, []);
  const pageSize = compact ? 4 : 6;
  const page = libraryPage(position, pageSize);
  const pages = Math.ceil(gameCatalog.length / pageSize);
  useEffect(() => {
    if (returnTo)
      root.current
        ?.querySelector<HTMLButtonElement>(`[data-game="${returnTo}"]`)
        ?.focus();
  }, [returnTo]);
  return (
    <section
      ref={root}
      className="games-card game-library"
      aria-label="Game picker"
    >
      <p className="eyebrow">WHAT SHALL WE PLAY?</p>
      <h2>
        {session.role === "host"
          ? "Choose a game"
          : "The host is choosing a game"}
      </h2>
      <p className="muted">
        {players.length} connected · Pair once. Play together.
      </p>
      <div className="game-choices">
        {gameCatalog.slice(page * pageSize, (page + 1) * pageSize).map((c) => {
          const requirement = rosterRequirement(c, players.length);
          return (
            <button
              key={c.kind}
              data-game={c.kind}
              aria-label={c.title}
              aria-describedby={`card-${c.kind}`}
              className="game-choice"
              disabled={session.role !== "host"}
              onClick={() => onSelect(c.kind)}
            >
              <span className="game-mark" aria-hidden="true">
                <GameMark kind={c.kind} />
              </span>
              <strong>{c.title}</strong>
              <span id={`card-${c.kind}`} className="game-card-detail">
                <span className="game-badges">
                  <span>{playerBadge(c)}</span>
                  <span>{c.category}</span>
                  {c.solo && <span>{c.solo}</span>}
                </span>
                <small className="card-description">{c.detail}</small>
                {c.selectedSeats && (
                  <small className="seat-policy">
                    Host picks seats · Others watch
                  </small>
                )}
                {requirement && (
                  <small className="card-requirement">{requirement}</small>
                )}
              </span>
            </button>
          );
        })}
      </div>
      <nav className="library-pages" aria-label="Game library pages">
        <button
          className="quiet"
          disabled={page === 0}
          onClick={() => onPosition((page - 1) * pageSize)}
        >
          Previous games
        </button>
        <span aria-live="polite" aria-atomic="true">
          Page {page + 1} of {pages}
          <span className="page-dots" aria-hidden="true">
            {Array.from({ length: pages }, (_, i) => (
              <i key={i} data-current={i === page} />
            ))}
          </span>
        </span>
        <button
          className="quiet"
          disabled={page === pages - 1}
          onClick={() => onPosition((page + 1) * pageSize)}
        >
          Next games
        </button>
      </nav>
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
  const [seats, setSeats] = useState(() =>
    game.seats.length === 2
      ? [...game.seats]
      : [players[0]?.id ?? "", players[1]?.id ?? ""],
  );
  const [local, setLocal] = useState(0.5);
  const seat = game.seats.indexOf(session.me.id);
  // Keep the host's original court coordinates; only each device's view rotates.
  const reversed = seat === 1;
  const viewLocal = reversed ? 1 - local : local;
  const rotation = reversed
    ? "translate(650 0) rotate(90)"
    : "translate(0 1000) rotate(-90)";
  const controllable =
    connected && seat >= 0 && ["playing", "serve"].includes(game.phase);
  const ball = useRef<SVGCircleElement>(null);
  const trail = useRef<SVGPolylineElement>(null);
  const samples = useRef<{ x: number; y: number; time: number }[]>([]);
  const previous = useRef<{
    epoch: number;
    frame: ReturnType<typeof pongFrame>;
  } | null>(null);
  const [impact, setImpact] = useState<PongState["pongContact"] | null>(null);
  const [point, setPoint] = useState<{ seat: number; gain: number } | null>(
    null,
  );
  useEffect(() => {
    const clear = () => {
      previous.current = null;
      samples.current = [];
      trail.current?.setAttribute("points", "");
      setImpact(null);
      setPoint(null);
    };
    document.addEventListener("visibilitychange", clear);
    if (!connected) clear();
    return () => document.removeEventListener("visibilitychange", clear);
  }, [connected, epoch]);
  useEffect(() => {
    const frame = pongFrame(game);
    const feedback = pongFeedback(
      previous.current?.epoch === epoch ? previous.current.frame : null,
      frame,
    );
    previous.current = { epoch, frame };
    if (feedback.contact) setImpact(feedback.contact);
    if (feedback.point) setPoint(feedback.point);
    if (game.phase !== "playing") setImpact(null);
    if (game.phase !== "serve" && game.phase !== "finished") setPoint(null);
    if (game.phase === "ready") setPoint(null);
  }, [game, epoch]);
  useEffect(() => {
    if (!impact) return;
    const timer = setTimeout(() => setImpact(null), 180);
    return () => clearTimeout(timer);
  }, [impact]);
  const drawn = useRef({ x: 0.5, y: 0.5 });
  useEffect(() => setLocal(0.5), [epoch]);
  useEffect(() => {
    if (!controllable && seat >= 0) setLocal(game.paddles[seat]);
  }, [controllable, seat, game.paddles]);
  useEffect(() => {
    if (game.phase !== "playing" || !connected) {
      samples.current = [];
      trail.current?.setAttribute("points", "");
    }
    const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
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
      if (
        game.phase === "playing" &&
        connected &&
        !document.hidden &&
        !reduced
      ) {
        const now = performance.now();
        samples.current = [
          ...samples.current.filter((p) => now - p.time < 90),
          { ...drawn.current, time: now },
        ].slice(-6);
        trail.current?.setAttribute(
          "points",
          samples.current.map((p) => `${p.x * 1000},${p.y * 650}`).join(" "),
        );
      }
      ball.current?.setAttribute("cx", String(drawn.current.x * 1000));
      ball.current?.setAttribute("cy", String(drawn.current.y * 650));
      if (fraction < 1) frame = requestAnimationFrame(draw);
    };
    draw();
    return () => cancelAnimationFrame(frame);
  }, [game.ball, game.phase, session, epoch, connected]);
  const move = (position: number) => {
    if (!controllable) return;
    const next = clampPaddle(reversed ? 1 - position : position);
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
      ? seatGuidance(players, seats, 2, session.me.id)
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
      <div className="game-score pong-scoreboard" aria-label="Pong score">
        {[0, 1].map((i) => (
          <div key={i}>
            <span>
              {playerName(
                players,
                game.phase === "ready" ? seats[i] : game.seats[i],
              )}
            </span>
            <small className="pong-seat-label">
              {game.phase === "ready"
                ? `Player ${i + 1}`
                : i === seat
                  ? "You · bottom"
                  : i === (reversed ? 1 : 0)
                    ? "Bottom"
                    : "Top"}
              {game.score[i] === 6 && game.phase !== "finished"
                ? " · Match point"
                : ""}
            </small>
            <strong
              className={point?.seat === i ? "pong-point" : undefined}
              data-testid={`pong-score-${i}`}
            >
              {game.score[i]}
            </strong>
          </div>
        ))}
      </div>
      <p id="pong-start-guidance" className="game-status" aria-live="polite">
        {connected && game.phase === "serve" ? (
          <>
            <span>
              {point
                ? `${playerName(players, game.seats[point.seat])} +${point.gain} · `
                : ""}
              Get ready{" "}
              <span aria-hidden="true">
                {(reversed ? -game.ball.vx : game.ball.vx) > 0 ? "↑" : "↓"}
              </span>
            </span>
            <progress
              aria-label="Serve progress"
              aria-live="off"
              max="1"
              value={1 - game.serveIn}
            />
          </>
        ) : (
          status
        )}
      </p>
      {game.phase === "finished" && (
        <div className="pong-finale" role="status" aria-label="Match result">
          <span className="pong-trophy" aria-hidden="true">
            ✦
          </span>
          <div>
            <p className="eyebrow">MATCH WINNER</p>
            <h2>
              {playerName(players, game.seats[game.score[0] === 7 ? 0 : 1])}
            </h2>
            <p>
              <strong>
                {game.score[0]} – {game.score[1]}
              </strong>{" "}
              ·{" "}
              {seat < 0
                ? "Thanks for watching"
                : game.score[seat] === 7
                  ? "You won!"
                  : "Good match!"}
            </p>
            {session.role !== "host" && (
              <p className="muted">The host starts the next match.</p>
            )}
          </div>
        </div>
      )}
      <GameSurface ratio={650 / 1000}>
        <div
          className="pong-court"
          data-contact-sequence={game.pongContact?.sequence ?? 0}
          role="group"
          aria-label="Pong court"
          aria-description={`${seat >= 0 ? "Your paddle is at the bottom. Drag left or right." : "Player 1 is at the bottom."} Dashed bumpers are warnings. Filled bumpers bounce the ball.`}
          style={{ touchAction: controllable ? "none" : "auto" }}
          tabIndex={controllable ? 0 : -1}
          onKeyDown={(e) => {
            if (e.key === "ArrowLeft" || e.key === "ArrowRight") {
              e.preventDefault();
              move(viewLocal + (e.key === "ArrowLeft" ? -0.06 : 0.06));
            }
          }}
          onPointerDown={(e) => {
            if (controllable && e.isPrimary && e.button === 0) {
              e.currentTarget.setPointerCapture(e.pointerId);
              const bounds = e.currentTarget.getBoundingClientRect();
              move((e.clientX - bounds.left) / bounds.width);
            }
          }}
          onPointerUp={(e) => {
            if (e.currentTarget.hasPointerCapture(e.pointerId))
              e.currentTarget.releasePointerCapture(e.pointerId);
          }}
          onPointerCancel={(e) => {
            if (e.currentTarget.hasPointerCapture(e.pointerId))
              e.currentTarget.releasePointerCapture(e.pointerId);
          }}
          onPointerMove={(e) => {
            if (e.currentTarget.hasPointerCapture(e.pointerId)) {
              const bounds = e.currentTarget.getBoundingClientRect();
              move((e.clientX - bounds.left) / bounds.width);
            }
          }}
        >
          <svg viewBox="0 0 650 1000" aria-hidden="true">
            <g transform={rotation}>
              <path
                d="M500 0V650"
                stroke="#63837a"
                strokeWidth="4"
                strokeDasharray="12 16"
              />
              {game.bumpers?.map((bumper, i) => (
                <g
                  key={i}
                  className={`pong-bumper ${bumper.warning > 0 ? "warning" : "solid"} ${bumper.flash > 0 ? "impact" : ""}`}
                  data-testid={`pong-bumper-${i}`}
                  data-warning={bumper.warning}
                  data-hits={bumper.hits}
                  data-flash={bumper.flash}
                  transform={`translate(${bumper.x * 1000} ${bumper.y * 650})`}
                >
                  <circle className="bumper-halo" r="42" />
                  <circle className="bumper-body" r={BUMPER_RADIUS * 1000} />
                  {bumper.warning > 0 ? (
                    <text
                      textAnchor="middle"
                      y="9"
                      fontSize="28"
                      fill="#ffd087"
                      transform={reversed ? "rotate(-90)" : "rotate(90)"}
                    >
                      !
                    </text>
                  ) : (
                    <circle r="10" fill="#122c29" />
                  )}
                </g>
              ))}
              {impact && (
                <g
                  key={impact.sequence}
                  className={`pong-contact ${impact.kind}`}
                  data-testid="pong-contact"
                  data-kind={impact.kind}
                  transform={`translate(${impact.x * 1000} ${impact.y * 650})`}
                >
                  <circle r={impact.kind === "paddle" ? 30 : 23} />
                  <circle r="10" />
                </g>
              )}
              <polyline ref={trail} className="pong-trail" points="" />
              {[0, 1].map((i) => (
                <g key={i}>
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
                  {i === seat && (
                    <path
                      className="pong-local-mark"
                      data-testid="pong-local-mark"
                      d={`M${i === 0 ? 40 : 950} ${(local - 0.025) * 650}h10 M${i === 0 ? 40 : 950} ${(local + 0.025) * 650}h10`}
                    />
                  )}
                </g>
              ))}
              <circle
                ref={ball}
                data-testid="pong-ball"
                data-x={game.ball.x}
                data-y={game.ball.y}
                cx="500"
                cy="325"
                r="17"
                fill="#f5f4ee"
              />
            </g>
          </svg>
        </div>
      </GameSurface>
      {seat >= 0 && ["serve", "playing", "paused"].includes(game.phase) && (
        <label className="pong-steer">
          <span>Paddle steering</span>
          <input
            aria-label="Paddle steering"
            type="range"
            min="12"
            max="88"
            value={Math.round(viewLocal * 100)}
            disabled={!controllable}
            onChange={(e) => move(Number(e.target.value) / 100)}
          />
        </label>
      )}
      {game.seats.length === 2 &&
        seat < 0 &&
        !(
          session.role === "host" &&
          game.phase === "finished" &&
          !validSeats
        ) && (
          <p className="spectator-status">
            You’re watching this match. The host can choose you for the next
            one.
          </p>
        )}
      <GameHelp>
        {game.seats.length === 2 && seat >= 0 && (
          <p className="muted">
            Your paddle has a double notch and is always at the bottom. Drag
            left/right anywhere on the court, use the steering strip when shown,
            use the slider, or press ← / →.
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
              value={Math.round(viewLocal * 100)}
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
        <p className="muted">
          Long rallies add up to four small bumpers. A dashed ring warns before
          each fills in and bounces the ball. Bumpers reset after every point.
        </p>
      </GameHelp>
      {session.role === "host" && configure && (
        <>
          <div className="seat-picker">
            {[0, 1].map((i) => (
              <label key={i}>
                {i === 0 ? "Player 1" : "Player 2"}
                <select
                  aria-label={i === 0 ? "Player 1" : "Player 2"}
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
          {game.phase === "finished" && !validSeats && (
            <p id="pong-rematch-guidance" className="muted">
              {seatGuidance(players, seats, 2, session.me.id)}
            </p>
          )}
          <button
            aria-describedby={
              game.phase === "finished" && !validSeats
                ? "pong-rematch-guidance"
                : "pong-start-guidance"
            }
            disabled={!connected || !validSeats}
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
      {session.role !== "host" && game.phase === "ready" && (
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
  const [attempt, setAttempt] = useState<{
    round: number;
    index: number;
  } | null>(null);
  useEffect(() => {
    if (game.phase === "waiting" || game.phase === "ready") setAttempt(null);
  }, [game.round, game.phase]);
  const me = game.entries.find((e) => e.id === session.me.id);
  const active = game.phase === "active";
  const playable =
    connected &&
    me?.result === "pending" &&
    ["waiting", "active"].includes(game.phase);
  const finished = game.phase === "finished";
  const standings = [...game.entries].sort((a, b) => b.points - a.points);
  const highest = Math.max(...game.entries.map((e) => e.points));
  const rank = me
    ? 1 + game.entries.filter((e) => e.points > me.points).length
    : null;
  const gain =
    me?.result === "hit" && me.elapsed !== null
      ? raceHitPoints(me.elapsed)
      : null;
  const scored = me && me.result !== "pending";
  const tapped = scored && attempt?.round === game.round ? attempt.index : null;
  const tap = (index: number) => {
    if (!playable) return;
    // Measure/send the contact before scheduling decorative local feedback.
    session.tapTarget(index);
    setAttempt((previous) =>
      previous?.round === game.round ? previous : { round: game.round, index },
    );
  };
  const winners = game.entries
    .filter((e) => e.points === highest)
    .map((e) => playerName(players, e.id))
    .join(" & ");
  const title = !connected
    ? "Host disconnected"
    : finished
      ? game.entries.filter((e) => e.points === highest).length > 1
        ? "Shared winners tie!"
        : `${winners} wins!`
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
      <div className="race-dashboard" aria-label="Your race progress">
        <span>
          {me ? (
            <>
              Your total <strong>{me.points} pts</strong>
            </>
          ) : game.phase === "ready" ? (
            "Ready to race"
          ) : (
            "Spectating"
          )}
        </span>
        <span>
          {finished && rank ? (
            <>
              Your rank <strong>#{rank}</strong>
            </>
          ) : (
            <>
              Progress <strong>{game.round} / 10</strong>
            </>
          )}
        </span>
      </div>
      <div className="race-play-area">
        <GameSurface ratio={3 / 2}>
          <div className="race-targets">
            {Array.from({ length: 6 }, (_, i) => (
              <button
                key={i}
                aria-label={`Target ${i + 1}`}
                aria-pressed={active && game.target === i}
                aria-description={
                  tapped === i
                    ? me?.result === "hit"
                      ? "Your correct hit"
                      : "Your scored tap"
                    : scored && game.target === i && game.rule === "hit"
                      ? "Correct target"
                      : undefined
                }
                className={`race-target ${active && game.target === i ? (game.rule === "hit" ? "lit" : "decoy") : ""} ${scored && game.target === i && game.rule === "hit" ? "intended" : ""} ${tapped === i ? (me?.result === "hit" ? "accepted" : "mistake") : ""}`}
                disabled={!playable}
                onPointerDown={(e) => {
                  touchTap.current = e.pointerType === "touch";
                  if (touchTap.current && e.isPrimary && playable) {
                    e.preventDefault();
                    tap(i);
                  }
                }}
                onClick={(e) => {
                  // Touch already scored on contact; keyboard/assistive clicks use detail 0.
                  if (e.detail === 0 || !touchTap.current) tap(i);
                }}
              >
                <strong>{i + 1}</strong>
                <span aria-hidden="true">
                  {tapped === i
                    ? me?.result === "hit"
                      ? "HIT"
                      : "TAPPED"
                    : active && game.target === i
                      ? game.rule === "hit"
                        ? "✦ TAP"
                        : "✕ HOLD"
                      : scored && game.target === i && game.rule === "hit"
                        ? "TARGET"
                        : "READY"}
                </span>
              </button>
            ))}
          </div>
        </GameSurface>
        <p
          className="race-feedback"
          data-result={me?.result ?? "spectator"}
          aria-live="polite"
        >
          {me && me.result !== "pending"
            ? `${resultText[me.result]}${gain !== null ? ` · +${gain} pts` : ""}${me.elapsed !== null ? ` · ${me.elapsed} ms` : ""}${me.result === "wrong" && game.rule === "hold" ? " · Hold means no taps" : me.result === "early" ? " · Wait for TAP or HOLD" : me.result === "miss" ? " · 0 pts" : ""}`
            : me
              ? "Ready for your cue"
              : game.phase !== "ready"
                ? "You’re watching. Join the next race."
                : "Hit the marked target when it lights up. Some rounds say Hold!"}
        </p>
      </div>
      <GameHelp>
        <p className="muted">
          Faster correct hits earn up to 100 points. Wrong or early taps cost
          25. Hold rounds earn 75 for leaving every target alone.
        </p>
        {!finished && standings.length > 0 && (
          <>
            <h3>Live standings</h3>
            <ol className="race-scores" aria-label="Live race scores">
              {standings.map((entry) => (
                <li key={entry.id}>
                  <span>
                    {playerName(players, entry.id)}
                    {entry.id === session.me.id ? " · You" : ""}
                    <small>
                      {resultText[entry.result]}
                      {entry.result === "hit" && entry.elapsed !== null
                        ? ` · +${raceHitPoints(entry.elapsed)} pts · ${entry.elapsed} ms`
                        : ""}
                    </small>
                  </span>
                  <strong>{entry.points} pts</strong>
                </li>
              ))}
            </ol>
          </>
        )}
      </GameHelp>
      {!!game.entries.length && (
        <ol className="race-scores" aria-label="Race scores">
          {standings.map((e) => (
            <li key={e.id} data-winner={finished && e.points === highest}>
              <b className="race-rank">
                #
                {1 +
                  game.entries.filter((other) => other.points > e.points)
                    .length}
              </b>
              <span>
                {playerName(players, e.id)}
                {e.id === session.me.id ? " · You" : ""}
                {["results", "finished"].includes(game.phase) && (
                  <small>
                    {finished
                      ? e.points === highest
                        ? "Winner"
                        : "Race complete"
                      : resultText[e.result]}
                    {!finished && e.elapsed !== null
                      ? ` · ${e.elapsed} ms`
                      : ""}
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
