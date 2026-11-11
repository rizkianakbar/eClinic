-- MRN as a column default instead of a trigger, so generated types treat it as
-- optional on insert. Users cannot write the column (column-level INSERT grant),
-- so the default always applies.

drop trigger patients_assign_mrn on public.patients;
drop function private.patients_assign_mrn();

-- Next value of the caller's clinic 'mrn' counter, zero-padded to at least 6
-- digits (000001, ..., 999999, 1000000). Evaluated inside the insert, so a
-- failed insert does not consume a number.
create function private.next_mrn()
returns text
language sql
volatile
set search_path = ''
as $$
  select lpad(v::text, greatest(6, length(v::text)), '0')
  from private.next_counter('mrn') as v
$$;

revoke execute on function private.next_mrn() from public, anon;
grant execute on function private.next_mrn() to authenticated;

alter table public.patients alter column mrn set default private.next_mrn();

revoke insert on public.patients from authenticated;
grant insert (clinic_id, full_name, nik, bpjs_number, birth_date, sex, phone, address)
  on public.patients to authenticated;
