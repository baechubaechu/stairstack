import { t, useLang } from "@/lib/i18n";
// Walking off either end of the view turns the world to that side's elevation.
export default function RotationDiagram() {
  useLang();
  return (
    <svg viewBox="0 0 168 96" className="h-[96px] w-[168px]" role="img" aria-label="Walking off either end turns the world to that side's elevation">
      {/* the elevation being read */}
      <rect x="18" y="24" width="118" height="54" rx="3" className="fill-card stroke-border" strokeWidth="1" />
      <path d="M18 78h118" className="stroke-slate-400" strokeWidth="1.4" />

      {/* the ends, and the neighbour each one leads to */}
      {[24, 70].map((y) => (
        <path key={y} d={`M18 ${y}h-6M136 ${y}h6`} className="stroke-amber-600" strokeWidth="1.2" />
      ))}
      <text x="6" y="20" fontSize="8" className="fill-slate-500 font-mono">{t("diagram.left")}</text>
      <text x="136" y="20" fontSize="8" className="fill-slate-500 font-mono">{t("diagram.right")}</text>

      {/* the climber at the edge, and the turn */}
      <rect x="118" y="58" width="10" height="20" rx="2" className="fill-slate-700" />
      <path d="M128 56a22 22 0 0 1 22-22" className="fill-none stroke-amber-600" strokeWidth="1.3" />
      <path d="M150 34l-6 1 4 4z" className="fill-amber-600" />
    </svg>
  );
}