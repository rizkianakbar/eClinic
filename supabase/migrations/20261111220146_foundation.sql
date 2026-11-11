-- Foundation: tenants, staff profiles, RLS helpers, numbering counters, audit log.

create extension if not exists pg_trgm with schema extensions;

create type public.user_role as enum (
  'owner', 'admin', 'front_desk', 'nurse', 'doctor', 'pharmacist', 'cashier'
);

create function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- Clinics (the tenant) ------------------------------------------------------

create table public.clinics (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  address text,
  phone text,
  logo_path text,
  satusehat_org_id text,
  bpjs_ppk_code text,
  bpjs_enabled boolean not null default false,
  idle_logout_minutes integer not null default 15 check (idle_logout_minutes between 1 and 240),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger clinics_set_updated_at
  before update on public.clinics
  for each row execute function public.set_updated_at();

-- Staff profiles (1:1 with auth.users) --------------------------------------

create table public.profiles (
  id uuid primary key references auth.users (id) on delete restrict,
  clinic_id uuid not null references public.clinics (id),
  role public.user_role not null,
  full_name text not null,
  nik text,
  sip_number text,
  satusehat_practitioner_id text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index profiles_clinic_id_idx on public.profiles (clinic_id);

create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

-- RLS helpers ---------------------------------------------------------------
-- Security definer so policies can read profiles without recursing into RLS.
-- An inactive profile returns null, which fails every policy: deactivating
-- staff revokes access immediately.

create function public.auth_clinic_id()
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select clinic_id from public.profiles where id = auth.uid() and is_active
$$;

create function public.auth_role()
returns public.user_role
language sql
stable
security definer
set search_path = ''
as $$
  select role from public.profiles where id = auth.uid() and is_active
$$;

revoke execute on function public.auth_clinic_id() from public, anon;
revoke execute on function public.auth_role() from public, anon;

alter table public.clinics enable row level security;

create policy "staff read own clinic" on public.clinics
  for select to authenticated
  using (id = public.auth_clinic_id());

create policy "owner and admin update own clinic" on public.clinics
  for update to authenticated
  using (id = public.auth_clinic_id() and public.auth_role() in ('owner', 'admin'))
  with check (id = public.auth_clinic_id());

alter table public.profiles enable row level security;

create policy "staff read profiles in own clinic" on public.profiles
  for select to authenticated
  using (clinic_id = public.auth_clinic_id() or id = auth.uid());

create policy "owner and admin manage profiles" on public.profiles
  for all to authenticated
  using (clinic_id = public.auth_clinic_id() and public.auth_role() in ('owner', 'admin'))
  with check (clinic_id = public.auth_clinic_id());

-- Counters (MRN, invoice, queue numbers) ------------------------------------
-- Only reachable through next_counter(); no direct table access.

create table public.counters (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid not null references public.clinics (id),
  scope text not null,
  value bigint not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (clinic_id, scope)
);

create trigger counters_set_updated_at
  before update on public.counters
  for each row execute function public.set_updated_at();

alter table public.counters enable row level security;

-- Atomically increments and returns the next value for a scope in the
-- caller's clinic, e.g. 'mrn', 'invoice:2026-11', 'queue:<poli_id>:2026-11-12'.
-- The upsert takes a row lock, so concurrent callers never get the same value.
create function public.next_counter(p_scope text)
returns bigint
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_clinic_id uuid := public.auth_clinic_id();
  v_value bigint;
begin
  if v_clinic_id is null then
    raise exception 'not authenticated' using errcode = '42501';
  end if;

  insert into public.counters (clinic_id, scope, value)
  values (v_clinic_id, p_scope, 1)
  on conflict (clinic_id, scope)
  do update set value = public.counters.value + 1
  returning value into v_value;

  return v_value;
end;
$$;

revoke execute on function public.next_counter(text) from public, anon;

-- Audit log -----------------------------------------------------------------
-- Append-only, so no updated_at. Filled by audit_row_change() triggers.

create table public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid not null references public.clinics (id),
  actor_id uuid references auth.users (id),
  action text not null check (action in ('insert', 'update', 'delete')),
  table_name text not null,
  record_id uuid not null,
  before jsonb,
  after jsonb,
  created_at timestamptz not null default now()
);

create index audit_logs_clinic_created_idx on public.audit_logs (clinic_id, created_at desc);
create index audit_logs_actor_id_idx on public.audit_logs (actor_id);
create index audit_logs_record_idx on public.audit_logs (table_name, record_id);

alter table public.audit_logs enable row level security;

create policy "owner and admin read audit logs" on public.audit_logs
  for select to authenticated
  using (clinic_id = public.auth_clinic_id() and public.auth_role() in ('owner', 'admin'));

-- Generic audit trigger. Works for any table with id and clinic_id
-- (clinics itself uses its own id as clinic_id).
create function public.audit_row_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_row jsonb := to_jsonb(coalesce(new, old));
begin
  insert into public.audit_logs (clinic_id, actor_id, action, table_name, record_id, before, after)
  values (
    coalesce((v_row ->> 'clinic_id')::uuid, (v_row ->> 'id')::uuid),
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

create trigger clinics_audit
  after insert or update or delete on public.clinics
  for each row execute function public.audit_row_change();

create trigger profiles_audit
  after insert or update or delete on public.profiles
  for each row execute function public.audit_row_change();
