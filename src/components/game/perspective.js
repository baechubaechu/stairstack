// The camera the plan is drawn through: a perspective view down onto the plate from the side the
// elevation is being read from, so the two windows look at one space — the plan's near edge is
// the elevation's plane, and its left-right is the elevation's left-right. Drawing only: the game
// never reads any of this.

// How steeply the camera looks down (from the horizontal), and how far back it stands.
const PITCH = (54 * Math.PI) / 180;
const DISTANCE = 26;

// The camera's turn about the vertical for each face: 0 looking north (reading the front, from
// the south), a quarter turn more for each face round to the right.
export const FACE_YAW = { front: 0, right: Math.PI / 2, back: Math.PI, left: (3 * Math.PI) / 2 };

// Turn `from` toward `to` the short way round, by `k` (0..1) of the gap.
export function easeYaw(from, to, k) {
  let d = (to - from) % (Math.PI * 2);
  if (d > Math.PI) d -= Math.PI * 2;
  if (d < -Math.PI) d += Math.PI * 2;
  return from + d * k;
}

// A camera at turn `yaw`, centred on the plate at height `target`, fitted so the plate (at that
// height) fills `fill` of the part of a w × h canvas left clear by `inset` ({ x, bottom }, pixels
// hidden at each side and along the bottom — by the crane cab). `half` is the plate's half width.
export function createCamera(yaw, target, w, h, half, fill = 0.88, inset = { x: 0, bottom: 0 }) {
  // the elevation's screen-x (u) and the direction toward the viewer (t), in plan x / z
  const ux = Math.cos(yaw);
  const uz = -Math.sin(yaw);
  const tx = Math.sin(yaw);
  const tz = Math.cos(yaw);
  const cos = Math.cos(PITCH);
  const sin = Math.sin(PITCH);

  // camera-space coordinates of a world point: across, up and depth
  const view = (x, y, z) => {
    const a = x * ux + z * uz;
    const b = x * tx + z * tz;
    const dy = y - target;
    return { a, up: -b * sin + dy * cos, depth: DISTANCE - b * cos - dy * sin };
  };

  // fit: the plate's corners at the target height, projected with a unit focal length
  let x0 = Infinity;
  let x1 = -Infinity;
  let y0 = Infinity;
  let y1 = -Infinity;
  for (const [cx, cz] of [[-half, -half], [half, -half], [half, half], [-half, half]]) {
    const v = view(cx, target, cz);
    const sx = v.a / v.depth;
    const sy = -v.up / v.depth;
    x0 = Math.min(x0, sx);
    x1 = Math.max(x1, sx);
    y0 = Math.min(y0, sy);
    y1 = Math.max(y1, sy);
  }
  const cw = w - inset.x * 2;
  const ch = h - inset.bottom;
  const k = Math.min((cw * fill) / (x1 - x0), (ch * fill) / (y1 - y0));
  const ox = w / 2 - (k * (x0 + x1)) / 2;
  const oy = ch / 2 - (k * (y0 + y1)) / 2;

  return {
    yaw,
    // screen point of a world point, with its depth (larger is further) and the pixels a metre
    // spans there
    project(x, y, z) {
      const v = view(x, y, z);
      const d = Math.max(0.5, v.depth);
      return { x: ox + (k * v.a) / d, y: oy - (k * v.up) / d, depth: d, ppm: k / d };
    },
    // where the camera stands, in world x / y / z — for telling which faces of a box it sees
    eye() {
      const b = DISTANCE * cos;
      return { x: b * tx, y: target + DISTANCE * sin, z: b * tz };
    },
    // the world point on the horizontal plane at height `py` under screen point (sx, sy)
    unproject(sx, sy, py) {
      const A = (sx - ox) / k;
      const B = (oy - sy) / k;
      const dy = py - target;
      const b = (B * (DISTANCE - dy * sin) - dy * cos) / (B * cos - sin);
      const depth = DISTANCE - b * cos - dy * sin;
      const a = A * depth;
      return { x: a * ux + b * tx, z: a * uz + b * tz };
    },
  };
}

// The camera's turn for whatever face the elevation shows (or is turning to).
export function yawFor(eng) {
  const info = eng.turnInfo;
  const face = info && !info.back ? info.to : eng.face;
  return FACE_YAW[face] ?? 0;
}

