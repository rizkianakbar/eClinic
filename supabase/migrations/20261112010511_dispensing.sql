-- Dispensing: FEFO stock deduction for a visit's prescription, with items the
-- pharmacist marks "not given" (clinic decision: short stock does not block the
-- visit; not-given items are not charged). The visit then moves to the cashier.

create table public.dispensations (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid not null references public.clinics (id),
  visit_id uuid not null references public.visits (id),
  prescription_id uuid not null references public.prescriptions (id),
  dispensed_by uuid not null references public.profiles (id),
  dispensed_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint dispensations_visit_key unique (visit_id)
);

create index dispensations_clinic_dispensed_idx on public.dispensations (clinic_id, dispensed_at);
create index dispensations_prescription_id_idx on public.dispensations (prescription_id);
create index dispensations_dispensed_by_idx on public.dispensations (dispensed_by);

-- One row per batch used (an item can span batches), or one "not given" row.
-- unit_price: the medicine's selling price at dispensing (billed by the cashier).
-- unit_cost: the batch's purchase cost (profit and loss).
create table public.dispense_items (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid not null references public.clinics (id),
  dispensation_id uuid not null references public.dispensations (id),
  prescription_item_id uuid not null references public.prescription_items (id),
  medicine_id uuid not null references public.medicines (id),
  batch_id uuid references public.stock_batches (id),
  qty integer not null check (qty >= 0),
  unit_price bigint not null check (unit_price >= 0),
  unit_cost bigint not null check (unit_cost >= 0),
  status text not null check (status in ('given', 'not_given')),
  not_given_reason text check (length(not_given_reason) <= 200),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint dispense_items_shape check (
    (status = 'given' and batch_id is not null and qty > 0 and not_given_reason is null)
    or (status = 'not_given' and batch_id is null and qty = 0 and not_given_reason is not null)
  )
);

create index dispense_items_dispensation_id_idx on public.dispense_items (dispensation_id);
create index dispense_items_prescription_item_id_idx on public.dispense_items (prescription_item_id);
create index dispense_items_medicine_id_idx on public.dispense_items (medicine_id);
create index dispense_items_batch_id_idx on public.dispense_items (batch_id);
create index dispense_items_clinic_id_idx on public.dispense_items (clinic_id);

revoke all on public.dispensations, public.dispense_items from anon;
revoke insert, update, delete, truncate on public.dispensations, public.dispense_items from authenticated;

alter table public.dispensations enable row level security;
alter table public.dispense_items enable row level security;

-- Pharmacy, cashier (billing) and management read.
create policy "pharmacy cashier and management read dispensations" on public.dispensations
  for select to authenticated
  using (
    clinic_id = (select private.auth_clinic_id())
    and (select private.auth_role()) in ('pharmacist', 'cashier', 'admin', 'owner')
  );

create policy "pharmacy cashier and management read dispense_items" on public.dispense_items
  for select to authenticated
  using (
    clinic_id = (select private.auth_clinic_id())
    and (select private.auth_role()) in ('pharmacist', 'cashier', 'admin', 'owner')
  );

-- Visit status: to_pharmacy -> to_cashier, by a pharmacist, once dispensed. ---

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
    elsif old.status = 'to_pharmacy' and new.status = 'to_cashier' then
      if v_role <> 'pharmacist' then
        raise exception 'not_allowed';
      end if;
      if not exists (select 1 from public.dispensations d where d.visit_id = old.id) then
        raise exception 'not_dispensed';
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

-- Dispense ------------------------------------------------------------------------
-- p_not_given: [{ prescription_item_id, reason }] for items the pharmacist does not give.
-- Every other item is taken from unexpired batches, earliest expiry first, with the
-- batch rows locked. Too little stock aborts everything with 'insufficient_stock'
-- (detail = medicine name), so the pharmacist can mark that item not given.

create function private.dispense_prescription(p_visit_id uuid, p_not_given jsonb)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_clinic_id uuid := private.auth_clinic_id();
  v_today date := (now() at time zone 'Asia/Jakarta')::date;
  v_prescription_id uuid;
  v_dispensation_id uuid;
  v_item record;
  v_batch record;
  v_reason text;
  v_remaining integer;
  v_take integer;
  v_dispense_item_id uuid;
begin
  if v_clinic_id is null or private.auth_role() <> 'pharmacist' then
    raise exception 'not_allowed';
  end if;
  if not exists (select 1 from public.visits
                  where id = p_visit_id and clinic_id = v_clinic_id and status = 'to_pharmacy') then
    raise exception 'not_at_pharmacy';
  end if;
  select id into v_prescription_id from public.prescriptions where visit_id = p_visit_id;
  if not found then
    raise exception 'not_at_pharmacy';
  end if;
  if p_not_given is not null and jsonb_typeof(p_not_given) <> 'array' then
    raise exception 'items_invalid';
  end if;

  insert into public.dispensations (clinic_id, visit_id, prescription_id, dispensed_by)
  values (v_clinic_id, p_visit_id, v_prescription_id, v_uid)
  returning id into v_dispensation_id;

  for v_item in
    select i.id, i.medicine_id, i.qty, m.price, m.name
      from public.prescription_items i
      join public.medicines m on m.id = i.medicine_id
     where i.prescription_id = v_prescription_id
     order by i.created_at, i.id
  loop
    select nullif(trim(e ->> 'reason'), '') into v_reason
      from jsonb_array_elements(coalesce(p_not_given, '[]'::jsonb)) e
     where (e ->> 'prescription_item_id')::uuid = v_item.id;

    if found then
      if v_reason is null then
        raise exception 'not_given_reason_required' using detail = v_item.name;
      end if;
      insert into public.dispense_items
        (clinic_id, dispensation_id, prescription_item_id, medicine_id, batch_id, qty, unit_price, unit_cost, status, not_given_reason)
      values (v_clinic_id, v_dispensation_id, v_item.id, v_item.medicine_id, null, 0, v_item.price, 0, 'not_given', v_reason);
      continue;
    end if;

    v_remaining := v_item.qty;
    for v_batch in
      select id, qty_on_hand, unit_cost
        from public.stock_batches
       where medicine_id = v_item.medicine_id and clinic_id = v_clinic_id
         and qty_on_hand > 0 and expiry_date > v_today
       order by expiry_date, created_at, id
       for update
    loop
      exit when v_remaining = 0;
      v_take := least(v_remaining, v_batch.qty_on_hand);

      update public.stock_batches set qty_on_hand = qty_on_hand - v_take where id = v_batch.id;

      insert into public.dispense_items
        (clinic_id, dispensation_id, prescription_item_id, medicine_id, batch_id, qty, unit_price, unit_cost, status)
      values (v_clinic_id, v_dispensation_id, v_item.id, v_item.medicine_id, v_batch.id, v_take, v_item.price,
              v_batch.unit_cost, 'given')
      returning id into v_dispense_item_id;

      insert into public.stock_movements (clinic_id, medicine_id, batch_id, type, qty, ref_type, ref_id, created_by)
      values (v_clinic_id, v_item.medicine_id, v_batch.id, 'dispense', -v_take, 'dispense_item', v_dispense_item_id, v_uid);

      v_remaining := v_remaining - v_take;
    end loop;

    if v_remaining > 0 then
      raise exception 'insufficient_stock' using detail = v_item.name;
    end if;
  end loop;

  update public.visits set status = 'to_cashier' where id = p_visit_id;
  return v_dispensation_id;
end;
$$;

revoke execute on function private.dispense_prescription(uuid, jsonb) from public, anon;
grant execute on function private.dispense_prescription(uuid, jsonb) to authenticated;

create function public.dispense_prescription(p_visit_id uuid, p_not_given jsonb)
returns uuid
language sql
security invoker
set search_path = ''
as $$
  select private.dispense_prescription(p_visit_id, p_not_given);
$$;

revoke execute on function public.dispense_prescription(uuid, jsonb) from public, anon;
grant execute on function public.dispense_prescription(uuid, jsonb) to authenticated;
