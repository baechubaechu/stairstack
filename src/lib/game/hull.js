// Convex-polygon helpers shared by the elevation renderer and the character sweep.
// All polygons are arrays of [x, y] pairs in counter-clockwise order.

export function signedArea(poly) {
  let a = 0;
  for (let i = 0; i < poly.length; i++) {
    const p = poly[i];
    const q = poly[(i + 1) % poly.length];
    a += p[0] * q[1] - q[0] * p[1];
  }
  return a / 2;
}

const cross = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);

export function convexHull(points) {
  const pts = points.slice().sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  const uniq = [];
  for (const p of pts) {
    const last = uniq[uniq.length - 1];
    if (!last || Math.abs(last[0] - p[0]) > 1e-9 || Math.abs(last[1] - p[1]) > 1e-9) uniq.push(p);
  }
  if (uniq.length <= 2) return uniq;

  const lower = [];
  for (const p of uniq) {
    while (lower.length >= 2 && cross(lower[lower.length - 2], lower[lower.length - 1], p) <= 0) lower.pop();
    lower.push(p);
  }
  const upper = [];
  for (let i = uniq.length - 1; i >= 0; i--) {
    const p = uniq[i];
    while (upper.length >= 2 && cross(upper[upper.length - 2], upper[upper.length - 1], p) <= 0) upper.pop();
    upper.push(p);
  }
  lower.pop();
  upper.pop();
  const hull = lower.concat(upper);
  return signedArea(hull) < 0 ? hull.reverse() : hull;
}

// Minkowski sum of a convex polygon and the character's axis-aligned box:
// the hull of every polygon vertex moved by every box corner.
export function expandForBox(poly, halfW, halfH) {
  const pts = [];
  for (const [x, y] of poly) {
    pts.push([x + halfW, y + halfH], [x - halfW, y + halfH], [x + halfW, y - halfH], [x - halfW, y - halfH]);
  }
  return convexHull(pts);
}

// If the point lies inside the convex polygon, returns the minimum translation
// that pushes it out ({ nx, ny, dist }), else null.
export function penetration(poly, px, py) {
  if (poly.length < 3) return null;
  let best = null;
  for (let i = 0; i < poly.length; i++) {
    const a = poly[i];
    const b = poly[(i + 1) % poly.length];
    const dx = b[0] - a[0];
    const dy = b[1] - a[1];
    const len = Math.hypot(dx, dy) || 1e-9;
    const ix = -dy / len;
    const iy = dx / len;
    const d = (px - a[0]) * ix + (py - a[1]) * iy;
    if (d < -1e-6) return null;
    if (!best || d < best.dist) best = { nx: -ix, ny: -iy, dist: d };
  }
  return best;
}