'use server';

import { requireAccount, requireCompanyOwner } from '@/lib/auth';
import type { ActionResult } from '@/lib/query';
import { createClient } from '@/lib/supabase/server';
import { branchCreateSchema, organizationSchema } from './branches.lib';
import {
  createBranch,
  renameOrganization,
  setBranchActive,
  setBranchAssignment,
  switchBranch,
} from './branches.service';

/** Start working at a branch (picker, switcher, company overview). The client then reloads the whole app. */
export async function switchBranchAction(clinicId: string): Promise<ActionResult> {
  const { account } = await requireAccount();

  if (!account.branches.some((branch) => branch.id === clinicId))
    return { ok: false, error: 'branches.errors.notAMember' };

  return switchBranch(await createClient(), clinicId);
}

export async function createBranchAction(input: unknown): Promise<ActionResult<{ id: string }>> {
  await requireCompanyOwner();

  const parsed = branchCreateSchema.safeParse(input);

  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? 'errors.invalid' };

  return createBranch(await createClient(), parsed.data);
}

export async function setBranchActiveAction(input: { clinicId: string; active: boolean }): Promise<ActionResult> {
  await requireCompanyOwner();

  return setBranchActive(await createClient(), String(input.clinicId), Boolean(input.active));
}

export async function renameOrganizationAction(input: unknown): Promise<ActionResult> {
  await requireCompanyOwner();

  const parsed = organizationSchema.safeParse(input);

  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? 'errors.invalid' };

  return renameOrganization(await createClient(), parsed.data);
}

/** Who works at which branch (owner, from the company pages). */
export async function setBranchAssignmentAction(input: {
  profileId: string;
  clinicId: string;
  assigned: boolean;
}): Promise<ActionResult> {
  await requireCompanyOwner();

  return setBranchAssignment(await createClient(), {
    profileId: String(input.profileId),
    clinicId: String(input.clinicId),
    assigned: Boolean(input.assigned),
  });
}
