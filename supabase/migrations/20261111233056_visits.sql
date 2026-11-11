-- Visits: registration with daily queue number per poli and doctor quota per session.

create type public.visit_status as enum (
  'registered', 'waiting', 'in_exam', 'to_pharmacy', 'to_cashier', 'done', 'cancelled'
);

create table public.visits (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid not null references public.clinics (id),
  patient_id uuid not null references public.patients (id),
  -- Copied from the schedule at registration: the schedule may change later,
  -- the visit's poli and doctor must not.
  schedule_id uuid not null references public.doctor_schedules (id),
  poli_id uuid not null references public.polis (id),
  doctor_id uuid not null references public.profiles (id),
  -- Calendar date in Asia/Jakarta.
  visit_date date not null,
  queue_no integer not null check (queue_no > 0),
  status public.visit_status not null default 'registered',
  payer_type text not null check (payer_type in ('umum', 'bpjs')),
  skipped_at timestamptz,
  cancel_reason text,
  registered_by uuid references public.profiles (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint visits_queue_no_key unique (clinic_id, poli_id, visit_date, queue_no),
  constraint visits_cancel_reason check (status <> 'cancelled' or cancel_reason is not null)
);

-- One active visit per patient per poli per day (also stops double submits).
create unique index visits_patient_poli_day_key on public.visits (patient_id, poli_id, visit_date)
  where status <> 'cancelled';
create index visits_clinic_date_idx on public.visits (clinic_id, visit_date);
create index visits_clinic_status_idx on public.visits (clinic_id, status);
create index visits_schedule_date_idx on public.visits (schedule_id, visit_date);
create index visits_poli_id_idx on public.visits (poli_id);
create index visits_doctor_id_idx on public.visits (doctor_id);
create index visits_registered_by_idx on public.visits (registered_by);

create trigger visits_set_updated_at
  before update on public.visits
  for each row execute function public.set_updated_at();

create trigger visits_audit
  after insert or update or delete on public.visits
  for each row execute function private.audit_row_change();

-- Registration rules. Runs for every insert and overwrites everything except
-- patient, schedule and payer, so the client cannot pick its own queue number,
-- date, poli, doctor or status. Errors are stable keys mapped to Indonesian
-- messages in the app (visits.lib.ts).
create function private.visits_before_insert()
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
   where id = new.patient_id and clinic_id = v_clinic_id;
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
  new.status := 'registered';
  new.skipped_at := null;
  new.cancel_reason := null;
  new.registered_by := auth.uid();
  new.queue_no := private.next_counter('queue:' || v_schedule.poli_id || ':' || v_today);
  return new;
end;
$$;

revoke execute on function private.visits_before_insert() from public, anon, authenticated;

create trigger visits_before_insert
  before insert on public.visits
  for each row execute function private.visits_before_insert();

-- Typed entry point for the app. Security invoker: RLS and grants apply.
create function public.create_visit(p_patient_id uuid, p_schedule_id uuid, p_payer_type text)
returns public.visits
language sql
security invoker
set search_path = ''
as $$
  insert into public.visits (clinic_id, patient_id, schedule_id, payer_type)
  values (private.auth_clinic_id(), p_patient_id, p_schedule_id, p_payer_type)
  returning *;
$$;

revoke execute on function public.create_visit(uuid, uuid, text) from public, anon;
grant execute on function public.create_visit(uuid, uuid, text) to authenticated;

-- Privileges ----------------------------------------------------------------
-- Status changes (call, skip, cancel, ...) will go through dedicated functions.

revoke all on public.visits from anon;
revoke insert, update, delete, truncate on public.visits from authenticated;
grant insert (clinic_id, patient_id, schedule_id, payer_type) on public.visits to authenticated;

alter table public.visits enable row level security;

create policy "staff read visits in own clinic" on public.visits
  for select to authenticated
  using (clinic_id = (select private.auth_clinic_id()));

create policy "front desk register visits" on public.visits
  for insert to authenticated
  with check (
    clinic_id = (select private.auth_clinic_id())
    and (select private.auth_role()) in ('front_desk', 'admin', 'owner')
  );
