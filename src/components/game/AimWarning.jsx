import { useEffect, useRef, useState } from "react";
import { useFrame } from "@/components/game/frame";
import { useLang } from "@/lib/i18n";

// While the first-run guide is on, a warning over the cab window whenever the member is aimed
// where it would come down on the worker. The drone camera has no near or far, so a drop that
// looks far off in the plan can still land on them on the monitor — the beta's commonest early
// death. Checked every frame, because the aim moves with the mouse, not with the engine.
// And when a drop did come down on the worker and the guide's shield caught it (`caught` went
// up), it says so for a few seconds instead.
const CAUGHT_SECONDS = 6;

export default function AimWarning({ engineRef, active, caught = 0 }) {
  const { t } = useLang();
  const [over, setOver] = useState(false);
  const [justCaught, setJustCaught] = useState(false);
  const seen = useRef(caught);
  useEffect(() => {
    if (caught <= seen.current) {
      seen.current = caught;
      return undefined;
    }
    seen.current = caught;
    setJustCaught(true);
    const id = setTimeout(() => setJustCaught(false), CAUGHT_SECONDS * 1000);
    return () => clearTimeout(id);
  }, [caught]);
  useFrame(() => {
    const next = Boolean(active && engineRef.current?.aimOverHead());
    if (next !== over) setOver(next);
  });
  if (!over && !justCaught) return null;
  return (
    <div data-testid="aim-warning" className="pointer-events-none absolute inset-x-0 bottom-16 z-10 flex justify-center px-3">
      <p className="max-w-[420px] rounded-lg border border-rose-500/70 bg-rose-950/90 px-3.5 py-2 text-[13px] font-medium leading-snug text-rose-50 shadow-lg">
        {t(justCaught ? "guide.caught" : "guide.overHead")}
      </p>
    </div>
  );
}
