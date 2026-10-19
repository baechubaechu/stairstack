// Refactoring guard: a scripted run must come out the same, body for body. Rapier is
// deterministic for the same sequence of calls, so any change here means behaviour changed. If
// a change is intended (tuning, new rules), review the diff and update with `npx vitest run -u`.
//
// It sits alone in its own file on purpose. Rapier's results also depend on what the wasm
// instance did before (worlds created and freed earlier in the same file nudge bodies by a
// millimetre), and Vitest gives each file a fresh instance — so this replays the same whether
// it is run on its own or with the whole suite.
import RAPIER from "@dimforge/rapier3d-compat";
import { beforeAll, expect, it, vi } from "vitest";
import { createEngine } from "./engine";

const DT = 1 / 60;

beforeAll(async () => {
  await RAPIER.init();
});

it("replays a scripted run identically", () => {
  // release() tilts each member by a hair of random; pin it so runs repeat exactly
  vi.spyOn(Math, "random").mockReturnValue(0.5);
  const input = { left: false, right: false, jump: false };
  const engine = createEngine(RAPIER, input);
  const run = (seconds) => {
    for (let t = 0; t < seconds; t += DT) engine.step(DT);
  };

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
    return [m.type.id, r(t.x), r(t.y), r(t.z), m.floor ? m.floor.active : null];
  });
  const s = engine.stats();
  expect({
    face: s.face,
    score: s.score,
    timeScore: s.timeScore,
    heightScore: s.heightScore,
    lava: r(s.lava),
    climber: [r(engine.character.x), r(engine.character.y)],
    bodies,
  }).toMatchSnapshot();

  engine.free();
  vi.restoreAllMocks();
});
