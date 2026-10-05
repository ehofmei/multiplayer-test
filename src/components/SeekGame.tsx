import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { AppPanel, GameHelp } from "./AppLayout";
import {
  fitsSeek,
  placedSeekCells,
  seekCoordinate,
  seekPieces,
  validSeekLayout,
  type SeekPlacement,
  type SeekSeat,
  type SeekState,
} from "../games/seek";
import type { Player } from "../network/protocol";
import type { Session } from "../network/session";
function Board({
  seat,
  layout,
  preview,
  label,
}: {
  seat?: SeekSeat;
  layout: SeekPlacement[];
  preview?: SeekPlacement | null;
  label: string;
}) {
  const cells = new Map(
    layout.flatMap((p) => placedSeekCells(p).map((c) => [c, p.piece] as const)),
  );
  const shown = new Set(preview ? placedSeekCells(preview) : []);
  return (
    <svg
      className="seek-board"
      viewBox="0 0 330 330"
      role="img"
      aria-label={label}
    >
      {Array.from({ length: 10 }, (_, i) => (
        <g key={i} fill="#b8cedd" fontSize="10" textAnchor="middle">
          <text x={30 + i * 30} y="11">
            {i + 1}
          </text>
          <text x="7" y={33 + i * 30}>
            {String.fromCharCode(65 + i)}
          </text>
        </g>
      ))}
      {Array.from({ length: 100 }, (_, c) => {
        const piece = cells.get(c),
          mark = seat?.search[c] ?? "0",
          found = seat?.found.find((p) => placedSeekCells(p).includes(c));
        const identity = found?.piece ?? piece;
        const color =
          identity === undefined
            ? mark === "2"
              ? "#fff3aa"
              : "#192e46"
            : seekPieces[identity].color;
        return (
          <g
            key={c}
            transform={`translate(${16 + (c % 10) * 30} ${16 + Math.floor(c / 10) * 30})`}
          >
            <rect
              x="1"
              y="1"
              width="27"
              height="27"
              rx="3"
              fill={color}
              stroke={
                shown.has(c) || found
                  ? "#ffffff"
                  : mark === "2"
                    ? "#fff3aa"
                    : "#3b536e"
              }
              strokeWidth={shown.has(c) || found || mark === "2" ? 2 : 1}
            />
            <text
              x="14"
              y="19"
              textAnchor="middle"
              fontSize="17"
              fill={
                mark === "1" && identity === undefined ? "#b8cedd" : "#0e2034"
              }
            >
              {mark === "1"
                ? "×"
                : identity !== undefined
                  ? seekPieces[identity].symbol
                  : mark === "2"
                    ? "●"
                    : ""}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
export function SeekGame({
  game,
  players,
  session,
  connected,
}: {
  game: SeekState;
  players: Player[];
  session: Session;
  connected: boolean;
}) {
  const [layout, setLayout] = useState<SeekPlacement[]>([]),
    [piece, setPiece] = useState(0),
    [rotation, setRotation] = useState(0),
    [cell, setCell] = useState<number | null>(null),
    [selectionOpen, setSelectionOpen] = useState(false),
    [boardOpen, setBoardOpen] = useState(false),
    [quadrant, setQuadrant] = useState([0, 0]),
    [pending, setPending] = useState(false);
  const keyboardCell = useRef<number | null>(null);
  useLayoutEffect(() => {
    if (keyboardCell.current !== null) {
      document.getElementById(`seek-cell-${keyboardCell.current}`)?.focus();
      keyboardCell.current = null;
    }
  }, [cell, quadrant]);
  const me = game.seats.find((s) => s.id === session.me.id),
    opponent = game.seats.find((s) => s.id !== session.me.id),
    setup = game.phase === "setup",
    ready = game.phase === "ready",
    finished = game.phase === "finished",
    canPlace = connected && setup && !!me && !me.ready,
    canGuess =
      connected &&
      game.phase === "playing" &&
      game.current === session.me.id &&
      !!me &&
      !pending;
  const name = (id: string | null) =>
    players.find((p) => p.id === id)?.name ?? "Player";
  useEffect(() => {
    setCell(null);
    setPending(false);
    setSelectionOpen(false);
  }, [game.turn, game.phase]);
  useEffect(() => {
    if (me?.ready) {
      setPending(false);
      setSelectionOpen(false);
    }
  }, [me?.ready]);
  const preview: SeekPlacement | null =
    cell === null
      ? null
      : { piece, x: cell % 10, y: Math.floor(cell / 10), rotation };
  const fits = !!preview && fitsSeek(layout, preview);
  const ownLayout = me?.layout ?? layout;
  const last = game.last;
  const result = last
    ? `${last.player === session.me.id ? "You" : "Opponent"} · ${seekCoordinate(last.cell)} · ${last.result === "found" ? `${seekPieces[last.piece!].name} found!` : last.result === "hit" ? "Hit!" : "Miss"}`
    : "Find five pieces · hits never give extra turns.";
  const status = !connected
    ? "Host disconnected"
    : ready
      ? "Hide five shapes. Find every glowing tile."
      : finished
        ? `${game.winner === session.me.id ? "You win!" : `${name(game.winner)} wins!`}`
        : game.phase === "paused"
          ? "Paused · layouts and turn are safe."
          : game.phase === "countdown" || game.phase === "reorient"
            ? `Get ready · ${Math.ceil(game.remaining / 1000)}`
            : !me
              ? "Watching · join the next match."
              : setup
                ? me.ready
                  ? `Ready confirmed · ${opponent?.ready ? "both ready" : "waiting for opponent"}`
                  : `${layout.length}/5 placed · arrange your secret board`
                : pending
                  ? "Sending · waiting for host"
                  : canGuess
                    ? "Your turn · select a cell, then Illuminate"
                    : "Opponent’s turn · watch for their light";
  const selectPiece = (i: number) => {
    setPiece(i);
    const p = layout.find((p) => p.piece === i);
    setRotation(p?.rotation ?? 0);
    setCell(p ? p.y * 10 + p.x : null);
    if (p) setQuadrant([p.x >= 5 ? 1 : 0, p.y >= 5 ? 1 : 0]);
  };
  const place = () => {
    if (canPlace && !pending && fits && preview) {
      setLayout([...layout.filter((p) => p.piece !== piece), preview]);
      setCell(null);
      setSelectionOpen(false);
    }
  };
  const illuminate = () => {
    if (canGuess && cell !== null && opponent?.search[cell] === "0") {
      setPending(true);
      session.guessSeek(game.turn, cell);
      setSelectionOpen(false);
    }
  };
  const tray = (
    <div className="seek-tray" role="group" aria-label="Your five pieces">
      {seekPieces.map((p, i) => (
        <button
          key={i}
          className="secondary"
          aria-pressed={piece === i}
          disabled={!canPlace || pending}
          onClick={() => selectPiece(i)}
        >
          <span style={{ color: p.color }}>{p.symbol}</span>
          <span>
            {p.name}
            <small>
              {layout.some((q) => q.piece === i)
                ? "Placed · edit"
                : `${p.cells.length} tiles`}
            </small>
          </span>
        </button>
      ))}
    </div>
  );
  const placementActions = (
    <div className="seek-actions">
      <button
        className="secondary"
        disabled={!canPlace || pending}
        onClick={() => setRotation((r) => (r + 1) % 4)}
      >
        Rotate
      </button>
      <button disabled={!canPlace || pending || !fits} onClick={place}>
        Place piece
      </button>
    </div>
  );
  const target = canPlace || setup ? me : opponent;
  const boardLayout = setup ? ownLayout : (opponent?.found ?? []);
  return (
    <section
      className="games-card seek-game-card"
      data-phase={game.phase}
      aria-label="Light Seek"
    >
      <div className="seek-top">
        <strong>
          {ready
            ? "LIGHT SEEK"
            : setup
              ? "Secret setup"
              : finished
                ? "All five found"
                : `Turn ${game.turn}`}
        </strong>
        <span>
          {ready
            ? "Exactly 2 players"
            : me
              ? `Opponent ${opponent?.ready ? "ready" : "placing"}`
              : "Spectator"}
        </span>
      </div>
      <p className="seek-status" aria-live="polite">
        {status}
      </p>
      <div className="seek-workspace">
        <div className="seek-art">
          {finished ? (
            <div className="seek-final-boards">
              {game.seats.map((s) => (
                <div key={s.id}>
                  <strong>
                    {s.id === session.me.id ? "Your board" : name(s.id)}
                  </strong>
                  <Board
                    seat={s}
                    layout={s.layout ?? []}
                    label={`${name(s.id)} complete board`}
                  />
                </div>
              ))}
            </div>
          ) : (
            <Board
              seat={target}
              layout={
                ready
                  ? [
                      { piece: 0, x: 1, y: 1, rotation: 0 },
                      { piece: 4, x: 5, y: 5, rotation: 0 },
                    ]
                  : boardLayout
              }
              preview={canPlace ? preview : null}
              label={
                setup ? "Your secret board preview" : "Opponent search board"
              }
            />
          )}
        </div>
        <div className="seek-controls">
          {ready ? (
            <p>
              Arrange five colored shapes in secret. Take turns lighting cells.
              The first to find all five wins.
            </p>
          ) : setup && me ? (
            <>
              {tray}
              <button
                disabled={!canPlace || pending}
                onClick={() => setSelectionOpen(true)}
              >
                Choose anchor
              </button>
              <button
                disabled={!canPlace || pending || !validSeekLayout(layout)}
                onClick={() => {
                  setPending(true);
                  session.readySeek(layout);
                }}
              >
                Ready
              </button>
            </>
          ) : (
            <>
              <div className="seek-tracker" aria-label="Found pieces">
                {seekPieces.map((p, i) => (
                  <span
                    key={i}
                    data-found={opponent?.found.some((q) => q.piece === i)}
                    aria-label={`${p.name}: ${opponent?.found.some((q) => q.piece === i) ? "found" : "hidden"}`}
                  >
                    <b style={{ color: p.color }}>{p.symbol}</b>
                    {p.cells.length}
                  </span>
                ))}
              </div>
              <p className="seek-result" aria-live="polite">
                {result}
              </p>
              {!finished && (
                <>
                  <button
                    disabled={!canGuess}
                    onClick={() => setSelectionOpen(true)}
                  >
                    Select cell
                  </button>
                  <button
                    disabled={
                      !canGuess ||
                      cell === null ||
                      opponent?.search[cell] !== "0"
                    }
                    onClick={illuminate}
                  >
                    Illuminate{cell !== null ? ` ${seekCoordinate(cell)}` : ""}
                  </button>
                </>
              )}
            </>
          )}
        </div>
      </div>
      <div className="seek-footer">
        <GameHelp label="Help">
          <p>
            Exactly two players. Start opens manual setup; there are no time
            limits and no automatic placements or guesses. Select a shape,
            Choose anchor, tap a square, Rotate and Place piece. To move a
            placed piece, select it again. Pieces may touch, but never overlap.
            Ready locks all five legal shapes after host confirmation.
          </p>
          <p>
            Both Ready actions begin a short countdown. On your turn, Select
            cell and Illuminate. A miss is ×; an ordinary hit is ● and keeps the
            piece’s identity secret. Its last hit reveals the whole colored
            shape and symbol. Turns alternate after every guess. Find all five
            first to win immediately.
          </p>
          <p>
            Example: B7 means row B, column 7. The selection panel uses four 5×5
            areas for large touch targets. Arrow keys navigate the full board, R
            rotates in setup, Enter places or illuminates. Close keeps your
            preview; selecting a cell alone never submits a guess.
          </p>
          <p>
            My board shows incoming guesses. Spectators see only public search
            results and found pieces. Pause preserves readiness, layouts and the
            turn; Resume adds a countdown. Stop returns to setup. A participant
            disconnect resets the match; a spectator can leave without stopping
            play. Update every device before playing Light Seek. Sound is
            optional and muted by default.
          </p>
        </GameHelp>
        {!ready && (
          <button className="secondary" onClick={() => setBoardOpen(true)}>
            {me ? "My board" : "Boards"}
          </button>
        )}
        {session.role === "host" &&
          (ready || finished ? (
            <button
              disabled={players.length !== 2}
              onClick={() => session.startSeek()}
            >
              {finished ? "Seek Again" : "Start Seek"}
            </button>
          ) : (
            <>
              <button
                className="secondary"
                onClick={() =>
                  game.phase === "paused"
                    ? session.resumeSeek()
                    : session.pauseGames()
                }
              >
                {game.phase === "paused" ? "Resume" : "Pause"}
              </button>
              <button
                className="quiet"
                onClick={() => session.selectGame("seek")}
              >
                Stop
              </button>
            </>
          ))}
      </div>
      <AppPanel
        title={setup ? "Place your shape" : "Illuminate a cell"}
        open={selectionOpen}
        onClose={() => setSelectionOpen(false)}
      >
        {setup && tray}
        <p>
          {setup
            ? `${seekPieces[piece].name} · rotation ${rotation * 90}°`
            : "Select an unsearched cell. Confirm to send."}
        </p>
        <div className="seek-quadrants" role="group" aria-label="Board area">
          {[
            [0, 0],
            [1, 0],
            [0, 1],
            [1, 1],
          ].map(([x, y]) => (
            <button
              key={`${x}${y}`}
              className="secondary"
              aria-pressed={quadrant[0] === x && quadrant[1] === y}
              onClick={() => setQuadrant([x, y])}
            >
              {y ? "F–J" : "A–E"} · {x ? "6–10" : "1–5"}
            </button>
          ))}
        </div>
        <div
          className="seek-zoom"
          role="group"
          aria-label="Zoomed grid"
          onKeyDown={(e) => {
            if (!canPlace && !canGuess) return;
            if (e.key.toLowerCase() === "r" && canPlace) {
              e.preventDefault();
              setRotation((r) => (r + 1) % 4);
            }
            if (e.key === "Enter") {
              e.preventDefault();
              if (setup) place();
              else illuminate();
            }
            const delta = {
              ArrowLeft: -1,
              ArrowRight: 1,
              ArrowUp: -10,
              ArrowDown: 10,
            }[e.key];
            if (delta !== undefined) {
              e.preventDefault();
              const next = Math.max(
                0,
                Math.min(
                  99,
                  (cell ?? quadrant[1] * 50 + quadrant[0] * 5) + delta,
                ),
              );
              keyboardCell.current = next;
              setCell(next);
              setQuadrant([next % 10 >= 5 ? 1 : 0, next >= 50 ? 1 : 0]);
            }
          }}
        >
          {Array.from({ length: 25 }, (_, i) => {
            const c =
              (quadrant[1] * 5 + Math.floor(i / 5)) * 10 +
              quadrant[0] * 5 +
              (i % 5);
            const placed = setup
              ? layout.find((p) => placedSeekCells(p).includes(c))
              : opponent?.found.find((p) => placedSeekCells(p).includes(c));
            const mark = setup ? "0" : (opponent?.search[c] ?? "0");
            const shown =
              setup && preview && placedSeekCells(preview).includes(c);
            const accessible = setup
              ? placed
                ? seekPieces[placed.piece].name
                : "empty"
              : mark === "1"
                ? "miss"
                : mark === "2"
                  ? placed
                    ? `${seekPieces[placed.piece].name} found`
                    : "hit"
                  : "unsearched";
            return (
              <button
                id={`seek-cell-${c}`}
                key={c}
                className="seek-cell"
                data-preview={shown}
                data-invalid={shown && !fits}
                aria-label={`${seekCoordinate(c)}, ${accessible}`}
                aria-pressed={cell === c}
                disabled={(!canPlace && !canGuess) || pending}
                tabIndex={
                  c === (cell ?? quadrant[1] * 50 + quadrant[0] * 5) ? 0 : -1
                }
                style={{
                  background: placed
                    ? seekPieces[placed.piece].color
                    : mark === "2"
                      ? "#fff3aa"
                      : undefined,
                }}
                onClick={() => setCell(c)}
              >
                <small>{seekCoordinate(c)}</small>
                <span>
                  {placed
                    ? seekPieces[placed.piece].symbol
                    : mark === "1"
                      ? "×"
                      : mark === "2"
                        ? "●"
                        : "·"}
                </span>
              </button>
            );
          })}
        </div>
        <p className="seek-selection" aria-live="polite">
          {cell === null
            ? "Tap a square to preview."
            : setup
              ? `${seekCoordinate(cell)} · ${fits ? "Fits" : "Overlap or outside board"}`
              : `${seekCoordinate(cell)} · ${opponent?.search[cell] === "0" ? "unsearched" : "already searched"}`}
        </p>
        {setup ? (
          placementActions
        ) : (
          <button
            disabled={
              !canGuess || cell === null || opponent?.search[cell] !== "0"
            }
            onClick={illuminate}
          >
            Illuminate{cell !== null ? ` ${seekCoordinate(cell)}` : ""}
          </button>
        )}
      </AppPanel>
      <AppPanel
        title={me ? "My board" : "Public boards"}
        open={boardOpen}
        onClose={() => setBoardOpen(false)}
      >
        {(me ? [me] : game.seats).map((s) => (
          <div key={s.id}>
            <p>
              {name(s.id)} · {s.found.length}/5 found by opponent
            </p>
            <Board
              seat={s}
              layout={s.id === session.me.id ? ownLayout : s.found}
              label={`${name(s.id)} board with incoming guesses`}
            />
          </div>
        ))}
        <p>
          × Miss · ● Hit · gold borders mark hits on your shapes. White borders
          mark found pieces.
        </p>
      </AppPanel>
    </section>
  );
}
