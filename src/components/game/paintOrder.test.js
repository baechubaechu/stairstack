import { describe, expect, it } from "vitest";
import { boxVertices } from "@/lib/game/elevation";
import { quatFromEuler } from "@/lib/game/world";
import { compareAbove, paintOrder, spanAt } from "./paintOrder";

// A box as the plan draws it: corners, top, and (for these tests) a screen rect that overlaps
// everything, so every pair is compared.
const box = (name, hx, hy, hz, t, euler = { x: 0, y: 0, z: 0 }) => {
  const verts = boxVertices(hx, hy, hz, t, quatFromEuler(euler.x, euler.y, euler.z));
  return { name, verts, top: Math.max(...verts.map((v) => v[1])), rect: { x0: 0, y0: 0, x1: 1, y1: 1 } };
};

describe("plan painting order", () => {
  it("finds the heights a box spans over a plan point", () => {
    const b = box("flat", 1, 0.25, 0.5, { x: 0, y: 1, z: 0 });
    const s = spanAt(b.verts, 0.3, 0.2);
    expect(s[0]).toBeCloseTo(0.75);
    expect(s[1]).toBeCloseTo(1.25);
    expect(spanAt(b.verts, 2, 0)).toBeNull();
  });

  it("paints a plank laid across a steeply leaning one after it, though the leaning one reaches higher", () => {
    // leaning at 60°, foot on the ground at x = -1, rising to about 2.2 m
    const leaning = box("leaning", 1.25, 0.125, 0.75, { x: -0.4, y: 1.1, z: 0 }, { x: 0, y: 0, z: Math.PI / 3 });
    // dropped later across its lower half, lying flat at 0.9 m
    const across = box("across", 1.25, 0.125, 0.75, { x: -1.3, y: 0.9, z: 0 });
    expect(across.top).toBeLessThan(leaning.top);
    expect(compareAbove(across, leaning)).toBeGreaterThan(0);
    const order = paintOrder([across, leaning]).map((b) => b.name);
    expect(order).toEqual(["leaning", "across"]);
  });

  it("orders a stack bottom to top whatever order the boxes come in", () => {
    const a = box("a", 1, 0.25, 1, { x: 0, y: 0.25, z: 0 });
    const b = box("b", 1, 0.25, 1, { x: 0.5, y: 0.75, z: 0 });
    const c = box("c", 1, 0.25, 1, { x: 0, y: 1.25, z: 0.3 });
    expect(paintOrder([c, a, b]).map((x) => x.name)).toEqual(["a", "b", "c"]);
  });
});
