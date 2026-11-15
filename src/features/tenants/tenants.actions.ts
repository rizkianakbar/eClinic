'use server';

import { getHostTenant } from '@/lib/auth';
import type { ActionResult } from '@/lib/query';
import { createAdminClient } from '@/lib/supabase/admin';
import { looksAutomated, type SlugAvailability, signupSchema, siteLoginSchema, slugSchema } from './tenants.lib';
import { checkSlug, signInToClinic, signUpClinic } from './tenants.service';

/** The marketing site's actions run only on the root domain: a clinic's subdomain has no signup. */
async function onSite() {
  return (await getHostTenant()).kind === 'site';
}

/** Live availability of a subdomain under the signup form. */
export async function checkSlugAction(slug: string): Promise<ActionResult<SlugAvailability>> {
  if (!(await onSite())) return { ok: false, error: 'errors.generic' };

  const parsed = slugSchema.safeParse(slug);

  if (!parsed.success) {
    return { ok: true, data: { status: 'invalid', error: parsed.error.issues[0]?.message ?? 'errors.invalid' } };
  }

  return { ok: true, data: await checkSlug(createAdminClient(), parsed.data) };
}

/** Creates the company, its first branch and its owner; the client then follows `url` there, signed in. */
export async function signUpAction(
  input: unknown,
  trap: { website?: string; startedAt?: number } = {},
): Promise<ActionResult<{ url: string }>> {
  if (!(await onSite())) return { ok: false, error: 'errors.generic' };
  // A bot gets the same answer as any failure: nothing to learn from.
  if (looksAutomated(trap)) return { ok: false, error: 'tenants.errors.signupFailed' };

  const parsed = signupSchema.safeParse(input);

  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? 'errors.invalid' };

  return signUpClinic(createAdminClient(), parsed.data);
}

/** Sign-in on the root domain: the client follows `url` to the person's own clinic. */
export async function siteSignInAction(input: unknown): Promise<ActionResult<{ url: string }>> {
  if (!(await onSite())) return { ok: false, error: 'errors.generic' };

  const parsed = siteLoginSchema.safeParse(input);

  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? 'errors.invalid' };

  return signInToClinic(createAdminClient(), parsed.data);
}
