create or replace function public.health_check()
returns boolean
language sql
stable
security invoker
set search_path = ''
as $$
  select true;
$$;

grant execute on function public.health_check() to anon, authenticated;
