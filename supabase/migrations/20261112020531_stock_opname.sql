-- Stock opname: counted vs system quantity per batch, posted atomically. Each
-- difference becomes an 'opname' stock movement and sets the batch quantity.

create table public.stock_opnames (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid not null references public.clinics (id),
  opname_date date not null,
  note text check (length(note) <= 500),
  posted_by uuid not null references public.profiles (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index stock_opnames_clinic_date_idx on public.stock_opnames (clinic_id, opname_date desc);
create index stock_opnames_posted_by_idx on public.stock_opnames (posted_by);

create table public.stock_opname_items (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid not null references public.clinics (id),
  opname_id uuid not null references public.stock_opnames (id),
  batch_id uuid not null references public.stock_batches (id),
  medicine_id uuid not null references public.medicines (id),
  system_qty integer not null check (system_qty >= 0),
  counted_qty integer not null check (counted_qty >= 0),
  difference integer not null,
  reason text check (length(reason) <= 200),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint stock_opname_items_difference check (difference = counted_qty - system_qty),
  constraint stock_opname_items_reason check (difference = 0 or reason is not null),
  constraint stock_opname_items_key unique (opname_id, batch_id)
);

create index stock_opname_items_batch_id_idx on public.stock_opname_items (batch_id);
create index stock_opname_items_medicine_id_idx on public.stock_opname_items (medicine_id);
create index stock_opname_items_clinic_id_idx on public.stock_opname_items (clinic_id);

create trigger stock_opnames_audit after insert or update or delete on public.stock_opnames
  for each row execute function private.audit_row_change();

revoke all on public.stock_opnames, public.stock_opname_items from anon;
revoke insert, update, delete, truncate on public.stock_opnames, public.stock_opname_items from authenticated;
alter table public.stock_opnames enable row level security;
alter table public.stock_opname_items enable row level security;

create policy "pharmacy and management read stock_opnames" on public.stock_opnames
  for select to authenticated
  using (clinic_id = (select private.auth_clinic_id()) and (select private.auth_role()) in ('pharmacist', 'admin', 'owner'));
create policy "pharmacy and management read stock_opname_items" on public.stock_opname_items
  for select to authenticated
  using (clinic_id = (select private.auth_clinic_id()) and (select private.auth_role()) in ('pharmacist', 'admin', 'owner'));

-- p_items: [{ batch_id, counted_qty, reason }]. A reason is required when the count differs.
create function private.post_stock_opname(p_note text, p_items jsonb)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_clinic_id uuid := private.auth_clinic_id();
  v_opname_id uuid;
  v_item jsonb;
  v_batch record;
  v_counted integer;
  v_reason text;
  v_item_id uuid;
begin
  if v_clinic_id is null or private.auth_role() not in ('pharmacist', 'admin', 'owner') then
    raise exception 'not_allowed';
  end if;
  if jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) not between 1 and 2000 then
    raise exception 'items_invalid';
  end if;

  insert into public.stock_opnames (clinic_id, opname_date, note, posted_by)
  values (v_clinic_id, (now() at time zone 'Asia/Jakarta')::date, nullif(trim(p_note), ''), v_uid)
  returning id into v_opname_id;

  for v_item in select * from jsonb_array_elements(p_items) loop
    v_counted := (v_item ->> 'counted_qty')::integer;
    v_reason := nullif(trim(v_item ->> 'reason'), '');
    if v_counted is null or v_counted < 0 then
      raise exception 'items_invalid';
    end if;

    select id, medicine_id, qty_on_hand into v_batch from public.stock_batches
     where id = (v_item ->> 'batch_id')::uuid and clinic_id = v_clinic_id
     for update;
    if not found then
      raise exception 'items_invalid';
    end if;
    if v_counted <> v_batch.qty_on_hand and v_reason is null then
      raise exception 'opname_reason_required';
    end if;

    insert into public.stock_opname_items
      (clinic_id, opname_id, batch_id, medicine_id, system_qty, counted_qty, difference, reason)
    values (v_clinic_id, v_opname_id, v_batch.id, v_batch.medicine_id, v_batch.qty_on_hand, v_counted,
            v_counted - v_batch.qty_on_hand, case when v_counted <> v_batch.qty_on_hand then v_reason end)
    returning id into v_item_id;

    if v_counted <> v_batch.qty_on_hand then
      update public.stock_batches set qty_on_hand = v_counted where id = v_batch.id;
      insert into public.stock_movements (clinic_id, medicine_id, batch_id, type, qty, ref_type, ref_id, created_by)
      values (v_clinic_id, v_batch.medicine_id, v_batch.id, 'opname', v_counted - v_batch.qty_on_hand,
              'stock_opname_item', v_item_id, v_uid);
    end if;
  end loop;

  return v_opname_id;
end;
$$;

revoke execute on function private.post_stock_opname(text, jsonb) from public, anon;
grant execute on function private.post_stock_opname(text, jsonb) to authenticated;

create function public.post_stock_opname(p_note text, p_items jsonb) returns uuid
language sql security invoker set search_path = ''
as $$ select private.post_stock_opname(p_note, p_items); $$;

revoke execute on function public.post_stock_opname(text, jsonb) from public, anon;
grant execute on function public.post_stock_opname(text, jsonb) to authenticated;
