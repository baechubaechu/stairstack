// What both views read: the same rigid bodies projected onto an elevation face (silhouettes)
// and onto the plan (footprints), plus the climber-expanded silhouettes the climb collides with.
import { FACES, GROUND_HALF, materialOf, partsOf } from "./constants";
import { faceNear, faceU, memberParts, quatToMat3, shapeParts } from "./elevation";
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

// One polygon per part of a member on a face: a member that is not a plain box keeps its
// notches, since each part's silhouette is convex but their union need not be.
const partPolys = (parts, f) => parts.map((vs) => convexHull(vs.map((v) => [faceU(f, v), v[1]]))).filter((p) => p.length >= 3);

// The same, each with how near its part's centre is to the viewer (for drawing order only).
const partSils = (parts, f) =>
  parts
    .map((vs) => ({
      poly: convexHull(vs.map((v) => [faceU(f, v), v[1]])),
      near: vs.reduce((s, v) => s + faceNear(f, v), 0) / vs.length,
    }))
    .filter((p) => p.poly.length >= 3);

// Members projected onto one face: the face being read drives collision, the other faces
// are what the elevation shows while it turns — one entry per part. `type` and `angle` are for
// drawing only. Basalt is projected once per face and kept, since it never moves again.
export function project(g, faceId) {
  const f = FACES[faceId];
  const out = [];
  for (const m of g.members) {
    if (m.stone) {
      const sils = (m.stone.sil[faceId] ??= partSils(m.stone.parts, f));
      for (const { poly, near } of sils) out.push({ hex: m.hex, color: m.color, poly, near, type: "basalt", angle: 0, stone: true });
      continue;
    }
    const sils = partSils(memberParts(m), f);
    if (!sils.length) continue;
    const angle = grainAngle(m, f);
    const slippery = !!materialOf(m.type).slippery;
    for (const { poly, near } of sils) {
      out.push({
        hex: m.hex,
        color: m.color,
        poly,
        near,
        slippery,
        type: m.type.id,
        angle,
        // a floor slab is drawn pencilled until the climber has stood on it
        floor: !!m.floor,
        active: m.floor ? m.floor.active : false,
      });
    }
  }
  return out;
}

// The member on its way down is not a body yet, but it occupies a real column of the
// stack: it is drawn as a block there, and a click turns it into one. `poly` is its whole
// outline (what the crane holds and the tip arrow runs off), `parts` what is painted.
function projectActive(g, faceId) {
  if (!g.state.active) return null;
  const f = FACES[faceId];
  const pl = placement(g);
  const parts = shapeParts(partsOf(pl.type), { x: pl.x, y: pl.y, z: pl.z }, quatFromEuler(0, pl.yaw, 0));
  const poly = convexHull(parts.flat().map((v) => [faceU(f, v), v[1]]));
  if (poly.length < 3) return null;
  return { hex: pl.type.hex, color: pl.type.color, poly, parts: partPolys(parts, f), type: pl.type.id, angle: 0 };
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
      m.stone.plan ??= m.stone.parts.map((vs) => convexHull(vs.map((v) => [v[0], v[2]])));
      for (const poly of m.stone.plan) {
        if (poly.length >= 3) {
          views.plans.push({ hex: m.hex, color: m.color, poly, top: m.stone.top, type: "basalt", angle: 0, stone: true });
        }
      }
      continue;
    }
    // for drawing: the way the member's local X side runs across the plan
    const R = quatToMat3(m.body.rotation());
    const angle = Math.atan2(R[6], R[0]);
    const floor = m.floor ? { active: m.floor.active } : null;
    // one footprint per part, each at the height of its own top
    for (const verts of memberParts(m)) {
      const plan = convexHull(verts.map((v) => [v[0], v[2]]));
      if (plan.length < 3) continue;
      let top = 0;
      for (const v of verts) if (v[1] > top) top = v[1];
      views.plans.push({ hex: m.hex, color: m.color, poly: plan, top, floor, type: m.type.id, angle });
    }
  }
  // basalt lies wholly under the lava, where the climber can never stand, so it is left out
  // of what the climb collides with
  const solid = views.silhouettes.filter((s) => !s.stone);
  views.expanded = [GROUND_POLY, ...solid.map((s) => s.poly)].map((p) => expandForBox(p, character.hw, character.hh));
  // which of those the climber would slide about on (glass), index for index
  views.slippery = [false, ...solid.map((s) => !!s.slippery)];
}
