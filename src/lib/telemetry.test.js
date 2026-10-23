import { afterEach, beforeEach, expect, it, vi } from "vitest";

const db = vi.hoisted(() => ({ results: {}, signals: [] }));
vi.mock("@supabase/supabase-js", () => ({
  createClient: () => ({
    from: (table) => {
      const query = {
        insert: () => query,
        select: () => query,
        eq: () => query,
        limit: () => query,
        maybeSingle: () => query,
        abortSignal: (signal) => {
          db.signals.push(signal);
          return Promise.resolve(db.results[table]);
        },
      };
      return query;
    },
  }),
}));

beforeEach(() => {
  vi.resetModules();
  vi.stubEnv("VITE_SUPABASE_URL", "https://example.invalid");
  vi.stubEnv("VITE_SUPABASE_ANON_KEY", "test-key");
  vi.stubEnv("VITE_TELEMETRY_DEV", "1");
  vi.stubGlobal("localStorage", { getItem: () => "12345678-1234-1234-1234-123456789012", setItem: () => {} });
  vi.stubGlobal("window", { innerWidth: 1280, innerHeight: 720 });
  vi.stubGlobal("navigator", { language: "ko" });
  vi.spyOn(console, "warn").mockImplementation(() => {});
  db.results = {};
  db.signals = [];
});
afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

const run = { score: 100, timeScore: 100, heightScore: 0, time: 10, best: 0, top: 2, lava: -1 };

it("reports rejected saves as failures, and successful saves as successes", async () => {
  const { submitRun } = await import("./telemetry");
  db.results.runs = { error: { message: "rate limit: runs too close together" } };
  expect(await submitRun(run, [])).toBe(false);
  db.results.runs = { error: null };
  expect(await submitRun(run, [])).toBe(true);
  expect(db.signals).toHaveLength(2);
  expect(db.signals.every((signal) => signal instanceof AbortSignal)).toBe(true);
});

it("distinguishes unavailable leaderboards from genuinely empty ones", async () => {
  const { fetchLeaderboard } = await import("./telemetry");
  db.results.leaderboard = { data: null, error: { message: "network unavailable" } };
  db.results.player_bests = { data: null, error: null };
  expect((await fetchLeaderboard()).failed).toBe(true);
  db.results.leaderboard = { data: [], error: null };
  expect(await fetchLeaderboard()).toEqual({ top: [], me: null, failed: false });
  db.results.player_bests = { data: null, error: { message: "timeout" } };
  expect((await fetchLeaderboard()).failed).toBe(true);
});

it("keeps local play available without an online backend", async () => {
  vi.stubEnv("VITE_SUPABASE_URL", "");
  const { telemetryEnabled, submitRun, fetchLeaderboard } = await import("./telemetry");
  expect(telemetryEnabled).toBe(false);
  expect(await submitRun(run, [])).toBe(false);
  expect(await fetchLeaderboard()).toEqual({ top: [], me: null });
  expect(db.signals).toHaveLength(0);
});
