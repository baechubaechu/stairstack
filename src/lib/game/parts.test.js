import RAPIER from "@dimforge/rapier3d-compat";
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { FACES } from "./constants";
import { memberVertices } from "./elevation";
import { createEngine } from "./engine";
import { project } from "./views";
import { addMember } from "./world";

const DT = 1 / 60;
let engine;
let g;

// A member made of several boxes: an H beam lying along x — top and bottom flanges, and the
// web between them.
const HBEAM = {
  id: "test-hbeam",
  w: 4.0,
  h: 0.5,
  d: 0.5,
  color: 0x888888,
  hex: "#888888",
  material: "standard",
  parts: [
    { x: 0, y: 0.1875, z: 0, hx: 2.0, hy: 0.0625, hz: 0.25 },
    { x: 0, y: 0, z: 0, hx: 2.0, hy: 0.125, hz: 0.0625 },
    { x: 0, y: -0.1875, z: 0, hx: 2.0, hy: 0.0625, hz: 0.25 },
  ],
};

beforeAll(async () => {
  await RAPIER.init();
});

beforeEach(() => {
  vi.spyOn(Math, "random").mockReturnValue(0.5);
  engine = createEngine(RAPIER, { left: false, right: false, jump: false });
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

describe("members made of several boxes", () => {
  it("gives each part a collider and comes to rest on the ground", () => {
    const m = addMember(g, HBEAM, 0, 2, -2, { x: 0, y: 0, z: 0 });
    expect(m.colliders).toHaveLength(3);
    settle(2);
    const bottom = Math.min(...memberVertices(m).map((v) => v[1]));
    expect(bottom).toBeGreaterThan(-0.02);
    expect(bottom).toBeLessThan(0.05);
  });

  it("keeps its notches in the elevation: seen end on, an H is three pieces", () => {
    addMember(g, HBEAM, 0, 2, -2, { x: 0, y: 0, z: 0 });
    settle(2);
    const endOn = Object.keys(FACES).find((id) => FACES[id].axis === "z");
    const alongside = Object.keys(FACES).find((id) => FACES[id].axis === "x");
    const pieces = (faceId) => project(g, faceId).filter((s) => s.type === HBEAM.id);
    expect(pieces(endOn)).toHaveLength(3);
    // from the side the three line up into one rectangle's worth of pieces, still one per part
    expect(pieces(alongside)).toHaveLength(3);
    // the web is narrower than the flanges across the end-on view
    const width = (poly) => Math.max(...poly.map((p) => p[0])) - Math.min(...poly.map((p) => p[0]));
    const widths = pieces(endOn).map((s) => width(s.poly)).sort((a, b) => a - b);
    expect(widths[0]).toBeCloseTo(0.125, 2);
    expect(widths[2]).toBeCloseTo(0.5, 2);
  });
});
