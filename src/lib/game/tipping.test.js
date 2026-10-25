import RAPIER from "@dimforge/rapier3d-compat";
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { GROUND_HALF, MEMBER_BY_ID } from "./constants";
import { createEngine } from "./engine";
import { overhang, tipAxis } from "./tipping";
import { addMember } from "./world";

const DT = 1 / 60;
let engine;
let g;

beforeAll(async () => {
  await RAPIER.init();
});

beforeEach(() => {
  vi.spyOn(Math, "random").mockReturnValue(0.5);
  engine = createEngine(RAPIER, { left: false, right: false, jump: false });
  engine.start();
  // a test bench of our own: everything but the floor slab cleared away, nothing in play
  g = { RAPIER, world: engine.world, members: engine.members, character: engine.character, state: { face: "front" } };
  for (const m of engine.members.filter((m) => !m.floor)) {
    engine.world.removeRigidBody(m.body);
    engine.members.splice(engine.members.indexOf(m), 1);
  }
});

afterEach(() => {
  engine.free();
  vi.restoreAllMocks();
});

const settleFor = (seconds) => {
  const placed = engine.members.filter((m) => !m.floor);
  const before = engine.stats().members;
  for (let t = 0; t < seconds; t += DT) {
    engine.character.y = 9; // out of the way, above it all
    engine.character.vy = 0;
    engine.preview.x = 5.25; // the member in play hangs over a far corner
    engine.preview.z = 5.25;
    engine.step(DT);
  }
  return { placed, dropped: engine.stats().members - before };
};
// how far a member has turned about each world axis, read off its rotation matrix
const tilt = (m) => {
  const { x, y, z, w } = m.body.rotation();
  return {
    aboutX: Math.atan2(2 * (w * x + y * z), 1 - 2 * (x * x + y * y)),
    aboutZ: Math.atan2(2 * (w * z + x * y), 1 - 2 * (y * y + z * z)),
    yaw: Math.atan2(2 * (w * y + x * z), 1 - 2 * (y * y + x * x)),
  };
};

describe("the overhang rule", () => {
  it("is nothing over the support, and points out of it otherwise", () => {
    const square = [[0, 0], [1, 0], [1, 1], [0, 1]];
    expect(overhang(square, [0.5, 0.5])).toBeNull();
    expect(overhang(square, [1.5, 0.5])).toEqual([0.5, 0]);
    expect(overhang([[0, 0], [0, 1]], [0.3, 0.5])).toEqual([0.3, 0]); // an edge: off it sideways
  });

  it("settles a dead diagonal along the member's long side, and a square one along x", () => {
    const flat = { body: { rotation: () => ({ x: 0, y: 0, z: 0, w: 1 }) } };
    expect(tipAxis([0.25, 0.25], { ...flat, hx: 1.75, hz: 0.5 })).toBe("x");
    expect(tipAxis([0.25, 0.25], { ...flat, hx: 0.5, hz: 1.75 })).toBe("z");
    expect(tipAxis([0.25, 0.25], { ...flat, hx: 0.75, hz: 0.75 })).toBe("x");
    expect(tipAxis([0.4, 0.1], { ...flat, hx: 0.5, hz: 1.75 })).toBe("x"); // not a diagonal
  });
});

describe("members on the grid", () => {
  it("stays level and still over its support", () => {
    const slab = addMember(g, MEMBER_BY_ID.plywood, -0.75, 0.3, -0.75, { x: 0, y: 0, z: 0 });
    settleFor(1.5);
    const t = slab.body.translation();
    expect([t.x, t.z]).toEqual([-0.75, -0.75]);
    expect(Math.abs(tilt(slab).aboutX) + Math.abs(tilt(slab).aboutZ)).toBeLessThan(1e-3);
  });

  it("tips a plank hanging off a block's edge along its length only, without twisting", () => {
    addMember(g, MEMBER_BY_ID.bricks, -1.25, 0.6, 0.25, { x: 0, y: 0, z: 0 });
    settleFor(1);
    // the plank's centre sits a metre past the block's +x edge, and half a cell past its +z edge
    const plank = addMember(g, MEMBER_BY_ID.glass, 0.5, 1.6, 1.0, { x: 0, y: 0, z: 0 });
    settleFor(2);
    expect(plank.tip.axis).toBe("x");
    const r = tilt(plank);
    expect(Math.abs(r.aboutZ)).toBeGreaterThan(0.1); // down at the far end
    expect(Math.abs(r.aboutX)).toBeLessThan(1e-3); // never rolled sideways
    expect(Math.abs(r.yaw)).toBeLessThan(1e-3); // never twisted
    expect(plank.body.translation().z).toBe(1.0); // nor shifted sideways
  });

  it("tips a block landing on a tilted plank to lie along the slope", () => {
    addMember(g, MEMBER_BY_ID.bricks, -1.25, 0.6, 0.25, { x: 0, y: 0, z: 0 });
    settleFor(1);
    const plank = addMember(g, MEMBER_BY_ID.glass, 0.5, 1.6, 0.0, { x: 0, y: 0, z: 0 });
    settleFor(2);
    const slope = tilt(plank).aboutZ;
    const block = addMember(g, MEMBER_BY_ID.bricks, 0.75, 3.5, 0.0, { x: 0, y: 0, z: 0 });
    settleFor(2);
    expect(Math.abs(tilt(block).aboutZ)).toBeGreaterThan(0.05); // it tipped, along x
    expect(Math.abs(tilt(block).aboutX)).toBeLessThan(1e-3);
    expect(Math.sign(tilt(block).aboutZ)).toBe(Math.sign(slope)); // leaning the way the plank does
  });

  it("never slides a member off down a slope", () => {
    addMember(g, MEMBER_BY_ID.bricks, -1.25, 0.6, 0.25, { x: 0, y: 0, z: 0 });
    settleFor(1);
    addMember(g, MEMBER_BY_ID.glass, 0.5, 1.6, 0.0, { x: 0, y: 0, z: 0 });
    settleFor(2);
    // dropped from high up, right at the low end of the slope
    const block = addMember(g, MEMBER_BY_ID.bricks, 1.5, 5, 0.0, { x: 0, y: 0, z: 0 });
    settleFor(3);
    // a pivot or two over edges moves it a little, never a slide away
    expect(Math.abs(block.body.translation().x - 1.5)).toBeLessThan(0.75);
  });

  it("forecasts the tip before the drop, and the drop then tips that way", () => {
    addMember(g, MEMBER_BY_ID.bricks, -1.25, 0.6, 0.25, { x: 0, y: 0, z: 0 });
    settleFor(1);
    // the member in play is a slab, 2.5 × 1.5: over the block it lands level...
    engine.preview.x = -1.25;
    engine.preview.z = 0.25;
    engine.preview.yaw = 0;
    expect(engine.tipForecast()).toBeNull();
    // ...a metre and a half further on it hangs off the block's +x edge
    engine.preview.x = 0.25;
    expect(engine.tipForecast()).toEqual({ axis: "x", sign: 1 });
    engine.drop();
    const slab = engine.members[engine.members.length - 1];
    settleFor(2);
    expect(slab.tip.axis).toBe("x");
    expect(tilt(slab).aboutZ).toBeLessThan(-0.05); // its +x end has gone down
  });

  it("never flings members when they are dropped thick and fast onto one another", () => {
    // a member every quarter second, over a scatter of overlapping spots, both ways round
    for (let i = 0; i < 80 && engine.mode === "play"; i++) {
      engine.preview.x = ((i * 2.3) % 7) - 1.5;
      engine.preview.z = ((i * 1.7) % 9) - 4.5;
      engine.preview.yaw = (i % 2) * (Math.PI / 2);
      engine.drop();
      for (let j = 0; j < 15; j++) {
        engine.character.x = -5.6; // out at the edge, clear of the drops
        engine.step(DT);
      }
    }
    const placed = engine.members.filter((m) => !m.floor && !m.stone);
    for (const m of placed) {
      const t = m.body.translation();
      expect(Math.abs(t.x)).toBeLessThan(GROUND_HALF + 0.5);
      expect(Math.abs(t.z)).toBeLessThan(GROUND_HALF + 0.5);
      expect(t.y).toBeLessThan(40); // no member shot into the sky
    }
  });

  it("never lets a member dropped from high up fall through a thin one", () => {
    const plank = addMember(g, MEMBER_BY_ID.glass, 0.25, 0.13, 0, { x: 0, y: 0, z: 0 });
    settleFor(0.5);
    const slab = addMember(g, MEMBER_BY_ID.plywood, 0.25, 30, 0, { x: 0, y: 0, z: 0 }); // ~23 m/s by the time it arrives
    settleFor(3);
    const plankTop = plank.body.translation().y + plank.hy;
    expect(slab.body.translation().y - slab.hy).toBeGreaterThan(plankTop - 0.05);
  });
});

