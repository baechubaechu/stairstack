// The climber. They are deliberately NOT in the physics world: they walk straight through a
// stack without shifting a single member. A member coming down on their head is judged by our
// own geometry (headStrike), and the climb by a sweep against the expanded silhouettes.
import { CHAR_GRAVITY, CHARACTER, EDGE_DWELL, EDGE_LINE, FACES, JUMP_V, MOVE_SPEED, SPAWN } from "./constants";
import { isFreshGate } from "./gates";
import { penetration } from "./hull";
import { beginTurn } from "./turn";
import { extent } from "./world";

const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);

// Contacts thinner than this are separation tolerance, not a push-out.
const SEPARATION = 0.0005;

// A member grazing the column edge is beside the climber, not over it.
const COLUMN_GRACE = 0.03;

export function createCharacter() {
  // `x` is the screen-x (u) of the climber on the face being read — the elevation draws them
  // straight from it, whichever side of the tower that is.
  return { x: SPAWN.x, y: SPAWN.y, vx: 0, vy: 0, grounded: false, hw: CHARACTER.w / 2, hh: CHARACTER.h / 2 };
}

export function respawn(character) {
  character.x = SPAWN.x;
  character.y = SPAWN.y;
  character.vx = 0;
  character.vy = 0;
}

// A member that descends through the climber's head plane while over its column ends the run.
// Only a member genuinely coming down can kill: the climber is live the whole time, so jumping
// into a resting member above — and shoving it upwards — is safe.
export function headStrike(g) {
  const { character } = g;
  const headTop = character.y + character.hh;
  for (const m of g.members) {
    if (isFreshGate(m) || m.stone) continue; // basalt is fixed: it can't come down on anyone
    const e = extent(g, m);
    const prev = m.bottom ?? e.bottom;
    m.bottom = e.bottom;
    if (prev < headTop || e.bottom > headTop) continue; // no crossing through the head plane this frame
    if (e.maxU < character.x - character.hw + COLUMN_GRACE || e.minU > character.x + character.hw - COLUMN_GRACE) {
      continue; // beside the climber, not over it
    }
    if (m.body.linvel().y > -1.2) continue; // resting on the head, or shoved up by a jump — not falling onto it
    return true;
  }
  return false;
}

// Sweep the character's centre against the expanded silhouettes: the earliest contact wins
// and the remainder of the motion slides along that surface.
function resolveContact(g) {
  const { character } = g;
  // Resolution is bounded and tolerance-based: a surface the character merely rests on
  // (zero separation) must never mask a real contact from another member.
  for (let iter = 0; iter < 4; iter++) {
    let best = null;
    for (const poly of g.views.expanded) {
      const pen = penetration(poly, character.x, character.y);
      if (!pen || pen.dist < SEPARATION) continue;
      if (!best || pen.dist < best.dist) best = pen;
    }
    if (!best) break;
    character.x += best.nx * best.dist;
    character.y += best.ny * best.dist;
    const vn = character.vx * best.nx + character.vy * best.ny;
    if (vn < 0) {
      character.vx -= vn * best.nx;
      character.vy -= vn * best.ny;
    }
    if (best.ny > 0.5) character.grounded = true;
  }
}

// One fixed climber step: input, gravity, the collision sweep, and walking out of an end.
export function charStep(g, h) {
  const { character, input, state } = g;
  let dir = 0;
  if (input.left) dir -= 1;
  if (input.right) dir += 1;
  if (input.jump && character.grounded) {
    character.vy = JUMP_V;
    character.grounded = false;
  }
  character.vx = dir * MOVE_SPEED;
  character.vy = Math.max(-26, character.vy + CHAR_GRAVITY * h);
  character.grounded = false;

  const dx = character.vx * h;
  const dy = character.vy * h;
  const sub = clamp(Math.ceil(Math.max(Math.abs(dx), Math.abs(dy)) / 0.05), 1, 6);
  for (let i = 0; i < sub; i++) {
    character.x += dx / sub;
    character.y += dy / sub;
    resolveContact(g);
  }

  // The turn only opens when the player is genuinely walking out of an end: the key has to
  // be held toward it and the climber pressed against it for EDGE_DWELL without let-up.
  // Walking up to the edge, sliding into it, or being shoved past it by a landing member
  // therefore can never turn the world by itself.
  const limit = EDGE_LINE;
  if (character.x > limit) character.x = limit;
  else if (character.x < -limit) character.x = -limit;
  const push = character.x >= limit - 0.001 && dir > 0 ? 1 : character.x <= -limit + 0.001 && dir < 0 ? -1 : 0;
  state.edgeHold = push === 0 ? 0 : state.edgeHold + h;
  if (push === 1 && state.edgeHold >= EDGE_DWELL && state.blockedDir !== 1) {
    beginTurn(g, FACES[state.face].right, -limit);
  } else if (push === -1 && state.edgeHold >= EDGE_DWELL && state.blockedDir !== -1) {
    beginTurn(g, FACES[state.face].left, limit);
  } else if (push === 0 && Math.abs(character.x) < limit - 0.8) {
    state.blockedDir = 0; // well clear of the ends — either one can be tried again
  }
  if (character.y < -1.5) respawn(character);
}
