import { useEffect, useRef, useState } from "react";
import { AppPanel, GameHelp } from "./AppLayout";
import {
  fitsPiece,
  pieceCells,
  picnicScore,
  type Piece,
  type PicnicState,
  type Placement,
} from "../games/picnic";
import type { Player } from "../network/protocol";
import type { Session } from "../network/session";
export const foodNames = ["Empty", "Strawberry", "Cheese", "Grapes"];
const bonusLabels = {
  corners: "Strawberry corners · 3 each",
  border: "Cheese border · 1 each",
  center: "Grape center · 2 each",
};
const shapeNames = {
  single: "Single",
  domino: "Domino",
  line: "Line",
  corner: "Corner",
  square: "Square",
  ell: "Long L",
};
function FoodArt({ food }: { food: number }) {
  return (
    <svg viewBox="0 0 40 40" aria-hidden="true" className="picnic-food">
      {food === 1 ? (
        <>
          <path d="M8 14Q20 7 32 14Q33 26 20 35Q7 26 8 14" fill="#a82f46" />
          <path d="M11 13L16 6L20 10L25 5L29 13" fill="#265c3b" />
          {[
            [15, 19],
            [25, 19],
            [20, 26],
          ].map(([x, y]) => (
            <ellipse key={x} cx={x} cy={y} rx="1.5" ry="2" fill="#fff4d1" />
          ))}
        </>
      ) : food === 2 ? (
        <>
          <path
            d="M6 29V14L28 6L35 27Z"
            fill="#e7b545"
            stroke="#7d531c"
            strokeWidth="2"
          />
          <path
            d="M6 14L35 18V27"
            fill="none"
            stroke="#7d531c"
            strokeWidth="2"
          />
          <circle cx="17" cy="21" r="3" fill="#a66b21" />
          <circle cx="28" cy="23" r="2" fill="#a66b21" />
        </>
      ) : (
        <>
          <path
            d="M19 9Q20 3 27 4"
            fill="none"
            stroke="#265c3b"
            strokeWidth="3"
          />
          {[
            [14, 13],
            [25, 13],
            [10, 22],
            [20, 22],
            [30, 22],
            [15, 30],
            [25, 30],
            [20, 36],
          ].map(([x, y]) => (
            <circle
              key={`${x}-${y}`}
              cx={x}
              cy={y}
              r="5"
              fill="#427349"
              stroke="#edf4dd"
              strokeWidth="1"
            />
          ))}
        </>
      )}
    </svg>
  );
}
function PieceArt({ piece }: { piece: Piece }) {
  const cells = pieceCells(piece.shape, 0);
  return (
    <svg viewBox="0 0 120 90" aria-hidden="true" className="picnic-piece">
      {cells.map(([x, y]) => (
        <g
          key={`${x}-${y}`}
          transform={`translate(${(x + 0.5) * 28} ${(y + 0.15) * 28})`}
        >
          <rect
            width="25"
            height="25"
            rx="5"
            fill={
              piece.food === 1
                ? "#f5d3d6"
                : piece.food === 2
                  ? "#fae7ad"
                  : "#d3e7c2"
            }
          />
          <svg width="25" height="25" viewBox="0 0 40 40">
            <FoodArt food={piece.food} />
          </svg>
        </g>
      ))}
    </svg>
  );
}
function MiniBlanket({ board }: { board: string }) {
  return (
    <div className="picnic-mini" aria-label="Picnic blanket preview">
      {[...board].map((c, i) => (
        <span key={i} data-food={c}>
          {c !== "0" && <FoodArt food={Number(c)} />}
        </span>
      ))}
    </div>
  );
}
export function PicnicGame({
  game,
  players,
  session,
  connected,
}: {
  game: PicnicState;
  players: Player[];
  session: Session;
  connected: boolean;
}) {
  const [option, setOption] = useState<number | null>(null),
    [anchor, setAnchor] = useState<number | null>(null),
    [rotation, setRotation] = useState(0),
    [scoresOpen, setScoresOpen] = useState(false),
    [arrangeOpen, setArrangeOpen] = useState(false);
  const [compact, setCompact] = useState(
    () => matchMedia("(max-height: 650px)").matches,
  );
  const cardRef = useRef<HTMLElement>(null);
  useEffect(() => {
    const card = cardRef.current!;
    const measure = () => {
      const rect = card.getBoundingClientRect();
      setCompact(rect.height < (rect.width <= 650 ? 600 : 410));
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(card);
    return () => observer.disconnect();
  }, []);
  useEffect(() => {
    setOption(null);
    setAnchor(null);
    setRotation(0);
    setArrangeOpen(false);
  }, [game.round]);
  const me = game.picnickers.find((p) => p.id === session.me.id),
    ready = game.phase === "ready",
    finished = game.phase === "finished";
  const active = connected && game.phase === "placing" && !!me && !me.locked;
  const board = me?.board ?? "0".repeat(36);
  const score = picnicScore(board, game.bonus);
  const placement: Placement | null =
    option === null || anchor === null
      ? null
      : { option, x: anchor % 6, y: Math.floor(anchor / 6), rotation };
  const piece = option === null ? null : game.offer[option];
  const fits = !!placement && !!piece && fitsPiece(board, piece, placement);
  const preview =
    active && piece && placement
      ? pieceCells(piece.shape, rotation).map(([x, y]) => ({
          x: x + placement.x,
          y: y + placement.y,
        }))
      : [];
  const name = (id: string) =>
    players.find((p) => p.id === id)?.name ?? "Picnicker";
  const sorted = [...game.picnickers].sort(
    (a, b) =>
      picnicScore(b.board, game.bonus).total -
      picnicScore(a.board, game.bonus).total,
  );
  const winners = sorted.filter(
    (p) =>
      picnicScore(p.board, game.bonus).total ===
      picnicScore(sorted[0].board, game.bonus).total,
  );
  const locked = game.picnickers.filter((p) => p.locked).length;
  const status = !connected
    ? "Host disconnected"
    : ready
      ? "Fit food. Match neighbors. Complete rows."
      : finished
        ? winners.length > 1
          ? `${winners.length} picnickers share the win!`
          : `${name(winners[0].id)} wins!`
        : game.phase === "paused"
          ? "Paused · your blanket and locks are safe."
          : game.phase === "countdown" || game.phase === "reorient"
            ? `Get ready · ${Math.ceil(game.remaining / 1000)}`
            : !me
              ? "You’re watching. Join the next picnic."
              : game.phase === "reveal"
                ? me.outcome === "placed"
                  ? `+${me.gain} points${me.rows.length ? ` · ${me.rows.length} row${me.rows.length > 1 ? "s" : ""} completed!` : " · nicely packed!"}`
                  : me.outcome === "timeout"
                    ? "Time ran out · skipped this round."
                    : "Skipped · a fresh offer is coming."
                : me.locked
                  ? `Placement confirmed · ${locked}/${game.picnickers.length} locked`
                  : option === null
                    ? "Choose a piece, then tap its top-left anchor."
                    : anchor === null
                      ? "Tap a blanket square to preview your piece."
                      : fits
                        ? "It fits! Place it to lock your choice."
                        : "Blocked or off the blanket · move or rotate.";
  const reset = () => {
    setOption(null);
    setAnchor(null);
    setRotation(0);
  };
  const place = () => {
    if (active && fits && placement) {
      session.placePicnic(game.round, placement);
      setArrangeOpen(false);
    }
  };
  const grid = (
    <div
      className="picnic-grid"
      role="group"
      aria-label="Your picnic blanket"
      onKeyDown={(e) => {
        if (!active) return;
        if (e.key.toLowerCase() === "r") {
          e.preventDefault();
          setRotation((r) => (r + 1) % 4);
        }
        if (e.key === "Enter" && fits) {
          e.preventDefault();
          place();
        }
        const delta = {
          ArrowLeft: -1,
          ArrowRight: 1,
          ArrowUp: -6,
          ArrowDown: 6,
        }[e.key];
        if (delta !== undefined) {
          e.preventDefault();
          const index = Math.max(0, Math.min(35, (anchor ?? 0) + delta));
          setAnchor(index);
          (e.currentTarget.children[index] as HTMLButtonElement)?.focus();
        }
      }}
    >
      {[...board].map((food, i) => {
        const x = i % 6,
          y = Math.floor(i / 6),
          shown = preview.some((c) => c.x === x && c.y === y);
        return (
          <button
            key={i}
            className="picnic-cell"
            data-food={food}
            data-preview={shown}
            data-invalid={shown && !fits}
            data-bonus={
              game.bonus === "corners"
                ? (x === 0 || x === 5) && (y === 0 || y === 5)
                : game.bonus === "border"
                  ? x === 0 || x === 5 || y === 0 || y === 5
                  : (x === 2 || x === 3) && (y === 2 || y === 3)
            }
            data-row={game.phase === "reveal" && me?.rows.includes(y)}
            aria-label={`Row ${y + 1}, column ${x + 1}, ${foodNames[Number(food)]}${shown ? ", preview" : ""}`}
            aria-pressed={active && anchor === i}
            disabled={!active}
            tabIndex={i === (anchor ?? 0) ? 0 : -1}
            onClick={() => setAnchor(i)}
          >
            {(food !== "0" || shown) && (
              <FoodArt food={food !== "0" ? Number(food) : piece!.food} />
            )}
          </button>
        );
      })}
    </div>
  );
  const options = (
    <div className="picnic-options" role="group" aria-label="Food pieces">
      {game.offer.map((p, i) => (
        <button
          key={i}
          aria-label={`Piece ${i + 1}: ${foodNames[p.food]} ${shapeNames[p.shape]}`}
          aria-pressed={option === i}
          disabled={!active}
          onClick={() => {
            setOption(i);
            setRotation(0);
          }}
        >
          <PieceArt piece={p} />
          <span>
            {i + 1} · {shapeNames[p.shape]}
          </span>
        </button>
      ))}
    </div>
  );
  const actions = (
    <div className="picnic-actions">
      <button
        className="secondary"
        disabled={!active || option === null}
        onClick={() => setRotation((r) => (r + 1) % 4)}
      >
        Rotate
      </button>
      <button
        className="quiet"
        disabled={!active || option === null}
        onClick={reset}
      >
        Reset
      </button>
      <button disabled={!active || !fits} onClick={place}>
        Place
      </button>
      <button
        className="quiet"
        disabled={!active}
        onClick={() => {
          session.placePicnic(game.round, null);
          setArrangeOpen(false);
        }}
      >
        Skip
      </button>
    </div>
  );
  const standings = (
    <ol className="picnic-standings">
      {sorted.map((p) => {
        const s = picnicScore(p.board, game.bonus);
        return (
          <li key={p.id}>
            <h3>
              {name(p.id)}
              {p.id === session.me.id ? " · You" : ""}{" "}
              <strong>{finished ? s.total : s.base} points</strong>
            </h3>
            <MiniBlanket board={p.board} />
            <p>
              {s.cells} cells + {s.edges} matching edges + {s.rows * 6} rows
              {finished
                ? ` + ${s.bonus} bonus = ${s.total}`
                : ` · bonus so far ${s.bonus}`}
            </p>
          </li>
        );
      })}
    </ol>
  );
  return (
    <section
      ref={cardRef}
      className="games-card picnic-game-card"
      data-phase={game.phase}
      data-compact={compact}
      aria-label="Patchwork Picnic"
    >
      <div className="picnic-top">
        <strong>
          {ready ? "Your picnic blanket" : `Round ${game.round}/10`}
        </strong>
        <span>
          {ready
            ? "2–8 players"
            : finished
              ? `${score.total} points`
              : `${score.base} pts · bonus ${score.bonus} · ${game.phase === "paused" ? "Paused" : `${Math.ceil(game.remaining / 1000)}s`}`}
        </span>
      </div>
      <div className="picnic-bonus">
        {ready ? "A shared bonus is drawn at Start" : bonusLabels[game.bonus]}
      </div>
      <div className="picnic-workspace">
        <div className="picnic-blanket">
          {compact || ready ? (
            <MiniBlanket
              board={ready ? "110000100000000220000220000003000003" : board}
            />
          ) : (
            grid
          )}
        </div>
        <div className="picnic-controls">
          <p className="picnic-status" aria-live="polite">
            {status}
          </p>
          {ready ? (
            <p className="picnic-intro">
              Everyone gets the same three shapes. Build your own delicious
              puzzle over ten rounds.
            </p>
          ) : finished ? (
            <div className="picnic-final">
              <strong>
                {score.cells} cells + {score.edges} matches + {score.rows * 6}{" "}
                rows + {score.bonus} bonus
              </strong>
              <p>See every blanket in Standings.</p>
            </div>
          ) : compact ? (
            <button disabled={!active} onClick={() => setArrangeOpen(true)}>
              {me?.locked ? "Choice locked" : "Arrange piece"}
            </button>
          ) : (
            <>
              {options}
              {actions}
              <small className="picnic-progress">
                {locked}/{game.picnickers.length} locked · same offer for
                everyone
              </small>
            </>
          )}
        </div>
      </div>
      <div className="picnic-footer">
        <GameHelp label="Help">
          <p>
            Choose one of the three pieces, tap a top-left anchor, Rotate, then
            Place. Reset clears your preview. Skip keeps your blanket unchanged.
            Choices stay local until you commit, and placements appear together
            at the reveal.
          </p>
          <p>
            Every occupied cell earns 1 point. Each matching food edge earns 1;
            diagonals do not count. Each full row earns 6. Rows stay on the
            blanket. Example: a strawberry domino earns 2 for its cells and 1
            for its own matching edge, plus any new strawberry neighbors.
          </p>
          <p>
            The shared bonus rewards strawberry corners (3 each), cheese on the
            border (1 each), or grapes in the middle four squares (2 each). Its
            projected value is shown during play and added once at the end.
            Highest total wins; ties share victory.
          </p>
          <p>
            Ten rounds, with up to 15 seconds to place and a short reveal.
            Missing a choice skips that round. Later offers always include a
            single square. Nobody takes your piece, and speed earns no extra
            points.
          </p>
          <p>
            Keyboard: Tab to choose a piece or the board, arrows to move the
            anchor, R to rotate, Enter on the board to Place. You can also Tab
            to every action. On short screens, Arrange piece opens a scrollable
            placement panel with full-size squares.
          </p>
          <p>
            Pause preserves your blanket, offer and committed choices. Resume
            gives a short countdown. Late arrivals watch until the next match; a
            participant leaving resets setup. Update the app on every device
            before playing Patchwork Picnic.
          </p>
        </GameHelp>
        <button className="secondary" onClick={() => setScoresOpen(true)}>
          Standings
        </button>
        {session.role === "host" &&
          (ready || finished ? (
            <button
              disabled={players.length < 2}
              onClick={() => session.startPicnic()}
            >
              {finished ? "Picnic Again" : "Start Picnic"}
            </button>
          ) : (
            <>
              <button
                className="secondary"
                onClick={() =>
                  game.phase === "paused"
                    ? session.resumePicnic()
                    : session.pauseGames()
                }
              >
                {game.phase === "paused" ? "Resume" : "Pause"}
              </button>
              <button
                className="quiet"
                onClick={() => session.selectGame("picnic")}
              >
                Stop
              </button>
            </>
          ))}
      </div>
      <AppPanel
        title="Picnic standings"
        open={scoresOpen}
        onClose={() => setScoresOpen(false)}
      >
        {ready ? (
          <p>{players.length} connected · at least two needed.</p>
        ) : (
          standings
        )}
      </AppPanel>
      <AppPanel
        title="Arrange your picnic"
        open={arrangeOpen}
        onClose={() => setArrangeOpen(false)}
      >
        <p>{status}</p>
        {options}
        {grid}
        {actions}
        <p>Bonus: {bonusLabels[game.bonus]}</p>
      </AppPanel>
    </section>
  );
}
