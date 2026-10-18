// DIRECTIONAL PLATES — PLACEHOLDER. This mechanic is known to be implemented wrong and will be
// rebuilt from scratch; everything about it lives in this file (and `drawGate` in the plan
// view), so it can be replaced or deleted in one place. Don't extend it.
//
// As the climb goes on the tower grows a small floor plate on its summit: walled on three
// sides, open toward one compass point, so the one way off it is the way the elevation turns
// next. The plan view shows which way that is before the climber has even reached it —
// pencilled while it is still unvisited, inked in once their feet have found it. The plate is
// solid from the moment it lands, like every other member of the stack.
import { FACES } from "./constants";
import { memberVertices } from "./elevation";
import { FALLING, addMember, memberTop, toU, towerTop } from "./world";

export const GATE = { w: 1.5, h: 0.26, d: 1.5, color: 0xd8cdb6, hex: "#d8cdb6", label: "Plate" };
export const GATE_ORDER = ["N", "E", "S", "W"]; // one side after another: every way round gets used
export const GATE_RISE = 1.5; // metres of climb between one plate and the next
export const GATE_SETTLE = 0.4; // seconds a fresh plate is exempt from striking the climber
// The plan direction each compass point opens toward — the way out of the plate, and the way
// the world turns when the climber leaves through it.
export const GATE_DIR = {
  N: { x: 0, z: -1 },
  S: { x: 0, z: 1 },
  E: { x: 1, z: 0 },
  W: { x: -1, z: 0 },
};

// A plate the tower has just set down is a build step, never a block coming down on the
// climber's head: it cannot end the run.
export function isFreshGate(m) {
  return !!(m.gate && m.gate.fresh > 0);
}

// One plate is already down on the floor when a run opens — clear of the starter stack, out
// in the open plan — so the way round the tower is part of the layout from the first second.
export function seedGate(g) {
  const { state } = g;
  const first = addMember(g, GATE, -3.5, GATE.h / 2 + 0.02, 2.5, { x: 0, y: 0, z: 0 });
  const seedDir = FACES[FACES[state.face].right].compass; // out of the end the run opens onto
  first.gate = { dir: seedDir, active: false, fresh: GATE_SETTLE };
  state.gateCursor = GATE_ORDER.indexOf(seedDir) + 1; // and the cycle carries on from there
  state.gateAt = towerTop(g);
}

// The tower grows a plate on its summit as the climb goes on. It rests on the highest member
// that is sitting still — so it always appears where the climb has got to, never mid-air —
// and it opens toward the next compass side in turn.
function spawnGate(g) {
  const { state } = g;
  let peak = null;
  let top = 0;
  for (const m of g.members) {
    if (m.body.linvel().y < FALLING) continue;
    const mtop = memberTop(m);
    if (mtop > top) {
      top = mtop;
      peak = m;
    }
  }
  if (!peak) return false;
  const at = peak.body.translation();
  // The plate opens toward the next compass side in the cycle that the view being read can
  // actually walk to, so its way out is a way out of the face the climber is standing on.
  const f = FACES[state.face];
  const ends = [FACES[f.left].compass, FACES[f.right].compass];
  let dir = ends[0];
  for (let i = 0; i < GATE_ORDER.length; i++) {
    const side = GATE_ORDER[(state.gateCursor + i) % GATE_ORDER.length];
    if (!ends.includes(side)) continue;
    dir = side;
    state.gateCursor += i + 1;
    break;
  }
  // set down within a couple of centimetres of rest: it never falls onto anything
  const m = addMember(g, GATE, at.x, top + GATE.h / 2 + 0.03, at.z, { x: 0, y: 0, z: 0 });
  m.gate = { dir, active: false, fresh: GATE_SETTLE };
  return true;
}

// A fresh plate settles into place; it cannot strike the climber until it has.
export function settleGates(g, dt) {
  for (const m of g.members) if (m.gate && m.gate.fresh > 0) m.gate.fresh = Math.max(0, m.gate.fresh - dt);
}

// Every GATE_RISE metres of climb the tower grows another directional plate, so the way on
// keeps changing sides — and the plan shows where each one lets the climber out.
export function growGates(g) {
  if (towerTop(g) >= g.state.gateAt + GATE_RISE && spawnGate(g)) g.state.gateAt = towerTop(g);
}

// A plate switches on the moment the climber's feet find it: from then on the plan inks it in
// solid, so a plate they have stood on reads differently from one they have not.
export function touchGates(g) {
  const { character } = g;
  const feet = character.y - character.hh;
  for (const m of g.members) {
    if (!m.gate || m.gate.active) continue;
    let top = -Infinity;
    let minU = Infinity;
    let maxU = -Infinity;
    for (const v of memberVertices(m)) {
      const u = toU(g, v[0], v[2]);
      if (v[1] > top) top = v[1];
      if (u < minU) minU = u;
      if (u > maxU) maxU = u;
    }
    if (character.x < minU || character.x > maxU) continue;
    if (Math.abs(feet - top) > 0.14) continue;
    m.gate.active = true;
  }
}
