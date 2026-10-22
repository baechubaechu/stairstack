// Who is saying what, right now. Two voices: the worker on site (a speech bubble over their head in
// the drone view) and the foreman — the player, up in the crane — whose radio replies run as a
// subtitle along the bottom of the plan. Render-side only; the engine never hears any of it.
import { useSyncExternalStore } from "react";

let lines = { worker: null, boss: null };
const listeners = new Set();
const timers = new Set();

function emit() {
  for (const fn of listeners) fn();
}

function later(fn, ms) {
  const id = setTimeout(() => {
    timers.delete(id);
    fn();
  }, ms);
  timers.add(id);
}

// Put a line in `who`'s mouth for `ms` milliseconds.
export function say(who, text, ms) {
  const until = performance.now() + ms;
  lines = { ...lines, [who]: { text, until } };
  emit();
  later(() => {
    if (lines[who] && lines[who].until <= performance.now() + 5) {
      lines = { ...lines, [who]: null };
      emit();
    }
  }, ms);
}

// A short exchange: each entry { who, text, ms, after } starts `after` ms after the one before.
export function dialogue(entries) {
  let at = 0;
  for (const e of entries) {
    at += e.after ?? 0;
    later(() => say(e.who, e.text, e.ms), at);
  }
}

// Silence everyone — a new run, or the run ending.
export function hush() {
  for (const id of timers) clearTimeout(id);
  timers.clear();
  lines = { worker: null, boss: null };
  emit();
}

// What `who` is saying this frame, or null (for canvases, read every frame).
export function speaking(who) {
  const l = lines[who];
  return l && l.until > performance.now() ? l.text : null;
}

const subscribe = (fn) => {
  listeners.add(fn);
  return () => listeners.delete(fn);
};

// What `who` is saying, for React.
export function useSpeech(who) {
  return useSyncExternalStore(subscribe, () => lines[who]?.text ?? null, () => null);
}
