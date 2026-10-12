import { useEffect, useRef } from "react";
import type { GridState } from "../game/grid";
import { changedLights } from "../game/lights-feedback";
import type { Session } from "../network/session";

export function LightsGame({
  grid,
  connected,
  session,
}: {
  grid: GridState;
  connected: boolean;
  session: Session;
}) {
  const board = useRef<HTMLDivElement>(null);
  const previous = useRef<GridState | null>(null);
  const effects = useRef(new Map<number, Animation>());
  useEffect(() => {
    const active = effects.current;
    const reset = () => {
      previous.current = null;
      for (const effect of active.values()) effect.cancel();
      active.clear();
    };
    document.addEventListener("visibilitychange", reset);
    window.addEventListener("pageshow", reset);
    return () => {
      document.removeEventListener("visibilitychange", reset);
      window.removeEventListener("pageshow", reset);
      reset();
    };
  }, []);
  useEffect(() => {
    const changed = changedLights(previous.current, grid);
    previous.current =
      connected && !document.hidden
        ? { revision: grid.revision, cells: [...grid.cells] }
        : null;
    if (!connected || document.hidden) {
      for (const effect of effects.current.values()) effect.cancel();
      effects.current.clear();
      return;
    }
    const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
    for (const index of changed) {
      const lens = board.current?.children[index]?.querySelector(".light");
      if (!lens) continue;
      effects.current.get(index)?.cancel();
      const effect = lens.animate(
        [
          { outlineColor: "#ffe6a0" },
          { outlineColor: reduced ? "#ffe6a0" : "transparent" },
        ],
        { duration: 320, easing: "ease-out" },
      );
      effects.current.set(index, effect);
      effect.onfinish = () => {
        if (effects.current.get(index) === effect)
          effects.current.delete(index);
      };
    }
  }, [grid, connected]);

  return (
    <section className="board-card lights-board" aria-label="Shared grid">
      <div className="board-heading">
        <h2>Light board</h2>
      </div>
      <p className="board-note">
        {connected
          ? "Tap a light to switch it for everyone."
          : "Pair with a host to activate the board."}
      </p>
      <div className="grid" ref={board}>
        {grid.cells.map((on, index) => (
          <button
            key={index}
            className={on ? "cell on" : "cell"}
            aria-label={`Cell ${index + 1}`}
            aria-pressed={on}
            disabled={!connected}
            onClick={() => session.toggle(index)}
          >
            <span className="light" aria-hidden="true" />
            <span className="lamp-label">
              <span className="lamp-number">{index + 1}</span>
              <span className="cell-state">{on ? "ON" : "OFF"}</span>
            </span>
          </button>
        ))}
      </div>
    </section>
  );
}
