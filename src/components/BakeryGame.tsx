import { useEffect, useRef, useState, type CSSProperties } from "react";
import { AppPanel, GameHelp } from "./AppLayout";
import {
  bakeryCards,
  bakeryMenu,
  bakeryCounts,
  bakeryScore,
  bakeryBreakdown,
  type BakeryCard,
  type BakeryState,
} from "../games/bakery";
import { bakeryPass, bakeryReward } from "../games/bakery-feedback";
import type { Player } from "../network/protocol";
import type { Session } from "../network/session";

// Small local vector characters keep the game crisp and available offline.
export function TreatArt({ card }: { card: BakeryCard }) {
  const color = bakeryMenu[card].color;
  return (
    <svg
      viewBox="0 0 120 90"
      aria-hidden="true"
      className="treat-art"
      data-treat={card}
    >
      <ellipse cx="60" cy="80" rx="36" ry="5" fill="#382944" opacity=".12" />
      {card === "cookie" ? (
        <>
          <circle
            cx="60"
            cy="43"
            r="32"
            fill={color}
            stroke="#725235"
            strokeWidth="3"
          />
          <path
            d="M39 24l5 4m33 29l6 3M43 65l5-3M70 20l3 5"
            stroke="#725235"
            strokeWidth="5"
            strokeLinecap="round"
          />
        </>
      ) : card === "jelly" ? (
        <path
          d="M26 69Q23 62 31 53L36 30Q39 11 60 11Q81 11 84 30L89 53Q98 70 86 73H34Z"
          fill={color}
          stroke="#874566"
          strokeWidth="3"
        />
      ) : card === "cupcake" ? (
        <>
          <path
            d="M35 48h50l-8 30H43Z"
            fill="#ba835c"
            stroke="#725235"
            strokeWidth="3"
          />
          <path
            d="M27 47Q22 33 38 30Q32 17 50 17Q60 1 71 17Q90 15 86 31Q102 34 92 48Z"
            fill={color}
            stroke="#446d8a"
            strokeWidth="3"
          />
          <path d="M49 58l2 12m20-12l-2 12" stroke="#f5dfb7" strokeWidth="3" />
        </>
      ) : card === "sprinkles" ? (
        <>
          <path
            d="M33 19h54v52Q60 87 33 71Z"
            fill={color}
            stroke="#65558d"
            strokeWidth="3"
          />
          <ellipse
            cx="60"
            cy="19"
            rx="27"
            ry="9"
            fill="#fff2d8"
            stroke="#65558d"
            strokeWidth="3"
          />
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <path
              key={i}
              d={`M${38 + i * 8} ${12 + (i % 2) * 7}l4 3`}
              stroke={i % 2 ? "#bd4c79" : "#426e63"}
              strokeWidth="3"
            />
          ))}
        </>
      ) : (
        <>
          <path
            d="M30 36L18 19l28 6Q60 13 74 25l28-6-12 17v26Q60 89 30 62Z"
            fill={color}
            stroke="#47653a"
            strokeWidth="3"
          />
          <path d="M94 42v35" stroke="#725235" strokeWidth="5" />
          <ellipse
            cx="94"
            cy="36"
            rx="7"
            ry="11"
            fill="#e4d9c8"
            stroke="#725235"
            strokeWidth="2"
          />
        </>
      )}
      <path
        d="M42 25Q50 17 59 19"
        stroke="white"
        strokeWidth="5"
        strokeLinecap="round"
        opacity=".5"
        fill="none"
      />
      {[48, 72].map((x) => (
        <g key={x}>
          <ellipse cx={x} cy="42" rx="9" ry="10" fill="white" />
          <circle cx={x + 2} cy="44" r="4" fill="#382944" />
        </g>
      ))}
      <path
        d={
          card === "cupcake"
            ? "M54 60Q60 47 66 60Q60 67 54 60"
            : "M51 59Q60 69 69 58"
        }
        fill={card === "cupcake" ? "#382944" : "none"}
        stroke="#382944"
        strokeWidth="3"
        strokeLinecap="round"
      />
    </svg>
  );
}
export function BakeryGame({
  game,
  players,
  session,
  connected,
}: {
  game: BakeryState;
  players: Player[];
  session: Session;
  connected: boolean;
}) {
  const [selected, setSelected] = useState<number | null>(null);
  const [scoresOpen, setScoresOpen] = useState(false);
  useEffect(() => setSelected(null), [game.round, game.pick, game.phase]);
  const me = game.bakers.find((b) => b.id === session.me.id);
  const name = (id: string) =>
    players.find((p) => p.id === id)?.name ?? "Player";
  const total = (b: (typeof game.bakers)[number]) =>
    b.banked + bakeryScore(b.treats);
  const highest = Math.max(0, ...game.bakers.map(total));
  const winners = game.bakers.filter((b) => total(b) === highest);
  const finished = game.phase === "finished";
  const results = finished || game.phase === "round-results";
  const active = connected && game.phase === "picking" && !!me && !me.locked;
  const chosen = selected !== null ? me?.hand?.[selected] : undefined;
  const ready = game.bakers.filter((b) => b.locked).length;
  const counts = bakeryCounts(me?.treats ?? []);
  const pass = bakeryPass(game, session.me.id, name);
  const revealedCount = game.bakers.reduce(
    (sum, b) => sum + b.treats.length,
    0,
  );
  const previousReveal = useRef({ round: game.round, count: revealedCount });
  const [freshReveal, setFreshReveal] = useState(false);
  useEffect(() => {
    setFreshReveal(
      previousReveal.current.round === game.round &&
        revealedCount > previousReveal.current.count,
    );
    previousReveal.current = { round: game.round, count: revealedCount };
  }, [game.round, revealedCount]);
  const status = !connected
    ? "Host disconnected"
    : game.phase === "ready"
      ? "The ovens are ready. Are you?"
      : finished
        ? winners.length > 1
          ? `${winners.length} bakers share the win!`
          : `${name(winners[0].id)} wins!`
        : game.phase === "paused"
          ? `Bakery paused${!me ? " · You’re watching." : ""}`
          : game.phase === "round-results"
            ? "Batch one baked!"
            : game.phase === "reveal"
              ? game.reversed
                ? game.bakers.length === 2
                  ? "Spoon gremlin! Keep your hands this time!"
                  : "Spoon gremlin! Passing reverses!"
                : pass.gremlins
                  ? `${pass.gremlins} spoon gremlins cancel! Passing stays the same.`
                  : "Fresh treats! Everyone reveals."
              : !me
                ? "You’re watching. Join the next game."
                : me.locked
                  ? `Your pick is locked · ${ready}/${game.bakers.length} ready`
                  : "Pick one treat. What will you bake?";
  const scoreboard = (
    <ol className="bakery-scores" aria-label="Bakery scores">
      {[...game.bakers]
        .sort((a, b) => total(b) - total(a))
        .map((b) => (
          <li key={b.id} data-winner={results && total(b) === highest}>
            <span>
              #
              {1 +
                game.bakers.filter((other) => total(other) > total(b))
                  .length}{" "}
              {name(b.id)}
              {b.id === session.me.id ? " · You" : ""}
            </span>
            <strong>{total(b)} pts</strong>
            <small>
              {results
                ? `Batch ${game.round}: ${bakeryScore(b.treats)} · Earlier: ${b.banked}`
                : b.locked
                  ? "Ready"
                  : "Choosing"}
            </small>
          </li>
        ))}
    </ol>
  );
  return (
    <section
      className="games-card bakery-game-card"
      data-phase={game.phase}
      data-resume-phase={game.resumePhase}
      data-host={session.role === "host"}
      data-bakers={game.bakers.length}
      data-fresh-reveal={freshReveal}
      data-gremlins={pass.gremlins > 0}
      aria-label="Midnight Bakery game"
    >
      <div className="board-heading">
        <h2>Midnight Bakery</h2>
        <span>
          {game.round
            ? `Batch ${game.round}/2 · Pick ${game.pick}/6`
            : "2–8 bakers · ~3–5 min"}
        </span>
      </div>
      <p className="bakery-status" aria-live="polite">
        {status}
      </p>
      <div className="bakery-workspace">
        {game.phase === "ready" ? (
          <div className="bakery-intro">
            <div className="bakery-welcome-art">
              <TreatArt card="cookie" />
              <TreatArt card="gremlin" />
              <TreatArt card="cupcake" />
            </div>
            <h3>Tiny treats. Big googly eyes.</h3>
            <p>Choose a card in secret. Reveal together. Pass the rest!</p>
            <p>Two batches, six picks each. Most points wins.</p>
            <div className="bakery-menu">
              {bakeryCards.map((c) => (
                <div key={c}>
                  <strong>{bakeryMenu[c].name}</strong>
                  <span>{bakeryMenu[c].rule}</span>
                </div>
              ))}
            </div>
          </div>
        ) : results ? (
          <div className="bakery-results">
            <div className="bakery-finale">
              <TreatArt card="cupcake" />
              <div>
                <strong>
                  {finished ? "Bake-off champions" : "Batch one baked!"}
                </strong>
                <p>
                  {finished
                    ? winners.length > 1
                      ? `${winners.length} bakers share first place`
                      : name(winners[0].id)
                    : "Your combinations are baked into your score."}
                </p>
                {me && (
                  <span>
                    You: {total(me)} pts · This batch: {bakeryScore(me.treats)}
                  </span>
                )}
              </div>
            </div>
            {scoreboard}
            <p>
              {finished
                ? "The kitchen is closed. The silliness is not."
                : "Your points carry over. New hands next batch!"}
            </p>
          </div>
        ) : (
          <>
            <div
              className="bakery-hand"
              data-cards={me?.hand?.length ?? 0}
              role="group"
              aria-label="Your hand"
            >
              {me?.hand?.map((c, i) => (
                <button
                  key={`${game.round}-${game.pick}-${i}`}
                  className="bakery-treat"
                  style={
                    {
                      "--treat-color": bakeryMenu[c].color,
                    } as CSSProperties
                  }
                  aria-label={`${bakeryMenu[c].name}, card ${i + 1}`}
                  aria-pressed={selected === i}
                  disabled={!active}
                  onClick={() => setSelected(i)}
                >
                  <TreatArt card={c} />
                  <strong>{bakeryMenu[c].name}</strong>
                  <small>
                    {
                      {
                        cookie: "Pair = 6",
                        jelly: "Pair = 7",
                        cupcake: "3 each",
                        sprinkles: "+2 with cake",
                        gremlin: "Reverse pass",
                      }[c]
                    }
                  </small>
                  <span className="bakery-gain">
                    +{bakeryScore([...me.treats, c]) - bakeryScore(me.treats)}{" "}
                    pts now
                  </span>
                </button>
              ))}
            </div>
            <p className="bakery-preview" aria-live="polite">
              {game.phase === "paused"
                ? "The host can resume when everyone is ready."
                : game.phase === "reveal"
                  ? "Treats are on the counter. Hands pass in a moment…"
                  : chosen
                    ? `${bakeryMenu[chosen].name} · +${bakeryScore([...me!.treats, chosen]) - bakeryScore(me!.treats)} points · ${bakeryReward([...me!.treats, chosen]).label}`
                    : me?.locked
                      ? "No peeking! Waiting for the other bakers."
                      : "Choose a treat, then lock your pick."}
            </p>
            {game.phase === "picking" && me && (
              <button
                className="bakery-lock"
                disabled={!active || !chosen}
                onClick={() =>
                  selected !== null &&
                  session.pickTreat(selected, game.round, game.pick)
                }
              >
                {me.locked ? "Pick locked" : "Lock my pick"}
              </button>
            )}
            {!!game.bakers.length && (
              <div className="bakery-reveal" aria-label="Last reveal">
                {game.bakers.map((b) => (
                  <div
                    key={`${game.round}-${b.treats.length}-${b.id}`}
                    data-combination={bakeryReward(b.treats).combination}
                  >
                    <span>{name(b.id)}</span>
                    {b.last && <TreatArt card={b.last} />}
                    <strong>
                      {b.last ? bakeryMenu[b.last].name : "Oven warming…"}
                    </strong>
                    {b.last && (
                      <small>
                        +{bakeryReward(b.treats).gain} pts ·{" "}
                        {bakeryReward(b.treats).label}
                      </small>
                    )}
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
      {me && !results && (
        <div className="bakery-counter" aria-label="Your treats">
          <strong>Your counter · {total(me)} pts</strong>
          <div className="bakery-collection">
            {bakeryCards.map((c) => (
              <div
                key={`${game.round}-${me.treats.length}-${c}`}
                data-latest={me.last === c}
                data-filled={counts[c] > 0}
                aria-label={`${bakeryMenu[c].name}: ${counts[c]}, ${bakeryBreakdown(me.treats)[c]} points`}
              >
                <TreatArt card={c} />
                <strong>×{counts[c]}</strong>
                <small>
                  {c === "cookie" || c === "jelly"
                    ? `${Math.floor(counts[c] / 2)} pairs${counts[c] % 2 ? " + 1" : ""}`
                    : c === "cupcake" || c === "sprinkles"
                      ? `${Math.min(counts.cupcake, counts.sprinkles)} matched`
                      : "1 each"}
                </small>
              </div>
            ))}
          </div>
        </div>
      )}
      {game.phase !== "ready" && (
        <div className="bakery-table">
          <span className="bakery-passing" aria-live="polite">
            <strong>{pass.label}</strong>
            <small>{pass.note}</small>
          </span>
          {session.role === "host" && !results && (
            <button
              className="secondary"
              onClick={() =>
                game.phase === "paused"
                  ? session.resumeBakery()
                  : session.pauseGames()
              }
            >
              {game.phase === "paused" ? "Resume Bakery" : "Pause Bakery"}
            </button>
          )}
          <button className="quiet" onClick={() => setScoresOpen(true)}>
            Table & scores
          </button>
        </div>
      )}
      <AppPanel
        title="Table & scores"
        open={scoresOpen}
        onClose={() => setScoresOpen(false)}
      >
        {scoreboard}
        {me && (
          <div className="bakery-menu" aria-label="Your batch score breakdown">
            {bakeryCards.map((c) => (
              <div key={c}>
                <span>
                  {bakeryMenu[c].name} ×{counts[c]}
                </span>
                <strong>{bakeryBreakdown(me.treats)[c]} pts</strong>
              </div>
            ))}
          </div>
        )}
        <p>
          Each gremlin reverses passing. Two gremlins cancel each other out.
          With two bakers, an odd number makes you keep your remaining hand for
          that pass. Treats already on your counter stay yours.
        </p>
      </AppPanel>
      <GameHelp>
        <p>
          Everyone picks at the same time. Tap a card to preview its score, then
          Lock my pick. Once everyone locks, all cards reveal and the remaining
          hands pass to the next baker.
        </p>
        <div className="bakery-menu">
          {bakeryCards.map((c) => (
            <div key={c}>
              <strong>{bakeryMenu[c].name}</strong>
              <span>{bakeryMenu[c].rule}</span>
            </div>
          ))}
        </div>
        <p>
          Cookies earn 2 each, plus 2 for every pair. Jelly earns 7 for every
          pair; a single earns nothing. Each sprinkle earns 1, plus 2 when
          matched with a cake (one sprinkle per cake). Gremlins earn 1 and
          reverse passing; an even number cancels out. With two bakers, an odd
          number skips the pass instead.
        </p>
        <p>
          Two batches of six picks. Combinations score separately in each batch,
          then both scores add up. Ties share the win. No countdown on your
          choices—aim for quick picks for a 3–5 minute game.
        </p>
        <p>
          The host can pause or start the second batch. Late arrivals watch
          until the next game. Leaving or reloading the host ends the room.
        </p>
      </GameHelp>
      {session.role === "host" ? (
        game.phase === "ready" || finished ? (
          <button
            disabled={players.length < 2}
            onClick={() => session.startBakery()}
          >
            {finished ? "Bake Again" : "Open Bakery"}
          </button>
        ) : game.phase === "round-results" ? (
          <button onClick={() => session.nextBakeryRound()}>
            Start Batch Two
          </button>
        ) : null
      ) : (
        (game.phase === "ready" || results) && (
          <p className="muted">
            Waiting for the host
            {game.phase === "ready" ? " to open the bakery" : ""}.
          </p>
        )
      )}
      {game.phase === "ready" && players.length < 2 && (
        <p className="muted">Add another baker to start.</p>
      )}
    </section>
  );
}
