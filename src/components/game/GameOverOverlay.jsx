import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useLang } from "@/lib/i18n";
import { telemetryEnabled } from "@/lib/telemetry";

function Row({ label, value, tone }) {
  return (
    <div className="flex items-baseline justify-between gap-4 border-b border-border py-1.5 last:border-0">
      <span className="font-mono text-[9px] uppercase tracking-[0.2em] text-muted-foreground">{label}</span>
      <span className={`font-mono text-[12px] ${tone}`}>{value}</span>
    </div>
  );
}

// One player on the board: their rank, name and best score. The viewer's own row is picked out.
function BoardRow({ row, mine, t }) {
  return (
    <li
      className={`flex items-baseline gap-2 border-b border-border py-1 font-mono text-[11px] last:border-0 ${mine ? "font-bold text-ochre" : ""}`}
    >
      <span className="w-6 text-muted-foreground">{row.rank}</span>
      <span className="flex-1 truncate">
        {row.name}
        {mine ? t("over.you") : ""}
      </span>
      <span className="text-muted-foreground">{t("over.runs", { n: row.runs })}</span>
      <span className="w-12 text-right text-amber-700">{row.score}</span>
    </li>
  );
}

// The game-over card, beside a world frozen where the run ended. It says what got the climber
// and how the last seconds went; "see where you fell" lifts the card off the freeze-frame, where
// the elevation shows their path, the spot they went down and the member that hit them.
export default function GameOverOverlay({ stats, death, board, onRetry, onReport }) {
  const { t } = useLang();
  const [looking, setLooking] = useState(false);
  const lava = stats.cause === "lava";

  if (looking) {
    return (
      <div className="fixed bottom-6 left-1/2 z-40 flex -translate-x-1/2 items-center gap-2 rounded-xl border border-border bg-card/95 p-2 shadow-2xl">
        <span className="px-2 font-mono text-[10px] text-muted-foreground">{t("over.trail")}</span>
        <Button data-testid="btn-gameover-back" onClick={() => setLooking(false)}>
          {t("over.back")}
        </Button>
        <Button variant="outline" onClick={onRetry}>
          {t("over.retry")}
        </Button>
      </div>
    );
  }

  const why = death
    ? lava
      ? t("over.whyLava", { climb: Math.max(0, death.climbed).toFixed(1), rise: Math.max(0, death.lavaRose).toFixed(1) })
      : t("over.whyHead", { type: death.killerType ? t(`member.${death.killerType}`) : "?" })
    : null;

  return (
    <div
      data-testid="game-over"
      className="fixed inset-0 z-40 flex items-center justify-center overflow-y-auto bg-slate-900/25 px-4 py-4 backdrop-blur-sm"
    >
      <div className="my-auto w-full max-w-[400px] rounded-xl border border-border bg-card p-6 shadow-2xl">
        <p className="font-mono text-[9px] uppercase tracking-[0.42em] text-rose-600/80">Stairstack</p>
        <h2 data-testid="game-over-title" className="mt-1.5 font-display text-3xl font-semibold tracking-tight text-rose-600">
          {t("over.title")}
        </h2>
        <p className="mt-2 text-[13px] leading-relaxed text-muted-foreground">{lava ? t("over.lava") : t("over.head")}</p>

        {why ? (
          <div data-testid="death-why" className="mt-3 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2">
            <p className="font-mono text-[9px] uppercase tracking-[0.24em] text-rose-600">{t("over.why")}</p>
            <p className="mt-0.5 text-[12px] leading-relaxed text-rose-700">{why}</p>
          </div>
        ) : null}

        <div className="mt-4 flex items-baseline gap-2">
          <span data-testid="final-score" className="font-display text-4xl font-semibold tracking-tight text-amber-700">
            {stats.score}
          </span>
          <span className="font-mono text-[9px] uppercase tracking-[0.24em] text-muted-foreground">{t("over.score")}</span>
        </div>

        <div className="mt-2">
          <Row label={t("over.survival")} value={`${stats.timeScore}  ·  ${stats.time.toFixed(1)} s`} tone="text-foreground" />
          <Row label={t("over.height")} value={`${stats.heightScore}  ·  ${t("over.best", { m: stats.best.toFixed(2) })}`} tone="text-amber-700" />
          <Row label={t("over.members")} value={stats.members} tone="text-foreground" />
          <Row label={t("over.top")} value={`${stats.top.toFixed(1)} m`} tone="text-amber-700" />
          <Row label={t("over.lavaHeight")} value={`${stats.lava.toFixed(1)} m`} tone="text-rose-600" />
        </div>

        {telemetryEnabled ? (
          <div data-testid="leaderboard" className="mt-4">
            <p className="font-mono text-[9px] uppercase tracking-[0.24em] text-muted-foreground">{t("over.board")}</p>
            {board === null ? (
              <p className="py-2 font-mono text-[11px] text-muted-foreground">{t("over.loading")}</p>
            ) : board.top.length === 0 ? (
              <p className="py-2 font-mono text-[11px] text-muted-foreground">{t("over.empty")}</p>
            ) : (
              <ol className="mt-1">
                {board.top.map((r) => (
                  <BoardRow key={r.tag} row={r} mine={r.tag === board.me?.tag} t={t} />
                ))}
                {board.me && !board.top.some((r) => r.tag === board.me.tag) ? <BoardRow row={board.me} mine t={t} /> : null}
              </ol>
            )}
          </div>
        ) : null}

        <Button className="mt-5 w-full" data-testid="btn-gameover-retry" onClick={onRetry}>
          {t("over.retry")}
        </Button>
        <div className="mt-2 grid grid-cols-2 gap-2">
          <Button variant="outline" data-testid="btn-gameover-look" onClick={() => setLooking(true)}>
            {t("over.look")}
          </Button>
          <Button variant="outline" data-testid="btn-gameover-report" onClick={onReport}>
            {t("bar.report")}
          </Button>
        </div>
      </div>
    </div>
  );
}
