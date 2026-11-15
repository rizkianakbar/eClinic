-- Branches: one organization (the tenant: subdomain, owner, later billing) runs several clinics (branches).
--
-- A branch is a `clinics` row, so everything operational stays keyed on clinic_id and scoped by
-- private.auth_clinic_id(): queue numbers, visits, stock, invoices, letters, master data and reports never mix
-- between branches. What changes:
--   * organizations above clinics; the subdomain moves from clinics to organizations.
--   * clinic_staff: which branches a staff member may work at. Owners are members of every branch.
--   * profiles.active_clinic_id: the branch this person is working at now. auth_clinic_id() returns it only
--     while the person is still a member of that (active) branch. profiles.clinic_id keeps meaning "home
--     branch" (where the account was created).
--   * Patients belong to the organization (one MRN across branches). Their history across branches is read only
--     through checked functions (patient_visit_history, patient_previous_visits); the visit tables keep their
--     per-branch rules, so no queue, worklist or report can show another branch's patients.

-- Organizations ------------------------------------------------------------------------

create table public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(name) between 1 and 200),
  slug text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint organizations_slug_format check (slug ~ '^[a-z0-9][a-z0-9-]{1,30}[a-z0-9]$' and slug !~ '--')
);

create unique index organizations_slug_key on public.organizations (slug);

create trigger organizations_set_updated_at
  before update on public.organizations
  for each row execute function public.set_updated_at();

-- Every existing clinic becomes an organization with one branch, keeping its subdomain.
insert into public.organizations (name, slug, created_at)
select name, slug, created_at from public.clinics;

alter table public.clinics add column organization_id uuid references public.organizations (id);

update public.clinics c set organization_id = o.id from public.organizations o where o.slug = c.slug;

alter table public.clinics alter column organization_id set not null;
create index clinics_organization_id_idx on public.clinics (organization_id);

alter table public.clinics drop constraint clinics_slug_format;
drop index public.clinics_slug_key;
alter table public.clinics drop column slug;

-- A branch can be closed; its data stays, nobody can work there.
alter table public.clinics add column is_active boolean not null default true;

-- Profiles: organization and active branch ---------------------------------------------------

alter table public.profiles add column organization_id uuid references public.organizations (id);
update public.profiles p set organization_id = c.organization_id from public.clinics c where c.id = p.clinic_id;
alter table public.profiles alter column organization_id set not null;
create index profiles_organization_id_idx on public.profiles (organization_id);

alter table public.profiles add column active_clinic_id uuid references public.clinics (id);
update public.profiles set active_clinic_id = clinic_id;
create index profiles_active_clinic_id_idx on public.profiles (active_clinic_id);

comment on column public.profiles.clinic_id is 'Home branch: where the account was created.';
comment on column public.profiles.active_clinic_id is 'The branch this person is working at now (null: not chosen yet).';

-- Branch membership ------------------------------------------------------------------------------

create table public.clinic_staff (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid not null references public.clinics (id),
  profile_id uuid not null references public.profiles (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint clinic_staff_member_key unique (clinic_id, profile_id)
);

create index clinic_staff_profile_id_idx on public.clinic_staff (profile_id);

create trigger clinic_staff_set_updated_at
  before update on public.clinic_staff
  for each row execute function public.set_updated_at();

create trigger clinic_staff_audit
  after insert or update or delete on public.clinic_staff
  for each row execute function private.audit_row_change();

insert into public.clinic_staff (clinic_id, profile_id) select clinic_id, id from public.profiles;

-- Organization-level helpers -------------------------------------------------------------------

create function private.auth_organization_id()
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select organization_id from public.profiles where id = auth.uid() and is_active
$$;

-- The active branch, only while the person is still an active member of an open branch.
create or replace function private.auth_clinic_id()
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select p.active_clinic_id
    from public.profiles p
    join public.clinic_staff m on m.profile_id = p.id and m.clinic_id = p.active_clinic_id
    join public.clinics c on c.id = m.clinic_id and c.is_active
   where p.id = auth.uid() and p.is_active
$$;

create function private.is_clinic_member(p_profile_id uuid, p_clinic_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from public.clinic_staff where profile_id = p_profile_id and clinic_id = p_clinic_id)
$$;

revoke execute on function private.auth_organization_id() from public, anon;
revoke execute on function private.is_clinic_member(uuid, uuid) from public, anon;
grant execute on function private.auth_organization_id() to authenticated;
grant execute on function private.is_clinic_member(uuid, uuid) to authenticated;

-- New profiles: the organization comes from the home branch, the account starts at that branch, and owners
-- are members of every branch. Runs as definer: clinic_staff has no write grants.
create function private.profiles_before_insert()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  new.organization_id := (select organization_id from public.clinics where id = new.clinic_id);
  new.active_clinic_id := new.clinic_id;
  return new;
end;
$$;

create function private.profiles_after_insert()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.clinic_staff (clinic_id, profile_id)
  select c.id, new.id
    from public.clinics c
   where c.id = new.clinic_id or (new.role = 'owner' and c.organization_id = new.organization_id)
  on conflict do nothing;
  return new;
end;
$$;

revoke execute on function private.profiles_before_insert() from public, anon, authenticated;
revoke execute on function private.profiles_after_insert() from public, anon, authenticated;

create trigger profiles_before_insert
  before insert on public.profiles
  for each row execute function private.profiles_before_insert();

create trigger profiles_after_insert
  after insert on public.profiles
  for each row execute function private.profiles_after_insert();

-- Policies that meant "staff of this clinic" now mean "member of this branch" ------------------------

drop policy "staff read profiles in own clinic" on public.profiles;
drop policy "owner and admin update other profiles" on public.profiles;

-- Staff of the branch I am working at (pickers, staff list, names on visits), and myself.
create policy "staff read profiles in own branch" on public.profiles
  for select to authenticated
  using (
    id = (select auth.uid())
    or exists (
      select 1 from public.clinic_staff m
       where m.profile_id = profiles.id and m.clinic_id = (select private.auth_clinic_id())
    )
  );

create policy "owner and admin update other profiles" on public.profiles
  for update to authenticated
  using (
    exists (
      select 1 from public.clinic_staff m
       where m.profile_id = profiles.id and m.clinic_id = (select private.auth_clinic_id())
    )
    and (select private.auth_role()) in ('owner', 'admin')
    and id <> (select auth.uid())
    and (role <> 'owner' or (select private.auth_role()) = 'owner')
  )
  with check (
    organization_id = (select private.auth_organization_id())
    and (role <> 'owner' or (select private.auth_role()) = 'owner')
  );

alter table public.clinic_staff enable row level security;

create policy "staff read memberships of own branch" on public.clinic_staff
  for select to authenticated
  using (profile_id = (select auth.uid()) or clinic_id = (select private.auth_clinic_id()));

revoke all on public.clinic_staff from anon;
revoke insert, update, delete, truncate on public.clinic_staff from authenticated;

alter table public.organizations enable row level security;

create policy "staff read own organization" on public.organizations
  for select to authenticated
  using (id = (select private.auth_organization_id()));

revoke all on public.organizations from anon;
revoke insert, update, delete, truncate on public.organizations from authenticated;

drop policy "owner and admin add schedules" on public.doctor_schedules;
drop policy "owner and admin update schedules" on public.doctor_schedules;

create policy "owner and admin add schedules" on public.doctor_schedules
  for insert to authenticated
  with check (
    clinic_id = (select private.auth_clinic_id())
    and (select private.auth_role()) in ('owner', 'admin')
    and exists (
      select 1 from public.profiles p
       where p.id = doctor_schedules.doctor_id and p.role = 'doctor'
         and private.is_clinic_member(p.id, doctor_schedules.clinic_id)
    )
    and exists (select 1 from public.polis pl where pl.id = doctor_schedules.poli_id and pl.clinic_id = doctor_schedules.clinic_id)
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
       where p.id = doctor_schedules.doctor_id and p.role = 'doctor'
         and private.is_clinic_member(p.id, doctor_schedules.clinic_id)
    )
    and exists (select 1 from public.polis pl where pl.id = doctor_schedules.poli_id and pl.clinic_id = doctor_schedules.clinic_id)
  );

create or replace function private.visit_procedures_guard()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_clinic_id uuid;
  v_price bigint;
begin
  if auth.uid() is null then
    return coalesce(new, old);
  end if;
  v_clinic_id := private.assert_exam_editable(coalesce(new.visit_id, old.visit_id));
  if tg_op = 'DELETE' then
    return old;
  end if;

  if tg_op = 'INSERT' or new.service_id is distinct from old.service_id then
    select price into v_price from public.services
     where id = new.service_id and clinic_id = v_clinic_id and is_active and type in ('procedure', 'other');
    if not found then
      raise exception 'service_inactive';
    end if;
    new.price := v_price;
  else
    new.price := old.price;
  end if;

  -- The performer works at this branch (a member), not merely at the organization.
  if not exists (select 1 from public.profiles p
                  where p.id = new.performed_by and private.is_clinic_member(p.id, v_clinic_id)
                    and p.is_active and p.role in ('doctor', 'nurse')) then
    raise exception 'performer_invalid';
  end if;

  new.clinic_id := v_clinic_id;
  if tg_op = 'INSERT' then
    new.created_by := auth.uid();
  end if;
  return new;
end;
$$;

-- Patients belong to the organization ---------------------------------------------------------------

alter table public.patients add column organization_id uuid references public.organizations (id);
update public.patients p set organization_id = c.organization_id from public.clinics c where c.id = p.clinic_id;
alter table public.patients alter column organization_id set not null;
alter table public.patients alter column organization_id set default private.auth_organization_id();
alter table public.patients alter column clinic_id set default private.auth_clinic_id();

comment on column public.patients.clinic_id is 'The branch where the patient was first registered.';

alter table public.patients drop constraint patients_clinic_mrn_key;
drop index public.patients_clinic_nik_key;
drop index public.patients_clinic_bpjs_key;

alter table public.patients add constraint patients_organization_mrn_key unique (organization_id, mrn);
create unique index patients_organization_nik_key on public.patients (organization_id, nik) where nik is not null;
create unique index patients_organization_bpjs_key on public.patients (organization_id, bpjs_number) where bpjs_number is not null;
create index patients_clinic_id_idx on public.patients (clinic_id);

drop policy "staff read patients in own clinic" on public.patients;
drop policy "front desk add patients" on public.patients;
drop policy "front desk update patients" on public.patients;

create policy "staff read patients in own organization" on public.patients
  for select to authenticated
  using (organization_id = (select private.auth_organization_id()) and (select private.auth_clinic_id()) is not null);

create policy "front desk add patients" on public.patients
  for insert to authenticated
  with check (
    organization_id = (select private.auth_organization_id())
    and clinic_id = (select private.auth_clinic_id())
    and (select private.auth_role()) in ('front_desk', 'admin', 'owner')
  );

create policy "front desk update patients" on public.patients
  for update to authenticated
  using (
    organization_id = (select private.auth_organization_id())
    and (select private.auth_clinic_id()) is not null
    and (select private.auth_role()) in ('front_desk', 'admin', 'owner')
  )
  with check (organization_id = (select private.auth_organization_id()));

-- One MRN sequence per organization (private: reached only through next_mrn()).
create table private.organization_counters (
  organization_id uuid not null references public.organizations (id),
  scope text not null,
  value bigint not null default 0,
  primary key (organization_id, scope)
);

alter table private.organization_counters enable row level security;

insert into private.organization_counters (organization_id, scope, value)
select c.organization_id, 'mrn', max(k.value)
  from public.counters k join public.clinics c on c.id = k.clinic_id
 where k.scope = 'mrn'
 group by c.organization_id;

create or replace function private.next_mrn()
returns text
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_organization_id uuid := private.auth_organization_id();
  v_value bigint;
begin
  if v_organization_id is null then
    raise exception 'not authenticated' using errcode = '42501';
  end if;

  insert into private.organization_counters (organization_id, scope, value)
  values (v_organization_id, 'mrn', 1)
  on conflict (organization_id, scope)
  do update set value = private.organization_counters.value + 1
  returning value into v_value;

  return lpad(v_value::text, greatest(6, length(v_value::text)), '0');
end;
$$;

revoke execute on function private.next_mrn() from public, anon;
grant execute on function private.next_mrn() to authenticated;

-- A visit at this branch for any patient of the organization.
create or replace function private.visits_before_insert()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_clinic_id uuid := private.auth_clinic_id();
  v_today date := (now() at time zone 'Asia/Jakarta')::date;
  v_schedule record;
  v_patient record;
  v_taken integer;
begin
  if v_clinic_id is null then
    raise exception 'not authenticated' using errcode = '42501';
  end if;

  select s.doctor_id, s.poli_id, s.day_of_week, s.quota,
         s.is_active and d.is_active and p.is_active as is_open
    into v_schedule
    from public.doctor_schedules s
    join public.profiles d on d.id = s.doctor_id
    join public.polis p on p.id = s.poli_id
   where s.id = new.schedule_id and s.clinic_id = v_clinic_id;
  if not found then
    raise exception 'schedule_not_found';
  end if;
  if not v_schedule.is_open then
    raise exception 'schedule_inactive';
  end if;
  if v_schedule.day_of_week <> extract(isodow from v_today) then
    raise exception 'schedule_not_today';
  end if;

  select is_active, bpjs_number into v_patient
    from public.patients
   where id = new.patient_id and organization_id = private.auth_organization_id();
  if not found then
    raise exception 'patient_not_found';
  end if;
  if not v_patient.is_active then
    raise exception 'patient_inactive';
  end if;
  if new.payer_type = 'bpjs' and v_patient.bpjs_number is null then
    raise exception 'bpjs_number_missing';
  end if;

  -- Serialize registrations for this session today so the quota cannot be exceeded.
  perform pg_advisory_xact_lock(hashtextextended('visit_quota:' || new.schedule_id || ':' || v_today, 0));
  select count(*) into v_taken
    from public.visits
   where schedule_id = new.schedule_id and visit_date = v_today and status <> 'cancelled';
  if v_taken >= v_schedule.quota then
    raise exception 'quota_full';
  end if;

  new.clinic_id := v_clinic_id;
  new.poli_id := v_schedule.poli_id;
  new.doctor_id := v_schedule.doctor_id;
  new.visit_date := v_today;
  new.status := 'waiting';
  new.called_at := null;
  new.skipped_at := null;
  new.cancel_reason := null;
  new.registered_by := auth.uid();
  new.queue_no := private.next_counter('queue:' || v_schedule.poli_id || ':' || v_today);
  return new;
end;
$$;

-- History across branches (read-only, checked) ------------------------------------------------------------

-- A patient's visits at every branch of the organization, newest first. The primary diagnosis only for the
-- roles that may read diagnoses (doctor, nurse, owner), as everywhere else.
create function private.patient_visit_history(p_patient_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_organization_id uuid := private.auth_organization_id();
  v_clinic_id uuid := private.auth_clinic_id();
  v_clinical boolean := private.auth_role() in ('doctor', 'nurse', 'owner');
begin
  if v_clinic_id is null then
    raise exception 'not authenticated' using errcode = '42501';
  end if;
  if not exists (select 1 from public.patients where id = p_patient_id and organization_id = v_organization_id) then
    raise exception 'patient_not_found';
  end if;

  return coalesce((
    select jsonb_agg(r order by r.visit_date desc, r.created_at desc)
      from (
        select v.id, v.visit_date, v.queue_no, v.status, v.payer_type, v.created_at, v.cancel_reason,
               jsonb_build_object('id', c.id, 'name', c.name) as clinic,
               v.clinic_id = v_clinic_id as here,
               jsonb_build_object('name', pl.name) as poli,
               jsonb_build_object('full_name', d.full_name) as doctor,
               case when v_clinical then (
                 select jsonb_build_object('code', vd.icd10_code, 'name', coalesce(i.name_id, i.name, vd.icd10_code))
                   from public.visit_diagnoses vd
                   left join public.icd10_codes i on i.code = vd.icd10_code
                  where vd.visit_id = v.id and vd.is_primary
                  limit 1
               ) end as diagnosis
          from public.visits v
          join public.clinics c on c.id = v.clinic_id and c.organization_id = v_organization_id
          join public.polis pl on pl.id = v.poli_id
          join public.profiles d on d.id = v.doctor_id
         where v.patient_id = p_patient_id
         order by v.visit_date desc, v.created_at desc
         limit 50
      ) r
  ), '[]'::jsonb);
end;
$$;

-- The exam's "previous visits" summary, across branches: diagnoses, signed assessment and plan, medicines.
create function private.patient_previous_visits(p_patient_id uuid, p_exclude_visit_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_organization_id uuid := private.auth_organization_id();
  v_clinic_id uuid := private.auth_clinic_id();
begin
  if v_clinic_id is null then
    raise exception 'not authenticated' using errcode = '42501';
  end if;
  if private.auth_role() not in ('doctor', 'nurse', 'owner') then
    raise exception 'not_allowed' using errcode = '42501';
  end if;
  if not exists (select 1 from public.patients where id = p_patient_id and organization_id = v_organization_id) then
    raise exception 'patient_not_found';
  end if;

  return coalesce((
    select jsonb_agg(r order by r.visit_date desc)
      from (
        select v.id, v.visit_date,
               jsonb_build_object('id', c.id, 'name', c.name) as clinic,
               v.clinic_id = v_clinic_id as here,
               jsonb_build_object('name', pl.name) as poli,
               jsonb_build_object('full_name', d.full_name) as doctor,
               coalesce((
                 select jsonb_agg(jsonb_build_object(
                          'icd10_code', vd.icd10_code, 'is_primary', vd.is_primary,
                          'icd10', jsonb_build_object('name', i.name, 'name_id', i.name_id)))
                   from public.visit_diagnoses vd
                   left join public.icd10_codes i on i.code = vd.icd10_code
                  where vd.visit_id = v.id
               ), '[]'::jsonb) as diagnoses,
               coalesce((
                 select jsonb_agg(jsonb_build_object(
                          'id', s.id, 'assessment', s.assessment, 'plan', s.plan,
                          'amends_id', s.amends_id, 'signed_at', s.signed_at) order by s.created_at)
                   from public.soap_notes s
                  where s.visit_id = v.id and s.signed_at is not null
               ), '[]'::jsonb) as notes,
               coalesce((
                 select jsonb_agg(jsonb_build_object('items', coalesce((
                          select jsonb_agg(jsonb_build_object(
                                   'qty', pi.qty, 'medicine', jsonb_build_object('name', m.name, 'unit', m.unit)))
                            from public.prescription_items pi
                            join public.medicines m on m.id = pi.medicine_id
                           where pi.prescription_id = rx.id
                        ), '[]'::jsonb)))
                   from public.prescriptions rx
                  where rx.visit_id = v.id
               ), '[]'::jsonb) as prescriptions
          from public.visits v
          join public.clinics c on c.id = v.clinic_id and c.organization_id = v_organization_id
          join public.polis pl on pl.id = v.poli_id
          join public.profiles d on d.id = v.doctor_id
         where v.patient_id = p_patient_id
           and v.id <> p_exclude_visit_id
           and v.status <> 'cancelled'
         order by v.visit_date desc, v.created_at desc
         limit 5
      ) r
  ), '[]'::jsonb);
end;
$$;

-- Branches ------------------------------------------------------------------------------------------------

-- The branches I may work at (the picker and the switcher), with how many open branches the organization has
-- (more than one: the header names the branch, so nobody works at the wrong one by accident).
create function private.my_clinics()
returns table (id uuid, name text, address text, organization_branches integer)
language sql
stable
security definer
set search_path = ''
as $$
  select c.id, c.name, c.address,
         (select count(*) from public.clinics o where o.organization_id = c.organization_id and o.is_active)::integer
    from public.clinic_staff m
    join public.clinics c on c.id = m.clinic_id and c.is_active
    join public.profiles p on p.id = m.profile_id and p.is_active and p.organization_id = c.organization_id
   where m.profile_id = auth.uid()
   order by c.created_at, c.name
$$;

-- Start working at a branch I am a member of; null clears the choice (the picker shows next).
create function private.switch_clinic(p_clinic_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null then
    raise exception 'not authenticated' using errcode = '42501';
  end if;
  if p_clinic_id is not null and not exists (select 1 from private.my_clinics() c where c.id = p_clinic_id) then
    raise exception 'not_a_member' using errcode = '42501';
  end if;

  update public.profiles set active_clinic_id = p_clinic_id where id = auth.uid() and is_active;
end;
$$;

-- The owner opens a new branch, optionally starting from a copy of another branch's master data (polis with
-- their consultation fee, services and packages, medicines without stock, suppliers). Owners become members.
create function private.create_clinic_branch(p_name text, p_address text, p_phone text, p_copy_from uuid)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_organization_id uuid := private.auth_organization_id();
  v_clinic_id uuid;
begin
  if private.auth_clinic_id() is null or private.auth_role() <> 'owner' then
    raise exception 'not_allowed' using errcode = '42501';
  end if;
  if p_copy_from is not null
     and not exists (select 1 from public.clinics where id = p_copy_from and organization_id = v_organization_id) then
    raise exception 'not_allowed' using errcode = '42501';
  end if;

  insert into public.clinics (organization_id, name, address, phone, idle_logout_minutes)
  values (
    v_organization_id, p_name, nullif(trim(p_address), ''), nullif(trim(p_phone), ''),
    coalesce((select idle_logout_minutes from public.clinics where id = p_copy_from), 15)
  )
  returning id into v_clinic_id;

  insert into public.clinic_staff (clinic_id, profile_id)
  select v_clinic_id, p.id
    from public.profiles p
   where p.organization_id = v_organization_id and p.role = 'owner' and p.is_active;

  if p_copy_from is not null then
    insert into public.services (clinic_id, name, type, price, doctor_fee_type, doctor_fee_value, is_active)
    select v_clinic_id, name, type, price, doctor_fee_type, doctor_fee_value, is_active
      from public.services where clinic_id = p_copy_from;

    insert into public.service_package_items (clinic_id, package_id, service_id, qty)
    select v_clinic_id, np.id, ns.id, i.qty
      from public.service_package_items i
      join public.services op on op.id = i.package_id
      join public.services os on os.id = i.service_id
      join public.services np on np.clinic_id = v_clinic_id and lower(np.name) = lower(op.name)
      join public.services ns on ns.clinic_id = v_clinic_id and lower(ns.name) = lower(os.name)
     where i.clinic_id = p_copy_from;

    insert into public.polis (clinic_id, name, bpjs_poli_code, is_active, consultation_service_id)
    select v_clinic_id, p.name, p.bpjs_poli_code, p.is_active, ns.id
      from public.polis p
      left join public.services os on os.id = p.consultation_service_id
      left join public.services ns on ns.clinic_id = v_clinic_id and lower(ns.name) = lower(os.name)
     where p.clinic_id = p_copy_from;

    insert into public.medicines (clinic_id, name, unit, price, kfa_code, min_stock, is_active)
    select v_clinic_id, name, unit, price, kfa_code, min_stock, is_active
      from public.medicines where clinic_id = p_copy_from;

    insert into public.suppliers (clinic_id, name, phone, address, is_active)
    select v_clinic_id, name, phone, address, is_active
      from public.suppliers where clinic_id = p_copy_from;
  end if;

  return v_clinic_id;
end;
$$;

-- Everyone in the organization, with their branches: for the owner's and admin's staff assignment.
create function private.list_organization_staff()
returns table (id uuid, full_name text, email text, role public.user_role, is_active boolean, clinic_ids uuid[])
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if private.auth_clinic_id() is null or private.auth_role() not in ('owner', 'admin') then
    raise exception 'not_allowed' using errcode = '42501';
  end if;

  return query
  select p.id, p.full_name, p.email, p.role, p.is_active,
         coalesce(array_agg(m.clinic_id order by c.created_at) filter (where m.clinic_id is not null), '{}')
    from public.profiles p
    left join public.clinic_staff m on m.profile_id = p.id
    left join public.clinics c on c.id = m.clinic_id
   where p.organization_id = private.auth_organization_id()
   group by p.id
   order by p.full_name;
end;
$$;

-- Let a staff member work at a branch too. The owner may assign to any branch, an admin to their own.
create function private.assign_clinic_staff(p_profile_id uuid, p_clinic_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform private.assert_can_assign(p_profile_id, p_clinic_id);

  insert into public.clinic_staff (clinic_id, profile_id) values (p_clinic_id, p_profile_id)
  on conflict do nothing;
end;
$$;

-- Stop a staff member working at a branch. Owners stay in every branch; nobody is left without a branch.
create function private.unassign_clinic_staff(p_profile_id uuid, p_clinic_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform private.assert_can_assign(p_profile_id, p_clinic_id);

  if exists (select 1 from public.profiles where id = p_profile_id and role = 'owner') then
    raise exception 'owner_in_every_branch';
  end if;
  if (select count(*) from public.clinic_staff where profile_id = p_profile_id and clinic_id <> p_clinic_id) = 0 then
    raise exception 'last_branch';
  end if;

  delete from public.clinic_staff where profile_id = p_profile_id and clinic_id = p_clinic_id;
  update public.profiles set active_clinic_id = null where id = p_profile_id and active_clinic_id = p_clinic_id;
end;
$$;

create function private.assert_can_assign(p_profile_id uuid, p_clinic_id uuid)
returns void
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_organization_id uuid := private.auth_organization_id();
  v_role public.user_role := private.auth_role();
begin
  if private.auth_clinic_id() is null
     or not (v_role = 'owner' or (v_role = 'admin' and p_clinic_id = private.auth_clinic_id())) then
    raise exception 'not_allowed' using errcode = '42501';
  end if;
  if not exists (select 1 from public.clinics where id = p_clinic_id and organization_id = v_organization_id)
     or not exists (select 1 from public.profiles where id = p_profile_id and organization_id = v_organization_id) then
    raise exception 'not_allowed' using errcode = '42501';
  end if;
  -- Only an owner manages another owner's or an admin's branches.
  if v_role <> 'owner' and exists (select 1 from public.profiles where id = p_profile_id and role in ('owner', 'admin')) then
    raise exception 'not_allowed' using errcode = '42501';
  end if;
end;
$$;

-- Today at every branch, for the owner: patients, who is still in the clinic, revenue (paid umum invoices by
-- Jakarta paid date, as report_revenue_daily).
create function private.organization_today(p_today date)
returns table (clinic_id uuid, name text, patients integer, waiting integer, in_clinic integer, revenue bigint)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if private.auth_clinic_id() is null or private.auth_role() <> 'owner' then
    raise exception 'not_allowed' using errcode = '42501';
  end if;

  return query
  select c.id, c.name,
         (select count(*) from public.visits v
           where v.clinic_id = c.id and v.visit_date = p_today and v.status <> 'cancelled')::integer,
         (select count(*) from public.visits v
           where v.clinic_id = c.id and v.visit_date = p_today and v.status in ('registered', 'waiting'))::integer,
         (select count(*) from public.visits v
           where v.clinic_id = c.id and v.visit_date = p_today and v.status not in ('done', 'cancelled'))::integer,
         (select coalesce(sum(i.total), 0) from public.invoices i
           where i.clinic_id = c.id and i.status = 'paid' and i.payer_type = 'umum'
             and (i.paid_at at time zone 'Asia/Jakarta')::date = p_today)::bigint
    from public.clinics c
   where c.organization_id = private.auth_organization_id() and c.is_active
   order by c.created_at, c.name;
end;
$$;

revoke execute on all functions in schema private from public, anon;
grant execute on function private.patient_visit_history(uuid) to authenticated;
grant execute on function private.patient_previous_visits(uuid, uuid) to authenticated;
grant execute on function private.my_clinics() to authenticated;
grant execute on function private.switch_clinic(uuid) to authenticated;
grant execute on function private.create_clinic_branch(text, text, text, uuid) to authenticated;
grant execute on function private.list_organization_staff() to authenticated;
grant execute on function private.assign_clinic_staff(uuid, uuid) to authenticated;
grant execute on function private.unassign_clinic_staff(uuid, uuid) to authenticated;
grant execute on function private.assert_can_assign(uuid, uuid) to authenticated;
grant execute on function private.organization_today(date) to authenticated;
revoke execute on function private.profiles_before_insert() from authenticated;
revoke execute on function private.profiles_after_insert() from authenticated;

-- Public wrappers (SECURITY INVOKER; the private functions check role, organization and branch) ----------

create function public.patient_visit_history(p_patient_id uuid)
returns jsonb language sql stable security invoker set search_path = ''
as $$ select private.patient_visit_history(p_patient_id) $$;

create function public.patient_previous_visits(p_patient_id uuid, p_exclude_visit_id uuid)
returns jsonb language sql stable security invoker set search_path = ''
as $$ select private.patient_previous_visits(p_patient_id, p_exclude_visit_id) $$;

create function public.my_clinics()
returns table (id uuid, name text, address text, organization_branches integer) language sql stable security invoker set search_path = ''
as $$ select * from private.my_clinics() $$;

create function public.switch_clinic(p_clinic_id uuid)
returns void language sql security invoker set search_path = ''
as $$ select private.switch_clinic(p_clinic_id) $$;

create function public.create_clinic_branch(p_name text, p_address text, p_phone text, p_copy_from uuid)
returns uuid language sql security invoker set search_path = ''
as $$ select private.create_clinic_branch(p_name, p_address, p_phone, p_copy_from) $$;

create function public.list_organization_staff()
returns table (id uuid, full_name text, email text, role public.user_role, is_active boolean, clinic_ids uuid[])
language sql stable security invoker set search_path = ''
as $$ select * from private.list_organization_staff() $$;

create function public.assign_clinic_staff(p_profile_id uuid, p_clinic_id uuid)
returns void language sql security invoker set search_path = ''
as $$ select private.assign_clinic_staff(p_profile_id, p_clinic_id) $$;

create function public.unassign_clinic_staff(p_profile_id uuid, p_clinic_id uuid)
returns void language sql security invoker set search_path = ''
as $$ select private.unassign_clinic_staff(p_profile_id, p_clinic_id) $$;

create function public.organization_today(p_today date)
returns table (clinic_id uuid, name text, patients integer, waiting integer, in_clinic integer, revenue bigint)
language sql stable security invoker set search_path = ''
as $$ select * from private.organization_today(p_today) $$;

revoke execute on function public.patient_visit_history(uuid) from public, anon;
revoke execute on function public.patient_previous_visits(uuid, uuid) from public, anon;
revoke execute on function public.my_clinics() from public, anon;
revoke execute on function public.switch_clinic(uuid) from public, anon;
revoke execute on function public.create_clinic_branch(text, text, text, uuid) from public, anon;
revoke execute on function public.list_organization_staff() from public, anon;
revoke execute on function public.assign_clinic_staff(uuid, uuid) from public, anon;
revoke execute on function public.unassign_clinic_staff(uuid, uuid) from public, anon;
revoke execute on function public.organization_today(date) from public, anon;
grant execute on function public.patient_visit_history(uuid) to authenticated;
grant execute on function public.patient_previous_visits(uuid, uuid) to authenticated;
grant execute on function public.my_clinics() to authenticated;
grant execute on function public.switch_clinic(uuid) to authenticated;
grant execute on function public.create_clinic_branch(text, text, text, uuid) to authenticated;
grant execute on function public.list_organization_staff() to authenticated;
grant execute on function public.assign_clinic_staff(uuid, uuid) to authenticated;
grant execute on function public.unassign_clinic_staff(uuid, uuid) to authenticated;
grant execute on function public.organization_today(date) to authenticated;

-- Signup creates the organization and its first branch ---------------------------------------------------

drop function public.create_clinic_tenant(uuid, text, text, text, text, text);

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
  v_organization_id uuid;
  v_clinic_id uuid;
begin
  insert into public.organizations (name, slug) values (p_clinic_name, p_slug)
  returning id into v_organization_id;

  insert into public.clinics (organization_id, name, email)
  values (v_organization_id, p_clinic_name, p_email)
  returning id into v_clinic_id;

  -- profiles_before_insert / after_insert set the organization, the active branch and the membership.
  insert into public.profiles (id, clinic_id, role, full_name, email, locale)
  values (p_user_id, v_clinic_id, 'owner', p_full_name, p_email, p_locale);

  return v_organization_id;
end;
$$;

revoke execute on function public.create_clinic_tenant(uuid, text, text, text, text, text) from public, anon, authenticated;
grant execute on function public.create_clinic_tenant(uuid, text, text, text, text, text) to service_role;
