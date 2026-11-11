-- Staff management rules, polis, doctor schedules with daily quota.

-- Staff (profiles) ----------------------------------------------------------
-- Email is copied from auth.users at creation so the staff list can show it
-- (auth.users is not readable through the API).
alter table public.profiles add column email text;

-- Owner and admin manage staff, but: nobody edits their own account here (no
-- self-deactivation or self-promotion), and only an owner touches owner accounts.
drop policy "owner and admin add profiles" on public.profiles;
drop policy "owner and admin update profiles" on public.profiles;

create policy "owner and admin add profiles" on public.profiles
  for insert to authenticated
  with check (
    clinic_id = (select private.auth_clinic_id())
    and (select private.auth_role()) in ('owner', 'admin')
    and (role <> 'owner' or (select private.auth_role()) = 'owner')
  );

create policy "owner and admin update other profiles" on public.profiles
  for update to authenticated
  using (
    clinic_id = (select private.auth_clinic_id())
    and (select private.auth_role()) in ('owner', 'admin')
    and id <> (select auth.uid())
    and (role <> 'owner' or (select private.auth_role()) = 'owner')
  )
  with check (
    clinic_id = (select private.auth_clinic_id())
    and (role <> 'owner' or (select private.auth_role()) = 'owner')
  );

revoke all on public.profiles from anon;
revoke update, delete, truncate on public.profiles from authenticated;
grant update (full_name, role, nik, sip_number, is_active) on public.profiles to authenticated;

-- Polis ---------------------------------------------------------------------

create table public.polis (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid not null references public.clinics (id),
  name text not null check (length(name) between 1 and 100),
  bpjs_poli_code text check (length(bpjs_poli_code) <= 10),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index polis_clinic_name_key on public.polis (clinic_id, lower(name));

create trigger polis_set_updated_at
  before update on public.polis
  for each row execute function public.set_updated_at();

create trigger polis_audit
  after insert or update or delete on public.polis
  for each row execute function private.audit_row_change();

revoke all on public.polis from anon;
revoke delete, truncate on public.polis from authenticated;

alter table public.polis enable row level security;

create policy "staff read polis in own clinic" on public.polis
  for select to authenticated
  using (clinic_id = (select private.auth_clinic_id()));

create policy "owner and admin add polis" on public.polis
  for insert to authenticated
  with check (
    clinic_id = (select private.auth_clinic_id())
    and (select private.auth_role()) in ('owner', 'admin')
  );

-- No delete policy: deactivate with is_active = false.
create policy "owner and admin update polis" on public.polis
  for update to authenticated
  using (
    clinic_id = (select private.auth_clinic_id())
    and (select private.auth_role()) in ('owner', 'admin')
  )
  with check (clinic_id = (select private.auth_clinic_id()));

-- Doctor schedules ----------------------------------------------------------
-- Weekly practice hours per doctor and poli. quota = max patients per session
-- per day, enforced at visit registration. day_of_week is ISO: 1 = Monday.

create extension if not exists btree_gist with schema extensions;

create type public.timerange as range (subtype = time);

create table public.doctor_schedules (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid not null references public.clinics (id),
  doctor_id uuid not null references public.profiles (id),
  poli_id uuid not null references public.polis (id),
  day_of_week smallint not null check (day_of_week between 1 and 7),
  start_time time not null,
  end_time time not null,
  quota integer not null check (quota between 1 and 500),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint doctor_schedules_time_order check (end_time > start_time),
  -- A doctor cannot be in two active sessions at the same time.
  constraint doctor_schedules_no_overlap exclude using gist (
    doctor_id with =,
    day_of_week with =,
    public.timerange(start_time, end_time) with &&
  ) where (is_active)
);

create index doctor_schedules_clinic_day_idx on public.doctor_schedules (clinic_id, day_of_week);
create index doctor_schedules_doctor_id_idx on public.doctor_schedules (doctor_id);
create index doctor_schedules_poli_id_idx on public.doctor_schedules (poli_id);

create trigger doctor_schedules_set_updated_at
  before update on public.doctor_schedules
  for each row execute function public.set_updated_at();

create trigger doctor_schedules_audit
  after insert or update or delete on public.doctor_schedules
  for each row execute function private.audit_row_change();

revoke all on public.doctor_schedules from anon;
revoke delete, truncate on public.doctor_schedules from authenticated;

alter table public.doctor_schedules enable row level security;

create policy "staff read schedules in own clinic" on public.doctor_schedules
  for select to authenticated
  using (clinic_id = (select private.auth_clinic_id()));

-- The doctor must be a doctor and the poli must belong to the same clinic.
create policy "owner and admin add schedules" on public.doctor_schedules
  for insert to authenticated
  with check (
    clinic_id = (select private.auth_clinic_id())
    and (select private.auth_role()) in ('owner', 'admin')
    and exists (
      select 1 from public.profiles p
      where p.id = doctor_id and p.clinic_id = doctor_schedules.clinic_id and p.role = 'doctor'
    )
    and exists (
      select 1 from public.polis pl
      where pl.id = poli_id and pl.clinic_id = doctor_schedules.clinic_id
    )
  );

create policy "owner and admin update schedules" on public.doctor_schedules
  for update to authenticated
  using (
    clinic_id = (select private.auth_clinic_id())
    and (select private.auth_role()) in ('owner', 'admin')
  )
  with check (
    clinic_id = (select private.auth_clinic_id())
    and exists (
      select 1 from public.profiles p
      where p.id = doctor_id and p.clinic_id = doctor_schedules.clinic_id and p.role = 'doctor'
    )
    and exists (
      select 1 from public.polis pl
      where pl.id = poli_id and pl.clinic_id = doctor_schedules.clinic_id
    )
  );
