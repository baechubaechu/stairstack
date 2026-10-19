// The climber, drawn as a builder in a hard hat: walking, jumping and landing poses driven by
// the climber's own motion. The collision box stays the engine's; this only dresses it.
import { ACCENT, FIGURE } from "@/lib/game/palette";

const SKIN = "#f1c9a5";
const VEST = "#f3d34a";

export function createClimberAnim() {
  return { phase: 0, facing: 1, wasGrounded: true, airTime: 0, land: 0 };
}

// Advance the pose from the climber's motion. Returns true on the frame they touch down after
// a real fall, so the caller can kick up dust.
export function stepClimberAnim(anim, c, dt) {
  if (Math.abs(c.vx) > 0.1) anim.facing = Math.sign(c.vx);
  if (c.grounded && Math.abs(c.vx) > 0.1) anim.phase += dt * Math.abs(c.vx) * 2.4;
  let landed = false;
  if (c.grounded) {
    if (!anim.wasGrounded && anim.airTime > 0.18) {
      anim.land = 1;
      landed = true;
    }
    anim.airTime = 0;
  } else {
    anim.airTime += dt;
  }
  anim.wasGrounded = c.grounded;
  anim.land = Math.max(0, anim.land - dt / 0.16);
  return landed;
}

function limb(ctx, x0, y0, len, angle) {
  const x1 = x0 + Math.sin(angle) * len;
  const y1 = y0 + Math.cos(angle) * len;
  ctx.beginPath();
  ctx.moveTo(x0, y0);
  ctx.lineTo(x1, y1);
  ctx.stroke();
  return [x1, y1];
}

// Draw the climber with their feet at screen (fx, fy); `m` is pixels per metre and `h` the
// collision box height in metres.
export function drawClimber(ctx, fx, fy, m, h, anim, airborne) {
  const walk = airborne ? 0 : Math.sin(anim.phase);
  const squash = anim.land * 0.14;
  ctx.save();
  ctx.translate(fx, fy);
  ctx.scale(anim.facing * m * (1 + squash * 0.6), -m * (1 - squash));
  // now: 1 unit = 1 m, +y up from the feet, +x the way they face
  const s = h / 0.9;
  ctx.scale(s, s);
  ctx.lineCap = "round";
  ctx.lineJoin = "round";

  // legs — swinging while walking, tucked in the air
  ctx.strokeStyle = FIGURE;
  ctx.lineWidth = 0.085;
  const hip = [0, 0.4];
  const legA = airborne ? 0.55 : walk * 0.55;
  const legB = airborne ? -0.25 : -walk * 0.55;
  for (const a of [legA, legB]) {
    const [kx, ky] = limb(ctx, hip[0], hip[1], 0.22, Math.PI - a);
    limb(ctx, kx, ky, 0.2, Math.PI - (airborne ? a - 0.9 : a * 0.6));
  }

  // body: overalls with a hi-vis vest
  ctx.fillStyle = FIGURE;
  ctx.beginPath();
  ctx.roundRect(-0.13, 0.36, 0.26, 0.3, 0.06);
  ctx.fill();
  ctx.fillStyle = VEST;
  ctx.fillRect(-0.13, 0.5, 0.26, 0.05);

  // arms — counter-swinging, thrown up for a jump
  ctx.strokeStyle = FIGURE;
  ctx.lineWidth = 0.07;
  const shoulder = [0, 0.62];
  const armA = airborne ? 2.4 : -walk * 0.6;
  const armB = airborne ? 2.0 : walk * 0.6;
  for (const a of [armA, armB]) limb(ctx, shoulder[0], shoulder[1], 0.22, Math.PI - a);

  // head and hard hat
  ctx.fillStyle = SKIN;
  ctx.beginPath();
  ctx.arc(0.01, 0.75, 0.095, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#2e3843";
  ctx.beginPath();
  ctx.arc(0.05, 0.765, 0.014, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = ACCENT;
  ctx.beginPath();
  ctx.arc(0, 0.8, 0.11, 0, Math.PI);
  ctx.fill();
  ctx.fillRect(-0.13, 0.79, 0.29, 0.03);
  ctx.restore();
}

// Dust kicked up by a landing — the climber's or a member's. Positions in metres.
export function createDust() {
  return [];
}

export function puff(dust, u, y, spread, count) {
  for (let i = 0; i < count; i++) {
    const side = Math.random() < 0.5 ? -1 : 1;
    dust.push({
      u: u + (Math.random() - 0.5) * spread,
      y: y + 0.02,
      vu: side * (0.4 + Math.random() * 0.9),
      vy: 0.2 + Math.random() * 0.5,
      life: 0,
      max: 0.35 + Math.random() * 0.35,
      size: 0.05 + Math.random() * 0.07,
    });
  }
}

export function stepDust(dust, dt) {
  for (const d of dust) {
    d.life += dt;
    d.u += d.vu * dt;
    d.y += d.vy * dt;
    d.vu *= 1 - 3 * dt;
    d.vy -= 0.6 * dt;
  }
  for (let i = dust.length - 1; i >= 0; i--) if (dust[i].life >= dust[i].max) dust.splice(i, 1);
}

export function drawDust(ctx, dust, X, Y, m) {
  for (const d of dust) {
    const k = 1 - d.life / d.max;
    ctx.fillStyle = `rgba(214,200,178,${(0.7 * k).toFixed(3)})`;
    ctx.beginPath();
    ctx.arc(X(d.u), Y(d.y), d.size * m * (1.4 - k * 0.6), 0, Math.PI * 2);
    ctx.fill();
  }
}
