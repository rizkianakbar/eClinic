-- Clinic profile and letterhead: email, license number, logo in a private
-- Storage bucket (one folder per clinic), idle logout minutes editable by
-- owner/admin. Integration fields (SATUSEHAT/BPJS) stay out of user reach.

alter table public.clinics add column email text check (length(email) <= 100);
alter table public.clinics add column license_no text check (length(license_no) <= 100);
alter table public.clinics add constraint clinics_name_length check (length(name) between 1 and 200);
alter table public.clinics add constraint clinics_address_length check (length(address) <= 500);
alter table public.clinics add constraint clinics_phone_length check (length(phone) <= 50);

revoke all on public.clinics from anon;
revoke insert, update, delete, truncate on public.clinics from authenticated;
grant update (name, address, phone, email, license_no, logo_path, idle_logout_minutes) on public.clinics to authenticated;

-- Private bucket; files under "<clinic_id>/...". Served via signed URLs.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('clinic-assets', 'clinic-assets', false, 1048576, array['image/png', 'image/jpeg', 'image/webp'])
on conflict (id) do nothing;

create policy "staff read own clinic assets" on storage.objects
  for select to authenticated
  using (bucket_id = 'clinic-assets' and (storage.foldername(name))[1] = (select private.auth_clinic_id())::text);

create policy "owner and admin upload clinic assets" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'clinic-assets'
    and (storage.foldername(name))[1] = (select private.auth_clinic_id())::text
    and (select private.auth_role()) in ('owner', 'admin')
  );

create policy "owner and admin replace clinic assets" on storage.objects
  for update to authenticated
  using (
    bucket_id = 'clinic-assets'
    and (storage.foldername(name))[1] = (select private.auth_clinic_id())::text
    and (select private.auth_role()) in ('owner', 'admin')
  )
  with check (bucket_id = 'clinic-assets' and (storage.foldername(name))[1] = (select private.auth_clinic_id())::text);

create policy "owner and admin remove clinic assets" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'clinic-assets'
    and (storage.foldername(name))[1] = (select private.auth_clinic_id())::text
    and (select private.auth_role()) in ('owner', 'admin')
  );
