export default function ViewFrame({ title, hint, badge, children }) {
  return (
    <section className="relative flex min-h-[46vh] min-w-0 flex-col overflow-hidden rounded-xl border border-border bg-card shadow-sm lg:min-h-0">
      <header className="flex shrink-0 items-center justify-between gap-3 border-b border-border px-3 py-2">
        <div className="flex min-w-0 items-center gap-2">
          <h2 className="font-display text-[11px] font-semibold uppercase tracking-[0.24em] text-foreground">{title}</h2>
          {badge}
        </div>
        <p className="truncate font-mono text-[9px] uppercase tracking-[0.16em] text-muted-foreground">{hint}</p>
      </header>
      <div className="relative min-h-0 flex-1">{children}</div>
    </section>
  );
}