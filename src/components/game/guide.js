// The first-run guide. A first-time player gets one short prompt at a time over the view it is
// about, and each goes away when they have done the thing it asks: drop a member, climb onto
// one, walk off the end of the view and round the tower's corner (finding a way on another face
// is the heart of the game, so it is taught, not left to be found). The run is held until all
// three are done — the lava still, and nothing scored (see advanceRun) — so nobody is burnt
// before they can move and nobody earns points by waiting; then it is let go with a warning.
// After that, three tips each appear once, the first time they matter: walking off an edge (for
// whoever skipped the steps), the tip arrow, a pencilled floor slab. Everything is remembered
// per browser; the pause menu can start the guide over.
import { useCallback, useEffect, useRef, useState } from "react";
import { EDGE_LINE, HEAVY, MEMBER_BY_ID, materialOf } from "@/lib/game/constants";
import { track } from "@/lib/telemetry";

const DONE_KEY = "stairstack.guide";
const TIPS_KEY = "stairstack.guide.tips";
// The steps in order: what each asks for, and which view it points at.
export const STEPS = [
  { id: "drop", target: "plan" },
  { id: "climb", target: "elevation" },
  { id: "turn", target: "elevation" },
  { id: "lava", target: "elevation" },
];
// The steps during which the run is held.
const HELD = new Set(["drop", "climb", "turn"]);
// How high the climber's feet must stand to count as having climbed onto a member, in metres.
const CLIMBED = 0.2;
const TIP_TARGET = { edge: "elevation", tip: "plan", slab: "elevation", matGlass: "plan", matPipes: "plan", matCement: "plan", matHeavy: "plan" };
// The material tips: which one the member on the hook calls for, the first time one like it comes.
function materialTip(typeId) {
  const type = MEMBER_BY_ID[typeId];
  if (!type) return null;
  const mat = materialOf(type);
  if (mat.fragile) return "matGlass";
  if (mat.spreadsTo) return "matPipes";
  if (mat.steady) return "matCement";
  if (mat.weight >= HEAVY) return "matHeavy";
  return null;
}
// How long the lava warning and each tip stay up, in seconds of play.
const SHOW_FOR = 6;
// How near the end of the view the climber must come for the edge tip, in metres.
const EDGE_NEAR = 1.4;
// How close under a pencilled floor slab the climber must be for its tip, in metres.
const SLAB_NEAR = 2.5;

function read(key) {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}
function write(key, value) {
  try {
    if (value == null) localStorage.removeItem(key);
    else localStorage.setItem(key, value);
  } catch {
    // without storage the guide simply shows again next visit
  }
}
const readTips = () => new Set((read(TIPS_KEY) ?? "").split(",").filter(Boolean));

export function useGuide(engineRef, stats) {
  const [step, setStep] = useState(() => (read(DONE_KEY) ? null : "drop"));
  const [tip, setTip] = useState(null);
  const tipsShown = useRef(readTips());
  const since = useRef(0); // run time the current lava warning or tip went up
  const turnsBefore = useRef(0); // corners turned this run when the turn step came up

  const live = stats.mode === "play" && !stats.paused && !stats.over;

  const finishSteps = useCallback((how) => {
    write(DONE_KEY, "1");
    setStep(null);
    track("guide", { step: "steps", event: how });
  }, []);

  // Hold the run while the first three steps are open. Applied on every update, because a
  // restart resets the engine's hold.
  useEffect(() => {
    const eng = engineRef.current;
    if (eng && stats.mode === "play") {
      eng.holdLava(HELD.has(step));
      eng.holdAutoDrop(step === "drop");
      // while the steps are on, a drop onto the worker is caught instead of ending the run
      eng.shieldHead(HELD.has(step));
    }
  }, [engineRef, step, stats.mode, stats.elapsed]);

  // Move through the steps as the player does what they ask. (While the run is held the height
  // score stands still, so the climb is judged by where the climber stands, not by the score.)
  useEffect(() => {
    if (!live || !step) return;
    const c = engineRef.current?.character;
    const at = Number(stats.elapsed.toFixed(1));
    if (step === "drop" && stats.manualDrops >= 1) {
      track("guide", { step: "drop", event: "done", t: at });
      setStep("climb");
    } else if (step === "climb" && c && c.grounded && c.y - c.hh >= CLIMBED) {
      track("guide", { step: "climb", event: "done", t: at });
      turnsBefore.current = stats.turns;
      setStep("turn");
    } else if (step === "turn" && stats.turns > turnsBefore.current) {
      track("guide", { step: "turn", event: "done", t: at });
      // the edge tip has nothing left to teach
      tipsShown.current.add("edge");
      write(TIPS_KEY, [...tipsShown.current].join(","));
      since.current = stats.time;
      setStep("lava");
    } else if (step === "lava" && stats.time - since.current > SHOW_FOR) {
      finishSteps("done");
    }
  }, [live, step, stats.manualDrops, stats.turns, stats.elapsed, stats.time, engineRef, finishSteps]);

  // Count the drops the shield caught, so we can see how often new players aim onto the worker.
  const caughtBefore = useRef(0);
  useEffect(() => {
    if (stats.caught > caughtBefore.current) track("guide", { step, event: "caught", n: stats.caught });
    caughtBefore.current = stats.caught;
  }, [stats.caught, step]);

  // The tips, once the steps are behind them: each the first time it applies, for a few seconds.
  useEffect(() => {
    if (!live || step) return;
    if (tip) {
      if (stats.time - since.current > SHOW_FOR) setTip(null);
      return;
    }
    const eng = engineRef.current;
    if (!eng) return;
    const shown = tipsShown.current;
    const c = eng.character;
    const feet = c.y - c.hh;
    let next = null;
    if (!shown.has("edge") && !eng.turnInfo && Math.abs(c.x) > EDGE_LINE - EDGE_NEAR) next = "edge";
    else if (!shown.has("tip") && eng.tipForecast()) next = "tip";
    else if (
      !shown.has("slab") &&
      eng.members.some((m) => m.floor && !m.floor.active && m.body.translation().y - m.hy - feet < SLAB_NEAR)
    ) {
      next = "slab";
    } else {
      const mat = materialTip(stats.nowId);
      if (mat && !shown.has(mat)) next = mat;
    }
    if (!next) return;
    shown.add(next);
    write(TIPS_KEY, [...shown].join(","));
    since.current = stats.time;
    setTip(next);
  }, [live, step, tip, stats.time, stats.nowId, engineRef]);

  const skip = useCallback(() => {
    for (const id of Object.keys(TIP_TARGET)) tipsShown.current.add(id);
    write(TIPS_KEY, [...tipsShown.current].join(","));
    setTip(null);
    if (step) finishSteps(`skip:${step}`);
  }, [step, finishSteps]);

  // From the pause menu: forget it all, so the next run starts the guide over.
  const restartGuide = useCallback(() => {
    write(DONE_KEY, null);
    write(TIPS_KEY, null);
    tipsShown.current = new Set();
    setTip(null);
    setStep("drop");
  }, []);

  // Called synchronously after every start/restart, before the first simulation frame.
  const onRunStart = useCallback(() => {
    const next = read(DONE_KEY) ? null : "drop";
    since.current = 0;
    setTip(null);
    setStep(next);
    engineRef.current?.holdLava(next === "drop");
    engineRef.current?.holdAutoDrop(next === "drop");
    engineRef.current?.shieldHead(next === "drop");
  }, [engineRef]);

  const current = step ?? tip;
  return {
    id: live ? current : null,
    target: current ? (step ? STEPS.find((s) => s.id === step).target : TIP_TARGET[tip]) : null,
    index: step ? STEPS.findIndex((s) => s.id === step) : -1,
    total: STEPS.length,
    skip,
    restartGuide,
    onRunStart,
  };
}
