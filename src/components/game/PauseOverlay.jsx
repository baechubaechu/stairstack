import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import ControlsGuide from "@/components/game/ControlsGuide";
import { LANGS, useLang } from "@/lib/i18n";

// How long the restart button waits for its second click before it backs off again.
const CONFIRM_MS = 3000;

// The pause menu, over a run held still by Esc or the Pause button: carry on, start over, set the
// music, or look up the controls again. Esc (or Resume) closes it and the run picks up exactly
// where it stopped.
export default function PauseOverlay({ onResume, onRestart, volume, onVolume, muted, onToggleMute, onReport }) {
  const { lang, t, setLang } = useLang();
  // A restart throws the run away, so it takes a second click to be sure.
  const [confirming, setConfirming] = useState(false);
  useEffect(() => {
    if (!confirming) return undefined;
    const id = setTimeout(() => setConfirming(false), CONFIRM_MS);
    return () => clearTimeout(id);
  }, [confirming]);

  const pct = Math.round(volume * 100);

  return (
    <div
      data-testid="pause-menu"
      className="fixed inset-0 z-40 flex items-center justify-center overflow-y-auto bg-slate-900/30 px-4 py-4 backdrop-blur-sm"
    >
      <div className="my-auto w-full max-w-[1120px] rounded-xl border border-border bg-card p-5 shadow-2xl md:p-6">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="font-mono text-[9px] uppercase tracking-[0.42em] text-amber-700/80">Stairstack</p>
            <h2 className="mt-1.5 font-display text-3xl font-semibold tracking-tight text-foreground">{t("pause.title")}</h2>
            <p className="mt-1 text-[13px] text-muted-foreground">{t("pause.lead")}</p>
          </div>
          <div className="flex gap-2">
            <Button data-testid="btn-resume" onClick={onResume}>
              {t("pause.resume")} <span className="ml-1.5 font-mono text-[10px] opacity-70">Esc</span>
            </Button>
            <Button
              variant="outline"
              data-testid="btn-pause-restart"
              className={confirming ? "border-rose-300 text-rose-600 hover:text-rose-700" : ""}
              onClick={() => {
                if (!confirming) {
                  setConfirming(true);
                  return;
                }
                setConfirming(false);
                onRestart();
              }}
            >
              {confirming ? t("pause.confirm") : t("pause.restart")}
            </Button>
            <Button variant="outline" data-testid="btn-pause-report" onClick={onReport}>
              {t("bar.report")}
            </Button>
          </div>
        </div>

        <section className="mt-5 rounded-lg border border-border bg-muted/30 px-4 py-3">
          <h3 className="font-mono text-[9px] font-semibold uppercase tracking-[0.24em] text-muted-foreground">{t("pause.sound")}</h3>
          <div className="mt-2 flex flex-wrap items-center gap-3">
            <span className="w-12 font-mono text-[11px] text-foreground">{t("pause.music")}</span>
            <input
              data-testid="volume"
              type="range"
              min={0}
              max={100}
              step={1}
              value={pct}
              disabled={muted}
              onChange={(e) => onVolume(Number(e.target.value) / 100)}
              className="h-1.5 min-w-[160px] flex-1 cursor-pointer accent-ochre disabled:cursor-not-allowed disabled:opacity-40"
              aria-label="Music volume"
            />
            <span className="w-10 text-right font-mono text-[11px] text-muted-foreground">{muted ? t("pause.off") : `${pct}%`}</span>
            <Button size="sm" variant="outline" data-testid="btn-pause-mute" onClick={onToggleMute}>
              {muted ? t("pause.unmute") : t("pause.mute")}
            </Button>
          </div>
          <div className="mt-2 flex items-center gap-3">
            <span className="w-12 font-mono text-[11px] text-foreground">{t("pause.language")}</span>
            {LANGS.map((l) => (
              <Button key={l} size="sm" variant={l === lang ? "default" : "outline"} onClick={() => setLang(l)}>
                {l === "ko" ? "한국어" : "English"}
              </Button>
            ))}
          </div>
        </section>

        <h3 className="mt-5 font-mono text-[9px] font-semibold uppercase tracking-[0.24em] text-muted-foreground">{t("pause.controls")}</h3>
        <ControlsGuide className="mt-2" />
      </div>
    </div>
  );
}
