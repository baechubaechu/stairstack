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
import { GROUND_HALF, comOf } from "./constants";
import { convexHull } from "./hull";

// Steps with nothing underneath before a landed member counts as airborne again.
const AIRBORNE_STEPS = 6;
// How often, in steps, a member that has landed level is checked for still being held up.
const SETTLED_EVERY = 8;
// How close the two overhangs must be to count as a dead diagonal, in metres.
const DIAGONAL = 0.02;
// A centre this close to the edge of its support still counts as over it, in metres — so a
// member centred right on an edge holds, and the forecast (which samples the support) agrees.
const ON_EDGE = 0.1;
// Spacing of the downward probes the forecast feels the stack with, and how close to the highest
// one a probe must hit to count as touching first, in metres.
const PROBE = 0.125;
const FIRST_TOUCH = 0.02;
// The most a tipping member's centre may shift the way it tips, in metres (or its half thickness,
// if that is less).
const PIVOT_REACH = 0.3;
// How far inside the plate's edge a tipping member's centre must stay, in metres.
const PLATE_MARGIN = 0.25;
// Speeds no member reaches in play, in m/s: nothing throws one upward or sideways, and nothing
// falls far enough to come down this fast. A body past them has been kicked by the solver.
const KICK_UP = 3;
const KICK_SIDE = 8;
const KICK_DOWN = 60;

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
  for (const collider of m.colliders) {
    world.contactPairsWith(collider, (other) => {
      world.contactPair(collider, other, (manifold) => {
        if (Math.abs(manifold.normal().y) < 0.5) return;
        for (let i = 0; i < manifold.numSolverContacts(); i++) {
          const p = manifold.solverContactPoint(i);
          if (p.y < cy) pts.push([p.x, p.z]);
        }
      });
    });
  }
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
  return best && Math.hypot(best[0], best[1]) > ON_EDGE ? best : null;
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
    // a member at rest has nothing to decide, and doesn't move
    if (m.body.isSleeping()) continue;
    tip.tick = (tip.tick ?? 0) + 1;
    if (kicked(m)) continue;
    if (tip.axis) holdToPivot(m);
    // A tower is one touching heap that new members keep awake, so this runs for every member on
    // every step. One that has landed level only needs watching for its support going from under
    // it, which can wait a few steps; one still falling, or tipping, is watched every step.
    if (tip.landed && !tip.axis && tip.tick % SETTLED_EVERY) continue;
    const support = supportPoints(g.world, m);
    if (!support.length) {
      // tipped clear of its edge: from here it only drops, straight down
      if (tip.axis && !tip.held) lockTravel(m);
      if (tip.landed && ++tip.air >= AIRBORNE_STEPS) {
        tip.landed = false;
        tip.axis = null;
        tip.held = false;
        holdSquare(m.body);
      }
      continue;
    }
    tip.air = 0;
    if (tip.landed) continue;
    tip.landed = true;
    const t = m.body.translation();
    // what has to be over the support is the member's weight: a plain box's middle, or for a
    // shaped one (a stair, an L) wherever its parts put it
    const c = m.parts.length > 1 ? m.body.worldCom() : t;
    const d = overhang(convexHull(support), [c.x, c.z]);
    if (!d) continue; // over its support: it stays level
    tip.axis = tipAxis(d, m);
    tip.from = tip.axis === "x" ? t.x : t.z;
    freeToTip(m.body, tip.axis);
  }
}

// The safety net under all these locks. When two members touch where neither can give way along
// the contact (both locked that way), the solver's push between them has no limit, and one of
// them is shot off at thousands of metres a second. Every member keeps where it was after the
// last good step; one caught moving impossibly fast goes back there and stops. Returns true if
// it had to.
function kicked(m) {
  const { body } = m;
  const v = body.linvel();
  if (v.y < KICK_UP && v.y > -KICK_DOWN && Math.abs(v.x) < KICK_SIDE && Math.abs(v.z) < KICK_SIDE) {
    if (!m.tip.last || m.tip.tick % 4 === 0) m.tip.last = { t: body.translation(), q: body.rotation() };
    return false;
  }
  if (m.tip.last) {
    body.setTranslation(m.tip.last.t, true);
    body.setRotation(m.tip.last.q, true);
  }
  body.setLinvel({ x: 0, y: 0, z: 0 }, true);
  body.setAngvel({ x: 0, y: 0, z: 0 }, true);
  return true;
}

// Pivoting over an edge only shifts a member's centre a little. Any further and it is sliding,
// which members don't do: past PIVOT_REACH its movement that way is locked again — it can go on
// turning over the edge, but no longer travel. It is never moved back by hand: putting a body
// where the solver didn't would push it into its neighbours (see kicked).
function holdToPivot(m) {
  const { body, tip } = m;
  if (tip.held) return;
  const t = body.translation();
  const at = tip.axis === "x" ? t.x : t.z;
  // as far as the pivot takes it — and never with its centre off the plate
  if (Math.abs(at - tip.from) <= PIVOT_REACH && Math.abs(at) <= GROUND_HALF - PLATE_MARGIN) return;
  lockTravel(m);
}

// Stop a tipping member travelling: it keeps turning about its edge, but moves only up and down.
function lockTravel(m) {
  const { body, tip } = m;
  tip.held = true;
  const v = body.linvel();
  body.setLinvel(tip.axis === "x" ? { x: 0, y: v.y, z: v.z } : { x: v.x, y: v.y, z: 0 }, true);
  body.setEnabledTranslations(false, true, false, true);
}

// The forecast for the member in play, before it is dropped: which way it will tip where it is
// aimed now, or null if it will land level. It feels the stack under its footprint with a grid
// of downward rays; the probes that meet the highest surface are where a member falling flat
// touches first — its support — and the same rule as on landing reads the tip off that.
// Returns { axis: "x" | "z", sign: ±1 }, the way its overhanging side goes down.
export function forecastTip(g, p) {
  const { RAPIER, world } = g;
  const quarter = Math.round(p.yaw / (Math.PI / 2));
  const fx = quarter % 2 ? p.type.d : p.type.w;
  const fz = quarter % 2 ? p.type.w : p.type.d;
  const nx = Math.round(fx / PROBE);
  const nz = Math.round(fz / PROBE);
  const from = p.y - p.type.h / 2;
  const hits = [];
  let top = -Infinity;
  for (let i = 0; i < nx; i++) {
    for (let k = 0; k < nz; k++) {
      const x = p.x - fx / 2 + (i + 0.5) * PROBE;
      const z = p.z - fz / 2 + (k + 0.5) * PROBE;
      const hit = world.castRay(new RAPIER.Ray({ x, y: from, z }, { x: 0, y: -1, z: 0 }), from + 1, true);
      if (!hit) continue;
      const y = from - hit.timeOfImpact;
      hits.push([x, z, y]);
      if (y > top) top = y;
    }
  }
  const support = hits.filter((h) => h[2] >= top - FIRST_TOUCH).map((h) => [h[0], h[1]]);
  if (!support.length) return null;
  // its weight, turned with it by whole quarter turns (see comOf)
  const com = comOf(p.type);
  const cos = Math.round(Math.cos(p.yaw));
  const sin = Math.round(Math.sin(p.yaw));
  const d = overhang(convexHull(support), [p.x + com.x * cos + com.z * sin, p.z - com.x * sin + com.z * cos]);
  if (!d) return null;
  const flat = { hx: fx / 2, hz: fz / 2, body: { rotation: () => ({ x: 0, y: 0, z: 0, w: 1 }) } };
  const axis = tipAxis(d, flat);
  return { axis, sign: Math.sign(axis === "x" ? d[0] : d[1]) };
}
