// When the spot the climber would arrive on is already filled, the world turns to that
// face and comes straight back.
export default function TurnBackDiagram() {
  return (
    <svg
      viewBox="0 0 168 96"
      className="h-[96px] w-[168px]"
      role="img"
      aria-label="A member already fills the spot the climber would arrive on, so the world turns to that face and comes straight back"
    >
      {/* the face being read, and the climber standing at its end */}
      <rect x="4" y="54" width="62" height="28" rx="3" className="fill-card stroke-border" strokeWidth="1" />
      <path d="M4 82h62" className="stroke-slate-400" strokeWidth="1.3" />
      <rect x="54" y="68" width="10" height="14" rx="2" className="fill-slate-700" />
      <text x="8" y="66" fontSize="7.5" className="fill-slate-500 font-mono">NOW</text>

      {/* the face it turns to — the arrival spot is already taken */}
      <rect x="86" y="54" width="78" height="28" rx="3" className="fill-card stroke-amber-500" strokeWidth="1" strokeDasharray="4 3" />
      <path d="M86 82h78" className="stroke-slate-300" strokeWidth="1.3" />
      <rect x="88" y="68" width="24" height="14" rx="2" className="fill-amber-500/40 stroke-amber-600" strokeWidth="1.2" />
      <rect x="90" y="66" width="10" height="16" rx="2" className="fill-none stroke-slate-600" strokeWidth="1" strokeDasharray="2 2" />
      <path d="M91 70l8 10M99 70l-8 10" className="stroke-rose-500" strokeWidth="1.3" />
      <text x="100" y="65" fontSize="7" textAnchor="middle" className="fill-amber-700 font-mono">TAKEN</text>
      <text x="160" y="66" fontSize="7.5" textAnchor="end" className="fill-slate-500 font-mono">NEXT FACE</text>

      {/* out: the turn into that face */}
      <path d="M56 20h44v28" className="fill-none stroke-amber-600" strokeWidth="1.3" strokeDasharray="3 3" />
      <path d="M96 42l4 6 4-6z" className="fill-amber-600" />
      <text x="78" y="15" fontSize="7.5" textAnchor="middle" className="fill-amber-700 font-mono">OUT 0.5 s</text>

      {/* back: the spot is taken, so the world turns straight back */}
      <path d="M112 48V38H66" className="fill-none stroke-rose-500" strokeWidth="1.4" />
      <path d="M68 34l-6 4 6 4z" className="fill-rose-500" />
      <text x="96" y="33" fontSize="7.5" textAnchor="end" className="fill-rose-600 font-mono">BACK 0.5 s</text>
    </svg>
  );
}