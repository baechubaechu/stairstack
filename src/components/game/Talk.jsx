import { useEffect, useRef } from "react";
import { useFrame } from "@/components/game/frame";
import { dialogue, hush } from "@/components/game/speech";
import { t } from "@/lib/i18n";

// The exchanges between the worker and the foreman, each set off by something happening on site,
// each played once per browser. Checked every frame, so a moment as short as a head bump is caught.
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
    // without storage they play again next visit
  }
}

// How close under a deck the worker's head must come to count as hitting it (m).
const BUMP = 0.08;

export default function Talk({ engineRef, mode, over }) {
  const done = useRef(seen());

  // a new run, or the run's end, cuts off whatever was being said
  useEffect(() => {
    if (mode !== "play" || over) hush();
  }, [mode, over]);

  const lastTime = useRef(0);
  useFrame(() => {
    const eng = engineRef.current;
    if (!eng) return;
    // a restart sends the clock back to zero: whatever was being said is cut off
    const time = eng.stats().time;
    if (time < lastTime.current) hush();
    lastTime.current = time;
    if (eng.mode !== "play" || eng.turnInfo) return;
    const c = eng.character;

    // First time the worker's head hits a deck that isn't fixed in place yet.
    if (!done.current.has("deckBump") && !c.grounded) {
      const head = c.y + c.hh;
      const deck = eng.viewFor(eng.face).sil.find((s) => s.floor && !s.active);
      if (deck) {
        const us = deck.poly.map((p) => p[0]);
        const bottom = Math.min(...deck.poly.map((p) => p[1]));
        const under = c.x >= Math.min(...us) && c.x <= Math.max(...us);
        if (under && bottom - head < BUMP && bottom - head > -0.2) {
          done.current.add("deckBump");
          remember(done.current);
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
