import { useCallback, useEffect, useRef, useState } from "react";
import PlanView from "@/components/game/PlanView";
import ElevationView from "@/components/game/ElevationView";
import FaceIndicator from "@/components/game/FaceIndicator";
import { FrameContext } from "@/components/game/frame";
import NewsOverlay from "@/components/game/NewsOverlay";
import StartOverlay from "@/components/game/StartOverlay";
import PauseOverlay from "@/components/game/PauseOverlay";
import ReportDialog from "@/components/game/ReportDialog";
import MobileGate, { isTouchOnly } from "@/components/game/MobileGate";
import GuideBubble from "@/components/game/GuideBubble";
import FloorBanner from "@/components/game/FloorBanner";
import BossSubtitle from "@/components/game/BossSubtitle";
import CabRoof from "@/components/game/CabRoof";
import CabConsole from "@/components/game/CabConsole";
import MaterialQueue from "@/components/game/MaterialQueue";
import CabWindow from "@/components/game/CabWindow";
import DroneMonitor from "@/components/game/DroneMonitor";
import Talk from "@/components/game/Talk";
import { useGuide } from "@/components/game/guide";
import { FACES, LAVA_START, SPAWN } from "@/lib/game/constants";
import * as music from "@/lib/game/music";
import { getLang, t, useLang } from "@/lib/i18n";
import { fetchLeaderboard, submitRun, telemetryEnabled, track, trackError, trackOnExit, trackVisit, watchErrors } from "@/lib/telemetry";

const TIMELINE_EVERY = 5; // seconds between run-log samples
// The game-over beat before the news (ms): when the drone's photo is taken, and when the news comes
// up. A lava death waits for the sinking and the thumb (see art/crane.js); a hit is quick.
const SNAP_LAVA_MS = 2100;
const SHOW_LAVA_MS = 3200;
const SNAP_HEAD_MS = 60;
const SHOW_HEAD_MS = 900;
const BEST_KEY = "stairstack.best";

// The drone's frame, cut down to the drawn window (no paper margins), as a JPEG for the news.
function cropToWindow(canvas) {
  if (!canvas) return null;
  const [x, y, w, h] = (canvas.dataset.window ?? "").split(",").map(Number);
  if (!(w > 0 && h > 0)) return canvas.toDataURL("image/jpeg", 0.85);
  const out = document.createElement("canvas");
  out.width = w;
  out.height = h;
  out.getContext("2d").drawImage(canvas, x, y, w, h, 0, 0, w, h);
  return out.toDataURL("image/jpeg", 0.85);
}
const INITIAL = { x: SPAWN.x, top: 0, members: 0, yaw: 0, score: 0, timeScore: 0, heightScore: 0, best: 0, time: 0, lava: LAVA_START, dropped: 0, turns: 0, floors: 0, cause: null, over: false, paused: false, mode: "menu", face: "front", faceLabel: "FRONT", faceSide: "SOUTH", nowId: "slab", nextIds: ["plank", "block", "step"] };
const snap = (s) =>
  `${s.score}|${s.time.toFixed(1)}|${s.lava.toFixed(2)}|${s.members}|${s.top.toFixed(1)}|${s.x.toFixed(2)}|${s.yaw.toFixed(3)}|${s.cause}|${s.mode}|${s.paused}|${s.face}|${s.nowId}|${s.nextIds.join(",")}`;

// Which action a key event means. Judged by the physical key code first, because a
// non-Latin input method (e.g. the Korean IME) reports e.key as a composed character
// or "Process" instead of the letter — the character would then never move.
function actionOf(e) {
  switch (e.code) {
    case "KeyA":
    case "ArrowLeft":
      return "left";
    case "KeyD":
    case "ArrowRight":
      return "right";
    case "KeyW":
    case "ArrowUp":
    case "Space":
      return "jump";
    default:
      break;
  }
  const k = (e.key || "").toLowerCase();
  if (k === "a" || k === "arrowleft") return "left";
  if (k === "d" || k === "arrowright") return "right";
  if (k === "w" || k === " " || k === "arrowup") return "jump";
  return null;
}

export default function Game() {
  const engineRef = useRef(null);
  const inputRef = useRef({ left: false, right: false, jump: false });
  const framesRef = useRef(new Set());
  const loggedRef = useRef(false);
  const snapRef = useRef("");
  const [engineState, setEngineState] = useState("loading");
  const [stats, setStats] = useState(INITIAL);
  const [muted, setMuted] = useState(music.isMuted);
  const [volume, setVolume] = useState(music.getVolume);
  // the report form, with the run as it stood when it was opened (null while closed)
  const [reporting, setReporting] = useState(null);
  // phones and tablets are told to come back on a computer (they can still look anyway)
  const [touchGate, setTouchGate] = useState(isTouchOnly);
  useLang();

  const push = useCallback(() => {
    const eng = engineRef.current;
    if (!eng) return;
    const s = eng.stats();
    const key = snap(s);
    if (key !== snapRef.current) {
      snapRef.current = key;
      setStats(s);
    }
  }, []);

  // Boot the single Rapier world, then load the engine that owns it.
  useEffect(() => {
    let cancelled = false;
    let engine = null;
    (async () => {
      try {
        // The standard build ships its .wasm as a separate file the browser streams and compiles;
        // the module is ready to use once imported (no init() step, unlike rapier3d-compat).
        const RAPIER = await import("@dimforge/rapier3d");
        const { createEngine } = await import("@/lib/game/engine");
        if (cancelled) return;
        engine = createEngine(RAPIER, inputRef.current);
        engineRef.current = engine;
        // dev only: a console handle for poking the run (e.g. __engine.step(0.05) to fast-forward)
        if (import.meta.env.DEV) window.__engine = engine;
        setEngineState("ready");
        push();
      } catch (err) {
        if (!cancelled) setEngineState("failed");
        console.error("STAIRSTACK engine failed to start", err);
        trackError("engine", err);
      }
    })();
    return () => {
      cancelled = true;
      engineRef.current = null;
      if (engine) engine.free();
    };
  }, [push]);

  // Canvases join the loop through useFrame (see frame.js).
  const subscribeFrame = useCallback((fn) => {
    framesRef.current.add(fn);
    return () => framesRef.current.delete(fn);
  }, []);

  // The one render loop: step the engine, then let every canvas draw that same state.
  useEffect(() => {
    let raf = 0;
    let last = performance.now();
    let acc = 0;
    const loop = (now) => {
      raf = requestAnimationFrame(loop);
      const dt = Math.min((now - last) / 1000, 0.1);
      last = now;
      const t0 = performance.now();
      engineRef.current?.step(dt);
      const t1 = performance.now();
      // a canvas that throws must not stop the others drawing, or the HUD updating below
      for (const draw of framesRef.current) {
        try {
          draw(dt, now);
        } catch (err) {
          if (!loggedRef.current) {
            console.error("STAIRSTACK: a canvas failed to draw", err);
            trackError("canvas", err);
          }
          loggedRef.current = true;
        }
      }
      // dev only: what a frame costs, smoothed — read window.__perf in the console
      if (import.meta.env.DEV) {
        const p = (window.__perf ??= { step: 0, draw: 0 });
        p.step += (t1 - t0 - p.step) * 0.05;
        p.draw += (performance.now() - t1 - p.draw) * 0.05;
      }
      acc += dt;
      if (acc > 0.1) {
        acc = 0;
        push();
      }
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [push]);

  // The report form takes the keyboard while it is open: Esc closes it, and typing in it never
  // walks the climber.
  const reportRef = useRef(false);
  useEffect(() => {
    const down = (e) => {
      if (e.code === "Escape" && reportRef.current) {
        e.preventDefault();
        setReporting(null);
        return;
      }
      const tag = e.target?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return;
      if (e.code === "Space") e.preventDefault();
      if (e.code === "Escape") {
        e.preventDefault();
        engineRef.current?.togglePause();
        push();
        return;
      }
      const action = actionOf(e);
      if (action) inputRef.current[action] = true;
    };
    const up = (e) => {
      const action = actionOf(e);
      if (action) inputRef.current[action] = false;
    };
    const blur = () => {
      inputRef.current.left = false;
      inputRef.current.right = false;
      inputRef.current.jump = false;
      const eng = engineRef.current;
      if (eng?.mode === "play" && !eng.stats().paused) {
        eng.togglePause();
        push();
      }
    };
    const visibility = () => { if (document.hidden) blur(); };
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    window.addEventListener("blur", blur);
    document.addEventListener("visibilitychange", visibility);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
      window.removeEventListener("blur", blur);
      document.removeEventListener("visibilitychange", visibility);
    };
  }, [push]);

  // The song plays only while a run is live: a pause or the game-over screen holds it, and it
  // speeds up with the run's clock.
  const live = stats.mode === "play" && !stats.paused && !stats.over;
  useEffect(() => {
    if (live) music.play();
    else music.pause();
  }, [live]);
  useEffect(() => {
    music.setIntensity(stats.time);
  }, [stats.time]);

  // Run log: height / lava sampled every few seconds while the run is live, sent once at game over.
  const timelineRef = useRef([]);
  const [board, setBoard] = useState(null);
  const [saveStatus, setSaveStatus] = useState("offline");
  const resultVersion = useRef(0);
  useEffect(() => {
    if (stats.mode !== "play") return;
    const t = Math.floor(stats.time / TIMELINE_EVERY) * TIMELINE_EVERY;
    const last = timelineRef.current[timelineRef.current.length - 1];
    if (stats.time < 0.5) timelineRef.current = [];
    else if (!last || last.t < t) timelineRef.current.push({ t, h: Number(stats.best.toFixed(2)), lava: Number(stats.lava.toFixed(2)) });
  }, [stats.mode, stats.time, stats.best, stats.lava]);
  useEffect(() => {
    if (!stats.over) return undefined;
    const version = ++resultVersion.current;
    let cancelled = false;
    const current = () => !cancelled && version === resultVersion.current;
    setBoard(null);
    setSaveStatus(telemetryEnabled ? "saving" : "offline");
    const s = engineRef.current?.stats() ?? stats;
    (async () => {
      try {
        const saved = await submitRun(s, timelineRef.current);
        if (!current()) return;
        setSaveStatus(!telemetryEnabled ? "offline" : saved ? "saved" : "failed");
      } catch {
        if (!current()) return;
        setSaveStatus("failed");
      }
      try {
        const next = await fetchLeaderboard();
        if (current()) setBoard(next);
      } catch {
        if (current()) setBoard({ top: [], me: null, failed: true });
      }
    })();
    return () => { cancelled = true; };
    // one submission per game over; `stats` changes every tick but `over` only flips once
  }, [stats.over]);

  // The game over plays out before the news: a lava death sinks in with a thumb up first. The
  // drone's frame becomes the news photo — once the thumb is up for the lava, at once for a hit.
  // A click skips straight to the news.
  const photoRef = useRef(null);
  const [news, setNews] = useState(null); // { photo, show, best }
  useEffect(() => {
    if (!stats.over) {
      setNews(null);
      return undefined;
    }
    const lava = stats.cause === "lava";
    let prev = 0;
    try {
      prev = Number(localStorage.getItem(BEST_KEY)) || 0;
    } catch {
      // no storage: every run is a personal best
    }
    const best = stats.score > prev;
    if (best) {
      try {
        localStorage.setItem(BEST_KEY, String(stats.score));
      } catch {
        // the best just won't be remembered
      }
    }
    const state = { photo: null, show: false, best };
    setNews({ ...state });
    const snap = () => {
      if (state.photo) return;
      try {
        state.photo = cropToWindow(photoRef.current);
      } catch {
        state.photo = null;
      }
    };
    const show = () => {
      snap();
      state.show = true;
      setNews({ ...state });
    };
    const t1 = setTimeout(snap, lava ? SNAP_LAVA_MS : SNAP_HEAD_MS);
    const t2 = setTimeout(show, lava ? SHOW_LAVA_MS : SHOW_HEAD_MS);
    window.addEventListener("pointerdown", show, { once: true });
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      window.removeEventListener("pointerdown", show);
    };
    // once per game over
  }, [stats.over]);

  const guide = useGuide(engineRef, stats);

  const toggleMute = useCallback(() => {
    music.setMuted(!muted);
    setMuted(!muted);
  }, [muted]);
  // Opening the report form holds the run, so nothing can go wrong while the player is typing.
  const openReport = useCallback(() => {
    const eng = engineRef.current;
    if (eng && eng.mode === "play" && !eng.stats().paused && !eng.stats().over) eng.togglePause();
    const s = eng?.stats();
    setReporting(
      s
        ? { mode: s.mode, over: s.over, score: s.score, time: Number(s.time.toFixed(1)), best: Number(s.best.toFixed(2)), lava: Number(s.lava.toFixed(2)), face: s.face, members: s.members, floors: s.floors, lang: getLang() }
        : { lang: getLang() },
    );
    push();
  }, [push]);
  useEffect(() => {
    reportRef.current = Boolean(reporting);
  }, [reporting]);

  const changeVolume = useCallback((v) => {
    music.setVolume(v);
    setVolume(v);
  }, []);

  // The beta's funnel: every run that starts, and every run thrown away before its game over —
  // restarted, or left when the tab closed. (Finished runs go to `runs` at game over.)
  const runsRef = useRef(0);
  const runSummary = (s) => ({ time: Number(s.time.toFixed(1)), score: s.score, best: Number(s.best.toFixed(2)), members: s.members, floors: s.floors });
  const inRun = (s) => s && s.mode === "play" && !s.over && s.time > 0;
  useEffect(() => {
    watchErrors();
    trackVisit(isTouchOnly());
    const leave = () => {
      const s = engineRef.current?.stats();
      if (inRun(s)) trackOnExit("run_abandon", { how: "close", ...runSummary(s) });
    };
    window.addEventListener("pagehide", leave);
    return () => window.removeEventListener("pagehide", leave);
  }, []);

  const startGame = useCallback(() => {
    resultVersion.current += 1;
    music.rewind();
    engineRef.current?.start();
    guide.onRunStart();
    runsRef.current += 1;
    track("run_start", { n: runsRef.current, how: "start" });
    push();
  }, [push, guide.onRunStart]);
  const togglePause = useCallback(() => {
    engineRef.current?.togglePause();
    push();
  }, [push]);
  const restart = useCallback(() => {
    resultVersion.current += 1;
    const s = engineRef.current?.stats();
    if (inRun(s)) track("run_abandon", { how: "restart", ...runSummary(s) });
    music.rewind();
    engineRef.current?.restart();
    guide.onRunStart();
    timelineRef.current = [];
    runsRef.current += 1;
    track("run_start", { n: runsRef.current, how: s?.over ? "retry" : "restart" });
    push();
  }, [push, guide.onRunStart]);

  return (
    <FrameContext.Provider value={subscribeFrame}>
      <div
        data-engine={engineState}
        className="flex min-h-[100dvh] w-full flex-col overflow-hidden bg-[radial-gradient(ellipse_at_top,#e3e5e7,#c9cdd1_55%,#b3b8bd)] text-foreground lg:h-[100dvh]"
      >
        <CabRoof
          stats={stats}
          engineState={engineState}
          onTogglePause={togglePause}
          onRestart={restart}
          muted={muted}
          onToggleMute={toggleMute}
          onReport={openReport}
        />

        <main className="grid min-h-0 flex-1 grid-cols-1 gap-3 overflow-y-auto px-3 pb-2 lg:grid-cols-[1fr_1.04fr] lg:overflow-hidden">
          <div className="flex min-h-0 min-w-0 flex-col gap-3">
          <DroneMonitor
            face={t(`face.${stats.face}`)}
            side={t("view.viewedFrom", { side: t(`compass.${FACES[stats.face].compass}`) })}
            glow={guide.target === "elevation"}
          >
            <ElevationView engineRef={engineRef} snapRef={photoRef} />
            {guide.target === "elevation" ? <GuideBubble guide={guide} /> : null}
            <FloorBanner floors={stats.floors} height={stats.best} mode={stats.mode} />
            <div className="pointer-events-none absolute right-3 top-3 rounded-md bg-black/35 p-1">
              <FaceIndicator engineRef={engineRef} />
            </div>
          </DroneMonitor>
          <MaterialQueue dropped={stats.dropped} />
          </div>

          <CabWindow glow={guide.target === "plan"}>
            <PlanView engineRef={engineRef} onDrop={push} />
            {guide.target === "plan" ? <GuideBubble guide={guide} /> : null}
            <BossSubtitle />
            {engineState !== "ready" ? (
              <div className="absolute inset-0 z-10 flex items-center justify-center bg-card/80">
                <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
                  {engineState === "failed" ? t("view.failed") : t("view.starting")}
                </p>
              </div>
            ) : null}
          </CabWindow>
        </main>

        <CabConsole stats={stats} />
        <Talk engineRef={engineRef} mode={stats.mode} over={stats.over} />
  
        {stats.mode === "menu" ? <StartOverlay engineState={engineState} onStart={startGame} /> : null}
        {stats.mode === "play" && stats.paused && !stats.over ? (
          <PauseOverlay
            onResume={togglePause}
            onRestart={restart}
            volume={volume}
            onVolume={changeVolume}
            muted={muted}
            onToggleMute={toggleMute}
            onReport={openReport}
            onGuide={() => {
              guide.restartGuide();
              restart();
            }}
          />
        ) : null}
        {touchGate ? <MobileGate onDismiss={() => setTouchGate(false)} /> : null}
        {reporting ? <ReportDialog context={reporting} onClose={() => setReporting(null)} /> : null}
        {stats.over && news?.show ? (
          <NewsOverlay
            stats={stats}
            death={engineRef.current?.death}
            photo={news.photo}
            board={board}
            saveStatus={saveStatus}
            best={news.best}
            onRetry={restart}
            onReport={openReport}
          />
        ) : null}
      </div>
    </FrameContext.Provider>
  );
}
