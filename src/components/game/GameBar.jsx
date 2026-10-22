import { Button } from "@/components/ui/button";
import { useLang } from "@/lib/i18n";

const stat = "flex items-baseline gap-1 font-mono text-[11px] tracking-tight";

const BADGE = {
  menu: { label: "badge.menu", className: "border-border bg-muted text-muted-foreground" },
  play: { label: "badge.play", className: "border-amber-600/30 bg-amber-500/10 text-amber-700" },
  paused: { label: "badge.paused", className: "border-slate-300 bg-slate-100 text-slate-600" },
  over: { label: "badge.over", className: "border-rose-300 bg-rose-50 text-rose-600" },
};

export default function GameBar({ stats, engineState, onTogglePause, onRestart, muted, onToggleMute, onReport }) {
  const { lang, t, setLang } = useLang();
  const ready = engineState === "ready";
  const badge = (stats.over && BADGE.over) || (stats.paused && BADGE.paused) || BADGE[stats.mode] || BADGE.menu;

  return (
    <header className="flex shrink-0 items-center justify-between gap-3 border-b border-border bg-card px-4 py-2">
      <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1">
        <h1 className="font-display text-lg font-semibold tracking-[0.3em] text-foreground">STAIRSTACK</h1>
        <span
          data-testid="phase-badge"
          className={`rounded-full border px-2.5 py-[3px] font-mono text-[10px] font-semibold uppercase tracking-[0.18em] ${badge.className}`}
        >
          {t(badge.label)}
        </span>
      </div>

      <div className="flex min-w-0 flex-wrap items-center justify-end gap-x-3 gap-y-1">
        <div data-testid="stats" className="hidden items-center gap-3 xl:flex">
          <span className={stat}>
            <span className="text-muted-foreground">{t("bar.score")}</span>
            <span data-testid="stat-score" className="text-[15px] font-semibold text-amber-700">{stats.score}</span>
            <span className="text-muted-foreground">{t("bar.scoreSplit", { time: stats.timeScore, height: stats.heightScore })}</span>
          </span>
          <span className={stat}>
            <span className="text-muted-foreground">{t("bar.time")}</span>
            <span data-testid="stat-time" className="text-foreground">{stats.time.toFixed(1)}s</span>
          </span>
          <span className={stat}>
            <span className="text-muted-foreground">{t("bar.lava")}</span>
            <span data-testid="stat-lava" className="text-rose-600">{stats.lava.toFixed(1)}</span>
            <span className="text-muted-foreground">m</span>
          </span>
          <span className={stat}>
            <span className="text-muted-foreground">{t("bar.members")}</span>
            <span data-testid="stat-members" className="text-foreground">{stats.members}</span>
          </span>
        </div>

        {ready ? null : (
          <span data-testid="engine-status" className="font-mono text-[9px] uppercase tracking-[0.18em] text-muted-foreground">
            {engineState === "failed" ? t("bar.failed") : t("bar.loading")}
          </span>
        )}
        <Button
          size="sm"
          data-testid="btn-pause"
          disabled={!ready || stats.mode !== "play"}
          onClick={onTogglePause}
        >
          {stats.paused ? t("bar.resume") : t("bar.pause")}
        </Button>
        <Button size="sm" variant="outline" data-testid="btn-mute" onClick={onToggleMute}>
          {muted ? t("bar.musicOff") : t("bar.musicOn")}
        </Button>
        <Button size="sm" variant="outline" data-testid="btn-restart" disabled={!ready} onClick={onRestart}>
          {t("bar.restart")}
        </Button>
        <Button size="sm" variant="outline" data-testid="btn-report" onClick={onReport}>
          {t("bar.report")}
        </Button>
        <Button size="sm" variant="ghost" data-testid="btn-lang" onClick={() => setLang(lang === "ko" ? "en" : "ko")}>
          {t("bar.lang")}
        </Button>
      </div>
    </header>
  );
}