-- Patients: identity data, auto MRN, search indexes.

create table public.patients (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid not null references public.clinics (id),
  -- Assigned by patients_assign_mrn(); never set by the client.
  mrn text not null,
  full_name text not null check (length(full_name) between 1 and 200),
  -- Optional: newborns and foreigners may not have one yet.
  nik text check (nik ~ '^\d{16}$'),
  bpjs_number text check (bpjs_number ~ '^\d{13}$'),
  birth_date date not null,
  sex text not null check (sex in ('male', 'female')),
  phone text check (phone ~ '^0\d{8,13}$'),
  address text check (length(address) <= 500),
  satusehat_id text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint patients_clinic_mrn_key unique (clinic_id, mrn)
);

-- One patient per NIK / BPJS number per clinic. Also serve exact-match search.
create unique index patients_clinic_nik_key on public.patients (clinic_id, nik) where nik is not null;
create unique index patients_clinic_bpjs_key on public.patients (clinic_id, bpjs_number) where bpjs_number is not null;

-- Partial-match search by name and phone (ILIKE '%...%').
create index patients_full_name_trgm_idx on public.patients using gin (full_name extensions.gin_trgm_ops);
create index patients_phone_trgm_idx on public.patients using gin (phone extensions.gin_trgm_ops);

create trigger patients_set_updated_at
  before update on public.patients
  for each row execute function public.set_updated_at();

-- MRN: next value of the clinic's 'mrn' counter, zero-padded to at least 6 digits
-- (000001, ..., 999999, 1000000). Runs in the insert's transaction, so a failed
-- insert does not consume a number and concurrent inserts never share one.
create function private.patients_assign_mrn()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_next bigint := private.next_counter('mrn');
begin
  new.mrn := lpad(v_next::text, greatest(6, length(v_next::text)), '0');
  return new;
end;
$$;

revoke execute on function private.patients_assign_mrn() from public, anon, authenticated;

create trigger patients_assign_mrn
  before insert on public.patients
  for each row execute function private.patients_assign_mrn();

create trigger patients_audit
  after insert or update or delete on public.patients
  for each row execute function private.audit_row_change();

-- Privileges ----------------------------------------------------------------
-- Staff only. MRN, clinic and SATUSEHAT id are not editable by users
-- (satusehat_id is written by the integration worker with the service role).

revoke all on public.patients from anon;
revoke update, delete, truncate on public.patients from authenticated;
grant update (full_name, nik, bpjs_number, birth_date, sex, phone, address, is_active)
  on public.patients to authenticated;

alter table public.patients enable row level security;

-- Every active staff member reads patient identity (cashier and pharmacy need names).
create policy "staff read patients in own clinic" on public.patients
  for select to authenticated
  using (clinic_id = (select private.auth_clinic_id()));

create policy "front desk add patients" on public.patients
  for insert to authenticated
  with check (
    clinic_id = (select private.auth_clinic_id())
    and (select private.auth_role()) in ('front_desk', 'admin', 'owner')
  );

-- No delete policy: deactivate with is_active = false.
create policy "front desk update patients" on public.patients
  for update to authenticated
  using (
    clinic_id = (select private.auth_clinic_id())
    and (select private.auth_role()) in ('front_desk', 'admin', 'owner')
  )
  with check (clinic_id = (select private.auth_clinic_id()));
