// Run logs and the leaderboard, kept in Supabase (schema: supabase/schema.sql). Nothing here is
// read by the engine; with no keys configured every call quietly does nothing, so the game
// plays the same offline.
import { createClient } from "@supabase/supabase-js";

const URL = import.meta.env.VITE_SUPABASE_URL;
const KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;
const supabase = URL && KEY ? createClient(URL, KEY, { auth: { persistSession: false } }) : null;

export const telemetryEnabled = Boolean(supabase);

const PLAYER_KEY = "stairstack.player";
const NAME_KEY = "stairstack.name";
const NAME_MAX = 16;

function read(key) {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function write(key, value) {
  try {
    localStorage.setItem(key, value);
  } catch {
    // private windows and blocked storage just forget the name
  }
}

// A random id per browser, so one player's runs can be told apart without any sign-in.
function playerId() {
  let id = read(PLAYER_KEY);
  if (!id) {
    id = crypto.randomUUID();
    write(PLAYER_KEY, id);
  }
  return id;
}

export const getName = () => read(NAME_KEY) || "";
export const setName = (name) => write(NAME_KEY, name.trim().slice(0, NAME_MAX));

// Send one finished run. `s` is engine.stats() at game over; `timeline` is [{t, h, lava}] samples.
export async function submitRun(s, timeline) {
  if (!supabase) return false;
  const { error } = await supabase.from("runs").insert({
    player_id: playerId(),
    name: getName() || "Anonymous",
    score: s.score,
    time_score: s.timeScore,
    height_score: s.heightScore,
    survived_s: Number(s.time.toFixed(2)),
    best_height: Number(s.best.toFixed(2)),
    stack_top: Number(s.top.toFixed(2)),
    members: s.members,
    dropped: s.dropped,
    floors: s.floors,
    face_turns: s.turns,
    lava: Number(s.lava.toFixed(2)),
    cause: s.cause,
    timeline,
    client: { viewport: [window.innerWidth, window.innerHeight], locale: navigator.language },
  });
  if (error) console.warn("STAIRSTACK: run not saved", error.message);
  return !error;
}

export async function fetchLeaderboard(limit = 10) {
  if (!supabase) return [];
  const { data, error } = await supabase.from("leaderboard").select("name, score, survived_s, best_height").limit(limit);
  if (error) {
    console.warn("STAIRSTACK: leaderboard unavailable", error.message);
    return [];
  }
  return data;
}
