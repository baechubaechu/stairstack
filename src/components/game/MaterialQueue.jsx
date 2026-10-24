import NextBlockPreview from "@/components/game/NextBlockPreview";
import { MEMBER_BY_ID, SEQUENCE } from "@/lib/game/constants";
import { useLang } from "@/lib/i18n";

// How many members the row shows: the one on the hook and the ones after it.
const SLOTS = 4;

// The members in line for the crane, under the drone monitor, running into the cab window on the
// right: a steel shelf with a tread-plate floor, each member standing on it with its paper tag.
// The one on the hook is last in the row, next to the plan where it is being placed, hanging from
// the cable with an ochre tag (ochre marks what the operator is working); the ones waiting their
// turn stand to its left. Each drop moves the whole line one place to the right — every member is
// keyed by its place in the drop order, so it slides rather than redraws.
export default function MaterialQueue({ dropped }) {
  const { t } = useLang();
  const tiles = Array.from({ length: SLOTS }, (_, k) => {
    const n = dropped + k; // its place in the drop order
    return { n, id: SEQUENCE[n % SEQUENCE.length], slot: k }; // slot 0 is on the hook
  });
  return (
    <div className="relative h-[108px] shrink-0 overflow-hidden rounded-[4px] border border-black/60 bg-gradient-to-b from-cab-steel to-[#22292e] shadow-[0_3px_10px_rgba(20,24,28,0.35),inset_0_1px_0_rgba(255,255,255,0.08)]">
      <span className="dymo absolute left-2.5 top-2 z-[1]">{t("queue.next")}</span>
      {/* the shelf the members stand on */}
      <div className="tread-plate absolute inset-x-0 bottom-0 h-3 border-t border-[#8a949c]/60 shadow-[0_-2px_4px_rgba(0,0,0,0.35)]" />
      {tiles.map(({ n, id, slot }) => {
        const type = MEMBER_BY_ID[id];
        const hook = slot === 0;
        // slots run right to left: the hook's member at the right edge, the furthest at the left
        const right = `calc(${slot} * 25%)`;
        return (
          <div
            key={n}
            className="absolute bottom-3 top-0 flex w-1/4 items-end gap-1.5 px-2 transition-[right,opacity] duration-500 ease-out"
            style={{ right, opacity: 1 - 0.18 * slot }}
          >
            <div className="relative flex shrink-0 flex-col items-center">
              {hook ? (
                // the crane's cable and hook, holding the member in play off the shelf
                <svg viewBox="0 0 12 30" className="h-[30px] w-3" aria-hidden="true">
                  <line x1="6" y1="0" x2="6" y2="20" stroke="#aeb7c0" strokeWidth="1.2" />
                  <path d="M6 20 v3 a3 3 0 1 1 -3 3" stroke="#e39a2c" strokeWidth="1.8" fill="none" strokeLinecap="round" />
                </svg>
              ) : null}
              <NextBlockPreview typeId={id} className={hook ? "mb-2 h-[50px] w-[50px]" : "h-[44px] w-[44px]"} />
            </div>
            {/* the member's tag */}
            <div
              className={`relative mb-1 min-w-0 rounded-[2px] bg-[#f1ece2] py-1 pl-3 pr-1.5 leading-tight text-[#2a2f33] shadow-[0_2px_0_rgba(0,0,0,0.35)] ${
                hook ? "border-l-[3px] border-ochre" : ""
              }`}
            >
              <span aria-hidden="true" className="absolute left-1 top-1.5 h-1 w-1 rounded-full bg-[#2a2f33]/50" />
              {hook ? <p className="font-mono text-[9px] font-bold uppercase tracking-[0.14em] text-[#a35f06]">{t("cab.hook")}</p> : null}
              <p className={`truncate font-semibold ${hook ? "text-[13px]" : "text-[11px]"}`}>{t(`member.${id}`)}</p>
              <p className="truncate font-mono text-[9px] text-[#5b636b]">
                {type.w.toFixed(1)}×{type.h.toFixed(2)}×{type.d.toFixed(1)}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
