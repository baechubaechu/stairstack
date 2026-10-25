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

// The tile's origin lands on the middle of the member it fills (see paintMember), so rows near
// the top and bottom of a tile sit just above and below a member's centre line.

// Plywood: thin sheets stacked flat — the laminations show as close lines along the bundle, with
// the grain of the top sheet faint across them and a lifting strap round it.
function plywood(c) {
  const r = rng(7);
  for (let y = 0; y < TILE; y += 3) {
    c.fillStyle = r() > 0.5 ? "rgba(120,70,20,0.16)" : "rgba(255,240,205,0.14)";
    c.fillRect(0, y, TILE, 1.5);
  }
  c.strokeStyle = "rgba(92,48,8,0.18)";
  c.lineWidth = 1;
  for (let i = 0; i < 4; i++) {
    const y0 = r() * TILE;
    c.beginPath();
    for (let x = 0; x <= TILE; x += 4) {
      const y = y0 + Math.sin((x / TILE) * Math.PI * 2 + i) * 1.5;
      if (x === 0) c.moveTo(x, y);
      else c.lineTo(x, y);
    }
    c.stroke();
  }
  c.fillStyle = "rgba(40,60,120,0.55)";
  c.fillRect(TILE * 0.7, 0, 4, TILE);
}

// Glass: pale panes stacked flat in their crate — faint lines between the sheets, and bright
// reflections slanting across.
function glass(c) {
  c.fillStyle = "rgba(255,255,255,0.10)";
  for (let y = 1; y < TILE; y += 4) c.fillRect(0, y, TILE, 1);
  for (const [x0, w, a] of [[8, 6, 0.38], [20, 2, 0.28], [44, 10, 0.3]]) {
    c.fillStyle = `rgba(255,255,255,${a})`;
    c.beginPath();
    c.moveTo(x0, TILE);
    c.lineTo(x0 + w, TILE);
    c.lineTo(x0 + w + TILE * 0.5, 0);
    c.lineTo(x0 + TILE * 0.5, 0);
    c.closePath();
    c.fill();
  }
  c.strokeStyle = "rgba(20,60,70,0.35)";
  c.lineWidth = 1;
  c.beginPath();
  c.moveTo(0, TILE / 2);
  c.lineTo(TILE, TILE / 2);
  c.stroke();
}

// Bricks: fired bricks in a running bond — mortar joints, and each brick a little lighter or
// darker than the next.
function bricks(c) {
  const r = rng(11);
  const rowH = 8;
  const brickW = 16;
  for (let row = 0; row < TILE / rowH; row++) {
    const off = row % 2 ? brickW / 2 : 0;
    for (let x = -off; x < TILE; x += brickW) {
      c.fillStyle = r() > 0.5 ? "rgba(255,210,180,0.10)" : "rgba(70,18,6,0.14)";
      c.fillRect(x + 1, row * rowH + 1, brickW - 2, rowH - 2);
    }
  }
  c.strokeStyle = "rgba(240,225,205,0.55)";
  c.lineWidth = 1;
  c.beginPath();
  for (let row = 0; row < TILE / rowH; row++) {
    const y = row * rowH + 0.5;
    c.moveTo(0, y);
    c.lineTo(TILE, y);
    const off = row % 2 ? brickW / 2 : 0;
    for (let x = off; x < TILE; x += brickW) {
      c.moveTo(x + 0.5, y);
      c.lineTo(x + 0.5, y + rowH);
    }
  }
  c.stroke();
}

// Steel pipes: a bundle of galvanised tubes lying side by side — each with a bright highlight
// and a shaded underside along its length — held by yellow straps.
function pipes(c) {
  const tube = 8;
  for (let y = 0; y < TILE; y += tube) {
    c.fillStyle = "rgba(255,255,255,0.32)";
    c.fillRect(0, y + 1.5, TILE, 1.5);
    c.fillStyle = "rgba(20,30,40,0.30)";
    c.fillRect(0, y + tube - 2, TILE, 2);
  }
  for (const x of [TILE * 0.2, TILE * 0.72]) {
    c.fillStyle = "rgba(240,190,40,0.85)";
    c.fillRect(x, 0, 4, TILE);
    c.fillStyle = "rgba(90,60,0,0.35)";
    c.fillRect(x + 3, 0, 1, TILE);
  }
}

// Structural steel: a mill-scale finish brushed along the beam, the lines where the flanges meet
// the web, and a bolt now and then.
function steel(c) {
  c.strokeStyle = "rgba(255,255,255,0.07)";
  c.lineWidth = 1;
  c.beginPath();
  for (let y = 1; y < TILE; y += 3) {
    c.moveTo(0, y);
    c.lineTo(TILE, y);
  }
  c.stroke();
  for (const y of [10, TILE - 10]) {
    c.fillStyle = "rgba(10,16,22,0.45)";
    c.fillRect(0, y, TILE, 1.5);
    c.fillStyle = "rgba(255,255,255,0.18)";
    c.fillRect(0, y + 1.5, TILE, 1);
  }
  for (const y of [TILE * 0.22, TILE * 0.78]) {
    for (let x = 8; x < TILE; x += 32) {
      c.fillStyle = "rgba(12,16,20,0.5)";
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

// Cement bags: plump paper sacks laid in rows, each with a printed band across its middle.
function cement(c) {
  const bagW = 21.33;
  const bagH = 10.67;
  for (let row = 0; row < TILE / bagH; row++) {
    const off = row % 2 ? bagW / 2 : 0;
    for (let x = -off; x < TILE; x += bagW) {
      const y = row * bagH;
      c.fillStyle = "rgba(255,250,235,0.16)";
      c.beginPath();
      c.roundRect(x + 1, y + 1, bagW - 2, bagH - 2, 3);
      c.fill();
      c.strokeStyle = "rgba(90,80,60,0.35)";
      c.lineWidth = 1;
      c.stroke();
      c.fillStyle = "rgba(60,90,140,0.35)";
      c.fillRect(x + bagW * 0.42, y + 2, bagW * 0.16, bagH - 4);
    }
  }
}

// Film-faced formwork: a smooth, resin-coated panel in its frame, with the holes for the ties.
function formwork(c) {
  c.fillStyle = "rgba(255,230,210,0.10)";
  c.fillRect(0, 0, TILE, TILE / 2);
  c.strokeStyle = "rgba(60,20,8,0.35)";
  c.lineWidth = 1.5;
  c.strokeRect(1, 1, TILE - 2, TILE - 2);
  for (const x of [TILE * 0.25, TILE * 0.75]) {
    for (const y of [TILE * 0.25, TILE * 0.75]) {
      c.fillStyle = "rgba(40,14,4,0.55)";
      c.beginPath();
      c.arc(x, y, 2, 0, Math.PI * 2);
      c.fill();
    }
  }
}

// Steel deck plate: a galvanised sheet folded into ribs along its length.
function deck(c) {
  const rib = 10.67;
  for (let y = 0; y < TILE; y += rib) {
    c.fillStyle = "rgba(255,255,255,0.28)";
    c.fillRect(0, y, TILE, 2);
    c.fillStyle = "rgba(15,25,35,0.28)";
    c.fillRect(0, y + rib / 2, TILE, 2);
  }
  c.fillStyle = "rgba(255,255,255,0.05)";
  for (let x = 0; x < TILE; x += 16) c.fillRect(x, 0, 1, TILE);
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

const PAINTERS = { plywood, glass, bricks, pipes, hbeam: steel, cement, stairs: concrete, lform: formwork, deck, basalt, floor: concrete };

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

// The pattern transform that lays a material flat on one face of a box seen in perspective: the
// face's corner `o` and its two edges `ea` (along the member's grain) and `eb` on screen, and
// how long those edges are in metres. The tile is skewed with the face, so its lines meet the
// face's edges the way they would on the real thing.
export function faceMatrix(o, ea, eb, lenA, lenB) {
  return new DOMMatrix([
    ea[0] / (lenA * REF_SCALE),
    ea[1] / (lenA * REF_SCALE),
    eb[0] / (lenB * REF_SCALE),
    eb[1] / (lenB * REF_SCALE),
    o[0],
    o[1],
  ]);
}

// Fill a member's polygon with its material. `screenAngle` is the grain direction in screen
// space (radians, clockwise-positive like the canvas), or `matrix` (see faceMatrix) places the
// texture outright; a member with no `type` (a plate) gets the shading but no texture.
export function paintMember(ctx, poly, X, Y, { type, hex, screenAngle = 0, scale, outline, dash, matrix }) {
  const b = bounds(poly, X, Y);
  tracePoly(ctx, poly, X, Y);
  ctx.fillStyle = hex;
  ctx.fill();

  const pattern = patternFor(ctx, type);
  if (pattern) {
    const k = scale / REF_SCALE;
    pattern.setTransform(
      matrix ??
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
