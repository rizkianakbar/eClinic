-- Defaults for columns the exam triggers always set, so generated types treat
-- them as optional on insert. The triggers still overwrite them (no spoofing).
alter table public.vitals alter column clinic_id set default private.auth_clinic_id();
alter table public.vitals alter column recorded_by set default auth.uid();
alter table public.soap_notes alter column clinic_id set default private.auth_clinic_id();
alter table public.soap_notes alter column author_id set default auth.uid();
alter table public.visit_diagnoses alter column clinic_id set default private.auth_clinic_id();
alter table public.visit_diagnoses alter column created_by set default auth.uid();
