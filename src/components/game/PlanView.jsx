import { useEffect, useRef } from "react";
import { useFrame } from "@/components/game/frame";
import { paintMember } from "@/components/game/art/materials";
import { createCamera, easeYaw, yawFor } from "@/components/game/perspective";
import useCanvasSize from "@/components/game/useCanvasSize";
import { MONO } from "@/lib/game/canvas";
import { AIM_LIMIT, CELL, CHARACTER, FACES, GROUND_HALF, ROTATE_STEP_DEG, VIEW_FOLLOW } from "@/lib/game/constants";
import { boxVertices, memberVertices } from "@/lib/game/elevation";
import { quatFromEuler } from "@/lib/game/world";
import { ACCENT, ACCENT_TINT, CLIMBER_GUIDE, FIGURE, GRID, INK_FAINT, PAPER, PLATE, SHADOW, edgeOf, scaleHex } from "@/lib/game/palette";

const ROTATE_STEP = (ROTATE_STEP_DEG * Math.PI) / 180;
const clampAim = (v) => Math.max(-AIM_LIMIT, Math.min(AIM_LIMIT, v));
// A pencilled floor slab fills in as the climber nears it: no fill while its underside is
// SLAB_FAR metres or more above their feet, full SLAB_FILL once it is within SLAB_NEAR.
const SLAB_FAR = 5;
const SLAB_NEAR = 1;
const SLAB_FILL = 0.6;
// How fast the camera turns with the elevation and rises with the climber (per second).
const TURN_RATE = 7;
const RISE_RATE = 4;

// A box's six faces as corner indices into boxVertices() (index = 4·sx + 2·sy + sz, 0 for −, 1
// for +), each with the local axis it faces along.
const BOX_FACES = [
  { idx: [0, 1, 3, 2], axis: 0, sign: -1 },
  { idx: [4, 6, 7, 5], axis: 0, sign: 1 },
  { idx: [0, 4, 5, 1], axis: 1, sign: -1 },
  { idx: [2, 3, 7, 6], axis: 1, sign: 1 },
  { idx: [0, 2, 6, 4], axis: 2, sign: -1 },
  { idx: [1, 5, 7, 3], axis: 2, sign: 1 },
];

// A bold arrow with a filled head, from (x0, y0) to (x1, y1) in canvas pixels.
function drawArrow(ctx, x0, y0, x1, y1, ink) {
  const a = Math.atan2(y1 - y0, x1 - x0);
  ctx.save();
  ctx.strokeStyle = ink;
  ctx.fillStyle = ink;
  ctx.lineWidth = 2.5;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(x0, y0);
  ctx.lineTo(x1 - Math.cos(a) * 6, y1 - Math.sin(a) * 6);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x1 - Math.cos(a - 0.45) * 11, y1 - Math.sin(a - 0.45) * 11);
  ctx.lineTo(x1 - Math.cos(a + 0.45) * 11, y1 - Math.sin(a + 0.45) * 11);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

const id = (v) => v;

// A screen-space polygon traced through the camera.
function tracePts(ctx, pts) {
  ctx.beginPath();
  ctx.moveTo(pts[0].x, pts[0].y);
  for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
  ctx.closePath();
}

// A horizontal rectangle [x0, z0] – [x1, z1] at height y, projected.
function flatRect(cam, x0, z0, x1, z1, y) {
  return [cam.project(x0, y, z0), cam.project(x1, y, z0), cam.project(x1, y, z1), cam.project(x0, y, z1)];
}

// Draw one box (its eight corners in world space) as the camera sees it: the faces turned toward
// the eye, far ones first, the top in the member's material and the sides shaded down from it.
function drawBox(ctx, cam, verts, { type, hex, alpha = 1, dash = null }) {
  const eye = cam.eye();
  const pts = verts.map((v) => cam.project(v[0], v[1], v[2]));
  const centre = verts.reduce((s, v) => [s[0] + v[0] / 8, s[1] + v[1] / 8, s[2] + v[2] / 8], [0, 0, 0]);
  const faces = [];
  for (const f of BOX_FACES) {
    const c = f.idx.reduce((s, i) => [s[0] + verts[i][0] / 4, s[1] + verts[i][1] / 4, s[2] + verts[i][2] / 4], [0, 0, 0]);
    const n = [c[0] - centre[0], c[1] - centre[1], c[2] - centre[2]];
    const toEye = [eye.x - c[0], eye.y - c[1], eye.z - c[2]];
    if (n[0] * toEye[0] + n[1] * toEye[1] + n[2] * toEye[2] <= 0) continue;
    const len = Math.hypot(n[0], n[1], n[2]) || 1;
    faces.push({ f, up: n[1] / len, depth: f.idx.reduce((s, i) => s + pts[i].depth, 0) / 4 });
  }
  faces.sort((a, b) => b.depth - a.depth);
  ctx.save();
  ctx.globalAlpha = alpha;
  for (const { f, up } of faces) {
    const poly = f.idx.map((i) => [pts[i].x, pts[i].y]);
    if (up > 0.7) {
      // the top: its material, grain running along the member's own x
      const e = [pts[f.idx[1]].x - pts[f.idx[0]].x, pts[f.idx[1]].y - pts[f.idx[0]].y];
      const ppm = pts[f.idx[0]].ppm;
      paintMember(ctx, poly, id, id, { type, hex, screenAngle: Math.atan2(e[1], e[0]), scale: ppm, outline: edgeOf(hex), dash });
    } else {
      ctx.beginPath();
      ctx.moveTo(poly[0][0], poly[0][1]);
      for (let i = 1; i < poly.length; i++) ctx.lineTo(poly[i][0], poly[i][1]);
      ctx.closePath();
      ctx.fillStyle = scaleHex(hex, up < -0.7 ? 0.5 : 0.72);
      ctx.fill();
      if (dash) ctx.setLineDash(dash);
      ctx.strokeStyle = edgeOf(hex);
      ctx.lineWidth = 1;
      ctx.stroke();
      ctx.setLineDash([]);
    }
  }
  ctx.restore();
}

// TOP VIEW — the same rigid bodies seen in perspective from above, from the side the elevation
// is read from: the plan's near edge is the elevation's plane and its left-right is the
// elevation's, and the camera turns with the elevation and rises with the climber. The mouse
// aims on the horizontal plane the member in play will land at.
export default function PlanView({ engineRef, onDrop }) {
  const canvasRef = useRef(null);
  const viewRef = useCanvasSize(canvasRef);
  const onDropRef = useRef(onDrop);
  onDropRef.current = onDrop;
  // the camera the last frame was drawn with, and where it is easing to
  const camRef = useRef(null);
  const yawRef = useRef(null);
  const riseRef = useRef(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return undefined;

    // The mouse sets the member's X / Z: the point under it on the plane the member will land
    // at (its bottom where it lands now), so the footprint sits under the cursor.
    const aim = (e) => {
      const eng = engineRef.current;
      const cam = camRef.current;
      if (!eng || !cam) return;
      const rect = canvas.getBoundingClientRect();
      const p = eng.placement();
      const at = cam.unproject(e.clientX - rect.left, e.clientY - rect.top, p.landing - p.type.h / 2);
      eng.preview.x = clampAim(at.x);
      eng.preview.z = clampAim(at.z);
    };

    const onMove = (e) => aim(e);
    const onDown = (e) => {
      if (e.button !== 0) return;
      aim(e);
      const eng = engineRef.current;
      if (eng && eng.drop()) onDropRef.current?.();
    };
    const onWheel = (e) => {
      e.preventDefault();
      const eng = engineRef.current;
      if (!eng || eng.mode !== "play") return;
      eng.preview.yaw += (e.deltaY > 0 ? -1 : 1) * ROTATE_STEP;
    };

    canvas.addEventListener("pointermove", onMove);
    canvas.addEventListener("pointerdown", onDown);
    canvas.addEventListener("wheel", onWheel, { passive: false });
    return () => {
      canvas.removeEventListener("pointermove", onMove);
      canvas.removeEventListener("pointerdown", onDown);
      canvas.removeEventListener("wheel", onWheel);
    };
  }, [engineRef, viewRef]);

  useFrame((dt, now) => {
    const canvas = canvasRef.current;
    const v = viewRef.current;
    if (!canvas || !v) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const { dpr, w, h } = v;

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = PAPER;
    ctx.fillRect(0, 0, w, h);

    const eng = engineRef.current;
    const c = eng?.character;
    const feet = c ? c.y - c.hh : 0;

    // the camera: turned to the face being read, risen with the climber like the elevation
    const goalYaw = eng ? yawFor(eng) : 0;
    yawRef.current = yawRef.current == null ? goalYaw : easeYaw(yawRef.current, goalYaw, Math.min(1, dt * TURN_RATE));
    const goalRise = Math.max(0, feet - VIEW_FOLLOW);
    riseRef.current += (goalRise - riseRef.current) * Math.min(1, dt * RISE_RATE);
    const rise = riseRef.current;
    const cam = createCamera(yawRef.current, rise, w, h, GROUND_HALF);
    camRef.current = cam;
    const H = GROUND_HALF;

    // the ground plate, and the work plane at the camera's height with the placing grid on it
    ctx.fillStyle = PLATE;
    tracePts(ctx, flatRect(cam, -H, -H, H, H, 0));
    ctx.fill();
    ctx.strokeStyle = INK_FAINT;
    ctx.lineWidth = 1.2;
    ctx.stroke();
    if (rise > 0.05) {
      ctx.fillStyle = "rgba(255,255,255,0.55)";
      tracePts(ctx, flatRect(cam, -H, -H, H, H, rise));
      ctx.fill();
    }
    const cells = Math.round((H * 2) / CELL);
    ctx.strokeStyle = GRID;
    for (const metre of [false, true]) {
      ctx.lineWidth = metre ? 1 : 0.5;
      ctx.globalAlpha = metre ? 1 : 0.55;
      ctx.beginPath();
      for (let i = 0; i <= cells; i++) {
        const g = -H + i * CELL;
        if (metre !== Number.isInteger(g)) continue;
        for (const [a, b] of [
          [cam.project(g, rise, -H), cam.project(g, rise, H)],
          [cam.project(-H, rise, g), cam.project(H, rise, g)],
        ]) {
          ctx.moveTo(a.x, a.y);
          ctx.lineTo(b.x, b.y);
        }
      }
      ctx.stroke();
    }
    ctx.globalAlpha = 1;

    // the face being read is the plate's near edge: inked in along the work plane
    const face = FACES[eng?.face ?? "front"];
    const near = (() => {
      const t = [Math.sin(cam.yaw), Math.cos(cam.yaw)]; // toward the viewer, in x / z
      const ux = Math.cos(cam.yaw);
      const uz = -Math.sin(cam.yaw);
      const mid = [t[0] * H, t[1] * H];
      return [cam.project(mid[0] - ux * H, rise, mid[1] - uz * H), cam.project(mid[0] + ux * H, rise, mid[1] + uz * H)];
    })();
    ctx.strokeStyle = ACCENT;
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(near[0].x, near[0].y);
    ctx.lineTo(near[1].x, near[1].y);
    ctx.stroke();

    // the compass on the work plane, the side being read picked out
    ctx.font = `bold 11px ${MONO}`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    const inset = H - 0.35;
    for (const [label, px, pz] of [
      ["N", 0, -inset],
      ["S", 0, inset],
      ["W", -inset, 0],
      ["E", inset, 0],
    ]) {
      const p = cam.project(px, rise, pz);
      ctx.fillStyle = label === face.compass ? ACCENT : INK_FAINT;
      ctx.fillText(label, p.x, p.y);
    }

    if (!eng) return;

    // Contact shadows on the ground: each member's footprint, darker the closer it sits to it.
    for (const m of eng.members) {
      if (m.floor) continue;
      const vs = memberVertices(m);
      const ys = vs.map((p) => p[1]);
      const lo = Math.min(...ys);
      const bottom = vs.filter((p) => p[1] < lo + 0.2).map((p) => cam.project(p[0], 0, p[2]));
      if (bottom.length < 3) continue;
      const hull = bottom;
      ctx.fillStyle = `rgba(${SHADOW},${Math.max(0.04, 0.2 - 0.03 * lo).toFixed(3)})`;
      ctx.beginPath();
      // the bottom corners of a box are at most four: sorting them round their centre traces it
      const cx = hull.reduce((s, p) => s + p.x, 0) / hull.length;
      const cy = hull.reduce((s, p) => s + p.y, 0) / hull.length;
      hull.sort((a, b) => Math.atan2(a.y - cy, a.x - cx) - Math.atan2(b.y - cy, b.x - cx));
      ctx.moveTo(hull[0].x, hull[0].y);
      for (const p of hull) ctx.lineTo(p.x, p.y);
      ctx.closePath();
      ctx.fill();
    }

    // every member as a box, far ones first; what the lava has closed over goes under its surface
    const lava = eng.lava;
    const boxes = eng.members.map((m) => {
      const verts = memberVertices(m);
      const ctr = verts.reduce((s, p) => [s[0] + p[0] / 8, s[1] + p[1] / 8, s[2] + p[2] / 8], [0, 0, 0]);
      const top = Math.max(...verts.map((p) => p[1]));
      return { m, verts, top, depth: cam.project(ctr[0], ctr[1], ctr[2]).depth };
    });
    boxes.sort((a, b) => b.depth - a.depth || a.top - b.top);

    const drawOne = ({ m, verts }) => {
      if (m.stone) return drawBox(ctx, cam, verts, { type: "basalt", hex: m.hex });
      if (m.floor && !m.floor.active) {
        // pencilled: out of sight until the climber nears it, then fading in, outline first —
        // seen from above, a storey far overhead would only fill the view
        const below = verts[0][1] - feet;
        const k = 1 - Math.min(1, Math.max(0, (below - SLAB_NEAR) / (SLAB_FAR - SLAB_NEAR)));
        if (k <= 0) return undefined;
        const topFace = [2, 3, 7, 6].map((i) => cam.project(verts[i][0], verts[i][1], verts[i][2]));
        ctx.save();
        ctx.globalAlpha = SLAB_FILL * k * k;
        tracePts(ctx, topFace);
        ctx.fillStyle = m.hex;
        ctx.fill();
        ctx.setLineDash([6, 4]);
        ctx.globalAlpha = 0.6 * k;
        ctx.strokeStyle = edgeOf(m.hex);
        ctx.lineWidth = 1;
        ctx.stroke();
        ctx.restore();
        return undefined;
      }
      return drawBox(ctx, cam, verts, { type: m.type.id, hex: m.hex });
    };
    for (const b of boxes) if (b.top <= lava) drawOne(b);
    if (lava > -0.25) {
      const k = Math.min(1, (lava + 0.25) / 0.25);
      ctx.save();
      ctx.globalAlpha = 0.82 * k;
      const pts = flatRect(cam, -H, -H, H, H, Math.max(0, lava));
      const g = ctx.createLinearGradient(0, Math.min(...pts.map((p) => p.y)), 0, Math.max(...pts.map((p) => p.y)));
      const flicker = 0.04 * Math.sin(now / 700);
      g.addColorStop(0, "#ffc061");
      g.addColorStop(0.55 + flicker, "#fb8f44");
      g.addColorStop(1, "#e2652f");
      tracePts(ctx, pts);
      ctx.fillStyle = g;
      ctx.fill();
      ctx.restore();
    }
    for (const b of boxes) if (b.top > lava) drawOne(b);

    // the climber, on the near face: a dashed line across the plate where their column is, and
    // their figure standing at its near end
    const cf = FACES[eng.face];
    const cw = eng.charWorld();
    const along = cf.axis === "x" ? [0, 1] : [1, 0];
    const base = [cw.cx, cw.cz];
    const a0 = cam.project(base[0] - along[0] * H, feet, base[1] - along[1] * H);
    const a1 = cam.project(base[0] + along[0] * H, feet, base[1] + along[1] * H);
    ctx.save();
    ctx.setLineDash([3, 5]);
    ctx.strokeStyle = CLIMBER_GUIDE;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(a0.x, a0.y);
    ctx.lineTo(a1.x, a1.y);
    ctx.stroke();
    ctx.restore();
    const nearEnd = a0.depth < a1.depth ? [base[0] - along[0] * H, base[1] - along[1] * H] : [base[0] + along[0] * H, base[1] + along[1] * H];
    const fb = cam.project(nearEnd[0], feet, nearEnd[1]);
    const fh = cam.project(nearEnd[0], feet + CHARACTER.h, nearEnd[1]);
    ctx.fillStyle = FIGURE;
    ctx.fillRect(fb.x - 3, fh.y, 6, fb.y - fh.y);

    // the member in play: its box where it hangs now, its footprint where it will land with a
    // line down to it, and which way it will tip there
    if (eng.mode === "play") {
      const pl = eng.placement();
      const q = quatFromEuler(0, pl.yaw, 0);
      const hx = pl.type.w / 2;
      const hy = pl.type.h / 2;
      const hz = pl.type.d / 2;
      const bottom = pl.landing - hy;
      const land = boxVertices(hx, 0, hz, { x: pl.x, y: bottom, z: pl.z }, q);
      const foot = [0, 1, 5, 4].map((i) => cam.project(land[i][0], land[i][1], land[i][2]));
      ctx.save();
      tracePts(ctx, foot);
      ctx.fillStyle = ACCENT_TINT;
      ctx.fill();
      ctx.setLineDash([6, 5]);
      ctx.strokeStyle = ACCENT;
      ctx.lineWidth = 1.3;
      ctx.stroke();
      const from = cam.project(pl.x, pl.y - hy, pl.z);
      const to = cam.project(pl.x, bottom, pl.z);
      ctx.setLineDash([2, 4]);
      ctx.beginPath();
      ctx.moveTo(from.x, from.y);
      ctx.lineTo(to.x, to.y);
      ctx.stroke();
      ctx.restore();
      drawBox(ctx, cam, boxVertices(hx, hy, hz, { x: pl.x, y: pl.y, z: pl.z }, q), {
        type: pl.type.id,
        hex: pl.type.hex,
        alpha: 0.85,
        dash: [6, 4],
      });

      const tip = eng.tipForecast();
      if (tip) {
        const quarter = Math.round(pl.yaw / (Math.PI / 2));
        const half = (tip.axis === "x") === !(quarter % 2) ? pl.type.w / 2 : pl.type.d / 2;
        const len = Math.max(0.5, half - 0.15);
        const [dx, dz] = tip.axis === "x" ? [tip.sign, 0] : [0, tip.sign];
        const s = cam.project(pl.x, bottom, pl.z);
        const e = cam.project(pl.x + dx * len, bottom, pl.z + dz * len);
        drawArrow(ctx, s.x, s.y, e.x, e.y, ACCENT);
      }
    }
  });

  return <canvas ref={canvasRef} className="absolute inset-0 h-full w-full cursor-crosshair" />;
}
