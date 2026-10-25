// The order the plan paints its boxes in, so that what is higher on site covers what is under it.
// The camera looks straight down, so "in front" means "above". Sorting by one number per box
// (its centre's distance, its top, its bottom) gets it wrong as soon as a member leans: a plank
// propped up on its end has a high centre and a high top, yet a member dropped onto it later is
// above it. So each pair of boxes that overlap on screen is settled by where they overlap on the
// plan — whichever reaches higher there is on top — and the pairs are put in order from those
// verdicts. Drawing only.

// The heights a box spans over the plan point (x, z): [lo, hi], or null when the vertical line
// there misses it. `verts` are its eight corners, index 4·sx + 2·sy + sz (see boxVertices).
export function spanAt(verts, x, z) {
  const o = verts[0];
  let lo = -Infinity;
  let hi = Infinity;
  for (const k of [4, 2, 1]) {
    const e = [verts[k][0] - o[0], verts[k][1] - o[1], verts[k][2] - o[2]];
    const ee = e[0] * e[0] + e[1] * e[1] + e[2] * e[2];
    // where along this edge the point (x, y, z) sits, as a fraction: c + d·y, wanted in [0, 1]
    const c = ((x - o[0]) * e[0] - o[1] * e[1] + (z - o[2]) * e[2]) / ee;
    const d = e[1] / ee;
    if (Math.abs(d) < 1e-9) {
      if (c < 0 || c > 1) return null;
      continue;
    }
    const y0 = (0 - c) / d;
    const y1 = (1 - c) / d;
    lo = Math.max(lo, Math.min(y0, y1));
    hi = Math.min(hi, Math.max(y0, y1));
  }
  return lo <= hi ? [lo, hi] : null;
}

const SAMPLES = 4; // per side of the patch two boxes share on the plan
const EPS = 1e-3;

function planBounds(verts) {
  let x0 = Infinity;
  let x1 = -Infinity;
  let z0 = Infinity;
  let z1 = -Infinity;
  for (const v of verts) {
    x0 = Math.min(x0, v[0]);
    x1 = Math.max(x1, v[0]);
    z0 = Math.min(z0, v[2]);
    z1 = Math.max(z1, v[2]);
  }
  return { x0, x1, z0, z1 };
}

// Which of two boxes is on top where they share the plan: > 0 when `a` is, < 0 when `b` is, 0 when
// they share no point of the plan (side by side, or only touching on screen).
export function compareAbove(a, b) {
  const pa = planBounds(a.verts);
  const pb = planBounds(b.verts);
  const x0 = Math.max(pa.x0, pb.x0);
  const x1 = Math.min(pa.x1, pb.x1);
  const z0 = Math.max(pa.z0, pb.z0);
  const z1 = Math.min(pa.z1, pb.z1);
  if (x0 > x1 + EPS || z0 > z1 + EPS) return 0;
  let score = 0;
  for (let i = 0; i < SAMPLES; i++) {
    for (let j = 0; j < SAMPLES; j++) {
      const x = x0 + ((i + 0.5) / SAMPLES) * (x1 - x0);
      const z = z0 + ((j + 0.5) / SAMPLES) * (z1 - z0);
      const sa = spanAt(a.verts, x, z);
      const sb = spanAt(b.verts, x, z);
      if (!sa || !sb) continue;
      score += sa[0] + sa[1] - (sb[0] + sb[1]);
    }
  }
  return Math.abs(score) < EPS ? 0 : score;
}

// Put boxes in painting order. Each box is { verts, top, rect } — `rect` its screen bounds
// ({ x0, y0, x1, y1 }). Boxes that overlap on screen are ordered by compareAbove where they share
// the plan, and otherwise the taller goes later (seen from above, a tall box's sides lean out over
// its neighbours). Anything left tangled in a cycle goes in by height.
export function paintOrder(boxes) {
  const n = boxes.length;
  const byHeight = boxes.map((_, i) => i).sort((i, j) => boxes[i].top - boxes[j].top);
  const after = Array.from({ length: n }, () => []); // after[i]: boxes to paint after i
  const waiting = new Array(n).fill(0);
  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      const a = boxes[i].rect;
      const b = boxes[j].rect;
      if (a.x1 < b.x0 || b.x1 < a.x0 || a.y1 < b.y0 || b.y1 < a.y0) continue;
      let c = compareAbove(boxes[i], boxes[j]);
      if (c === 0) c = boxes[i].top - boxes[j].top;
      if (c === 0) continue;
      const [lo, hi] = c > 0 ? [j, i] : [i, j];
      after[lo].push(hi);
      waiting[hi] += 1;
    }
  }
  const out = [];
  const done = new Array(n).fill(false);
  // Kahn's algorithm, always taking the lowest box that is free to go
  while (out.length < n) {
    let next = byHeight.find((i) => !done[i] && waiting[i] === 0);
    if (next === undefined) next = byHeight.find((i) => !done[i]); // a cycle: break it by height
    done[next] = true;
    out.push(boxes[next]);
    for (const k of after[next]) waiting[k] -= 1;
  }
  return out;
}
