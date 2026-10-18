import { Button } from "@/components/ui/button";
import ControlCard from "@/components/game/ControlCard";
import MouseDiagram from "@/components/game/diagrams/MouseDiagram";
import KeyboardDiagram from "@/components/game/diagrams/KeyboardDiagram";
import RotationDiagram from "@/components/game/diagrams/RotationDiagram";
import TurnBackDiagram from "@/components/game/diagrams/TurnBackDiagram";
import FaceTurnCard from "@/components/game/FaceTurnCard";
import { ROTATE_STEP_DEG } from "@/lib/game/constants";

const MOUSE_ITEMS = [
  { key: "Aim", text: "Move the mouse over the plan to choose where the member lands." },
  { key: "Rotate", text: `The wheel turns it ${ROTATE_STEP_DEG}° at a time.` },
  { key: "Drop", text: "Left click drops it right where it is." },
];

const KEY_ITEMS = [
  { key: "Walk", text: "A / D moves the climber along the view being read." },
  { key: "Jump", text: "W or Space jumps. Jumping into a member above you is safe." },
  { key: "Pause", text: "Esc stops the run where it stands, and starts it again." },
];

export default function StartOverlay({ engineState, onStart }) {
  const ready = engineState === "ready";
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

        <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <ControlCard title="Mouse" diagram={<MouseDiagram />} items={MOUSE_ITEMS} />
          <ControlCard title="Keyboard" diagram={<KeyboardDiagram />} items={KEY_ITEMS} />
          <FaceTurnCard
            title="Face turn"
            diagram={<RotationDiagram />}
            footnote="Right: front → right → back → left · Left: the reverse"
          >
            Walk off either end of the view and the world turns 90° to that side's elevation over
            half a second — the climber enters it from the far side, so keep walking the same way.
          </FaceTurnCard>
          <FaceTurnCard
            title="Turn refused"
            diagram={<TurnBackDiagram />}
            footnote="Step clear of the end before trying again"
          >
            If a member already fills the spot the climber would arrive on, the world turns to that
            face and comes straight back over the same half second — the elevation you were reading
            stays put.
          </FaceTurnCard>
        </div>

        <p className="mt-3.5 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-[12px] leading-relaxed text-rose-700">
          Lava climbs out of the floor: it floods the ground first, then eats the stack from
          underneath — touch it and the run is over. A member coming down on your head ends it too.
        </p>

        <Button className="mt-3.5 w-full" data-testid="btn-start" disabled={!ready} onClick={onStart}>
          {ready ? "Game Start" : engineState === "failed" ? "Engine failed to start" : "Starting engine…"}
        </Button>
      </div>
    </div>
  );
}