-- Examination core: ICD-10 reference, vitals, SOAP notes (sign, lock, amend),
-- visit diagnoses, and signing a visit (in_exam -> to_cashier).
--
-- Clinical tables are NOT wired to audit_row_change(): audit_logs is readable by
-- admins, who must not see clinical content. Instead the records protect
-- themselves: vitals are append-only, SOAP and diagnoses lock on signing and
-- later changes are amendment rows.

-- ICD-10 reference (global, loaded by an import with the service role) -------

create table public.icd10_codes (
  id uuid primary key default gen_random_uuid(),
  code text not null unique check (code ~ '^[A-Z][0-9]{2}(\.[0-9A-Z]{1,4})?$'),
  name text not null,
  name_id text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index icd10_codes_code_prefix_idx on public.icd10_codes (code text_pattern_ops);
create index icd10_codes_name_trgm_idx on public.icd10_codes using gin (name extensions.gin_trgm_ops);
create index icd10_codes_name_id_trgm_idx on public.icd10_codes using gin (name_id extensions.gin_trgm_ops);

create trigger icd10_codes_set_updated_at
  before update on public.icd10_codes
  for each row execute function public.set_updated_at();

revoke all on public.icd10_codes from anon;
revoke insert, update, delete, truncate on public.icd10_codes from authenticated;

alter table public.icd10_codes enable row level security;

create policy "staff read icd10 codes" on public.icd10_codes
  for select to authenticated
  using ((select private.auth_clinic_id()) is not null);

-- Vitals (append-only; latest row is current) --------------------------------

create table public.vitals (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid not null references public.clinics (id),
  visit_id uuid not null references public.visits (id),
  systolic smallint check (systolic between 50 and 300),
  diastolic smallint check (diastolic between 20 and 200),
  pulse smallint check (pulse between 20 and 250),
  temperature numeric(3, 1) check (temperature between 30 and 45),
  respiratory_rate smallint check (respiratory_rate between 5 and 80),
  spo2 smallint check (spo2 between 50 and 100),
  weight numeric(4, 1) check (weight between 0.5 and 400),
  height numeric(4, 1) check (height between 20 and 250),
  recorded_by uuid not null references public.profiles (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint vitals_not_empty check (
    num_nonnulls(systolic, diastolic, pulse, temperature, respiratory_rate, spo2, weight, height) > 0
  ),
  constraint vitals_blood_pressure_pair check ((systolic is null) = (diastolic is null))
);

create index vitals_visit_created_idx on public.vitals (visit_id, created_at desc);
create index vitals_clinic_id_idx on public.vitals (clinic_id);
create index vitals_recorded_by_idx on public.vitals (recorded_by);

-- Nurse, or the visit's doctor, while the patient waits or is in exam.
create function private.vitals_before_insert()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_role public.user_role := private.auth_role();
  v_visit record;
begin
  select clinic_id, doctor_id, status into v_visit
    from public.visits
   where id = new.visit_id and clinic_id = private.auth_clinic_id();
  if not found then
    raise exception 'visit_not_found';
  end if;
  if not (v_role = 'nurse' or (v_role = 'doctor' and v_visit.doctor_id = v_uid)) then
    raise exception 'not_allowed';
  end if;
  if v_visit.status not in ('waiting', 'in_exam') then
    raise exception 'visit_closed';
  end if;
  new.clinic_id := v_visit.clinic_id;
  new.recorded_by := v_uid;
  return new;
end;
$$;

revoke execute on function private.vitals_before_insert() from public, anon, authenticated;

create trigger vitals_before_insert
  before insert on public.vitals
  for each row execute function private.vitals_before_insert();

revoke all on public.vitals from anon;
revoke insert, update, delete, truncate on public.vitals from authenticated;
grant insert (visit_id, systolic, diastolic, pulse, temperature, respiratory_rate, spo2, weight, height)
  on public.vitals to authenticated;

alter table public.vitals enable row level security;

create policy "clinical staff read vitals" on public.vitals
  for select to authenticated
  using (
    clinic_id = (select private.auth_clinic_id())
    and (select private.auth_role()) in ('doctor', 'nurse', 'owner')
  );

create policy "nurse and doctor record vitals" on public.vitals
  for insert to authenticated
  with check (
    clinic_id = (select private.auth_clinic_id())
    and (select private.auth_role()) in ('doctor', 'nurse')
  );

-- SOAP notes -------------------------------------------------------------------
-- One main note per visit (amends_id null): a draft until signed_at, then locked.
-- Amendments are new rows pointing at the signed main note, signed on creation.

create table public.soap_notes (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid not null references public.clinics (id),
  visit_id uuid not null references public.visits (id),
  amends_id uuid references public.soap_notes (id),
  author_id uuid not null references public.profiles (id),
  subjective text check (length(subjective) <= 5000),
  objective text check (length(objective) <= 5000),
  assessment text check (length(assessment) <= 5000),
  plan text check (length(plan) <= 5000),
  signed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index soap_notes_main_per_visit_key on public.soap_notes (visit_id) where amends_id is null;
create index soap_notes_visit_id_idx on public.soap_notes (visit_id);
create index soap_notes_amends_id_idx on public.soap_notes (amends_id);
create index soap_notes_author_id_idx on public.soap_notes (author_id);
create index soap_notes_clinic_id_idx on public.soap_notes (clinic_id);

create trigger soap_notes_set_updated_at
  before update on public.soap_notes
  for each row execute function public.set_updated_at();

create function private.soap_notes_guard()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_visit record;
begin
  if v_uid is null then
    return new;
  end if;

  select clinic_id, doctor_id, status into v_visit
    from public.visits
   where id = new.visit_id and clinic_id = private.auth_clinic_id();
  if not found then
    raise exception 'visit_not_found';
  end if;
  if not (private.auth_role() = 'doctor' and v_visit.doctor_id = v_uid) then
    raise exception 'not_your_patient';
  end if;

  if tg_op = 'INSERT' then
    new.clinic_id := v_visit.clinic_id;
    new.author_id := v_uid;
    if new.amends_id is null then
      if v_visit.status <> 'in_exam' then
        raise exception 'not_in_exam';
      end if;
      new.signed_at := null;
    else
      if not exists (
        select 1 from public.soap_notes m
         where m.id = new.amends_id and m.visit_id = new.visit_id
           and m.amends_id is null and m.signed_at is not null
      ) then
        raise exception 'amend_target_invalid';
      end if;
      if coalesce(trim(concat(new.subjective, new.objective, new.assessment, new.plan)), '') = '' then
        raise exception 'amendment_empty';
      end if;
      new.signed_at := now();
    end if;
    return new;
  end if;

  -- UPDATE: only an unsigned main note during the exam.
  if old.signed_at is not null then
    raise exception 'record_locked';
  end if;
  if v_visit.status <> 'in_exam' then
    raise exception 'not_in_exam';
  end if;
  if new.signed_at is not null then
    if not exists (select 1 from public.visit_diagnoses d where d.visit_id = new.visit_id and d.is_primary) then
      raise exception 'primary_diagnosis_required';
    end if;
    new.signed_at := now();
  end if;
  return new;
end;
$$;

revoke execute on function private.soap_notes_guard() from public, anon, authenticated;

create trigger soap_notes_guard
  before insert or update on public.soap_notes
  for each row execute function private.soap_notes_guard();

revoke all on public.soap_notes from anon;
revoke insert, update, delete, truncate on public.soap_notes from authenticated;
grant insert (visit_id, amends_id, subjective, objective, assessment, plan) on public.soap_notes to authenticated;
grant update (subjective, objective, assessment, plan, signed_at) on public.soap_notes to authenticated;

alter table public.soap_notes enable row level security;

-- Front desk, cashier, pharmacy and admin cannot read SOAP.
create policy "clinical staff read soap notes" on public.soap_notes
  for select to authenticated
  using (
    clinic_id = (select private.auth_clinic_id())
    and (select private.auth_role()) in ('doctor', 'nurse', 'owner')
  );

create policy "doctors write soap notes" on public.soap_notes
  for insert to authenticated
  with check (
    clinic_id = (select private.auth_clinic_id())
    and (select private.auth_role()) = 'doctor'
  );

create policy "doctors update draft soap notes" on public.soap_notes
  for update to authenticated
  using (
    clinic_id = (select private.auth_clinic_id())
    and (select private.auth_role()) = 'doctor'
  )
  with check (clinic_id = (select private.auth_clinic_id()));

-- Visit diagnoses ----------------------------------------------------------------
-- Editable (incl. removing a draft pick) only by the visit's doctor during the
-- exam and before the SOAP note is signed. The first diagnosis is primary.

create table public.visit_diagnoses (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid not null references public.clinics (id),
  visit_id uuid not null references public.visits (id),
  icd10_code text not null references public.icd10_codes (code),
  is_primary boolean not null default false,
  created_by uuid not null references public.profiles (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint visit_diagnoses_visit_code_key unique (visit_id, icd10_code)
);

create unique index visit_diagnoses_primary_key on public.visit_diagnoses (visit_id) where is_primary;
create index visit_diagnoses_clinic_code_idx on public.visit_diagnoses (clinic_id, icd10_code);
create index visit_diagnoses_icd10_code_idx on public.visit_diagnoses (icd10_code);
create index visit_diagnoses_created_by_idx on public.visit_diagnoses (created_by);

create trigger visit_diagnoses_set_updated_at
  before update on public.visit_diagnoses
  for each row execute function public.set_updated_at();

create function private.visit_diagnoses_guard()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_row public.visit_diagnoses := coalesce(new, old);
  v_visit record;
begin
  if v_uid is null then
    return coalesce(new, old);
  end if;

  select clinic_id, doctor_id, status into v_visit
    from public.visits
   where id = v_row.visit_id and clinic_id = private.auth_clinic_id();
  if not found then
    raise exception 'visit_not_found';
  end if;
  if not (private.auth_role() = 'doctor' and v_visit.doctor_id = v_uid) then
    raise exception 'not_your_patient';
  end if;
  if v_visit.status <> 'in_exam'
     or exists (select 1 from public.soap_notes s
                 where s.visit_id = v_row.visit_id and s.amends_id is null and s.signed_at is not null) then
    raise exception 'record_locked';
  end if;

  if tg_op = 'DELETE' then
    return old;
  end if;

  if tg_op = 'INSERT' then
    new.clinic_id := v_visit.clinic_id;
    new.created_by := v_uid;
    if not exists (select 1 from public.visit_diagnoses d where d.visit_id = new.visit_id and d.is_primary) then
      new.is_primary := true;
    end if;
  end if;

  -- Only one primary: promoting this one demotes the current primary.
  if new.is_primary and (tg_op = 'INSERT' or not old.is_primary) then
    update public.visit_diagnoses
       set is_primary = false
     where visit_id = new.visit_id and is_primary and id <> new.id;
  end if;
  return new;
end;
$$;

revoke execute on function private.visit_diagnoses_guard() from public, anon, authenticated;

create trigger visit_diagnoses_guard
  before insert or update or delete on public.visit_diagnoses
  for each row execute function private.visit_diagnoses_guard();

revoke all on public.visit_diagnoses from anon;
revoke insert, update, delete, truncate on public.visit_diagnoses from authenticated;
grant insert (visit_id, icd10_code, is_primary) on public.visit_diagnoses to authenticated;
grant update (is_primary) on public.visit_diagnoses to authenticated;
grant delete on public.visit_diagnoses to authenticated;

alter table public.visit_diagnoses enable row level security;

create policy "clinical staff read diagnoses" on public.visit_diagnoses
  for select to authenticated
  using (
    clinic_id = (select private.auth_clinic_id())
    and (select private.auth_role()) in ('doctor', 'nurse', 'owner')
  );

create policy "doctors add diagnoses" on public.visit_diagnoses
  for insert to authenticated
  with check (
    clinic_id = (select private.auth_clinic_id())
    and (select private.auth_role()) = 'doctor'
  );

create policy "doctors update diagnoses" on public.visit_diagnoses
  for update to authenticated
  using (
    clinic_id = (select private.auth_clinic_id())
    and (select private.auth_role()) = 'doctor'
  )
  with check (clinic_id = (select private.auth_clinic_id()));

create policy "doctors remove draft diagnoses" on public.visit_diagnoses
  for delete to authenticated
  using (
    clinic_id = (select private.auth_clinic_id())
    and (select private.auth_role()) = 'doctor'
  );

-- Visit status: in_exam -> to_cashier once the SOAP note is signed ------------
-- (in_exam -> to_pharmacy comes with prescriptions.)

create or replace function private.visits_before_update()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_role public.user_role := private.auth_role();
  v_is_own_doctor boolean := v_role = 'doctor' and old.doctor_id = v_uid;
begin
  if v_uid is null then
    return new;
  end if;

  if new.status is distinct from old.status then
    if old.status in ('registered', 'waiting') and new.status = 'cancelled' then
      if v_role not in ('front_desk', 'admin', 'owner') then
        raise exception 'not_allowed';
      end if;
      new.cancel_reason := nullif(trim(new.cancel_reason), '');
      if new.cancel_reason is null then
        raise exception 'cancel_reason_required';
      end if;
    elsif old.status = 'waiting' and new.status = 'in_exam' then
      if not v_is_own_doctor then
        raise exception 'not_your_patient';
      end if;
    elsif old.status = 'in_exam' and new.status = 'to_cashier' then
      if not v_is_own_doctor then
        raise exception 'not_your_patient';
      end if;
      if not exists (select 1 from public.soap_notes s
                      where s.visit_id = old.id and s.amends_id is null and s.signed_at is not null) then
        raise exception 'soap_not_signed';
      end if;
    else
      raise exception 'invalid_transition';
    end if;
    return new;
  end if;

  if new.cancel_reason is distinct from old.cancel_reason then
    raise exception 'invalid_transition';
  end if;

  if new.skipped_at is distinct from old.skipped_at or new.called_at is distinct from old.called_at then
    if old.status <> 'waiting' then
      raise exception 'not_waiting';
    end if;

    if new.skipped_at is not null and old.skipped_at is null then
      if not (v_is_own_doctor or v_role in ('nurse', 'front_desk', 'admin', 'owner')) then
        raise exception 'not_allowed';
      end if;
      new.skipped_at := now();
      new.called_at := old.called_at;
    else
      if not (v_is_own_doctor or v_role in ('nurse', 'admin', 'owner')) then
        raise exception 'not_allowed';
      end if;
      new.called_at := now();
      new.skipped_at := null;
    end if;
  end if;

  return new;
end;
$$;

-- Sign the exam: lock the SOAP note and send the patient to the cashier, atomically.
create function public.sign_visit(p_visit_id uuid)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
begin
  update public.soap_notes
     set signed_at = now()
   where visit_id = p_visit_id and amends_id is null and signed_at is null;
  if not found then
    raise exception 'soap_missing';
  end if;

  update public.visits set status = 'to_cashier' where id = p_visit_id;
  if not found then
    raise exception 'visit_not_found';
  end if;
end;
$$;

revoke execute on function public.sign_visit(uuid) from public, anon;
grant execute on function public.sign_visit(uuid) to authenticated;
