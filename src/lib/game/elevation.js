// 3D rigid body -> 2D elevation projection (FRONT face: horizontal = world X, vertical = world Y).
import { convexHull } from "./hull";

// Screen-x (u) of a world point [x, y, z] on a face (an entry of FACES): the view measures one
// world horizontal, and its sign says which way the screen's +x runs.
export function faceU(face, v) {
  return face.axis === "x" ? face.sign * v[0] : face.sign * v[2];
}

// How near a world point is to whoever reads a face — along the horizontal the face collapses,
// larger toward the viewer. The elevation has no depth for the climb, but drawing nearer members
// over farther ones keeps what overlaps on the monitor in the order it stands on site.
export function faceNear(face, v) {
  return face.axis === "x" ? face.sign * v[2] : -face.sign * v[0];
}

export function quatToMat3(q) {
  const { x, y, z, w } = q;
  const x2 = x + x;
  const y2 = y + y;
  const z2 = z + z;
  const xx = x * x2;
  const xy = x * y2;
  const xz = x * z2;
  const yy = y * y2;
  const yz = y * z2;
  const zz = z * z2;
  const wx = w * x2;
  const wy = w * y2;
  const wz = w * z2;
  return [
    1 - (yy + zz), xy - wz, xz + wy,
    xy + wz, 1 - (xx + zz), yz - wx,
    xz - wy, yz + wx, 1 - (xx + yy),
  ];
}

// The eight world-space corners of a box at a given translation and rotation — or, with `o`, of
// a box whose centre sits at offset `o` ({ x, y, z }) in that frame (one part of a member).
export function boxVertices(hx, hy, hz, t, q, o = null) {
  const R = quatToMat3(q);
  const out = [];
  for (const sx of [-1, 1]) {
    for (const sy of [-1, 1]) {
      for (const sz of [-1, 1]) {
        const lx = sx * hx + (o ? o.x : 0);
        const ly = sy * hy + (o ? o.y : 0);
        const lz = sz * hz + (o ? o.z : 0);
        out.push([
          R[0] * lx + R[1] * ly + R[2] * lz + t.x,
          R[3] * lx + R[4] * ly + R[5] * lz + t.y,
          R[6] * lx + R[7] * ly + R[8] * lz + t.z,
        ]);
      }
    }
  }
  return out;
}

// Orthographic projection of the rotated box: depth Z collapses, so a tilted
// member becomes a sloped silhouette instead of an axis-aligned rectangle.
export function memberSilhouette(m) {
  return convexHull(memberVertices(m).map((v) => [v[0], v[1]]));
}

// The corners of each box a member is made of (its parts), eight to a part: what is drawn box by
// box, and projected part by part so a member that is not a plain box keeps its notches.
export function memberParts(m) {
  // basalt never moves again, so its corners are worked out once, when it sets
  if (m.stone) return m.stone.parts;
  return shapeParts(m.parts, m.body.translation(), m.body.rotation());
}

// The same, for a member type at a translation and rotation — one with no rigid body yet.
export function shapeParts(parts, t, q) {
  return parts.map((p) => boxVertices(p.hx, p.hy, p.hz, t, q, p));
}

// All the corners of a rigid-body member together: for how high or low it reaches, its outline
// and its footprint.
export function memberVertices(m) {
  if (m.stone) return m.stone.verts;
  const parts = memberParts(m);
  return parts.length === 1 ? parts[0] : parts.flat();
}

// Front elevation of a box that has no rigid body yet — the member still on its way down.
export function boxSilhouette(hx, hy, hz, t, q) {
  return convexHull(boxVertices(hx, hy, hz, t, q).map((v) => [v[0], v[1]]));
}