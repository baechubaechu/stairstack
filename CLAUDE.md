# STAIRSTACK

Browser physics-stacking / climbing game. Plain Vite + React 19 SPA, JavaScript only (no TypeScript),
Tailwind 3. No backend. Game design notes and history: `CONTEXT.md`. Planned work: `ROADMAP.md`.

## Commands
- `npm run dev` — dev server (http://localhost:5173; `.claude/launch.json` entry "stairstack")
- `npm run build` — production build to `dist/` (static; any static host works).
  `npm run preview` serves it (launch entry "stairstack-build", port 4173)
- `npm test` — vitest (engine + geometry). `npm run lint` — run both before finishing a change

## Layout
`src/lib/game/` — the game, framework-free. Every engine module works on one shared object `g`
(`RAPIER, world, input, members, preview, character, state, views`):
- `engine.js` — assembles `g`, the fixed-step game loop, run lifecycle and the public API the UI uses.
- `world.js` — the Rapier world, adding members, stack-height queries, `placement()` of the member in play.
- `views.js` — projections of the same bodies: elevation silhouettes, plan footprints, climber-expanded
  collision polygons. The elevation is a projection, never a second simulation.
- `climber.js` — the climber (not a Rapier body): movement, silhouette sweep, head strikes, edge walking.
- `turn.js` — turning the elevation to the next face (and folding back when blocked).
- `drop.js` — the member in play: queue, slow descent, release. `survival.js` — score / lava / speed-up.
- `tipping.js` — how members settle: square to the grid, never sliding or twisting; on landing a member
  whose centre of mass hangs off its support tips over that edge about one grid axis only.
- `floors.js` — floor slabs (storeys): a slab over the whole plan but a gap strip along one edge,
  pencilled (no collider, translucent) until the climber stands on it, then solid ground; the next one
  appears a storey higher with its gap hidden from the face the climber is on.
- `constants.js` tuning · `elevation.js` box → 2D projection, `faceU` · `hull.js` convex hull /
  penetration · `palette.js` canvas colours (`ACCENT` is also Tailwind's `ochre`) · `canvas.js` 2D helpers.

`src/components/game/` — React UI. `Game.jsx` boots Rapier and owns the single animation loop: each frame
it steps the engine, then every canvas draws via `useFrame` (`frame.js`). Canvases size themselves with
`useCanvasSize`. `src/components/ui/button.jsx` is the one shadcn component in use. Alias `@/` → `src/`.
`PlanView.jsx` draws the plan through `perspective.js` (a camera behind the face being read; render only,
the engine never reads it). Every word on screen comes from `src/lib/i18n.js` (Korean default, English
toggle): React reads it via `useLang()`, canvases call `t()` (imported as `tr` where `t` means time).
`MobileGate.jsx` turns phones away, `ReportDialog.jsx` sends bug reports / ideas to Supabase.
Game over is a news broadcast (`NewsOverlay.jsx`): `Game.jsx` waits out the death beat, crops the drone
(elevation) canvas into the photo, then shows the breaking-news screen and the reporter's lines.
`FloorBanner.jsx` announces each storey secured. `speech.js` holds who is talking (the worker: a bubble over
their head in the elevation; the foreman — the player — a subtitle under the plan, `BossSubtitle.jsx`);
`Talk.jsx` sets exchanges off from what happens on site (once per browser). The screen is one crane cab:
`CabRoof.jsx` (ceiling switches), `DroneMonitor.jsx` (the elevation as the drone's monitor), `CabWindow.jsx`
(the plan through the cab's front window), `MaterialQueue.jsx` (under the monitor: the member on
the hook at the right, next to the plan, and the ones waiting to its left — keyed by drop order so each drop
slides the line one place right), `CabConsole.jsx` (the control desk: a stick console at each end, the
instrument panel — score, height vs lava, brake dial — between them). The story and its wording live in `docs/story-ko.md`.
`guide.js` (`useGuide`) + `GuideBubble.jsx`: the first-run guide — steps drop → climb → lava warning over the
view each is about (the screen's `glow`), the lava held (`engine.holdLava`) until the first two are done, then
one-time tips (edge turn, tip arrow, floor slab). Remembered in localStorage; the pause menu restarts it.
`src/components/game/art/` — decoration only, never read by the engine: `materials.js` (per-type member
textures, top-lit shading, contact shadows), `scene.js` (dusk sky, foundation section, lava surface/glow/
embers, plan-view lava, the erupting volcano and a far crane), `climber.js` (the hard-hat figure, its poses,
landing dust), `crane.js` (the crane cable / hook / failing-brake sparks over the member in play, the drone
HUD, the lava death's thumbs-up and last words). Render-side
randomness (embers, dust) is fine there; the engine itself must stay deterministic.

## Conventions
- Rapier: the game ships `@dimforge/rapier3d` (separate .wasm, via `vite-plugin-wasm`); tests use
  `@dimforge/rapier3d-compat` because Node can't load the former. Keep both pinned to the same version.
- `engine.test.js` has a snapshot of a scripted run. Rapier is deterministic, so a refactor must keep it
  identical; when behaviour changes on purpose (tuning, rules), review the diff and run `npx vitest run -u`.
- No React StrictMode (its dev double-mount would boot a second Rapier world).
- Dev builds expose the engine as `window.__engine` — e.g. `__engine.step(1/60)` in a loop fast-forwards a
  run, `__engine.togglePause()` freezes it for a screenshot. A hidden browser pane stops
  requestAnimationFrame, so the game clock only advances while the page is visible (or when stepped by hand).
- Vite's file watcher on Windows can miss in-place `sed -i` edits; if the browser runs stale code, restart
  the dev server.
- Tailwind `accent` is shadcn's near-white hover tint; for the game's ochre use `ochre` (or `ACCENT` on canvas).
- Tuning numbers live in `constants.js` (e.g. `ROTATE_STEP_DEG`, `AIM_LIMIT`); UI text reads them from there.
- Code comments explain the game rule behind the code, in full sentences — keep that style.
- Physics stability: members have locked axes (see `tipping.js`), so two of them pressed together where
  neither can give way would make Rapier's solver explode. Hence: colliders a hair narrower than the
  member (`SIDE_GAP`), soft CCD instead of full CCD (full CCD hung the solver on tall heaps), releases
  lifted clear of overlaps (`clearOf` in `drop.js`), and `kicked()` as a last safety net. The
  "never flings" test in `tipping.test.js` guards all of it.
- `window.__perf` (dev only) holds the smoothed step / draw cost of a frame in ms.

## Supabase (run logs + leaderboard)
`src/lib/telemetry.js` sends one `runs` row at game over and reads the `leaderboard` / `player_bests` views (one row per anonymous player, keyed by a SHA-256 tag of the browser's random id); schema and RLS in
`supabase/migrations/` (applied to production by the Supabase GitHub integration on push to main — don't also
apply them by hand: the integration runs `db push`, which stops on any remote migration version missing from this
folder, so a file's timestamp must match the version recorded in production; its result shows as the "Supabase
Preview" check on the commit). Keys come from `.env.local`
(`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, see `.env.example`); with no keys it silently does nothing, and the dev server never logs (`VITE_TELEMETRY_DEV=1` to test it).
Scores are client-reported, so the board is cheatable; triggers in `20261020123134_feedback_and_guards.sql`
reject runs whose scores don't add up or aren't physically plausible, and rate-limit runs and reports
(per browser and globally). Nicknames are automatic (`user` + 4 digits from the browser id).
`events` (`20261022113212_events.sql`) holds the funnel around the runs: `visit` (device, screen, referrer,
`?utm_source=`), `run_start`, `run_abandon` (restarted mid-run, or the tab closed — sent with a keepalive
fetch), `error` (uncaught errors, engine boot, canvas draws; each distinct one once per page load).
Read the beta in the dashboard through the `beta_daily`, `beta_deaths`, `beta_scores`, `beta_sources` and
`beta_errors` views (not exposed to anon). To check what the client sends without touching production,
point a dev server at a local stub: `VITE_TELEMETRY_DEV=1 VITE_SUPABASE_URL=http://127.0.0.1:<port>`.
