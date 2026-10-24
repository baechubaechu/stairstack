-- STAIRSTACK: what happens around the runs — who arrives, on what, which runs get thrown away, and
-- what breaks. `runs` only holds the runs that ended in a game over; this fills in the rest of the
-- funnel. Safe to run twice.
--
--   visit        a page load: device, screen, language, where the link came from
--   run_start    a run began (Game Start, Retry or Restart)
--   run_abandon  a run that ended without a game over: restarted mid-run, or the tab closed
--   error        a script error, an engine that failed to start, a canvas that failed to draw

create table if not exists public.events (
  id          bigint generated always as identity primary key,
  created_at  timestamptz not null default now(),
  player_id   uuid        not null,                -- the browser's random id (as in runs)
  session_id  uuid        not null,                -- one page load
  kind        text        not null check (kind in ('visit', 'run_start', 'run_abandon', 'error')),
  data        jsonb,
  constraint events_data_size check (data is null or pg_column_size(data) < 4000)
);

create index if not exists events_kind_created_idx on public.events (kind, created_at desc);
create index if not exists events_player_idx on public.events (player_id, created_at desc);
create index if not exists events_session_idx on public.events (session_id);

alter table public.events enable row level security;

drop policy if exists "anyone can log an event" on public.events;
create policy "anyone can log an event" on public.events
  for insert to anon, authenticated with check (true);
-- No SELECT policy: read in the dashboard (service role) only.
grant insert on public.events to anon, authenticated;

-- One browser can't flood it (300 events an hour), nor everyone together (600 a minute).
create or replace function public.guard_event() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  n int;
begin
  select count(*) into n from public.events
    where player_id = new.player_id and created_at > now() - interval '1 hour';
  if n >= 300 then raise exception 'rate limit: too many events this hour'; end if;
  select count(*) into n from public.events where created_at > now() - interval '1 minute';
  if n >= 600 then raise exception 'rate limit: too many events right now'; end if;
  new.created_at := now();
  return new;
end $$;

drop trigger if exists guard_event on public.events;
create trigger guard_event before insert on public.events
  for each row execute function public.guard_event();

revoke all on function public.guard_event() from public, anon, authenticated;

-- ---------------------------------------------------------------- views for reading the beta
-- Dashboard only (no grants to anon): run them in the SQL Editor or the Table Editor.

-- Per day: visitors, how many were on a phone, how many started a run, how many finished one.
create or replace view public.beta_daily as
  with v as (
    select date_trunc('day', created_at) as day, player_id, (data ->> 'touch')::boolean as touch
    from public.events where kind = 'visit'
  ),
  s as (select date_trunc('day', created_at) as day, player_id from public.events where kind = 'run_start'),
  r as (select date_trunc('day', created_at) as day, player_id from public.runs)
  select d.day,
         (select count(distinct player_id) from v where v.day = d.day) as visitors,
         (select count(distinct player_id) from v where v.day = d.day and touch) as phone_visitors,
         (select count(distinct player_id) from s where s.day = d.day) as players,
         (select count(*) from s where s.day = d.day) as runs_started,
         (select count(*) from r where r.day = d.day) as runs_finished,
         (select count(*) from public.events e where e.kind = 'run_abandon' and date_trunc('day', e.created_at) = d.day) as runs_abandoned,
         (select count(*) from public.events e where e.kind = 'error' and date_trunc('day', e.created_at) = d.day) as errors
  from (select distinct day from v union select distinct day from s union select distinct day from r) d
  order by d.day desc;

-- When runs end: finished runs in 10-second buckets of time survived, split by what ended them.
create or replace view public.beta_deaths as
  select (floor(survived_s / 10) * 10)::int as survived_from_s,
         count(*) filter (where cause = 'lava') as lava,
         count(*) filter (where cause = 'head') as head,
         round(avg(best_height)::numeric, 1) as avg_best_height
  from public.runs
  group by 1
  order by 1;

-- Score spread: finished runs in buckets of 500 points.
create or replace view public.beta_scores as
  select (floor(score / 500) * 500)::int as score_from, count(*) as runs
  from public.runs
  group by 1
  order by 1;

-- Where the visitors came from (referrer host or utm_source).
create or replace view public.beta_sources as
  select coalesce(nullif(data ->> 'utm', ''), nullif(data ->> 'ref', ''), '(direct)') as source,
         count(distinct player_id) as visitors
  from public.events where kind = 'visit'
  group by 1
  order by 2 desc;

-- The latest errors, newest first.
create or replace view public.beta_errors as
  select created_at, data ->> 'where' as at, data ->> 'message' as message, data ->> 'ua' as ua, player_id
  from public.events where kind = 'error'
  order by created_at desc
  limit 200;

revoke all on public.beta_daily, public.beta_deaths, public.beta_scores, public.beta_sources, public.beta_errors
  from anon, authenticated;
