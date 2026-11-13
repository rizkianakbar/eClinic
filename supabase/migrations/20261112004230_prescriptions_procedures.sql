-- E-prescriptions (with racikan) and procedures, written by the visit's doctor
-- during the exam, locked when the record is signed. Signing now routes the
-- visit to the pharmacy when it has prescription items, else to the cashier.
-- Like the other clinical tables, these are not in audit_logs (admins read it);
-- they lock on signing instead.

-- Shared guard: the visit's own doctor, during the exam, before signing.
create function private.assert_exam_editable(p_visit_id uuid)
returns uuid
language plpgsql
stable
set search_path = ''
as $$
declare
  v_visit record;
begin
  select clinic_id, doctor_id, status into v_visit
    from public.visits
   where id = p_visit_id and clinic_id = private.auth_clinic_id();
  if not found then
    raise exception 'visit_not_found';
  end if;
  if not (private.auth_role() = 'doctor' and v_visit.doctor_id = auth.uid()) then
    raise exception 'not_your_patient';
  end if;
  if v_visit.status <> 'in_exam'
     or exists (select 1 from public.soap_notes s
                 where s.visit_id = p_visit_id and s.amends_id is null and s.signed_at is not null) then
    raise exception 'record_locked';
  end if;
  return v_visit.clinic_id;
end;
$$;

revoke execute on function private.assert_exam_editable(uuid) from public, anon;
grant execute on function private.assert_exam_editable(uuid) to authenticated;

-- Prescriptions ---------------------------------------------------------------

create table public.prescriptions (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid not null default private.auth_clinic_id() references public.clinics (id),
  visit_id uuid not null references public.visits (id),
  prescribed_by uuid not null default auth.uid() references public.profiles (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- One prescription per visit for now; the table allows more later.
  constraint prescriptions_visit_key unique (visit_id)
);

create index prescriptions_clinic_id_idx on public.prescriptions (clinic_id);
create index prescriptions_prescribed_by_idx on public.prescriptions (prescribed_by);

-- Racikan: ingredients (items with compound_id) mixed and divided into
-- `quantity` doses of the given form, taken per `signa`.
create table public.prescription_compounds (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid not null default private.auth_clinic_id() references public.clinics (id),
  prescription_id uuid not null references public.prescriptions (id) on delete cascade,
  form text not null check (form in ('puyer', 'kapsul')),
  quantity integer not null check (quantity between 1 and 200),
  signa text not null check (length(signa) between 1 and 200),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index prescription_compounds_prescription_id_idx on public.prescription_compounds (prescription_id);
create index prescription_compounds_clinic_id_idx on public.prescription_compounds (clinic_id);

-- Quantity in whole units of the medicine (racikan: total ingredient amount).
-- Regular items carry their own signa; racikan ingredients use the compound's.
create table public.prescription_items (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid not null default private.auth_clinic_id() references public.clinics (id),
  prescription_id uuid not null references public.prescriptions (id) on delete cascade,
  compound_id uuid references public.prescription_compounds (id) on delete cascade,
  medicine_id uuid not null references public.medicines (id),
  qty integer not null check (qty between 1 and 10000),
  signa text check (length(signa) between 1 and 200),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint prescription_items_signa check ((compound_id is null) = (signa is not null))
);

create index prescription_items_prescription_id_idx on public.prescription_items (prescription_id);
create index prescription_items_compound_id_idx on public.prescription_items (compound_id);
create index prescription_items_medicine_id_idx on public.prescription_items (medicine_id);
create index prescription_items_clinic_id_idx on public.prescription_items (clinic_id);

create function private.prescriptions_guard()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_row record := coalesce(new, old);
  v_visit_id uuid;
  v_clinic_id uuid;
begin
  if auth.uid() is null then
    return coalesce(new, old);
  end if;

  if tg_table_name = 'prescriptions' then
    v_visit_id := v_row.visit_id;
  else
    select visit_id into v_visit_id from public.prescriptions where id = v_row.prescription_id;
    if not found then
      raise exception 'visit_not_found';
    end if;
  end if;
  v_clinic_id := private.assert_exam_editable(v_visit_id);

  if tg_op = 'DELETE' then
    return old;
  end if;

  new.clinic_id := v_clinic_id;
  if tg_table_name = 'prescriptions' and tg_op = 'INSERT' then
    new.prescribed_by := auth.uid();
  end if;
  if tg_table_name = 'prescription_items' then
    if not exists (select 1 from public.medicines m
                    where m.id = new.medicine_id and m.clinic_id = v_clinic_id and m.is_active) then
      raise exception 'medicine_inactive';
    end if;
    if new.compound_id is not null and not exists (
      select 1 from public.prescription_compounds c
       where c.id = new.compound_id and c.prescription_id = new.prescription_id
    ) then
      raise exception 'compound_mismatch';
    end if;
  end if;
  return new;
end;
$$;

revoke execute on function private.prescriptions_guard() from public, anon, authenticated;

create trigger prescriptions_guard
  before insert or update or delete on public.prescriptions
  for each row execute function private.prescriptions_guard();
create trigger prescription_compounds_guard
  before insert or update or delete on public.prescription_compounds
  for each row execute function private.prescriptions_guard();
create trigger prescription_items_guard
  before insert or update or delete on public.prescription_items
  for each row execute function private.prescriptions_guard();

-- Procedures --------------------------------------------------------------------

create table public.visit_procedures (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid not null default private.auth_clinic_id() references public.clinics (id),
  visit_id uuid not null references public.visits (id),
  service_id uuid not null references public.services (id),
  qty integer not null default 1 check (qty between 1 and 100),
  -- Unit price copied from the service when added; later tariff changes do not affect this visit.
  price bigint not null default 0 check (price >= 0),
  performed_by uuid not null references public.profiles (id),
  created_by uuid not null default auth.uid() references public.profiles (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index visit_procedures_visit_id_idx on public.visit_procedures (visit_id);
create index visit_procedures_service_id_idx on public.visit_procedures (service_id);
create index visit_procedures_performed_by_idx on public.visit_procedures (performed_by);
create index visit_procedures_created_by_idx on public.visit_procedures (created_by);
create index visit_procedures_clinic_id_idx on public.visit_procedures (clinic_id);

create function private.visit_procedures_guard()
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

  if not exists (select 1 from public.profiles p
                  where p.id = new.performed_by and p.clinic_id = v_clinic_id
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

revoke execute on function private.visit_procedures_guard() from public, anon, authenticated;

create trigger visit_procedures_guard
  before insert or update or delete on public.visit_procedures
  for each row execute function private.visit_procedures_guard();

-- updated_at ---------------------------------------------------------------------

create trigger prescriptions_set_updated_at before update on public.prescriptions
  for each row execute function public.set_updated_at();
create trigger prescription_compounds_set_updated_at before update on public.prescription_compounds
  for each row execute function public.set_updated_at();
create trigger prescription_items_set_updated_at before update on public.prescription_items
  for each row execute function public.set_updated_at();
create trigger visit_procedures_set_updated_at before update on public.visit_procedures
  for each row execute function public.set_updated_at();

-- Privileges and RLS -----------------------------------------------------------------

revoke all on public.prescriptions, public.prescription_compounds, public.prescription_items,
  public.visit_procedures from anon;
revoke insert, update, delete, truncate on public.prescriptions, public.prescription_compounds,
  public.prescription_items, public.visit_procedures from authenticated;

grant insert (visit_id) on public.prescriptions to authenticated;
grant insert (prescription_id, form, quantity, signa) on public.prescription_compounds to authenticated;
grant update (form, quantity, signa), delete on public.prescription_compounds to authenticated;
grant insert (prescription_id, compound_id, medicine_id, qty, signa) on public.prescription_items to authenticated;
grant update (qty, signa), delete on public.prescription_items to authenticated;
grant insert (visit_id, service_id, qty, performed_by) on public.visit_procedures to authenticated;
grant update (qty, performed_by), delete on public.visit_procedures to authenticated;

alter table public.prescriptions enable row level security;
alter table public.prescription_compounds enable row level security;
alter table public.prescription_items enable row level security;
alter table public.visit_procedures enable row level security;

do $$
declare
  t text;
begin
  -- Prescriptions: clinical staff and pharmacy read; doctors write (guard narrows it).
  foreach t in array array['prescriptions', 'prescription_compounds', 'prescription_items'] loop
    execute format('create policy "clinical staff and pharmacy read %1$s" on public.%1$s
                    for select to authenticated
                    using (clinic_id = (select private.auth_clinic_id())
                           and (select private.auth_role()) in (''doctor'', ''nurse'', ''pharmacist'', ''owner''))', t);
  end loop;
  foreach t in array array['prescriptions', 'prescription_compounds', 'prescription_items', 'visit_procedures'] loop
    execute format('create policy "doctors add %1$s" on public.%1$s for insert to authenticated
                    with check (clinic_id = (select private.auth_clinic_id())
                                and (select private.auth_role()) = ''doctor'')', t);
    execute format('create policy "doctors update %1$s" on public.%1$s for update to authenticated
                    using (clinic_id = (select private.auth_clinic_id()) and (select private.auth_role()) = ''doctor'')
                    with check (clinic_id = (select private.auth_clinic_id()))', t);
    execute format('create policy "doctors remove draft %1$s" on public.%1$s for delete to authenticated
                    using (clinic_id = (select private.auth_clinic_id()) and (select private.auth_role()) = ''doctor'')', t);
  end loop;
end;
$$;

-- Procedures are billed: the cashier reads them too.
create policy "clinical staff and cashier read visit_procedures" on public.visit_procedures
  for select to authenticated
  using (
    clinic_id = (select private.auth_clinic_id())
    and (select private.auth_role()) in ('doctor', 'nurse', 'cashier', 'owner')
  );

-- Status machine: signed visit goes to pharmacy (with items) or cashier (without).

create function private.visit_has_prescription_items(p_visit_id uuid)
returns boolean
language sql
stable
set search_path = ''
as $$
  select exists (
    select 1 from public.prescription_items i
      join public.prescriptions p on p.id = i.prescription_id
     where p.visit_id = p_visit_id
  );
$$;

revoke execute on function private.visit_has_prescription_items(uuid) from public, anon;
grant execute on function private.visit_has_prescription_items(uuid) to authenticated;

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

-- Returns the visit's new status ('to_pharmacy' or 'to_cashier').
drop function public.sign_visit(uuid);

create function public.sign_visit(p_visit_id uuid)
returns public.visit_status
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_status public.visit_status;
begin
  update public.soap_notes
     set signed_at = now()
   where visit_id = p_visit_id and amends_id is null and signed_at is null;
  if not found then
    raise exception 'soap_missing';
  end if;

  v_status := case when private.visit_has_prescription_items(p_visit_id) then 'to_pharmacy' else 'to_cashier' end;
  update public.visits set status = v_status where id = p_visit_id;
  if not found then
    raise exception 'visit_not_found';
  end if;
  return v_status;
end;
$$;

revoke execute on function public.sign_visit(uuid) from public, anon;
grant execute on function public.sign_visit(uuid) to authenticated;
