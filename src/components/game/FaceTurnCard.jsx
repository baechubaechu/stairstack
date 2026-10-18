// A face-turn note: what turning to the next face does, or when the turn is refused.
export default function FaceTurnCard({ title, diagram, children, footnote }) {
  return (
    <section className="rounded-lg border border-amber-600/25 bg-amber-500/[0.06] p-3.5">
      <h3 className="font-mono text-[10px] uppercase tracking-[0.28em] text-amber-700">{title}</h3>
      <div className="mt-2 flex justify-center rounded bg-card py-1">{diagram}</div>
      <p className="mt-2.5 text-[12px] leading-relaxed text-foreground/80">{children}</p>
      <p className="mt-1.5 font-mono text-[9px] uppercase tracking-[0.14em] text-amber-700/80">{footnote}</p>
    </section>
  );
}