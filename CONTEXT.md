# STAIRSTACK — Context

## Game concept
Browser game. One single 3D physics world (Rapier) with cuboid members (slabs, planks, blocks…) that fall,
collide and tilt. The same rigid bodies are orthographically projected onto an elevation, where a 2D climber
walks/jumps on their silhouettes (platforms / ramps / ceilings). Top view = placing; elevation = climbing.

## Controls
- Mouse position: aim X/Z on the top view, snapped to a 0.5 m grid (`CELL`; member sizes are whole cells, heights whole quarter-metres, the whole footprint stays on the plate) · Wheel: rotate 90° around Y · Click: drop now (members go in square, no random tilt)
- Settling (`tipping.js`): members never slide or twist. Landing with its centre of mass over its support,
  a member stays level; hanging off it, it tips over that edge about one grid axis (the one it hangs out
  further along; dead diagonal → its long side, square → x), moving only as far as the pivot takes it.
  It lands on a slope's top edge, so it tips to lie along the slope by the same rule. A centre within
  0.1 m of the support's edge still holds. Before the drop the same rule is forecast (`tipForecast`,
  downward ray probes under the footprint): an arrow on the plan footprint, and a curved arrow on the
  member in flight when it tips across the face being read.
- A/D move, W/Space jump · Hold into an elevation edge 0.1 s: turn to the next face · Esc: pause
- Jump feel: coyote time, jump buffer, fresh-press only, tap = low hop / hold = full jump, apex hang,
  heavier fall; running accelerates/decelerates; ledges up to 0.35 m are walked up (step-up).
- Layout: elevation left, plan right; between them a column of the next QUEUE_AHEAD (3) members, nearest on top; the member in play is in the footer (NOW)

## Current game state (as built on Base44, now developed here)
1. Top view + elevation, face widget (3D cube showing the viewed face), compass N/E/S/W. The top view
   is drawn in perspective from the side being read (its near edge is the elevation's plane, its
   left-right the elevation's), turning with the face and rising with the climber; members are 3D
   boxes. Drawing only — the mouse aims on the plane the member will land at.
   FRONT = viewed from SOUTH (start), RIGHT = EAST, BACK = NORTH, LEFT = WEST.
2. Face switching with dashed turn lines at the elevation edges. A blocked face (climber's spot is taken)
   shakes, tints red, shows "BLOCKED — TURNING BACK" and marks the spot with an X, then turns back.
3. Endless survival: lava rises from the floor (waits 5 s, then accelerates); fully submerged members set
   into fixed basalt ground the tower keeps standing on (basalt deep under the lava and below the view is
   deleted for performance) — they used to vanish, which collapsed the tower and made climbing high
   impossible. Climber touching lava = game over; a member falling onto the climber's head = game over.
   Score = survival (+10/s) + height (1 point per cm of the best height the climber has *stood* at;
   jump apexes don't count). Members sink in on their own over 5 s, up to 2.5× faster about a minute in. The elevation window follows the climber up
   and members are released from its top.
4. Floor slabs (`src/lib/game/floors.js`) — replaced the old directional plates. A concrete slab covers
   the plan except a 1.8 m gap strip along one edge: from the two faces looking along that edge it is a
   wall-to-wall ceiling the climber can't jump through; from the other two the gap shows, the only way
   up. Pencilled (translucent, no collider — dropped members fall through) until the climber stands on
   it, then solid ground; the next storey appears 6 m higher, gap hidden from the face they're on.
   First storey at 6.5 m. This is what forces turning the tower.

## Design history (why things are the way they are)
- Problem: stacking on one side forms an easy staircase. Problem: you could clear without ever turning the
  view. Answers so far: endless lava (no fixed goal) + directional plates forcing face changes.
- Ideas not built yet (piece limits, per-face checkpoints, goal plates, …): see `ROADMAP.md`.

## Origins
- Concept/prototype: ChatGPT share cx_6ad49dcab66881918b71ffcae73284c9 (React + R3F + Rapier prototype).
- Built for a hackathon on Base44 (app id 6ad30f22d4155592064c7d5b). Copied here on 2026-10-18 and
  converted from Base44's TanStack Start + Cloudflare template to a plain Vite + React SPA (no backend).
  The Base44 template files removed in that conversion were deleted; the app still exists on Base44.
