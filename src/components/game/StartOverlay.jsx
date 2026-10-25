import { useState } from "react";
import { playerName } from "@/lib/telemetry";
import { useLang } from "@/lib/i18n";
import ControlsGuide from "@/components/game/ControlsGuide";

// One line of the permit: what the field is, and what is filled in.
function Field({ label, children, danger = false }) {
  return (
    <div className="flex items-baseline justify-between gap-4 border-b border-dashed border-[#2a2f33]/30 py-1.5">
      <span className="shrink-0 font-mono text-[11px] uppercase tracking-[0.12em] text-[#5b636b]">{label}</span>
      <span className={`min-w-0 text-right text-[14px] font-semibold ${danger ? "text-danger" : "text-[#2a2f33]"}`}>{children}</span>
    </div>
  );
}

// The start screen is the work permit on the operator's clipboard: where, when, what the job is,
// who is on the crane and what the hazards are. The site office's stamp goes on once the engine
// is ready; until then it reads "pending" and the crane can't be started. The controls sheet sits
// under the permit, a click away.
export default function StartOverlay({ engineState, onStart, onComic }) {
  const { lang, t, setLang } = useLang();
  const ready = engineState === "ready";
  const [showControls, setShowControls] = useState(false);
  return (
    <div
      data-testid="start-screen"
      className="fixed inset-0 z-40 flex items-center justify-center overflow-y-auto bg-cab/70 px-4 py-6 backdrop-blur-sm"
    >
      {/* the clipboard: hardboard, with the metal clip across the top */}
      <div
        className={`relative my-auto w-full ${showControls ? "max-w-[1120px]" : "max-w-[540px]"} rounded-[10px] bg-gradient-to-br from-[#8a6440] to-[#5e4026] p-3 pt-9 shadow-[0_18px_40px_rgba(0,0,0,0.5),inset_0_1px_0_rgba(255,255,255,0.15)]`}
      >
        <div
          aria-hidden="true"
          className="absolute left-1/2 top-[-10px] z-[1] flex h-[38px] w-[150px] -translate-x-1/2 items-end justify-center rounded-t-[10px] rounded-b-[4px] bg-gradient-to-b from-[#c9d0d6] via-[#8e979f] to-[#5f686f] pb-1.5 shadow-[0_3px_6px_rgba(0,0,0,0.45)]"
        >
          <span className="block h-2 w-16 rounded-full bg-[#3c444b] shadow-[inset_0_1px_2px_rgba(0,0,0,0.6)]" />
        </div>

        {/* the permit itself */}
        <div className="paper-sheet relative rounded-[2px] px-5 pb-5 pt-5 shadow-[0_2px_0_rgba(0,0,0,0.25)] md:px-7">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="font-sign text-[22px] leading-none">{t("permit.title")}</p>
              <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.2em] text-[#5b636b]">STAIRSTACK · {t("permit.no")}</p>
            </div>
            {/* the site office's stamp, in the empty corner of the header */}
            <span
              data-testid="permit-stamp"
              aria-hidden="true"
              className={`pointer-events-none ml-auto mt-1 -rotate-[10deg] rounded-[6px] border-[3px] px-3 py-0.5 font-sign text-[20px] leading-tight mix-blend-multiply transition-opacity ${
                ready ? "border-[#2f5aa8] text-[#2f5aa8] opacity-85" : "border-[#8f9aa3] text-[#8f9aa3] opacity-60"
              }`}
            >
              {ready ? t("permit.stamp") : t("permit.pending")}
            </span>
            <button
              type="button"
              data-testid="btn-start-lang"
              className="rounded-[3px] border border-[#2a2f33]/40 px-2.5 py-1 font-mono text-[11px] font-semibold hover:bg-[#2a2f33]/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ochre"
              onClick={() => setLang(lang === "ko" ? "en" : "ko")}
            >
              {t("bar.lang")}
            </button>
          </div>

          <h2 data-testid="start-title" className="mt-5 text-balance font-sign text-[30px] leading-[1.15] md:text-[34px]">
            {t("start.title")}
          </h2>

          <div className="mt-4">
            <Field label={t("permit.site")}>{t("permit.siteValue")}</Field>
            <Field label={t("permit.time")}>19:42</Field>
            <Field label={t("permit.task")}>{t("permit.taskValue")}</Field>
            <Field label={t("permit.operator")}>
              <span className="font-mono">{playerName()}</span>
            </Field>
            <Field label={t("permit.hazard")} danger>
              {t("permit.hazardValue")}
            </Field>
          </div>
          {/* the one rule that surprises people: the drone camera has no near or far */}
          <p data-testid="drone-rule" className="mt-3 text-[12px] leading-relaxed text-[#2a2f33]">
            {t("permit.droneRule")}
          </p>

          <button
            type="button"
            data-testid="btn-start"
            disabled={!ready}
            onClick={onStart}
            className="mt-6 w-full rounded-[4px] border border-black/40 bg-gradient-to-b from-ochre-hi to-ochre py-3 font-sign text-[22px] text-[#1d2328] shadow-[inset_0_1px_0_rgba(255,255,255,0.35),0_3px_0_#6e3f05] transition-[transform,box-shadow] hover:from-[#efab43] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2a2f33] active:translate-y-[3px] active:shadow-[inset_0_1px_0_rgba(255,255,255,0.25),0_0_0_#6e3f05] disabled:cursor-not-allowed disabled:from-[#c9c3b8] disabled:to-[#b3ada2] disabled:text-[#6b6f73] disabled:shadow-none"
          >
            {ready ? t("start.go") : engineState === "failed" ? t("start.failed") : t("start.loading")}
          </button>

          <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1">
            <button
              type="button"
              data-testid="btn-start-controls"
              className="font-mono text-[11px] text-[#5b636b] underline hover:text-[#2a2f33]"
              onClick={() => setShowControls((v) => !v)}
            >
              {t("start.controlsToggle")}
            </button>
            <button
              type="button"
              data-testid="btn-start-comic"
              className="font-mono text-[11px] text-[#5b636b] underline hover:text-[#2a2f33]"
              onClick={onComic}
            >
              {t("start.comic")}
            </button>
          </div>
          {showControls ? <ControlsGuide className="mt-3" /> : null}

          {/* the fine print: what the beta collects, and whose music it is */}
          <div className="mt-5 border-t border-[#2a2f33]/20 pt-2.5">
            <p className="font-mono text-[9px] uppercase tracking-[0.2em] text-[#5b636b]">{t("permit.note")}</p>
            <p data-testid="privacy-note" className="mt-1 text-[11px] leading-relaxed text-[#5b636b]">
              {t("start.privacy", { name: playerName() })}
            </p>
            <p className="mt-1 font-mono text-[9px] uppercase tracking-[0.18em] text-[#5b636b]/80">{t("start.credits")}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
