-- Setup progress per branch for the company overview: how many doctors and other staff work there, and how many
-- doctor schedules it has (schedules are branch rows, which the owner cannot read from the company pages).

drop function public.organization_branches();
drop function private.organization_branches();

create function private.organization_branches()
returns table (
  id uuid, name text, address text, phone text, is_active boolean, staff integer, created_at timestamptz,
  doctors integer, team integer, schedules integer
)
language plpgsql
stable
security definer
set search_path = ''
as $$
#variable_conflict use_column
declare
  v_organization_id uuid := private.assert_company_owner();
begin
  return query
  select c.id, c.name, c.address, c.phone, c.is_active,
         (select count(*) from public.clinic_staff m join public.profiles p on p.id = m.profile_id and p.is_active
           where m.clinic_id = c.id)::integer,
         c.created_at,
         (select count(*) from public.clinic_staff m join public.profiles p on p.id = m.profile_id and p.is_active
           where m.clinic_id = c.id and p.role = 'doctor')::integer,
         (select count(*) from public.clinic_staff m join public.profiles p on p.id = m.profile_id and p.is_active
           where m.clinic_id = c.id and p.role in ('front_desk', 'nurse', 'pharmacist', 'cashier'))::integer,
         (select count(*) from public.doctor_schedules s where s.clinic_id = c.id and s.is_active)::integer
    from public.clinics c
   where c.organization_id = v_organization_id
   order by c.is_active desc, c.created_at, c.name;
end;
$$;

create function public.organization_branches()
returns table (
  id uuid, name text, address text, phone text, is_active boolean, staff integer, created_at timestamptz,
  doctors integer, team integer, schedules integer
)
language sql stable security invoker set search_path = ''
as $$ select * from private.organization_branches() $$;

revoke execute on function private.organization_branches() from public, anon;
revoke execute on function public.organization_branches() from public, anon;
grant execute on function private.organization_branches() to authenticated;
grant execute on function public.organization_branches() to authenticated;
