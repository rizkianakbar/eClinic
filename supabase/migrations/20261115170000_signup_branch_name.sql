-- Signup names the company and its first branch separately ("Klinik Sehat Sentosa" / "Cabang Depok"), so the
-- header never reads the same name twice.

drop function public.create_clinic_tenant(uuid, text, text, text, text, text);

create function public.create_clinic_tenant(
  p_user_id uuid,
  p_email text,
  p_full_name text,
  p_clinic_name text,
  p_slug text,
  p_locale text default 'id',
  p_branch_name text default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_organization_id uuid;
  v_clinic_id uuid;
begin
  insert into public.organizations (name, slug) values (p_clinic_name, p_slug)
  returning id into v_organization_id;

  insert into public.clinics (organization_id, name, email)
  values (v_organization_id, coalesce(nullif(trim(p_branch_name), ''), p_clinic_name), p_email)
  returning id into v_clinic_id;

  -- profiles_before_insert / after_insert set the organization, the active branch and the membership.
  insert into public.profiles (id, clinic_id, role, full_name, email, locale)
  values (p_user_id, v_clinic_id, 'owner', p_full_name, p_email, p_locale);

  return v_organization_id;
end;
$$;

revoke execute on function public.create_clinic_tenant(uuid, text, text, text, text, text, text) from public, anon, authenticated;
grant execute on function public.create_clinic_tenant(uuid, text, text, text, text, text, text) to service_role;
