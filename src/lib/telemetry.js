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

// Players who never type a nickname still get a stable one of their own, made from their id.
export const defaultName = () => `Climber-${playerId().slice(0, 4).toUpperCase()}`;
export const getName = () => read(NAME_KEY) || "";
export const setName = (name) => write(NAME_KEY, name.trim().slice(0, NAME_MAX));

// Send one finished run. `s` is engine.stats() at game over; `timeline` is [{t, h, lava}] samples.
export async function submitRun(s, timeline) {
  if (!supabase) return false;
  const { error } = await supabase.from("runs").insert({
    player_id: playerId(),
    name: getName() || defaultName(),
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

// The tag a player is listed under on the board: a SHA-256 of their id, the same one the
// `player_bests` view publishes, so the browser can find its own row without revealing the id.
async function playerTag() {
  const bytes = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(playerId()));
  return Array.from(new Uint8Array(bytes), (b) => b.toString(16).padStart(2, "0")).join("");
}

// The top players (one row each, their best run) and this player's own row, wherever it ranks.
export async function fetchLeaderboard(limit = 10) {
  if (!supabase) return { top: [], me: null };
  const tag = await playerTag();
  const [top, mine] = await Promise.all([
    supabase.from("leaderboard").select("tag, name, score, runs, rank").limit(limit),
    supabase.from("player_bests").select("tag, name, score, runs, rank").eq("tag", tag).maybeSingle(),
  ]);
  if (top.error) console.warn("STAIRSTACK: leaderboard unavailable", top.error.message);
  return { top: top.data ?? [], me: mine.data ?? null };
}
