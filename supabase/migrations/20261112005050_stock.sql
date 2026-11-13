-- Stock: batches (with expiry and unit cost), movements, purchases.
--
-- Stock only changes through stock_movements, in the same transaction that
-- updates stock_batches.qty_on_hand. Users have no write privileges on these
-- tables: every change goes through a checked function (receive_purchase now;
-- dispensing, consumables and stock opname later). Those functions run as
-- SECURITY DEFINER in the unexposed `private` schema and are reached through
-- SECURITY INVOKER wrappers in `public`.

create table public.stock_batches (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid not null references public.clinics (id),
  medicine_id uuid not null references public.medicines (id),
  batch_no text not null check (length(batch_no) between 1 and 50),
  expiry_date date not null,
  qty_on_hand integer not null check (qty_on_hand >= 0),
  -- Purchase cost per unit, integer rupiah: profit and loss uses this, not the sale price.
  unit_cost bigint not null check (unit_cost >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- FEFO lookups (earliest expiry first) and near-expiry alerts.
create index stock_batches_medicine_expiry_idx on public.stock_batches (medicine_id, expiry_date) where qty_on_hand > 0;
create index stock_batches_clinic_expiry_idx on public.stock_batches (clinic_id, expiry_date) where qty_on_hand > 0;
create index stock_batches_medicine_id_idx on public.stock_batches (medicine_id);

create table public.stock_movements (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid not null references public.clinics (id),
  medicine_id uuid not null references public.medicines (id),
  batch_id uuid not null references public.stock_batches (id),
  type text not null check (type in ('purchase', 'dispense', 'consumable', 'opname')),
  -- Signed: positive in, negative out.
  qty integer not null check (qty <> 0),
  ref_type text not null,
  ref_id uuid not null,
  created_by uuid references public.profiles (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index stock_movements_medicine_created_idx on public.stock_movements (medicine_id, created_at, id);
create index stock_movements_batch_id_idx on public.stock_movements (batch_id);
create index stock_movements_ref_idx on public.stock_movements (ref_type, ref_id);
create index stock_movements_clinic_created_idx on public.stock_movements (clinic_id, created_at);
create index stock_movements_created_by_idx on public.stock_movements (created_by);

create table public.purchases (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid not null references public.clinics (id),
  supplier_id uuid not null references public.suppliers (id),
  -- The supplier's invoice / delivery note number.
  invoice_no text check (length(invoice_no) <= 50),
  purchase_date date not null,
  total bigint not null check (total >= 0),
  note text check (length(note) <= 500),
  created_by uuid not null references public.profiles (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index purchases_clinic_date_idx on public.purchases (clinic_id, purchase_date desc);
create index purchases_supplier_id_idx on public.purchases (supplier_id);
create index purchases_created_by_idx on public.purchases (created_by);

create table public.purchase_items (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid not null references public.clinics (id),
  purchase_id uuid not null references public.purchases (id),
  medicine_id uuid not null references public.medicines (id),
  batch_id uuid not null references public.stock_batches (id),
  batch_no text not null,
  expiry_date date not null,
  qty integer not null check (qty > 0),
  unit_cost bigint not null check (unit_cost >= 0),
  subtotal bigint not null check (subtotal = qty * unit_cost),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index purchase_items_purchase_id_idx on public.purchase_items (purchase_id);
create index purchase_items_medicine_id_idx on public.purchase_items (medicine_id);
create index purchase_items_batch_id_idx on public.purchase_items (batch_id);
create index purchase_items_clinic_id_idx on public.purchase_items (clinic_id);

create trigger stock_batches_set_updated_at before update on public.stock_batches
  for each row execute function public.set_updated_at();
create trigger purchases_set_updated_at before update on public.purchases
  for each row execute function public.set_updated_at();
create trigger purchases_audit after insert or update or delete on public.purchases
  for each row execute function private.audit_row_change();

-- Privileges: read-only for users; RLS limits rows and roles.
revoke all on public.stock_batches, public.stock_movements, public.purchases, public.purchase_items from anon;
revoke insert, update, delete, truncate on public.stock_batches, public.stock_movements,
  public.purchases, public.purchase_items from authenticated;

alter table public.stock_batches enable row level security;
alter table public.stock_movements enable row level security;
alter table public.purchases enable row level security;
alter table public.purchase_items enable row level security;

do $$
declare
  t text;
begin
  foreach t in array array['stock_batches', 'stock_movements', 'purchases', 'purchase_items'] loop
    execute format('create policy "pharmacy and management read %1$s" on public.%1$s
                    for select to authenticated
                    using (clinic_id = (select private.auth_clinic_id())
                           and (select private.auth_role()) in (''pharmacist'', ''admin'', ''owner''))', t);
  end loop;
end;
$$;

-- Views (security invoker: the caller's RLS applies) ---------------------------

-- Stock per medicine: total on hand and earliest expiry of batches with stock.
create view public.medicine_stock with (security_invoker = true) as
select
  m.id as medicine_id,
  m.clinic_id,
  m.name,
  m.unit,
  m.min_stock,
  m.is_active,
  coalesce(sum(b.qty_on_hand), 0)::integer as qty_on_hand,
  min(b.expiry_date) as earliest_expiry
from public.medicines m
left join public.stock_batches b on b.medicine_id = m.id and b.qty_on_hand > 0
group by m.id;

-- Kartu stok: every movement with the running balance per medicine.
create view public.stock_card with (security_invoker = true) as
select
  sm.id,
  sm.clinic_id,
  sm.medicine_id,
  sm.created_at,
  sm.type,
  sm.qty,
  sum(sm.qty) over (partition by sm.medicine_id order by sm.created_at, sm.id)::integer as balance,
  b.batch_no,
  b.expiry_date,
  sm.ref_type,
  sm.ref_id,
  p.full_name as created_by_name
from public.stock_movements sm
join public.stock_batches b on b.id = sm.batch_id
left join public.profiles p on p.id = sm.created_by;

revoke all on public.medicine_stock, public.stock_card from anon;
grant select on public.medicine_stock, public.stock_card to authenticated;

-- Receive a purchase -------------------------------------------------------------
-- p_items: [{ medicine_id, batch_no, expiry_date, qty, unit_cost }, ...]
-- One new batch per line (each keeps its own unit cost), one movement per batch.

create function private.receive_purchase(
  p_supplier_id uuid,
  p_invoice_no text,
  p_purchase_date date,
  p_note text,
  p_items jsonb
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
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
  if not exists (select 1 from public.suppliers where id = p_supplier_id and clinic_id = v_clinic_id and is_active) then
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

    if not exists (select 1 from public.medicines where id = v_medicine_id and clinic_id = v_clinic_id and is_active) then
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
$$;

revoke execute on function private.receive_purchase(uuid, text, date, text, jsonb) from public, anon;
grant execute on function private.receive_purchase(uuid, text, date, text, jsonb) to authenticated;

create function public.receive_purchase(
  p_supplier_id uuid,
  p_invoice_no text,
  p_purchase_date date,
  p_note text,
  p_items jsonb
)
returns uuid
language sql
security invoker
set search_path = ''
as $$
  select private.receive_purchase(p_supplier_id, p_invoice_no, p_purchase_date, p_note, p_items);
$$;

revoke execute on function public.receive_purchase(uuid, text, date, text, jsonb) from public, anon;
grant execute on function public.receive_purchase(uuid, text, date, text, jsonb) to authenticated;
