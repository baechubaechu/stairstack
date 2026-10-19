// TIPPING — how a member settles. Members go in square to the grid, and the physics is held to
// one readable rule instead of free tumbling:
//
// - A member never slides across the plan and never twists: while it falls it can only move
//   straight down, square.
// - The moment it lands, its support is the set of points it touches from below. If its centre
//   of mass is over that support it stays level. If not, it tips over the support's edge toward
//   the side its centre hangs out on — about one grid axis only, the one it hangs out further
//   along (dead diagonal: along its long side; a square member tips along x). Only then is it
//   free to move, and only that way and only as far as pivoting over the edge takes it — it
//   never slides off.
// - It keeps that one way of tipping until it is lifted clear of everything again, and decides
//   afresh when it next lands.
//
// Every tilt is about x or z, so every slope in the tower runs along a grid axis — and a member
// landing on a slope hangs off its top edge toward the downhill side, so it tips to lie along the
// slope with the same rule.
import { convexHull } from "./hull";

// Steps with nothing underneath before a landed member counts as airborne again.
const AIRBORNE_STEPS = 6;
// How close the two overhangs must be to count as a dead diagonal, in metres.
const DIAGONAL = 0.02;
// The most a tipping member's centre may shift the way it tips, in metres (or its half thickness,
// if that is less).
const PIVOT_REACH = 0.3;

// Hold a newly added member square: straight down only, no turning of any kind.
export function holdSquare(body) {
  body.setEnabledTranslations(false, true, false, false);
  body.setEnabledRotations(false, false, false, false);
}

// The plan points (x, z) where a member rests on something below it: contacts whose normal is
// mostly vertical, under its centre. A neighbour butting against its side doesn't hold it up.
function supportPoints(world, m) {
  const pts = [];
  const cy = m.body.translation().y;
  world.contactPairsWith(m.collider, (other) => {
    world.contactPair(m.collider, other, (manifold) => {
      if (Math.abs(manifold.normal().y) < 0.5) return;
      for (let i = 0; i < manifold.numSolverContacts(); i++) {
        const p = manifold.solverContactPoint(i);
        if (p.y < cy) pts.push([p.x, p.z]);
      }
    });
  });
  return pts;
}

// How far, and which way, a plan point lies outside a convex support (a point, a segment or a
// polygon): the vector from the nearest support point to it, or null when it is over it.
export function overhang(support, c) {
  if (support.length >= 3 && inside(support, c)) return null;
  let best = null;
  for (let i = 0; i < support.length; i++) {
    const a = support[i];
    const b = support[(i + 1) % support.length];
    const q = nearestOnSegment(a, b, c);
    const d = [c[0] - q[0], c[1] - q[1]];
    if (!best || Math.hypot(d[0], d[1]) < Math.hypot(best[0], best[1])) best = d;
  }
  return best && Math.hypot(best[0], best[1]) > 1e-4 ? best : null;
}

function inside(poly, c) {
  for (let i = 0; i < poly.length; i++) {
    const a = poly[i];
    const b = poly[(i + 1) % poly.length];
    if ((b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]) < -1e-6) return false;
  }
  return true;
}

function nearestOnSegment(a, b, c) {
  const dx = b[0] - a[0];
  const dz = b[1] - a[1];
  const len2 = dx * dx + dz * dz;
  const t = len2 ? Math.max(0, Math.min(1, ((c[0] - a[0]) * dx + (c[1] - a[1]) * dz) / len2)) : 0;
  return [a[0] + t * dx, a[1] + t * dz];
}

// Which way a member hanging out by `d` tips: "x" (over an edge running along z) or "z". A dead
// diagonal goes along the member's long side as it lies now; a square member along x.
export function tipAxis(d, m) {
  const ax = Math.abs(d[0]);
  const az = Math.abs(d[1]);
  if (Math.abs(ax - az) > DIAGONAL) return ax > az ? "x" : "z";
  const r = m.body.rotation();
  // world x of the member's own x axis: near 1 when it lies unturned, near 0 a quarter turn round
  const alongX = Math.abs(1 - 2 * (r.y * r.y + r.z * r.z)) > 0.5;
  const fx = alongX ? m.hx : m.hz;
  const fz = alongX ? m.hz : m.hx;
  return fz > fx ? "z" : "x";
}

// Free a landed member to tip one way: turning about the edge it hangs over, and moving only in
// the direction it tips, so it can pivot over that edge rather than turn on the spot.
function freeToTip(body, axis) {
  if (axis === "x") {
    body.setEnabledTranslations(true, true, false, true);
    body.setEnabledRotations(false, false, true, true);
  } else {
    body.setEnabledTranslations(false, true, true, true);
    body.setEnabledRotations(true, false, false, true);
  }
}

// Run after each physics step: judge every member that has just landed, and notice the ones that
// have been lifted clear.
export function settle(g) {
  for (const m of g.members) {
    const tip = m.tip;
    if (!tip || m.stone) continue;
    if (tip.axis) holdToPivot(m);
    const support = supportPoints(g.world, m);
    if (!support.length) {
      if (tip.landed && ++tip.air >= AIRBORNE_STEPS) {
        tip.landed = false;
        tip.axis = null;
        holdSquare(m.body);
      }
      continue;
    }
    tip.air = 0;
    if (tip.landed) continue;
    tip.landed = true;
    const t = m.body.translation();
    const d = overhang(convexHull(support), [t.x, t.z]);
    if (!d) continue; // over its support: it stays level
    tip.axis = tipAxis(d, m);
    tip.from = tip.axis === "x" ? t.x : t.z;
    freeToTip(m.body, tip.axis);
  }
}

// Pivoting over an edge only shifts a member's centre a little — about half its thickness. Any
// further and it is sliding, which members don't do: hold it there and take that motion away.
function holdToPivot(m) {
  const { body, tip } = m;
  const reach = Math.min(PIVOT_REACH, m.hy);
  const t = body.translation();
  const at = tip.axis === "x" ? t.x : t.z;
  const held = Math.max(tip.from - reach, Math.min(tip.from + reach, at));
  if (held === at) return;
  const v = body.linvel();
  if (tip.axis === "x") {
    body.setTranslation({ x: held, y: t.y, z: t.z }, true);
    body.setLinvel({ x: 0, y: v.y, z: v.z }, true);
  } else {
    body.setTranslation({ x: t.x, y: t.y, z: held }, true);
    body.setLinvel({ x: v.x, y: v.y, z: 0 }, true);
  }
}
