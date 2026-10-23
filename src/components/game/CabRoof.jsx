import { useLang } from "@/lib/i18n";
import useRestartConfirmation from "./useRestartConfirmation";

const BADGE = {
  menu: { label: "badge.menu", tone: "bg-black/10 text-[#3f4a54]" },
  play: { label: "badge.play", tone: "bg-[#c2740a]/15 text-[#a35f06]" },
  paused: { label: "badge.paused", tone: "bg-black/10 text-[#3f4a54]" },
  over: { label: "badge.over", tone: "bg-[#c03a4c]/15 text-[#c03a4c]" },
};

// One of the cab's ceiling switches.
function Switch({ children, ...props }) {
  return (
    <button
      type="button"
      className="rounded-md border border-[#9aa0a6] bg-gradient-to-b from-[#f4f5f6] to-[#d9dcdf] px-2.5 py-1 font-mono text-[11px] text-[#2f363d] shadow-sm transition hover:from-white hover:to-[#e6e8ea] disabled:opacity-40"
      {...props}
    >
      {children}
    </button>
  );
}

// The cab's ceiling: the game's name, how the run stands, and the switches — pause, music,
// restart, report, language.
export default function CabRoof({ stats, engineState, onTogglePause, onRestart, muted, onToggleMute, onReport }) {
  const { lang, t, setLang } = useLang();
  const ready = engineState === "ready";
  const { confirming, requestRestart } = useRestartConfirmation(onRestart, stats.mode === "play");
  const badge = (stats.over && BADGE.over) || (stats.paused && BADGE.paused) || BADGE[stats.mode] || BADGE.menu;
  return (
    <header className="flex shrink-0 items-center justify-between gap-3 px-4 py-2">
      <div className="flex items-center gap-3">
        <h1 className="font-display text-[15px] font-semibold tracking-[0.32em] text-[#2f363d]">STAIRSTACK</h1>
        <span data-testid="phase-badge" className={`rounded-full px-2.5 py-[2px] font-mono text-[10px] font-semibold ${badge.tone}`}>
          {t(badge.label)}
        </span>
        {ready ? null : (
          <span data-testid="engine-status" className="font-mono text-[10px] text-[#5b636b]">
            {engineState === "failed" ? t("bar.failed") : t("bar.loading")}
          </span>
        )}
      </div>
      <div className="flex flex-wrap items-center justify-end gap-1.5">
        <Switch data-testid="btn-pause" disabled={!ready || stats.mode !== "play"} onClick={onTogglePause}>
          {stats.paused ? t("bar.resume") : t("bar.pause")}
        </Switch>
        <Switch data-testid="btn-mute" onClick={onToggleMute}>
          {muted ? t("bar.musicOff") : t("bar.musicOn")}
        </Switch>
        <Switch data-testid="btn-restart" disabled={!ready} onClick={requestRestart}>
          {confirming ? t("pause.confirm") : t("bar.restart")}
        </Switch>
        <Switch data-testid="btn-report" onClick={onReport}>
          {t("bar.report")}
        </Switch>
        <Switch data-testid="btn-lang" onClick={() => setLang(lang === "ko" ? "en" : "ko")}>
          {t("bar.lang")}
        </Switch>
      </div>
    </header>
  );
}
