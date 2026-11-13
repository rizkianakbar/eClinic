-- Indexes for queries that would read whole tables as the clinic's data grows. Index-only: no data,
-- function or policy changes. Plain CREATE INDEX (not CONCURRENTLY: migrations run in a transaction,
-- and the tables are small enough today for the brief lock).

-- Every report_* function, the owner dashboard and the profit and loss filter paid invoices by their
-- Jakarta date: (paid_at at time zone 'Asia/Jakarta')::date between p_from and p_to. An expression on
-- the column cannot use (clinic_id, paid_at), so each report read every paid invoice ever made. This
-- index matches the expression exactly (timezone(text, timestamptz) is immutable). clinic_id leads
-- because RLS adds clinic_id = auth_clinic_id() to every query.
create index if not exists invoices_paid_jakarta_date_idx
  on public.invoices (clinic_id, ((paid_at at time zone 'Asia/Jakarta')::date))
  where status = 'paid';

-- A visit's voided invoices (the cashier's bill page). The unique index on visit_id excludes voided
-- invoices (status <> 'void'), so it cannot find them.
create index if not exists invoices_visit_id_idx on public.invoices (visit_id);

-- The activity log filtered by kind of data within a period (Pengaturan, Log aktivitas).
create index if not exists audit_logs_clinic_table_created_idx
  on public.audit_logs (clinic_id, table_name, created_at desc);
