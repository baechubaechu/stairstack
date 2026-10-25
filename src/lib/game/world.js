// The physics side of the game: the one Rapier world, its floor and curbs, and the members
// dropped into it — plus the height questions every other module asks of the stack.
import {
  CELL,
  DROP_Y,
  FACES,
  GROUND_HALF,
  MEMBER_BY_ID,
  MEMBER_GRAVITY,
  PHYS_STEP,
  SEQUENCE,
  VIEW_FOLLOW,
  WEIGHT_FALL,
  materialOf,
  partsOf,
} from "./constants";
import { faceU, memberVertices } from "./elevation";
import { holdSquare } from "./tipping";

export function quatFromEuler(x, y, z) {
  const c1 = Math.cos(x / 2);
  const c2 = Math.cos(y / 2);
  const c3 = Math.cos(z / 2);
  const s1 = Math.sin(x / 2);
  const s2 = Math.sin(y / 2);
  const s3 = Math.sin(z / 2);
  return {
    x: s1 * c2 * c3 + c1 * s2 * s3,
    y: c1 * s2 * c3 - s1 * c2 * s3,
    z: c1 * c2 * s3 + s1 * s2 * c3,
    w: c1 * c2 * c3 - s1 * s2 * s3,
  };
}

// The world with its floor, and low curbs that keep dropped members inside the 12 m square.
export function createWorld(RAPIER) {
  const world = new RAPIER.World({ x: 0, y: MEMBER_GRAVITY, z: 0 });
  world.timestep = PHYS_STEP;

  world.createCollider(
    RAPIER.ColliderDesc.cuboid(GROUND_HALF, 0.5, GROUND_HALF).setFriction(1).setRestitution(0),
    world.createRigidBody(RAPIER.RigidBodyDesc.fixed().setTranslation(0, -0.5, 0)),
  );

  for (const [cx, cz, hx, hz] of [
    [GROUND_HALF + 0.3, 0, 0.3, GROUND_HALF + 0.3],
    [-(GROUND_HALF + 0.3), 0, 0.3, GROUND_HALF + 0.3],
    [0, GROUND_HALF + 0.3, GROUND_HALF + 0.3, 0.3],
    [0, -(GROUND_HALF + 0.3), GROUND_HALF + 0.3, 0.3],
  ]) {
    world.createCollider(
      RAPIER.ColliderDesc.cuboid(hx, 0.3, hz).setFriction(0.9).setRestitution(0),
      world.createRigidBody(RAPIER.RigidBodyDesc.fixed().setTranslation(cx, 0.3, cz)),
    );
  }
  return world;
}

// A member still on its way down is not a floor, and neither is one sitting at or above the
// member being placed. Without both rules the body a click has just released would hold the
// next member up, and every arrival would chain into an endless run of instant drops.
export const FALLING = -0.25; // descending faster than this is on its way down, not resting

// Screen-x (u) of a world point on the face being read.
export function toU(g, x, z) {
  return faceU(FACES[g.state.face], [x, 0, z]);
}

// Where the climber stands in the world — on the horizontal the view measures.
export function charWorld(g) {
  const f = FACES[g.state.face];
  const a = f.sign * g.character.x;
  return f.axis === "x" ? { cx: a, cz: 0 } : { cx: 0, cz: a };
}

// Lowest projected point and horizontal span of a member's rotated box, on the axis
// the face being read measures.
export function extent(g, m) {
  const f = FACES[g.state.face];
  let bottom = Infinity;
  let minU = Infinity;
  let maxU = -Infinity;
  for (const v of memberVertices(m)) {
    const u = faceU(f, v);
    if (v[1] < bottom) bottom = v[1];
    if (u < minU) minU = u;
    if (u > maxU) maxU = u;
  }
  return { bottom, minU, maxU };
}

export function memberTop(m) {
  let top = -Infinity;
  for (const v of memberVertices(m)) if (v[1] > top) top = v[1];
  return top;
}

// The highest point of the stack — the frontier the climb, the plates and the stats all read.
export function towerTop(g) {
  let top = 0;
  for (const m of g.members) {
    if (m.floor && !m.floor.active) continue; // a pencilled slab isn't part of the stack yet
    for (const v of memberVertices(m)) if (v[1] > top) top = v[1];
  }
  return top;
}

// The highest resting surface under a footprint at (x, z), ignoring anything at or above
// bottomY and anything still falling.
export function topUnder(g, x, z, type, bottomY) {
  const { character } = g;
  let top = 0;
  const reach = Math.hypot(type.w / 2, type.d / 2) + 0.25;
  for (const m of g.members) {
    if (m.floor && !m.floor.active) continue; // members fall straight through a pencilled slab
    const t = m.body.translation();
    if (t.y >= bottomY) continue;
    if (m.body.linvel().y < FALLING) continue;
    if (Math.hypot(x - t.x, z - t.z) > reach + Math.hypot(m.hx, m.hz)) continue;
    for (const v of memberVertices(m)) if (v[1] > top) top = v[1];
  }
  // The climber is an obstacle too: a release over their column on the view being read
  // must clear their head instead of spawning inside it.
  if (Math.abs(toU(g, x, z) - character.x) <= character.hw + reach) top = Math.max(top, character.y + character.hh);
  return top;
}

// The type of the next member to drop: the drop order, counted by how many have been dropped
// this run (floors, the starter stack and buried basalt don't shift it).
export function nextType(g, ahead = 0) {
  return MEMBER_BY_ID[SEQUENCE[(g.state.dropped + ahead) % SEQUENCE.length]];
}

// How far the elevation window has climbed to follow the climber (see VIEW_FOLLOW).
export function viewRise(g) {
  const { character } = g;
  return Math.max(0, character.y - character.hh - VIEW_FOLLOW);
}

// The height members are released from: the top of the window, wherever it has climbed to.
export function releaseY(g) {
  return DROP_Y + viewRise(g);
}

// The member's footprint across the plan at a yaw that is a whole number of quarter turns: an
// odd quarter turn swaps its width and depth over.
export function footprint(type, quarter) {
  return quarter % 2 ? { fx: type.d, fz: type.w } : { fx: type.w, fz: type.d };
}

// Snap one plan coordinate to the grid. A side an odd number of cells long is centred on a
// cell, an even one on a grid line, so either way its edges fall on grid lines — and it is held
// back from the curb so the whole side stays on the plate.
function snapAxis(v, size) {
  const off = Math.round(size / CELL) % 2 ? CELL / 2 : 0;
  const s = Math.round((v - off) / CELL) * CELL + off;
  const lim = GROUND_HALF - size / 2;
  return Math.max(-lim, Math.min(lim, s));
}

// Where the member in play is right now: it rides the mouse for X / Z, snapped to the grid, and
// its height is wherever the slow descent has carried it — never below the top of the stack
// beneath it. Its yaw is held to whole quarter turns.
export function placement(g) {
  const { state, preview } = g;
  const type = state.active ? state.active.type : nextType(g);
  const quarter = Math.round(preview.yaw / (Math.PI / 2));
  const yaw = quarter * (Math.PI / 2);
  const { fx, fz } = footprint(type, quarter);
  const x = snapAxis(preview.x, fx);
  const z = snapAxis(preview.z, fz);
  const top = releaseY(g);
  const bottom = state.active ? state.active.y - type.h / 2 : top - type.h / 2;
  const landing = topUnder(g, x, z, type, bottom) + type.h / 2 + 0.08;
  const y = state.active ? Math.max(landing, state.active.y) : Math.max(top, landing + 0.5);
  return { type, x, z, y, landing, yaw };
}

// How much narrower a member's collider is than the member, on each side (see addMember).
const SIDE_GAP = 0.01;
// How far ahead, in metres, a member's soft CCD looks along its path.
const SOFT_CCD = 0.6;

export function addMember(g, type, x, y, z, euler) {
  const { RAPIER, world } = g;
  const body = world.createRigidBody(
    RAPIER.RigidBodyDesc.dynamic()
      .setTranslation(x, y, z)
      .setRotation(quatFromEuler(euler.x, euler.y, euler.z))
      .setLinearDamping(0.1)
      .setAngularDamping(0.5)
      // Soft CCD, not full CCD: full CCD's shape-casts and substeps would hang the solver
      // outright once a tall heap of members with locked axes was all in contact. The soft kind
      // looks ahead along the path instead, enough that a fast drop can't pass through a slab.
      .setSoftCcdPrediction(SOFT_CCD),
  );
  // One collider per part, all of the member's material (see MATERIALS — grippy, so a member
  // that tips pivots over the edge rather than sliding off it; see tipping.js).
  // Each collider is a hair narrower than its part (SIDE_GAP each side, never its height):
  // members sit flush on the grid, and two locked side by side that touched would press into
  // each other sideways with nowhere to go — friction would turn that push into a vertical
  // kick and throw one of them into the sky. Everything drawn and climbed keeps the full size.
  const mat = materialOf(type);
  // heavy members fall faster, light ones a little slower
  body.setGravityScale(WEIGHT_FALL[mat.weight], false);
  const parts = partsOf(type);
  const colliders = parts.map((p) => {
    const desc = RAPIER.ColliderDesc.cuboid(p.hx - SIDE_GAP, p.hy, p.hz - SIDE_GAP)
      .setFriction(mat.friction)
      .setFrictionCombineRule(RAPIER.CoefficientCombineRule.Max)
      .setRestitution(mat.restitution)
      .setDensity(mat.density);
    if (p.x || p.y || p.z) desc.setTranslation(p.x, p.y, p.z);
    return world.createCollider(desc, body);
  });
  holdSquare(body);
  const m = { type, body, parts, colliders, hx: type.w / 2, hy: type.h / 2, hz: type.d / 2, color: type.color, hex: type.hex };
  m.tip = { landed: false, air: 0, axis: null };
  m.bottom = extent(g, m).bottom;
  g.members.push(m);
  return m;
}

export function clearMembers(g) {
  for (const m of g.members) g.world.removeRigidBody(m.body);
  g.members.length = 0;
}
