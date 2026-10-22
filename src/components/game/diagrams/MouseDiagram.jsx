import { ROTATE_STEP_DEG } from "@/lib/game/constants";
import { t, useLang } from "@/lib/i18n";

// Mouse controls: aim over the plan, wheel to rotate, click to drop.
export default function MouseDiagram() {
  useLang();
  return (
    <svg viewBox="0 0 168 96" className="h-[96px] w-[168px]" role="img" aria-label="Mouse: aim over the plan, wheel to rotate, click to drop">
      {/* the plan the mouse aims over */}
      <rect x="6" y="8" width="76" height="76" rx="3" className="fill-card stroke-border" strokeWidth="1" />
      <path d="M6 46H82M44 8V84" className="stroke-slate-200" strokeWidth="0.8" />
      <rect x="30" y="32" width="30" height="24" rx="2" className="fill-amber-500/15 stroke-amber-600" strokeWidth="1.2" strokeDasharray="4 3" />
      <path d="M52 44v22l6-6 5 9 4-3-5-8 7-1z" className="fill-slate-700" />
      <text x="6" y="93" fontSize="8" className="fill-slate-500 font-mono">{t("diagram.aim")}</text>

      {/* wheel: rotate one step */}
      <rect x="112" y="14" width="26" height="40" rx="13" className="fill-card stroke-border" strokeWidth="1" />
      <path d="M125 20v10" className="stroke-amber-600" strokeWidth="1.6" />
      <path d="M104 38a16 16 0 1 1 4-16" className="fill-none stroke-amber-600" strokeWidth="1.3" />
      <path d="M108 22l-6 1 4 4z" className="fill-amber-600" />
      <text x="125" y="68" fontSize="9" textAnchor="middle" className="fill-amber-700 font-mono">{ROTATE_STEP_DEG}°</text>
      <text x="125" y="82" fontSize="8" textAnchor="middle" className="fill-slate-500 font-mono">{t("diagram.wheel")}</text>
    </svg>
  );
}