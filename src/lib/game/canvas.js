// 2D canvas helpers shared by every view that draws the world.

export const MONO = "ui-monospace, SFMono-Regular, Menlo, monospace";

// A closed path through a polygon given in world units, mapped to the screen by X / Y.
export function tracePoly(ctx, poly, X, Y) {
  ctx.beginPath();
  ctx.moveTo(X(poly[0][0]), Y(poly[0][1]));
  for (let i = 1; i < poly.length; i++) ctx.lineTo(X(poly[i][0]), Y(poly[i][1]));
  ctx.closePath();
}

export function roundRect(ctx, x, y, w, h, r) {
  const rr = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
}

// Match a canvas's backing store to its laid-out size (capped at 2× pixel density) and
// report the CSS-pixel size it is drawn at.
export function fitCanvas(canvas) {
  const rect = canvas.getBoundingClientRect();
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const w = Math.max(2, Math.round(rect.width));
  const h = Math.max(2, Math.round(rect.height));
  if (canvas.width !== Math.round(w * dpr)) canvas.width = Math.round(w * dpr);
  if (canvas.height !== Math.round(h * dpr)) canvas.height = Math.round(h * dpr);
  return { dpr, w, h };
}
