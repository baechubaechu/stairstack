import NextBlockPreview from "@/components/game/NextBlockPreview";
import { MEMBER_BY_ID, SEQUENCE } from "@/lib/game/constants";
import { useLang } from "@/lib/i18n";

// How many members the row shows: the one on the hook and the ones after it.
const SLOTS = 4;

// The members in line for the crane, under the drone monitor, running into the cab window on the
// right: the one on the hook last in the row, next to the plan where it is being placed, and the
// ones waiting their turn to its left. Each drop moves the whole line one place to the right —
// every tile is keyed by its place in the drop order, so it slides rather than redraws.
export default function MaterialQueue({ dropped }) {
  const { t } = useLang();
  const tiles = Array.from({ length: SLOTS }, (_, k) => {
    const n = dropped + k; // its place in the drop order
    return { n, id: SEQUENCE[n % SEQUENCE.length], slot: k }; // slot 0 is on the hook
  });
  return (
    <div className="relative h-[108px] shrink-0 overflow-hidden rounded-xl border border-[#9aa0a6] bg-gradient-to-b from-[#e9ebed] to-[#cfd3d7] shadow-[0_3px_10px_rgba(40,46,52,0.2)]">
      <p className="absolute left-3 top-1.5 font-mono text-[9px] font-semibold uppercase tracking-[0.22em] text-[#5b636b]">
        {t("queue.next")}
      </p>
      {tiles.map(({ n, id, slot }) => {
        const type = MEMBER_BY_ID[id];
        const hook = slot === 0;
        // slots run right to left: the hook's tile at the right edge, the furthest at the left
        const right = `calc(${slot} * 25%)`;
        return (
          <div
            key={n}
            className="absolute bottom-2 top-5 w-1/4 px-1.5 transition-[right,opacity] duration-500 ease-out"
            style={{ right, opacity: 1 - 0.15 * slot }}
          >
            <div
              className={`flex h-full items-center gap-2 rounded-lg px-2 ${
                hook ? "border-2 border-[#c2740a] bg-[#fff7ea] shadow-[0_0_0_3px_rgba(194,116,10,0.15)]" : "border border-[#b9bec3] bg-white/60"
              }`}
            >
              <NextBlockPreview typeId={id} className={hook ? "h-[54px] w-[54px]" : "h-[42px] w-[42px]"} />
              <div className="min-w-0 leading-tight">
                {hook ? <p className="font-mono text-[9px] font-bold uppercase tracking-[0.16em] text-[#a35f06]">{t("cab.hook")}</p> : null}
                <p className={`truncate font-mono font-semibold text-[#2f363d] ${hook ? "text-[13px]" : "text-[11px]"}`}>{t(`member.${id}`)}</p>
                <p className="truncate font-mono text-[9px] text-[#5b636b]">
                  {type.w.toFixed(1)}×{type.h.toFixed(2)}×{type.d.toFixed(1)}
                </p>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
