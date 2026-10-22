import { MEMBER_BY_ID, ROTATE_STEP_DEG } from "@/lib/game/constants";
import { t, useLang } from "@/lib/i18n";

function MemberCard({ label, typeId, dim }) {
  const type = MEMBER_BY_ID[typeId];
  if (!type) return null;
  const k = 26 / Math.max(type.w, type.h);
  return (
    <div className="flex items-center gap-2 rounded-lg border border-border bg-muted/40 px-2 py-1">
      <span className="font-mono text-[9px] uppercase tracking-[0.18em] text-muted-foreground">{label}</span>
      <span className="flex h-[32px] w-[64px] items-center justify-center rounded bg-card">
        <span
          className="block rounded-[2px]"
          style={{
            width: Math.max(9, type.w * k),
            height: Math.max(6, type.h * k),
            background: type.hex,
            boxShadow: "inset 0 0 0 1px rgba(63,74,84,0.35)",
          }}
        />
      </span>
      <span className="leading-tight">
        <span className="block font-mono text-[10px] uppercase tracking-wider text-foreground">{t(`member.${type.id}`)}</span>
        <span className="block font-mono text-[9px] text-muted-foreground">
          {type.w.toFixed(1)}×{type.h.toFixed(1)}×{type.d.toFixed(1)} m{dim ? ` · ${dim}` : ""}
        </span>
      </span>
    </div>
  );
}

export default function NowNext({ stats }) {
  useLang();
  const playing = stats.mode === "play";
  const over = stats.over;
  const deg = Math.round((((stats.yaw / Math.PI) * 180) % 360 + 360) % 360);

  let message = t("status.menu");
  let tone = "text-muted-foreground";
  if (over) {
    message = stats.cause === "lava" ? t("status.lava") : t("status.head");
    tone = "text-rose-600";
  } else if (stats.paused) {
    message = t("status.paused");
    tone = "text-slate-600";
  } else if (playing) {
    message = t("status.play", { score: stats.score, time: stats.timeScore, height: stats.heightScore });
    tone = "text-amber-700";
  }

  return (
    <footer className="shrink-0 border-t border-border bg-card px-4 py-2.5">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <MemberCard label={t("now.label")} typeId={stats.nowId} dim={playing ? t("now.yaw", { deg }) : t("now.waiting")} />
        </div>

        <p data-testid="status-message" className={`min-w-[220px] flex-1 font-mono text-[10px] leading-relaxed ${tone}`}>
          {message}
        </p>

        <p className="font-mono text-[10px] leading-relaxed text-foreground/80">{t("footer.keys", { deg: ROTATE_STEP_DEG })}</p>
      </div>
      <p className="mt-1.5 font-mono text-[9px] uppercase tracking-[0.14em] text-muted-foreground/70">
        {t("footer.rule")}
      </p>
    </footer>
  );
}