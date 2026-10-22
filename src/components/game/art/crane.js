// The story drawn onto the elevation: the tower crane's cable and hook holding the member in
// play (its brake failing — the cable judders and the hook throws sparks, more as the run goes
// on), the drone's camera overlay the elevation is seen through, and the worker going down into
// the lava with a thumb up. Decoration only; render-side randomness is fine here.
import { MONO } from "@/lib/game/canvas";
import { FIGURE } from "@/lib/game/palette";

const STEEL = "#3a3f46";
const SPARK = ["#fff3b0", "#ffd166", "#ff9f43"];

export function createCraneFx() {
  return { sparks: [], slip: 0, retract: null, lastDropped: null, deathAt: null };
}

// The brake's state, from how far the run has gone: `strain` 0 (holding) → 1 (barely holding).
// A slip is a sudden jerk of the cable; they come more often as the strain grows.
export function stepCraneFx(fx, dt, strain, hook) {
  fx.slip = Math.max(0, fx.slip - dt * 4);
  if (hook && Math.random() < dt * (0.25 + strain * 2.2)) {
    fx.slip = 1;
    for (let i = 0; i < 6 + Math.round(strain * 10); i++) {
      fx.sparks.push({
        u: hook.u + (Math.random() - 0.5) * 0.15,
        y: hook.y + 0.15,
        vu: (Math.random() - 0.5) * 3,
        vy: Math.random() * 2.5,
        life: 0.35 + Math.random() * 0.35,
        c: SPARK[i % SPARK.length],
      });
    }
  }
  for (const s of fx.sparks) {
    s.u += s.vu * dt;
    s.y += s.vy * dt;
    s.vy -= 9 * dt;
    s.life -= dt;
  }
  fx.sparks = fx.sparks.filter((s) => s.life > 0);
  if (fx.retract) {
    fx.retract.y += dt * 14;
    fx.retract.t += dt;
    if (fx.retract.t > 0.6) fx.retract = null;
  }
}

// Where the hook hangs over a member's silhouette: above the middle of its top edge.
export function hookOver(poly) {
  const top = Math.max(...poly.map((p) => p[1]));
  const upper = poly.filter((p) => p[1] > top - 0.08);
  const left = Math.min(...upper.map((p) => p[0]));
  const right = Math.max(...upper.map((p) => p[0]));
  return { u: (left + right) / 2, y: top + 0.55, left, right, top };
}

function drawHook(ctx, x, y, m) {
  ctx.fillStyle = STEEL;
  ctx.fillRect(x - 0.11 * m, y - 0.34 * m, 0.22 * m, 0.16 * m); // the block
  ctx.strokeStyle = STEEL;
  ctx.lineWidth = Math.max(1.5, 0.045 * m);
  ctx.beginPath();
  ctx.moveTo(x, y - 0.18 * m);
  ctx.lineTo(x, y - 0.06 * m);
  ctx.arc(x - 0.06 * m, y - 0.06 * m, 0.06 * m, 0, Math.PI * 0.85); // the hook's curl
  ctx.stroke();
}

// The cable from the top of the window to the hook, the hook, and the two slings down to the
// member's top corners. `strain` sets how much the cable judders.
export function drawCrane(ctx, poly, X, Y, view, fx, time, strain, m) {
  const h = hookOver(poly);
  const judder = (Math.sin(time * 41) * 0.012 + Math.sin(time * 17) * 0.008) * strain + fx.slip * 0.05 * Math.sin(time * 90);
  const hx = X(h.u + judder);
  const hy = Y(h.y + fx.slip * 0.06);
  ctx.save();
  ctx.lineCap = "round";
  // cable
  ctx.strokeStyle = STEEL;
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.moveTo(hx, Y(view.yMax) - 2);
  ctx.lineTo(hx, hy - 0.34 * m);
  ctx.stroke();
  drawHook(ctx, hx, hy, m);
  // slings
  ctx.strokeStyle = "rgba(58,63,70,0.8)";
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.moveTo(hx, hy);
  ctx.lineTo(X(h.left + 0.08), Y(h.top));
  ctx.moveTo(hx, hy);
  ctx.lineTo(X(h.right - 0.08), Y(h.top));
  ctx.stroke();
  ctx.restore();
  return h;
}

// The hook springing back up once it has let go — "clack".
export function drawRetract(ctx, X, Y, view, fx, m) {
  const r = fx.retract;
  if (!r) return;
  const hx = X(r.u);
  const hy = Y(r.y);
  ctx.save();
  ctx.globalAlpha = Math.max(0, 1 - r.t / 0.6);
  ctx.strokeStyle = STEEL;
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.moveTo(hx, Y(view.yMax) - 2);
  ctx.lineTo(hx, hy - 0.34 * m);
  ctx.stroke();
  drawHook(ctx, hx, hy, m);
  ctx.restore();
}

export function drawSparks(ctx, fx, X, Y) {
  for (const s of fx.sparks) {
    ctx.fillStyle = s.c;
    ctx.globalAlpha = Math.min(1, s.life * 3);
    ctx.fillRect(X(s.u) - 1.2, Y(s.y) - 1.2, 2.4, 2.4);
  }
  ctx.globalAlpha = 1;
}

// The drone's camera overlay, in screen pixels over the whole elevation: corner brackets, a
// blinking REC, its altitude and its battery running down over the run.
export function drawDroneHud(ctx, w, h, { alt, battery, time, rec }) {
  ctx.save();
  ctx.strokeStyle = "rgba(255,255,255,0.75)";
  ctx.lineWidth = 2;
  const inset = 10;
  const len = 18;
  for (const [cx, cy, sx, sy] of [
    [inset, inset, 1, 1],
    [w - inset, inset, -1, 1],
    [inset, h - inset, 1, -1],
    [w - inset, h - inset, -1, -1],
  ]) {
    ctx.beginPath();
    ctx.moveTo(cx, cy + sy * len);
    ctx.lineTo(cx, cy);
    ctx.lineTo(cx + sx * len, cy);
    ctx.stroke();
  }
  const x = 40;
  const y = 22;
  ctx.font = `bold 10px ${MONO}`;
  ctx.textBaseline = "middle";
  ctx.textAlign = "left";
  if (rec && Math.floor(time * 1.6) % 2 === 0) {
    ctx.fillStyle = "#e5484d";
    ctx.beginPath();
    ctx.arc(x, y, 4, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.fillStyle = "rgba(255,255,255,0.92)";
  ctx.fillText("REC", x + 8, y);
  // battery
  const bx = x + 40;
  ctx.strokeStyle = "rgba(255,255,255,0.85)";
  ctx.lineWidth = 1;
  ctx.strokeRect(bx, y - 5, 22, 10);
  ctx.fillStyle = "rgba(255,255,255,0.85)";
  ctx.fillRect(bx + 22, y - 2, 2, 4);
  ctx.fillStyle = battery < 0.2 ? "#e5484d" : "rgba(255,255,255,0.85)";
  ctx.fillRect(bx + 2, y - 3, 18 * battery, 6);
  ctx.fillStyle = "rgba(255,255,255,0.92)";
  ctx.fillText(`ALT ${alt.toFixed(1)} m`, x - 4, y + 16);
  ctx.restore();
}

// The worker's end in the lava: they sink in over the first beat, then a fist comes back up
// through the surface with its thumb raised, holds, and goes down. `k` is seconds since the
// end; `lavaY` the screen line of the lava's surface, everything below it is hidden.
export function drawThumbsUp(ctx, x, lavaY, size, k) {
  if (k < 1.3 || k > 3.1) return;
  const m = size * 1.6; // drawn larger than life, so it reads at a glance
  const rise = k < 1.6 ? (k - 1.3) / 0.3 : k < 2.5 ? 1 : Math.max(0, 1 - (k - 2.5) / 0.6);
  const up = rise * 0.42 * m;
  ctx.save();
  ctx.beginPath();
  ctx.rect(x - m, lavaY - m * 2, m * 2, m * 2);
  ctx.clip();
  const by = lavaY - up;
  // forearm
  ctx.fillStyle = FIGURE;
  ctx.fillRect(x - 0.05 * m, by + 0.12 * m, 0.1 * m, 0.4 * m);
  // fist and raised thumb
  ctx.fillStyle = "#f1c9a5";
  ctx.beginPath();
  ctx.roundRect(x - 0.08 * m, by, 0.16 * m, 0.15 * m, 0.04 * m);
  ctx.fill();
  ctx.beginPath();
  ctx.roundRect(x - 0.075 * m, by - 0.13 * m, 0.055 * m, 0.15 * m, 0.025 * m);
  ctx.fill();
  ctx.restore();
}

// The last radio call, over where they went down.
export function drawLastWords(ctx, x, y, text, k) {
  if (k < 1.5 || k > 3.3) return;
  const a = Math.min(1, (k - 1.5) / 0.2, (3.3 - k) / 0.3);
  ctx.save();
  ctx.globalAlpha = a;
  ctx.font = `bold 13px ${MONO}`;
  const tw = ctx.measureText(text).width;
  const bx = x - tw / 2 - 10;
  const by = y - 44;
  ctx.fillStyle = "#ffffff";
  ctx.strokeStyle = "#2e3843";
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.roundRect(bx, by, tw + 20, 26, 6);
  ctx.fill();
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(x - 6, by + 26);
  ctx.lineTo(x, by + 36);
  ctx.lineTo(x + 6, by + 26);
  ctx.fill();
  ctx.fillStyle = "#2e3843";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(text, x, by + 13);
  ctx.restore();
}

// Wrap `text` to lines no wider than `max` pixels in the current font (breaking at spaces, or
// anywhere for a word longer than the line).
function wrap(ctx, text, max) {
  const out = [];
  let line = "";
  for (const word of text.split(" ")) {
    const next = line ? `${line} ${word}` : word;
    if (ctx.measureText(next).width <= max || !line) line = next;
    else {
      out.push(line);
      line = word;
    }
  }
  if (line) out.push(line);
  return out;
}

// The worker's speech bubble, its tail pointing down at the head at screen (x, y). Kept inside
// the canvas `w` wide.
export function drawSpeechBubble(ctx, x, y, text, w) {
  ctx.save();
  ctx.font = `bold 12px ${MONO}`;
  const lines = wrap(ctx, text, 220);
  const lh = 16;
  const tw = Math.max(...lines.map((l) => ctx.measureText(l).width));
  const bw = tw + 22;
  const bh = lines.length * lh + 14;
  const bx = Math.max(6, Math.min(w - bw - 6, x - bw / 2));
  const by = y - bh - 16;
  ctx.fillStyle = "#ffffff";
  ctx.strokeStyle = "#2e3843";
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.roundRect(bx, by, bw, bh, 8);
  ctx.fill();
  ctx.stroke();
  // the tail
  const tx = Math.max(bx + 12, Math.min(bx + bw - 12, x));
  ctx.beginPath();
  ctx.moveTo(tx - 7, by + bh - 1);
  ctx.lineTo(x, y - 4);
  ctx.lineTo(tx + 7, by + bh - 1);
  ctx.closePath();
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(tx - 7, by + bh);
  ctx.lineTo(x, y - 4);
  ctx.lineTo(tx + 7, by + bh);
  ctx.stroke();
  ctx.fillStyle = "#2e3843";
  ctx.textAlign = "left";
  ctx.textBaseline = "top";
  lines.forEach((l, i) => ctx.fillText(l, bx + 11, by + 7 + i * lh));
  ctx.restore();
}
