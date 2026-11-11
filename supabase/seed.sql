-- Local development seed. One clinic and one staff account per role.
-- Every account's password is: password123

insert into public.clinics (id, name, address, phone)
values (
  '00000000-0000-0000-0000-000000000001',
  'Klinik Pratama Contoh',
  'Jl. Contoh No. 1, Depok',
  '021-0000000'
);

with staff (id, email, role, full_name) as (
  values
    ('00000000-0000-0000-0000-000000000101'::uuid, 'owner@klinik.test',      'owner'::public.user_role,      'Pemilik Klinik'),
    ('00000000-0000-0000-0000-000000000102'::uuid, 'admin@klinik.test',      'admin'::public.user_role,      'Admin Klinik'),
    ('00000000-0000-0000-0000-000000000103'::uuid, 'resepsionis@klinik.test','front_desk'::public.user_role, 'Rina Resepsionis'),
    ('00000000-0000-0000-0000-000000000104'::uuid, 'perawat@klinik.test',    'nurse'::public.user_role,      'Ners Putri'),
    ('00000000-0000-0000-0000-000000000105'::uuid, 'dokter@klinik.test',     'doctor'::public.user_role,     'dr. Budi Santoso'),
    ('00000000-0000-0000-0000-000000000106'::uuid, 'farmasi@klinik.test',    'pharmacist'::public.user_role, 'Apt. Sari'),
    ('00000000-0000-0000-0000-000000000107'::uuid, 'kasir@klinik.test',      'cashier'::public.user_role,    'Dewi Kasir')
),
users as (
  insert into auth.users (
    instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
    raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
    confirmation_token, recovery_token, email_change, email_change_token_new
  )
  select
    '00000000-0000-0000-0000-000000000000', id, 'authenticated', 'authenticated', email,
    extensions.crypt('password123', extensions.gen_salt('bf')), now(),
    '{"provider":"email","providers":["email"]}', '{}', now(), now(),
    '', '', '', ''
  from staff
  returning id, email
),
identities as (
  insert into auth.identities (
    id, user_id, provider_id, provider, identity_data, last_sign_in_at, created_at, updated_at
  )
  select
    gen_random_uuid(), id, id::text, 'email',
    jsonb_build_object('sub', id::text, 'email', email, 'email_verified', true),
    now(), now(), now()
  from users
  returning user_id
)
insert into public.profiles (id, clinic_id, role, full_name)
select staff.id, '00000000-0000-0000-0000-000000000001', staff.role, staff.full_name
from staff
join identities on identities.user_id = staff.id;
