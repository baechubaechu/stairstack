// Keyboard controls: A / D walk along the view, W (or Space) jumps.
export default function KeyboardDiagram() {
  return (
    <svg viewBox="0 0 168 96" className="h-[96px] w-[168px]" role="img" aria-label="Keyboard: A and D walk, W jumps">
      {/* W — jump */}
      <rect x="70" y="10" width="28" height="26" rx="5" className="fill-amber-100 stroke-amber-500" strokeWidth="1.3" />
      <text x="84" y="29" fontSize="11" textAnchor="middle" className="fill-amber-700 font-mono font-semibold">W</text>
      <text x="104" y="28" fontSize="8" className="fill-amber-700 font-mono">JUMP</text>
      <text x="60" y="28" fontSize="11" textAnchor="end" className="fill-amber-700 font-mono">↑</text>

      {/* A S D — walk */}
      <rect x="40" y="44" width="28" height="26" rx="5" className="fill-cyan-100 stroke-cyan-500" strokeWidth="1.3" />
      <text x="54" y="63" fontSize="11" textAnchor="middle" className="fill-cyan-700 font-mono font-semibold">A</text>
      <rect x="70" y="44" width="28" height="26" rx="5" className="fill-muted stroke-border" strokeWidth="1.3" />
      <text x="84" y="63" fontSize="11" textAnchor="middle" className="fill-slate-500 font-mono font-semibold">S</text>
      <rect x="100" y="44" width="28" height="26" rx="5" className="fill-cyan-100 stroke-cyan-500" strokeWidth="1.3" />
      <text x="114" y="63" fontSize="11" textAnchor="middle" className="fill-cyan-700 font-mono font-semibold">D</text>

      <text x="26" y="62" fontSize="11" textAnchor="middle" className="fill-cyan-700 font-mono">←</text>
      <text x="142" y="62" fontSize="11" textAnchor="middle" className="fill-cyan-700 font-mono">→</text>
      <text x="84" y="86" fontSize="8" textAnchor="middle" className="fill-slate-500 font-mono">A / D · W / SPACE</text>
    </svg>
  );
}