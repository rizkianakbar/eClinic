import { z } from 'zod';
import type { Role } from '@/lib/auth';

/**
 * Where a person goes right after signing in. One branch: they work there. Several: staff choose every time, even
 * if they worked at one yesterday, so a shared computer at another branch never opens the wrong queue; the owner
 * starts at the company overview (Vercel: the team before its projects) and opens a branch from there.
 */
export function branchAfterSignIn(
  branchIds: readonly string[],
  role: Role,
): { clinicId: string | null; next: '/dashboard' | '/branch' | '/company' } {
  if (branchIds.length === 1) return { clinicId: branchIds[0] ?? null, next: '/dashboard' };

  return { clinicId: null, next: role === 'owner' ? '/company' : '/branch' };
}

/** Accepts a form string or null; blank -> null. */
const optionalText = (max: number, message: string) =>
  z
    .string()
    .nullish()
    .transform((value) => (value ?? '').trim())
    .refine((value) => value.length <= max, message)
    .transform((value) => value || null);

export const branchCreateSchema = z.object({
  name: z.string().trim().min(1, 'branches.errors.nameRequired').max(200, 'branches.errors.nameTooLong'),
  address: optionalText(500, 'branches.errors.addressTooLong'),
  phone: optionalText(50, 'branches.errors.phoneTooLong'),
});

export const organizationSchema = z.object({
  name: z.string().trim().min(1, 'branches.errors.companyNameRequired').max(200, 'branches.errors.nameTooLong'),
});

export type OrganizationInput = z.input<typeof organizationSchema>;
export type OrganizationValues = z.output<typeof organizationSchema>;

export type BranchCreateInput = z.input<typeof branchCreateSchema>;
export type BranchCreateValues = z.output<typeof branchCreateSchema>;

/** Database errors raised by the branch functions, as message keys. */
export function branchErrorMessage(error: { message?: string }) {
  const message = error.message ?? '';

  if (message.includes('not_a_member')) return 'branches.errors.notAMember';
  if (message.includes('last_branch')) return 'branches.errors.lastBranch';
  if (message.includes('owner_in_every_branch')) return 'branches.errors.ownerEverywhere';
  if (message.includes('last_open_branch')) return 'branches.errors.lastOpenBranch';
  if (message.includes('clinics_name_length')) return 'branches.errors.nameTooLong';
  if (message.includes('not_allowed')) return 'errors.noAccessMaster';

  return 'errors.generic';
}
