// Glass breaking under a heavy landing: a white flash where the pane was, then a burst of
// angular shards that spin out, catch the light and fall. Purely decorative — the engine only
// says where a pane broke (engine.effects); the shards are thrown here, with render-side
// randomness, in whatever 2D frame a view draws in.

const GRAVITY = -14; // m/s², in the view's own up
const FLASH_SECONDS = 0.18;

export function createShatter() {
  return { shards: [], flashes: [] };
}

// Break a pane: `u`, `y` its centre in the view's 2D frame (metres), `half` half its width there,
// `hex` its colour. With `up` the shards are thrown up and fall (a side view); without, they skid
// out across the plane and slow (a top-down view, where `h` is the height they lie at).
export function breakPane(fx, u, y, half, hex, { count = 34, up = true, h = 0 } = {}) {
  fx.flashes.push({ u, y, h, r: half * 1.4, life: 0 });
  for (let i = 0; i < count; i++) {
    const across = (Math.random() * 2 - 1) * half;
    const out = Math.sign(across || 1) * (0.8 + Math.random() * 2.6);
    const size = 0.06 + Math.random() * 0.16;
    // an irregular triangle, as a pane breaks into
    const pts = [0, 1, 2].map((k) => {
      const a = (k / 3) * Math.PI * 2 + (Math.random() - 0.5) * 1.2;
      const r = size * (0.6 + Math.random() * 0.6);
      return [Math.cos(a) * r, Math.sin(a) * r];
    });
    fx.shards.push({
      u: u + across,
      y: y + (Math.random() - 0.5) * (up ? 0.1 : half),
      h,
      vu: out,
      vy: up ? 1.2 + Math.random() * 3.4 : (Math.random() * 2 - 1) * 2.6,
      grav: up ? GRAVITY : 0,
      drag: up ? 0 : 2.5,
      rot: Math.random() * Math.PI * 2,
      vr: (Math.random() * 2 - 1) * 14,
      pts,
      hex,
      glint: Math.random() * Math.PI * 2,
      life: 0,
      max: 0.7 + Math.random() * 0.7,
    });
  }
}

export function stepShatter(fx, dt) {
  for (const s of fx.shards) {
    s.life += dt;
    s.vy += s.grav * dt;
    if (s.drag) {
      s.vu *= Math.exp(-s.drag * dt);
      s.vy *= Math.exp(-s.drag * dt);
    }
    s.u += s.vu * dt;
    s.y += s.vy * dt;
    s.rot += s.vr * dt;
  }
  fx.shards = fx.shards.filter((s) => s.life < s.max);
  for (const f of fx.flashes) f.life += dt;
  fx.flashes = fx.flashes.filter((f) => f.life < FLASH_SECONDS);
}

// Draw them: `P(u, y, h)` maps a point of the view's frame to pixels ([x, y]), `scale` is pixels
// per metre.
export function drawShatter(ctx, fx, P, scale) {
  for (const f of fx.flashes) {
    const k = 1 - f.life / FLASH_SECONDS;
    const r = Math.max(4, f.r * scale * (1 + (1 - k) * 0.8));
    const [cx, cy] = P(f.u, f.y, f.h);
    const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
    g.addColorStop(0, `rgba(255,255,255,${(0.9 * k).toFixed(3)})`);
    g.addColorStop(0.5, `rgba(220,245,255,${(0.45 * k).toFixed(3)})`);
    g.addColorStop(1, "rgba(220,245,255,0)");
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fill();
  }
  for (const s of fx.shards) {
    const k = 1 - s.life / s.max;
    ctx.save();
    ctx.translate(...P(s.u, s.y, s.h));
    ctx.rotate(s.rot);
    ctx.globalAlpha = Math.min(1, k * 1.6);
    ctx.beginPath();
    s.pts.forEach(([px, py], j) => (j ? ctx.lineTo(px * scale, py * scale) : ctx.moveTo(px * scale, py * scale)));
    ctx.closePath();
    ctx.fillStyle = s.hex;
    ctx.fill();
    // each shard flashes as it turns through the light
    const glint = Math.max(0, Math.sin(s.rot * 1.5 + s.glint));
    ctx.fillStyle = `rgba(255,255,255,${(0.25 + 0.6 * glint).toFixed(3)})`;
    ctx.fill();
    ctx.strokeStyle = "rgba(255,255,255,0.85)";
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.restore();
  }
}
