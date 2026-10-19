import { useCallback, useEffect, useRef, useState } from "react";
import GameBar from "@/components/game/GameBar";
import NowNext from "@/components/game/NowNext";
import NextQueue from "@/components/game/NextQueue";
import ViewFrame from "@/components/game/ViewFrame";
import PlanView from "@/components/game/PlanView";
import ElevationView from "@/components/game/ElevationView";
import FaceIndicator from "@/components/game/FaceIndicator";
import { FrameContext } from "@/components/game/frame";
import GameOverOverlay from "@/components/game/GameOverOverlay";
import StartOverlay from "@/components/game/StartOverlay";
import { LAVA_START, SPAWN } from "@/lib/game/constants";
import * as music from "@/lib/game/music";
import { fetchLeaderboard, submitRun } from "@/lib/telemetry";

const TIMELINE_EVERY = 5; // seconds between run-log samples
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
      engineRef.current?.step(dt);
      // a canvas that throws must not stop the others drawing, or the HUD updating below
      for (const draw of framesRef.current) {
        try {
          draw(dt, now);
        } catch (err) {
          if (!loggedRef.current) console.error("STAIRSTACK: a canvas failed to draw", err);
          loggedRef.current = true;
        }
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

  useEffect(() => {
    const down = (e) => {
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
    };
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    window.addEventListener("blur", blur);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
      window.removeEventListener("blur", blur);
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
  useEffect(() => {
    if (stats.mode !== "play") return;
    const t = Math.floor(stats.time / TIMELINE_EVERY) * TIMELINE_EVERY;
    const last = timelineRef.current[timelineRef.current.length - 1];
    if (stats.time < 0.5) timelineRef.current = [];
    else if (!last || last.t < t) timelineRef.current.push({ t, h: Number(stats.best.toFixed(2)), lava: Number(stats.lava.toFixed(2)) });
  }, [stats.mode, stats.time, stats.best, stats.lava]);
  useEffect(() => {
    if (!stats.over) return;
    setBoard(null);
    const s = engineRef.current?.stats() ?? stats;
    submitRun(s, timelineRef.current)
      .then(() => fetchLeaderboard())
      .then(setBoard);
    // one submission per game over; `stats` changes every tick but `over` only flips once
  }, [stats.over]);

  const toggleMute = useCallback(() => {
    music.setMuted(!muted);
    setMuted(!muted);
  }, [muted]);

  const startGame = useCallback(() => {
    music.rewind();
    engineRef.current?.start();
    push();
  }, [push]);
  const togglePause = useCallback(() => {
    engineRef.current?.togglePause();
    push();
  }, [push]);
  const restart = useCallback(() => {
    music.rewind();
    engineRef.current?.restart();
    push();
  }, [push]);

  return (
    <FrameContext.Provider value={subscribeFrame}>
      <div data-engine={engineState} className="flex min-h-[100dvh] w-full flex-col overflow-hidden bg-paper text-foreground lg:h-[100dvh]">
        <GameBar
          stats={stats}
          engineState={engineState}
          onTogglePause={togglePause}
          onRestart={restart}
          muted={muted}
          onToggleMute={toggleMute}
        />
  
        <main className="grid min-h-0 flex-1 grid-cols-1 gap-3 overflow-y-auto p-3 lg:grid-cols-[1fr_auto_1.02fr] lg:overflow-hidden">
          <ViewFrame
            title="Elevation"
            hint={`${stats.faceLabel} face · lava ${stats.lava.toFixed(1)} m · depth collapsed`}
          >
            <ElevationView engineRef={engineRef} />
            <div className="pointer-events-none absolute right-2 top-2 flex flex-col items-center rounded-md border border-border bg-card/90 px-1.5 pb-1 shadow-sm">
              <FaceIndicator engineRef={engineRef} />
              <span className="font-mono text-[9px] font-bold uppercase tracking-[0.16em] text-ochre">
                {stats.faceLabel}
              </span>
              <span className="font-mono text-[7px] uppercase tracking-[0.14em] text-muted-foreground">
                Viewed from {stats.faceSide}
              </span>
            </div>
          </ViewFrame>

          <NextQueue ids={stats.nextIds} />

          <ViewFrame
            title="Top View"
            hint="plan in perspective · aim with the mouse · click to drop"
            badge={
              <span className="hidden font-mono text-[9px] uppercase tracking-[0.16em] text-muted-foreground sm:inline">
                world X / Z
              </span>
            }
          >
            <PlanView engineRef={engineRef} onDrop={push} />
            {engineState !== "ready" ? (
              <div className="absolute inset-0 flex items-center justify-center bg-card/80">
                <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
                  {engineState === "failed" ? "Physics engine failed to start" : "Starting physics world…"}
                </p>
              </div>
            ) : null}
          </ViewFrame>
  
        </main>
  
        <NowNext stats={stats} />
  
        {stats.mode === "menu" ? <StartOverlay engineState={engineState} onStart={startGame} /> : null}
        {stats.over ? <GameOverOverlay stats={stats} board={board} onRetry={restart} /> : null}
      </div>
    </FrameContext.Provider>
  );
}