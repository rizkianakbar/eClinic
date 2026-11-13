-- Kasir B: void a paid invoice (owner/admin, with reason; the visit returns to
-- the cashier for a corrected invoice) and service packages ("Paket" tariffs
-- listing the services they include).

-- Packages ------------------------------------------------------------------------

alter table public.services drop constraint services_type_check;
alter table public.services add constraint services_type_check
  check (type in ('consultation', 'procedure', 'other', 'package'));

create table public.service_package_items (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid not null default private.auth_clinic_id() references public.clinics (id),
  package_id uuid not null references public.services (id),
  service_id uuid not null references public.services (id),
  qty integer not null default 1 check (qty between 1 and 100),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint service_package_items_key unique (package_id, service_id),
  constraint service_package_items_not_self check (package_id <> service_id)
);

create index service_package_items_service_id_idx on public.service_package_items (service_id);
create index service_package_items_clinic_id_idx on public.service_package_items (clinic_id);

create trigger service_package_items_set_updated_at before update on public.service_package_items
  for each row execute function public.set_updated_at();
create trigger service_package_items_audit after insert or update or delete on public.service_package_items
  for each row execute function private.audit_row_change();

revoke all on public.service_package_items from anon;
revoke insert, update, delete, truncate on public.service_package_items from authenticated;

alter table public.service_package_items enable row level security;

create policy "staff read service_package_items" on public.service_package_items
  for select to authenticated
  using (clinic_id = (select private.auth_clinic_id()));

-- Replaces a package's contents atomically. p_items: [{ service_id, qty }].
create function private.set_package_items(p_package_id uuid, p_items jsonb)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_clinic_id uuid := private.auth_clinic_id();
  v_item jsonb;
begin
  if v_clinic_id is null or private.auth_role() not in ('owner', 'admin') then
    raise exception 'not_allowed';
  end if;
  if not exists (select 1 from public.services where id = p_package_id and clinic_id = v_clinic_id and type = 'package') then
    raise exception 'package_not_found';
  end if;
  if jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) not between 1 and 50 then
    raise exception 'package_items_invalid';
  end if;

  delete from public.service_package_items where package_id = p_package_id;
  for v_item in select * from jsonb_array_elements(p_items) loop
    if not exists (select 1 from public.services
                    where id = (v_item ->> 'service_id')::uuid and clinic_id = v_clinic_id
                      and type <> 'package' and is_active) then
      raise exception 'package_items_invalid';
    end if;
    insert into public.service_package_items (clinic_id, package_id, service_id, qty)
    values (v_clinic_id, p_package_id, (v_item ->> 'service_id')::uuid, coalesce((v_item ->> 'qty')::integer, 1));
  end loop;
end;
$$;

revoke execute on function private.set_package_items(uuid, jsonb) from public, anon;
grant execute on function private.set_package_items(uuid, jsonb) to authenticated;

create function public.set_package_items(p_package_id uuid, p_items jsonb) returns void
language sql security invoker set search_path = ''
as $$ select private.set_package_items(p_package_id, p_items); $$;

revoke execute on function public.set_package_items(uuid, jsonb) from public, anon;
grant execute on function public.set_package_items(uuid, jsonb) to authenticated;

-- Packages on invoices: one line at the package price, item_type 'package'.

alter table public.invoice_items drop constraint invoice_items_item_type_check;
alter table public.invoice_items add constraint invoice_items_item_type_check
  check (item_type in ('consultation', 'procedure', 'medicine', 'service', 'package'));

create or replace function private.add_invoice_service(p_invoice_id uuid, p_service_id uuid, p_qty integer)
returns void
language plpgsql
security definer
set search_path = ''
as $$
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
   where id = p_service_id and clinic_id = v_invoice.clinic_id and is_active;
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
$$;

create or replace function private.remove_invoice_item(p_item_id uuid)
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
  if v_item.item_type not in ('service', 'package') then
    raise exception 'item_not_removable';
  end if;
  delete from public.invoice_items where id = p_item_id;
  perform private.recalc_invoice(v_item.invoice_id);
end;
$$;

-- Void ----------------------------------------------------------------------------

alter table public.invoices add constraint invoices_void_reason check (status <> 'void' or void_reason is not null);

create function private.void_invoice(p_invoice_id uuid, p_reason text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_invoice public.invoices;
  v_reason text := nullif(trim(p_reason), '');
begin
  if private.auth_role() not in ('owner', 'admin') then
    raise exception 'not_allowed';
  end if;
  select * into v_invoice from public.invoices
   where id = p_invoice_id and clinic_id = private.auth_clinic_id()
   for update;
  if not found then
    raise exception 'invoice_not_found';
  end if;
  if v_invoice.status <> 'paid' then
    raise exception 'invoice_not_paid';
  end if;
  if v_reason is null then
    raise exception 'void_reason_required';
  end if;

  update public.invoices
     set status = 'void', void_reason = v_reason, voided_by = auth.uid(), voided_at = now()
   where id = p_invoice_id;
  -- Back to the cashier for a corrected invoice.
  update public.visits set status = 'to_cashier' where id = v_invoice.visit_id;
end;
$$;

revoke execute on function private.void_invoice(uuid, text) from public, anon;
grant execute on function private.void_invoice(uuid, text) to authenticated;

create function public.void_invoice(p_invoice_id uuid, p_reason text) returns void
language sql security invoker set search_path = ''
as $$ select private.void_invoice(p_invoice_id, p_reason); $$;

revoke execute on function public.void_invoice(uuid, text) from public, anon;
grant execute on function public.void_invoice(uuid, text) to authenticated;

-- Visit status: done -> to_cashier after the paid invoice was voided (owner/admin).

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
      new.called_at := now();
      new.skipped_at := null;
    end if;
  end if;

  return new;
end;
$$;
