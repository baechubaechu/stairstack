# STAIRSTACK — Context

## Game concept
Browser game. One single 3D physics world (Rapier) with cuboid members (slabs, planks, blocks…) that fall,
collide and tilt. The same rigid bodies are orthographically projected onto an elevation, where a 2D climber
walks/jumps on their silhouettes (platforms / ramps / ceilings). Top view = placing; elevation = climbing.

## Controls
- Mouse position: aim X/Z on the top view · Wheel: rotate 15° around Y · Click: drop now
- A/D move, W/Space jump · Hold into an elevation edge 0.1 s: turn to the next face · Esc: pause
- NOW / NEXT piece preview

## Current game state (as built on Base44, now developed here)
1. Top view + elevation, face widget (3D cube showing the viewed face), compass N/E/S/W.
   FRONT = viewed from SOUTH (start), RIGHT = EAST, BACK = NORTH, LEFT = WEST.
2. Face switching with dashed turn lines at the elevation edges. A blocked face (climber's spot is taken)
   shakes, tints red, shows "BLOCKED — TURNING BACK" and marks the spot with an X, then turns back.
3. Endless survival: lava rises from the floor (accelerating); fully submerged members vanish and whatever
   they carried collapses; climber touching lava = game over; a member falling onto the climber's head =
   game over. Score +10/s. Members sink in up to 4× faster over time.
4. Directional exit plates (all in `src/lib/game/gates.js`, drawn by `components/game/drawGate.js`):
   **wrong implementation, to be rebuilt from scratch.** Treat as a placeholder, not a spec; don't extend it.

## Design history (why things are the way they are)
- Problem: stacking on one side forms an easy staircase. Problem: you could clear without ever turning the
  view. Answers so far: endless lava (no fixed goal) + directional plates forcing face changes.
- Earlier ideas still on the table: limited piece count; per-face checkpoints visited in order; walls that
  are solid from one face but a ledge from another; ceilings passable from one face only.

## Origins
- Concept/prototype: ChatGPT share cx_6ad49dcab66881918b71ffcae73284c9 (React + R3F + Rapier prototype).
- Built for a hackathon on Base44 (app id 6ad30f22d4155592064c7d5b). Copied here on 2026-10-18 and
  converted from Base44's TanStack Start + Cloudflare template to a plain Vite + React SPA (no backend).
  The untouched Base44 files removed in that conversion are in `../stairstack-base44-backup/`.
