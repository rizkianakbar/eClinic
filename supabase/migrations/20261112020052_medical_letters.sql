-- Sick leave letters (surat keterangan sakit) and referral letters (surat
-- rujukan), issued by the visit's doctor and printed on the clinic letterhead.
-- Append-only clinical documents: reprint any time, never edited or deleted.

create table public.medical_letters (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid not null default private.auth_clinic_id() references public.clinics (id),
  visit_id uuid not null references public.visits (id),
  type text not null check (type in ('sick', 'referral')),
  -- e.g. 001/SKS/XI/2026 (sick) or 001/SR/XI/2026 (referral); set by the trigger.
  letter_no text not null default '',
  -- Sick leave.
  rest_from date,
  rest_days integer check (rest_days between 1 and 30),
  show_diagnosis boolean not null default false,
  -- Referral.
  destination text check (length(destination) <= 200),
  specialty text check (length(specialty) <= 100),
  reason text check (length(reason) <= 1000),
  clinical_summary text check (length(clinical_summary) <= 2000),
  therapy text check (length(therapy) <= 1000),
  created_by uuid not null default auth.uid() references public.profiles (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint medical_letters_sick_fields check (type <> 'sick' or (rest_from is not null and rest_days is not null)),
  constraint medical_letters_referral_fields check (type <> 'referral' or (destination is not null and reason is not null))
);

create index medical_letters_visit_id_idx on public.medical_letters (visit_id);
create index medical_letters_clinic_created_idx on public.medical_letters (clinic_id, created_at);
create index medical_letters_created_by_idx on public.medical_letters (created_by);

create trigger medical_letters_set_updated_at before update on public.medical_letters
  for each row execute function public.set_updated_at();

create function private.medical_letters_before_insert()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_visit record;
  v_today date := (now() at time zone 'Asia/Jakarta')::date;
  v_code text := case new.type when 'sick' then 'SKS' else 'SR' end;
  v_roman text[] := array['I','II','III','IV','V','VI','VII','VIII','IX','X','XI','XII'];
begin
  select clinic_id, doctor_id, status into v_visit
    from public.visits
   where id = new.visit_id and clinic_id = private.auth_clinic_id();
  if not found then
    raise exception 'visit_not_found';
  end if;
  if not (private.auth_role() = 'doctor' and v_visit.doctor_id = v_uid) then
    raise exception 'not_your_patient';
  end if;
  if v_visit.status not in ('in_exam', 'to_pharmacy', 'to_cashier', 'done') then
    raise exception 'not_in_exam';
  end if;

  new.clinic_id := v_visit.clinic_id;
  new.created_by := v_uid;
  new.letter_no := lpad(private.next_counter('letter:' || new.type || ':' || to_char(v_today, 'YYYY-MM'))::text, 3, '0')
    || '/' || v_code || '/' || v_roman[extract(month from v_today)::int] || '/' || to_char(v_today, 'YYYY');
  return new;
end;
$$;

revoke execute on function private.medical_letters_before_insert() from public, anon, authenticated;

create trigger medical_letters_before_insert before insert on public.medical_letters
  for each row execute function private.medical_letters_before_insert();

revoke all on public.medical_letters from anon;
revoke insert, update, delete, truncate on public.medical_letters from authenticated;
grant insert (visit_id, type, rest_from, rest_days, show_diagnosis, destination, specialty, reason, clinical_summary, therapy)
  on public.medical_letters to authenticated;

alter table public.medical_letters enable row level security;

create policy "clinical staff read letters" on public.medical_letters
  for select to authenticated
  using (
    clinic_id = (select private.auth_clinic_id())
    and (select private.auth_role()) in ('doctor', 'nurse', 'owner')
  );

create policy "doctors issue letters" on public.medical_letters
  for insert to authenticated
  with check (clinic_id = (select private.auth_clinic_id()) and (select private.auth_role()) = 'doctor');
