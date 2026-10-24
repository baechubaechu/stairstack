-- STAIRSTACK: `public.rls_auto_enable()` is the function behind the `ensure_rls` event trigger
-- (it switches row level security on for every new table). It was made outside these migrations,
-- with the default grant that lets anyone execute it — so the API lists it as a callable RPC for
-- anon and signed-in users. Nobody needs to call it: the event trigger runs it on its own,
-- whoever holds EXECUTE. Take that grant back. Safe to run twice, and on a database without it.

do $$
begin
  if to_regprocedure('public.rls_auto_enable()') is not null then
    revoke execute on function public.rls_auto_enable() from public, anon, authenticated;
  end if;
end
$$;
