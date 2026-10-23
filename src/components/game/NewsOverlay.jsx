import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { useLang } from "@/lib/i18n";
import { telemetryEnabled } from "@/lib/telemetry";

// How long the breaking-news screen holds before the reporter takes over, and how often the
// reporter's next line comes up (ms).
const FLASH_MS = 1500;
const LINE_MS = 1500;
// A run this short gets the "everyone starts like that" sign-off (seconds).
const SHORT_RUN = 30;

const HEADLINES = { lava: 4, head: 3 };
const TICKERS = 7;
const pick = (n) => 1 + Math.floor(Math.random() * n);

// The anchor at the news desk, drawn in the game's plain figure style.
function Anchor() {
  return (
    <svg viewBox="0 0 120 120" className="h-full w-full" aria-hidden="true">
      <rect x="0" y="0" width="120" height="120" fill="#16324f" />
      <circle cx="96" cy="24" r="30" fill="#1f4468" />
      {/* body and suit */}
      <path d="M30 120 Q32 78 60 74 Q88 78 90 120 Z" fill="#2e3843" />
      <path d="M54 76 L60 96 L66 76 Z" fill="#f4f1ec" />
      <path d="M58 80 L60 98 L62 80 Z" fill="#c03a4c" />
      {/* head */}
      <circle cx="60" cy="54" r="15" fill="#f1c9a5" />
      <path d="M45 52 Q46 36 60 36 Q75 36 75 50 Q68 44 58 46 Q50 47 45 52 Z" fill="#2b2420" />
      {/* desk */}
      <rect x="10" y="98" width="100" height="22" fill="#c2740a" />
      <text x="60" y="113" textAnchor="middle" fontSize="10" fontWeight="700" fill="#ffffff" fontFamily="monospace">
        STS
      </text>
    </svg>
  );
}

// The reporter on site: hard hat, hi-vis vest, microphone.
function Reporter() {
  return (
    <svg viewBox="0 0 120 160" className="h-full w-full" aria-hidden="true">
      <path d="M28 160 Q30 100 60 96 Q90 100 92 160 Z" fill="#2e3843" />
      <rect x="34" y="112" width="52" height="7" fill="#f3d34a" />
      <circle cx="60" cy="76" r="16" fill="#f1c9a5" />
      <path d="M42 74 A18 18 0 0 1 78 74 Z" fill="#c2740a" />
      <rect x="40" y="72" width="40" height="4" fill="#c2740a" />
      {/* microphone */}
      <path d="M76 112 L88 92" stroke="#2e3843" strokeWidth="6" strokeLinecap="round" />
      <rect x="84" y="80" width="12" height="16" rx="5" fill="#3a3f46" transform="rotate(30 90 88)" />
      <rect x="82" y="96" width="14" height="6" fill="#c03a4c" transform="rotate(30 89 99)" />
    </svg>
  );
}

function Ticker({ t }) {
  const items = useMemo(() => {
    const order = Array.from({ length: TICKERS }, (_, i) => i + 1).sort(() => Math.random() - 0.5);
    order.splice(order.indexOf(1), 1);
    return [1, ...order].map((i) => t(`news.ticker.${i}`)); // the workers' comp line always leads
  }, [t]);
  const text = items.join("   ·   ");
  return (
    <div className="flex h-8 items-center overflow-hidden bg-[#0b1420] text-[12px] text-white/90">
      <span className="shrink-0 bg-[#c03a4c] px-3 py-1.5 font-mono text-[10px] font-bold tracking-widest">NEWS</span>
      <div className="min-w-0 flex-1 overflow-hidden">
        <div className="flex w-max animate-[tickerCrawl_26s_linear_infinite] whitespace-nowrap">
          <span className="px-6">{text}</span>
          <span className="px-6">{text}</span>
        </div>
      </div>
    </div>
  );
}

// The reporter's lines, put together from how the run went (see docs/story-ko.md §9).
function reportLines(t, stats, death, rank, best) {
  const m = stats.best.toFixed(1);
  const time = Math.round(stats.time);
  const type = death?.killerType ? t(`member.${death.killerType}`) : "?";
  const lines = [t(`rep.open.${pick(2)}`)];
  // never off the ground: "climbed to 0.0 m" would read oddly
  const grounded = stats.best < 0.3;
  if (stats.cause === "lava") lines.push(grounded ? t("rep.lavaGround") : t("rep.lava", { m }));
  else lines.push(grounded ? t("rep.headGround", { type }) : t("rep.head", { m, type }));
  lines.push(t("rep.record", { time, n: stats.dropped }));
  lines.push(stats.floors > 0 ? t("rep.floors", { floors: stats.floors }) : t("rep.noFloors"));
  lines.push(rank ? t("rep.rank", { score: stats.score.toLocaleString(), rank }) : t("rep.score", { score: stats.score.toLocaleString() }));
  lines.push(best ? t("rep.best") : stats.time < SHORT_RUN ? t("rep.short", { time }) : t("rep.other"));
  lines.push(t("rep.close"));
  return lines;
}

function Stat({ label, value }) {
  return (
    <div className="rounded-md bg-white/10 px-2.5 py-1.5">
      <p className="font-mono text-[9px] uppercase tracking-[0.18em] text-white/60">{label}</p>
      <p className="font-mono text-[14px] font-semibold text-white">{value}</p>
    </div>
  );
}

// The game over, as a news broadcast. First the breaking-news screen — the anchor, the drone's
// photo of the scene, a headline — then the reporter on site going through the result, line by
// line, with the score, the leaderboard and the way back in. Clicking moves it along.
export default function NewsOverlay({ stats, death, photo, board, saveStatus, best, onRetry, onReport }) {
  const { t } = useLang();
  const [stage, setStage] = useState("flash");
  const [shown, setShown] = useState(1);

  const cause = stats.cause === "lava" ? "lava" : "head";
  const headline = useMemo(
    () =>
      t(`news.${cause}.${pick(HEADLINES[cause])}`, {
        m: stats.best.toFixed(1),
        time: Math.round(stats.time),
        lava: stats.lava.toFixed(1),
        floors: stats.floors,
        type: death?.killerType ? t(`member.${death.killerType}`) : "?",
      }),
    // one headline per game over
    [],
  );
  const rank = board?.me?.rank ?? null;
  const lines = useMemo(() => reportLines(t, stats, death, rank, best), [t, stats, death, rank, best]);

  useEffect(() => {
    if (stage !== "flash") return undefined;
    const id = setTimeout(() => setStage("report"), FLASH_MS);
    return () => clearTimeout(id);
  }, [stage]);
  useEffect(() => {
    if (stage !== "report" || shown >= lines.length) return undefined;
    const id = setTimeout(() => setShown((n) => n + 1), LINE_MS);
    return () => clearTimeout(id);
  }, [stage, shown, lines.length]);

  // a click moves the broadcast along: off the headline, then through the reporter's lines
  const advance = () => {
    if (stage === "flash") setStage("report");
    else if (shown < lines.length) setShown(lines.length);
  };

  return (
    <div
      data-testid="game-over"
      className="fixed inset-0 z-40 flex items-center justify-center overflow-y-auto bg-slate-950/70 px-4 py-4 backdrop-blur-sm"
    >
      <div
        className="my-auto w-full max-w-[980px] cursor-pointer overflow-hidden rounded-xl border-4 border-[#0b1420] bg-[#0f2236] shadow-2xl"
        onClick={advance}
      >
        {/* the channel bar */}
        <div className="flex items-center justify-between bg-[#0b1420] px-4 py-2">
          <span className="font-display text-[15px] font-bold tracking-[0.2em] text-white">{t("news.channel")}</span>
          <span className="flex items-center gap-1.5 font-mono text-[11px] font-bold text-white">
            <span className="h-2 w-2 animate-pulse rounded-full bg-[#e5484d]" />
            {t("news.live")}
          </span>
        </div>

        {stage === "flash" ? (
          <div data-testid="news-flash">
            <div className="grid aspect-[16/8] grid-cols-[2fr_3fr] gap-3 p-4">
              <div className="overflow-hidden rounded-md">
                <Anchor />
              </div>
              <div className="relative overflow-hidden rounded-md border-2 border-white/80 bg-black">
                {photo ? <img src={photo} alt="" className="h-full w-full object-cover" /> : null}
                <span className="absolute left-2 top-2 rounded bg-black/60 px-2 py-0.5 font-mono text-[10px] text-white">
                  {t("news.photo")}
                </span>
              </div>
            </div>
            <div className="flex items-stretch">
              <span className="flex items-center bg-[#c03a4c] px-4 font-display text-[18px] font-bold text-white">
                {t("news.breaking")}
              </span>
              <p data-testid="news-headline" className="flex-1 bg-white px-4 py-3 font-display text-[19px] font-bold leading-snug text-[#0b1420]">
                {headline}
              </p>
            </div>
            <p className="bg-[#0f2236] px-4 py-1 font-mono text-[10px] text-white/70">{t("news.anchor")}</p>
          </div>
        ) : (
          <div data-testid="news-report" className="relative">
            {photo ? <img src={photo} alt="" className="absolute inset-0 h-full w-full object-cover opacity-30 blur-[2px]" /> : null}
            <div className="relative grid grid-cols-[180px_1fr] gap-4 p-4 md:grid-cols-[220px_1fr]">
              <div className="flex flex-col justify-end">
                <div className="h-[220px]">
                  <Reporter />
                </div>
                <p className="rounded bg-[#c2740a] px-2 py-1 text-center font-mono text-[11px] font-bold text-white">{t("news.reporter")}</p>
              </div>
              <div className="flex min-w-0 flex-col gap-3">
                <div data-testid="news-lines" className="min-h-[150px] rounded-md bg-black/55 p-3">
                  {lines.slice(0, shown).map((line, i) => (
                    <p key={i} className={`text-[14px] leading-relaxed ${i === shown - 1 ? "text-white" : "text-white/70"}`}>
                      {line}
                    </p>
                  ))}
                </div>
                <div className="grid grid-cols-3 gap-2 md:grid-cols-6">
                  <Stat label={t("news.stat.score")} value={stats.score.toLocaleString()} />
                  <Stat label={t("news.stat.time")} value={`${stats.time.toFixed(1)} s`} />
                  <Stat label={t("news.stat.height")} value={`${stats.best.toFixed(1)} m`} />
                  <Stat label={t("news.stat.dropped")} value={stats.dropped} />
                  <Stat label={t("news.stat.top")} value={`${stats.top.toFixed(1)} m`} />
                  <Stat label={t("news.stat.lava")} value={`${stats.lava.toFixed(1)} m`} />
                </div>
                {telemetryEnabled ? (
                  <div data-testid="leaderboard" className="rounded-md bg-black/40 p-2.5">
                    <p className="font-mono text-[9px] uppercase tracking-[0.2em] text-white/60">{t("over.board")}</p>
                    {board === null ? (
                      <p className="py-1 font-mono text-[11px] text-white/60">{t("over.loading")}</p>
                    ) : board.failed ? (
                      <p role="status" className="py-1 text-[11px] text-amber-200">{t("over.boardFailed")}</p>
                    ) : board.top.length === 0 ? (
                      <p className="py-1 font-mono text-[11px] text-white/60">{t("over.empty")}</p>
                    ) : (
                      <ol className="mt-1 grid gap-x-4 md:grid-cols-2">
                        {[...board.top.slice(0, 6), ...(board.me && !board.top.slice(0, 6).some((r) => r.tag === board.me.tag) ? [board.me] : [])].map((r) => (
                          <li
                            key={r.tag}
                            className={`flex items-baseline gap-2 font-mono text-[11px] ${r.tag === board.me?.tag ? "font-bold text-[#f5b04a]" : "text-white/85"}`}
                          >
                            <span className="w-6 text-white/50">{r.rank}</span>
                            <span className="flex-1 truncate">
                              {r.name}
                              {r.tag === board.me?.tag ? t("over.you") : ""}
                            </span>
                            <span>{r.score}</span>
                          </li>
                        ))}
                      </ol>
                    )}
                  </div>
                ) : null}
                <p data-testid="run-save-status" role="status" className={`text-[12px] ${saveStatus === "failed" ? "text-amber-200" : "text-white/80"}`}>
                  {t(`over.${saveStatus}`)}
                </p>
                <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
                  <Button className="flex-1 bg-[#c2740a] text-white hover:bg-[#a8650a]" data-testid="btn-gameover-retry" onClick={onRetry}>
                    {t("news.retry")}
                  </Button>
                  <Button variant="outline" data-testid="btn-gameover-report" onClick={onReport}>
                    {t("bar.report")}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}

        <Ticker t={t} />
        {stage === "flash" || shown < lines.length ? (
          <p className="bg-[#0b1420] pb-1.5 text-center font-mono text-[9px] text-white/40">{t("news.next")}</p>
        ) : null}
      </div>
    </div>
  );
}
