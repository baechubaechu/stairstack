// The arcade rules of the endless run, kept apart from the physics: the clock and the score it
// earns, the lava climbing out of the floor, and the way members sink in faster the longer the
// run goes on. Everything here reads the same rigid bodies the rest of the engine does.
import {
  BURY_DEPTH,
  FALL_MAX,
  FALL_RAMP,
  LAVA_ACCEL,
  LAVA_DELAY,
  LAVA_SPEED,
  LAVA_START,
  SCORE_PER_METRE,
  SCORE_PER_SECOND,
  STONE,
  VIEW_BOTTOM,
} from "./constants";
import { memberVertices } from "./elevation";
import { viewRise } from "./world";

// Every run starts the same way: the clock at zero, and the lava at the foot of the tower.
export function resetRun(state) {
  state.elapsed = 0;
  state.dropped = 0;
  state.manualDrops = 0;
  state.autoDropHeld = false;
  state.turns = 0;
  state.best = 0;
  state.timeScore = 0;
  state.heightScore = 0;
  state.score = 0;
  state.lava = LAVA_START;
  state.clock = 0;
  state.lavaHeld = false;
  state.cause = null;
}

// The height score keeps the best height the climber has stood at — dropping back down never
// takes points away. (The engine only calls this while they are standing on something.)
export function reachHeight(state, feet) {
  if (feet <= state.best) return;
  state.best = feet;
  state.heightScore = Math.floor(state.best * SCORE_PER_METRE);
  state.score = state.timeScore + state.heightScore;
}

// One frame of the run: the time, the score it buys, and the lava's climb. Only called while the
// world is live, so a pause holds the whole run exactly where it stands.
// The run keeps two clocks. `elapsed` is how long the world has been running. `clock` is the run
// that counts — the time score, the lava, and how fast members sink in all go by it — and it
// stands still while the first-run guide holds the run (until the player has dropped a member,
// climbed onto one and turned a corner), so waiting in the guide earns nothing and makes nothing
// harder. Once it is let go the lava waits out the opening, then rises at a pace that grows from
// the moment it moved.
export function advanceRun(state, dt) {
  state.elapsed += dt;
  if (state.lavaHeld) return;
  state.clock += dt;
  state.timeScore = Math.floor(state.clock * SCORE_PER_SECOND);
  state.score = state.timeScore + state.heightScore;
  const rising = state.clock - LAVA_DELAY;
  if (rising > 0) state.lava += (LAVA_SPEED + LAVA_ACCEL * rising) * Math.min(dt, rising);
}

// How much faster members sink in now than at the first second of the run.
export function sinkFactor(elapsed) {
  return Math.min(1 + elapsed * FALL_RAMP, FALL_MAX);
}

// The lava doesn't take what it swallows: a member it has closed over completely sets hard where
// it is, into basalt — a fixed body, so the rest of the tower keeps standing on it.
export function petrify(g) {
  const { state, RAPIER } = g;
  for (const m of g.members) {
    if (m.stone) continue;
    const verts = memberVertices(m);
    let top = -Infinity;
    for (const v of verts) if (v[1] > top) top = v[1];
    if (top >= state.lava) continue;
    m.body.setLinvel({ x: 0, y: 0, z: 0 }, false);
    m.body.setAngvel({ x: 0, y: 0, z: 0 }, false);
    m.body.setBodyType(RAPIER.RigidBodyType.Fixed, true);
    // `sil` / `plan` cache its projections the first time each is asked for
    m.stone = { verts, top, sil: {}, plan: null };
    m.hex = STONE.hex;
    m.color = STONE.color;
  }
}

// Basalt deep under the lava and out of the bottom of the window is gone for good — it can't be
// seen or reached, and being fixed, nothing it held up can fall when it goes.
export function buryDeep(g) {
  const floor = Math.min(viewRise(g) + VIEW_BOTTOM, g.state.lava - BURY_DEPTH);
  for (let i = g.members.length - 1; i >= 0; i--) {
    const m = g.members[i];
    if (!m.stone || m.stone.top >= floor) continue;
    g.world.removeRigidBody(m.body);
    g.members.splice(i, 1);
  }
}
