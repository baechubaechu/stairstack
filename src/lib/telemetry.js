// Run logs and the leaderboard, kept in Supabase (schema: supabase/schema.sql). Nothing here is
// read by the engine; with no keys configured every call quietly does nothing, so the game
// plays the same offline.
import { createClient } from "@supabase/supabase-js";

const URL = import.meta.env.VITE_SUPABASE_URL;
const KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;
// The dev server (npm run dev) logs nothing, so testing never lands in the beta data — unless
// VITE_TELEMETRY_DEV=1 is set to check the logging itself. Only built, deployed copies log runs.
const OFF_IN_DEV = import.meta.env.DEV && import.meta.env.VITE_TELEMETRY_DEV !== "1";
const supabase = URL && KEY && !OFF_IN_DEV ? createClient(URL, KEY, { auth: { persistSession: false } }) : null;

export const telemetryEnabled = Boolean(supabase);
const REQUEST_TIMEOUT_MS = 10000;

const PLAYER_KEY = "stairstack.player";

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

// Whether this browser has been here before (it keeps its id from the first visit).
const RETURNING = Boolean(read(PLAYER_KEY));
// One page load: ties a visit to the runs played in it.
const SESSION = crypto.randomUUID();

// A random id per browser, so one player's runs can be told apart without any sign-in.
function playerId() {
  let id = read(PLAYER_KEY);
  if (!id) {
    id = crypto.randomUUID();
    write(PLAYER_KEY, id);
  }
  return id;
}

// Nobody types a nickname: each browser is "user" and four digits made from its random id, the
// same every visit. Nothing to moderate on a public board, and nothing personal in it.
export function playerName() {
  const hex = playerId().replace(/-/g, "").slice(0, 8);
  return `user${String(Number.parseInt(hex, 16) % 10000).padStart(4, "0")}`;
}

// Send one finished run. `s` is engine.stats() at game over; `timeline` is [{t, h, lava}] samples.
export async function submitRun(s, timeline) {
  if (!supabase) return false;
  const { error } = await supabase.from("runs").insert({
    player_id: playerId(),
    name: playerName(),
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
    client: { viewport: [window.innerWidth, window.innerHeight], locale: navigator.language, session: SESSION },
  }).abortSignal(AbortSignal.timeout(REQUEST_TIMEOUT_MS));
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
    supabase.from("leaderboard").select("tag, name, score, runs, rank").limit(limit).abortSignal(AbortSignal.timeout(REQUEST_TIMEOUT_MS)),
    supabase.from("player_bests").select("tag, name, score, runs, rank").eq("tag", tag).maybeSingle().abortSignal(AbortSignal.timeout(REQUEST_TIMEOUT_MS)),
  ]);
  if (top.error) console.warn("STAIRSTACK: leaderboard unavailable", top.error.message);
  return { top: top.data ?? [], me: mine.data ?? null, failed: Boolean(top.error || mine.error) };
}

// Send a bug report or an idea. `context` is a snapshot of the run it was written in. Resolves to
// "sent", "limited" (the rate guard turned it away), "failed", or "offline" (no Supabase here).
export async function submitFeedback(kind, message, context) {
  if (!supabase) return "offline";
  const { error } = await supabase.from("feedback").insert({
    player_id: playerId(),
    kind,
    message: message.slice(0, 2000),
    context: {
      ...context,
      viewport: [window.innerWidth, window.innerHeight],
      locale: navigator.language,
      ua: navigator.userAgent.slice(0, 200),
      url: location.pathname,
    },
  });
  if (!error) return "sent";
  console.warn("STAIRSTACK: report not saved", error.message);
  return /rate limit/.test(error.message) ? "limited" : "failed";
}

// ---------------------------------------------------------------- the funnel around the runs
// (table `events`: visit · run_start · run_abandon · error)

// Log one event. Fire and forget: the game never waits on it.
export function track(kind, data = {}) {
  if (!supabase) return;
  supabase
    .from("events")
    .insert({ player_id: playerId(), session_id: SESSION, kind, data })
    .then(({ error }) => {
      if (error) console.warn("STAIRSTACK: event not saved", kind, error.message);
    });
}

// The same, for the moment the tab is closing: a keepalive request outlives the page.
export function trackOnExit(kind, data = {}) {
  if (!supabase) return;
  try {
    fetch(`${URL}/rest/v1/events`, {
      method: "POST",
      keepalive: true,
      headers: { apikey: KEY, Authorization: `Bearer ${KEY}`, "Content-Type": "application/json", Prefer: "return=minimal" },
      body: JSON.stringify({ player_id: playerId(), session_id: SESSION, kind, data }),
    }).catch(() => {});
  } catch {
    // nothing to do on the way out
  }
}

// A page load: the device and screen it came on, its language, and where the link came from
// (the referring site, or ?utm_source= on the shared link).
export function trackVisit(touchOnly) {
  let ref = "";
  try {
    ref = document.referrer ? new globalThis.URL(document.referrer).host : "";
  } catch {
    // an unreadable referrer is just no referrer
  }
  const utm = new URLSearchParams(location.search).get("utm_source") ?? "";
  track("visit", {
    touch: touchOnly,
    returning: RETURNING,
    viewport: [window.innerWidth, window.innerHeight],
    dpr: window.devicePixelRatio,
    lang: navigator.language,
    ua: navigator.userAgent.slice(0, 200),
    ref,
    utm: utm.slice(0, 60),
  });
}

// Errors: each distinct one once per page load, and no more than MAX_ERRORS of them.
const MAX_ERRORS = 10;
const reported = new Set();
export function trackError(where, err) {
  const message = String(err?.message ?? err ?? "unknown").slice(0, 300);
  const key = `${where}|${message}`;
  if (reported.has(key) || reported.size >= MAX_ERRORS) return;
  reported.add(key);
  track("error", {
    where,
    message,
    stack: String(err?.stack ?? "").slice(0, 1200),
    ua: navigator.userAgent.slice(0, 200),
  });
}

// Catch what nothing else catches: uncaught errors and rejected promises anywhere on the page.
export function watchErrors() {
  window.addEventListener("error", (e) => trackError("window", e.error ?? e.message));
  window.addEventListener("unhandledrejection", (e) => trackError("promise", e.reason));
}
