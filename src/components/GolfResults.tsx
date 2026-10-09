import { golfTotal, type GolfBall } from "../games/minigolf";
import type { Player } from "../network/protocol";

export function golfRanking(balls: GolfBall[]) {
  const sorted = [...balls].sort((a, b) => golfTotal(b) - golfTotal(a));
  return sorted.map((ball) => ({
    ball,
    total: golfTotal(ball),
    rank: sorted.findIndex((b) => golfTotal(b) === golfTotal(ball)) + 1,
    winner: golfTotal(ball) === golfTotal(sorted[0]),
  }));
}

export function GolfResults({
  balls,
  players,
  me,
  status,
}: {
  balls: GolfBall[];
  players: Player[];
  me: string;
  status: string;
}) {
  const ranking = golfRanking(balls);
  return (
    <div className="golf-results">
      <div className="golf-victory">
        <svg
          viewBox="0 0 120 50"
          aria-hidden="true"
          className="golf-victory-stars"
        >
          {[15, 45, 75, 105].map((x, i) => (
            <path
              key={x}
              transform={`translate(${x} ${i % 2 ? 15 : 30})`}
              d="M0-9l3 6 6 3-6 3-3 6-3-6-6-3 6-3Z"
            />
          ))}
        </svg>
        <small>Five greens complete</small>
        <h2 className="golf-status" aria-live="polite">
          {status}
        </h2>
      </div>
      <div
        className="golf-ranking-scroll"
        role="region"
        aria-label="Final golf rankings"
        tabIndex={0}
      >
        <ol className="golf-ranking">
          {ranking.map(({ ball, total, rank, winner }) => (
            <li key={ball.id} data-winner={winner}>
              <span className="golf-rank" aria-label={`Rank ${rank}`}>
                {rank}
              </span>
              <div className="golf-rank-detail">
                <div className="golf-rank-name">
                  <b>
                    {players.find((p) => p.id === ball.id)?.name ?? "Golfer"}
                    {ball.id === me ? " · You" : ""}
                  </b>
                  <strong aria-label={`${total} points`}>
                    {total}
                    <small>points</small>
                  </strong>
                </div>
                <div
                  className="golf-hole-scores"
                  aria-label="Five-hole breakdown"
                >
                  {ball.scores.map((score, i) => (
                    <span key={i}>
                      <small>H{i + 1}</small>
                      <b>{score}</b>
                    </span>
                  ))}
                </div>
                {winner && (
                  <small className="golf-winner-label">
                    {ranking.filter((r) => r.winner).length > 1
                      ? "Shared winner"
                      : "Winner"}
                  </small>
                )}
              </div>
            </li>
          ))}
        </ol>
      </div>
      <p className="golf-results-note">
        {balls.length > 4
          ? "Scroll rankings for every golfer. Results stay until Play Again."
          : "Results stay here until the host starts another match."}
      </p>
    </div>
  );
}
