// The game ships @dimforge/rapier3d (a separate .wasm the browser streams); Node can't load that
// build, so tests use rapier3d-compat — the same Rapier version and wasm, packaged for Node.
import RAPIER from "@dimforge/rapier3d-compat";
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { LAVA_START } from "./constants";
import { createEngine } from "./engine";

const DT = 1 / 60;
let engine;
let input;

beforeAll(async () => {
  await RAPIER.init();
});

beforeEach(() => {
  // release() tilts each member by a hair of random; pin it so runs repeat exactly
  vi.spyOn(Math, "random").mockReturnValue(0.5);
  input = { left: false, right: false, jump: false };
  engine = createEngine(RAPIER, input);
});

afterEach(() => {
  engine.free();
  vi.restoreAllMocks();
});

function run(seconds) {
  for (let t = 0; t < seconds; t += DT) engine.step(DT);
}

describe("engine", () => {
  it("opens on the menu with the starter stack and one plate", () => {
    const s = engine.stats();
    expect(s.mode).toBe("menu");
    expect(s.members).toBe(5);
    expect(s.face).toBe("front");
    run(1);
    expect(engine.stats().time).toBe(0); // nothing runs before Game Start
  });

  it("scores, raises the lava and sinks members in once started", () => {
    engine.start();
    run(1);
    const s = engine.stats();
    expect(s.mode).toBe("play");
    expect(s.time).toBeCloseTo(1, 1);
    expect(s.score).toBeGreaterThanOrEqual(9);
    expect(s.lava).toBeGreaterThan(LAVA_START);
    run(4);
    expect(engine.stats().members).toBeGreaterThan(5); // the unattended member settled on its own
  });

  it("drops the member in play on demand", () => {
    engine.start();
    expect(engine.drop()).toBe(true);
    expect(engine.stats().members).toBe(6);
  });

  it("holds the whole run still while paused", () => {
    engine.start();
    run(0.5);
    engine.togglePause();
    const before = engine.stats();
    run(1);
    expect(engine.stats().time).toBe(before.time);
    expect(engine.stats().lava).toBe(before.lava);
  });

  it("turns to the next face when the climber walks out of an end", () => {
    engine.start();
    input.left = true;
    let turned = false;
    for (let t = 0; t < 3 && !turned; t += DT) {
      engine.step(DT);
      turned = engine.stats().face !== "front";
    }
    expect(engine.stats().face).toBe("left");
  });

  it("ends the run when the lava reaches the climber", () => {
    engine.start();
    run(40);
    const s = engine.stats();
    expect(s.over).toBe(true);
    expect(s.cause).toBe("lava");
  });

  it("restarts a fresh run", () => {
    engine.start();
    run(2);
    engine.drop();
    engine.restart();
    const s = engine.stats();
    expect(s.mode).toBe("play");
    expect(s.time).toBe(0);
    expect(s.members).toBe(5);
    expect(s.face).toBe("front");
  });

  // Refactoring guard: a scripted run must come out the same, body for body. Rapier is
  // deterministic, so any change here means behaviour changed. If a change is intended
  // (tuning, new rules), review it and update with `npx vitest run -u`.
  it("replays a scripted run identically", () => {
    engine.start();
    engine.preview.x = 1.5;
    engine.preview.z = -1;
    engine.preview.yaw = Math.PI / 6;
    run(1);
    engine.drop();
    input.right = true;
    run(1.5);
    input.right = false;
    input.jump = true;
    run(0.5);
    input.jump = false;
    run(3);
    const r = (v) => Math.round(v * 1000) / 1000;
    const bodies = engine.members.map((m) => {
      const t = m.body.translation();
      return [m.type.id, r(t.x), r(t.y), r(t.z), m.gate ? m.gate.dir : null];
    });
    const s = engine.stats();
    expect({
      face: s.face,
      score: s.score,
      lava: r(s.lava),
      climber: [r(engine.character.x), r(engine.character.y)],
      bodies,
    }).toMatchSnapshot();
  });
});
