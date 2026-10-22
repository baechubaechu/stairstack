import { FALL_MAX } from "@/lib/game/constants";
import { sinkFactor } from "@/lib/game/survival";
import { useLang } from "@/lib/i18n";

// The crane's control desk, across the bottom of the cab: an armrest console with its control
// stick at each end (left: slewing / trolley, right: hoist), and between them the instrument
// panel — the score, the worker's height against the lava, and the brake
// with its slip gauge (the same ramp that makes members sink faster). The sticks are decoration.

// A small engraved label over a readout.
function Label({ children }) {
  return <p className="font-mono text-[9px] uppercase tracking-[0.2em] text-white/45">{children}</p>;
}

// A green LCD readout.
function Lcd({ children, testid, className = "" }) {
  return (
    <p data-testid={testid} className={`font-mono font-semibold tabular-nums text-[#8ff0bf] [text-shadow:0_0_6px_rgba(110,240,180,0.35)] ${className}`}>
      {children}
    </p>
  );
}

// One instrument, set into the panel.
function Instrument({ label, className = "", children }) {
  return (
    <div className={`flex min-w-0 flex-col gap-1.5 rounded-xl bg-[#1d2125] px-3 py-2.5 shadow-[inset_0_2px_8px_rgba(0,0,0,0.6)] ${className}`}>
      <Label>{label}</Label>
      {children}
    </div>
  );
}

// An analog dial, its needle sweeping from the left stop (0) to the right (1).
function Dial({ value, danger }) {
  const a = (-120 + 240 * value) * (Math.PI / 180);
  const x = 50 + Math.sin(a) * 34;
  const y = 54 - Math.cos(a) * 34;
  return (
    <svg viewBox="0 0 100 70" className="h-[64px] w-[92px]" aria-hidden="true">
      <path d="M14 66 A40 40 0 1 1 86 66" fill="none" stroke="#3a4047" strokeWidth="8" strokeLinecap="round" />
      <path d="M70 18 A40 40 0 0 1 86 66" fill="none" stroke="#c03a4c" strokeWidth="8" strokeLinecap="round" />
      {Array.from({ length: 9 }, (_, i) => {
        const t = (-120 + 30 * i) * (Math.PI / 180);
        return <line key={i} x1={50 + Math.sin(t) * 30} y1={54 - Math.cos(t) * 30} x2={50 + Math.sin(t) * 24} y2={54 - Math.cos(t) * 24} stroke="#8a929a" strokeWidth="2" />;
      })}
      <line x1="50" y1="54" x2={x} y2={y} stroke={danger ? "#ff6b6b" : "#f5b04a"} strokeWidth="3.5" strokeLinecap="round" />
      <circle cx="50" cy="54" r="5" fill="#d9dde0" />
    </svg>
  );
}

// The worker's height against the lava, as two marks on one scale.
function HeightBar({ worker, lava, top }) {
  const span = Math.max(8, top + 2);
  const at = (v) => `${Math.max(0, Math.min(100, (Math.max(0, v) / span) * 100))}%`;
  return (
    <div className="relative h-[64px] w-4 rounded bg-[#2a2f35]">
      <div className="absolute inset-x-0 bottom-0 rounded-b bg-gradient-to-t from-[#e2652f] to-[#fb8f44]" style={{ height: at(lava) }} />
      <div className="absolute -left-1.5 -right-1.5 h-[3px] rounded bg-[#8ff0bf]" style={{ bottom: at(worker) }} />
    </div>
  );
}

// An armrest console with its control stick — drawn after a real tower-crane cab. `side` is
// "left" or "right"; the right one is the hoist, its grip in the accent colour.
function StickConsole({ side }) {
  const right = side === "right";
  return (
    <svg viewBox="0 0 260 220" preserveAspectRatio="xMidYMax meet" className="h-full w-full" aria-hidden="true">
      <defs>
        <linearGradient id={`shell-${side}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#4a5158" />
          <stop offset="1" stopColor="#2c3136" />
        </linearGradient>
        <linearGradient id={`grip-${side}`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor={right ? "#e08a1a" : "#3a4550"} />
          <stop offset="1" stopColor={right ? "#9c5a08" : "#1e252c"} />
        </linearGradient>
      </defs>
      {/* the housing, its top sloping toward the operator */}
      <path d="M24 218 L44 70 Q50 40 82 36 L178 36 Q210 40 216 70 L236 218 Z" fill={`url(#shell-${side})`} />
      <path d="M52 84 Q56 54 86 52 L174 52 Q204 54 208 84 L212 120 L48 120 Z" fill="#1b1f23" />
      {/* the panel: a small display, indicator lamps, buttons */}
      <rect x="66" y="60" width="64" height="26" rx="4" fill="#0e1a14" stroke="#3a4047" strokeWidth="2" />
      <text x="98" y="78" textAnchor="middle" fontSize="12" fontFamily="monospace" fill="#8ff0bf">
        {right ? "HOIST" : "SLEW"}
      </text>
      <circle cx="148" cy="66" r="6" fill={right ? "#f5b04a" : "#2bd46b"} />
      <circle cx="166" cy="66" r="6" fill="#2bd46b" />
      <circle cx="184" cy="66" r="6" fill="#c03a4c" />
      <circle cx="152" cy="98" r="11" fill="#e8ece9" />
      <circle cx="182" cy="98" r="11" fill="#1aa89a" />
      <rect x="66" y="94" width="64" height="18" rx="4" fill="#d9dde0" />
      <path d="M98 97 V109 M86 103 H110" stroke="#4b5157" strokeWidth="2" />
      {/* the stick: rubber boot, shaft leaning toward the operator, ribbed grip with a thumb button */}
      <ellipse cx="130" cy="178" rx="44" ry="16" fill="#121518" />
      <ellipse cx="130" cy="172" rx="30" ry="11" fill="#1f2428" />
      <path d={right ? "M130 172 L116 104" : "M130 172 L144 104"} stroke="#9aa3ab" strokeWidth="12" strokeLinecap="round" />
      <g transform={right ? "rotate(-8 112 80)" : "rotate(8 148 80)"}>
        <rect x={right ? 92 : 128} y="44" width="40" height="66" rx="18" fill={`url(#grip-${side})`} stroke="#0d1013" strokeWidth="2.5" />
        {[60, 72, 84, 96].map((y) => (
          <line key={y} x1={right ? 96 : 132} y1={y} x2={right ? 128 : 164} y2={y} stroke="rgba(0,0,0,0.25)" strokeWidth="2" />
        ))}
        <rect x={right ? 103 : 139} y="48" width="18" height="8" rx="3" fill="#e5484d" />
      </g>
    </svg>
  );
}

export default function CabConsole({ stats }) {
  const { t } = useLang();
  const playing = stats.mode === "play" && !stats.over;
  const slip = Math.min(1, (sinkFactor(stats.time) - 1) / (FALL_MAX - 1));
  return (
    <footer className="shrink-0 px-3 pb-2">
      <div className="grid h-[clamp(140px,22vh,210px)] grid-cols-[minmax(110px,17%)_1fr_minmax(110px,17%)] items-end gap-2 rounded-t-[28px] bg-gradient-to-b from-[#c4c8cc] to-[#9da2a7] px-2 pt-2 shadow-[0_-6px_18px_rgba(40,46,52,0.25)]">
        <StickConsole side="left" />

        {/* the instrument panel */}
        <div className="flex h-full flex-wrap content-center items-stretch justify-center gap-2 rounded-t-2xl bg-gradient-to-b from-[#3a4047] to-[#2b3035] p-3 shadow-[inset_0_2px_0_rgba(255,255,255,0.08)]">
          <Instrument label={t("bar.score")} className="min-w-[170px] flex-1">
            <Lcd testid="stat-score" className="text-[30px] leading-none">
              {stats.score.toLocaleString()}
            </Lcd>
            <p className="font-mono text-[10px] text-white/55">
              {t("bar.scoreSplit", { time: stats.timeScore, height: stats.heightScore })} · {stats.time.toFixed(1)}s
            </p>
          </Instrument>

          <Instrument label={t("cab.height")}>
            <div className="flex items-center gap-3">
              <HeightBar worker={stats.best} lava={stats.lava} top={stats.top} />
              <div className="leading-tight">
                <Lcd className="text-[20px]">{Math.max(0, stats.best).toFixed(1)} m</Lcd>
                <p className="font-mono text-[11px] text-[#ff9b6b]">
                  {t("bar.lava")} <span data-testid="stat-lava">{stats.lava.toFixed(1)}</span> m
                </p>
                <p className="font-mono text-[10px] text-white/55">{t("cab.floors", { n: stats.floors })}</p>
              </div>
            </div>
          </Instrument>

          <Instrument label={t("cab.brake")}>
            <div className="flex items-center gap-2">
              <Dial value={slip} danger={slip > 0.66} />
              <div className="flex flex-col items-start gap-1">
                <span
                  className={`rounded px-2 py-0.5 font-mono text-[11px] font-bold text-white ${playing ? "animate-pulse bg-[#c03a4c]" : "bg-[#5a2a31]"}`}
                >
                  BRAKE
                </span>
                <p className="font-mono text-[10px] text-white/55">{t("cab.slip", { pct: Math.round(slip * 100) })}</p>
              </div>
            </div>
          </Instrument>
        </div>

        <StickConsole side="right" />
      </div>
    </footer>
  );
}
