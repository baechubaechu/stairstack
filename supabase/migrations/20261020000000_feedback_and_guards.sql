-- STAIRSTACK: bug / idea reports, and guards against spam and doctored scores.
-- Safe to run twice (everything is "if not exists" / "or replace" / dropped first).
--
-- The browser holds only the anon key and its player id is a random uuid it made itself, so none
-- of this can stop a determined cheat. What it does: every submitted run must add up the way the
-- game adds it up and stay physically plausible, nobody can flood either table from one browser,
-- and a global cap keeps a script rotating ids from swamping the free tier.

-- ---------------------------------------------------------------- reports
create table if not exists public.feedback (
  id          bigint generated always as identity primary key,
  created_at  timestamptz not null default now(),
  player_id   uuid        not null,
  kind        text        not null check (kind in ('bug', 'idea', 'other')),
  message     text        not null check (char_length(btrim(message)) between 1 and 2000),
  context     jsonb,      -- the run's state when it was sent: score, time, face, viewport, locale…
  constraint feedback_context_size check (context is null or pg_column_size(context) < 8000)
);

create index if not exists feedback_player_idx on public.feedback (player_id, created_at desc);
create index if not exists feedback_created_idx on public.feedback (created_at desc);

alter table public.feedback enable row level security;

drop policy if exists "anyone can send a report" on public.feedback;
create policy "anyone can send a report" on public.feedback
  for insert to anon, authenticated with check (true);
-- No SELECT policy: reports are read in the dashboard (service role) only.
grant insert on public.feedback to anon, authenticated;

-- ---------------------------------------------------------------- run guard
-- Runs as the table owner (security definer) so it can count recent rows the anon role can't see.
create or replace function public.guard_run() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  n int;
begin
  -- The score is survival + height, exactly as the game adds it up.
  if new.score <> new.time_score + new.height_score then
    raise exception 'rejected: score does not add up';
  end if;
  -- Survival: 10 points a second.
  if abs(new.time_score - floor(new.survived_s * 10)) > 2 then
    raise exception 'rejected: time score does not match the time survived';
  end if;
  -- Height: a point per centimetre of the best height stood at.
  if new.height_score > floor(new.best_height * 100) + 1 then
    raise exception 'rejected: height score does not match the height';
  end if;
  -- Nobody builds and climbs faster than this, however good.
  if new.best_height > 5 + new.survived_s * 1.5 then
    raise exception 'rejected: climbed implausibly fast';
  end if;
  if new.floors is not null and new.floors > floor(new.best_height / 6) + 1 then
    raise exception 'rejected: more storeys than the height allows';
  end if;
  if new.dropped is not null and new.dropped > 20 + new.survived_s * 10 then
    raise exception 'rejected: more members dropped than time allows';
  end if;

  -- One browser: a run every 10 s at most, 60 an hour.
  select count(*) into n from public.runs
    where player_id = new.player_id and created_at > now() - interval '10 seconds';
  if n > 0 then raise exception 'rate limit: runs too close together'; end if;
  select count(*) into n from public.runs
    where player_id = new.player_id and created_at > now() - interval '1 hour';
  if n >= 60 then raise exception 'rate limit: too many runs this hour'; end if;
  -- Everyone together: 120 runs a minute.
  select count(*) into n from public.runs where created_at > now() - interval '1 minute';
  if n >= 120 then raise exception 'rate limit: too many runs right now'; end if;

  new.created_at := now(); -- the client doesn't get to backdate a run
  return new;
end $$;

drop trigger if exists guard_run on public.runs;
create trigger guard_run before insert on public.runs
  for each row execute function public.guard_run();

-- ---------------------------------------------------------------- report guard
create or replace function public.guard_feedback() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  n int;
begin
  -- One browser: a report every 20 s at most, 20 a day.
  select count(*) into n from public.feedback
    where player_id = new.player_id and created_at > now() - interval '20 seconds';
  if n > 0 then raise exception 'rate limit: reports too close together'; end if;
  select count(*) into n from public.feedback
    where player_id = new.player_id and created_at > now() - interval '1 day';
  if n >= 20 then raise exception 'rate limit: too many reports today'; end if;
  -- Everyone together: 60 reports a minute.
  select count(*) into n from public.feedback where created_at > now() - interval '1 minute';
  if n >= 60 then raise exception 'rate limit: too many reports right now'; end if;

  new.message := btrim(new.message);
  new.created_at := now();
  return new;
end $$;

drop trigger if exists guard_feedback on public.feedback;
create trigger guard_feedback before insert on public.feedback
  for each row execute function public.guard_feedback();

-- The guards are trigger functions: nobody calls them directly.
revoke all on function public.guard_run() from public, anon, authenticated;
revoke all on function public.guard_feedback() from public, anon, authenticated;
