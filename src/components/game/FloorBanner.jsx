import { useEffect, useRef, useState } from "react";
import { useLang } from "@/lib/i18n";

// How long the banner stays up, in milliseconds.
const SHOW_MS = 2600;

// "Floor 3 secured": a banner over the drone view each time the worker stands on a new storey's
// deck and fixes it in place.
export default function FloorBanner({ floors, height, mode }) {
  const { t } = useLang();
  const [shown, setShown] = useState(null);
  const last = useRef(floors);

  useEffect(() => {
    if (mode === "play" && floors > last.current) {
      setShown({ n: floors, m: height.toFixed(1) });
      const id = setTimeout(() => setShown(null), SHOW_MS);
      last.current = floors;
      return () => clearTimeout(id);
    }
    last.current = floors;
    return undefined;
    // the height is read at the moment the floor is secured, not tracked after
  }, [floors, mode]);

  if (!shown) return null;
  return (
    <div data-testid="floor-banner" className="pointer-events-none absolute inset-x-0 top-[30%] z-10 flex justify-center">
      <div className="animate-[floorIn_0.35s_ease-out] rounded-md border-2 border-ochre bg-card/95 px-6 py-2.5 shadow-xl">
        <p className="font-display text-xl font-semibold tracking-tight text-ochre">{t("floor.reached", shown)}</p>
      </div>
    </div>
  );
}
