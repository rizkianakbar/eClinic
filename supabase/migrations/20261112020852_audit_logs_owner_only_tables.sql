-- Expenses are owner-only data, so their audit rows must be too: admins read
-- every other table's history, the owner reads all of it.
drop policy "owner and admin read audit logs" on public.audit_logs;

create policy "owner and admin read audit logs" on public.audit_logs
  for select to authenticated
  using (
    clinic_id = (select private.auth_clinic_id())
    and (
      (select private.auth_role()) = 'owner'
      or ((select private.auth_role()) = 'admin' and table_name <> 'expenses')
    )
  );
