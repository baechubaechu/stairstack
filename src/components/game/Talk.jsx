import { useEffect, useRef } from "react";
import { useFrame } from "@/components/game/frame";
import { dialogue, hush } from "@/components/game/speech";
import { FACES, LAVA_START } from "@/lib/game/constants";
import { sinkFactor } from "@/lib/game/survival";
import { t } from "@/lib/i18n";

// The worker on site keeps talking to the crane operator (the player) about what is happening:
// a hello from the ground floor, thanks for a member landed close by, a shout when one is coming
// down on their head, rising panic as the lava nears, each storey secured, a corner turned, a
// nudge when no material has come for a while. The operator answers now and then over the radio.
// Each kind of line has a few wordings, picked at random but never the same one twice running.
// So the worker isn't chattering all the time, ordinary lines wait for a quiet spell; urgent
// ones (something overhead, lava at the feet) cut in. Checked every frame, so a moment as short
// as a head bump is caught.

// Each kind: how urgent it is (1 chatter, 2 news, 3 danger), how many wordings it has, and the
// operator's reply, if any — to every wording (`boss`), or only to some (`replies`, by wording).
const KINDS = {
  start: { prio: 2, n: 2, boss: "talk.start.boss" },
  landed: { prio: 1, n: 3 },
  overhead: { prio: 3, n: 2 },
  lavaNear: { prio: 2, n: 3, replies: { 3: "talk.lavaNear.3.boss" } },
  lavaClose: { prio: 3, n: 2, boss: "talk.lavaClose.boss" },
  floor: { prio: 2, n: 2 },
  idle: { prio: 1, n: 2 },
  turn: { prio: 1, n: 2 },
};
// How long since the last line before the next may start, in milliseconds, by urgency.
const QUIET_MS = { 1: 9000, 2: 4000, 3: 2000 };
// How long a line stays up, and how long after it the operator answers (ms).
const LINE_MS = 2600;
const REPLY_MS = 3000;
const REPLY_AFTER = 1300;

// The run's opening hello comes this many seconds in.
const HELLO_AT = 1;
// The lava's distance below the worker's feet (m) that first worries them, then panics them;
// once it is this far below again, the next approach can be called out afresh. (The run opens
// with the lava a metre under the ground floor, so these sit under that, and nothing is said
// until the lava has started to rise.)
const LAVA_NEAR = 0.8;
const LAVA_CLOSE = 0.35;
const LAVA_CLEAR = 1.5;
// A member counts as landed "close by" within this far along the face (m), from about the
// worker's feet up to a step they can climb.
const LANDED_NEAR = 1.8;
const LANDED_STEP = 1.2;
// The worker only shouts about a member overhead once it is this close above their head (m).
const OVERHEAD_WARN = 4;
// Seconds without a drop before the worker asks for materials.
const IDLE_AFTER = 12;
// How many times faster members sink in when the operator warns about the brake.
const BRAKE_STEPS = [1.75, 2.5];

// How far along the face being read a point in the world is from the worker (m).
function alongFace(eng, x, z) {
  const f = FACES[eng.face];
  const w = eng.charWorld();
  return f.axis === "x" ? x - w.cx : z - w.cz;
}

// Half the member's width along the face being read, as it is turned.
function halfAlong(eng, p) {
  const odd = Math.abs(Math.round(p.yaw / (Math.PI / 2))) % 2 === 1;
  const fx = odd ? p.type.d : p.type.w;
  const fz = odd ? p.type.w : p.type.d;
  return (FACES[eng.face].axis === "x" ? fx : fz) / 2;
}

const SEEN_KEY = "stairstack.talk";
function seen() {
  try {
    return new Set((localStorage.getItem(SEEN_KEY) ?? "").split(",").filter(Boolean));
  } catch {
    return new Set();
  }
}
function remember(set) {
  try {
    localStorage.setItem(SEEN_KEY, [...set].join(","));
  } catch {
    // without storage it plays again next visit
  }
}

// How close under a deck the worker's head must come to count as hitting it (m).
const BUMP = 0.08;

const fresh = () => ({
  hello: false,
  dropped: 0,
  floors: 0,
  turns: 0,
  lastDrop: 0,
  lavaStage: 0,
  brakeStage: 0,
  warned: -1, // the drop number of the member already shouted about
  aim: null, // where the member in play was aimed last frame, to judge where it landed
});

// `quiet` (the first-run guide is talking) holds back the chatter, but not news or danger.
export default function Talk({ engineRef, mode, over, quiet }) {
  const done = useRef(seen());
  const run = useRef(fresh());
  const last = useRef({ at: -Infinity, pick: {} });
  const quietRef = useRef(quiet);
  quietRef.current = quiet;

  // a new run, or the run's end, cuts off whatever was being said
  useEffect(() => {
    if (mode !== "play" || over) hush();
  }, [mode, over]);

  // Say a line of this kind if it may be said now; true if it was.
  const speak = (kind, vars) => {
    const k = KINDS[kind];
    const now = performance.now();
    if (k.prio < 2 && quietRef.current) return false;
    if (now - last.current.at < QUIET_MS[k.prio]) return false;
    let i = 1 + Math.floor(Math.random() * k.n);
    if (k.n > 1 && i === last.current.pick[kind]) i = (i % k.n) + 1;
    last.current = { at: now, pick: { ...last.current.pick, [kind]: i } };
    const lines = [{ who: "worker", text: t(`talk.${kind}.${i}`, vars), ms: LINE_MS }];
    const reply = k.replies?.[i] ?? k.boss;
    if (reply) lines.push({ who: "boss", text: t(reply), ms: REPLY_MS, after: REPLY_AFTER });
    dialogue(lines);
    return true;
  };
  // The operator alone, over the radio.
  const radio = (key) => {
    last.current = { ...last.current, at: performance.now() };
    dialogue([{ who: "boss", text: t(key), ms: REPLY_MS }]);
  };

  const lastTime = useRef(0);
  useFrame(() => {
    const eng = engineRef.current;
    if (!eng) return;
    const s = eng.stats();
    // a restart sends the clock back to zero: whatever was being said is cut off, and the
    // new run starts with a clean slate
    if (s.elapsed < lastTime.current) {
      hush();
      run.current = fresh();
    }
    lastTime.current = s.elapsed;
    if (eng.mode !== "play" || s.paused) return;
    const r = run.current;
    const c = eng.character;
    const feet = c.y - c.hh;
    const head = c.y + c.hh;

    if (!r.hello && s.elapsed > HELLO_AT) r.hello = speak("start");

    // A member just let go: did it land where the worker can use it?
    if (s.dropped > r.dropped) {
      const a = r.aim;
      r.dropped = s.dropped;
      r.lastDrop = s.elapsed;
      if (a && a.face === eng.face) {
        const bottom = a.landing - a.h / 2;
        const top = a.landing + a.h / 2;
        if (Math.abs(a.du) < LANDED_NEAR && bottom <= feet + LANDED_STEP && top > feet + 0.1) speak("landed");
      }
    }

    // The member in play: remember where it is aimed, and shout if it is coming down on the
    // worker's head.
    if (eng.turnInfo) {
      r.aim = null;
    } else {
      const p = eng.placement();
      const du = alongFace(eng, p.x, p.z);
      r.aim = { du, landing: p.landing, h: p.type.h, face: eng.face };
      const above = p.y - p.type.h / 2;
      const lands = p.landing - p.type.h / 2;
      if (
        r.warned !== s.dropped &&
        Math.abs(du) < halfAlong(eng, p) + c.hw &&
        above > head &&
        above - head < OVERHEAD_WARN &&
        lands < head
      ) {
        if (speak("overhead")) r.warned = s.dropped;
      }
    }

    // The lava: worry, then panic, as it closes in.
    const gap = feet - s.lava;
    if (gap > LAVA_CLEAR || s.lava <= LAVA_START) r.lavaStage = 0;
    else if (gap < LAVA_CLOSE && r.lavaStage < 2) {
      if (speak("lavaClose")) r.lavaStage = 2;
    } else if (gap < LAVA_NEAR && r.lavaStage < 1) {
      if (speak("lavaNear")) r.lavaStage = 1;
    }

    if (s.floors > r.floors) {
      r.floors = s.floors;
      speak("floor", { n: s.floors });
    }
    if (s.turns > r.turns) {
      r.turns = s.turns;
      speak("turn");
    }
    if (s.elapsed - r.lastDrop > IDLE_AFTER && c.grounded && gap > LAVA_NEAR) {
      if (speak("idle")) r.lastDrop = s.elapsed;
    }

    // The brake slips further as the run goes on; the operator mutters about it.
    const slip = sinkFactor(s.time);
    if (r.brakeStage < BRAKE_STEPS.length && slip >= BRAKE_STEPS[r.brakeStage]) {
      r.brakeStage += 1;
      radio("talk.brake.boss");
    }

    // First time ever the worker's head hits a deck that isn't fixed in place yet.
    if (!done.current.has("deckBump") && !c.grounded && !eng.turnInfo) {
      const deck = eng.viewFor(eng.face).sil.find((v) => v.floor && !v.active);
      if (deck) {
        const us = deck.poly.map((q) => q[0]);
        const bottom = Math.min(...deck.poly.map((q) => q[1]));
        const under = c.x >= Math.min(...us) && c.x <= Math.max(...us);
        if (under && bottom - head < BUMP && bottom - head > -0.2) {
          done.current.add("deckBump");
          remember(done.current);
          last.current = { ...last.current, at: performance.now() };
          dialogue([
            { who: "worker", text: t("talk.deckBump.worker"), ms: 2600 },
            { who: "boss", text: t("talk.deckBump.boss"), ms: 3400, after: 1300 },
          ]);
        }
      }
    }
  });

  return null;
}
