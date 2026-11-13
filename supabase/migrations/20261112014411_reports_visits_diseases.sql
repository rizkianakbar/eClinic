-- Owner reports: visits per poli and doctor (new vs returning) and the top 10
-- diseases (primary diagnoses). Same access rule as the other report_* functions.

-- A visit is "new" when the patient has no earlier non-cancelled visit.
create function public.report_visits(p_from date, p_to date)
returns table (poli_name text, doctor_name text, visits integer, new_patients integer, returning_patients integer)
language plpgsql
stable
security invoker
set search_path = ''
as $$
begin
  perform private.assert_report_access(p_from, p_to);
  return query
  with ranged as (
    select v.id, v.patient_id, v.poli_id, v.doctor_id, v.visit_date, v.created_at,
           not exists (
             select 1 from public.visits earlier
              where earlier.patient_id = v.patient_id
                and earlier.status <> 'cancelled'
                and (earlier.visit_date, earlier.created_at) < (v.visit_date, v.created_at)
           ) as is_new
      from public.visits v
     where v.status <> 'cancelled' and v.visit_date between p_from and p_to
  )
  select p.name, d.full_name, count(*)::integer,
         (count(*) filter (where r.is_new))::integer,
         (count(*) filter (where not r.is_new))::integer
    from ranged r
    join public.polis p on p.id = r.poli_id
    join public.profiles d on d.id = r.doctor_id
   group by p.name, d.full_name
   order by 3 desc, 1, 2;
end;
$$;

-- Most frequent primary diagnoses of non-cancelled visits in the range.
create function public.report_top_diseases(p_from date, p_to date)
returns table (icd10_code text, name text, cases integer)
language plpgsql
stable
security invoker
set search_path = ''
as $$
begin
  perform private.assert_report_access(p_from, p_to);
  return query
  select c.code, coalesce(c.name_id, c.name), count(*)::integer
    from public.visit_diagnoses vd
    join public.visits v on v.id = vd.visit_id
    join public.icd10_codes c on c.code = vd.icd10_code
   where vd.is_primary and v.status <> 'cancelled' and v.visit_date between p_from and p_to
   group by c.code, c.name_id, c.name
   order by 3 desc, 1
   limit 10;
end;
$$;

revoke execute on function public.report_visits(date, date) from public, anon;
revoke execute on function public.report_top_diseases(date, date) from public, anon;
grant execute on function public.report_visits(date, date) to authenticated;
grant execute on function public.report_top_diseases(date, date) to authenticated;
