// STAIRSTACK — world constants and member catalogue.

// Architectural model colours: bright, fully opaque, and read as materials —
// ochre timber, terracotta, steel blue, sage and a plum finish.
export const MEMBER_TYPES = [
  { id: "slab", label: "Slab", w: 2.6, h: 0.3, d: 1.6, color: 0xe3a736, hex: "#e3a736" },
  { id: "plank", label: "Plank", w: 3.4, h: 0.25, d: 0.8, color: 0xd2703a, hex: "#d2703a" },
  { id: "block", label: "Block", w: 1.6, h: 0.9, d: 1.6, color: 0x4e8fbf, hex: "#4e8fbf" },
  { id: "step", label: "Step", w: 2.0, h: 0.5, d: 1.2, color: 0x7fa85a, hex: "#7fa85a" },
  { id: "beam", label: "Beam", w: 4.0, h: 0.35, d: 1.0, color: 0x8b6fa8, hex: "#8b6fa8" },
];

export const MEMBER_BY_ID = Object.fromEntries(MEMBER_TYPES.map((t) => [t.id, t]));

// The drop order: NOW / NEXT read from this, indexed by how many members have been dropped.
export const SEQUENCE = ["slab", "plank", "block", "step", "beam", "slab", "block", "plank", "step", "slab"];
// How many members after the one in play the queue between the two views shows.
export const QUEUE_AHEAD = 3;

export const GROUND_HALF = 6;

// Placement on the plan: the member's centre stays this far inside the curbs, and each wheel
// notch turns it this many degrees.
export const AIM_LIMIT = 5.4;
export const ROTATE_STEP_DEG = 45;

// Endless survival: the run is scored by how long it lasts, and the floor is giving way.
// The lava surfaces under the floor line, floods the ground first, then climbs the stack.
// Whatever it closes over completely sets hard into basalt — fixed ground the rest of the
// tower keeps standing on — so the race is to build up faster than it rises. Touch the lava
// and the run is over.
// The opening is gentle: the lava holds still for LAVA_DELAY seconds while the first members
// come down, then creeps up slowly and gathers pace — it floods the floor about half a
// minute in, and only becomes the real threat after that.
export const LAVA_START = -1;
export const LAVA_DELAY = 5; // s before the lava starts to rise at all
export const LAVA_SPEED = 0.02; // m/s it rises once it starts
export const LAVA_ACCEL = 0.0012; // m/s² — and it keeps gaining
// The score is two scores added up: time survived, and the best height the climber's feet have
// reached this run — so lasting and climbing both count.
export const SCORE_PER_SECOND = 10; // survival score: a point every tenth of a second
export const SCORE_PER_METRE = 100; // height score: a point per centimetre of best height

// What a swallowed member becomes, and when it can go: basalt deeper than BURY_DEPTH under the
// lava that has also dropped out of the bottom of the elevation window is removed outright —
// it is fixed, so nothing it held up can fall, and nobody can see or reach it any more.
export const STONE = { hex: "#4b4542", color: 0x4b4542 };
export const BURY_DEPTH = 1;

// Members sink in faster the longer a run lasts — AUTO_FALL_SECONDS at the first second,
// down to 1 / FALL_MAX of that once the ramp bottoms out.
export const FALL_RAMP = 0.025; // per second
export const FALL_MAX = 2.5; // × faster at the cap, about a minute in

// Members are released from the very top of the play area — the top of the elevation
// window — so every drop reads as a full fall down onto the stack.
export const DROP_Y = 8.6;

// The elevation window follows the climber up once their feet are more than VIEW_FOLLOW metres
// above the floor, rising by the excess — and members are released that much higher too, so
// they still fall in from the top of the window however high the climb has got.
export const VIEW_FOLLOW = 3.2;
// How far below the floor the elevation window reaches before it has risen at all.
export const VIEW_BOTTOM = -1.1;

// How long an unattended member takes to sink from the release height to the stack:
// it descends on its own at a slow, steady rate, and a click drops it at once instead.
export const AUTO_FALL_SECONDS = 5;

// The elevation turns to the next face over this long — and turns straight back over the
// same time when the climber's place on that face is already taken.
export const TURN_SECONDS = 0.5;

// The climber has to keep pushing into one end of the view for this long before the elevation
// turns: a graze, a slide, or a body shoved into them must never turn the world on its own.
export const EDGE_DWELL = 0.1;

// The line the turn opens on — the furthest the climber can walk before the view changes face.
// The elevation draws it, so the edge that turns the world is seen instead of guessed at.
export const EDGE_LINE = GROUND_HALF - 0.15;

// How long the "that face is already taken" feedback stays up after a turn folds back.
export const BLOCKED_SECONDS = 1.2;

export const CHARACTER = { w: 0.5, h: 0.9 };
// Faster across the board: the climber moves and jumps quicker, and the world pulls
// members down harder, so a drop lands with weight instead of drifting.
export const CHAR_GRAVITY = -25;
export const MOVE_SPEED = 6.3;
export const JUMP_V = 11.2;
export const MEMBER_GRAVITY = -18;
export const SPAWN = { x: -5, y: 0.46 };

// Jump forgiveness. A jump still counts for COYOTE_TIME after the climber's feet leave an edge,
// and a press up to JUMP_BUFFER before landing fires the moment they touch down. Only a fresh
// press jumps — holding the key doesn't bounce the climber along.
export const COYOTE_TIME = 0.1;
export const JUMP_BUFFER = 0.12;
// Jump shape. Letting go early cuts the rise (a tap is a hop, a hold is a full jump); near the
// top of a held jump gravity eases off so the apex hangs a moment; and the fall comes down
// harder than the rise, so a jump reads crisp rather than floaty.
export const JUMP_CUT = 0.45; // share of upward speed kept when the key is released mid-rise
export const APEX_BAND = 1.6; // m/s: below this vertical speed, a held jump is "at the top"
export const APEX_GRAVITY = 0.55; // × gravity while hanging at the top
export const FALL_GRAVITY = 1.45; // × gravity on the way down
export const MAX_FALL = 26; // m/s
// Running ramps up and down instead of snapping: full speed in about a tenth of a second on
// the ground, a little looser in the air so a jump can still be steered.
export const RUN_ACCEL = 60; // m/s² toward the held direction, on the ground
export const RUN_DECEL = 80; // m/s² to a stop with no key held, on the ground
export const AIR_ACCEL = 38;
export const AIR_DECEL = 20;
// Walking into a low ledge steps up onto it without a jump: anything up to STEP_UP above the
// feet (a slab or a plank lying flat), searched in STEP_PROBE increments. Taller members — a
// step on edge, a block — still need a jump.
export const STEP_UP = 0.35;
export const STEP_PROBE = 0.02;

export const PHYS_STEP = 1 / 60;
export const CHAR_STEP = 1 / 120;

// Four-face traversal. Every face reads the same rigid bodies from another side:
// `axis` is the world horizontal the view measures, and `sign` says which way the
// screen's +x runs (looking at the right face from +X, world +Z runs screen-left).
// Walking off one end of a face turns the world to that neighbour — `right` / `left`
// are the faces that end leads to — and enters it from the far side, so holding the
// same direction walks the whole tower instead of spinning on the spot.
//
// The compass is the plan view's: north is −Z (up the plan), east is +X (to its right).
// Each face is the side of the tower you look at from that compass point — the front
// elevation from the SOUTH, the right from the EAST, the back from the NORTH and the
// left from the WEST.
export const COMPASS = { N: "NORTH", E: "EAST", S: "SOUTH", W: "WEST" };

export const FACES = {
  front: { label: "FRONT", compass: "S", axis: "x", sign: 1, right: "right", left: "left" },
  right: { label: "RIGHT", compass: "E", axis: "z", sign: -1, right: "back", left: "front" },
  back: { label: "BACK", compass: "N", axis: "x", sign: -1, right: "left", left: "right" },
  left: { label: "LEFT", compass: "W", axis: "z", sign: 1, right: "front", left: "back" },
};

// Floor slabs (see floors.js): the first storey's underside sits at FLOOR_FIRST, each next one
// FLOOR_STOREY above the top of the last one stood on, each with a FLOOR_GAP-wide strip left
// open along one edge — the only way up past it.
export const FLOOR = { id: "floor", label: "Floor", h: 0.3, color: 0xcfc8bc, hex: "#cfc8bc" };
export const FLOOR_FIRST = 6.5;
export const FLOOR_STOREY = 6;
export const FLOOR_GAP = 1.8;