import RAPIER from "@dimforge/rapier3d-compat";
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { MEMBER_BY_ID } from "./constants";
import { memberVertices, quatToMat3 } from "./elevation";
import { createEngine } from "./engine";
import { forecastTip } from "./tipping";
import { addMember } from "./world";

const DT = 1 / 60;
let engine;
let g;
let input;

beforeAll(async () => {
  await RAPIER.init();
});

beforeEach(() => {
  vi.spyOn(Math, "random").mockReturnValue(0.5);
  input = { left: false, right: false, jump: false };
  engine = createEngine(RAPIER, input);
  engine.start();
  // a bench of our own: the starter stack cleared away, nothing in play
  for (const m of engine.members.filter((m) => !m.floor)) {
    engine.world.removeRigidBody(m.body);
    engine.members.splice(engine.members.indexOf(m), 1);
  }
  g = { RAPIER, world: engine.world, members: engine.members, character: engine.character, state: { face: "front" } };
});

afterEach(() => {
  engine.free();
  vi.restoreAllMocks();
});

const settle = (seconds) => {
  for (let t = 0; t < seconds; t += DT) {
    engine.character.y = 9; // out of the way
    engine.character.vy = 0;
    engine.preview.x = 5.25;
    engine.preview.z = 5.25;
    engine.step(DT);
  }
};
const ids = () => engine.members.filter((m) => !m.floor).map((m) => m.type.id);
const bottomOf = (m) => Math.min(...memberVertices(m).map((v) => v[1]));

describe("what a landing does to what it lands on", () => {
  it("breaks glass under a heavy member, which then drops to the ground", () => {
    addMember(g, MEMBER_BY_ID.glass, 0, 0.13, -2, { x: 0, y: 0, z: 0 });
    settle(0.5);
    const bricks = addMember(g, MEMBER_BY_ID.bricks, 0, 2, -2, { x: 0, y: 0, z: 0 });
    settle(2);
    expect(ids()).toEqual(["bricks"]);
    expect(bottomOf(bricks)).toBeLessThan(0.05);
    expect(engine.effects.some((e) => e.kind === "shatter")).toBe(true);
  });

  it("leaves glass whole under a light member", () => {
    addMember(g, MEMBER_BY_ID.glass, 0, 0.13, -2, { x: 0, y: 0, z: 0 });
    settle(0.5);
    addMember(g, MEMBER_BY_ID.plywood, 0, 2, -2, { x: 0, y: 0, z: 0 });
    settle(2);
    expect(ids().sort()).toEqual(["glass", "plywood"]);
  });

  it("bursts a pipe bundle open, low and wide, under a heavy member", () => {
    addMember(g, MEMBER_BY_ID.pipes, 0, 0.26, -2, { x: 0, y: 0, z: 0 });
    settle(0.5);
    const beam = addMember(g, MEMBER_BY_ID.hbeam, 0, 2.5, -2, { x: 0, y: 0, z: 0 });
    settle(2);
    expect(ids().sort()).toEqual(["hbeam", "pipesFlat"]);
    const flat = engine.members.find((m) => m.type.id === "pipesFlat");
    const top = Math.max(...memberVertices(flat).map((v) => v[1]));
    expect(top).toBeCloseTo(0.25, 1);
    // the beam came down onto the flattened pipes
    expect(bottomOf(beam)).toBeCloseTo(0.25, 1);
  });

  it("never tips cement bags, even hanging well off an edge", () => {
    addMember(g, MEMBER_BY_ID.bricks, 0, 0.5, 0, { x: 0, y: 0, z: 0 }); // edge at x = 0.75
    settle(1);
    const p = { type: MEMBER_BY_ID.cement, x: 1.25, z: 0, y: 1.6, yaw: 0 };
    expect(forecastTip(g, p)).toBeNull();
    const bags = addMember(g, MEMBER_BY_ID.cement, 1.25, 1.6, 0, { x: 0, y: 0, z: 0 });
    settle(3);
    expect(quatToMat3(bags.body.rotation())[4]).toBeGreaterThan(0.999);
  });
});

describe("standing on glass", () => {
  // Run the climber right along a long flat member, let go, and see how far they slide.
  const slide = (type) => {
    addMember(g, type, 0, 0.13, -2, { x: 0, y: 0, z: 0 });
    settle(0.3);
    const c = engine.character;
    c.x = -1.5;
    c.y = 0.25 + c.hh + 0.02;
    c.vx = 0;
    c.vy = 0;
    input.right = true;
    for (let i = 0; i < 20; i++) engine.step(DT);
    input.right = false;
    const from = c.x;
    for (let i = 0; i < 40; i++) engine.step(DT);
    return c.x - from;
  };

  it("slides the climber further before they stop than on firm ground", () => {
    const onDeck = slide(MEMBER_BY_ID.deck);
    engine.free();
    input = { left: false, right: false, jump: false };
    engine = createEngine(RAPIER, input);
    engine.start();
    for (const m of engine.members.filter((m) => !m.floor)) {
      engine.world.removeRigidBody(m.body);
      engine.members.splice(engine.members.indexOf(m), 1);
    }
    g = { RAPIER, world: engine.world, members: engine.members, character: engine.character, state: { face: "front" } };
    const onGlass = slide(MEMBER_BY_ID.glass);
    expect(onGlass).toBeGreaterThan(onDeck * 2);
  });
});
