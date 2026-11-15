-- Supabase advisors after the company/branch migrations.

-- rls_auto_enable() is the event trigger that turns RLS on for new tables. Event triggers do not need EXECUTE, and
-- nobody should reach it through /rest/v1/rpc.
revoke execute on function public.rls_auto_enable() from public, anon, authenticated;

-- The catalogue's per-branch name indexes covered clinic_id; names are unique per organization now, so the
-- "created at branch" foreign key needs its own index (deleting or archiving a branch scans these).
create index if not exists polis_clinic_id_idx on public.polis (clinic_id);
create index if not exists services_clinic_id_idx on public.services (clinic_id);
create index if not exists medicines_clinic_id_idx on public.medicines (clinic_id);
create index if not exists suppliers_clinic_id_idx on public.suppliers (clinic_id);

-- Service-role inserts (scripts) evaluate column defaults that call these helpers.
grant execute on function private.auth_organization_id() to service_role;
grant execute on function private.auth_clinic_id() to service_role;
