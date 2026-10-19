// The background track: one looping song that plays while a run is live and speeds up with the
// run, so the music gets as urgent as the lava and the sinking members. Framework-free — the UI
// only tells it what the run is doing.
import { FALL_MAX } from "./constants";
import { sinkFactor } from "./survival";

// The song speeds up along the same ramp as the sinking members, up to this playback rate once
// they are at their cap.
const MUSIC_RATE_MAX = 1.25;
// The volume a first-time player hears; the pause menu's slider changes it, and it is remembered.
const MUSIC_VOLUME = 0.5;

const MUTE_KEY = "stairstack.muted";
const VOLUME_KEY = "stairstack.volume";

let audio = null;

function track() {
  if (!audio && typeof Audio !== "undefined") {
    audio = new Audio(`${import.meta.env.BASE_URL}audio/bgm.mp3`);
    audio.loop = true;
    audio.volume = getVolume();
    // Faster, but not higher: the song keeps its key as it speeds up.
    audio.preservesPitch = true;
    audio.muted = isMuted();
  }
  return audio;
}

export function isMuted() {
  try {
    return localStorage.getItem(MUTE_KEY) === "1";
  } catch {
    return false;
  }
}

// The music's volume, 0 – 1, as the player last set it.
export function getVolume() {
  try {
    const v = Number.parseFloat(localStorage.getItem(VOLUME_KEY));
    return Number.isFinite(v) ? Math.max(0, Math.min(1, v)) : MUSIC_VOLUME;
  } catch {
    return MUSIC_VOLUME;
  }
}

export function setVolume(volume) {
  const v = Math.max(0, Math.min(1, volume));
  try {
    localStorage.setItem(VOLUME_KEY, String(v));
  } catch {
    // the choice just won't survive a reload
  }
  const a = track();
  if (a) a.volume = v;
}

export function setMuted(muted) {
  try {
    localStorage.setItem(MUTE_KEY, muted ? "1" : "0");
  } catch {
    // the choice just won't survive a reload
  }
  const a = track();
  if (a) a.muted = muted;
}

// The song follows the same ramp as the sinking members: normal speed at the first second, the
// fastest it will go once they are at their cap.
export function setIntensity(elapsed) {
  const a = track();
  if (!a) return;
  const t = (sinkFactor(elapsed) - 1) / (FALL_MAX - 1);
  a.playbackRate = 1 + (MUSIC_RATE_MAX - 1) * t;
}

// Browsers only let sound start after a click or key press, which is how a run always begins.
export function play() {
  track()?.play().catch(() => {});
}

export function pause() {
  audio?.pause();
}

// A new run starts the song over from the top at normal speed.
export function rewind() {
  const a = track();
  if (!a) return;
  a.currentTime = 0;
  a.playbackRate = 1;
}
