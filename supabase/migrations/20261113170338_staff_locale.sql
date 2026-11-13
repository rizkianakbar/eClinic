-- Each staff member picks the screen language (Bahasa Indonesia or English) in Akun saya. Printed documents
-- and exports stay in Bahasa Indonesia whatever this says.

alter table public.profiles
  add column locale text not null default 'id'
  constraint profiles_locale_check check (locale in ('id', 'en'));

comment on column public.profiles.locale is 'Screen language of this staff member: id (default) or en.';

-- Staff cannot update their own profile row (the column grants include role), so changing one's language goes
-- through this function: it touches only the caller's own locale.
create or replace function private.set_my_locale(p_locale text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null then
    raise exception 'not_allowed';
  end if;

  if p_locale not in ('id', 'en') then
    raise exception 'invalid_locale';
  end if;

  update public.profiles
     set locale = p_locale
   where id = auth.uid()
     and is_active;
end;
$$;

revoke execute on function private.set_my_locale(text) from public, anon;
grant execute on function private.set_my_locale(text) to authenticated;

create or replace function public.set_my_locale(p_locale text)
returns void
language sql
security invoker
set search_path = ''
as $$
  select private.set_my_locale(p_locale);
$$;

revoke execute on function public.set_my_locale(text) from public, anon;
grant execute on function public.set_my_locale(text) to authenticated;
