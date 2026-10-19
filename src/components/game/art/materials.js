// Member materials: each member type is drawn as a building material — the texture rides the
// member's own grain angle, and a top-lit gradient gives it volume. Purely decorative: none of
// this reads or changes the simulation.
import { tracePoly } from "@/lib/game/canvas";
import { edgeOf } from "@/lib/game/palette";

const TILE = 64; // px, one repeat of a material texture at the reference scale
const REF_SCALE = 60; // px per metre the tiles are drawn for

// A small seeded generator, so every tile comes out the same on every load.
function rng(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

// Ochre timber: long, gently wavering grain lines and the odd knot.
function timber(c) {
  const r = rng(7);
  c.strokeStyle = "rgba(92,48,8,0.28)";
  c.lineWidth = 1;
  for (let i = 0; i < 9; i++) {
    const y0 = (i + r() * 0.6) * (TILE / 9);
    c.beginPath();
    for (let x = 0; x <= TILE; x += 4) {
      const y = y0 + Math.sin((x / TILE) * Math.PI * 2 + i) * 1.2;
      if (x === 0) c.moveTo(x, y);
      else c.lineTo(x, y);
    }
    c.stroke();
  }
  c.strokeStyle = "rgba(92,48,8,0.35)";
  c.beginPath();
  c.ellipse(TILE * 0.68, TILE * 0.42, 5, 2.2, 0, 0, Math.PI * 2);
  c.stroke();
}

// Terracotta: rows of short clay tiles with dark joints and a fired, mottled face.
function terracotta(c) {
  const r = rng(11);
  for (let i = 0; i < 40; i++) {
    c.fillStyle = `rgba(${r() > 0.5 ? "255,220,190" : "90,30,10"},0.10)`;
    c.fillRect(r() * TILE, r() * TILE, 3 + r() * 5, 2 + r() * 3);
  }
  c.strokeStyle = "rgba(70,22,6,0.35)";
  c.lineWidth = 1;
  c.beginPath();
  for (let x = 0; x <= TILE; x += 16) {
    c.moveTo(x, 0);
    c.lineTo(x, TILE);
  }
  c.moveTo(0, TILE / 2);
  c.lineTo(TILE, TILE / 2);
  c.stroke();
}

// Glass curtain wall: mullions on a grid, and a pale reflection streak across the panes.
function glass(c) {
  const g = c.createLinearGradient(0, 0, TILE, TILE);
  g.addColorStop(0.0, "rgba(255,255,255,0)");
  g.addColorStop(0.42, "rgba(255,255,255,0)");
  g.addColorStop(0.5, "rgba(255,255,255,0.32)");
  g.addColorStop(0.58, "rgba(255,255,255,0)");
  c.fillStyle = g;
  c.fillRect(0, 0, TILE, TILE);
  c.strokeStyle = "rgba(20,40,60,0.45)";
  c.lineWidth = 1.5;
  c.beginPath();
  for (let x = 0; x <= TILE; x += 21.33) {
    c.moveTo(x, 0);
    c.lineTo(x, TILE);
  }
  c.moveTo(0, TILE / 2);
  c.lineTo(TILE, TILE / 2);
  c.stroke();
}

// Dressed stone: courses of blocks laid in a running bond.
function stone(c) {
  const r = rng(23);
  for (let i = 0; i < 30; i++) {
    c.fillStyle = `rgba(${r() > 0.5 ? "255,255,240" : "30,50,20"},0.09)`;
    c.beginPath();
    c.arc(r() * TILE, r() * TILE, 1 + r() * 2, 0, Math.PI * 2);
    c.fill();
  }
  c.strokeStyle = "rgba(30,48,20,0.4)";
  c.lineWidth = 1.2;
  c.beginPath();
  const rowH = TILE / 4;
  for (let row = 0; row < 4; row++) {
    const y = row * rowH;
    c.moveTo(0, y);
    c.lineTo(TILE, y);
    const off = row % 2 ? TILE / 4 : 0;
    for (let x = off; x < TILE; x += TILE / 2) {
      c.moveTo(x, y);
      c.lineTo(x, y + rowH);
    }
  }
  c.stroke();
}

// Painted steel: a brushed finish and a row of rivets along the member.
function steel(c) {
  c.strokeStyle = "rgba(255,255,255,0.07)";
  c.lineWidth = 1;
  c.beginPath();
  for (let y = 1; y < TILE; y += 3) {
    c.moveTo(0, y);
    c.lineTo(TILE, y);
  }
  c.stroke();
  for (const y of [TILE * 0.22, TILE * 0.78]) {
    for (let x = 8; x < TILE; x += 16) {
      c.fillStyle = "rgba(30,15,40,0.45)";
      c.beginPath();
      c.arc(x, y, 2, 0, Math.PI * 2);
      c.fill();
      c.fillStyle = "rgba(255,255,255,0.35)";
      c.beginPath();
      c.arc(x - 0.6, y - 0.6, 0.8, 0, Math.PI * 2);
      c.fill();
    }
  }
}

// Basalt: a member the lava has set hard — dark, flecked rock with still-glowing cracks.
function basalt(c) {
  const r = rng(41);
  for (let i = 0; i < 46; i++) {
    c.fillStyle = `rgba(${r() > 0.5 ? "190,180,170" : "10,8,8"},${(0.08 + r() * 0.1).toFixed(2)})`;
    c.beginPath();
    c.arc(r() * TILE, r() * TILE, 0.6 + r() * 1.6, 0, Math.PI * 2);
    c.fill();
  }
  c.strokeStyle = "rgba(255,140,60,0.5)";
  c.lineWidth = 1;
  for (let k = 0; k < 3; k++) {
    let x = r() * TILE;
    let y = r() * TILE;
    c.beginPath();
    c.moveTo(x, y);
    for (let s = 0; s < 5; s++) {
      x += (r() - 0.3) * 14;
      y += (r() - 0.5) * 14;
      c.lineTo(x, y);
    }
    c.stroke();
  }
}

// Cast concrete: a floor slab — fine aggregate speckle and the faint grid of its formwork panels.
function concrete(c) {
  const r = rng(53);
  for (let i = 0; i < 70; i++) {
    c.fillStyle = `rgba(${r() > 0.5 ? "255,255,255" : "70,62,52"},${(0.06 + r() * 0.08).toFixed(2)})`;
    c.fillRect(r() * TILE, r() * TILE, 1 + r() * 1.5, 1 + r() * 1.5);
  }
  c.strokeStyle = "rgba(90,80,66,0.18)";
  c.lineWidth = 1;
  c.beginPath();
  c.moveTo(0, 0.5);
  c.lineTo(TILE, 0.5);
  c.moveTo(0.5, 0);
  c.lineTo(0.5, TILE);
  c.stroke();
}

const PAINTERS = { slab: timber, plank: terracotta, block: glass, step: stone, beam: steel, basalt, floor: concrete };

// One texture tile per type, painted once and shared by every canvas.
const tiles = new Map();
function tileFor(type) {
  if (!PAINTERS[type]) return null;
  if (!tiles.has(type)) {
    const canvas = document.createElement("canvas");
    canvas.width = TILE;
    canvas.height = TILE;
    PAINTERS[type](canvas.getContext("2d"));
    tiles.set(type, canvas);
  }
  return tiles.get(type);
}

// A CanvasPattern is bound to the context that made it, so patterns are cached per context.
const patterns = new WeakMap();
function patternFor(ctx, type) {
  let byType = patterns.get(ctx);
  if (!byType) {
    byType = new Map();
    patterns.set(ctx, byType);
  }
  if (!byType.has(type)) {
    const tile = tileFor(type);
    byType.set(type, tile ? ctx.createPattern(tile, "repeat") : null);
  }
  return byType.get(type);
}

function bounds(poly, X, Y) {
  let x0 = Infinity;
  let y0 = Infinity;
  let x1 = -Infinity;
  let y1 = -Infinity;
  for (const [u, v] of poly) {
    const x = X(u);
    const y = Y(v);
    if (x < x0) x0 = x;
    if (x > x1) x1 = x;
    if (y < y0) y0 = y;
    if (y > y1) y1 = y;
  }
  return { x0, y0, x1, y1 };
}

// A soft contact shadow, thrown down and to the right of a member (the light is upper left).
export function shadeUnder(ctx, poly, X, Y, scale) {
  const d = Math.max(2, scale * 0.06);
  ctx.save();
  ctx.translate(d, d * 1.3);
  tracePoly(ctx, poly, X, Y);
  ctx.fillStyle = "rgba(40,24,12,0.18)";
  ctx.fill();
  ctx.restore();
}

// Fill a member's polygon with its material. `screenAngle` is the grain direction in screen
// space (radians, clockwise-positive like the canvas); a member with no `type` (a plate) gets
// the shading but no texture.
export function paintMember(ctx, poly, X, Y, { type, hex, screenAngle = 0, scale, outline, dash }) {
  const b = bounds(poly, X, Y);
  tracePoly(ctx, poly, X, Y);
  ctx.fillStyle = hex;
  ctx.fill();

  const pattern = patternFor(ctx, type);
  if (pattern) {
    const k = scale / REF_SCALE;
    pattern.setTransform(
      new DOMMatrix()
        .translateSelf((b.x0 + b.x1) / 2, (b.y0 + b.y1) / 2)
        .rotateSelf((screenAngle * 180) / Math.PI)
        .scaleSelf(k, k),
    );
    ctx.fillStyle = pattern;
    ctx.fill();
  }

  // light from above: a lit top edge fading to a shaded underside
  const g = ctx.createLinearGradient(0, b.y0, 0, b.y1);
  g.addColorStop(0, "rgba(255,248,235,0.30)");
  g.addColorStop(0.45, "rgba(255,248,235,0)");
  g.addColorStop(1, "rgba(30,16,8,0.24)");
  ctx.fillStyle = g;
  ctx.fill();

  if (dash) ctx.setLineDash(dash);
  ctx.strokeStyle = outline ?? edgeOf(hex);
  ctx.lineWidth = 1.3;
  ctx.stroke();
  if (dash) ctx.setLineDash([]);
}
