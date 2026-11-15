-- Branch isolation check, run against the linked project as the demo clinic's real test users. Everything runs
-- inside one transaction that is rolled back: nothing it creates (a second branch, an assignment) is kept.
--
--   bunx supabase db query --remote -f scripts/check-branch-isolation.sql
--
-- Expect: the new branch sees 0 visits, invoices and stock batches while the first branch sees its day; patients
-- and the catalogue (polis, medicines) are shared; stock counts stay per branch; the receptionist cannot switch
-- branch, read clinical history, or reach any company function; archiving refuses the last open branch and sends
-- staff working there back to the picker; nobody without an active branch sees any patient or visit.

begin;

-- Fixtures (as the migration owner): the demo organization's people and branch.
select set_config('t.owner', (select id::text from public.profiles where email = 'pemilik.uji@klinik.test'), true);
select set_config('t.desk', (select id::text from public.profiles where email = 'resepsionis.uji@klinik.test'), true);
select set_config('t.nurse', (select id::text from public.profiles where email = 'perawat.uji@klinik.test'), true);
select set_config('t.c1', (select clinic_id::text from public.profiles where email = 'pemilik.uji@klinik.test'), true);
select set_config('t.patient', (select patient_id::text from public.visits where clinic_id = current_setting('t.c1')::uuid order by created_at limit 1), true);
select set_config('t.other_org_patient', coalesce((select id::text from public.patients p where p.organization_id <> (select organization_id from public.clinics where id = current_setting('t.c1')::uuid) limit 1), ''), true);

set local role authenticated;

-- The owner opens a second branch from a copy of the first, and gives the nurse a shift there.
select set_config('request.jwt.claims', json_build_object('sub', current_setting('t.owner'), 'role', 'authenticated')::text, true);
select set_config('t.c2', public.create_clinic_branch('Cabang Uji', 'Jl. Uji 1', null)::text, true);
select public.assign_clinic_staff(current_setting('t.nurse')::uuid, current_setting('t.c2')::uuid);
select set_config('r.owner_branches', (select count(*)::text from public.my_clinics()), true);
select set_config('r.org_branches', (select max(organization_branches)::text from public.my_clinics()), true);
select set_config('r.c1_visits_today', (select count(*)::text from public.visits where visit_date = (now() at time zone 'Asia/Jakarta')::date), true);

-- Owner works at the new branch now.
select public.switch_clinic(current_setting('t.c2')::uuid);
select set_config('r.c2_visits_today', (select count(*)::text from public.visits where visit_date = (now() at time zone 'Asia/Jakarta')::date), true);
select set_config('r.c2_visits_any', (select count(*)::text from public.visits), true);
select set_config('r.c2_patients', (select count(*)::text from public.patients), true);
select set_config('r.c2_polis', (select count(*)::text from public.polis), true);
select set_config('r.c2_priced_polis', (select count(*)::text from public.polis where consultation_service_id is not null), true);
select set_config('r.c2_medicines', (select count(*)::text from public.medicines), true);
select set_config('r.c2_batches', (select count(*)::text from public.stock_batches), true);
select set_config('r.c2_invoices', (select count(*)::text from public.invoices), true);
select set_config('r.c2_staff', (select string_agg(role::text, ',' order by role) from public.profiles), true);
select set_config('r.c2_clinic_rows', (select string_agg(name, ',') from public.clinics), true);
select set_config('r.history', (select jsonb_agg(jsonb_build_object('here', e->'here', 'clinic', e->'clinic'->>'name', 'dx', e->'diagnosis' is not null and e->'diagnosis' <> 'null'::jsonb)) ::text
  from jsonb_array_elements(public.patient_visit_history(current_setting('t.patient')::uuid)) e), true);
select set_config('r.previous', (select jsonb_array_length(public.patient_previous_visits(current_setting('t.patient')::uuid, gen_random_uuid()))::text), true);
select set_config('r.today', (select jsonb_agg(jsonb_build_object('name', name, 'waiting', waiting, 'done', done, 'revenue', revenue, 'days', jsonb_array_length(series)))::text from public.organization_overview((now() at time zone 'Asia/Jakarta')::date, 14)), true);
select set_config('r.c2_low_stock_rows', (select count(*)::text from public.medicine_stock where qty_on_hand > 0), true);

-- The receptionist only works at the first branch.
select set_config('request.jwt.claims', json_build_object('sub', current_setting('t.desk'), 'role', 'authenticated')::text, true);
select set_config('r.desk_branches', (select count(*)::text from public.my_clinics()), true);
select set_config('r.desk_visits_today', (select count(*)::text from public.visits where visit_date = (now() at time zone 'Asia/Jakarta')::date), true);
do $$ begin
  perform public.switch_clinic(current_setting('t.c2')::uuid);
  perform set_config('r.desk_switch', 'ALLOWED (bad)', true);
exception when others then
  perform set_config('r.desk_switch', 'refused: ' || sqlerrm, true);
end $$;
do $$ begin
  perform public.patient_previous_visits(current_setting('t.patient')::uuid, gen_random_uuid());
  perform set_config('r.desk_previous', 'ALLOWED (bad)', true);
exception when others then
  perform set_config('r.desk_previous', 'refused: ' || sqlerrm, true);
end $$;
select set_config('r.desk_history_dx', (select bool_or(e->'diagnosis' is not null and e->'diagnosis' <> 'null'::jsonb)::text
  from jsonb_array_elements(public.patient_visit_history(current_setting('t.patient')::uuid)) e), true);
do $$ begin
  perform public.create_clinic_branch('Cabang Liar', null, null);
  perform set_config('r.desk_create_branch', 'ALLOWED (bad)', true);
exception when others then
  perform set_config('r.desk_create_branch', 'refused: ' || sqlerrm, true);
end $$;

-- The nurse, member of both, switches to the new branch and sees its (empty) day.
select set_config('request.jwt.claims', json_build_object('sub', current_setting('t.nurse'), 'role', 'authenticated')::text, true);
select set_config('r.nurse_branches', (select count(*)::text from public.my_clinics()), true);
select public.switch_clinic(current_setting('t.c2')::uuid);
select set_config('r.nurse_c2_visits', (select count(*)::text from public.visits), true);
select public.switch_clinic(null);
select set_config('r.nurse_no_branch_patients', (select count(*)::text from public.patients), true);
select set_config('r.nurse_no_branch_visits', (select count(*)::text from public.visits), true);

-- The receptionist cannot archive a branch; the owner archives the new one, which ends the nurse's shift there.
select set_config('request.jwt.claims', json_build_object('sub', current_setting('t.desk'), 'role', 'authenticated')::text, true);
do $$ begin
  perform public.set_clinic_branch_active(current_setting('t.c2')::uuid, false);
  perform set_config('r.desk_archive', 'ALLOWED (bad)', true);
exception when others then
  perform set_config('r.desk_archive', 'refused: ' || sqlerrm, true);
end $$;
select set_config('request.jwt.claims', json_build_object('sub', current_setting('t.nurse'), 'role', 'authenticated')::text, true);
select public.switch_clinic(current_setting('t.c2')::uuid);
select set_config('request.jwt.claims', json_build_object('sub', current_setting('t.owner'), 'role', 'authenticated')::text, true);
select public.set_clinic_branch_active(current_setting('t.c2')::uuid, false);
select set_config('request.jwt.claims', json_build_object('sub', current_setting('t.nurse'), 'role', 'authenticated')::text, true);
select set_config('r.nurse_after_archive_branches', (select count(*)::text from public.my_clinics()), true);
select set_config('r.nurse_after_archive_visits', (select count(*)::text from public.visits), true);
-- Archive every other open branch, then the first one is the last: refused.
select set_config('request.jwt.claims', json_build_object('sub', current_setting('t.owner'), 'role', 'authenticated')::text, true);
select public.set_clinic_branch_active(b.id, false)
  from public.organization_branches() b
 where b.is_active and b.id <> current_setting('t.c1')::uuid;
do $$ begin
  perform public.set_clinic_branch_active(current_setting('t.c1')::uuid, false);
  perform set_config('r.archive_last', 'ALLOWED (bad)', true);
exception when others then
  perform set_config('r.archive_last', 'refused: ' || sqlerrm, true);
end $$;

reset role;
select json_object_agg(name, setting order by name) as results
  from pg_settings where false
union all
select json_object_agg(k, current_setting('r.' || k)) from unnest(array[
  'owner_branches','org_branches','c1_visits_today','c2_visits_today','c2_visits_any','c2_patients','c2_polis','c2_priced_polis',
  'c2_medicines','c2_batches','c2_low_stock_rows','c2_invoices','c2_staff','c2_clinic_rows','history','previous','today',
  'desk_branches','desk_visits_today','desk_switch','desk_previous','desk_history_dx','desk_create_branch',
  'nurse_branches','nurse_c2_visits','nurse_no_branch_patients','nurse_no_branch_visits',
  'desk_archive','archive_last','nurse_after_archive_branches','nurse_after_archive_visits']) k;
rollback;
