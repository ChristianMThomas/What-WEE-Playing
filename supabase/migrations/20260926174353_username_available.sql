-- Registration checks username availability before signUp(), when the visitor
-- isn't signed in yet and can't read profiles. Usernames are public display
-- names, so revealing whether one is taken is fine.
create function public.username_available(name text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select not exists (
    select 1 from public.profiles where lower(username) = lower(name)
  );
$$;

revoke execute on function public.username_available(text) from public;
grant execute on function public.username_available(text) to anon, authenticated;
