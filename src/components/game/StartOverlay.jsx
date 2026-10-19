import { useState } from "react";
import { Button } from "@/components/ui/button";
import { defaultName, getName, setName, telemetryEnabled } from "@/lib/telemetry";
import ControlsGuide from "@/components/game/ControlsGuide";

export default function StartOverlay({ engineState, onStart }) {
  const ready = engineState === "ready";
  const [name, setNameState] = useState(getName);
  return (
    <div
      data-testid="start-screen"
      className="fixed inset-0 z-40 flex items-center justify-center overflow-y-auto bg-slate-900/25 px-4 py-4 backdrop-blur-sm"
    >
      <div className="my-auto w-full max-w-[1120px] rounded-xl border border-border bg-card p-5 shadow-2xl md:p-6">
        <p className="font-mono text-[9px] uppercase tracking-[0.42em] text-amber-700/80">Stairstack</p>
        <h2 data-testid="start-title" className="mt-1.5 font-display text-3xl font-semibold tracking-tight text-foreground">
          Stack it. Climb it.
        </h2>
        <p className="mt-1.5 max-w-[820px] text-[13px] leading-relaxed text-muted-foreground">
          Members sink in on their own — and quicker the longer you last. Drop them where you want,
          then climb the silhouettes they leave behind. Every second you stay alive scores, so the
          only way up the table is to keep going.
        </p>

        <ControlsGuide className="mt-4" />

        <p className="mt-3.5 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-[12px] leading-relaxed text-rose-700">
          Lava climbs out of the floor: it floods the ground first, then rises up the stack —
          whatever it swallows sets hard into basalt, ground you can keep building on. Touch the
          lava and the run is over. A member coming down on your head ends it too.
        </p>

        {telemetryEnabled ? (
          <input
            data-testid="player-name"
            value={name}
            maxLength={16}
            placeholder={`Leaderboard nickname (optional — you show up as ${defaultName()})`}
            onChange={(e) => {
              setNameState(e.target.value);
              setName(e.target.value);
            }}
            className="mt-3.5 w-full rounded-md border border-border bg-background px-3 py-2 font-mono text-[12px]"
          />
        ) : null}

        <Button className="mt-3.5 w-full" data-testid="btn-start" disabled={!ready} onClick={onStart}>
          {ready ? "Game Start" : engineState === "failed" ? "Engine failed to start" : "Starting engine…"}
        </Button>
      </div>
    </div>
  );
}