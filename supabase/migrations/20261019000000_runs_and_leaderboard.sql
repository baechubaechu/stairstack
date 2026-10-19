-- STAIRSTACK: run logs and the leaderboard (applied by the Supabase GitHub integration, or paste into the SQL Editor).
-- The browser holds only the anon key, so everything here is locked down by row-level security:
-- anonymous players may INSERT a run (within sane limits) and READ the leaderboard view, nothing else.

create table if not exists public.runs (
  id            bigint generated always as identity primary key,
  created_at    timestamptz not null default now(),
  player_id     uuid        not null,            -- random id kept in the browser's localStorage
  name          text        not null default 'Anonymous' check (char_length(name) between 1 and 16),
  score         int         not null check (score between 0 and 1000000),
  time_score    int         not null check (time_score >= 0),
  height_score  int         not null check (height_score >= 0),
  survived_s    real        not null check (survived_s between 0 and 36000),
  best_height   real        not null check (best_height between 0 and 1000),
  stack_top     real,
  members       int         check (members >= 0),   -- members on the board at the end
  dropped       int         check (dropped >= 0),   -- members dropped during the run
  floors        int         check (floors >= 0),    -- floor slabs stood on
  face_turns    int         check (face_turns >= 0),
  lava          real,
  cause         text        check (cause in ('lava', 'head')),
  timeline      jsonb,                              -- [{t, h, lava}] sampled while the run lasted
  client        jsonb,                              -- {version, viewport, locale}
  constraint timeline_size check (timeline is null or pg_column_size(timeline) < 20000)
);

create index if not exists runs_score_idx on public.runs (score desc);
create index if not exists runs_player_idx on public.runs (player_id, created_at desc);

alter table public.runs enable row level security;

drop policy if exists "anyone can submit a run" on public.runs;
create policy "anyone can submit a run" on public.runs
  for insert to anon, authenticated with check (true);

-- No SELECT policy on the table itself: raw rows (player ids, timelines) stay private.
-- The dashboard / service role can read them for balance analysis.

-- Public top list, without player ids. Runs as its owner so it can read the locked table.
create or replace view public.leaderboard as
  select name, score, survived_s, best_height, floors, created_at
  from public.runs
  order by score desc, created_at asc
  limit 100;

grant select on public.leaderboard to anon, authenticated;
grant insert on public.runs to anon, authenticated;
