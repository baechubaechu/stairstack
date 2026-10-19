// The member in play: queued at the top of the play area, sinking on its own, and turned into
// a rigid body when it lands or the player clicks.
import { AUTO_FALL_SECONDS } from "./constants";
import { sinkFactor } from "./survival";
import { refresh } from "./views";
import { addMember, nextType, placement, releaseY } from "./world";

// Queue the next member at the top of the play area — wherever the window has climbed to —
// and let it start sinking. `from` remembers where its fall began.
export function spawnActive(g) {
  const y = releaseY(g);
  g.state.active = { type: nextType(g), y, from: y };
}

// Turn the descending member into a rigid body where it is now. It keeps its height and
// falls under gravity, so a click reads as an immediate drop.
export function release(g) {
  const a = g.state.active;
  if (!a) return false;
  const p = placement(g);
  addMember(g, a.type, p.x, p.y, p.z, {
    x: (Math.random() - 0.5) * 0.03,
    y: p.yaw,
    z: (Math.random() - 0.5) * 0.03,
  });
  g.state.active = null;
  spawnActive(g);
  refresh(g);
  return true;
}

// The unattended fall: the member sinks at a steady slow rate and settles on its own,
// taking AUTO_FALL_SECONDS from where it was released down to whatever it lands on — and less
// time the further the run has gone, so the drop presses harder as the lava closes in.
export function descend(g, dt) {
  const a = g.state.active;
  if (!a) return;
  const p = placement(g);
  const rate = Math.max(0.6, (a.from - p.landing) / AUTO_FALL_SECONDS) * sinkFactor(g.state.elapsed);
  a.y = Math.max(p.landing, a.y - rate * dt);
  if (a.y <= p.landing + 0.001) release(g);
}
