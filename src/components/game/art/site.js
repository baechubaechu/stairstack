// The building site round the plate, as the crane operator sees it through the cab's front
// window: the plate is the tower's concrete foundation, set in compacted soil and ringed by a
// site hoarding with a gate on the south side. Inside the hoarding, round the foundation, the
// things a site has — a material yard to the north (stacks of the same members the crane drops),
// the site office in a container to the east, a flatbed truck to the west, cones and a portable
// toilet by the gate. The camera turns with the face being read, so each face shows a different
// side of the site. Decoration only: none of it has a collider and the engine never reads it.
import { MEMBER_BY_ID } from "@/lib/game/constants";
import { scaleHex } from "@/lib/game/palette";

const SOIL = "#cdbb97"; // compacted soil inside the hoarding
const SOIL_OUT = "#b7a37f"; // the ground beyond it
const TRACK = "rgba(92,74,48,0.22)"; // tyre tracks in the soil
const CONCRETE = "#d7d4cd";
const CONCRETE_EDGE = "#aaa69d";
const HOARDING = "#e8ebee";
const HOARDING_POST = "#9aa3ab";

// The hoarding stands this far out from the centre on every side; the gate's half-width.
const FENCE = 10.5;
const FENCE_H = 1.8;
const GATE = 2.4;
// How far the ground is drawn, all round.
const FAR = 26;

const member = (id) => MEMBER_BY_ID[id].hex;

// Everything solid on site, as boxes: [x0, y0, z0, x1, y1, z1, colour].
const BOXES = [
  // the material yard, north of the foundation: pallets, and the members stacked on them
  [-4.2, 0, -9.6, -1.4, 0.15, -7.6, "#a8875a"],
  [-4.0, 0.15, -9.4, -1.6, 0.4, -7.8, member("plank")],
  [-4.0, 0.4, -9.4, -1.6, 0.65, -7.8, scaleHex(member("plank"), 0.93)],
  [-4.0, 0.65, -9.4, -1.6, 0.9, -7.8, member("plank")],
  [-0.6, 0, -9.3, 3.4, 0.5, -8.3, member("beam")],
  [-0.6, 0.5, -9.3, 3.4, 1.0, -8.3, scaleHex(member("beam"), 0.92)],
  [4.0, 0, -9.5, 5.5, 1.0, -8.0, member("block")],
  [4.0, 1.0, -9.5, 5.5, 2.0, -8.0, scaleHex(member("block"), 0.94)],
  [-8.6, 0, -9.6, -5.6, 0.15, -7.8, "#a8875a"],
  [-8.4, 0.15, -9.4, -5.9, 0.4, -7.9, member("slab")],
  [-8.4, 0.4, -9.4, -5.9, 0.65, -7.9, scaleHex(member("slab"), 0.94)],
  // the site office: a container, with its air conditioner on the roof
  [7.3, 0, -3.0, 9.7, 2.6, 3.0, "#5d7fa6"],
  [8.0, 2.6, 1.2, 8.9, 2.95, 2.2, "#c9cdd1"],
  // the flatbed truck to the west: chassis, cab, bed, wheels, and a load of beams
  [-9.3, 0.45, -3.6, -7.5, 0.9, 4.6, "#2b2f33"],
  [-9.5, 0.6, 2.7, -7.3, 2.8, 4.7, "#dfe2e5"],
  [-9.5, 0.9, -3.8, -7.3, 1.15, 2.5, "#4b5560"],
  [-9.75, 0, -2.95, -9.35, 0.9, -2.05, "#1e2226"],
  [-7.45, 0, -2.95, -7.05, 0.9, -2.05, "#1e2226"],
  [-9.75, 0, -1.85, -9.35, 0.9, -0.95, "#1e2226"],
  [-7.45, 0, -1.85, -7.05, 0.9, -0.95, "#1e2226"],
  [-9.75, 0, 3.15, -9.35, 0.9, 4.05, "#1e2226"],
  [-7.45, 0, 3.15, -7.05, 0.9, 4.05, "#1e2226"],
  [-9.2, 1.15, -3.4, -7.6, 1.4, 0.6, member("beam")],
  [-9.2, 1.4, -3.4, -7.6, 1.65, 0.6, scaleHex(member("beam"), 0.92)],
  // by the gate: a portable toilet and a few cones
  [5.0, 0, 8.4, 6.2, 2.3, 9.6, "#3f7fbf"],
  [-3.3, 0, 8.6, -2.9, 0.7, 9.0, "#e86a2a"],
  [2.9, 0, 8.6, 3.3, 0.7, 9.0, "#e86a2a"],
  [-1.2, 0, 7.6, -0.8, 0.7, 8.0, "#e86a2a"],
];

// The hoarding, in panels about two metres long, each a vertical quad: [x0, z0, x1, z1]. The
// south side leaves the gate open.
const PANELS = (() => {
  const out = [];
  const step = 2.1;
  for (let a = -FENCE; a < FENCE - 1e-6; a += step) {
    const b = Math.min(FENCE, a + step);
    out.push([a, -FENCE, b, -FENCE]); // north
    out.push([FENCE, a, FENCE, b]); // east
    out.push([-FENCE, a, -FENCE, b]); // west
    if (b <= -GATE || a >= GATE) out.push([a, FENCE, b, FENCE]); // south, but for the gate
  }
  return out;
})();

// Pebbles scattered over the soil: fixed once (a little generator with a set seed), so they stay
// put from frame to frame.
const PEBBLES = (() => {
  let s = 20261024;
  const rnd = () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
  const out = [];
  while (out.length < 160) {
    const x = (rnd() * 2 - 1) * FENCE;
    const z = (rnd() * 2 - 1) * FENCE;
    if (Math.abs(x) < 6.3 && Math.abs(z) < 6.3) continue; // not on the foundation
    out.push([x, z, 0.03 + rnd() * 0.05]);
  }
  return out;
})();

function trace(ctx, pts) {
  ctx.beginPath();
  ctx.moveTo(pts[0].x, pts[0].y);
  for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
  ctx.closePath();
}

const flat = (cam, x0, z0, x1, z1, y = 0) => [
  cam.project(x0, y, z0),
  cam.project(x1, y, z0),
  cam.project(x1, y, z1),
  cam.project(x0, y, z1),
];

// Whether a world point lies on the camera's side of the plate's centre (drawn over the plate),
// or beyond it (drawn before the plate, under everything on it).
function nearSide(cam, x, z) {
  return x * Math.sin(cam.yaw) + z * Math.cos(cam.yaw) > 0;
}

// The ground: soil inside the hoarding, darker ground beyond it, tyre tracks in from the gate
// and round to the truck, and pebbles.
export function drawSiteGround(ctx, cam) {
  ctx.fillStyle = SOIL_OUT;
  trace(ctx, flat(cam, -FAR, -FAR, FAR, FAR));
  ctx.fill();
  ctx.fillStyle = SOIL;
  trace(ctx, flat(cam, -FENCE, -FENCE, FENCE, FENCE));
  ctx.fill();

  ctx.save();
  ctx.strokeStyle = TRACK;
  ctx.lineCap = "round";
  for (const off of [-0.9, 0.9]) {
    ctx.lineWidth = Math.max(1.5, cam.project(0, 0, 9).ppm * 0.35);
    ctx.beginPath();
    const pts = [
      [off, FAR],
      [off, FENCE],
      [off * 0.8, 8.2],
      [-3.5 + off * 0.6, 7.4],
      [-8.4 + off, 5.6],
      [-8.4 + off, 4.8],
    ].map(([x, z]) => cam.project(x, 0, z));
    ctx.moveTo(pts[0].x, pts[0].y);
    for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
    ctx.stroke();
  }
  ctx.restore();

  ctx.fillStyle = "rgba(110,94,66,0.35)";
  for (const [x, z, r] of PEBBLES) {
    const p = cam.project(x, 0, z);
    ctx.beginPath();
    ctx.arc(p.x, p.y, Math.max(0.6, r * p.ppm), 0, Math.PI * 2);
    ctx.fill();
  }
}

// The foundation the tower stands on: poured concrete with a chamfered edge, its pours' joints
// every three metres and the formwork tie holes left in its face.
export function drawFoundation(ctx, cam, H) {
  ctx.fillStyle = CONCRETE_EDGE;
  trace(ctx, flat(cam, -H - 0.2, -H - 0.2, H + 0.2, H + 0.2));
  ctx.fill();
  ctx.fillStyle = CONCRETE;
  trace(ctx, flat(cam, -H, -H, H, H));
  ctx.fill();

  ctx.save();
  ctx.strokeStyle = "rgba(90,86,78,0.28)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  for (let g = -H + 3; g < H - 1e-6; g += 3) {
    for (const [a, b] of [
      [cam.project(g, 0, -H), cam.project(g, 0, H)],
      [cam.project(-H, 0, g), cam.project(H, 0, g)],
    ]) {
      ctx.moveTo(a.x, a.y);
      ctx.lineTo(b.x, b.y);
    }
  }
  ctx.stroke();
  ctx.fillStyle = "rgba(90,86,78,0.3)";
  for (let x = -H + 0.75; x < H; x += 1.5) {
    for (let z = -H + 0.75; z < H; z += 1.5) {
      const p = cam.project(x, 0, z);
      ctx.beginPath();
      ctx.arc(p.x, p.y, Math.max(0.8, 0.05 * p.ppm), 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.restore();
}

// One box, as the camera sees it: the faces turned toward the eye, far ones first, the top in
// its colour and the sides shaded down from it.
function drawSolid(ctx, cam, [x0, y0, z0, x1, y1, z1, hex]) {
  const eye = cam.eye();
  const c = [(x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2];
  const faces = [
    { n: [0, 1, 0], k: 1, q: [[x0, y1, z0], [x1, y1, z0], [x1, y1, z1], [x0, y1, z1]] },
    { n: [-1, 0, 0], k: 0.72, q: [[x0, y0, z0], [x0, y0, z1], [x0, y1, z1], [x0, y1, z0]] },
    { n: [1, 0, 0], k: 0.72, q: [[x1, y0, z0], [x1, y1, z0], [x1, y1, z1], [x1, y0, z1]] },
    { n: [0, 0, -1], k: 0.82, q: [[x0, y0, z0], [x0, y1, z0], [x1, y1, z0], [x1, y0, z0]] },
    { n: [0, 0, 1], k: 0.82, q: [[x0, y0, z1], [x1, y0, z1], [x1, y1, z1], [x0, y1, z1]] },
  ];
  const shown = faces
    .map((f) => {
      const fc = [c[0] + (f.n[0] * (x1 - x0)) / 2, c[1] + (f.n[1] * (y1 - y0)) / 2, c[2] + (f.n[2] * (z1 - z0)) / 2];
      const toEye = (eye.x - fc[0]) * f.n[0] + (eye.y - fc[1]) * f.n[1] + (eye.z - fc[2]) * f.n[2];
      return { ...f, toEye, depth: cam.project(fc[0], fc[1], fc[2]).depth };
    })
    .filter((f) => f.toEye > 0)
    .sort((a, b) => b.depth - a.depth);
  for (const f of shown) {
    trace(ctx, f.q.map((v) => cam.project(v[0], v[1], v[2])));
    ctx.fillStyle = scaleHex(hex, f.k);
    ctx.fill();
    ctx.strokeStyle = "rgba(40,36,30,0.35)";
    ctx.lineWidth = 0.75;
    ctx.stroke();
  }
}

// One panel of the hoarding: a white sheet on posts, with a rail along the top.
function drawPanel(ctx, cam, [x0, z0, x1, z1]) {
  const q = [cam.project(x0, 0, z0), cam.project(x1, 0, z1), cam.project(x1, FENCE_H, z1), cam.project(x0, FENCE_H, z0)];
  trace(ctx, q);
  ctx.fillStyle = HOARDING;
  ctx.fill();
  ctx.strokeStyle = HOARDING_POST;
  ctx.lineWidth = 1;
  ctx.stroke();
  // a band of the contractor's blue along the bottom
  const lo = 0.35;
  trace(ctx, [cam.project(x0, 0, z0), cam.project(x1, 0, z1), cam.project(x1, lo, z1), cam.project(x0, lo, z0)]);
  ctx.fillStyle = "#4f6f93";
  ctx.fill();
}

// Everything standing on site — the hoarding and the boxes — on one side of the plate's centre:
// `near` false for the far side (drawn before the plate), true for the camera's side (drawn
// last, over it). The panel of hoarding nearest the camera is left out, so it never stands
// between the operator and the site.
export function drawSiteObjects(ctx, cam, near) {
  const items = [];
  for (const b of BOXES) {
    const cx = (b[0] + b[3]) / 2;
    const cz = (b[2] + b[5]) / 2;
    if (nearSide(cam, cx, cz) !== near) continue;
    items.push({ draw: () => drawSolid(ctx, cam, b), depth: cam.project(cx, (b[1] + b[4]) / 2, cz).depth });
  }
  const tx = Math.sin(cam.yaw);
  const tz = Math.cos(cam.yaw);
  for (const p of PANELS) {
    const cx = (p[0] + p[2]) / 2;
    const cz = (p[1] + p[3]) / 2;
    // the side of the hoarding facing the camera (its outward normal toward the eye)
    if ((cx * tx + cz * tz) / FENCE > 0.95) continue;
    if (nearSide(cam, cx, cz) !== near) continue;
    items.push({ draw: () => drawPanel(ctx, cam, p), depth: cam.project(cx, FENCE_H / 2, cz).depth });
  }
  items.sort((a, b) => b.depth - a.depth);
  for (const it of items) it.draw();
}
