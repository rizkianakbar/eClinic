-- Queue: registration joins the queue (waiting), call/skip/recall, start exam,
-- cancel with reason, live updates. Every status change is checked here.

alter table public.visits add column called_at timestamptz;

-- Registering = joining the queue (clinic decision): new visits start as waiting.
update public.visits set status = 'waiting' where status = 'registered';

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
  new.status := 'waiting';
  new.called_at := null;
  new.skipped_at := null;
  new.cancel_reason := null;
  new.registered_by := auth.uid();
  new.queue_no := private.next_counter('queue:' || v_schedule.poli_id || ':' || v_today);
  return new;
end;
$$;

-- Status machine and per-action roles for user updates. Later modules add
-- their transitions (in_exam -> to_pharmacy/to_cashier, ...) here.
-- Requests without a user (service role, migrations) are trusted.
create function private.visits_before_update()
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
      -- Skip (no-show): stays waiting, next number can be called.
      if not (v_is_own_doctor or v_role in ('nurse', 'front_desk', 'admin', 'owner')) then
        raise exception 'not_allowed';
      end if;
      new.skipped_at := now();
      new.called_at := old.called_at;
    else
      -- Call or recall (also brings a skipped patient back).
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

revoke execute on function private.visits_before_update() from public, anon, authenticated;

create trigger visits_before_update
  before update on public.visits
  for each row execute function private.visits_before_update();

grant update (status, called_at, skipped_at, cancel_reason) on public.visits to authenticated;

create policy "clinical and front desk staff update visits" on public.visits
  for update to authenticated
  using (
    clinic_id = (select private.auth_clinic_id())
    and (select private.auth_role()) in ('front_desk', 'nurse', 'doctor', 'admin', 'owner')
  )
  with check (clinic_id = (select private.auth_clinic_id()));

-- Live queue board and TV display (Realtime applies RLS per subscriber).
alter publication supabase_realtime add table public.visits;
