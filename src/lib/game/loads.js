// What a landing does to what it lands on. A heavy member (HEAVY) coming down onto glass breaks
// it — the glass is gone, and whatever it held up drops — and onto a bundle of pipes bursts the
// bundle open, so the pipes lie flat side by side, lower and wider, where the bundle was. Judged
// once, the moment a member lands (tipping.js notes the landings). Everything else just bears the
// weight.
import { HEAVY, MEMBER_BY_ID, materialOf } from "./constants";
import { memberVertices, quatToMat3 } from "./elevation";
import { addMember } from "./world";

// How long an effect (a shatter, a burst bundle) stays listed for the views to draw, in seconds.
const EFFECT_SECONDS = 2;
// A bundle only bursts open while it lies level (cos of the most it may lean).
const LEVEL = 0.995;

// The members `m` is resting on: whose colliders touch it from below.
function supporters(g, m) {
  const out = new Set();
  const cy = m.body.translation().y;
  for (const collider of m.colliders) {
    g.world.contactPairsWith(collider, (other) => {
      g.world.contactPair(collider, other, (manifold) => {
        if (Math.abs(manifold.normal().y) < 0.5) return;
        for (let i = 0; i < manifold.numSolverContacts(); i++) {
          if (manifold.solverContactPoint(i).y >= cy) continue;
          const body = other.parent();
          const s = body && g.members.find((mm) => mm !== m && mm.body.handle === body.handle);
          if (s) out.add(s);
          return;
        }
      });
    });
  }
  return [...out];
}

export function removeMember(g, m) {
  g.world.removeRigidBody(m.body);
  g.members.splice(g.members.indexOf(m), 1);
}

export function effect(g, kind, m) {
  const vs = memberVertices(m);
  const c = vs.reduce((s, v) => [s[0] + v[0] / vs.length, s[1] + v[1] / vs.length, s[2] + v[2] / vs.length], [0, 0, 0]);
  g.state.effectSeq = (g.state.effectSeq ?? 0) + 1;
  g.state.effects.push({ id: g.state.effectSeq, kind, x: c[0], y: c[1], z: c[2], w: m.hx, hex: m.hex, at: g.state.elapsed });
}

// Burst a pipe bundle open: the flat pipes take its place, lying the way it lay, on what it lay on —
// if there is room for them. Returns whether it did.
function spread(g, m, into, lander) {
  const R = quatToMat3(m.body.rotation());
  if (R[4] < LEVEL) return false;
  const t = m.body.translation();
  const bottom = Math.min(...memberVertices(m).map((v) => v[1]));
  const y = bottom + into.h / 2;
  const yaw = Math.atan2(R[2], R[0]);
  // the wider pipes must not land inside a neighbour (the solver would fling one of them)
  const { RAPIER, world } = g;
  const shape = new RAPIER.Cuboid(into.w / 2 - 0.02, into.h / 2 - 0.02, into.d / 2 - 0.02);
  const rot = { x: 0, y: Math.sin(yaw / 2), z: 0, w: Math.cos(yaw / 2) };
  let blocked = false;
  world.intersectionsWithShape({ x: t.x, y, z: t.z }, rot, shape, (collider) => {
    const body = collider.parent();
    if (body && (body.handle === m.body.handle || body.handle === lander.body.handle)) return true;
    blocked = true;
    return false;
  });
  if (blocked) return false;
  effect(g, "burst", m);
  removeMember(g, m);
  addMember(g, into, t.x, y, t.z, { x: 0, y: yaw, z: 0 });
  lander.body.wakeUp();
  return true;
}

// After a physics step: settle what this step's landings did, and let old effects go.
export function applyLoads(g) {
  const { state } = g;
  const landings = state.landings.splice(0);
  for (const m of landings) {
    if (!g.members.includes(m)) continue;
    if (materialOf(m.type).weight < HEAVY) continue;
    for (const s of supporters(g, m)) {
      const mat = materialOf(s.type);
      if (mat.fragile) {
        effect(g, "shatter", s);
        removeMember(g, s);
        m.body.wakeUp();
      } else if (mat.spreadsTo) {
        spread(g, s, MEMBER_BY_ID[mat.spreadsTo], m);
      }
    }
  }
  while (state.effects.length && state.elapsed - state.effects[0].at > EFFECT_SECONDS) state.effects.shift();
}
