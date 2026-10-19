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

// The four control cards — mouse, keyboard, turning the face, a refused turn — shown on the start
// screen and again in the pause menu.
export default function ControlsGuide({ className = "" }) {
  return (
    <div className={`grid gap-3 md:grid-cols-2 xl:grid-cols-4 ${className}`}>
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
  );
}
