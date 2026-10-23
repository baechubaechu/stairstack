// The member in play: queued at the top of the play area, sinking on its own, and turned into
// a rigid body when it lands or the player clicks.
import { AUTO_FALL_SECONDS } from "./constants";

// The shortest time a member hangs in play before it settles on its own, in seconds.
const MIN_HANG = 0.8;
import { sinkFactor } from "./survival";
import { refresh } from "./views";
import { memberVertices } from "./elevation";
import { addMember, nextType, placement, quatFromEuler, releaseY } from "./world";

// Queue the next member at the top of the play area — wherever the window has climbed to —
// and let it start sinking. `from` remembers where its fall began.
export function spawnActive(g) {
  const y = releaseY(g);
  g.state.active = { type: nextType(g), y, from: y, born: g.state.elapsed };
}

// Turn the descending member into a rigid body where it is now. It keeps its height and
// falls under gravity, so a click reads as an immediate drop. It goes in square to the grid,
// so it sits flush on whatever is under it.
export function release(g) {
  const a = g.state.active;
  if (!a) return false;
  const p = placement(g);
  const y = clearOf(g, a.type, p.x, p.y, p.z, p.yaw);
  addMember(g, a.type, p.x, y, p.z, { x: 0, y: p.yaw, z: 0 });
  g.state.active = null;
  g.state.dropped += 1;
  spawnActive(g);
  refresh(g);
  return true;
}

// A member is never released into another one. The landing height ignores members still falling
// (so the one just released can't hold the next one up), which means a quick second click over the
// same spot would put the new member inside the last, still on its way down — and with their
// sideways motion locked the solver could only fling one of them straight up. So the release is
// lifted clear of anything it would overlap, first.
function clearOf(g, type, x, y, z, yaw) {
  const { RAPIER, world, members } = g;
  const shape = new RAPIER.Cuboid(type.w / 2, type.h / 2, type.d / 2);
  const rot = quatFromEuler(0, yaw, 0);
  let at = y;
  for (let i = 0; i < 8; i++) {
    let top = -Infinity;
    world.intersectionsWithShape({ x, y: at, z }, rot, shape, (collider) => {
      const body = collider.parent();
      const m = body && members.find((mm) => mm.body.handle === body.handle);
      if (m) top = Math.max(top, ...memberVertices(m).map((v) => v[1]));
      return true;
    });
    if (top === -Infinity) return at;
    at = top + type.h / 2 + 0.02;
  }
  return at;
}

// The unattended fall: the member sinks at a steady slow rate and settles on its own,
// taking AUTO_FALL_SECONDS from where it was released down to whatever it lands on — and less
// time the further the run has gone, so the drop presses harder as the lava closes in.
export function descend(g, dt) {
  if (g.state.autoDropHeld) return;
  const a = g.state.active;
  if (!a) return;
  const p = placement(g);
  const rate = Math.max(0.6, (a.from - p.landing) / AUTO_FALL_SECONDS) * sinkFactor(g.state.elapsed);
  a.y = Math.max(p.landing, a.y - rate * dt);
  // Never settles on its own sooner than MIN_HANG after it appeared: where the stack already
  // reaches the release height there is nothing to sink through, and without this every member
  // would land the moment it spawned, one after another, as fast as the frames go.
  if (a.y <= p.landing + 0.001 && g.state.elapsed - a.born >= MIN_HANG) release(g);
}
