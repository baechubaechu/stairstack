import { useLang } from "@/lib/i18n";

// One guide prompt, laid over the top of the view it is about: the step count while the first
// steps run, what to do, and a way out.
export default function GuideBubble({ guide }) {
  const { t } = useLang();
  if (!guide.id) return null;
  return (
    <div data-testid="guide-bubble" className="pointer-events-none absolute inset-x-0 top-3 z-10 flex justify-center px-3">
      <div className="pointer-events-auto flex max-w-[420px] items-start gap-3 rounded-lg border border-ochre/60 bg-card/95 px-3.5 py-2.5 shadow-lg">
        <div className="min-w-0 flex-1">
          <p className="font-mono text-[9px] font-semibold uppercase tracking-[0.22em] text-ochre">
            {guide.index >= 0 ? t("guide.stepOf", { n: guide.index + 1, total: guide.total }) : t("guide.tip")}
          </p>
          <p className="mt-0.5 text-[13px] leading-snug text-foreground">{t(guide.id === "tip" ? "guide.tipArrow" : `guide.${guide.id}`)}</p>
        </div>
        <button
          type="button"
          data-testid="guide-skip"
          className="shrink-0 font-mono text-[10px] text-muted-foreground underline hover:text-foreground"
          onClick={guide.skip}
        >
          {t("guide.skip")}
        </button>
      </div>
    </div>
  );
}
