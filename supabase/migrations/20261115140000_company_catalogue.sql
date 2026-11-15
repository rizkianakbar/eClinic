-- The company is the head, branches are its children (Vercel: team → projects).
--
-- The catalogue moves from each branch to the organization: polis (and their consultation fee), services and
-- packages, medicines, suppliers. A new branch has all of it at once and nothing drifts apart (one price list:
-- clinic decision 2026-11-15). Operations stay per branch: stock batches and movements, purchases, visits,
-- invoices, letters, reports. clinic_id on a catalogue row now means "created at branch" (like patients).
--
-- Also: branches are archived instead of deleted (no hard deletes of clinical or financial data) and can be
-- restored; company-level functions (overview, branches, staff, rename) work for the owner without an active
-- branch, as the company pages sit outside any branch; the audit log learns organization-level rows.

-- Audit log: organization-level rows ---------------------------------------------------------------------

alter table public.audit_logs add column organization_id uuid references public.organizations (id);
update public.audit_logs a set organization_id = c.organization_id from public.clinics c where c.id = a.clinic_id;
alter table public.audit_logs alter column organization_id set not null;
alter table public.audit_logs alter column clinic_id drop not null;
create index audit_logs_organization_created_idx on public.audit_logs (organization_id, created_at desc);

-- A change to an organization-wide row (catalogue, patients, profiles) is logged at the branch where it was
-- made; one made from the company pages (no branch) at the organization only.
create or replace function private.audit_row_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_row jsonb := to_jsonb(coalesce(new, old));
  v_clinic_id uuid;
  v_organization_id uuid;
begin
  v_clinic_id := case
    when tg_table_name = 'clinics' then (v_row ->> 'id')::uuid
    when v_row ? 'organization_id' then coalesce(private.auth_clinic_id(), (v_row ->> 'clinic_id')::uuid)
    else (v_row ->> 'clinic_id')::uuid
  end;
  v_organization_id := coalesce(
    (v_row ->> 'organization_id')::uuid,
    case when tg_table_name = 'organizations' then (v_row ->> 'id')::uuid end,
    (select organization_id from public.clinics where id = v_clinic_id)
  );

  insert into public.audit_logs (organization_id, clinic_id, actor_id, action, table_name, record_id, before, after)
  values (
    v_organization_id,
    v_clinic_id,
    auth.uid(),
    lower(tg_op),
    tg_table_name,
    (v_row ->> 'id')::uuid,
    case when tg_op in ('UPDATE', 'DELETE') then to_jsonb(old) end,
    case when tg_op in ('INSERT', 'UPDATE') then to_jsonb(new) end
  );
  return coalesce(new, old);
end;
$$;

create trigger organizations_audit
  after insert or update or delete on public.organizations
  for each row execute function private.audit_row_change();

-- Catalogue → organization -------------------------------------------------------------------------------

do $$
declare
  t text;
begin
  foreach t in array array['polis', 'services', 'medicines', 'suppliers', 'service_package_items'] loop
    execute format('alter table public.%I add column organization_id uuid references public.organizations (id)', t);
    execute format(
      'update public.%I x set organization_id = c.organization_id from public.clinics c where c.id = x.clinic_id', t);
    execute format('alter table public.%I alter column organization_id set not null', t);
    execute format('alter table public.%I alter column organization_id set default private.auth_organization_id()', t);
    execute format('alter table public.%I alter column clinic_id drop not null', t);
    execute format('alter table public.%I alter column clinic_id set default private.auth_clinic_id()', t);
    execute format('create index %1$s_organization_id_idx on public.%1$s (organization_id)', t);
  end loop;
end;
$$;

comment on column public.polis.clinic_id is 'The branch where it was created; the catalogue belongs to the organization.';
comment on column public.services.clinic_id is 'The branch where it was created; the catalogue belongs to the organization.';
comment on column public.medicines.clinic_id is 'The branch where it was created; the catalogue belongs to the organization.';
comment on column public.suppliers.clinic_id is 'The branch where it was created; the catalogue belongs to the organization.';

-- Branches opened with "copy master data" hold their own copies of the catalogue. One catalogue per organization:
-- keep the oldest item of each name, point every reference at it, and remove the redundant copies (master data,
-- not clinical or financial records; on 2026-11-15 the only copies were unused).
create temporary table catalogue_merge (tbl text not null, dup uuid not null, keep uuid not null) on commit drop;

do $$
declare
  t text;
begin
  foreach t in array array['polis', 'services', 'medicines', 'suppliers'] loop
    execute format($m$
      insert into catalogue_merge (tbl, dup, keep)
      select %1$L, id, keep
        from (
          select id, first_value(id) over (partition by organization_id, lower(name) order by created_at, id) as keep
            from public.%1$I
        ) x
       where id <> keep$m$, t);
  end loop;
end;
$$;

-- A copied package's items duplicate the original package's.
delete from public.service_package_items
 where package_id in (select dup from catalogue_merge where tbl = 'services');

do $$
declare
  r record;
begin
  for r in
    select cl.relname as src_table, att.attname as src_col, rt.relname as target
      from pg_constraint con
      join pg_class cl on cl.oid = con.conrelid
      join pg_class rt on rt.oid = con.confrelid
      join pg_attribute att on att.attrelid = con.conrelid and att.attnum = con.conkey[1]
     where con.contype = 'f'
       and rt.relname in ('polis', 'services', 'medicines', 'suppliers')
       and cl.relnamespace = 'public'::regnamespace
  loop
    execute format(
      'update public.%I s set %I = m.keep from catalogue_merge m where m.tbl = %L and s.%I = m.dup',
      r.src_table, r.src_col, r.target, r.src_col
    );
  end loop;
end;
$$;

delete from public.polis where id in (select dup from catalogue_merge where tbl = 'polis');
delete from public.services where id in (select dup from catalogue_merge where tbl = 'services');
delete from public.medicines where id in (select dup from catalogue_merge where tbl = 'medicines');
delete from public.suppliers where id in (select dup from catalogue_merge where tbl = 'suppliers');

-- Names are unique per organization now.
drop index public.polis_clinic_name_key;
drop index public.services_clinic_name_key;
drop index public.medicines_clinic_name_key;
drop index public.suppliers_clinic_name_key;
drop index public.services_clinic_type_idx;
create unique index polis_organization_name_key on public.polis (organization_id, lower(name));
create unique index services_organization_name_key on public.services (organization_id, lower(name));
create unique index medicines_organization_name_key on public.medicines (organization_id, lower(name));
create unique index suppliers_organization_name_key on public.suppliers (organization_id, lower(name));
create index services_organization_type_idx on public.services (organization_id, type);

drop policy "staff read polis in own clinic" on public.polis;
drop policy "owner and admin add polis" on public.polis;
drop policy "owner and admin update polis" on public.polis;
drop policy "staff read services" on public.services;
drop policy "owner and admin add services" on public.services;
drop policy "owner and admin update services" on public.services;
drop policy "staff read medicines" on public.medicines;
drop policy "owner and admin add medicines" on public.medicines;
drop policy "owner and admin update medicines" on public.medicines;
drop policy "staff read suppliers" on public.suppliers;
drop policy "owner and admin add suppliers" on public.suppliers;
drop policy "owner and admin update suppliers" on public.suppliers;
drop policy "staff read service_package_items" on public.service_package_items;

do $$
declare
  t text;
begin
  foreach t in array array['polis', 'services', 'medicines', 'suppliers'] loop
    execute format($p$
      create policy "staff read %1$s of own organization" on public.%1$I
        for select to authenticated
        using (organization_id = (select private.auth_organization_id()))$p$, t);
    execute format($p$
      create policy "owner and admin add %1$s" on public.%1$I
        for insert to authenticated
        with check (
          organization_id = (select private.auth_organization_id())
          and (select private.auth_role()) in ('owner', 'admin')
        )$p$, t);
    execute format($p$
      create policy "owner and admin update %1$s" on public.%1$I
        for update to authenticated
        using (
          organization_id = (select private.auth_organization_id())
          and (select private.auth_role()) in ('owner', 'admin')
        )
        with check (organization_id = (select private.auth_organization_id()))$p$, t);
  end loop;
end;
$$;

create policy "staff read service_package_items of own organization" on public.service_package_items
  for select to authenticated
  using (organization_id = (select private.auth_organization_id()));

-- A schedule's poli is the organization's (the schedule itself stays at the branch).
drop policy "owner and admin add schedules" on public.doctor_schedules;
drop policy "owner and admin update schedules" on public.doctor_schedules;

create policy "owner and admin add schedules" on public.doctor_schedules
  for insert to authenticated
  with check (
    clinic_id = (select private.auth_clinic_id())
    and (select private.auth_role()) in ('owner', 'admin')
    and exists (
      select 1 from public.profiles p
       where p.id = doctor_schedules.doctor_id and p.role = 'doctor'
         and private.is_clinic_member(p.id, doctor_schedules.clinic_id)
    )
    and exists (
      select 1 from public.polis pl
       where pl.id = doctor_schedules.poli_id and pl.organization_id = (select private.auth_organization_id())
    )
  );

create policy "owner and admin update schedules" on public.doctor_schedules
  for update to authenticated
  using (
    clinic_id = (select private.auth_clinic_id())
    and (select private.auth_role()) in ('owner', 'admin')
  )
  with check (
    clinic_id = (select private.auth_clinic_id())
    and exists (
      select 1 from public.profiles p
       where p.id = doctor_schedules.doctor_id and p.role = 'doctor'
         and private.is_clinic_member(p.id, doctor_schedules.clinic_id)
    )
    and exists (
      select 1 from public.polis pl
       where pl.id = doctor_schedules.poli_id and pl.organization_id = (select private.auth_organization_id())
    )
  );

-- Functions that checked a catalogue row belongs to the branch: it belongs to the organization now. -------

CREATE OR REPLACE FUNCTION private.add_invoice_service(p_invoice_id uuid, p_service_id uuid, p_qty integer)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_invoice public.invoices := private.lock_draft_invoice(p_invoice_id);
  v_service record;
  v_doctor_id uuid;
  v_contents text;
begin
  if p_qty is null or p_qty not between 1 and 100 then
    raise exception 'qty_invalid';
  end if;
  select id, name, price, type into v_service from public.services
   where id = p_service_id and organization_id = (select organization_id from public.clinics where id = v_invoice.clinic_id) and is_active;
  if not found then
    raise exception 'service_inactive';
  end if;
  select doctor_id into v_doctor_id from public.visits where id = v_invoice.visit_id;

  if v_service.type = 'package' then
    select string_agg(s.name || case when pi.qty > 1 then ' x' || pi.qty else '' end, ', ' order by s.name)
      into v_contents
      from public.service_package_items pi
      join public.services s on s.id = pi.service_id
     where pi.package_id = v_service.id;
  end if;

  insert into public.invoice_items
    (clinic_id, invoice_id, item_type, service_id, description, qty, unit_price, amount, doctor_fee, fee_recipient_id)
  values (
    v_invoice.clinic_id, p_invoice_id,
    case when v_service.type = 'package' then 'package' else 'service' end,
    v_service.id,
    v_service.name || coalesce(' (' || v_contents || ')', ''),
    p_qty, v_service.price, p_qty * v_service.price,
    private.doctor_fee(v_service.id, v_service.price, p_qty), v_doctor_id
  );
  perform private.recalc_invoice(p_invoice_id);
end;
$function$
;

CREATE OR REPLACE FUNCTION private.create_invoice(p_visit_id uuid)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
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
   where id = v_visit.consultation_service_id and organization_id = private.auth_organization_id() and is_active;
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
$function$
;

CREATE OR REPLACE FUNCTION private.prescriptions_guard()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
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
                    where m.id = new.medicine_id and m.organization_id = private.auth_organization_id() and m.is_active) then
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
$function$
;

CREATE OR REPLACE FUNCTION private.procedure_consumables_guard()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
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
  if not exists (select 1 from public.medicines m where m.id = new.medicine_id and m.organization_id = private.auth_organization_id() and m.is_active) then
    raise exception 'medicine_inactive';
  end if;
  new.clinic_id := v_clinic_id;
  return new;
end;
$function$
;

CREATE OR REPLACE FUNCTION private.receive_purchase(p_supplier_id uuid, p_invoice_no text, p_purchase_date date, p_note text, p_items jsonb)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_uid uuid := auth.uid();
  v_clinic_id uuid := private.auth_clinic_id();
  v_today date := (now() at time zone 'Asia/Jakarta')::date;
  v_purchase_id uuid;
  v_item jsonb;
  v_medicine_id uuid;
  v_batch_id uuid;
  v_item_id uuid;
  v_qty integer;
  v_cost bigint;
  v_expiry date;
  v_batch_no text;
begin
  if v_clinic_id is null or private.auth_role() not in ('pharmacist', 'admin', 'owner') then
    raise exception 'not_allowed';
  end if;
  if not exists (select 1 from public.suppliers where id = p_supplier_id and organization_id = private.auth_organization_id() and is_active) then
    raise exception 'supplier_inactive';
  end if;
  if p_purchase_date is null or p_purchase_date > v_today then
    raise exception 'purchase_date_invalid';
  end if;
  if jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) not between 1 and 100 then
    raise exception 'items_invalid';
  end if;

  insert into public.purchases (clinic_id, supplier_id, invoice_no, purchase_date, total, note, created_by)
  values (v_clinic_id, p_supplier_id, nullif(trim(p_invoice_no), ''), p_purchase_date, 0,
          nullif(trim(p_note), ''), v_uid)
  returning id into v_purchase_id;

  for v_item in select * from jsonb_array_elements(p_items) loop
    v_medicine_id := (v_item ->> 'medicine_id')::uuid;
    v_batch_no := nullif(trim(v_item ->> 'batch_no'), '');
    v_expiry := (v_item ->> 'expiry_date')::date;
    v_qty := (v_item ->> 'qty')::integer;
    v_cost := (v_item ->> 'unit_cost')::bigint;

    if not exists (select 1 from public.medicines where id = v_medicine_id and organization_id = private.auth_organization_id() and is_active) then
      raise exception 'medicine_inactive';
    end if;
    if v_batch_no is null or v_qty is null or v_qty <= 0 or v_cost is null or v_cost < 0 then
      raise exception 'items_invalid';
    end if;
    if v_expiry is null or v_expiry <= v_today then
      raise exception 'expiry_past';
    end if;

    insert into public.stock_batches (clinic_id, medicine_id, batch_no, expiry_date, qty_on_hand, unit_cost)
    values (v_clinic_id, v_medicine_id, v_batch_no, v_expiry, v_qty, v_cost)
    returning id into v_batch_id;

    insert into public.purchase_items
      (clinic_id, purchase_id, medicine_id, batch_id, batch_no, expiry_date, qty, unit_cost, subtotal)
    values (v_clinic_id, v_purchase_id, v_medicine_id, v_batch_id, v_batch_no, v_expiry, v_qty, v_cost, v_qty * v_cost)
    returning id into v_item_id;

    insert into public.stock_movements (clinic_id, medicine_id, batch_id, type, qty, ref_type, ref_id, created_by)
    values (v_clinic_id, v_medicine_id, v_batch_id, 'purchase', v_qty, 'purchase_item', v_item_id, v_uid);
  end loop;

  update public.purchases
     set total = (select sum(subtotal) from public.purchase_items where purchase_id = v_purchase_id)
   where id = v_purchase_id;

  return v_purchase_id;
end;
$function$
;

CREATE OR REPLACE FUNCTION private.set_package_items(p_package_id uuid, p_items jsonb)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_clinic_id uuid := private.auth_clinic_id();
  v_item jsonb;
begin
  if v_clinic_id is null or private.auth_role() not in ('owner', 'admin') then
    raise exception 'not_allowed';
  end if;
  if not exists (select 1 from public.services where id = p_package_id and organization_id = private.auth_organization_id() and type = 'package') then
    raise exception 'package_not_found';
  end if;
  if jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) not between 1 and 50 then
    raise exception 'package_items_invalid';
  end if;

  delete from public.service_package_items where package_id = p_package_id;
  for v_item in select * from jsonb_array_elements(p_items) loop
    if not exists (select 1 from public.services
                    where id = (v_item ->> 'service_id')::uuid and organization_id = private.auth_organization_id()
                      and type <> 'package' and is_active) then
      raise exception 'package_items_invalid';
    end if;
    insert into public.service_package_items (clinic_id, package_id, service_id, qty)
    values (v_clinic_id, p_package_id, (v_item ->> 'service_id')::uuid, coalesce((v_item ->> 'qty')::integer, 1));
  end loop;
end;
$function$
;

CREATE OR REPLACE FUNCTION private.visit_procedures_guard()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
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
     where id = new.service_id and organization_id = private.auth_organization_id() and is_active and type in ('procedure', 'other');
    if not found then
      raise exception 'service_inactive';
    end if;
    new.price := v_price;
  else
    new.price := old.price;
  end if;

  -- The performer works at this branch (a member), not merely at the organization.
  if not exists (select 1 from public.profiles p
                  where p.id = new.performed_by and private.is_clinic_member(p.id, v_clinic_id)
                    and p.is_active and p.role in ('doctor', 'nurse')) then
    raise exception 'performer_invalid';
  end if;

  new.clinic_id := v_clinic_id;
  if tg_op = 'INSERT' then
    new.created_by := auth.uid();
  end if;
  return new;
end;
$function$
;

-- Company scope (owner, no branch needed) ----------------------------------------------------------------

create function private.assert_company_owner()
returns uuid
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_organization_id uuid := private.auth_organization_id();
begin
  if v_organization_id is null or private.auth_role() <> 'owner' then
    raise exception 'not_allowed' using errcode = '42501';
  end if;

  return v_organization_id;
end;
$$;

-- Opening a branch needs nothing copied any more: the catalogue is the organization's.
drop function public.create_clinic_branch(text, text, text, uuid);
drop function private.create_clinic_branch(text, text, text, uuid);

create function private.create_clinic_branch(p_name text, p_address text, p_phone text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_organization_id uuid := private.assert_company_owner();
  v_clinic_id uuid;
begin
  insert into public.clinics (organization_id, name, address, phone)
  values (v_organization_id, trim(p_name), nullif(trim(p_address), ''), nullif(trim(p_phone), ''))
  returning id into v_clinic_id;

  insert into public.clinic_staff (clinic_id, profile_id)
  select v_clinic_id, p.id
    from public.profiles p
   where p.organization_id = v_organization_id and p.role = 'owner' and p.is_active;

  return v_clinic_id;
end;
$$;

-- Archive ("Hapus cabang") or restore a branch. Its records stay (reports, patient history); nobody can work
-- there while archived. The last open branch cannot be archived.
create function private.set_clinic_branch_active(p_clinic_id uuid, p_active boolean)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_organization_id uuid := private.assert_company_owner();
begin
  if not exists (select 1 from public.clinics where id = p_clinic_id and organization_id = v_organization_id) then
    raise exception 'not_allowed' using errcode = '42501';
  end if;
  if not p_active and not exists (
    select 1 from public.clinics where organization_id = v_organization_id and is_active and id <> p_clinic_id
  ) then
    raise exception 'last_open_branch';
  end if;

  update public.clinics set is_active = p_active where id = p_clinic_id;

  if not p_active then
    update public.profiles set active_clinic_id = null where active_clinic_id = p_clinic_id;
  end if;
end;
$$;

-- Every branch of the organization, archived ones too, with how many staff work there.
create function private.organization_branches()
returns table (id uuid, name text, address text, phone text, is_active boolean, staff integer, created_at timestamptz)
language plpgsql
stable
security definer
set search_path = ''
as $$
#variable_conflict use_column
declare
  v_organization_id uuid := private.assert_company_owner();
begin
  return query
  select c.id, c.name, c.address, c.phone, c.is_active,
         (select count(*) from public.clinic_staff m join public.profiles p on p.id = m.profile_id and p.is_active
           where m.clinic_id = c.id)::integer,
         c.created_at
    from public.clinics c
   where c.organization_id = v_organization_id
   order by c.is_active desc, c.created_at, c.name;
end;
$$;

-- Every open branch's day and its last p_days days, for the company overview: where patients are now (journey
-- stations), revenue (paid umum invoices by Jakarta paid date, as report_revenue_daily) and patients per day.
create function private.organization_overview(p_today date, p_days integer)
returns table (
  clinic_id uuid, name text, address text,
  waiting integer, in_exam integer, to_pharmacy integer, to_cashier integer, done integer, bpjs integer,
  revenue bigint, paid_invoices integer, series jsonb
)
language plpgsql
stable
security definer
set search_path = ''
as $$
#variable_conflict use_column
declare
  v_organization_id uuid := private.assert_company_owner();
begin
  if p_days not between 1 and 92 then
    raise exception 'invalid_range';
  end if;

  return query
  select c.id, c.name, c.address,
         count(v.id) filter (where v.status in ('registered', 'waiting'))::integer,
         count(v.id) filter (where v.status = 'in_exam')::integer,
         count(v.id) filter (where v.status = 'to_pharmacy')::integer,
         count(v.id) filter (where v.status = 'to_cashier')::integer,
         count(v.id) filter (where v.status = 'done')::integer,
         count(v.id) filter (where v.status <> 'cancelled' and v.payer_type = 'bpjs')::integer,
         (select coalesce(sum(i.total), 0) from public.invoices i
           where i.clinic_id = c.id and i.status = 'paid' and i.payer_type = 'umum'
             and (i.paid_at at time zone 'Asia/Jakarta')::date = p_today)::bigint,
         (select count(*) from public.invoices i
           where i.clinic_id = c.id and i.status = 'paid' and i.payer_type = 'umum'
             and (i.paid_at at time zone 'Asia/Jakarta')::date = p_today)::integer,
         (select jsonb_agg(jsonb_build_object('day', d.day, 'revenue', coalesce(r.total, 0), 'patients', coalesce(n.total, 0))
                           order by d.day)
            from (select generate_series(p_today - (p_days - 1), p_today, interval '1 day')::date as day) d
            left join lateral (
              select sum(i.total) as total from public.invoices i
               where i.clinic_id = c.id and i.status = 'paid' and i.payer_type = 'umum'
                 and (i.paid_at at time zone 'Asia/Jakarta')::date = d.day
            ) r on true
            left join lateral (
              select count(*) as total from public.visits x
               where x.clinic_id = c.id and x.visit_date = d.day and x.status <> 'cancelled'
            ) n on true)
    from public.clinics c
    left join public.visits v on v.clinic_id = c.id and v.visit_date = p_today
   where c.organization_id = v_organization_id and c.is_active
   group by c.id
   order by c.created_at, c.name;
end;
$$;

drop function public.organization_today(date);
drop function private.organization_today(date);

create function private.rename_organization(p_name text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_organization_id uuid := private.assert_company_owner();
begin
  update public.organizations set name = trim(p_name) where id = v_organization_id;
end;
$$;

-- Staff management at company level: the owner needs no branch; an admin manages their own branch only.
create or replace function private.list_organization_staff()
returns table (id uuid, full_name text, email text, role public.user_role, is_active boolean, clinic_ids uuid[])
language plpgsql
stable
security definer
set search_path = ''
as $$
#variable_conflict use_column
begin
  if private.auth_organization_id() is null
     or not (private.auth_role() = 'owner' or (private.auth_role() = 'admin' and private.auth_clinic_id() is not null)) then
    raise exception 'not_allowed' using errcode = '42501';
  end if;

  return query
  select p.id, p.full_name, p.email, p.role, p.is_active,
         coalesce(array_agg(m.clinic_id order by c.created_at) filter (where m.clinic_id is not null and c.is_active), '{}')
    from public.profiles p
    left join public.clinic_staff m on m.profile_id = p.id
    left join public.clinics c on c.id = m.clinic_id
   where p.organization_id = private.auth_organization_id()
   group by p.id
   order by p.full_name;
end;
$$;

create or replace function private.assert_can_assign(p_profile_id uuid, p_clinic_id uuid)
returns void
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_organization_id uuid := private.auth_organization_id();
  v_role public.user_role := private.auth_role();
begin
  if v_organization_id is null
     or not (v_role = 'owner' or (v_role = 'admin' and p_clinic_id = private.auth_clinic_id())) then
    raise exception 'not_allowed' using errcode = '42501';
  end if;
  if not exists (select 1 from public.clinics where id = p_clinic_id and organization_id = v_organization_id and is_active)
     or not exists (select 1 from public.profiles where id = p_profile_id and organization_id = v_organization_id) then
    raise exception 'not_allowed' using errcode = '42501';
  end if;
  if v_role <> 'owner' and exists (select 1 from public.profiles where id = p_profile_id and role in ('owner', 'admin')) then
    raise exception 'not_allowed' using errcode = '42501';
  end if;
end;
$$;

-- The owner also reads organization-level audit rows (changes made from the company pages).
drop policy "owner and admin read audit logs" on public.audit_logs;

create policy "owner and admin read audit logs" on public.audit_logs
  for select to authenticated
  using (
    (
      clinic_id = (select private.auth_clinic_id())
      and (
        (select private.auth_role()) = 'owner'
        or ((select private.auth_role()) = 'admin' and table_name <> 'expenses')
      )
    )
    or (
      clinic_id is null
      and organization_id = (select private.auth_organization_id())
      and (select private.auth_role()) = 'owner'
    )
  );

-- Grants and public wrappers -------------------------------------------------------------------------------

revoke execute on all functions in schema private from public, anon;
grant execute on function private.assert_company_owner() to authenticated;
grant execute on function private.create_clinic_branch(text, text, text) to authenticated;
grant execute on function private.set_clinic_branch_active(uuid, boolean) to authenticated;
grant execute on function private.organization_branches() to authenticated;
grant execute on function private.organization_overview(date, integer) to authenticated;
grant execute on function private.rename_organization(text) to authenticated;

create function public.create_clinic_branch(p_name text, p_address text, p_phone text)
returns uuid language sql security invoker set search_path = ''
as $$ select private.create_clinic_branch(p_name, p_address, p_phone) $$;

create function public.set_clinic_branch_active(p_clinic_id uuid, p_active boolean)
returns void language sql security invoker set search_path = ''
as $$ select private.set_clinic_branch_active(p_clinic_id, p_active) $$;

create function public.organization_branches()
returns table (id uuid, name text, address text, phone text, is_active boolean, staff integer, created_at timestamptz)
language sql stable security invoker set search_path = ''
as $$ select * from private.organization_branches() $$;

create function public.organization_overview(p_today date, p_days integer)
returns table (
  clinic_id uuid, name text, address text,
  waiting integer, in_exam integer, to_pharmacy integer, to_cashier integer, done integer, bpjs integer,
  revenue bigint, paid_invoices integer, series jsonb
)
language sql stable security invoker set search_path = ''
as $$ select * from private.organization_overview(p_today, p_days) $$;

create function public.rename_organization(p_name text)
returns void language sql security invoker set search_path = ''
as $$ select private.rename_organization(p_name) $$;

revoke execute on function public.create_clinic_branch(text, text, text) from public, anon;
revoke execute on function public.set_clinic_branch_active(uuid, boolean) from public, anon;
revoke execute on function public.organization_branches() from public, anon;
revoke execute on function public.organization_overview(date, integer) from public, anon;
revoke execute on function public.rename_organization(text) from public, anon;
grant execute on function public.create_clinic_branch(text, text, text) to authenticated;
grant execute on function public.set_clinic_branch_active(uuid, boolean) to authenticated;
grant execute on function public.organization_branches() to authenticated;
grant execute on function public.organization_overview(date, integer) to authenticated;
grant execute on function public.rename_organization(text) to authenticated;
