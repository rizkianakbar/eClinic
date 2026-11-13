-- Query performance: two indexes for queries that would scan whole tables as data grows, and two
-- read-only summaries computed in the database instead of shipping every row to the server.
-- Both functions are SECURITY INVOKER: RLS applies exactly as for the queries they replace.

-- A patient's visit history (patient page, exam history, diagnoses by patient) includes cancelled
-- visits, so the existing partial index (status <> 'cancelled') cannot serve it.
create index if not exists visits_patient_date_idx on public.visits (patient_id, visit_date desc);

-- The patient list pages newest first.
create index if not exists patients_clinic_created_idx on public.patients (clinic_id, created_at desc);

-- Stok obat header: active medicines, stock value at purchase cost, below-minimum and near-expiry
-- counts. Replaces three count queries plus reading every batch (and is not cut off at 1000 rows).
create or replace function public.stock_summary(p_cutoff date)
returns table (medicines integer, value bigint, low integer, expiring integer)
language sql
stable
security invoker
set search_path = ''
as $$
  select
    (select count(*) from public.medicine_stock where is_active)::integer,
    (select coalesce(sum(qty_on_hand::bigint * unit_cost), 0) from public.stock_batches where qty_on_hand > 0)::bigint,
    (select count(*) from public.medicine_stock where is_active and is_low)::integer,
    (select count(*) from public.medicine_stock where is_active and earliest_expiry <= p_cutoff)::integer;
$$;

-- Pasien page composition: the same figures as patientDemographics() in patients.lib.ts, computed
-- over all active patients in one round trip. Dates are Jakarta dates (created_at is timestamptz).
create or replace function public.patient_demographics(p_today date, p_week_ago date, p_month_start date)
returns jsonb
language sql
stable
security invoker
set search_path = ''
as $$
  with p as (
    select
      id,
      full_name,
      sex,
      birth_date,
      bpjs_number,
      created_at,
      (created_at at time zone 'Asia/Jakarta')::date as joined,
      extract(year from age(p_today, birth_date))::integer as age
    from public.patients
    where is_active
  )
  select jsonb_build_object(
    'total', count(*),
    'male', count(*) filter (where sex = 'male'),
    'bpjs', count(*) filter (where bpjs_number is not null),
    'newThisMonth', count(*) filter (where joined >= p_month_start),
    'ages', jsonb_build_object(
      'balita', count(*) filter (where age <= 5),
      'anak', count(*) filter (where age between 6 and 17),
      'dewasa', count(*) filter (where age between 18 and 44),
      'pralansia', count(*) filter (where age between 45 and 59),
      'lansia', count(*) filter (where age >= 60)
    ),
    'birthdays', coalesce(
      (select jsonb_agg(jsonb_build_object('id', id, 'full_name', full_name, 'age', age) order by full_name)
       from p where to_char(birth_date, 'MM-DD') = to_char(p_today, 'MM-DD')),
      '[]'::jsonb
    ),
    'recent', coalesce(
      (select jsonb_agg(r order by r.created_at desc)
       from (
         select id, full_name, sex, birth_date, bpjs_number, created_at
         from p where joined >= p_week_ago
         order by created_at desc
         limit 5
       ) r),
      '[]'::jsonb
    )
  )
  from p;
$$;

revoke execute on function public.stock_summary(date) from public, anon;
revoke execute on function public.patient_demographics(date, date, date) from public, anon;
grant execute on function public.stock_summary(date) to authenticated;
grant execute on function public.patient_demographics(date, date, date) to authenticated;
