-- Clinic decision (2026-11-13): every examination ends with an explicit medicine decision. A visit is
-- signed only if it has at least one prescription item, or the doctor recorded why no medicine is
-- needed (visits.no_medicine_reason). Signing with medicines clears a stale reason, so a record never
-- says both.

alter table public.visits
  add column no_medicine_reason text
  constraint visits_no_medicine_reason_length
    check (no_medicine_reason is null or char_length(no_medicine_reason) between 3 and 200);

comment on column public.visits.no_medicine_reason is
  'Why the doctor prescribed nothing (set during the exam). Null: not decided, or the visit has medicines.';

-- Only this column is newly writable; private.visits_before_update() decides who may change it.
grant update (no_medicine_reason) on public.visits to authenticated;

-- The visit rules: unchanged except for the "medicine decision" branch.
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

  -- medicine decision: the visit's own doctor, during the exam (before signing moves the status on).
  if new.no_medicine_reason is distinct from old.no_medicine_reason then
    if not v_is_own_doctor then
      raise exception 'not_your_patient';
    end if;
    if old.status <> 'in_exam' then
      raise exception 'not_in_exam';
    end if;
    new.no_medicine_reason := nullif(trim(new.no_medicine_reason), '');
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

-- Signing: unchanged except for the medicine decision, checked first so nothing is half-done.
create or replace function public.sign_visit(p_visit_id uuid)
returns public.visit_status
language plpgsql
set search_path to ''
as $function$
declare
  v_status public.visit_status;
  v_has_items boolean := private.visit_has_prescription_items(p_visit_id);
begin
  if not v_has_items and not exists (
    select 1 from public.visits v where v.id = p_visit_id and v.no_medicine_reason is not null
  ) then
    raise exception 'medicine_decision_required';
  end if;

  update public.soap_notes
     set signed_at = now()
   where visit_id = p_visit_id and amends_id is null and signed_at is null;
  if not found then
    raise exception 'soap_missing';
  end if;

  perform private.use_consumables(p_visit_id);

  v_status := case when v_has_items then 'to_pharmacy' else 'to_cashier' end;
  update public.visits
     set status = v_status,
         -- medicines were prescribed after all: drop a stale "no medicine" reason.
         no_medicine_reason = case when v_has_items then null else no_medicine_reason end
   where id = p_visit_id;
  if not found then
    raise exception 'visit_not_found';
  end if;
  return v_status;
end;
$function$;
