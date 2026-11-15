import 'server-only';
import type { SupabaseClient } from '@/lib/supabase/server';
import type { BranchFacts, CompanyFacts } from './onboarding.lib';

/** The shared catalogue (company-wide reads: works on the company pages too). */
export async function getCompanyFacts(supabase: SupabaseClient): Promise<CompanyFacts> {
  const [polis, medicines] = await Promise.all([
    supabase
      .from('polis')
      .select('id', { count: 'exact', head: true })
      .eq('is_active', true)
      .not('consultation_service_id', 'is', null),
    supabase.from('medicines').select('id', { count: 'exact', head: true }).eq('is_active', true),
  ]);

  const failed = [polis, medicines].find((result) => result.error);

  if (failed?.error) throw new Error(`getCompanyFacts failed: ${failed.error.code}`);

  return { pricedPolis: polis.count ?? 0, medicines: medicines.count ?? 0 };
}

/** The branch I am working at (profiles and schedules are branch-scoped by RLS). Counts only, in parallel. */
export async function getBranchFacts(supabase: SupabaseClient, clinicId: string): Promise<BranchFacts> {
  const [clinic, staff, schedules] = await Promise.all([
    supabase.from('clinics').select('address, phone').eq('id', clinicId).maybeSingle(),
    supabase.from('profiles').select('role').eq('is_active', true),
    supabase.from('doctor_schedules').select('id', { count: 'exact', head: true }).eq('is_active', true),
  ]);

  const failed = [clinic, staff, schedules].find((result) => result.error);

  if (failed?.error) throw new Error(`getBranchFacts failed: ${failed.error.code}`);

  const roles = (staff.data ?? []).map((row) => row.role);

  return {
    hasAddress: Boolean(clinic.data?.address?.trim()),
    hasPhone: Boolean(clinic.data?.phone?.trim()),
    doctors: roles.filter((role) => role === 'doctor').length,
    schedules: schedules.count ?? 0,
    team: roles.filter((role) => ['front_desk', 'nurse', 'pharmacist', 'cashier'].includes(role)).length,
  };
}
