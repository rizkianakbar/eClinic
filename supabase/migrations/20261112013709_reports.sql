-- Owner reports: operational expenses and report functions (revenue, doctor
-- fees, profit and loss). Owner only (clinic decision): RLS on expenses, and an
-- explicit role check in every report function (cashiers can read invoices, so
-- RLS alone would let them see revenue totals). Dates are Asia/Jakarta.

-- Expenses -----------------------------------------------------------------------

create table public.expenses (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid not null default private.auth_clinic_id() references public.clinics (id),
  expense_date date not null,
  category text not null check (length(category) between 1 and 50),
  description text check (length(description) <= 200),
  amount bigint not null check (amount > 0),
  status text not null default 'active' check (status in ('active', 'void')),
  void_reason text check (length(void_reason) <= 200),
  voided_by uuid references public.profiles (id),
  voided_at timestamptz,
  created_by uuid not null default auth.uid() references public.profiles (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint expenses_void_reason check (status <> 'void' or void_reason is not null)
);

create index expenses_clinic_date_idx on public.expenses (clinic_id, expense_date);
create index expenses_created_by_idx on public.expenses (created_by);
create index expenses_voided_by_idx on public.expenses (voided_by);

create trigger expenses_set_updated_at before update on public.expenses
  for each row execute function public.set_updated_at();
create trigger expenses_audit after insert or update or delete on public.expenses
  for each row execute function private.audit_row_change();

-- Only active -> void, with a reason; who and when are stamped here.
create function private.expenses_before_update()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if auth.uid() is null then
    return new;
  end if;
  if old.status <> 'active' or new.status <> 'void' then
    raise exception 'expense_locked';
  end if;
  new.void_reason := nullif(trim(new.void_reason), '');
  if new.void_reason is null then
    raise exception 'void_reason_required';
  end if;
  new.voided_by := auth.uid();
  new.voided_at := now();
  return new;
end;
$$;

revoke execute on function private.expenses_before_update() from public, anon, authenticated;

create trigger expenses_before_update before update on public.expenses
  for each row execute function private.expenses_before_update();

create function private.expenses_before_insert()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if auth.uid() is not null then
    new.clinic_id := private.auth_clinic_id();
    new.created_by := auth.uid();
    new.status := 'active';
  end if;
  return new;
end;
$$;

revoke execute on function private.expenses_before_insert() from public, anon, authenticated;

create trigger expenses_before_insert before insert on public.expenses
  for each row execute function private.expenses_before_insert();

revoke all on public.expenses from anon;
revoke insert, update, delete, truncate on public.expenses from authenticated;
grant insert (expense_date, category, description, amount) on public.expenses to authenticated;
grant update (status, void_reason) on public.expenses to authenticated;

alter table public.expenses enable row level security;

create policy "owner reads expenses" on public.expenses
  for select to authenticated
  using (clinic_id = (select private.auth_clinic_id()) and (select private.auth_role()) = 'owner');

create policy "owner adds expenses" on public.expenses
  for insert to authenticated
  with check (clinic_id = (select private.auth_clinic_id()) and (select private.auth_role()) = 'owner');

create policy "owner voids expenses" on public.expenses
  for update to authenticated
  using (clinic_id = (select private.auth_clinic_id()) and (select private.auth_role()) = 'owner')
  with check (clinic_id = (select private.auth_clinic_id()));

-- Report functions (security invoker: RLS applies on top of the owner check) -----

create function private.assert_report_access(p_from date, p_to date)
returns void
language plpgsql
stable
set search_path = ''
as $$
begin
  if private.auth_role() is distinct from 'owner' then
    raise exception 'not_allowed';
  end if;
  if p_from is null or p_to is null or p_from > p_to or p_to - p_from > 366 then
    raise exception 'range_invalid';
  end if;
end;
$$;

revoke execute on function private.assert_report_access(date, date) from public, anon;
grant execute on function private.assert_report_access(date, date) to authenticated;

-- Paid (not voided) invoices by Jakarta day. Umum = cash revenue; BPJS billed shown apart.
create function public.report_revenue_daily(p_from date, p_to date)
returns table (
  day date,
  invoices integer,
  gross bigint,
  discounts bigint,
  revenue bigint,
  bpjs_visits integer,
  bpjs_billed bigint
)
language plpgsql
stable
security invoker
set search_path = ''
as $$
begin
  perform private.assert_report_access(p_from, p_to);
  return query
  select (i.paid_at at time zone 'Asia/Jakarta')::date,
         (count(*) filter (where i.payer_type = 'umum'))::integer,
         coalesce(sum(i.subtotal) filter (where i.payer_type = 'umum'), 0)::bigint,
         coalesce(sum(i.item_discount + i.discount) filter (where i.payer_type = 'umum'), 0)::bigint,
         coalesce(sum(i.total) filter (where i.payer_type = 'umum'), 0)::bigint,
         (count(*) filter (where i.payer_type = 'bpjs'))::integer,
         coalesce(sum(i.total) filter (where i.payer_type = 'bpjs'), 0)::bigint
    from public.invoices i
   where i.status = 'paid'
     and (i.paid_at at time zone 'Asia/Jakarta')::date between p_from and p_to
   group by 1
   order by 1;
end;
$$;

create function public.report_revenue_by_poli(p_from date, p_to date)
returns table (poli_name text, invoices integer, revenue bigint, bpjs_visits integer)
language plpgsql
stable
security invoker
set search_path = ''
as $$
begin
  perform private.assert_report_access(p_from, p_to);
  return query
  select p.name,
         (count(*) filter (where i.payer_type = 'umum'))::integer,
         coalesce(sum(i.total) filter (where i.payer_type = 'umum'), 0)::bigint,
         (count(*) filter (where i.payer_type = 'bpjs'))::integer
    from public.invoices i
    join public.visits v on v.id = i.visit_id
    join public.polis p on p.id = v.poli_id
   where i.status = 'paid'
     and (i.paid_at at time zone 'Asia/Jakarta')::date between p_from and p_to
   group by p.name
   order by 3 desc;
end;
$$;

create function public.report_revenue_by_method(p_from date, p_to date)
returns table (method text, payments integer, amount bigint)
language plpgsql
stable
security invoker
set search_path = ''
as $$
begin
  perform private.assert_report_access(p_from, p_to);
  return query
  select pm.method, count(*)::integer, coalesce(sum(pm.amount), 0)::bigint
    from public.payments pm
    join public.invoices i on i.id = pm.invoice_id
   where i.status = 'paid'
     and (i.paid_at at time zone 'Asia/Jakarta')::date between p_from and p_to
   group by pm.method
   order by 3 desc;
end;
$$;

-- Jasa medis per recipient from the fee stored on each paid invoice line.
create function public.report_doctor_fees(p_from date, p_to date)
returns table (recipient_id uuid, recipient_name text, recipient_role text, lines integer, billed bigint, fee bigint)
language plpgsql
stable
security invoker
set search_path = ''
as $$
begin
  perform private.assert_report_access(p_from, p_to);
  return query
  select pr.id, pr.full_name, pr.role::text, count(*)::integer,
         coalesce(sum(ii.amount), 0)::bigint, coalesce(sum(ii.doctor_fee), 0)::bigint
    from public.invoice_items ii
    join public.invoices i on i.id = ii.invoice_id
    join public.profiles pr on pr.id = ii.fee_recipient_id
   where i.status = 'paid'
     and ii.doctor_fee > 0
     and (i.paid_at at time zone 'Asia/Jakarta')::date between p_from and p_to
   group by pr.id, pr.full_name, pr.role
   order by 6 desc;
end;
$$;

-- Simple P&L: umum cash revenue - medicine cost (dispensed batches' unit cost,
-- for visits paid in the range, umum and BPJS) - active expenses in the range.
create function public.report_profit_loss(p_from date, p_to date)
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

  select coalesce(sum(di.qty * di.unit_cost), 0) into v_cost
    from public.dispense_items di
    join public.dispensations d on d.id = di.dispensation_id
    join public.invoices i on i.visit_id = d.visit_id and i.status = 'paid'
   where di.status = 'given'
     and (i.paid_at at time zone 'Asia/Jakarta')::date between p_from and p_to;

  select coalesce(sum(e.amount), 0) into v_expenses
    from public.expenses e
   where e.status = 'active' and e.expense_date between p_from and p_to;

  return query select v_revenue, v_cost, v_expenses, v_revenue - v_cost - v_expenses;
end;
$$;

revoke execute on function public.report_revenue_daily(date, date) from public, anon;
revoke execute on function public.report_revenue_by_poli(date, date) from public, anon;
revoke execute on function public.report_revenue_by_method(date, date) from public, anon;
revoke execute on function public.report_doctor_fees(date, date) from public, anon;
revoke execute on function public.report_profit_loss(date, date) from public, anon;
grant execute on function public.report_revenue_daily(date, date) to authenticated;
grant execute on function public.report_revenue_by_poli(date, date) to authenticated;
grant execute on function public.report_revenue_by_method(date, date) to authenticated;
grant execute on function public.report_doctor_fees(date, date) to authenticated;
grant execute on function public.report_profit_loss(date, date) to authenticated;
