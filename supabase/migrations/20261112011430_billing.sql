-- Billing: invoices built from the visit (consultation, procedures, dispensed
-- medicines), discounts with reasons, payment, visit -> done, and the outbox
-- (integration_jobs) written in the same transaction.
--
-- Users have no write privileges on billing tables. Every change goes through a
-- checked SECURITY DEFINER function in `private`, reached via a SECURITY INVOKER
-- wrapper in `public` (same pattern as stock).

-- Consultation tariff per poli (clinic decision) --------------------------------

alter table public.polis add column consultation_service_id uuid references public.services (id);
create index polis_consultation_service_id_idx on public.polis (consultation_service_id);
grant update (consultation_service_id) on public.polis to authenticated;

-- Tables ------------------------------------------------------------------------

create table public.invoices (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid not null references public.clinics (id),
  visit_id uuid not null references public.visits (id),
  invoice_no text not null,
  payer_type text not null check (payer_type in ('umum', 'bpjs')),
  status text not null default 'draft' check (status in ('draft', 'paid', 'void')),
  -- All integer rupiah. total = subtotal - item discounts - discount.
  subtotal bigint not null default 0 check (subtotal >= 0),
  item_discount bigint not null default 0 check (item_discount >= 0),
  discount bigint not null default 0 check (discount >= 0),
  discount_reason text check (length(discount_reason) <= 200),
  discounted_by uuid references public.profiles (id),
  total bigint not null default 0 check (total >= 0),
  paid_at timestamptz,
  paid_by uuid references public.profiles (id),
  void_reason text check (length(void_reason) <= 200),
  voided_by uuid references public.profiles (id),
  voided_at timestamptz,
  created_by uuid not null references public.profiles (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint invoices_clinic_no_key unique (clinic_id, invoice_no),
  constraint invoices_total_formula check (total = subtotal - item_discount - discount),
  constraint invoices_discount_reason check (discount = 0 or discount_reason is not null)
);

-- One live invoice per visit; a voided one can be replaced.
create unique index invoices_visit_live_key on public.invoices (visit_id) where status <> 'void';
create index invoices_clinic_status_idx on public.invoices (clinic_id, status);
create index invoices_clinic_paid_idx on public.invoices (clinic_id, paid_at);
create index invoices_created_by_idx on public.invoices (created_by);
create index invoices_paid_by_idx on public.invoices (paid_by);
create index invoices_discounted_by_idx on public.invoices (discounted_by);
create index invoices_voided_by_idx on public.invoices (voided_by);

create table public.invoice_items (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid not null references public.clinics (id),
  invoice_id uuid not null references public.invoices (id),
  item_type text not null check (item_type in ('consultation', 'procedure', 'medicine', 'service')),
  -- Source row: visit_procedures.id or prescription_items.id; null for consultation/service.
  ref_id uuid,
  service_id uuid references public.services (id),
  medicine_id uuid references public.medicines (id),
  description text not null,
  qty integer not null check (qty > 0),
  unit_price bigint not null check (unit_price >= 0),
  discount bigint not null default 0 check (discount >= 0),
  discount_reason text check (length(discount_reason) <= 200),
  discounted_by uuid references public.profiles (id),
  amount bigint not null check (amount >= 0),
  -- Jasa medis from the service's rule at billing time, and who earns it.
  doctor_fee bigint not null default 0 check (doctor_fee >= 0),
  fee_recipient_id uuid references public.profiles (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint invoice_items_amount_formula check (amount = qty * unit_price - discount),
  constraint invoice_items_discount_reason check (discount = 0 or discount_reason is not null)
);

create index invoice_items_invoice_id_idx on public.invoice_items (invoice_id);
create index invoice_items_clinic_type_idx on public.invoice_items (clinic_id, item_type);
create index invoice_items_service_id_idx on public.invoice_items (service_id);
create index invoice_items_medicine_id_idx on public.invoice_items (medicine_id);
create index invoice_items_fee_recipient_idx on public.invoice_items (fee_recipient_id);
create index invoice_items_discounted_by_idx on public.invoice_items (discounted_by);

create table public.payments (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid not null references public.clinics (id),
  invoice_id uuid not null references public.invoices (id),
  method text not null check (method in ('cash', 'qris', 'transfer')),
  amount bigint not null check (amount >= 0),
  cash_received bigint check (cash_received >= 0),
  change bigint check (change >= 0),
  reference text check (length(reference) <= 100),
  paid_by uuid not null references public.profiles (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint payments_cash_fields check (
    (method = 'cash' and cash_received is not null and change = cash_received - amount)
    or (method <> 'cash' and cash_received is null and change is null)
  )
);

create index payments_invoice_id_idx on public.payments (invoice_id);
create index payments_clinic_created_idx on public.payments (clinic_id, created_at);
create index payments_paid_by_idx on public.payments (paid_by);

-- Outbox for SATUSEHAT / PCare (runner comes with the integrations module).
create table public.integration_jobs (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid not null references public.clinics (id),
  target text not null check (target in ('satusehat', 'pcare')),
  resource text not null,
  ref_id uuid not null,
  idempotency_key text not null unique,
  status text not null default 'pending' check (status in ('pending', 'processing', 'success', 'dead')),
  attempts integer not null default 0,
  next_run_at timestamptz not null default now(),
  last_error text,
  external_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index integration_jobs_due_idx on public.integration_jobs (status, next_run_at);
create index integration_jobs_clinic_status_idx on public.integration_jobs (clinic_id, status);

do $$
declare
  t text;
begin
  foreach t in array array['invoices', 'invoice_items', 'payments', 'integration_jobs'] loop
    execute format('create trigger %1$s_set_updated_at before update on public.%1$s
                    for each row execute function public.set_updated_at()', t);
    execute format('revoke all on public.%1$s from anon', t);
    execute format('revoke insert, update, delete, truncate on public.%1$s from authenticated', t);
    execute format('alter table public.%1$s enable row level security', t);
  end loop;
  foreach t in array array['invoices', 'invoice_items', 'payments'] loop
    execute format('create trigger %1$s_audit after insert or update or delete on public.%1$s
                    for each row execute function private.audit_row_change()', t);
    execute format('create policy "cashier and management read %1$s" on public.%1$s
                    for select to authenticated
                    using (clinic_id = (select private.auth_clinic_id())
                           and (select private.auth_role()) in (''cashier'', ''admin'', ''owner''))', t);
  end loop;
end;
$$;

create policy "management reads integration jobs" on public.integration_jobs
  for select to authenticated
  using (
    clinic_id = (select private.auth_clinic_id())
    and (select private.auth_role()) in ('admin', 'owner')
  );

-- Helpers -------------------------------------------------------------------------

-- Jasa medis for qty units at unit_price under a service's rule.
create function private.doctor_fee(p_service_id uuid, p_unit_price bigint, p_qty integer)
returns bigint
language sql
stable
set search_path = ''
as $$
  select coalesce((
    select case doctor_fee_type
             when 'fixed' then doctor_fee_value * p_qty
             when 'percent' then floor(p_unit_price * doctor_fee_value / 100.0)::bigint * p_qty
             else 0
           end
      from public.services where id = p_service_id
  ), 0);
$$;

-- Recomputes invoice totals from its items.
create function private.recalc_invoice(p_invoice_id uuid)
returns void
language sql
set search_path = ''
as $$
  update public.invoices i
     set subtotal = t.subtotal,
         item_discount = t.item_discount,
         total = t.subtotal - t.item_discount - i.discount
    from (
      select coalesce(sum(qty * unit_price), 0) as subtotal, coalesce(sum(discount), 0) as item_discount
        from public.invoice_items where invoice_id = p_invoice_id
    ) t
   where i.id = p_invoice_id;
$$;

-- The caller's draft invoice, locked; raises when not allowed.
create function private.lock_draft_invoice(p_invoice_id uuid)
returns public.invoices
language plpgsql
set search_path = ''
as $$
declare
  v_invoice public.invoices;
begin
  if private.auth_role() not in ('cashier', 'admin', 'owner') then
    raise exception 'not_allowed';
  end if;
  select * into v_invoice from public.invoices
   where id = p_invoice_id and clinic_id = private.auth_clinic_id()
   for update;
  if not found then
    raise exception 'invoice_not_found';
  end if;
  if v_invoice.status <> 'draft' then
    raise exception 'invoice_locked';
  end if;
  return v_invoice;
end;
$$;

revoke execute on function private.doctor_fee(uuid, bigint, integer) from public, anon, authenticated;
revoke execute on function private.recalc_invoice(uuid) from public, anon, authenticated;
revoke execute on function private.lock_draft_invoice(uuid) from public, anon, authenticated;

-- Create the invoice for a visit at the cashier (or return the live one) --------

create function private.create_invoice(p_visit_id uuid)
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

  perform private.recalc_invoice(v_invoice_id);
  return v_invoice_id;
end;
$$;

-- Add an extra service (e.g. administration) to a draft ---------------------------

create function private.add_invoice_service(p_invoice_id uuid, p_service_id uuid, p_qty integer)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_invoice public.invoices := private.lock_draft_invoice(p_invoice_id);
  v_service record;
  v_doctor_id uuid;
begin
  if p_qty is null or p_qty not between 1 and 100 then
    raise exception 'qty_invalid';
  end if;
  select id, name, price into v_service from public.services
   where id = p_service_id and clinic_id = v_invoice.clinic_id and is_active;
  if not found then
    raise exception 'service_inactive';
  end if;
  select doctor_id into v_doctor_id from public.visits where id = v_invoice.visit_id;

  insert into public.invoice_items
    (clinic_id, invoice_id, item_type, service_id, description, qty, unit_price, amount, doctor_fee, fee_recipient_id)
  values (v_invoice.clinic_id, p_invoice_id, 'service', v_service.id, v_service.name, p_qty, v_service.price,
          p_qty * v_service.price, private.doctor_fee(v_service.id, v_service.price, p_qty), v_doctor_id);
  perform private.recalc_invoice(p_invoice_id);
end;
$$;

-- Remove a manually added service from a draft (system lines are waived by discount).

create function private.remove_invoice_item(p_item_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_item record;
begin
  select id, invoice_id, item_type into v_item from public.invoice_items
   where id = p_item_id and clinic_id = private.auth_clinic_id();
  if not found then
    raise exception 'invoice_not_found';
  end if;
  perform private.lock_draft_invoice(v_item.invoice_id);
  if v_item.item_type <> 'service' then
    raise exception 'item_not_removable';
  end if;
  delete from public.invoice_items where id = p_item_id;
  perform private.recalc_invoice(v_item.invoice_id);
end;
$$;

-- Discounts (reason required, who gave it recorded) --------------------------------

create function private.set_item_discount(p_item_id uuid, p_discount bigint, p_reason text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_item record;
  v_reason text := nullif(trim(p_reason), '');
begin
  select id, invoice_id, qty, unit_price into v_item from public.invoice_items
   where id = p_item_id and clinic_id = private.auth_clinic_id();
  if not found then
    raise exception 'invoice_not_found';
  end if;
  perform private.lock_draft_invoice(v_item.invoice_id);
  if p_discount is null or p_discount < 0 or p_discount > v_item.qty * v_item.unit_price then
    raise exception 'discount_invalid';
  end if;
  if p_discount > 0 and v_reason is null then
    raise exception 'discount_reason_required';
  end if;

  update public.invoice_items
     set discount = p_discount,
         discount_reason = case when p_discount > 0 then v_reason end,
         discounted_by = case when p_discount > 0 then auth.uid() end,
         amount = qty * unit_price - p_discount
   where id = p_item_id;
  -- An item discount larger than what the invoice discount leaves fails the total >= 0 check.
  perform private.recalc_invoice(v_item.invoice_id);
end;
$$;

create function private.set_invoice_discount(p_invoice_id uuid, p_discount bigint, p_reason text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_invoice public.invoices := private.lock_draft_invoice(p_invoice_id);
  v_reason text := nullif(trim(p_reason), '');
begin
  if p_discount is null or p_discount < 0 or p_discount > v_invoice.subtotal - v_invoice.item_discount then
    raise exception 'discount_invalid';
  end if;
  if p_discount > 0 and v_reason is null then
    raise exception 'discount_reason_required';
  end if;
  update public.invoices
     set discount = p_discount,
         discount_reason = case when p_discount > 0 then v_reason end,
         discounted_by = case when p_discount > 0 then auth.uid() end,
         total = subtotal - item_discount - p_discount
   where id = p_invoice_id;
end;
$$;

-- Pay (or close a BPJS invoice), finish the visit, queue integration jobs ---------

create function private.pay_invoice(p_invoice_id uuid, p_method text, p_cash_received bigint, p_reference text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_invoice public.invoices := private.lock_draft_invoice(p_invoice_id);
  v_bpjs_enabled boolean;
begin
  if v_invoice.payer_type = 'umum' then
    if p_method is null or p_method not in ('cash', 'qris', 'transfer') then
      raise exception 'payment_method_invalid';
    end if;
    if p_method = 'cash' and (p_cash_received is null or p_cash_received < v_invoice.total) then
      raise exception 'cash_not_enough';
    end if;
    insert into public.payments (clinic_id, invoice_id, method, amount, cash_received, change, reference, paid_by)
    values (v_invoice.clinic_id, p_invoice_id, p_method, v_invoice.total,
            case when p_method = 'cash' then p_cash_received end,
            case when p_method = 'cash' then p_cash_received - v_invoice.total end,
            nullif(trim(p_reference), ''), v_uid);
  end if;
  -- BPJS: covered, no payment row.

  update public.invoices set status = 'paid', paid_at = now(), paid_by = v_uid where id = p_invoice_id;
  update public.visits set status = 'done' where id = v_invoice.visit_id;

  -- Outbox (same transaction): SATUSEHAT always; PCare for BPJS when enabled.
  insert into public.integration_jobs (clinic_id, target, resource, ref_id, idempotency_key)
  values (v_invoice.clinic_id, 'satusehat', 'encounter', v_invoice.visit_id,
          'satusehat:encounter:' || v_invoice.visit_id)
  on conflict (idempotency_key) do nothing;

  select bpjs_enabled into v_bpjs_enabled from public.clinics where id = v_invoice.clinic_id;
  if v_invoice.payer_type = 'bpjs' and v_bpjs_enabled then
    insert into public.integration_jobs (clinic_id, target, resource, ref_id, idempotency_key)
    values (v_invoice.clinic_id, 'pcare', 'kunjungan', v_invoice.visit_id, 'pcare:kunjungan:' || v_invoice.visit_id)
    on conflict (idempotency_key) do nothing;
  end if;
end;
$$;

-- Visit status: to_cashier -> done once the invoice is paid. ----------------------

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
    elsif old.status = 'to_cashier' and new.status = 'done' then
      if v_role not in ('cashier', 'admin', 'owner') then
        raise exception 'not_allowed';
      end if;
      if not exists (select 1 from public.invoices i where i.visit_id = old.id and i.status = 'paid') then
        raise exception 'not_paid';
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

-- Grants and public wrappers -------------------------------------------------------

revoke execute on function private.create_invoice(uuid) from public, anon;
revoke execute on function private.add_invoice_service(uuid, uuid, integer) from public, anon;
revoke execute on function private.remove_invoice_item(uuid) from public, anon;
revoke execute on function private.set_item_discount(uuid, bigint, text) from public, anon;
revoke execute on function private.set_invoice_discount(uuid, bigint, text) from public, anon;
revoke execute on function private.pay_invoice(uuid, text, bigint, text) from public, anon;
grant execute on function private.create_invoice(uuid) to authenticated;
grant execute on function private.add_invoice_service(uuid, uuid, integer) to authenticated;
grant execute on function private.remove_invoice_item(uuid) to authenticated;
grant execute on function private.set_item_discount(uuid, bigint, text) to authenticated;
grant execute on function private.set_invoice_discount(uuid, bigint, text) to authenticated;
grant execute on function private.pay_invoice(uuid, text, bigint, text) to authenticated;

create function public.create_invoice(p_visit_id uuid) returns uuid
language sql security invoker set search_path = ''
as $$ select private.create_invoice(p_visit_id); $$;

create function public.add_invoice_service(p_invoice_id uuid, p_service_id uuid, p_qty integer) returns void
language sql security invoker set search_path = ''
as $$ select private.add_invoice_service(p_invoice_id, p_service_id, p_qty); $$;

create function public.remove_invoice_item(p_item_id uuid) returns void
language sql security invoker set search_path = ''
as $$ select private.remove_invoice_item(p_item_id); $$;

create function public.set_item_discount(p_item_id uuid, p_discount bigint, p_reason text) returns void
language sql security invoker set search_path = ''
as $$ select private.set_item_discount(p_item_id, p_discount, p_reason); $$;

create function public.set_invoice_discount(p_invoice_id uuid, p_discount bigint, p_reason text) returns void
language sql security invoker set search_path = ''
as $$ select private.set_invoice_discount(p_invoice_id, p_discount, p_reason); $$;

create function public.pay_invoice(p_invoice_id uuid, p_method text, p_cash_received bigint, p_reference text)
returns void
language sql security invoker set search_path = ''
as $$ select private.pay_invoice(p_invoice_id, p_method, p_cash_received, p_reference); $$;

revoke execute on function public.create_invoice(uuid) from public, anon;
revoke execute on function public.add_invoice_service(uuid, uuid, integer) from public, anon;
revoke execute on function public.remove_invoice_item(uuid) from public, anon;
revoke execute on function public.set_item_discount(uuid, bigint, text) from public, anon;
revoke execute on function public.set_invoice_discount(uuid, bigint, text) from public, anon;
revoke execute on function public.pay_invoice(uuid, text, bigint, text) from public, anon;
grant execute on function public.create_invoice(uuid) to authenticated;
grant execute on function public.add_invoice_service(uuid, uuid, integer) to authenticated;
grant execute on function public.remove_invoice_item(uuid) to authenticated;
grant execute on function public.set_item_discount(uuid, bigint, text) to authenticated;
grant execute on function public.set_invoice_discount(uuid, bigint, text) to authenticated;
grant execute on function public.pay_invoice(uuid, text, bigint, text) to authenticated;
