// 3D rigid body -> 2D elevation projection (FRONT face: horizontal = world X, vertical = world Y).
import { convexHull } from "./hull";

// Screen-x (u) of a world point [x, y, z] on a face (an entry of FACES): the view measures one
// world horizontal, and its sign says which way the screen's +x runs.
export function faceU(face, v) {
  return face.axis === "x" ? face.sign * v[0] : face.sign * v[2];
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

// The eight world-space corners of a box at a given translation and rotation.
export function boxVertices(hx, hy, hz, t, q) {
  const R = quatToMat3(q);
  const out = [];
  for (const sx of [-1, 1]) {
    for (const sy of [-1, 1]) {
      for (const sz of [-1, 1]) {
        const lx = sx * hx;
        const ly = sy * hy;
        const lz = sz * hz;
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

// The same corners, for a member that is a rigid body.
export function memberVertices(m) {
  return boxVertices(m.hx, m.hy, m.hz, m.body.translation(), m.body.rotation());
}

// Front elevation of a box that has no rigid body yet — the member still on its way down.
export function boxSilhouette(hx, hy, hz, t, q) {
  return convexHull(boxVertices(hx, hy, hz, t, q).map((v) => [v[0], v[1]]));
}