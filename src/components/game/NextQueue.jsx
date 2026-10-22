import NextBlockPreview from "@/components/game/NextBlockPreview";
import { MEMBER_BY_ID } from "@/lib/game/constants";
import { t, useLang } from "@/lib/i18n";

// The members still to come, stacked down the gap between the two views: the very next one on
// top and largest, the later ones smaller and fainter below it, each turning on the spot.
export default function NextQueue({ ids }) {
  useLang();
  return (
    <aside className="flex shrink-0 flex-row items-stretch gap-2 rounded-xl border border-border bg-card p-2 shadow-sm lg:w-[96px] lg:flex-col">
      <p className="self-center font-mono text-[9px] font-semibold uppercase tracking-[0.24em] text-muted-foreground lg:self-auto lg:text-center">
        {t("queue.next")}
      </p>
      {ids.map((id, k) => {
        const type = MEMBER_BY_ID[id];
        if (!type) return null;
        const first = k === 0;
        return (
          <div
            key={k}
            className={`flex flex-col items-center rounded-lg border px-1 py-1.5 ${
              first ? "border-ochre/50 bg-ochre/10" : "border-border bg-muted/40"
            }`}
            style={{ opacity: first ? 1 : 1 - 0.18 * k }}
          >
            <NextBlockPreview typeId={id} className={first ? "h-[64px] w-[64px]" : "h-[44px] w-[44px]"} />
            <span className="font-mono text-[10px] uppercase tracking-wider text-foreground">{t(`member.${type.id}`)}</span>
            <span className="font-mono text-[8px] text-muted-foreground">
              {type.w.toFixed(1)}×{type.h.toFixed(1)}×{type.d.toFixed(1)}
            </span>
          </div>
        );
      })}
    </aside>
  );
}
