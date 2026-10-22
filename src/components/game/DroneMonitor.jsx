import { useLang } from "@/lib/i18n";

// The drone's monitor, mounted in the cab: a dark bezel with the feed's label on it, and the drone
// view (the elevation) as its screen. `glow` lights the bezel up for the guide.
export default function DroneMonitor({ face, side, glow, children }) {
  const { t } = useLang();
  return (
    <section
      className={`relative flex min-h-[46vh] min-w-0 flex-1 flex-col rounded-2xl border bg-[#3a3f45] p-2 shadow-[0_8px_24px_rgba(40,46,52,0.35)] transition-shadow lg:min-h-0 ${
        glow ? "border-[#f5b04a] ring-4 ring-[#f5b04a]/40" : "border-[#2a2e33]"
      }`}
    >
      <div className="flex items-center justify-between px-2 pb-1.5 pt-0.5 font-mono text-[10px] text-white/60">
        <span className="flex items-center gap-1.5 tracking-[0.2em]">
          <span className="h-1.5 w-1.5 rounded-full bg-[#e5484d]" />
          {t("cab.drone")}
        </span>
        <span>
          {face} · {side}
        </span>
      </div>
      <div className="relative min-h-0 flex-1 overflow-hidden rounded-lg bg-black">{children}</div>
    </section>
  );
}
