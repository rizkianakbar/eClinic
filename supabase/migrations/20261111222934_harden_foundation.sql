-- Harden the foundation (Supabase security/performance advisors):
-- 1. SECURITY DEFINER functions move out of the API-exposed `public` schema
--    into `private`, so they are not callable via /rest/v1/rpc.
-- 2. Policies wrap auth helpers in (select ...) so they run once per query.
-- 3. Profiles: no hard deletes, and one SELECT policy instead of two.

create schema if not exists private;
revoke all on schema private from public, anon;
grant usage on schema private to authenticated;

alter function public.auth_clinic_id() set schema private;
alter function public.auth_role() set schema private;
alter function public.next_counter(text) set schema private;
alter function public.audit_row_change() set schema private;

-- RLS helpers and the counter are used by signed-in users (via policies and
-- future RPCs); the audit trigger function needs no caller grant.
revoke execute on all functions in schema private from public, anon;
grant execute on function private.auth_clinic_id() to authenticated;
grant execute on function private.auth_role() to authenticated;
grant execute on function private.next_counter(text) to authenticated;

-- next_counter() referenced public.auth_clinic_id() in its body.
create or replace function private.next_counter(p_scope text)
returns bigint
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_clinic_id uuid := private.auth_clinic_id();
  v_value bigint;
begin
  if v_clinic_id is null then
    raise exception 'not authenticated' using errcode = '42501';
  end if;

  insert into public.counters (clinic_id, scope, value)
  values (v_clinic_id, p_scope, 1)
  on conflict (clinic_id, scope)
  do update set value = public.counters.value + 1
  returning value into v_value;

  return v_value;
end;
$$;

-- Policies ------------------------------------------------------------------

drop policy "staff read own clinic" on public.clinics;
drop policy "owner and admin update own clinic" on public.clinics;
drop policy "staff read profiles in own clinic" on public.profiles;
drop policy "owner and admin manage profiles" on public.profiles;
drop policy "owner and admin read audit logs" on public.audit_logs;

create policy "staff read own clinic" on public.clinics
  for select to authenticated
  using (id = (select private.auth_clinic_id()));

create policy "owner and admin update own clinic" on public.clinics
  for update to authenticated
  using (
    id = (select private.auth_clinic_id())
    and (select private.auth_role()) in ('owner', 'admin')
  )
  with check (id = (select private.auth_clinic_id()));

-- Own profile stays readable when inactive, so the app can tell the user apart
-- from a missing account.
create policy "staff read profiles in own clinic" on public.profiles
  for select to authenticated
  using (clinic_id = (select private.auth_clinic_id()) or id = (select auth.uid()));

create policy "owner and admin add profiles" on public.profiles
  for insert to authenticated
  with check (
    clinic_id = (select private.auth_clinic_id())
    and (select private.auth_role()) in ('owner', 'admin')
  );

-- Deactivate with is_active = false; there is no delete policy.
create policy "owner and admin update profiles" on public.profiles
  for update to authenticated
  using (
    clinic_id = (select private.auth_clinic_id())
    and (select private.auth_role()) in ('owner', 'admin')
  )
  with check (clinic_id = (select private.auth_clinic_id()));

create policy "owner and admin read audit logs" on public.audit_logs
  for select to authenticated
  using (
    clinic_id = (select private.auth_clinic_id())
    and (select private.auth_role()) in ('owner', 'admin')
  );
