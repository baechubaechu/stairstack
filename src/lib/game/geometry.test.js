import { describe, expect, it } from "vitest";
import { FACES, FALL_MAX, LAVA_START, SCORE_PER_SECOND } from "./constants";
import { boxVertices, faceU } from "./elevation";
import { convexHull, expandForBox, penetration, signedArea } from "./hull";
import { advanceRun, resetRun, sinkFactor } from "./survival";

const IDENTITY = { x: 0, y: 0, z: 0, w: 1 };

describe("hull", () => {
  it("builds a counter-clockwise hull and drops interior points", () => {
    const hull = convexHull([[0, 0], [2, 0], [2, 2], [0, 2], [1, 1]]);
    expect(hull).toHaveLength(4);
    expect(signedArea(hull)).toBeCloseTo(4);
  });

  it("pushes a point out through the nearest edge", () => {
    const square = convexHull([[0, 0], [2, 0], [2, 2], [0, 2]]);
    const pen = penetration(square, 1, 1.9);
    expect(pen.ny).toBeCloseTo(1);
    expect(pen.dist).toBeCloseTo(0.1);
    expect(penetration(square, 3, 1)).toBeNull();
  });

  it("grows a polygon by the climber's half extents", () => {
    const grown = expandForBox(convexHull([[0, 0], [2, 0], [2, 2], [0, 2]]), 0.5, 0.25);
    expect(signedArea(grown)).toBeCloseTo(3 * 2.5);
  });
});

describe("elevation", () => {
  it("places an unrotated box's corners at its half extents", () => {
    const v = boxVertices(1, 2, 3, { x: 10, y: 0, z: 0 }, IDENTITY);
    const xs = v.map((p) => p[0]);
    const ys = v.map((p) => p[1]);
    expect(Math.min(...xs)).toBeCloseTo(9);
    expect(Math.max(...ys)).toBeCloseTo(2);
  });

  it("reads each face along its own axis and direction", () => {
    const p = [1, 0, 2];
    expect(faceU(FACES.front, p)).toBe(1);
    expect(faceU(FACES.back, p)).toBe(-1);
    expect(faceU(FACES.right, p)).toBe(-2);
    expect(faceU(FACES.left, p)).toBe(2);
  });
});

describe("survival", () => {
  it("scores time survived and raises the lava", () => {
    const s = {};
    resetRun(s);
    expect(s.lava).toBe(LAVA_START);
    for (let i = 0; i < 100; i++) advanceRun(s, 0.01);
    expect(s.score).toBe(SCORE_PER_SECOND - 0); // one second in
    expect(s.lava).toBeGreaterThan(LAVA_START);
  });

  it("caps how much faster members sink", () => {
    expect(sinkFactor(0)).toBe(1);
    expect(sinkFactor(1e6)).toBe(FALL_MAX);
  });
});
