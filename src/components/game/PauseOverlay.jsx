import { useState } from "react";
import ControlsGuide from "@/components/game/ControlsGuide";
import { LANGS, useLang } from "@/lib/i18n";
import useRestartConfirmation from "./useRestartConfirmation";

// A push button on the cab's panel, with its lamp and its name (as on the ceiling panel).
function PanelButton({ lamp = false, alarm = false, children, ...props }) {
  return (
    <button
      type="button"
      className="flex w-full items-center gap-2.5 rounded-[3px] border border-black/70 bg-gradient-to-b from-[#3a434b] to-[#262d33] px-3 py-2 text-left shadow-[inset_0_1px_0_rgba(255,255,255,0.12),0_2px_0_#11161a] transition-[transform,box-shadow] hover:from-[#434d56] hover:to-[#2b3339] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ochre-hi active:translate-y-[2px] active:shadow-none"
      {...props}
    >
      <span
        aria-hidden="true"
        className={`block h-2 w-2 shrink-0 rounded-full ${
          alarm
            ? "lamp-blink bg-danger shadow-[0_0_9px_rgba(209,51,29,0.9)]"
            : lamp
              ? "bg-lcd shadow-[0_0_8px_rgba(159,224,138,0.8)]"
              : "bg-[#3a3f44] shadow-[inset_0_0_0_1px_rgba(0,0,0,0.6)]"
        }`}
      />
      <span className="font-mono text-[11px] font-semibold uppercase leading-none tracking-[0.1em] text-cab-text">{children}</span>
    </button>
  );
}

// One line of the log: what is recorded, and the figure.
function LogLine({ label, children }) {
  return (
    <div className="flex items-baseline justify-between gap-4 border-b border-dashed border-[#2a2f33]/30 py-1.5">
      <span className="font-mono text-[11px] uppercase tracking-[0.12em] text-[#5b636b]">{label}</span>
      <span className="font-mono text-[15px] font-semibold tabular-nums">{children}</span>
    </div>
  );
}

// The pause is the crane's emergency stop. The big red button is pressed in while the site holds
// still; pressing it again (or Esc) releases it and the run picks up exactly where it stopped.
// Beside it, the panel's restart and fault-report buttons, and the operating log: the run so far,
// the radio's volume and language, and — on the log's second sheet — the controls. A restart
// throws the run away, so it takes a second press to be sure.
export default function PauseOverlay({ stats, onResume, onRestart, volume, onVolume, muted, onToggleMute, onReport, onGuide }) {
  const { lang, t, setLang } = useLang();
  const { confirming, requestRestart } = useRestartConfirmation(onRestart);
  const [sheet, setSheet] = useState("log");
  const pct = Math.round(volume * 100);

  const tab = (id, label) => (
    <button
      type="button"
      data-testid={`pause-tab-${id}`}
      aria-pressed={sheet === id}
      onClick={() => setSheet(id)}
      className={`rounded-t-[4px] px-4 py-1.5 font-mono text-[11px] font-semibold uppercase tracking-[0.14em] transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-ochre-hi ${
        sheet === id ? "bg-[#f1ece2] text-[#2a2f33]" : "bg-[#c9c2b4] text-[#5b636b] hover:bg-[#d8d1c3]"
      }`}
    >
      {label}
    </button>
  );

  return (
    <div
      data-testid="pause-menu"
      className="fixed inset-0 z-40 flex items-center justify-center overflow-y-auto bg-cab/75 px-4 py-8 backdrop-blur-sm"
    >
      {/* hazard tape along the top and bottom of the screen: the site is stopped */}
      <div aria-hidden="true" className="hazard-tape pointer-events-none fixed inset-x-0 top-0 h-2.5 opacity-90" />
      <div aria-hidden="true" className="hazard-tape pointer-events-none fixed inset-x-0 bottom-0 h-2.5 opacity-90" />

      <div className="my-auto grid w-full max-w-[1180px] gap-5 md:grid-cols-[220px_1fr]">
        {/* the panel: the emergency stop and the buttons beside it */}
        <div className="flex flex-col items-center gap-4 rounded-[6px] bg-gradient-to-b from-cab-steel to-[#232a30] px-5 py-6 shadow-[0_10px_30px_rgba(0,0,0,0.45),inset_0_1px_0_rgba(255,255,255,0.1)]">
          <span className="dymo">{t("pause.estop")}</span>
          <button
            type="button"
            data-testid="btn-resume"
            aria-label={t("pause.resume")}
            title={t("pause.resume")}
            onClick={onResume}
            className="mt-2 grid h-[118px] w-[118px] place-items-center rounded-full bg-[#e8b21a] shadow-[0_0_0_4px_#1a1a1a,0_6px_14px_rgba(0,0,0,0.5)] focus-visible:outline focus-visible:outline-4 focus-visible:outline-offset-4 focus-visible:outline-ochre-hi"
          >
            {/* pressed in: the cap sits low in its collar; hovering lifts it a little */}
            <span className="block h-[84px] w-[84px] translate-y-[3px] rounded-full bg-[radial-gradient(circle_at_40%_35%,#f05a43,#a3200f_70%)] shadow-[0_1px_0_2px_#6e1508,inset_0_-4px_8px_rgba(0,0,0,0.35)] transition-transform hover:translate-y-0 hover:shadow-[0_4px_0_2px_#6e1508,inset_0_-4px_8px_rgba(0,0,0,0.35)]" />
          </button>
          <p className="text-center font-mono text-[10px] uppercase tracking-[0.14em] text-cab-dim">{t("pause.release")}</p>
          <div className="mt-2 grid w-full gap-2">
            <PanelButton data-testid="btn-pause-restart" alarm={confirming} onClick={requestRestart}>
              {confirming ? t("pause.confirm") : t("pause.restart")}
            </PanelButton>
            <PanelButton data-testid="btn-pause-report" onClick={onReport}>
              {t("bar.report")}
            </PanelButton>
          </div>
        </div>

        {/* the operating log, with the controls on its second sheet */}
        <div className="min-w-0">
          <div className="flex gap-1 pl-3">
            {tab("log", t("pause.log"))}
            {tab("controls", t("pause.controls"))}
          </div>
          {/* Both sheets sit in the same grid cell, the hidden one kept invisible rather than
              removed, so the log is always as large as the controls sheet and switching tabs
              never resizes the page. */}
          <div className="paper-sheet grid rounded-[2px] px-5 pb-5 pt-5 shadow-[0_10px_30px_rgba(0,0,0,0.45)] md:px-7">
            <div className={`[grid-area:1/1] ${sheet === "log" ? "" : "invisible"}`} aria-hidden={sheet !== "log"}>
              <h2 className="font-sign text-[30px] leading-tight">{t("pause.title")}</h2>
              <div className="mt-4 grid gap-x-10 gap-y-5 lg:grid-cols-2">
                <div>
                  <LogLine label={t("pause.logTime")}>{stats.time.toFixed(1)} s</LogLine>
                  <LogLine label={t("pause.logHeight")}>{stats.best.toFixed(1)} m</LogLine>
                  <LogLine label={t("pause.logFloors")}>{stats.floors}</LogLine>
                  <LogLine label={t("pause.logDrops")}>{stats.dropped}</LogLine>
                </div>
                <div>
                  <h3 className="font-mono text-[10px] font-semibold uppercase tracking-[0.2em] text-[#5b636b]">{t("pause.sound")}</h3>
                  <div className="mt-2 flex flex-wrap items-center gap-3">
                    <span className="w-12 text-[13px] font-semibold">{t("pause.music")}</span>
                    <input
                      data-testid="volume"
                      type="range"
                      min={0}
                      max={100}
                      step={1}
                      value={pct}
                      disabled={muted}
                      onChange={(e) => onVolume(Number(e.target.value) / 100)}
                      className="h-1.5 min-w-[140px] flex-1 cursor-pointer accent-ochre disabled:cursor-not-allowed disabled:opacity-40"
                      aria-label="Music volume"
                    />
                    <span className="w-10 text-right font-mono text-[12px] tabular-nums text-[#5b636b]">{muted ? t("pause.off") : `${pct}%`}</span>
                    <button
                      type="button"
                      data-testid="btn-pause-mute"
                      onClick={onToggleMute}
                      className="rounded-[3px] border border-[#2a2f33]/40 px-2.5 py-1 font-mono text-[11px] hover:bg-[#2a2f33]/10"
                    >
                      {muted ? t("pause.unmute") : t("pause.mute")}
                    </button>
                  </div>
                  <div className="mt-3 flex items-center gap-3">
                    <span className="w-12 text-[13px] font-semibold">{t("pause.language")}</span>
                    {LANGS.map((l) => (
                      <button
                        key={l}
                        type="button"
                        aria-pressed={l === lang}
                        onClick={() => setLang(l)}
                        className={`rounded-[3px] border px-2.5 py-1 font-mono text-[11px] ${
                          l === lang ? "border-[#2a2f33] bg-[#2a2f33] text-[#f1ece2]" : "border-[#2a2f33]/40 hover:bg-[#2a2f33]/10"
                        }`}
                      >
                        {l === "ko" ? "한국어" : "English"}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div className={`[grid-area:1/1] ${sheet === "controls" ? "" : "invisible"}`} aria-hidden={sheet !== "controls"}>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h2 className="font-sign text-[26px] leading-tight">{t("pause.controls")}</h2>
                <button
                  type="button"
                  data-testid="btn-pause-guide"
                  onClick={onGuide}
                  className="rounded-[3px] border border-[#2a2f33]/40 px-2.5 py-1 font-mono text-[11px] hover:bg-[#2a2f33]/10"
                >
                  {t("pause.guide")}
                </button>
              </div>
              <ControlsGuide className="mt-3" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
