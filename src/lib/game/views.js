// What both views read: the same rigid bodies projected onto an elevation face (silhouettes)
// and onto the plan (footprints), plus the climber-expanded silhouettes the climb collides with.
import { FACES, GROUND_HALF } from "./constants";
import { boxVertices, faceU, memberVertices } from "./elevation";
import { convexHull, expandForBox, penetration } from "./hull";
import { placement, quatFromEuler } from "./world";

// The floor as the elevation sees it: a band under y = 0 across the whole square.
const GROUND_POLY = [
  [-GROUND_HALF, -1.2],
  [GROUND_HALF, -1.2],
  [GROUND_HALF, 0],
  [-GROUND_HALF, 0],
];

export function createViews() {
  return { silhouettes: [], plans: [], expanded: [] };
}

// Members projected onto one face: the face being read drives collision, the other faces
// are what the elevation shows while it turns.
export function project(g, faceId) {
  const f = FACES[faceId];
  const out = [];
  for (const m of g.members) {
    const poly = convexHull(memberVertices(m).map((v) => [faceU(f, v), v[1]]));
    if (poly.length >= 3) {
      out.push({ hex: m.hex, color: m.color, poly, gate: !!m.gate, active: m.gate ? m.gate.active : false });
    }
  }
  return out;
}

// The member on its way down is not a body yet, but it occupies a real column of the
// stack: it is drawn as a block there, and a click turns it into one.
function projectActive(g, faceId) {
  if (!g.state.active) return null;
  const f = FACES[faceId];
  const pl = placement(g);
  const verts = boxVertices(
    pl.type.w / 2,
    pl.type.h / 2,
    pl.type.d / 2,
    { x: pl.x, y: pl.y, z: pl.z },
    quatFromEuler(0, pl.yaw, 0),
  );
  const poly = convexHull(verts.map((v) => [faceU(f, v), v[1]]));
  return poly.length >= 3 ? { hex: pl.type.hex, color: pl.type.color, poly } : null;
}

// Everything the elevation needs to draw one face.
export function viewFor(g, faceId) {
  return { sil: project(g, faceId), active: projectActive(g, faceId) };
}

// Would the climber arrive inside a member? Asked of the face being turned to, at the
// height they are standing at.
export function blocked(g, faceId, u) {
  for (const sil of project(g, faceId)) if (penetration(sil.poly, u, g.character.y)) return true;
  return false;
}

// Refresh the projections of the same rigid bodies — the elevation of the face being read
// and the plan (X / Z) — plus the character-expanded copies of those silhouettes.
export function refresh(g) {
  const { views, character } = g;
  views.silhouettes = project(g, g.state.face);
  views.plans = [];
  for (const m of g.members) {
    const verts = memberVertices(m);
    const plan = convexHull(verts.map((v) => [v[0], v[2]]));
    if (plan.length >= 3) {
      let top = 0;
      for (const v of verts) if (v[1] > top) top = v[1];
      const at = m.body.translation();
      // a directional plate carries its own way out into the plan
      const gate = m.gate ? { dir: m.gate.dir, active: m.gate.active, x: at.x, z: at.z } : null;
      views.plans.push({ hex: m.hex, color: m.color, poly: plan, top, gate });
    }
  }
  views.expanded = [GROUND_POLY, ...views.silhouettes.map((s) => s.poly)].map((p) =>
    expandForBox(p, character.hw, character.hh),
  );
}
