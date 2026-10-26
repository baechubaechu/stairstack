import { canSwitchLang, useLang } from "@/lib/i18n";
import useRestartConfirmation from "./useRestartConfirmation";

// The run's state as a lamp on the ceiling panel: dark at the menu, green while running,
// ochre and blinking while paused, red after a game over.
const STATUS = {
  menu: { label: "badge.menu", lamp: "off" },
  play: { label: "badge.play", lamp: "go" },
  paused: { label: "badge.paused", lamp: "hold" },
  over: { label: "badge.over", lamp: "alarm" },
};

const LAMP = {
  off: "bg-[#3a3f44] shadow-[inset_0_0_0_1px_rgba(0,0,0,0.6)]",
  go: "bg-lcd shadow-[0_0_8px_rgba(159,224,138,0.8)]",
  hold: "lamp-blink bg-ochre-hi shadow-[0_0_8px_rgba(227,154,44,0.85)]",
  alarm: "bg-danger shadow-[0_0_9px_rgba(209,51,29,0.9)]",
};

function Lamp({ state }) {
  return <span aria-hidden="true" className={`block h-2 w-2 shrink-0 rounded-full ${LAMP[state]}`} />;
}

// A screw head, holding the panel to the cab's ceiling.
function Screw() {
  return (
    <span
      aria-hidden="true"
      className="block h-2.5 w-2.5 shrink-0 rounded-full bg-[radial-gradient(circle_at_35%_35%,#8a949c,#4a535b)] shadow-[inset_0_0_0_1px_rgba(0,0,0,0.5)]"
    />
  );
}

// One of the ceiling switches: a push button with its own lamp and its name. A switch's lamp
// shows what it is set to, so the state can be read without reading the name.
function Switch({ lamp = "off", children, ...props }) {
  return (
    <button
      type="button"
      className="group flex items-center gap-2 rounded-[3px] border border-black/70 bg-gradient-to-b from-[#3a434b] to-[#262d33] px-2 py-1.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.12),0_2px_0_#11161a] transition-[transform,box-shadow] hover:from-[#434d56] hover:to-[#2b3339] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ochre-hi active:translate-y-[2px] active:shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_0_0_#11161a] disabled:pointer-events-none disabled:opacity-40"
      {...props}
    >
      <Lamp state={lamp} />
      <span className="font-mono text-[11px] font-semibold uppercase leading-none tracking-[0.1em] text-cab-text">{children}</span>
    </button>
  );
}

// The cab's ceiling panel: the maker's plate, the run-state lamp, and the switches — pause,
// music, restart, report, language.
export default function CabRoof({ stats, engineState, onTogglePause, onRestart, muted, onToggleMute, onReport }) {
  const { lang, t, setLang } = useLang();
  const ready = engineState === "ready";
  const { confirming, requestRestart } = useRestartConfirmation(onRestart, stats.mode === "play");
  const status = (stats.over && STATUS.over) || (stats.paused && STATUS.paused) || STATUS[stats.mode] || STATUS.menu;
  return (
    <header className="relative shrink-0 border-b border-black/60 bg-gradient-to-b from-cab-steel to-[#232a30] text-cab-text shadow-[0_3px_8px_rgba(0,0,0,0.35)]">
      <div className="flex items-center justify-between gap-3 px-3 py-1.5">
        <div className="flex min-w-0 items-center gap-3">
          <Screw />
          {/* the maker's plate */}
          <h1 className="font-stencil text-[22px] font-extrabold leading-none tracking-[0.12em] text-ochre-hi">STAIRSTACK</h1>
          <div className="flex items-center gap-2 rounded-[3px] bg-black/30 px-2 py-1 shadow-[inset_0_1px_3px_rgba(0,0,0,0.6)]">
            <Lamp state={status.lamp} />
            <span data-testid="phase-badge" className="font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-cab-text">
              {t(status.label)}
            </span>
          </div>
          {ready ? null : (
            <span data-testid="engine-status" className="font-mono text-[10px] text-cab-dim">
              {engineState === "failed" ? t("bar.failed") : t("bar.loading")}
            </span>
          )}
        </div>
        <div className="flex flex-wrap items-center justify-end gap-1.5">
          <Switch
            data-testid="btn-pause"
            lamp={stats.paused ? "hold" : "off"}
            disabled={!ready || stats.mode !== "play"}
            onClick={onTogglePause}
          >
            {stats.paused ? t("bar.resume") : t("bar.pause")}
          </Switch>
          <Switch data-testid="btn-mute" lamp={muted ? "off" : "go"} aria-pressed={!muted} onClick={onToggleMute}>
            {muted ? t("bar.musicOff") : t("bar.musicOn")}
          </Switch>
          <Switch data-testid="btn-restart" lamp={confirming ? "alarm" : "off"} disabled={!ready} onClick={requestRestart}>
            {confirming ? t("pause.confirm") : t("bar.restart")}
          </Switch>
          <Switch data-testid="btn-report" onClick={onReport}>
            {t("bar.report")}
          </Switch>
          {canSwitchLang ? (
            <Switch data-testid="btn-lang" onClick={() => setLang(lang === "ko" ? "en" : "ko")}>
              {t("bar.lang")}
            </Switch>
          ) : null}
          <Screw />
        </div>
      </div>
      <div aria-hidden="true" className="hazard-tape h-[3px] opacity-80" />
    </header>
  );
}
