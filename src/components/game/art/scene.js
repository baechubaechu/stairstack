// The elevation's scenery: a dusk sky with a far skyline, the foundation drawn as an
// architectural section, and the lava — its glow, its rolling surface and the embers it throws.
// Decorative only: the lava's height comes from the engine; its waves are drawn, not simulated.

// Dusk, from the top of the window down to the horizon.
const SKY = [
  [0, "#6f7fa8"],
  [0.5, "#c9a3a6"],
  [0.85, "#efc49b"],
  [1, "#f6d9ae"],
];

// A distant skyline, as rectangles in metres (x, width, height), kept low behind the tower.
const SKYLINE = [
  [-6.6, 0.9, 1.3], [-5.6, 0.6, 2.1], [-4.9, 1.1, 1.0], [-3.7, 0.5, 2.8], [-3.1, 0.8, 1.6],
  [-2.2, 1.2, 0.9], [-0.9, 0.7, 2.3], [-0.1, 0.9, 1.4], [0.9, 0.5, 3.1], [1.5, 1.0, 1.2],
  [2.6, 0.7, 2.0], [3.4, 1.1, 1.1], [4.6, 0.6, 2.6], [5.3, 1.3, 1.5],
];

// How much of the camera's climb the far scenery takes part in: 1 would pin it to the world,
// 0 to the screen. In between, the city sinks slowly as the view rises — it reads as far away.
const PARALLAX = 0.65;

// `camY` is how far the elevation window has risen to follow the climber.
export function drawSky(ctx, X, Y, view, now, camY = 0) {
  // the far scenery's own heights: lifted with the camera by the parallax share
  const Yb = (y) => Y(y + camY * PARALLAX);
  const top = Y(view.yMax);
  const horizon = Yb(0);
  const g = ctx.createLinearGradient(0, top, 0, Math.max(horizon, top + 1));
  for (const [at, color] of SKY) g.addColorStop(at, color);
  ctx.fillStyle = g;
  ctx.fillRect(X(view.xMin), top, X(view.xMax) - X(view.xMin), Y(view.yMin) - top);

  // a low sun, half sunk behind the skyline
  const sx = X(3.9);
  const sy = Yb(1.1);
  const r = (Y(0) - Y(1)) * 0.75;
  const halo = ctx.createRadialGradient(sx, sy, r * 0.4, sx, sy, r * 4);
  halo.addColorStop(0, "rgba(255,226,170,0.55)");
  halo.addColorStop(1, "rgba(255,226,170,0)");
  ctx.fillStyle = halo;
  ctx.fillRect(sx - r * 4, sy - r * 4, r * 8, r * 8);
  ctx.fillStyle = "rgba(255,236,196,0.9)";
  ctx.beginPath();
  ctx.arc(sx, sy, r, 0, Math.PI * 2);
  ctx.fill();

  // the far city, in haze
  ctx.fillStyle = "rgba(118,96,128,0.32)";
  for (const [x, w, h] of SKYLINE) ctx.fillRect(X(x), Yb(h), w * (X(1) - X(0)), Yb(0) - Yb(h));
  // lit windows, flickering on one by one
  ctx.fillStyle = "rgba(255,230,170,0.55)";
  const t = Math.floor(now / 1400);
  SKYLINE.forEach(([x, w, h], i) => {
    for (let k = 0; k < 3; k++) {
      if ((i * 7 + k * 3 + t) % 5 !== 0) continue;
      const wx = X(x + w * (0.25 + 0.25 * k));
      const wy = Yb(h * (0.3 + 0.2 * ((i + k) % 3)));
      ctx.fillRect(wx, wy, 2, 2);
    }
  });
}

// The foundation, cut through: concrete with the diagonal hatching of a section drawing,
// from ground level down to `bottom` metres.
export function drawGround(ctx, X, Y, bottom, half, ink) {
  const x0 = X(-half);
  const y0 = Y(0);
  const w = X(half) - x0;
  const h = Y(bottom) - y0;
  ctx.fillStyle = "#d9d1c4";
  ctx.fillRect(x0, y0, w, h);
  ctx.save();
  ctx.beginPath();
  ctx.rect(x0, y0, w, h);
  ctx.clip();
  ctx.strokeStyle = "rgba(90,78,62,0.35)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  for (let x = x0 - h; x < x0 + w; x += 7) {
    ctx.moveTo(x, y0 + h);
    ctx.lineTo(x + h, y0);
  }
  ctx.stroke();
  ctx.restore();
  ctx.strokeStyle = ink;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(x0, y0);
  ctx.lineTo(x0 + w, y0);
  ctx.stroke();
}

// The heat the lava throws up the window: stronger the higher it has climbed.
export function drawLavaGlow(ctx, X, Y, view, level) {
  const surface = Y(level);
  const reach = Y(level) - Y(level + 2.4);
  const g = ctx.createLinearGradient(0, surface, 0, surface - reach);
  const strength = Math.min(0.32, 0.14 + Math.max(0, level) * 0.04);
  g.addColorStop(0, `rgba(255,160,70,${strength})`);
  g.addColorStop(1, "rgba(255,160,70,0)");
  ctx.fillStyle = g;
  ctx.fillRect(X(view.xMin), surface - reach, X(view.xMax) - X(view.xMin), reach);
}

// The rolling surface of the lava, in metres, at screen-x u and time t (seconds).
function waveAt(u, t) {
  return 0.05 * Math.sin(u * 2.1 + t * 1.7) + 0.03 * Math.sin(u * 5.3 - t * 2.9) + 0.015 * Math.sin(u * 11 + t * 4.1);
}

// The lava itself, drawn over the stack so whatever it has closed over glows through it.
export function drawLava(ctx, X, Y, view, level, t) {
  if (level + 0.2 < view.yMin) return; // below the window: drawLavaBelow says where it is
  const left = view.xMin;
  const right = view.xMax;
  const bottom = Y(view.yMin);
  ctx.beginPath();
  ctx.moveTo(X(left), bottom);
  for (let u = left; u <= right + 0.001; u += 0.1) ctx.lineTo(X(u), Y(level + waveAt(u, t)));
  ctx.lineTo(X(right), bottom);
  ctx.closePath();
  // molten orange rather than blood red, and see-through enough that a member the lava has
  // closed over still shows through it
  const g = ctx.createLinearGradient(0, Y(level + 0.1), 0, bottom);
  g.addColorStop(0, "rgba(255,214,110,0.82)");
  g.addColorStop(0.15, "rgba(255,150,60,0.76)");
  g.addColorStop(0.6, "rgba(240,104,46,0.8)");
  g.addColorStop(1, "rgba(204,72,36,0.86)");
  ctx.fillStyle = g;
  ctx.fill();

  // cooler crust drifting on the surface
  ctx.save();
  ctx.clip();
  ctx.fillStyle = "rgba(150,52,24,0.22)";
  for (let i = 0; i < 7; i++) {
    const u = left + ((i * 2.3 + t * 0.25 * (i % 2 ? 1 : -0.6)) % (right - left) + (right - left)) % (right - left);
    const y = Y(level - 0.12 - (i % 3) * 0.08);
    ctx.beginPath();
    ctx.ellipse(X(u), y, (X(0.5) - X(0)) * (0.6 + (i % 3) * 0.3), 2.5, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();

  // a bright line along the crest
  ctx.beginPath();
  for (let u = left; u <= right + 0.001; u += 0.1) {
    const y = Y(level + waveAt(u, t));
    if (u === left) ctx.moveTo(X(u), y);
    else ctx.lineTo(X(u), y);
  }
  ctx.strokeStyle = "rgba(255,232,150,0.85)";
  ctx.lineWidth = 1.6;
  ctx.stroke();
}

// When the view has climbed away from the lava, its heat still shows along the bottom edge,
// with how far below the climber it is — the threat never leaves the screen.
export function drawLavaBelow(ctx, X, Y, view, level, feet, mono) {
  if (level + 0.2 >= view.yMin) return;
  const bottom = Y(view.yMin);
  const band = (Y(0) - Y(1)) * 0.9;
  const g = ctx.createLinearGradient(0, bottom, 0, bottom - band);
  g.addColorStop(0, "rgba(255,150,60,0.55)");
  g.addColorStop(1, "rgba(255,150,60,0)");
  ctx.fillStyle = g;
  ctx.fillRect(X(view.xMin), bottom - band, X(view.xMax) - X(view.xMin), band);
  const text = `LAVA ↓ ${Math.max(0, feet - level).toFixed(1)} m BELOW`;
  ctx.font = `bold 11px ${mono}`;
  ctx.textAlign = "center";
  ctx.textBaseline = "bottom";
  ctx.lineJoin = "round";
  ctx.strokeStyle = "rgba(120,30,10,0.55)";
  ctx.lineWidth = 3;
  const cx = (X(view.xMin) + X(view.xMax)) / 2;
  ctx.strokeText(text, cx, bottom - 6);
  ctx.fillStyle = "#fff1d0";
  ctx.fillText(text, cx, bottom - 6);
}

// The lava seen from above: it rises out of the floor, so it fades in over the plate as its
// surface comes up to ground level, then covers it completely, churning slowly.
export function drawPlanLava(ctx, X, Y, half, level, t) {
  const k = Math.min(1, Math.max(0, (level + 0.25) / 0.25));
  if (k <= 0) return;
  const x0 = X(-half);
  const y0 = Y(-half);
  const size = X(half) - x0;
  ctx.save();
  ctx.globalAlpha = k * 0.85;
  const g = ctx.createRadialGradient(x0 + size / 2, y0 + size / 2, size * 0.1, x0 + size / 2, y0 + size / 2, size * 0.75);
  g.addColorStop(0, "#ffc061");
  g.addColorStop(0.6, "#fb8f44");
  g.addColorStop(1, "#e2652f");
  ctx.fillStyle = g;
  ctx.fillRect(x0, y0, size, size);
  ctx.beginPath();
  ctx.rect(x0, y0, size, size);
  ctx.clip();
  // slow, drifting flakes of crust, each rimmed by a bright seam
  for (let i = 0; i < 22; i++) {
    const cx = x0 + ((i * 0.37 + t * 0.015 * (1 + (i % 3))) % 1) * size;
    const cy = y0 + ((i * 0.61 + t * 0.01 * (i % 2 ? 1 : -1) + 1) % 1) * size;
    const r = size * (0.018 + (i % 4) * 0.008);
    ctx.fillStyle = "rgba(160,60,24,0.2)";
    ctx.beginPath();
    ctx.ellipse(cx, cy, r, r * 0.6, i, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "rgba(255,210,110,0.3)";
    ctx.lineWidth = 1;
    ctx.stroke();
  }
  ctx.restore();
}

// Embers: sparks the lava throws off, rising, drifting and burning out. Positions are in metres
// so they squash with the plane while the elevation turns.
export function createEmbers() {
  return { list: [], acc: 0 };
}

export function stepEmbers(embers, dt, level, view) {
  embers.acc += dt * (14 + Math.max(0, level) * 4);
  while (embers.acc >= 1) {
    embers.acc -= 1;
    embers.list.push({
      u: view.xMin + Math.random() * (view.xMax - view.xMin),
      y: level,
      vu: (Math.random() - 0.5) * 0.4,
      vy: 0.5 + Math.random() * 0.9,
      life: 0,
      max: 0.8 + Math.random() * 1.2,
      size: 1 + Math.random() * 1.6,
    });
  }
  for (const e of embers.list) {
    e.life += dt;
    e.u += e.vu * dt;
    e.y += e.vy * dt;
    e.vu += (Math.random() - 0.5) * dt;
  }
  embers.list = embers.list.filter((e) => e.life < e.max && e.y < view.yMax);
}

export function drawEmbers(ctx, embers, X, Y) {
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  for (const e of embers.list) {
    const k = 1 - e.life / e.max;
    ctx.fillStyle = `rgba(255,${150 + Math.round(90 * k)},60,${(0.85 * k).toFixed(3)})`;
    ctx.beginPath();
    ctx.arc(X(e.u), Y(e.y), e.size * (0.5 + k * 0.5), 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}
