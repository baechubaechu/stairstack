import { describe, expect, it } from "vitest";
import { charStep, createCharacter } from "./climber";
import { CHAR_STEP, COYOTE_TIME, JUMP_BUFFER, MOVE_SPEED, STEP_UP } from "./constants";
import { expandForBox } from "./hull";

// A bare climber on a synthetic floor that ends in a ledge at x = 0 — no physics world needed,
// since the climber only ever collides with the expanded polygons in g.views.
function setup() {
  const character = createCharacter();
  const floor = [
    [-6, -1.2],
    [0, -1.2],
    [0, 0],
    [-6, 0],
  ];
  const g = {
    character,
    input: { left: false, right: false, jump: false },
    state: { face: "front", edgeHold: 0, blockedDir: 0 },
    views: { expanded: [expandForBox(floor, character.hw, character.hh)] },
  };
  character.x = -3;
  character.y = character.hh;
  return g;
}

function steps(g, seconds, each) {
  for (let t = 0; t < seconds - 1e-9; t += CHAR_STEP) {
    each?.();
    charStep(g, CHAR_STEP);
  }
}

describe("climber controls", () => {
  it("jumps on a fresh press, and holding the key doesn't bounce", () => {
    const g = setup();
    steps(g, 0.1); // settle on the floor
    g.input.jump = true;
    steps(g, CHAR_STEP);
    expect(g.character.vy).toBeGreaterThan(0);
    steps(g, 2); // still holding: lands and stays down
    expect(g.character.grounded).toBe(true);
    expect(g.character.vy).toBeLessThanOrEqual(0);
  });

  it("still jumps just after running off a ledge (coyote time)", () => {
    const g = setup();
    g.character.x = -0.3;
    steps(g, 0.05);
    g.input.right = true;
    // run until the feet have left the ledge
    let guard = 0;
    while (g.character.grounded && guard++ < 200) steps(g, CHAR_STEP);
    steps(g, COYOTE_TIME * 0.6);
    g.input.jump = true;
    steps(g, CHAR_STEP);
    expect(g.character.vy).toBeGreaterThan(5);
  });

  it("does not jump once the coyote window has passed", () => {
    const g = setup();
    g.character.x = -0.3;
    steps(g, 0.05);
    g.input.right = true;
    let guard = 0;
    while (g.character.grounded && guard++ < 200) steps(g, CHAR_STEP);
    steps(g, COYOTE_TIME * 2);
    g.input.jump = true;
    steps(g, CHAR_STEP);
    expect(g.character.vy).toBeLessThan(0);
  });

  it("fires a jump pressed just before landing (jump buffer)", () => {
    const g = setup();
    g.character.y = 1.2; // dropping onto the floor, long since off any edge
    g.character.vy = -6;
    g.character.airTime = 1;
    // fall until landing is less than the buffer away, then press
    while ((g.character.y - g.character.hh) / Math.abs(g.character.vy) > JUMP_BUFFER * 0.6) charStep(g, CHAR_STEP);
    g.input.jump = true;
    charStep(g, CHAR_STEP);
    expect(g.character.vy).toBeLessThan(0); // pressed in mid-air: nothing yet
    let jumped = false;
    for (let t = 0; t < JUMP_BUFFER && !jumped; t += CHAR_STEP) {
      charStep(g, CHAR_STEP);
      jumped = g.character.vy > 5;
    }
    expect(jumped).toBe(true); // ...and it fires on touching down
  });

  it("hops lower on a tap than on a held jump", () => {
    const peak = (holdFor) => {
      const g = setup();
      steps(g, 0.1);
      let top = g.character.y;
      let t = 0;
      g.input.jump = true;
      while (t < 1.2) {
        if (t >= holdFor) g.input.jump = false;
        charStep(g, CHAR_STEP);
        t += CHAR_STEP;
        top = Math.max(top, g.character.y);
      }
      return top;
    };
    expect(peak(0.05)).toBeLessThan(peak(1) - 0.5);
  });

  // A floor with a ledge of the given height standing on it at x in [0, 5].
  function ledge(height) {
    const g = setup();
    const box = [
      [0, -1.2],
      [5, -1.2],
      [5, height],
      [0, height],
    ];
    g.views.expanded.push(expandForBox(box, g.character.hw, g.character.hh));
    g.character.x = -1;
    steps(g, 0.05);
    g.input.right = true;
    steps(g, 0.6);
    return g.character;
  }

  it("walks up onto a low ledge without jumping (step-up)", () => {
    const c = ledge(STEP_UP - 0.05); // a slab lying flat
    expect(c.x).toBeGreaterThan(0.3);
    expect(c.y - c.hh).toBeCloseTo(STEP_UP - 0.05, 2);
  });

  it("is still stopped by a ledge taller than a step", () => {
    const c = ledge(STEP_UP + 0.2);
    expect(c.x).toBeLessThan(0);
    expect(c.y - c.hh).toBeCloseTo(0, 2);
  });

  it("ramps up to running speed instead of snapping to it", () => {
    const g = setup();
    steps(g, 0.1);
    g.input.right = true;
    steps(g, CHAR_STEP);
    expect(g.character.vx).toBeGreaterThan(0);
    expect(g.character.vx).toBeLessThan(MOVE_SPEED);
    steps(g, 0.3);
    expect(g.character.vx).toBeCloseTo(MOVE_SPEED, 5);
  });
});
