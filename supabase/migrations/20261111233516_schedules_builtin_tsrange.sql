-- Replace the custom `timerange` type with the built-in tsrange. Postgres
-- auto-creates constructor functions for custom range types; on Supabase they
-- are owned by supabase_admin with a mutable search_path (advisor warning) that
-- migrations cannot change. Anchoring both times to a fixed date gives the same
-- overlap rule with built-in types only.

alter table public.doctor_schedules drop constraint doctor_schedules_no_overlap;

alter table public.doctor_schedules add constraint doctor_schedules_no_overlap exclude using gist (
  doctor_id with =,
  day_of_week with =,
  tsrange(date '2000-01-01' + start_time, date '2000-01-01' + end_time) with &&
) where (is_active);

drop type public.timerange;
