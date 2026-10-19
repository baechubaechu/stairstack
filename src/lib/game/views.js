// What both views read: the same rigid bodies projected onto an elevation face (silhouettes)
// and onto the plan (footprints), plus the climber-expanded silhouettes the climb collides with.
import { FACES, GROUND_HALF } from "./constants";
import { boxVertices, faceU, memberVertices, quatToMat3 } from "./elevation";
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

// For drawing only: the direction a member's long side runs on a face, as an angle in that
// face's (u, y) plane — so a material's grain follows a tilted member instead of the screen.
// Whichever of the box's two horizontal sides projects longer is the one that reads as "long".
function grainAngle(m, f) {
  const R = quatToMat3(m.body.rotation());
  const xu = faceU(f, [R[0], R[3], R[6]]) * m.hx;
  const xy = R[3] * m.hx;
  const zu = faceU(f, [R[2], R[5], R[8]]) * m.hz;
  const zy = R[5] * m.hz;
  return Math.hypot(xu, xy) >= Math.hypot(zu, zy) ? Math.atan2(xy, xu) : Math.atan2(zy, zu);
}

// Members projected onto one face: the face being read drives collision, the other faces
// are what the elevation shows while it turns. `type` and `angle` are for drawing only.
// Basalt is projected once per face and kept, since it never moves again.
export function project(g, faceId) {
  const f = FACES[faceId];
  const out = [];
  for (const m of g.members) {
    if (m.stone) {
      const poly = (m.stone.sil[faceId] ??= convexHull(m.stone.verts.map((v) => [faceU(f, v), v[1]])));
      if (poly.length >= 3) out.push({ hex: m.hex, color: m.color, poly, type: "basalt", angle: 0, stone: true });
      continue;
    }
    const poly = convexHull(memberVertices(m).map((v) => [faceU(f, v), v[1]]));
    if (poly.length >= 3) {
      out.push({
        hex: m.hex,
        color: m.color,
        poly,
        type: m.type.id,
        angle: grainAngle(m, f),
        gate: !!m.gate,
        active: m.gate ? m.gate.active : false,
      });
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
  return poly.length >= 3 ? { hex: pl.type.hex, color: pl.type.color, poly, type: pl.type.id, angle: 0 } : null;
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
    if (m.stone) {
      // basalt keeps the footprint it set with
      m.stone.plan ??= convexHull(m.stone.verts.map((v) => [v[0], v[2]]));
      if (m.stone.plan.length >= 3) {
        views.plans.push({ hex: m.hex, color: m.color, poly: m.stone.plan, top: m.stone.top, gate: null, type: "basalt", angle: 0, stone: true });
      }
      continue;
    }
    const verts = memberVertices(m);
    const plan = convexHull(verts.map((v) => [v[0], v[2]]));
    if (plan.length >= 3) {
      let top = 0;
      for (const v of verts) if (v[1] > top) top = v[1];
      const at = m.body.translation();
      // a directional plate carries its own way out into the plan
      const gate = m.gate ? { dir: m.gate.dir, active: m.gate.active, x: at.x, z: at.z } : null;
      // for drawing: the way the member's local X side runs across the plan
      const R = quatToMat3(m.body.rotation());
      const angle = Math.atan2(R[6], R[0]);
      views.plans.push({ hex: m.hex, color: m.color, poly: plan, top, gate, type: m.type.id, angle });
    }
  }
  // basalt lies wholly under the lava, where the climber can never stand, so it is left out
  // of what the climb collides with
  const solid = views.silhouettes.filter((s) => !s.stone).map((s) => s.poly);
  views.expanded = [GROUND_POLY, ...solid].map((p) => expandForBox(p, character.hw, character.hh));
}
