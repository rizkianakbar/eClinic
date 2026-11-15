import 'server-only';
import { createClient } from '@supabase/supabase-js';
import type { createAdminClient } from '@/lib/supabase/admin';
import type { Database } from '@/lib/supabase/database.types';
import { clinicUrl, slugProblem } from '@/lib/tenant';
import { type SignupValues, type SiteLoginValues, type SlugAvailability, signupAuthErrorMessage } from './tenants.lib';

type Admin = ReturnType<typeof createAdminClient>;

type Result<T> = { ok: true; data: T } | { ok: false; error: string };

/** The organization a subdomain serves (public facts only: the login page shows its name). */
export async function getOrganizationBySlug(admin: Admin, slug: string) {
  if (slugProblem(slug) === 'format') return null;

  const { data, error } = await admin.from('organizations').select('id, name, slug').eq('slug', slug).maybeSingle();

  if (error) throw new Error(`getOrganizationBySlug failed: ${error.code}`);

  return data;
}

/** Whether a subdomain can be claimed now (the unique index still decides a race at signup). */
export async function checkSlug(admin: Admin, slug: string): Promise<SlugAvailability> {
  const problem = slugProblem(slug);

  if (problem) return { status: 'invalid', error: `tenants.errors.slug.${problem}` };

  return (await getOrganizationBySlug(admin, slug)) ? { status: 'taken' } : { status: 'available' };
}

/**
 * A one-time link that signs the person in on their clinic's subdomain (see app/auth/handoff). Nothing is
 * emailed: `generateLink` only mints the token.
 */
export async function createHandoffUrl(admin: Admin, email: string, slug: string, next = '/dashboard') {
  const { data, error } = await admin.auth.admin.generateLink({ type: 'magiclink', email });

  if (error) throw new Error(`createHandoffUrl failed: ${error.code ?? error.status}`);

  const params = new URLSearchParams({ token_hash: data.properties.hashed_token, next });

  return clinicUrl(slug, `/auth/handoff?${params}`);
}

/**
 * A clinic signs itself up: the owner's auth account, then the clinic and owner profile in one transaction
 * (create_clinic_tenant: organization, first branch, owner). If the second step fails the account is removed, so the email can be used again.
 * Returns the link that lands the owner on their new clinic, signed in.
 */
export async function signUpClinic(admin: Admin, values: SignupValues): Promise<Result<{ url: string }>> {
  if (slugProblem(values.slug)) return { ok: false, error: 'tenants.errors.slug.format' };

  const { data, error } = await admin.auth.admin.createUser({
    email: values.email,
    password: values.password,
    // Owners sign in straight away; email verification can come with billing.
    email_confirm: true,
    user_metadata: { full_name: values.full_name },
  });

  if (error) return { ok: false, error: signupAuthErrorMessage(error) };

  const { error: tenantError } = await admin.rpc('create_clinic_tenant', {
    p_user_id: data.user.id,
    p_email: values.email,
    p_full_name: values.full_name,
    p_clinic_name: values.company_name,
    p_branch_name: values.branch_name,
    p_slug: values.slug,
    p_locale: values.locale,
  });

  if (tenantError) {
    await admin.auth.admin.deleteUser(data.user.id);

    return {
      ok: false,
      error: tenantError.code === '23505' ? 'tenants.errors.slugTaken' : 'tenants.errors.signupFailed',
    };
  }

  return { ok: true, data: { url: await createHandoffUrl(admin, values.email, values.slug) } };
}

/**
 * Sign-in on the marketing domain: checks the password without keeping a session here, finds the person's
 * clinic, and returns the link that signs them in on its subdomain.
 */
export async function signInToClinic(admin: Admin, values: SiteLoginValues): Promise<Result<{ url: string }>> {
  const auth = createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );

  const { data, error } = await auth.auth.signInWithPassword(values);

  if (error) return { ok: false, error: 'tenants.errors.wrongCredentials' };

  // Only the password check was needed: end that session (this one only) at once.
  await auth.auth.signOut({ scope: 'local' });

  const { data: profile } = await admin
    .from('profiles')
    .select('is_active, organization:organizations(slug)')
    .eq('id', data.user.id)
    .maybeSingle();

  if (!profile?.is_active || !profile.organization) return { ok: false, error: 'tenants.errors.inactive' };

  return { ok: true, data: { url: await createHandoffUrl(admin, values.email, profile.organization.slug) } };
}
