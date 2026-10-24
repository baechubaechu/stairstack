-- STAIRSTACK: the first-run guide reports how far each new player gets through it (`guide` events:
-- {step: "drop" | "climb", event: "done"} as each step is done, and {step: "steps", event: "done" |
-- "skip:<step>"} when the steps end). Safe to run twice.

alter table public.events drop constraint if exists events_kind_check;
alter table public.events add constraint events_kind_check
  check (kind in ('visit', 'run_start', 'run_abandon', 'error', 'guide'));

-- How far new players get: of everyone who started a run, how many finished each guide step, and
-- how many skipped. Dashboard only.
create or replace view public.beta_guide as
  select
    (select count(distinct player_id) from public.events where kind = 'run_start') as players,
    (select count(distinct player_id) from public.events where kind = 'guide' and data ->> 'step' = 'drop') as dropped_a_member,
    (select count(distinct player_id) from public.events where kind = 'guide' and data ->> 'step' = 'climb') as climbed_onto_one,
    (select count(distinct player_id) from public.events where kind = 'guide' and data ->> 'step' = 'steps' and data ->> 'event' = 'done') as finished_guide,
    (select count(distinct player_id) from public.events where kind = 'guide' and data ->> 'event' like 'skip%') as skipped_guide;

revoke all on public.beta_guide from anon, authenticated;
