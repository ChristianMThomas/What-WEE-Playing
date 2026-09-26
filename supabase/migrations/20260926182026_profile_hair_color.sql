-- Hair color as a fourth avatar choice. Existing profiles get 'default', which
-- the app draws as the original dark brown.
alter table public.profiles
  add column hair_color text not null default 'default';

-- Same as the original trigger, plus hair_color from the signup metadata.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.is_anonymous then
    return new;
  end if;

  insert into public.profiles (id, username, skin_tone, hairstyle, hair_color, outfit)
  values (
    new.id,
    new.raw_user_meta_data ->> 'username',
    coalesce(new.raw_user_meta_data ->> 'skin_tone', 'default'),
    coalesce(new.raw_user_meta_data ->> 'hairstyle', 'default'),
    coalesce(new.raw_user_meta_data ->> 'hair_color', 'default'),
    coalesce(new.raw_user_meta_data ->> 'outfit', 'default')
  );
  return new;
end;
$$;
