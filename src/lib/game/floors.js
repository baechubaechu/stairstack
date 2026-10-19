// FLOOR SLABS — storeys the tower has to get past. A slab fills the whole plan except a strip
// FLOOR_GAP wide along one edge. Seen from the two faces that look along that edge it spans the
// full width of the elevation: a ceiling the climber cannot jump through. From the other two
// faces the gap shows at one end — the one way up past it. So the climb has to turn the tower.
//
// Until the climber stands on it, a slab is pencilled in: drawn translucent, so the plan below
// it still reads, and it has no collider, so members dropped from above fall straight through.
// The climber collides with it all the same (their collision is the projected silhouettes, not
// Rapier). The moment their feet find its top it is inked in: it gets a collider and becomes
// solid ground members can land on — and the next storey appears FLOOR_STOREY higher.
import { FACES, FLOOR, FLOOR_FIRST, FLOOR_GAP, FLOOR_STOREY, GROUND_HALF } from "./constants";
import { extent } from "./world";

// The plan direction (x, z) of each compass edge the gap can run along.
const EDGE = { N: [0, -1], S: [0, 1], E: [1, 0], W: [-1, 0] };

// Which edges leave a gap the face being read cannot see: a face measuring world x sees the
// whole x span, so its gap must run along a z edge (N or S) — and the other way round.
function hiddenEdges(faceId) {
  return FACES[faceId].axis === "x" ? ["S", "N"] : ["E", "W"];
}

// Lay a slab with its underside at `bottom`, its gap along `edge`. Fixed, and with no collider
// until the climber has stood on it.
function layFloor(g, bottom, edge) {
  const { RAPIER, world } = g;
  const [ex, ez] = EDGE[edge];
  const full = GROUND_HALF;
  const short = GROUND_HALF - FLOOR_GAP / 2;
  const hx = ex ? short : full;
  const hz = ez ? short : full;
  // pull the slab back from the gap edge by half the gap
  const cx = -ex * (FLOOR_GAP / 2);
  const cz = -ez * (FLOOR_GAP / 2);
  const hy = FLOOR.h / 2;
  const body = world.createRigidBody(RAPIER.RigidBodyDesc.fixed().setTranslation(cx, bottom + hy, cz));
  const type = { ...FLOOR, w: hx * 2, d: hz * 2 };
  const m = { type, body, hx, hy, hz, color: FLOOR.color, hex: FLOOR.hex };
  m.floor = { edge, active: false, collider: null };
  m.bottom = extent(g, m).bottom;
  g.members.push(m);
  return m;
}

// The run opens with the first storey already over the starting stack, gap hidden from the
// face the climb begins on.
export function seedFloor(g) {
  g.state.floors = 0;
  layFloor(g, FLOOR_FIRST, hiddenEdges(g.state.face)[0]);
}

// Turn a pencilled slab into real ground: give it a collider so members land on it.
function activate(g, m) {
  const { RAPIER, world } = g;
  m.floor.active = true;
  m.floor.collider = world.createCollider(
    RAPIER.ColliderDesc.cuboid(m.hx, m.hy, m.hz).setFriction(0.95).setRestitution(0),
    m.body,
  );
  g.state.floors += 1;
  // the next storey: higher up, its gap hidden from wherever the climber is standing now,
  // alternating between the two hidden edges so it isn't always the same corner
  const edges = hiddenEdges(g.state.face);
  const top = m.body.translation().y + m.hy;
  layFloor(g, top + FLOOR_STOREY, edges[g.state.floors % 2]);
}

// A slab switches on when the climber is standing on its top on the face being read. Returns
// true when one did (the members list has changed).
export function stepFloors(g) {
  const { character: c } = g;
  if (!c.grounded) return false;
  const feet = c.y - c.hh;
  for (const m of g.members) {
    if (!m.floor || m.floor.active || m.stone) continue;
    const top = m.body.translation().y + m.hy;
    if (Math.abs(feet - top) > 0.08) continue;
    const e = extent(g, m);
    if (c.x < e.minU || c.x > e.maxU) continue;
    activate(g, m);
    return true; // a new slab was just pushed onto the list
  }
  return false;
}

// A slab nobody has stood on yet is not there for anything but the climber.
export function isPencilled(m) {
  return !!(m.floor && !m.floor.active);
}
