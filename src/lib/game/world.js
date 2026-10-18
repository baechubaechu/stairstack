// The physics side of the game: the one Rapier world, its floor and curbs, and the members
// dropped into it — plus the height questions every other module asks of the stack.
import { DROP_Y, FACES, GROUND_HALF, MEMBER_BY_ID, MEMBER_GRAVITY, PHYS_STEP, SEQUENCE } from "./constants";
import { faceU, memberVertices } from "./elevation";

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
  for (const m of g.members) for (const v of memberVertices(m)) if (v[1] > top) top = v[1];
  return top;
}

// The highest resting surface under a footprint at (x, z), ignoring anything at or above
// bottomY and anything still falling.
export function topUnder(g, x, z, type, bottomY) {
  const { character } = g;
  let top = 0;
  const reach = Math.hypot(type.w / 2, type.d / 2) + 0.25;
  for (const m of g.members) {
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

// The type of the member that comes after `members.length` have been placed.
export function nextType(g) {
  return MEMBER_BY_ID[SEQUENCE[g.members.length % SEQUENCE.length]];
}

// Where the member in play is right now: it rides the mouse for X / Z, and its height is
// wherever the slow descent has carried it — never below the top of the stack beneath it.
export function placement(g) {
  const { state, preview } = g;
  const type = state.active ? state.active.type : nextType(g);
  const bottom = state.active ? state.active.y - type.h / 2 : DROP_Y - type.h / 2;
  const landing = topUnder(g, preview.x, preview.z, type, bottom) + type.h / 2 + 0.08;
  const y = state.active ? Math.max(landing, state.active.y) : Math.max(DROP_Y, landing + 0.5);
  return { type, x: preview.x, z: preview.z, y, landing, yaw: preview.yaw };
}

export function addMember(g, type, x, y, z, euler) {
  const { RAPIER, world } = g;
  const body = world.createRigidBody(
    RAPIER.RigidBodyDesc.dynamic()
      .setTranslation(x, y, z)
      .setRotation(quatFromEuler(euler.x, euler.y, euler.z))
      .setLinearDamping(0.1)
      .setAngularDamping(0.5)
      .setCcdEnabled(true),
  );
  world.createCollider(
    RAPIER.ColliderDesc.cuboid(type.w / 2, type.h / 2, type.d / 2)
      .setFriction(0.95)
      .setRestitution(0.02)
      .setDensity(1.4),
    body,
  );
  const m = { type, body, hx: type.w / 2, hy: type.h / 2, hz: type.d / 2, color: type.color, hex: type.hex };
  m.bottom = extent(g, m).bottom;
  g.members.push(m);
  return m;
}

export function clearMembers(g) {
  for (const m of g.members) g.world.removeRigidBody(m.body);
  g.members.length = 0;
}
