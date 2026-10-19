// STAIRSTACK engine: exactly ONE Rapier 3D world. Both views read the same rigid
// bodies — the elevation is a projection of them, never a second simulation.
//
// Every module works on one shared game object `g`:
//   RAPIER, world, input       the physics library, its world, and the held keys
//   members, preview           the placed rigid bodies, and where the member in play is aimed
//   character, state, views    the climber, the run's state, and the derived projections
import { BLOCKED_SECONDS, CHAR_STEP, COMPASS, FACES, LAVA_START, MEMBER_BY_ID, PHYS_STEP, QUEUE_AHEAD, SEQUENCE } from "./constants";
import { charStep, createCharacter, headStrike, respawn } from "./climber";
import { descend, release, spawnActive } from "./drop";
import { seedFloor, stepFloors } from "./floors";
import { advanceRun, buryDeep, petrify, reachHeight, resetRun } from "./survival";
import { advanceTurn, blockedView, turnInfo, turnView } from "./turn";
import { createViews, refresh, viewFor } from "./views";
import { addMember, charWorld, clearMembers, createWorld, placement, towerTop } from "./world";

function createState() {
  return {
    mode: "menu",
    elapsed: 0,
    best: 0, // the highest the climber's feet have been this run
    timeScore: 0,
    heightScore: 0,
    score: 0, // timeScore + heightScore
    lava: LAVA_START,
    cause: null,
    physAcc: 0,
    charAcc: 0,
    active: null,
    face: "front",
    turn: null,
    blockedDir: 0,
    paused: false,
    edgeHold: 0,
    blockedFace: null,
    blockedPulse: 0,
    dropped: 0, // members dropped this run — picks the next one from the drop order
    floors: 0, // floor slabs stood on this run
  };
}

export function createEngine(RAPIER, input) {
  const g = {
    RAPIER,
    world: createWorld(RAPIER),
    input,
    members: [],
    preview: { x: -2.5, z: 0, yaw: 0 },
    character: createCharacter(),
    state: createState(),
    views: createViews(),
  };
  const { state, character } = g;

  function seedStarter() {
    addMember(g, MEMBER_BY_ID.slab, -3.1, 0.16, 0.6, { x: 0, y: 0, z: 0 });
    addMember(g, MEMBER_BY_ID.slab, -0.5, 0.16, -0.7, { x: 0, y: 0.22, z: 0 });
    addMember(g, MEMBER_BY_ID.block, 1.9, 0.46, 0.4, { x: 0, y: -0.15, z: 0 });
    addMember(g, MEMBER_BY_ID.plank, 1.0, 1.15, 0.9, { x: 0, y: -0.5, z: 0.16 });
    seedFloor(g);
    refresh(g);
  }

  function resetCharacter() {
    state.face = "front";
    respawn(character);
    character.grounded = false;
    state.cause = null;
    state.charAcc = 0;
    if (state.mode === "over") state.mode = "play";
    state.turn = null;
    state.blockedDir = 0;
    state.edgeHold = 0;
    state.blockedFace = null;
    state.blockedPulse = 0;
    refresh(g);
  }

  // Game Start. The world starts running here: from this moment the climber is live and
  // members arrive on their own timer.
  function start() {
    if (state.mode === "play") return;
    state.mode = "play";
    state.paused = false;
    state.physAcc = 0;
    state.charAcc = 0;
    resetRun(state);
    character.vx = 0;
    character.vy = 0;
    spawnActive(g);
    refresh(g);
  }

  function restart() {
    clearMembers(g);
    state.physAcc = 0;
    state.face = "front"; // the first storey's gap is hidden from the face a run opens on
    resetRun(state);
    seedStarter();
    resetCharacter();
    state.mode = "play";
    state.paused = false;
    spawnActive(g);
    refresh(g);
  }

  function drop() {
    if (state.mode !== "play") return false;
    return release(g);
  }

  // Freeze the run where it stands: the world, the sinking member and the climber all hold
  // still until it is resumed.
  function togglePause() {
    if (state.mode !== "play") return;
    state.paused = !state.paused;
  }

  function gameOver(cause) {
    state.cause = cause;
    state.mode = "over";
    state.paused = false;
  }

  function step(rawDt) {
    const dt = Math.min(rawDt, 0.05);
    if (state.mode !== "play" || state.paused) return;
    if (state.blockedPulse > 0) state.blockedPulse = Math.max(0, state.blockedPulse - dt / BLOCKED_SECONDS);

    // The run's own clock: time survived, the score it earns, and the lava climbing.
    advanceRun(state, dt);

    // Physics first, on its own fixed clock.
    state.physAcc += dt;
    let n = 0;
    let struck = false;
    while (state.physAcc >= PHYS_STEP && n < 5) {
      g.world.step();
      state.physAcc -= PHYS_STEP;
      n += 1;
      // Judged on the frame it happens, so the world can freeze with the fatal
      // member exactly where it struck.
      if (headStrike(g)) {
        struck = true;
        break;
      }
    }
    if (state.physAcc > PHYS_STEP) state.physAcc = 0;

    // Anything the lava has closed over completely sets into basalt ground, and basalt buried
    // deep out of sight is cleared away.
    petrify(g);
    buryDeep(g);

    refresh(g);
    if (struck) {
      gameOver("head");
      return;
    }

    // While the elevation turns the climber holds their place; the controls come back the
    // moment the world has settled on a face.
    if (state.turn) {
      advanceTurn(g, dt);
    } else {
      state.charAcc += dt;
      let c = 0;
      while (state.charAcc >= CHAR_STEP && c < 12) {
        charStep(g, CHAR_STEP);
        state.charAcc -= CHAR_STEP;
        c += 1;
      }
      if (state.charAcc > CHAR_STEP) state.charAcc = 0;
    }
    // standing on a pencilled floor slab makes it real — and lays the next storey above
    if (stepFloors(g)) refresh(g);
    // only a height the climber is standing on counts — a jump on the spot earns nothing
    if (character.grounded) reachHeight(state, character.y - character.hh);

    descend(g, dt);

    // The lava is the floor now: touch it and the run is over.
    if (character.y - character.hh <= state.lava) gameOver("lava");
  }

  function stats() {
    const i = state.dropped % SEQUENCE.length;
    return {
      x: character.x,
      top: towerTop(g),
      members: g.members.filter((m) => !m.floor).length,
      floors: state.floors,
      yaw: g.preview.yaw,
      score: state.score,
      timeScore: state.timeScore,
      heightScore: state.heightScore,
      best: state.best,
      time: state.elapsed,
      lava: state.lava,
      cause: state.cause,
      mode: state.mode,
      over: state.mode === "over",
      paused: state.paused,
      face: state.face,
      faceLabel: FACES[state.face].label,
      faceSide: COMPASS[FACES[state.face].compass],
      nowId: SEQUENCE[i],
      // the members after it, nearest first, for the queue between the two views
      nextIds: Array.from({ length: QUEUE_AHEAD }, (_, k) => SEQUENCE[(i + 1 + k) % SEQUENCE.length]),
    };
  }

  seedStarter();
  resetCharacter();

  return {
    world: g.world,
    members: g.members,
    preview: g.preview,
    character,
    get mode() {
      return state.mode;
    },
    get face() {
      return state.face;
    },
    // The lava's surface, in metres above the floor — what both the elevation and the HUD read.
    get lava() {
      return state.lava;
    },
    get turnView() {
      return turnView(state);
    },
    get turnInfo() {
      return turnInfo(state);
    },
    get blockedView() {
      return blockedView(state);
    },
    get plans() {
      return g.views.plans;
    },
    placement: () => placement(g),
    viewFor: (faceId) => viewFor(g, faceId),
    charWorld: () => charWorld(g),
    start,
    drop,
    restart,
    togglePause,
    stats,
    step,
    free: () => g.world.free(),
  };
}
