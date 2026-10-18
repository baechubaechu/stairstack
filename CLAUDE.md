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
- `gates.js` — directional plates. **Placeholder, known wrong, to be rebuilt** — kept self-contained
  (plus `components/game/drawGate.js`) so it can be replaced in one place.
- `constants.js` tuning · `elevation.js` box → 2D projection, `faceU` · `hull.js` convex hull /
  penetration · `palette.js` canvas colours (`ACCENT` is also Tailwind's `ochre`) · `canvas.js` 2D helpers.

`src/components/game/` — React UI. `Game.jsx` boots Rapier and owns the single animation loop: each frame
it steps the engine, then every canvas draws via `useFrame` (`frame.js`). Canvases size themselves with
`useCanvasSize`. `src/components/ui/button.jsx` is the one shadcn component in use. Alias `@/` → `src/`.

## Conventions
- Rapier: the game ships `@dimforge/rapier3d` (separate .wasm, via `vite-plugin-wasm`); tests use
  `@dimforge/rapier3d-compat` because Node can't load the former. Keep both pinned to the same version.
- `engine.test.js` has a snapshot of a scripted run. Rapier is deterministic, so a refactor must keep it
  identical; when behaviour changes on purpose (tuning, rules), review the diff and run `npx vitest run -u`.
- No React StrictMode (its dev double-mount would boot a second Rapier world).
- Tailwind `accent` is shadcn's near-white hover tint; for the game's ochre use `ochre` (or `ACCENT` on canvas).
- Tuning numbers live in `constants.js` (e.g. `ROTATE_STEP_DEG`, `AIM_LIMIT`); UI text reads them from there.
- Code comments explain the game rule behind the code, in full sentences — keep that style.
