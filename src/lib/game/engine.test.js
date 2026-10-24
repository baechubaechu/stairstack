// The game ships @dimforge/rapier3d (a separate .wasm the browser streams); Node can't load that
// build, so tests use rapier3d-compat — the same Rapier version and wasm, packaged for Node.
import RAPIER from "@dimforge/rapier3d-compat";
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { BURY_DEPTH, DROP_Y, LAVA_START, VIEW_FOLLOW } from "./constants";
import { createEngine } from "./engine";

const DT = 1 / 60;
let engine;
let input;

beforeAll(async () => {
  await RAPIER.init();
});

beforeEach(() => {
  // the engine draws no randomness now (members drop square), but pin it so runs repeat exactly regardless
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
  it("opens on the menu with the starter stack and the first floor slab above it", () => {
    const s = engine.stats();
    expect(s.mode).toBe("menu");
    expect(s.members).toBe(4); // floor slabs aren't counted as placed members
    expect(engine.members.filter((m) => m.floor)).toHaveLength(1);
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
    expect(s.lava).toBe(LAVA_START); // the opening grace: it hasn't moved yet
    run(4);
    expect(engine.stats().members).toBeGreaterThan(4); // the unattended member settled on its own
    run(2);
    expect(engine.stats().lava).toBeGreaterThan(LAVA_START); // past LAVA_DELAY it rises
  });

  it("scores height only for ground the climber stands on", () => {
    engine.start();
    run(0.5);
    input.jump = true; // a jump on the spot
    run(0.3);
    input.jump = false;
    run(1.5); // back down on the floor
    const s = engine.stats();
    expect(s.heightScore).toBeLessThan(10); // the jump's apex earned nothing
    expect(s.score).toBe(s.timeScore + s.heightScore);
  });

  it("drops the member in play on demand", () => {
    engine.start();
    expect(engine.drop()).toBe(true);
    expect(engine.stats().members).toBe(5);
  });

  it("only counts player drops as manual, and resets them on restart", () => {
    engine.start();
    run(5);
    expect(engine.stats().dropped).toBeGreaterThan(0);
    expect(engine.stats().manualDrops).toBe(0);
    expect(engine.drop()).toBe(true);
    expect(engine.stats().manualDrops).toBe(1);
    engine.restart();
    expect(engine.stats().manualDrops).toBe(0);
  });

  it("holds the tutorial block until a click, then permits automatic drops again", () => {
    engine.start();
    engine.holdLava(true);
    engine.holdAutoDrop(true);
    const y = engine.placement().y;
    run(8);
    expect(engine.stats().dropped).toBe(0);
    expect(engine.placement().y).toBe(y);
    expect(engine.drop()).toBe(true);
    expect(engine.stats().manualDrops).toBe(1);
    engine.holdAutoDrop(false);
    run(5);
    expect(engine.stats().dropped).toBeGreaterThan(1);
    expect(engine.stats().manualDrops).toBe(1);
  });

  it("rejects a drop while paused without changing the run", () => {
    engine.start();
    engine.togglePause();
    const before = engine.stats();
    expect(engine.drop()).toBe(false);
    run(1);
    expect(engine.stats()).toEqual(before);
  });

  it("snaps the member in play to the grid, square, and inside the plate", () => {
    engine.start(); // the first member is a slab, 2.5 × 1.5 — five cells by three
    engine.preview.x = 1.13;
    engine.preview.z = -0.4;
    engine.preview.yaw = 0.6; // nearer no turn than a quarter turn
    let p = engine.placement();
    expect([p.x, p.z, p.yaw]).toEqual([1.25, -0.25, 0]); // odd cell counts centre on a cell
    engine.preview.x = 99;
    expect(engine.placement().x).toBe(4.75); // its far edge stops on the curb
    engine.preview.yaw = Math.PI / 2; // a quarter turn: now 1.5 across, 2.5 deep
    p = engine.placement();
    expect(p.x).toBe(5.25);
    expect(p.yaw).toBeCloseTo(Math.PI / 2, 9);
  });

  it("releases members from higher up once the climber has climbed", () => {
    engine.start();
    expect(engine.placement().y).toBeCloseTo(DROP_Y, 5); // a low climber: the usual height
    engine.character.y = 9; // feet well above VIEW_FOLLOW
    engine.drop(); // the next member is queued from where the climber is now
    const rise = 9 - engine.character.hh - VIEW_FOLLOW;
    expect(engine.placement().y).toBeCloseTo(DROP_Y + rise, 5);
  });

  it("keeps the lava still while it is held, and lets it rise once released", () => {
    engine.start();
    engine.holdLava(true);
    run(12); // well past LAVA_DELAY
    expect(engine.stats().lava).toBe(LAVA_START);
    expect(engine.stats().elapsed).toBeGreaterThan(11); // the world itself carries on
    engine.holdLava(false);
    run(4);
    expect(engine.stats().lava).toBe(LAVA_START); // the opening grace starts from the release
    run(3);
    expect(engine.stats().lava).toBeGreaterThan(LAVA_START);
  });

  it("scores nothing while the run is held — waiting in the guide earns no points", () => {
    engine.start();
    engine.holdLava(true);
    engine.character.y = 3 + engine.character.hh; // as if stood on something high
    run(60);
    const held = engine.stats();
    expect(held.time).toBe(0);
    expect(held.timeScore).toBe(0);
    expect(held.score).toBe(0);
    expect(held.elapsed).toBeGreaterThan(59);
    engine.holdLava(false);
    run(2);
    expect(engine.stats().time).toBeCloseTo(2, 1); // the counted time starts at the release
    expect(engine.stats().timeScore).toBeGreaterThan(0);
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
    engine.preview.x = 4; // stack the members well away from the climber's column
    run(60);
    const s = engine.stats();
    expect(s.over).toBe(true);
    expect(s.cause).toBe("lava");
  });

  // Keep the climber hovering high above the stack so the lava can climb without ending the run.
  function runHovering(seconds) {
    for (let t = 0; t < seconds; t += DT) {
      engine.character.y = 9;
      engine.character.vy = 0;
      engine.step(DT);
    }
  }

  it("sets swallowed members into fixed basalt instead of removing them", () => {
    engine.start();
    engine.preview.x = 4;
    runHovering(45); // the lava is well over the starter slabs by now
    const stones = engine.members.filter((m) => m.stone);
    expect(engine.mode).toBe("play");
    expect(stones.length).toBeGreaterThan(0);
    for (const m of stones) {
      expect(m.body.isFixed()).toBe(true);
      expect(m.stone.top).toBeLessThan(engine.lava);
    }
  });

  it("clears basalt buried deep under the lava and out of view", () => {
    engine.start();
    engine.preview.x = 4;
    runHovering(80);
    expect(engine.mode).toBe("play");
    // whatever basalt is left sits no deeper than BURY_DEPTH under the surface
    for (const m of engine.members) if (m.stone) expect(m.stone.top).toBeGreaterThan(engine.lava - BURY_DEPTH - 0.05);
    // and the starter stack, long since buried, is gone
    expect(engine.members.some((m) => m.stone && m.stone.top < 0.5)).toBe(false);
  });

  it("restarts a fresh run", () => {
    engine.start();
    run(2);
    engine.drop();
    engine.restart();
    const s = engine.stats();
    expect(s.mode).toBe("play");
    expect(s.time).toBe(0);
    expect(s.members).toBe(4);
    expect(s.face).toBe("front");
  });
});
// The scripted-run snapshot lives in replay.test.js, in a file of its own: see why there.
