import RAPIER from "@dimforge/rapier3d-compat";
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { FLOOR, FLOOR_FIRST, FLOOR_GAP, FLOOR_STOREY, GROUND_HALF } from "./constants";
import { createEngine } from "./engine";

const DT = 1 / 60;
let engine;
let input;

beforeAll(async () => {
  await RAPIER.init();
});

beforeEach(() => {
  vi.spyOn(Math, "random").mockReturnValue(0.5);
  input = { left: false, right: false, jump: false };
  engine = createEngine(RAPIER, input);
  engine.start();
});

afterEach(() => {
  engine.free();
  vi.restoreAllMocks();
});

const run = (seconds) => {
  for (let t = 0; t < seconds; t += DT) engine.step(DT);
};
const floors = () => engine.members.filter((m) => m.floor);
const slabTop = (m) => m.body.translation().y + m.hy;

describe("floor slabs", () => {
  it("lets members dropped from above fall straight through until it is stood on", () => {
    engine.preview.x = 2;
    engine.drop();
    run(3);
    const placed = engine.members.filter((m) => !m.floor);
    for (const m of placed) expect(m.body.translation().y).toBeLessThan(FLOOR_FIRST);
  });

  it("spans the whole face it is hidden from, and shows its gap from the side", () => {
    const front = engine.viewFor("front").sil.find((s) => s.floor);
    const us = front.poly.map((p) => p[0]);
    expect(Math.min(...us)).toBeLessThan(-GROUND_HALF + 0.01);
    expect(Math.max(...us)).toBeGreaterThan(GROUND_HALF - 0.01); // wall to wall: a ceiling
    const side = engine.viewFor("left").sil.find((s) => s.floor);
    const su = side.poly.map((p) => p[0]);
    const span = Math.max(...su) - Math.min(...su);
    expect(span).toBeCloseTo(GROUND_HALF * 2 - FLOOR_GAP, 2); // the gap shows at one end
  });

  it("stops the climber jumping up through it from below", () => {
    const c = engine.character;
    const slab = floors()[0];
    c.x = 0;
    c.y = FLOOR_FIRST - c.hh - 0.05; // head just under the slab
    c.vy = 15;
    run(0.2);
    expect(c.y + c.hh).toBeLessThanOrEqual(slab.body.translation().y - slab.hy + 0.01);
  });

  it("turns solid when stood on, and lays the next storey higher", () => {
    const c = engine.character;
    const slab = floors()[0];
    c.x = 0;
    c.y = slabTop(slab) + c.hh + 0.01;
    c.vy = 0;
    run(0.1);
    expect(slab.floor.active).toBe(true);
    expect(slab.floor.collider).not.toBeNull();
    expect(engine.stats().floors).toBe(1);
    const next = floors().find((m) => !m.floor.active);
    expect(next.body.translation().y - next.hy).toBeCloseTo(slabTop(slab) + FLOOR_STOREY, 5);

    // and now members land on it instead of passing through
    engine.preview.x = 2;
    engine.drop();
    run(3);
    const landed = engine.members.filter((m) => !m.floor && m.body.translation().y > slabTop(slab));
    expect(landed.length).toBeGreaterThan(0);
    expect(FLOOR.h).toBeGreaterThan(0);
  });
});
