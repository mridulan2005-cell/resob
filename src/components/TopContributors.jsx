import { Trophy } from 'lucide-react';

/* Top Contributors — leaderboard for community helpers.
   Pattern: gaming-app leaderboard (Discord, Strava). 3-bar podium
   for the top 3 with a trophy on #1, followed by a thin table for
   ranks 4–N. Empty state hides the whole rail.

   Data shape:
     { name, roll, count, max? }[]
   The first three rank as 1/2/3; the rest fill the table. */

export default function TopContributors({ data = [], max = 52 }) {
  if (data.length === 0) return null;

  const sorted = [...data].sort((a, b) => b.count - a.count);
  const top3 = sorted.slice(0, 3);
  const rest = sorted.slice(3, 12);

  // Podium order: 2nd · 1st · 3rd (centered #1 with trophy)
  const podium = [
    { ...top3[1], rank: 2 },
    { ...top3[0], rank: 1 },
    { ...top3[2], rank: 3 },
  ].filter((p) => p && p.name);

  const peak = top3[0]?.count || max;

  return (
    <aside className="tc-card" aria-label="Top contributors">
      <header className="tc-header">
        <h3>Top Contributors</h3>
        <p>Get your spot on the leaderboard by helping!</p>
      </header>

      {/* Podium */}
      <div className="tc-podium" role="list">
        {podium.map((p) => {
          const height = Math.max(40, Math.round((p.count / peak) * 140));
          const isFirst = p.rank === 1;
          return (
            <div key={p.name} className="tc-podium-col" role="listitem">
              <div className="tc-podium-score">{p.count}</div>
              <div
                className={`tc-podium-bar ${isFirst ? 'is-first' : ''}`}
                style={{ height }}
              >
                {isFirst && (
                  <span className="tc-trophy" aria-hidden>
                    <Trophy size={22} strokeWidth={1.8} />
                  </span>
                )}
              </div>
              <div className="tc-podium-name">{p.name}</div>
              <div className="tc-podium-roll">{p.roll}</div>
            </div>
          );
        })}
      </div>

      {/* Leaderboard table for ranks 4+ */}
      {rest.length > 0 && (
        <div className="tc-table" role="table" aria-label="Leaderboard">
          <div className="tc-table-head" role="row">
            <span role="columnheader">S No.</span>
            <span role="columnheader">Name</span>
            <span role="columnheader">Roll No.</span>
            <span role="columnheader">Contributions</span>
          </div>
          {rest.map((p, i) => {
            const rank = i + 4;
            const pct = Math.min(100, Math.round((p.count / peak) * 100));
            return (
              <div key={`${p.name}-${rank}`} className="tc-table-row" role="row">
                <span className="tc-rank" role="cell">{rank}</span>
                <span className="tc-name" role="cell" title={p.name}>{p.name}</span>
                <span className="tc-roll" role="cell">{p.roll}</span>
                <span className="tc-progress" role="cell">
                  <span className="tc-bar" aria-hidden>
                    <span className="tc-bar-fill" style={{ width: `${pct}%` }} />
                  </span>
                  <span className="tc-bar-text">{p.count}/{peak}</span>
                </span>
              </div>
            );
          })}
        </div>
      )}
    </aside>
  );
}
