import { Button } from "@/components/ui/button";
import { telemetryEnabled } from "@/lib/telemetry";

function Row({ label, value, tone }) {
  return (
    <div className="flex items-baseline justify-between gap-4 border-b border-border py-1.5 last:border-0">
      <span className="font-mono text-[9px] uppercase tracking-[0.2em] text-muted-foreground">{label}</span>
      <span className={`font-mono text-[12px] ${tone}`}>{value}</span>
    </div>
  );
}

export default function GameOverOverlay({ stats, board, onRetry }) {
  const lava = stats.cause === "lava";
  return (
    <div
      data-testid="game-over"
      className="fixed inset-0 z-40 flex items-center justify-center bg-slate-900/25 px-4 backdrop-blur-sm"
    >
      <div className="w-full max-w-[380px] rounded-xl border border-border bg-card p-6 shadow-2xl">
        <p className="font-mono text-[9px] uppercase tracking-[0.42em] text-rose-600/80">Stairstack</p>
        <h2 data-testid="game-over-title" className="mt-1.5 font-display text-3xl font-semibold tracking-tight text-rose-600">
          Game Over
        </h2>
        <p className="mt-2 text-[13px] leading-relaxed text-muted-foreground">
          {lava
            ? "The lava caught you. Whatever it swallows sets into ground to build on — keep the stack climbing faster than it rises, and you last longer."
            : "A member came down on your head. Jumping into one above is safe — only a falling member ends the run."}
        </p>

        <div className="mt-4 flex items-baseline gap-2">
          <span data-testid="final-score" className="font-display text-4xl font-semibold tracking-tight text-amber-700">
            {stats.score}
          </span>
          <span className="font-mono text-[9px] uppercase tracking-[0.24em] text-muted-foreground">Score</span>
        </div>

        <div className="mt-2">
          <Row label="Survival score" value={`${stats.timeScore}  ·  ${stats.time.toFixed(1)} s`} tone="text-foreground" />
          <Row label="Height score" value={`${stats.heightScore}  ·  best ${stats.best.toFixed(2)} m`} tone="text-amber-700" />
          <Row label="Members placed" value={stats.members} tone="text-foreground" />
          <Row label="Stack top" value={`${stats.top.toFixed(1)} m`} tone="text-amber-700" />
          <Row label="Lava height" value={`${stats.lava.toFixed(1)} m`} tone="text-rose-600" />
        </div>

        {telemetryEnabled ? (
          <div data-testid="leaderboard" className="mt-4">
            <p className="font-mono text-[9px] uppercase tracking-[0.24em] text-muted-foreground">Leaderboard</p>
            {board === null ? (
              <p className="py-2 font-mono text-[11px] text-muted-foreground">Loading…</p>
            ) : board.length === 0 ? (
              <p className="py-2 font-mono text-[11px] text-muted-foreground">No runs yet.</p>
            ) : (
              <ol className="mt-1">
                {board.map((r, i) => (
                  <li key={i} className="flex items-baseline gap-2 border-b border-border py-1 font-mono text-[11px] last:border-0">
                    <span className="w-5 text-muted-foreground">{i + 1}</span>
                    <span className="flex-1 truncate">{r.name}</span>
                    <span className="text-amber-700">{r.score}</span>
                  </li>
                ))}
              </ol>
            )}
          </div>
        ) : null}

        <Button className="mt-5 w-full" data-testid="btn-gameover-retry" onClick={onRetry}>
          Retry
        </Button>
      </div>
    </div>
  );
}