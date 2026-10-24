import { useCallback, useEffect, useState } from "react";
import { useLang } from "@/lib/i18n";
import { ACCENT, BLOCK, FIGURE, GROUND, INK, LAVA, LAVA_DEEP } from "@/lib/game/palette";

// The story before the first run, told as one comic page with no words: a calm site at dusk,
// a tremor, a dead lift, the eruption, the crane's brake snapping (so no one can ride the hook),
// and the way out — drop materials and let the worker climb them. The panels appear one after
// another; a click shows the next one at once, and a click on the finished page closes it.

// Milliseconds between one panel appearing and the next.
const PANEL_GAP_MS = 1700;
// How long the page takes to fade out once it is closed, in milliseconds.
const LEAVE_MS = 550;
const SEEN_KEY = "stairstack.comic";

export function comicSeen() {
  try {
    return Boolean(localStorage.getItem(SEEN_KEY));
  } catch {
    return false;
  }
}
export function markComicSeen() {
  try {
    localStorage.setItem(SEEN_KEY, "1");
  } catch {
    // without storage the comic simply plays again next visit
  }
}

const SKIN = "#e8c9a6";
const VEST = "#e9d36a";

// The worker's arms for each pose, from the shoulders; feet stand at the origin.
const ARMS = {
  stand: ["M-2.4 -14 L-3.6 -8", "M2.4 -14 L3.6 -8"],
  stretch: ["M-2.4 -14 L-5 -21", "M2.4 -14 L5 -21"],
  alarm: ["M-2.4 -14 L-7 -19", "M2.4 -14 L7 -19"],
  press: ["M-2.4 -14 L-3.6 -8", "M2.4 -14 L9 -14"],
  jump: ["M-2.4 -14 L-4 -21", "M2.4 -14 L4.5 -21"],
};
const LEGS = ["M-1.4 -8 L-2 0", "M1.4 -8 L2 0"];
const JUMP_LEGS = ["M-1.4 -8 L-4.5 -4 L-3 0", "M1.4 -8 L4 -5 L6 -3"];

// The hard-hatted worker, about 20 units tall at scale 1, feet at (x, y).
function Worker({ x, y, s = 1, pose = "stand", flip = false }) {
  const legs = pose === "jump" ? JUMP_LEGS : LEGS;
  return (
    <g
      transform={`translate(${x} ${y}) scale(${flip ? -s : s} ${s})`}
      stroke={FIGURE}
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      fill="none"
    >
      {legs.map((d) => (
        <path key={d} d={d} />
      ))}
      <rect x="-2.6" y="-15" width="5.2" height="7.5" rx="1" fill={FIGURE} stroke="none" />
      <rect x="-2.6" y="-12.6" width="5.2" height="1.3" fill={VEST} stroke="none" />
      {ARMS[pose].map((d) => (
        <path key={d} d={d} />
      ))}
      <circle cx="0" cy="-17.8" r="2.5" fill={SKIN} stroke="none" />
      <path d="M-2.9 -18.4 A2.9 2.9 0 0 1 2.9 -18.4 Z" fill={ACCENT} stroke="none" />
      <path d="M-3.8 -18.4 H3.8" stroke={ACCENT} strokeWidth="1" />
    </g>
  );
}

// A storey frame: three columns and a slab every `gap` units, standing on `ground`.
function Tower({ x, w, ground, floors, gap }) {
  const ys = Array.from({ length: floors + 1 }, (_, i) => ground - i * gap);
  const top = ys[ys.length - 1];
  return (
    <g stroke={INK} strokeWidth="1.2">
      {[x + 4, x + w / 2, x + w - 4].map((cx) => (
        <line key={cx} x1={cx} y1={ground} x2={cx} y2={top} />
      ))}
      {ys.slice(1).map((y) => (
        <rect key={y} x={x} y={y - 3} width={w} height="3" fill="#d9d1c2" />
      ))}
    </g>
  );
}

// A speech balloon with a tail pointing down at the speaker. It holds a picture, never words.
function Bubble({ x, y, w, h, tail, children }) {
  const bx = Math.min(Math.max(tail[0], x + 7), x + w - 7);
  const by = y + h;
  return (
    <g>
      <rect x={x} y={y} width={w} height={h} rx={h / 2.4} fill="#fff" stroke={INK} strokeWidth="1.4" />
      <path
        d={`M${bx - 3.5} ${by - 0.7} L${tail[0]} ${tail[1]} L${bx + 3.5} ${by - 0.7}`}
        fill="#fff"
        stroke={INK}
        strokeWidth="1.4"
        strokeLinejoin="round"
      />
      {children}
    </g>
  );
}

// The red "no" over a picture in a balloon.
function Cross({ cx, cy, r }) {
  return (
    <path
      d={`M${cx - r} ${cy - r} L${cx + r} ${cy + r} M${cx + r} ${cy - r} L${cx - r} ${cy + r}`}
      stroke={BLOCK}
      strokeWidth="2.6"
      strokeLinecap="round"
    />
  );
}

function Art({ box, children }) {
  return (
    <svg viewBox={box} preserveAspectRatio="xMidYMid slice" className="block h-full w-full" aria-hidden="true">
      {children}
    </svg>
  );
}

// ① Dusk. The tower is going up, the worker stretches on the top slab, the mountain sleeps.
function PanelCalm() {
  return (
    <Art box="0 0 360 100">
      <defs>
        <linearGradient id="c1-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#9aa6b2" />
          <stop offset="0.75" stopColor="#e9c99a" />
          <stop offset="1" stopColor="#f3d9ae" />
        </linearGradient>
      </defs>
      <rect width="360" height="100" fill="url(#c1-sky)" />
      <circle cx="300" cy="76" r="16" fill="#fbe6bf" opacity="0.85" />
      <path d="M196 24 l4 3 l4 -3 M212 17 l3 2.5 l3 -2.5" stroke={INK} strokeWidth="1" fill="none" opacity="0.6" />
      <polygon points="225,88 288,36 300,32 314,38 380,88" fill="#6c7782" />
      <path className="comic-smoke" d="M300 32 C295 24 305 20 300 12" stroke="#d6d8db" strokeWidth="3" fill="none" strokeLinecap="round" opacity="0.7" />
      <Tower x={56} w={70} ground={88} floors={4} gap={15} />
      <g stroke={INK} strokeWidth="2" fill="none">
        <line x1="140" y1="88" x2="140" y2="5" />
        <line x1="96" y1="12" x2="226" y2="12" />
        <path d="M140 5 L100 12 M140 5 L224 12" strokeWidth="0.8" />
        <line x1="200" y1="12" x2="200" y2="40" strokeWidth="0.9" />
      </g>
      <rect x="98" y="12" width="12" height="6" fill={INK} />
      <rect x="192" y="40" width="16" height="3" fill={ACCENT} />
      <Worker x={91} y={25} s={0.85} pose="stretch" />
      <rect y="88" width="360" height="12" fill={GROUND} />
      <line x1="0" y1="88" x2="360" y2="88" stroke={INK} strokeWidth="1" />
    </Art>
  );
}

// ② The first tremor: rings in the coffee, a worried look, a "!".
function PanelTremor() {
  return (
    <Art box="0 0 180 100">
      <rect width="180" height="100" fill="#efe7d8" />
      <rect x="0" y="72" width="180" height="10" fill="#b9b2a5" stroke={INK} strokeWidth="1.2" />
      <g className="comic-jitter">
        <path d="M40 52 L64 52 L61 72 L43 72 Z" fill="#fff" stroke={INK} strokeWidth="1.3" />
        <path d="M64 56 C71 56 71 66 62 66" stroke={INK} strokeWidth="1.3" fill="none" />
        <ellipse cx="52" cy="53.6" rx="11" ry="2.2" fill="#6b4a2e" />
        <ellipse className="comic-ripple" cx="52" cy="53.6" rx="5" ry="1" fill="none" stroke="#e9d7bf" strokeWidth="0.8" />
      </g>
      <path d="M34 58 l-5 -2 M34 64 l-6 0 M34 70 l-5 2 M70 48 l4 -3 M73 54 l5 -1" stroke={INK} strokeWidth="1.1" strokeLinecap="round" />
      <path d="M104 100 Q108 78 135 76 Q162 78 166 100 Z" fill={FIGURE} />
      <rect x="104" y="88" width="62" height="3" fill={VEST} />
      <circle cx="135" cy="60" r="15" fill={SKIN} />
      <path d="M118 56 A17 17 0 0 1 152 56 Z" fill={ACCENT} />
      <rect x="114" y="54.5" width="42" height="3" rx="1.5" fill="#a35f06" />
      <circle cx="128" cy="63" r="1.8" fill={INK} />
      <circle cx="140" cy="63" r="1.8" fill={INK} />
      <path d="M124 60 L131 58 M137 58 L144 60" stroke={INK} strokeWidth="1.2" strokeLinecap="round" />
      <ellipse cx="134" cy="70" rx="2" ry="2.5" fill={INK} />
      <path d="M152 60 q2 4 0 6 q-2 -2 0 -6" fill="#9ccbe8" />
      <Bubble x={108} y={6} w={30} h={26} tail={[124, 38]}>
        <rect x="121.5" y="10.5" width="3" height="11" rx="1.5" fill={BLOCK} />
        <circle cx="123" cy="26" r="1.8" fill={BLOCK} />
      </Bubble>
    </Art>
  );
}

// ③ The lift is dead: the worker jabs the button, sparks, a red light, "no lift".
function PanelLift() {
  return (
    <Art box="0 0 130 100">
      <rect width="130" height="100" fill="#d8d2c6" />
      <rect y="92" width="130" height="8" fill="#bdb5a7" />
      <rect x="16" y="12" width="60" height="80" fill="#8e959b" stroke={INK} strokeWidth="1.2" />
      <rect x="19" y="15" width="28" height="77" fill="#b6bcc1" stroke={INK} strokeWidth="1" />
      <rect x="45" y="15" width="28" height="77" fill="#b6bcc1" stroke={INK} strokeWidth="1" />
      <rect x="34" y="2.5" width="24" height="7" fill="#2a2f33" />
      <rect className="comic-lamp" x="42" y="5" width="8" height="2" fill={BLOCK} />
      <rect x="84" y="44" width="10" height="20" fill="#9aa1a6" stroke={INK} strokeWidth="1" />
      <circle cx="89" cy="50" r="2.4" fill="#e8e4dc" stroke={INK} strokeWidth="0.6" />
      <circle cx="89" cy="58" r="2.4" fill="#e8e4dc" stroke={INK} strokeWidth="0.6" />
      <g className="comic-spark" stroke="#f2b632" strokeWidth="1.2" strokeLinecap="round">
        <path d="M86 47 l-4 -4 M89 46 l0 -5 M92 47 l4 -4" />
      </g>
      <Worker x={112} y={92} s={2.1} pose="press" flip />
      <Bubble x={74} y={4} w={50} h={27} tail={[110, 48]}>
        <rect x="92" y="9" width="12" height="17" rx="1.5" fill="none" stroke={INK} strokeWidth="1.4" />
        <path d="M98 11.5 l3 4 h-6 z M98 23.5 l3 -4 h-6 z" fill={INK} />
        <Cross cx={98} cy={17.5} r={8} />
      </Bubble>
    </Art>
  );
}

// ④ The eruption — the biggest panel. Fire and ash, the ground drowned in lava, the worker
// stranded on the top slab while the whole frame shakes.
function PanelEruption() {
  return (
    <Art box="0 0 265 100">
      <defs>
        <linearGradient id="c4-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#2a1c22" />
          <stop offset="0.55" stopColor="#8f2f22" />
          <stop offset="1" stopColor="#e0693a" />
        </linearGradient>
        <radialGradient id="c4-glow" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor="#ffd27a" stopOpacity="0.95" />
          <stop offset="1" stopColor="#ffd27a" stopOpacity="0" />
        </radialGradient>
      </defs>
      <rect width="265" height="100" fill="url(#c4-sky)" />
      <g className="comic-ash" fill="#231b1e">
        <circle cx="205" cy="20" r="16" />
        <circle cx="226" cy="10" r="14" />
        <circle cx="186" cy="8" r="12" />
        <circle cx="242" cy="26" r="12" />
        <circle cx="210" cy="0" r="12" />
      </g>
      <circle cx="215" cy="34" r="30" fill="url(#c4-glow)" />
      <polygon points="120,100 196,36 214,30 234,38 300,100" fill="#2f2629" />
      <g stroke={LAVA} strokeWidth="2.4" fill="none" strokeLinecap="round">
        <path d="M214 32 Q200 6 186 26" />
        <path d="M216 31 Q230 2 246 22" />
        <path d="M215 31 L215 12" />
        <path d="M210 36 L200 60 L204 74 L192 100 M220 36 L230 62 L224 80 L236 100" strokeWidth="3" />
      </g>
      <g fill="#1b1416">
        <path d="M150 18 l5 -1 l2 4 l-4 3 l-4 -2 z" />
        <path d="M168 44 l4 -1 l2 3 l-3 3 l-4 -2 z" />
      </g>
      <path d="M157 20 l16 8 M174 45 l12 3" stroke="#ffcf7a" strokeWidth="1" strokeLinecap="round" opacity="0.8" />
      <g className="comic-shake">
        <Tower x={26} w={54} ground={100} floors={5} gap={13.5} />
        <Worker x={53} y={29.5} s={0.95} pose="alarm" />
        <path d="M40 12 l-4 -3 M66 12 l4 -3 M37 20 l-5 0 M69 20 l5 0" stroke="#ffe0b0" strokeWidth="1.2" strokeLinecap="round" />
      </g>
      <rect y="80" width="265" height="20" fill={LAVA_DEEP} />
      <path d="M0 81 Q20 77 40 81 T80 81 T120 81 T160 81 T200 81 T240 81 T280 81" stroke={LAVA} strokeWidth="2.4" fill="none" />
      <g fill="#ffb347">
        <circle cx="96" cy="88" r="1.6" />
        <circle cx="150" cy="92" r="1.3" />
        <circle cx="12" cy="90" r="1.4" />
      </g>
    </Art>
  );
}

// ⑤ In the crane cab. The brake lever snaps off in the operator's hand, the load slides down the
// cable in sparks — and the operator's answer to riding the hook is a red "no".
function PanelBrake() {
  return (
    <Art box="0 0 268 100">
      <defs>
        <linearGradient id="c5-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#4a2a2c" />
          <stop offset="1" stopColor="#d4603a" />
        </linearGradient>
      </defs>
      <rect width="268" height="100" fill={FIGURE} />
      <rect x="8" y="6" width="170" height="56" fill="url(#c5-sky)" />
      <line x1="110" y1="6" x2="110" y2="30" stroke={INK} strokeWidth="1.3" />
      <g className="comic-spark" stroke="#ffe27a" strokeWidth="1.3" strokeLinecap="round">
        <path d="M110 12 l-6 -4 M110 12 l6 -5 M110 12 l-5 4 M110 12 l6 3" />
      </g>
      <g className="comic-fall">
        <path d="M110 30 v4 a3 3 0 1 1 -3 3" stroke={INK} strokeWidth="1.3" fill="none" />
        <path d="M96 34 v-8 M104 32 v-10 M124 34 v-8" stroke="#ffe0b0" strokeWidth="1" strokeLinecap="round" />
        <rect x="92" y="40" width="36" height="6" fill={ACCENT} stroke={INK} strokeWidth="1" />
      </g>
      <rect x="8" y="6" width="170" height="56" fill="none" stroke="#4a5662" strokeWidth="3" />
      {/* the operator, seated, reaching for a lever that is no longer there */}
      <rect x="216" y="52" width="6" height="30" fill="#1a2128" />
      <path d="M186 70 Q188 50 201 48 Q214 50 216 70 Z" fill="#5b6b7a" />
      <circle cx="201" cy="40" r="7" fill={SKIN} />
      <path d="M193 38 A8 8 0 0 1 209 37 Z" fill="#3b4a5a" />
      <path d="M193 38 h-5" stroke="#3b4a5a" strokeWidth="1.6" strokeLinecap="round" />
      <circle cx="196" cy="40" r="1" fill={INK} />
      <ellipse cx="195.5" cy="44.5" rx="1.3" ry="1.7" fill={INK} />
      <path d="M192 56 L170 60 L152 62" stroke="#5b6b7a" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      <circle cx="152" cy="62" r="2.4" fill={SKIN} />
      <rect x="0" y="64" width="268" height="36" fill="#26303a" />
      <rect x="0" y="64" width="268" height="3" fill="#4a5662" />
      <circle cx="40" cy="82" r="7" fill="#1a2128" stroke="#5c6874" strokeWidth="1" />
      <path d="M40 82 l5 -3" stroke={BLOCK} strokeWidth="1.2" />
      <circle className="comic-lamp" cx="60" cy="80" r="3" fill={BLOCK} />
      <rect x="140" y="67" width="16" height="7" fill="#1a2128" />
      <line x1="148" y1="68" x2="146" y2="61" stroke="#aeb7c0" strokeWidth="3" strokeLinecap="round" />
      <g className="comic-spark" stroke="#ffe27a" strokeWidth="1" strokeLinecap="round">
        <path d="M146 60 l-3 -3 M146 60 l3 -4 M146 60 l-4 1" />
      </g>
      <line x1="136" y1="46" x2="131" y2="37" stroke="#aeb7c0" strokeWidth="3" strokeLinecap="round" />
      <circle cx="131" cy="37" r="2.4" fill={BLOCK} />
      <path d="M142 52 q-5 -4 -3 -10" stroke="#ffffff" strokeWidth="0.8" fill="none" opacity="0.7" />
      <Bubble x={210} y={3} w={54} h={28} tail={[205, 33]}>
        <path d="M237 7 v6 a3 3 0 1 1 -3 3" stroke={INK} strokeWidth="1.3" fill="none" />
        <Worker x={237} y={28} s={0.5} pose="stretch" />
        <Cross cx={237} cy={17} r={9} />
      </Bubble>
    </Art>
  );
}

// ⑥ The way out: the operator drops materials, the worker leaps from one to the next, the lava
// rises under them, and a thumbs-up comes from the cab.
function PanelDrop() {
  const lattice = Array.from({ length: 18 }, (_, i) => `l6 ${i % 2 ? 4 : -4}`).join(" ");
  return (
    <Art box="0 0 268 100">
      <defs>
        <linearGradient id="c6-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#3e2428" />
          <stop offset="1" stopColor="#d8683a" />
        </linearGradient>
      </defs>
      <rect width="268" height="100" fill="url(#c6-sky)" />
      <rect x="0" y="6" width="210" height="2" fill={INK} />
      <rect x="0" y="12" width="210" height="1.5" fill={INK} />
      <path d={`M0 12 ${lattice}`} stroke={INK} strokeWidth="0.8" fill="none" />
      <rect x="8" y="12" width="34" height="22" fill={FIGURE} />
      <rect x="12" y="15" width="26" height="13" fill="#f0b070" />
      <rect x="21" y="20" width="7" height="6" rx="1.5" fill={SKIN} />
      <rect x="23" y="14.5" width="2.6" height="6.5" rx="1.3" fill={SKIN} />
      <line x1="170" y1="13" x2="170" y2="22" stroke={INK} strokeWidth="1.1" />
      <path d="M170 22 v3 a3 3 0 1 0 3 3" stroke={INK} strokeWidth="1.2" fill="none" />
      <rect x="150" y="38" width="34" height="62" fill="none" stroke="#ffe0b0" strokeWidth="1" strokeDasharray="3 2" />
      <g className="comic-fall">
        <path d="M160 31 v-6 M171 30 v-7 M182 31 v-6" stroke="#ffe0b0" strokeWidth="1" strokeLinecap="round" />
        <rect x="153" y="34" width="30" height="6" fill={ACCENT} stroke={INK} strokeWidth="1" />
      </g>
      <g stroke={INK} strokeWidth="1.2">
        <rect x="40" y="74" width="40" height="26" fill="#b9a88c" />
        <rect x="80" y="62" width="36" height="38" fill="#9fb3c0" />
        <rect x="116" y="50" width="34" height="50" fill="#c9b48a" />
      </g>
      <path d="M98 62 Q112 38 130 46" stroke="#fff" strokeWidth="1.1" strokeDasharray="2 2" fill="none" />
      <Worker x={134} y={46} s={0.95} pose="jump" />
      <rect y="84" width="268" height="16" fill={LAVA_DEEP} />
      <path d="M0 85 Q15 81 30 85 T60 85 T90 85 T120 85 T150 85 T180 85 T210 85 T240 85 T270 85" stroke={LAVA} strokeWidth="2.2" fill="none" />
      <g className="comic-bob" stroke="#ffcf7a" strokeWidth="1.6" strokeLinecap="round" fill="none">
        <path d="M14 80 l4 -4 l4 4 M206 80 l4 -4 l4 4 M240 80 l4 -4 l4 4" />
      </g>
    </Art>
  );
}

// Where each panel sits on the 12-column, 3-row page: ① wide and ② narrow on top, ③ narrow and
// ④ (the eruption, the largest) in the middle, ⑤ and ⑥ side by side below.
const PANELS = [
  { id: "calm", Art: PanelCalm, col: "1 / 9", row: "1" },
  { id: "tremor", Art: PanelTremor, col: "9 / 13", row: "1" },
  { id: "lift", Art: PanelLift, col: "1 / 5", row: "2" },
  { id: "eruption", Art: PanelEruption, col: "5 / 13", row: "2" },
  { id: "brake", Art: PanelBrake, col: "1 / 7", row: "3" },
  { id: "drop", Art: PanelDrop, col: "7 / 13", row: "3" },
];
const ERUPTION = PANELS.findIndex((p) => p.id === "eruption") + 1;

export default function ComicIntro({ onDone }) {
  const { t } = useLang();
  const [shown, setShown] = useState(1);
  const [leaving, setLeaving] = useState(false);
  const done = shown >= PANELS.length;

  useEffect(() => {
    if (done || leaving) return undefined;
    const id = setTimeout(() => setShown((n) => n + 1), PANEL_GAP_MS);
    return () => clearTimeout(id);
  }, [shown, done, leaving]);

  useEffect(() => {
    if (!leaving) return undefined;
    const id = setTimeout(onDone, LEAVE_MS);
    return () => clearTimeout(id);
  }, [leaving, onDone]);

  const advance = useCallback(() => {
    if (leaving) return;
    if (done) setLeaving(true);
    else setShown((n) => n + 1);
  }, [done, leaving]);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") onDone();
      else if (e.key === " " || e.key === "Enter" || e.key === "ArrowRight") advance();
      else return;
      e.preventDefault();
      e.stopPropagation();
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [advance, onDone]);

  return (
    <div
      data-testid="comic-intro"
      role="dialog"
      aria-label={t("comic.label")}
      className="fixed inset-0 z-50 flex cursor-pointer select-none items-center justify-center bg-[#15191d] p-4"
      onClick={advance}
    >
      <div
        className={`grid gap-2.5 ${shown === ERUPTION ? "comic-quake" : ""} ${leaving ? "comic-leave" : ""}`}
        style={{
          width: "min(100%, calc((100dvh - 2rem) * 1.6))",
          aspectRatio: "1.6",
          gridTemplateColumns: "repeat(12, minmax(0, 1fr))",
          gridTemplateRows: "1fr 1.35fr 1fr",
        }}
      >
        {PANELS.map((p, i) => (
          <div
            key={p.id}
            data-testid={`comic-panel-${p.id}`}
            className={`overflow-hidden rounded-[3px] border-[3px] ${i < shown ? "comic-panel border-[#f4f1ec]" : "border-white/10"}`}
            style={{ gridColumn: p.col, gridRow: p.row }}
          >
            {i < shown ? <p.Art /> : null}
          </div>
        ))}
      </div>

      <button
        type="button"
        data-testid="btn-comic-skip"
        aria-label={t("comic.skip")}
        title={t("comic.skip")}
        className="absolute right-4 top-4 rounded-full bg-white/10 p-2 text-white/70 hover:bg-white/20 hover:text-white"
        onClick={(e) => {
          e.stopPropagation();
          onDone();
        }}
      >
        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor" aria-hidden="true">
          <path d="M4 5 L12 12 L4 19 Z M12 5 L20 12 L12 19 Z" />
        </svg>
      </button>
      {done && !leaving ? (
        <svg viewBox="0 0 24 24" className="comic-next pointer-events-none absolute bottom-4 right-5 h-6 w-6 text-white/80" fill="currentColor" aria-hidden="true">
          <path d="M7 4 L18 12 L7 20 Z" />
        </svg>
      ) : null}
    </div>
  );
}
