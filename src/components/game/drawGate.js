// DIRECTIONAL PLATE (placeholder, see src/lib/game/gates.js) — how a plate is drawn on the plan.
// A plate says which one way it opens: a parapet along the three closed sides with the open one
// left as a gap, and the way out marked off it in the compass point it faces. Pencilled while
// the climber has not stood on it, inked in the moment they have.
import { MONO } from "@/lib/game/canvas";
import { GATE, GATE_DIR } from "@/lib/game/gates";
import { ACCENT, ACCENT_SOFT, INK_SOFT } from "@/lib/game/palette";

export default function drawGate(ctx, plan, X, Y) {
  const d = GATE_DIR[plan.gate.dir];
  const { x: cx, z: cz } = plan.gate;
  const on = plan.gate.active;
  const half = GATE.w / 2;
  const poly = plan.poly;

  ctx.save();
  ctx.globalAlpha = on ? 1 : 0.5;
  ctx.lineCap = "round";

  // the parapet, laid just outside every side but the open one
  ctx.strokeStyle = on ? ACCENT : INK_SOFT;
  ctx.lineWidth = 2.4;
  ctx.beginPath();
  for (let i = 0; i < poly.length; i++) {
    const a = poly[i];
    const b = poly[(i + 1) % poly.length];
    const mx = (a[0] + b[0]) / 2;
    const mz = (a[1] + b[1]) / 2;
    const len = Math.hypot(mx - cx, mz - cz) || 1;
    const nx = (mx - cx) / len;
    const nz = (mz - cz) / len;
    if (nx * d.x + nz * d.z > 0.45) continue; // the side it opens toward
    ctx.moveTo(X(a[0] + nx * 0.08), Y(a[1] + nz * 0.08));
    ctx.lineTo(X(b[0] + nx * 0.08), Y(b[1] + nz * 0.08));
  }
  ctx.stroke();

  // the way out: an arrow off the open side, named by the compass point it faces
  const ax = cx + d.x * (half + 0.15);
  const az = cz + d.z * (half + 0.15);
  const bx = cx + d.x * (half + 0.85);
  const bz = cz + d.z * (half + 0.85);
  ctx.strokeStyle = on ? ACCENT : ACCENT_SOFT;
  ctx.lineWidth = 1.8;
  ctx.beginPath();
  ctx.moveTo(X(ax), Y(az));
  ctx.lineTo(X(bx), Y(bz));
  ctx.stroke();
  ctx.fillStyle = on ? ACCENT : ACCENT_SOFT;
  ctx.beginPath();
  ctx.moveTo(X(bx), Y(bz));
  ctx.lineTo(X(bx - d.x * 0.3 - d.z * 0.17), Y(bz - d.z * 0.3 + d.x * 0.17));
  ctx.lineTo(X(bx - d.x * 0.3 + d.z * 0.17), Y(bz - d.z * 0.3 - d.x * 0.17));
  ctx.closePath();
  ctx.fill();
  ctx.font = `bold 10px ${MONO}`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillStyle = on ? ACCENT : INK_SOFT;
  ctx.fillText(plan.gate.dir, X(cx + d.x * (half + 1.3)), Y(cz + d.z * (half + 1.3)));
  ctx.restore();
}
