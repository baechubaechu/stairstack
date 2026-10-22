import { useState } from "react";
import { Button } from "@/components/ui/button";
import { playerName } from "@/lib/telemetry";
import { useLang } from "@/lib/i18n";
import ControlsGuide from "@/components/game/ControlsGuide";

export default function StartOverlay({ engineState, onStart }) {
  const { lang, t, setLang } = useLang();
  const ready = engineState === "ready";
  // The guide teaches the controls in play; the full cards are a click away for anyone who wants them.
  const [showControls, setShowControls] = useState(false);
  return (
    <div
      data-testid="start-screen"
      className="fixed inset-0 z-40 flex items-center justify-center overflow-y-auto bg-slate-900/25 px-4 py-4 backdrop-blur-sm"
    >
      <div className={`my-auto w-full ${showControls ? "max-w-[1120px]" : "max-w-[560px]"} rounded-xl border border-border bg-card p-5 shadow-2xl md:p-6`}>
        <div className="flex items-start justify-between gap-3">
          <p className="font-mono text-[9px] uppercase tracking-[0.42em] text-amber-700/80">Stairstack</p>
          <Button size="sm" variant="ghost" data-testid="btn-start-lang" onClick={() => setLang(lang === "ko" ? "en" : "ko")}>
            {t("bar.lang")}
          </Button>
        </div>
        <h2 data-testid="start-title" className="mt-0.5 font-display text-3xl font-semibold tracking-tight text-foreground">
          {t("start.title")}
        </h2>
        <p className="mt-1.5 max-w-[820px] text-[13px] leading-relaxed text-muted-foreground">{t("start.lead")}</p>

        <Button className="mt-4 w-full" size="lg" data-testid="btn-start" disabled={!ready} onClick={onStart}>
          {ready ? t("start.go") : engineState === "failed" ? t("start.failed") : t("start.loading")}
        </Button>

        <button
          type="button"
          data-testid="btn-start-controls"
          className="mt-3 font-mono text-[11px] text-muted-foreground underline hover:text-foreground"
          onClick={() => setShowControls((v) => !v)}
        >
          {t("start.controlsToggle")}
        </button>
        {showControls ? <ControlsGuide className="mt-3" /> : null}

        {/* what the beta collects, and whose music it is */}
        <p data-testid="privacy-note" className="mt-3 text-[11px] leading-relaxed text-muted-foreground">
          {t("start.privacy", { name: playerName() })}
        </p>
        <p className="mt-1 font-mono text-[9px] uppercase tracking-[0.18em] text-muted-foreground/70">{t("start.credits")}</p>
      </div>
    </div>
  );
}
