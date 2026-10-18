// The drawing palette for both canvases: warm drafting paper, graphite ink and an ochre
// accent, plus the darkening used to edge the solid member colours.
export const PAPER = "#f4f1ec";
export const PLATE = "#ffffff";
export const INK = "#3f4a54";
export const INK_SOFT = "rgba(63,74,84,0.62)";
export const INK_FAINT = "rgba(63,74,84,0.32)";
export const GRID = "rgba(120,113,100,0.16)";
export const GROUND = "#e7e3db";
export const ACCENT = "#c2740a";
export const ACCENT_SOFT = "rgba(194,116,10,0.5)";
export const FIGURE = "#2e3843";
export const SHADOW = "58,49,36";

// The wash over the face that is being read, in the plan.
export const ACCENT_TINT = "rgba(194,116,10,0.11)";

// The "that face is taken" ink: the fold-back marker, the banner and the face block.
export const BLOCK = "#c03a4c";
export const BLOCK_RGB = "192,58,76";

// The lava climbing out of the floor: its surface, and the band under it that floods the
// ground before it reaches the stack.
export const LAVA = "#d1331d";
export const LAVA_FILL = "rgba(209,51,29,0.72)";
export const LAVA_DEEP = "rgba(88,14,7,0.95)";

// The dashed guide from the climber's feet (elevation) or along their column (plan).
export const CLIMBER_GUIDE = "rgba(46,56,67,0.4)";

// A "#rrggbb" colour with every channel scaled by k (clamped to 255) — for lighting a face.
export function scaleHex(hex, k) {
  const n = parseInt(hex.slice(1), 16);
  const r = Math.min(255, Math.round(((n >> 16) & 255) * k));
  const g = Math.min(255, Math.round(((n >> 8) & 255) * k));
  const b = Math.min(255, Math.round((n & 255) * k));
  return `rgb(${r},${g},${b})`;
}

// A darker edge of the same colour, for the outline of a filled member.
export function edgeOf(hex, k = 0.62) {
  return scaleHex(hex, k);
}