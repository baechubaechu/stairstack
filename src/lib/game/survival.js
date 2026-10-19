// The arcade rules of the endless run, kept apart from the physics: the clock and the score it
// earns, the lava climbing out of the floor, and the way members sink in faster the longer the
// run goes on. Everything here reads the same rigid bodies the rest of the engine does.
import { FALL_MAX, FALL_RAMP, LAVA_ACCEL, LAVA_DELAY, LAVA_SPEED, LAVA_START, SCORE_PER_SECOND } from "./constants";
import { memberVertices } from "./elevation";

// Every run starts the same way: the clock at zero, and the lava at the foot of the tower.
export function resetRun(state) {
  state.elapsed = 0;
  state.score = 0;
  state.lava = LAVA_START;
  state.cause = null;
}

// One frame of the run's own clock: the time, the score it buys, and the lava's climb. Only
// called while the world is live, so a pause holds the whole run exactly where it stands.
export function advanceRun(state, dt) {
  state.elapsed += dt;
  state.score = Math.floor(state.elapsed * SCORE_PER_SECOND);
  // the lava waits out the opening, then rises at a pace that grows from the moment it moved
  const rising = state.elapsed - LAVA_DELAY;
  if (rising > 0) state.lava += (LAVA_SPEED + LAVA_ACCEL * rising) * Math.min(dt, rising);
}

// How much faster members sink in now than at the first second of the run.
export function sinkFactor(elapsed) {
  return Math.min(1 + elapsed * FALL_RAMP, FALL_MAX);
}

// Take every member the lava has closed over completely out of the world — whatever it was
// carrying loses its footing and comes down after it.
export function swallowMembers(state, members, world) {
  for (let i = members.length - 1; i >= 0; i--) {
    let top = -Infinity;
    for (const v of memberVertices(members[i])) if (v[1] > top) top = v[1];
    if (top >= state.lava) continue;
    world.removeRigidBody(members[i].body);
    members.splice(i, 1);
  }
}