-- Consumables (bahan habis pakai) used in procedures: recorded by the visit's
-- doctor during the exam, deducted from stock (FEFO) when the record is signed,
-- billed automatically, and counted as medicine cost in profit and loss.

create table public.procedure_consumables (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid not null default private.auth_clinic_id() references public.clinics (id),
  visit_procedure_id uuid not null references public.visit_procedures (id) on delete cascade,
  medicine_id uuid not null references public.medicines (id),
  qty integer not null check (qty between 1 and 1000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint procedure_consumables_key unique (visit_procedure_id, medicine_id)
);

create index procedure_consumables_medicine_id_idx on public.procedure_consumables (medicine_id);
create index procedure_consumables_clinic_id_idx on public.procedure_consumables (clinic_id);

create trigger procedure_consumables_set_updated_at before update on public.procedure_consumables
  for each row execute function public.set_updated_at();

create function private.procedure_consumables_guard()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_visit_id uuid;
  v_clinic_id uuid;
begin
  if auth.uid() is null then
    return coalesce(new, old);
  end if;
  select visit_id into v_visit_id from public.visit_procedures
   where id = coalesce(new.visit_procedure_id, old.visit_procedure_id);
  if not found then
    raise exception 'visit_not_found';
  end if;
  v_clinic_id := private.assert_exam_editable(v_visit_id);
  if tg_op = 'DELETE' then
    return old;
  end if;
  if not exists (select 1 from public.medicines m where m.id = new.medicine_id and m.clinic_id = v_clinic_id and m.is_active) then
    raise exception 'medicine_inactive';
  end if;
  new.clinic_id := v_clinic_id;
  return new;
end;
$$;

revoke execute on function private.procedure_consumables_guard() from public, anon, authenticated;

create trigger procedure_consumables_guard
  before insert or update or delete on public.procedure_consumables
  for each row execute function private.procedure_consumables_guard();

revoke all on public.procedure_consumables from anon;
revoke insert, update, delete, truncate on public.procedure_consumables from authenticated;
grant insert (visit_procedure_id, medicine_id, qty) on public.procedure_consumables to authenticated;
grant update (qty), delete on public.procedure_consumables to authenticated;

alter table public.procedure_consumables enable row level security;

create policy "clinical staff and cashier read procedure_consumables" on public.procedure_consumables
  for select to authenticated
  using (
    clinic_id = (select private.auth_clinic_id())
    and (select private.auth_role()) in ('doctor', 'nurse', 'cashier', 'pharmacist', 'owner')
  );
create policy "doctors add procedure_consumables" on public.procedure_consumables
  for insert to authenticated
  with check (clinic_id = (select private.auth_clinic_id()) and (select private.auth_role()) = 'doctor');
create policy "doctors update procedure_consumables" on public.procedure_consumables
  for update to authenticated
  using (clinic_id = (select private.auth_clinic_id()) and (select private.auth_role()) = 'doctor')
  with check (clinic_id = (select private.auth_clinic_id()));
create policy "doctors remove draft procedure_consumables" on public.procedure_consumables
  for delete to authenticated
  using (clinic_id = (select private.auth_clinic_id()) and (select private.auth_role()) = 'doctor');

-- What was taken from which batch (like dispense_items). No user writes.
create table public.consumable_usages (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid not null references public.clinics (id),
  visit_id uuid not null references public.visits (id),
  procedure_consumable_id uuid not null references public.procedure_consumables (id),
  medicine_id uuid not null references public.medicines (id),
  batch_id uuid not null references public.stock_batches (id),
  qty integer not null check (qty > 0),
  unit_price bigint not null check (unit_price >= 0),
  unit_cost bigint not null check (unit_cost >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index consumable_usages_visit_id_idx on public.consumable_usages (visit_id);
create index consumable_usages_procedure_consumable_id_idx on public.consumable_usages (procedure_consumable_id);
create index consumable_usages_medicine_id_idx on public.consumable_usages (medicine_id);
create index consumable_usages_batch_id_idx on public.consumable_usages (batch_id);
create index consumable_usages_clinic_id_idx on public.consumable_usages (clinic_id);

revoke all on public.consumable_usages from anon;
revoke insert, update, delete, truncate on public.consumable_usages from authenticated;
alter table public.consumable_usages enable row level security;

create policy "pharmacy cashier and management read consumable_usages" on public.consumable_usages
  for select to authenticated
  using (
    clinic_id = (select private.auth_clinic_id())
    and (select private.auth_role()) in ('pharmacist', 'cashier', 'admin', 'owner')
  );

-- FEFO deduction of a visit's consumables. Called from sign_visit (doctor). Idempotent.
create function private.use_consumables(p_visit_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_clinic_id uuid := private.auth_clinic_id();
  v_today date := (now() at time zone 'Asia/Jakarta')::date;
  v_item record;
  v_batch record;
  v_remaining integer;
  v_take integer;
  v_usage_id uuid;
begin
  if not exists (select 1 from public.visits
                  where id = p_visit_id and clinic_id = v_clinic_id and doctor_id = v_uid
                    and private.auth_role() = 'doctor') then
    raise exception 'not_your_patient';
  end if;
  if exists (select 1 from public.consumable_usages where visit_id = p_visit_id) then
    return;
  end if;

  for v_item in
    select pc.id, pc.medicine_id, pc.qty, m.price, m.name
      from public.procedure_consumables pc
      join public.visit_procedures vp on vp.id = pc.visit_procedure_id
      join public.medicines m on m.id = pc.medicine_id
     where vp.visit_id = p_visit_id
     order by pc.created_at, pc.id
  loop
    v_remaining := v_item.qty;
    for v_batch in
      select id, qty_on_hand, unit_cost from public.stock_batches
       where medicine_id = v_item.medicine_id and clinic_id = v_clinic_id
         and qty_on_hand > 0 and expiry_date > v_today
       order by expiry_date, created_at, id
       for update
    loop
      exit when v_remaining = 0;
      v_take := least(v_remaining, v_batch.qty_on_hand);
      update public.stock_batches set qty_on_hand = qty_on_hand - v_take where id = v_batch.id;
      insert into public.consumable_usages
        (clinic_id, visit_id, procedure_consumable_id, medicine_id, batch_id, qty, unit_price, unit_cost)
      values (v_clinic_id, p_visit_id, v_item.id, v_item.medicine_id, v_batch.id, v_take, v_item.price, v_batch.unit_cost)
      returning id into v_usage_id;
      insert into public.stock_movements (clinic_id, medicine_id, batch_id, type, qty, ref_type, ref_id, created_by)
      values (v_clinic_id, v_item.medicine_id, v_batch.id, 'consumable', -v_take, 'consumable_usage', v_usage_id, v_uid);
      v_remaining := v_remaining - v_take;
    end loop;
    if v_remaining > 0 then
      raise exception 'insufficient_stock' using detail = v_item.name;
    end if;
  end loop;
end;
$$;

revoke execute on function private.use_consumables(uuid) from public, anon;
grant execute on function private.use_consumables(uuid) to authenticated;

-- Signing now also takes the consumables from stock, in the same transaction.
create or replace function public.sign_visit(p_visit_id uuid)
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

  perform private.use_consumables(p_visit_id);

  v_status := case when private.visit_has_prescription_items(p_visit_id) then 'to_pharmacy' else 'to_cashier' end;
  update public.visits set status = v_status where id = p_visit_id;
  if not found then
    raise exception 'visit_not_found';
  end if;
  return v_status;
end;
$$;

-- Invoices get a 'consumable' line type.
alter table public.invoice_items drop constraint invoice_items_item_type_check;
alter table public.invoice_items add constraint invoice_items_item_type_check
  check (item_type in ('consultation', 'procedure', 'medicine', 'consumable', 'service', 'package'));

create or replace function private.create_invoice(p_visit_id uuid)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_clinic_id uuid := private.auth_clinic_id();
  v_today date := (now() at time zone 'Asia/Jakarta')::date;
  v_visit record;
  v_invoice_id uuid;
  v_service record;
begin
  if v_clinic_id is null or private.auth_role() not in ('cashier', 'admin', 'owner') then
    raise exception 'not_allowed';
  end if;

  select v.id, v.payer_type, v.status, v.doctor_id, p.consultation_service_id
    into v_visit
    from public.visits v
    join public.polis p on p.id = v.poli_id
   where v.id = p_visit_id and v.clinic_id = v_clinic_id
   for update of v;
  if not found then
    raise exception 'visit_not_found';
  end if;

  select id into v_invoice_id from public.invoices where visit_id = p_visit_id and status <> 'void';
  if found then
    return v_invoice_id;
  end if;
  if v_visit.status <> 'to_cashier' then
    raise exception 'not_at_cashier';
  end if;

  insert into public.invoices (clinic_id, visit_id, invoice_no, payer_type, created_by)
  values (
    v_clinic_id, p_visit_id,
    'INV/' || to_char(v_today, 'YYYY/MM') || '/'
      || lpad(private.next_counter('invoice:' || to_char(v_today, 'YYYY-MM'))::text, 4, '0'),
    v_visit.payer_type, v_uid
  )
  returning id into v_invoice_id;

  -- Consultation (the poli's tariff, if set and active).
  select id, name, price into v_service from public.services
   where id = v_visit.consultation_service_id and clinic_id = v_clinic_id and is_active;
  if found then
    insert into public.invoice_items
      (clinic_id, invoice_id, item_type, service_id, description, qty, unit_price, amount, doctor_fee, fee_recipient_id)
    values (v_clinic_id, v_invoice_id, 'consultation', v_service.id, v_service.name, 1, v_service.price, v_service.price,
            private.doctor_fee(v_service.id, v_service.price, 1), v_visit.doctor_id);
  end if;

  -- Procedures at the price copied when the doctor added them.
  insert into public.invoice_items
    (clinic_id, invoice_id, item_type, ref_id, service_id, description, qty, unit_price, amount, doctor_fee, fee_recipient_id)
  select v_clinic_id, v_invoice_id, 'procedure', vp.id, vp.service_id, s.name, vp.qty, vp.price, vp.qty * vp.price,
         private.doctor_fee(vp.service_id, vp.price, vp.qty), vp.performed_by
    from public.visit_procedures vp
    join public.services s on s.id = vp.service_id
   where vp.visit_id = p_visit_id;

  -- Medicines actually given, at the selling price copied at dispensing.
  insert into public.invoice_items
    (clinic_id, invoice_id, item_type, ref_id, medicine_id, description, qty, unit_price, amount)
  select v_clinic_id, v_invoice_id, 'medicine', di.prescription_item_id, di.medicine_id,
         case when pi.compound_id is null then m.name else 'Racikan: ' || m.name end,
         sum(di.qty)::integer, di.unit_price, sum(di.qty) * di.unit_price
    from public.dispense_items di
    join public.dispensations d on d.id = di.dispensation_id
    join public.prescription_items pi on pi.id = di.prescription_item_id
    join public.medicines m on m.id = di.medicine_id
   where d.visit_id = p_visit_id and di.status = 'given'
   group by di.prescription_item_id, di.medicine_id, pi.compound_id, m.name, di.unit_price;

  -- Consumables used in procedures (deducted from stock at signing), at the copied selling price.
  insert into public.invoice_items
    (clinic_id, invoice_id, item_type, ref_id, medicine_id, description, qty, unit_price, amount)
  select v_clinic_id, v_invoice_id, 'consumable', cu.procedure_consumable_id, cu.medicine_id, 'BHP: ' || m.name,
         sum(cu.qty)::integer, cu.unit_price, sum(cu.qty) * cu.unit_price
    from public.consumable_usages cu
    join public.medicines m on m.id = cu.medicine_id
   where cu.visit_id = p_visit_id
   group by cu.procedure_consumable_id, cu.medicine_id, m.name, cu.unit_price;

  perform private.recalc_invoice(v_invoice_id);
  return v_invoice_id;
end;
$$;

-- P&L: consumables' batch cost counts as medicine cost.
create or replace function public.report_profit_loss(p_from date, p_to date)
returns table (revenue bigint, medicine_cost bigint, expenses bigint, profit bigint)
language plpgsql
stable
security invoker
set search_path = ''
as $$
declare
  v_revenue bigint;
  v_cost bigint;
  v_expenses bigint;
begin
  perform private.assert_report_access(p_from, p_to);

  select coalesce(sum(i.total), 0) into v_revenue
    from public.invoices i
   where i.status = 'paid' and i.payer_type = 'umum'
     and (i.paid_at at time zone 'Asia/Jakarta')::date between p_from and p_to;

  select coalesce(sum(c.cost), 0) into v_cost
    from (
      select di.qty * di.unit_cost as cost, d.visit_id
        from public.dispense_items di
        join public.dispensations d on d.id = di.dispensation_id
       where di.status = 'given'
      union all
      select cu.qty * cu.unit_cost, cu.visit_id
        from public.consumable_usages cu
    ) c
    join public.invoices i on i.visit_id = c.visit_id and i.status = 'paid'
   where (i.paid_at at time zone 'Asia/Jakarta')::date between p_from and p_to;

  select coalesce(sum(e.amount), 0) into v_expenses
    from public.expenses e
   where e.status = 'active' and e.expense_date between p_from and p_to;

  return query select v_revenue, v_cost, v_expenses, v_revenue - v_cost - v_expenses;
end;
$$;
