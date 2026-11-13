-- Master data: medicines, suppliers, services (tariffs with doctor fee rule).
-- Every staff member reads them (pharmacy and cashier need prices); owner and
-- admin maintain them. No deletes: deactivate with is_active = false.

-- Medicines -----------------------------------------------------------------
-- Stock (batches, expiry, unit cost) comes with the pharmacy module.

create table public.medicines (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid not null default private.auth_clinic_id() references public.clinics (id),
  name text not null check (length(name) between 1 and 200),
  unit text not null check (length(unit) between 1 and 30),
  -- Selling price per unit, integer rupiah.
  price bigint not null check (price >= 0),
  -- Kamus Farmasi dan Alat Kesehatan code, required for SATUSEHAT medication resources.
  kfa_code text check (kfa_code ~ '^[0-9A-Za-z]{1,20}$'),
  min_stock integer not null default 0 check (min_stock >= 0),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index medicines_clinic_name_key on public.medicines (clinic_id, lower(name));
create index medicines_name_trgm_idx on public.medicines using gin (name extensions.gin_trgm_ops);

-- Suppliers -----------------------------------------------------------------

create table public.suppliers (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid not null default private.auth_clinic_id() references public.clinics (id),
  name text not null check (length(name) between 1 and 200),
  phone text check (length(phone) <= 30),
  address text check (length(address) <= 500),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index suppliers_clinic_name_key on public.suppliers (clinic_id, lower(name));

-- Services (tariffs) --------------------------------------------------------
-- Doctor fee rule (jasa medis): none, a fixed rupiah amount (<= price), or a
-- whole percentage of the price. The doctor fee report reads it.

create table public.services (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid not null default private.auth_clinic_id() references public.clinics (id),
  name text not null check (length(name) between 1 and 200),
  type text not null check (type in ('consultation', 'procedure', 'other')),
  price bigint not null check (price >= 0),
  doctor_fee_type text not null default 'none' check (doctor_fee_type in ('none', 'fixed', 'percent')),
  doctor_fee_value bigint not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint services_doctor_fee_valid check (
    (doctor_fee_type = 'none' and doctor_fee_value = 0)
    or (doctor_fee_type = 'fixed' and doctor_fee_value between 0 and price)
    or (doctor_fee_type = 'percent' and doctor_fee_value between 0 and 100)
  )
);

create unique index services_clinic_name_key on public.services (clinic_id, lower(name));
create index services_clinic_type_idx on public.services (clinic_id, type);

-- Shared setup ----------------------------------------------------------------

do $$
declare
  t text;
begin
  foreach t in array array['medicines', 'suppliers', 'services'] loop
    execute format('create trigger %1$s_set_updated_at before update on public.%1$s
                    for each row execute function public.set_updated_at()', t);
    execute format('create trigger %1$s_audit after insert or update or delete on public.%1$s
                    for each row execute function private.audit_row_change()', t);
    execute format('revoke all on public.%1$s from anon', t);
    execute format('revoke delete, truncate on public.%1$s from authenticated', t);
    execute format('alter table public.%1$s enable row level security', t);
    execute format('create policy "staff read %1$s" on public.%1$s for select to authenticated
                    using (clinic_id = (select private.auth_clinic_id()))', t);
    execute format('create policy "owner and admin add %1$s" on public.%1$s for insert to authenticated
                    with check (clinic_id = (select private.auth_clinic_id())
                                and (select private.auth_role()) in (''owner'', ''admin''))', t);
    execute format('create policy "owner and admin update %1$s" on public.%1$s for update to authenticated
                    using (clinic_id = (select private.auth_clinic_id())
                           and (select private.auth_role()) in (''owner'', ''admin''))
                    with check (clinic_id = (select private.auth_clinic_id()))', t);
  end loop;
end;
$$;
