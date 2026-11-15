-- SaaS tenants: each clinic is served at <slug>.<root domain>. A clinic signs itself up from the
-- marketing site; create_clinic_tenant() creates the clinic and its owner profile in one transaction.

-- Subdomain -------------------------------------------------------------------------

alter table public.clinics add column slug text;

-- The first clinic (the one this app was built with) becomes the public demo at clinic.<root domain>.
update public.clinics
   set slug = 'clinic'
 where id = (select id from public.clinics order by created_at, id limit 1);

update public.clinics set slug = 'clinic-' || left(id::text, 8) where slug is null;

alter table public.clinics alter column slug set not null;

-- One DNS label: 3–32 lowercase letters, digits and single hyphens, not starting or ending with a hyphen.
alter table public.clinics add constraint clinics_slug_format
  check (slug ~ '^[a-z0-9][a-z0-9-]{1,30}[a-z0-9]$' and slug !~ '--');

create unique index clinics_slug_key on public.clinics (slug);

-- Not in the column grants on purpose: the address is fixed after signup (links, bookmarks, letterheads).
-- (grant update (name, address, ...) on public.clinics stays as it was.)

-- Signup ------------------------------------------------------------------------------
-- Called by the server with the service role, right after it created the auth user. Reserved slugs are
-- checked in the app (lib/tenant.ts); the unique index is the final word on a race.

create function public.create_clinic_tenant(
  p_user_id uuid,
  p_email text,
  p_full_name text,
  p_clinic_name text,
  p_slug text,
  p_locale text default 'id'
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_clinic_id uuid;
begin
  insert into public.clinics (name, slug, email)
  values (p_clinic_name, p_slug, p_email)
  returning id into v_clinic_id;

  insert into public.profiles (id, clinic_id, role, full_name, email, locale)
  values (p_user_id, v_clinic_id, 'owner', p_full_name, p_email, p_locale);

  return v_clinic_id;
end;
$$;

revoke execute on function public.create_clinic_tenant(uuid, text, text, text, text, text) from public, anon, authenticated;
grant execute on function public.create_clinic_tenant(uuid, text, text, text, text, text) to service_role;
