-- profiles.organization_id is always set by profiles_before_insert (from the home branch). The default only
-- tells clients (and the generated types) that inserts need not pass it.
alter table public.profiles alter column organization_id set default private.auth_organization_id();
