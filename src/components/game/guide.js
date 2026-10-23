// The first-run guide. A first-time player gets one short prompt at a time over the view it is
// about, and each goes away when they have done the thing it asks: drop a member, climb onto
// one. The lava is held still until both are done, so nobody is burnt before they can move;
// then it is let go with a warning. After that, three tips each appear once, the first time
// they matter: walking off an edge turns the tower, the tip arrow, a pencilled floor slab.
// Everything is remembered per browser; the pause menu can start the guide over.
import { useCallback, useEffect, useRef, useState } from "react";
import { EDGE_LINE } from "@/lib/game/constants";
import { track } from "@/lib/telemetry";

const DONE_KEY = "stairstack.guide";
const TIPS_KEY = "stairstack.guide.tips";
// The steps in order: what each asks for, and which view it points at.
export const STEPS = [
  { id: "drop", target: "plan" },
  { id: "climb", target: "elevation" },
  { id: "lava", target: "elevation" },
];
const TIP_TARGET = { edge: "elevation", tip: "plan", slab: "elevation" };
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

  const live = stats.mode === "play" && !stats.paused && !stats.over;

  const finishSteps = useCallback((how) => {
    write(DONE_KEY, "1");
    setStep(null);
    track("guide", { step: "steps", event: how });
  }, []);

  // Hold the lava while the first two steps are open. Applied on every update, because a
  // restart resets the engine's hold.
  useEffect(() => {
    const eng = engineRef.current;
    if (eng && stats.mode === "play") {
      eng.holdLava(step === "drop" || step === "climb");
      eng.holdAutoDrop(step === "drop");
    }
  }, [engineRef, step, stats.mode, stats.time]);

  // Move through the steps as the player does what they ask.
  useEffect(() => {
    if (!live || !step) return;
    if (step === "drop" && stats.manualDrops >= 1) {
      track("guide", { step: "drop", event: "done", t: Number(stats.time.toFixed(1)) });
      setStep("climb");
    } else if (step === "climb" && stats.best >= 0.2) {
      track("guide", { step: "climb", event: "done", t: Number(stats.time.toFixed(1)) });
      since.current = stats.time;
      setStep("lava");
    } else if (step === "lava" && stats.time - since.current > SHOW_FOR) {
      finishSteps("done");
    }
  }, [live, step, stats.manualDrops, stats.best, stats.time, finishSteps]);

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
    }
    if (!next) return;
    shown.add(next);
    write(TIPS_KEY, [...shown].join(","));
    since.current = stats.time;
    setTip(next);
  }, [live, step, tip, stats.time, engineRef]);

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
