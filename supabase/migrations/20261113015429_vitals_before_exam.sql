-- Clinic decision (2026-11-13): triage is no longer optional. A waiting patient cannot be called into the
-- exam room, and the doctor cannot start the exam, until vitals are recorded (by a nurse, or by the
-- visit's own doctor when no nurse is free).
--
-- visits.vitals_recorded_at is stamped by the database when the first vitals are saved, so:
--   * the queue board knows who is ready without reading vitals (front desk and admin may not), and the
--     Realtime update on visits unlocks "Panggil" on every screen the moment vitals are saved;
--   * the rule below checks the visit itself, whatever the caller may read.
-- Users cannot write the column: authenticated has column-level UPDATE grants only, and this column is
-- not granted.

alter table public.visits add column vitals_recorded_at timestamptz;

comment on column public.visits.vitals_recorded_at is
  'When the first vitals of this visit were recorded (set by trigger on public.vitals). Required before call/exam.';

-- Existing visits: stamp from their first vitals. Not an operational change, so it neither bumps
-- updated_at (station wait timers) nor writes the activity log.
alter table public.visits disable trigger visits_set_updated_at;
alter table public.visits disable trigger visits_audit;

update public.visits v
   set vitals_recorded_at = f.first_at
  from (select visit_id, min(created_at) as first_at from public.vitals group by visit_id) f
 where f.visit_id = v.id;

alter table public.visits enable trigger visits_set_updated_at;
alter table public.visits enable trigger visits_audit;

-- Stamp the visit when its first vitals are saved. SECURITY DEFINER: the nurse may insert vitals but has
-- no UPDATE grant on this column. It only ever sets the column once, for the visit the vitals belong to.
create or replace function private.vitals_stamp_visit()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.visits
     set vitals_recorded_at = now()
   where id = new.visit_id
     and vitals_recorded_at is null;

  return new;
end;
$$;

revoke execute on function private.vitals_stamp_visit() from public, anon, authenticated;

create trigger vitals_stamp_visit
  after insert on public.vitals
  for each row execute function private.vitals_stamp_visit();

-- The visit rules, unchanged except for the two vitals checks (marked "vitals").
create or replace function private.visits_before_update()
returns trigger
language plpgsql
set search_path to ''
as $function$
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
      -- vitals: the exam starts only after triage.
      if old.vitals_recorded_at is null then
        raise exception 'vitals_required';
      end if;
    elsif old.status = 'in_exam' and new.status in ('to_pharmacy', 'to_cashier') then
      if not v_is_own_doctor then
        raise exception 'not_your_patient';
      end if;
      if not exists (select 1 from public.soap_notes s
                      where s.visit_id = old.id and s.amends_id is null and s.signed_at is not null) then
        raise exception 'soap_not_signed';
      end if;
      if (new.status = 'to_pharmacy') <> private.visit_has_prescription_items(old.id) then
        raise exception 'invalid_transition';
      end if;
    elsif old.status = 'to_pharmacy' and new.status = 'to_cashier' then
      if v_role <> 'pharmacist' then
        raise exception 'not_allowed';
      end if;
      if not exists (select 1 from public.dispensations d where d.visit_id = old.id) then
        raise exception 'not_dispensed';
      end if;
    elsif old.status = 'to_cashier' and new.status = 'done' then
      if v_role not in ('cashier', 'admin', 'owner') then
        raise exception 'not_allowed';
      end if;
      if not exists (select 1 from public.invoices i where i.visit_id = old.id and i.status = 'paid') then
        raise exception 'not_paid';
      end if;
    elsif old.status = 'done' and new.status = 'to_cashier' then
      if v_role not in ('admin', 'owner') then
        raise exception 'not_allowed';
      end if;
      if exists (select 1 from public.invoices i where i.visit_id = old.id and i.status <> 'void') then
        raise exception 'invalid_transition';
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
      -- vitals: nobody calls a patient into the exam room before triage.
      if old.vitals_recorded_at is null then
        raise exception 'vitals_required';
      end if;
      new.called_at := now();
      new.skipped_at := null;
    end if;
  end if;

  return new;
end;
$function$;
