-- STAIRSTACK: scores per player, anonymously. A player is the random id their browser keeps; it is
-- never published. Instead each player shows up under a tag — a SHA-256 of that id — which the
-- browser can compute for itself to find its own row, but nobody can turn back into the id.

-- One row per player: their best run, the name they used most recently, and how many runs they have.
create or replace view public.player_bests as
  with best as (
    select distinct on (player_id) player_id, score, survived_s, best_height, floors, created_at
    from public.runs
    order by player_id, score desc, created_at asc
  ),
  per_player as (
    select player_id,
           count(*) as runs,
           (array_agg(name order by created_at desc))[1] as name
    from public.runs
    group by player_id
  )
  select encode(sha256(convert_to(b.player_id::text, 'UTF8')), 'hex') as tag,
         p.name,
         b.score,
         b.survived_s,
         b.best_height,
         b.floors,
         p.runs,
         b.created_at,
         rank() over (order by b.score desc) as rank
  from best b
  join per_player p using (player_id);

-- The public top list is now one entry per player rather than one per run.
drop view if exists public.leaderboard;
create view public.leaderboard as
  select tag, name, score, survived_s, best_height, floors, runs, rank
  from public.player_bests
  order by rank, created_at
  limit 100;

grant select on public.player_bests to anon, authenticated;
grant select on public.leaderboard to anon, authenticated;
