// The climber. They are deliberately NOT in the physics world: they walk straight through a
// stack without shifting a single member. A member coming down on their head is judged by our
// own geometry (headStrike), and the climb by a sweep against the expanded silhouettes.
import {
  AIR_ACCEL,
  AIR_DECEL,
  APEX_BAND,
  APEX_GRAVITY,
  CHAR_GRAVITY,
  CHARACTER,
  COYOTE_TIME,
  EDGE_DWELL,
  EDGE_LINE,
  FACES,
  FALL_GRAVITY,
  JUMP_BUFFER,
  JUMP_CUT,
  JUMP_V,
  MAX_FALL,
  MOVE_SPEED,
  RUN_ACCEL,
  RUN_DECEL,
  SPAWN,
  STEP_PROBE,
  STEP_UP,
} from "./constants";
import { penetration } from "./hull";
import { beginTurn } from "./turn";
import { extent, footprint, placement } from "./world";

const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);

// Contacts thinner than this are separation tolerance, not a push-out.
const SEPARATION = 0.0005;

// A member grazing the column edge is beside the climber, not over it.
const COLUMN_GRACE = 0.03;
// How close over the head a member's landing must be to count as landing on the head (placement()
// sets a landing 0.08 m clear of whatever is under it).
const HEAD_REST = 0.1;

export function createCharacter() {
  // `x` is the screen-x (u) of the climber on the face being read — the elevation draws them
  // straight from it, whichever side of the tower that is.
  // `airTime` (coyote clock), `jumpBuffer`, `jumpHeld` and `rising` carry the jump's timing
  // from one step to the next.
  const c = { hw: CHARACTER.w / 2, hh: CHARACTER.h / 2, grounded: false };
  respawn(c);
  return c;
}

export function respawn(character) {
  character.x = SPAWN.x;
  character.y = SPAWN.y;
  character.vx = 0;
  character.vy = 0;
  character.airTime = 0;
  character.jumpBuffer = 0;
  character.jumpHeld = false;
  character.rising = false;
}

// A member that descends through the climber's head plane while over its column ends the run.
// Only a member genuinely coming down can kill: the climber is live the whole time, so jumping
// into a resting member above — and shoving it upwards — is safe.
export function headStrike(g) {
  const { character } = g;
  const headTop = character.y + character.hh;
  for (const m of g.members) {
    if (m.stone || m.floor) continue; // basalt and floor slabs are fixed: they can't come down on anyone
    const e = extent(g, m);
    const prev = m.bottom ?? e.bottom;
    m.bottom = e.bottom;
    if (prev < headTop || e.bottom > headTop) continue; // no crossing through the head plane this frame
    if (e.maxU < character.x - character.hw + COLUMN_GRACE || e.minU > character.x + character.hw - COLUMN_GRACE) {
      continue; // beside the climber, not over it
    }
    if (m.body.linvel().y > -1.2) continue; // resting on the head, or shoved up by a jump — not falling onto it
    return m; // the member that came down on them
  }
  return null;
}

// Would the member in play, released where it is aimed, come down on the climber? The drone
// camera has no near or far, so what counts is the elevation alone: its span across the face
// overlapping the climber's column (as in headStrike), and its way down to where it would land
// passing the climber's head. How far away it is across the plan makes no difference.
export function aimOverHead(g) {
  const { character, state } = g;
  if (!state.active) return false;
  const p = placement(g);
  const { fx, fz } = footprint(p.type, Math.round(p.yaw / (Math.PI / 2)));
  const f = FACES[state.face];
  const u = f.axis === "x" ? f.sign * p.x : f.sign * p.z;
  const half = (f.axis === "x" ? fx : fz) / 2;
  if (u + half < character.x - character.hw + COLUMN_GRACE || u - half > character.x + character.hw - COLUMN_GRACE) {
    return false; // beside the climber, not over it
  }
  // placement() counts the climber's head as something to land on, so a member with nothing
  // higher under it "lands" just over the head — which is exactly a drop onto the worker. Only
  // a member held up above the head by something else is safe.
  const headTop = character.y + character.hh;
  const bottom = p.y - p.type.h / 2;
  const rest = p.landing - p.type.h / 2;
  return bottom > headTop && rest < headTop + HEAD_REST;
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

const approach = (v, target, maxStep) => v + clamp(target - v, -maxStep, maxStep);

// Does the climber overlap anything at this point (beyond resting contact)?
function overlaps(g, x, y) {
  for (const poly of g.views.expanded) {
    const pen = penetration(poly, x, y);
    if (pen && pen.dist >= SEPARATION) return true;
  }
  return false;
}

// Is a wall facing the climber pressing them back at this point? Any one contact counts: the
// floor they are walking on overlaps too, and must not hide the ledge in front of them.
function wallAhead(g, x, y, dir) {
  for (const poly of g.views.expanded) {
    const pen = penetration(poly, x, y);
    if (pen && pen.dist >= SEPARATION && Math.abs(pen.nx) > 0.7 && pen.nx * dir < 0) return true;
  }
  return false;
}

// Walking into a low ledge: if a wall stopped the climber and there is room to stand within
// STEP_UP above where they were, lift them onto it — the sweep then settles them on its top.
function stepUp(g, dir, fromY) {
  const c = g.character;
  if (!wallAhead(g, c.x, c.y, dir)) return;
  for (let lift = STEP_PROBE; lift <= STEP_UP + 1e-9; lift += STEP_PROBE) {
    if (overlaps(g, c.x, fromY + lift)) continue;
    c.y = fromY + lift;
    return;
  }
}

// One fixed climber step: input, gravity, the collision sweep, and walking out of an end.
export function charStep(g, h) {
  const { character: c, input, state } = g;
  let dir = 0;
  if (input.left) dir -= 1;
  if (input.right) dir += 1;

  // `grounded` still says whether last step's sweep found a floor. Time since then is the
  // coyote clock; a fresh press of the jump key starts the buffer clock.
  c.airTime = c.grounded ? 0 : c.airTime + h;
  const pressed = input.jump && !c.jumpHeld;
  c.jumpHeld = input.jump;
  c.jumpBuffer = pressed ? JUMP_BUFFER : Math.max(0, c.jumpBuffer - h);
  if (c.jumpBuffer > 0 && c.airTime <= COYOTE_TIME) {
    c.vy = JUMP_V;
    c.jumpBuffer = 0;
    c.airTime = Infinity; // one jump per take-off: the coyote window is spent
    c.rising = true;
  }
  // letting go mid-rise cuts the jump short
  if (c.rising && !input.jump && c.vy > 0) {
    c.vy *= JUMP_CUT;
    c.rising = false;
  }
  if (c.vy <= 0) c.rising = false;

  // run toward the held direction — quicker on the ground than in the air
  const onGround = c.airTime === 0;
  const rate = dir !== 0 ? (onGround ? RUN_ACCEL : AIR_ACCEL) : onGround ? RUN_DECEL : AIR_DECEL;
  c.vx = approach(c.vx, dir * MOVE_SPEED, rate * h);

  // gravity eases at the top of a held jump and bites harder on the way down
  let gravity = CHAR_GRAVITY;
  if (input.jump && Math.abs(c.vy) < APEX_BAND && !onGround) gravity *= APEX_GRAVITY;
  else if (c.vy < 0) gravity *= FALL_GRAVITY;
  c.vy = Math.max(-MAX_FALL, c.vy + gravity * h);
  c.grounded = false;

  const dx = c.vx * h;
  const dy = c.vy * h;
  const sub = clamp(Math.ceil(Math.max(Math.abs(dx), Math.abs(dy)) / 0.05), 1, 6);
  // only a climber walking along a floor steps up — never one in the air or on the way up
  const canStep = onGround && dir !== 0 && c.vy <= 0;
  for (let i = 0; i < sub; i++) {
    const fromY = c.y;
    c.x += dx / sub;
    c.y += dy / sub;
    if (canStep) stepUp(g, dir, fromY);
    resolveContact(g);
  }

  // The turn only opens when the player is genuinely walking out of an end: the key has to
  // be held toward it and the climber pressed against it for EDGE_DWELL without let-up.
  // Walking up to the edge, sliding into it, or being shoved past it by a landing member
  // therefore can never turn the world by itself.
  const limit = EDGE_LINE;
  if (c.x > limit) c.x = limit;
  else if (c.x < -limit) c.x = -limit;
  const push = c.x >= limit - 0.001 && dir > 0 ? 1 : c.x <= -limit + 0.001 && dir < 0 ? -1 : 0;
  state.edgeHold = push === 0 ? 0 : state.edgeHold + h;
  if (push === 1 && state.edgeHold >= EDGE_DWELL && state.blockedDir !== 1) {
    beginTurn(g, FACES[state.face].right, -limit);
  } else if (push === -1 && state.edgeHold >= EDGE_DWELL && state.blockedDir !== -1) {
    beginTurn(g, FACES[state.face].left, limit);
  } else if (push === 0 && Math.abs(c.x) < limit - 0.8) {
    state.blockedDir = 0; // well clear of the ends — either one can be tried again
  }
  if (c.y < -1.5) respawn(c);
}
