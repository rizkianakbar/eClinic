-- Low-stock flag on the stock view, so the app can filter on it
-- (PostgREST cannot compare two columns).
create or replace view public.medicine_stock with (security_invoker = true) as
select
  m.id as medicine_id,
  m.clinic_id,
  m.name,
  m.unit,
  m.min_stock,
  m.is_active,
  coalesce(sum(b.qty_on_hand), 0)::integer as qty_on_hand,
  min(b.expiry_date) as earliest_expiry,
  coalesce(sum(b.qty_on_hand), 0) <= m.min_stock as is_low
from public.medicines m
left join public.stock_batches b on b.medicine_id = m.id and b.qty_on_hand > 0
group by m.id;
