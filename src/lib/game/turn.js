// Turning the elevation from one face of the tower to the next.
import { TURN_SECONDS } from "./constants";
import { blocked, refresh } from "./views";

// Step off either end of the view and the elevation turns to that side over TURN_SECONDS.
// The climber holds at the edge while it turns, then steps onto the new face from its far
// side, so holding the same direction walks the whole tower instead of spinning on the spot.
export function beginTurn(g, next, entry) {
  g.state.edgeHold = 0;
  g.state.blockedPulse = 0;
  g.state.turn = { to: next, entry, t: 0, back: false };
}

// Run the turn to its end. If the climber's place on the new face is already taken, the
// elevation turns straight back to the face it came from instead of committing.
export function advanceTurn(g, dt) {
  const { state, character } = g;
  const tr = state.turn;
  tr.t += dt;
  if (tr.t < TURN_SECONDS) return;
  tr.t = 0;
  state.charAcc = 0;
  if (!tr.back && blocked(g, tr.to, tr.entry)) {
    // the place there is taken: turn straight back, and hold off trying this end again
    // until the climber has stepped clear of it. The refusal is announced loudly.
    state.blockedDir = tr.entry < 0 ? 1 : -1;
    state.blockedFace = tr.to;
    state.blockedPulse = 1;
    tr.back = true;
    return;
  }
  if (!tr.back) {
    state.face = tr.to;
    state.turns += 1;
    character.x = tr.entry;
    state.blockedDir = 0;
    state.blockedFace = null;
    state.blockedPulse = 0;
  }
  character.vx = 0;
  state.turn = null;
  refresh(g);
}

// What the elevation draws while it rotates: which face is collapsing, which one opens up in
// its place, and how far along the turn is (0 → 1).
export function turnView(state) {
  const tr = state.turn;
  if (!tr) return null;
  const p = Math.min(1, tr.t / TURN_SECONDS);
  return tr.back ? { a: tr.to, b: state.face, p } : { a: state.face, b: tr.to, p };
}

// Where the turn is heading: the face it aims for, whether it is folding back from a blocked
// one, how far along it is (0 → 1), and the place the climber would arrive at.
export function turnInfo(state) {
  const tr = state.turn;
  if (!tr) return null;
  return { to: tr.to, back: tr.back, entry: tr.entry, p: Math.min(1, tr.t / TURN_SECONDS) };
}

// The feedback for a face that turned the climber around because their place there was
// taken: which face it was, and how far its fade-out has got (1 → 0).
export function blockedView(state) {
  if (state.blockedPulse <= 0 || !state.blockedFace) return null;
  return { to: state.blockedFace, dir: state.blockedDir, p: state.blockedPulse };
}
