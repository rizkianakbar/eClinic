import 'server-only';
import type { ActionResult } from '@/lib/query';
import type { SupabaseClient } from '@/lib/supabase/server';
import {
  type BranchCreateValues,
  branchAfterSignIn,
  branchErrorMessage,
  type OrganizationValues,
} from './branches.lib';

const ok = { ok: true, data: undefined } as const;

/** Work at this branch from now on (a member only; the database checks). */
export async function switchBranch(supabase: SupabaseClient, clinicId: string | null): Promise<ActionResult> {
  const { error } = await supabase.rpc('switch_clinic', { p_clinic_id: clinicId as string });

  return error ? { ok: false, error: branchErrorMessage(error) } : ok;
}

/**
 * Right after a successful sign-in: start at the only branch, or clear the choice so the picker (staff) or the
 * company overview (owner) comes next. Returns where to go.
 */
export async function startBranchSession(supabase: SupabaseClient, userId: string) {
  const [branches, profile] = await Promise.all([
    supabase.rpc('my_clinics'),
    supabase.from('profiles').select('role').eq('id', userId).single(),
  ]);

  if (branches.error || profile.error) throw new Error('startBranchSession failed');

  const start = branchAfterSignIn(
    branches.data.map((branch) => branch.id),
    profile.data.role,
  );
  const { error } = await supabase.rpc('switch_clinic', { p_clinic_id: start.clinicId as string });

  if (error) throw new Error(`startBranchSession switch failed: ${error.code}`);

  return start.next;
}

// Company scope (owner) ---------------------------------------------------------------------------------------

/** Every branch, archived ones too, with its staff count. */
export async function listOrganizationBranches(supabase: SupabaseClient) {
  const { data, error } = await supabase.rpc('organization_branches');

  if (error) throw new Error(`listOrganizationBranches failed: ${error.code}`);

  return data;
}

export type BranchDay = { day: string; revenue: number; patients: number };

/** Each open branch today (where patients are, revenue) and its last `days` days. */
export async function getOrganizationOverview(supabase: SupabaseClient, today: string, days: number) {
  const { data, error } = await supabase.rpc('organization_overview', { p_today: today, p_days: days });

  if (error) throw new Error(`getOrganizationOverview failed: ${error.code}`);

  return data.map((row) => ({ ...row, series: (row.series ?? []) as unknown as BranchDay[] }));
}

export async function createBranch(
  supabase: SupabaseClient,
  values: BranchCreateValues,
): Promise<ActionResult<{ id: string }>> {
  const { data, error } = await supabase.rpc('create_clinic_branch', {
    p_name: values.name,
    p_address: values.address as string,
    p_phone: values.phone as string,
  });

  if (error || !data) return { ok: false, error: branchErrorMessage(error ?? {}) };

  return { ok: true, data: { id: data } };
}

/** "Hapus cabang" archives (records stay); restoring opens it again. */
export async function setBranchActive(
  supabase: SupabaseClient,
  clinicId: string,
  active: boolean,
): Promise<ActionResult> {
  const { error } = await supabase.rpc('set_clinic_branch_active', { p_clinic_id: clinicId, p_active: active });

  return error ? { ok: false, error: branchErrorMessage(error) } : ok;
}

export async function renameOrganization(supabase: SupabaseClient, values: OrganizationValues): Promise<ActionResult> {
  const { error } = await supabase.rpc('rename_organization', { p_name: values.name });

  return error ? { ok: false, error: branchErrorMessage(error) } : ok;
}

/** Everyone in the organization with the open branches they work at. */
export async function listOrganizationStaff(supabase: SupabaseClient) {
  const { data, error } = await supabase.rpc('list_organization_staff');

  if (error) throw new Error(`listOrganizationStaff failed: ${error.code}`);

  return data;
}

export async function setBranchAssignment(
  supabase: SupabaseClient,
  values: { profileId: string; clinicId: string; assigned: boolean },
): Promise<ActionResult> {
  const args = { p_profile_id: values.profileId, p_clinic_id: values.clinicId };
  const { error } = values.assigned
    ? await supabase.rpc('assign_clinic_staff', args)
    : await supabase.rpc('unassign_clinic_staff', args);

  return error ? { ok: false, error: branchErrorMessage(error) } : ok;
}
