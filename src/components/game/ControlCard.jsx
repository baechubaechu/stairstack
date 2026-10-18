export default function ControlCard({ title, diagram, items }) {
  return (
    <section className="flex flex-col rounded-lg border border-border bg-card p-3.5">
      <h3 className="font-mono text-[10px] uppercase tracking-[0.28em] text-amber-700">{title}</h3>
      <div className="mt-2 flex justify-center rounded bg-muted/50 py-1">{diagram}</div>
      <ul className="mt-2.5 space-y-1">
        {items.map((item) => (
          <li key={item.key} className="flex gap-2">
            <span className="w-[58px] shrink-0 pt-[2px] font-mono text-[9px] uppercase tracking-[0.12em] text-muted-foreground">
              {item.key}
            </span>
            <span className="text-[12px] leading-relaxed text-foreground/80">{item.text}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}