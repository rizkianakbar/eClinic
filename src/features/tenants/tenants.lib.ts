import { z } from 'zod';
import { isLocale } from '@/i18n/locales';
import { slugProblem } from '@/lib/tenant';

const email = z
  .string()
  .trim()
  .toLowerCase()
  .min(1, 'tenants.errors.emailRequired')
  .pipe(z.email('tenants.errors.emailInvalid'));

/** A subdomain as typed: trimmed and lowercased; `slugProblem` names what is wrong with it. */
export const slugSchema = z
  .string()
  .trim()
  .toLowerCase()
  .superRefine((value, context) => {
    const problem = slugProblem(value);

    if (problem) context.addIssue({ code: 'custom', message: `tenants.errors.slug.${problem}` });
  });

// Signup: the owner's account, the company and its first branch, in one form ------------------------------------

export const signupSchema = z.object({
  full_name: z.string().trim().min(1, 'tenants.errors.nameRequired').max(200, 'tenants.errors.nameTooLong'),
  /** The company (organization): the name over every branch, e.g. "Klinik Sehat Sentosa". */
  company_name: z
    .string()
    .trim()
    .min(3, 'tenants.errors.clinicNameRequired')
    .max(200, 'tenants.errors.clinicNameTooLong'),
  /** Its first branch, e.g. "Cabang Depok": never the same name twice in the header. */
  branch_name: z
    .string()
    .trim()
    .min(1, 'tenants.errors.branchNameRequired')
    .max(200, 'tenants.errors.branchNameTooLong'),
  slug: slugSchema,
  email,
  password: z.string().min(8, 'tenants.errors.passwordMin').max(72, 'tenants.errors.passwordMax'),
  locale: z
    .string()
    .optional()
    .transform((value) => (isLocale(value) ? value : 'id')),
});

/**
 * Cheap bot checks on signup (no third party): a field people never see must stay empty, and a person takes at
 * least a few seconds to fill the form. A CAPTCHA (e.g. Cloudflare Turnstile) is the next step at real traffic.
 */
export const SIGNUP_MIN_FILL_MS = 3000;

export function looksAutomated(trap: { website?: string; startedAt?: number }, now = Date.now()) {
  if (trap.website?.trim()) return true;
  if (typeof trap.startedAt !== 'number' || !Number.isFinite(trap.startedAt)) return true;

  return now - trap.startedAt < SIGNUP_MIN_FILL_MS;
}

export type SignupInput = z.input<typeof signupSchema>;
export type SignupValues = z.output<typeof signupSchema>;

// Root-domain login: finds the person's clinic, then hands the session to its subdomain --------------

export const siteLoginSchema = z.object({
  email,
  password: z.string().min(1, 'tenants.errors.passwordRequired'),
});

export type SiteLoginInput = z.input<typeof siteLoginSchema>;
export type SiteLoginValues = z.output<typeof siteLoginSchema>;

/** Live check under the subdomain field. `invalid` carries the message key of the problem. */
export type SlugAvailability = { status: 'available' } | { status: 'taken' } | { status: 'invalid'; error: string };

/** Maps a Supabase Auth error on signup to an actionable message key. */
export function signupAuthErrorMessage(error: { code?: string }) {
  if (error.code === 'email_exists' || error.code === 'user_already_exists') return 'tenants.errors.emailTaken';
  if (error.code === 'weak_password') return 'tenants.errors.weakPassword';

  return 'tenants.errors.signupFailed';
}

/**
 * A gentle strength hint for the owner's password (the server's rule stays "at least 8"): 0 empty, 1 too short,
 * 2 long enough, 3 long enough with letters and digits, or 12+ characters.
 */
export function passwordStrength(password: string): 0 | 1 | 2 | 3 {
  if (!password) return 0;
  if (password.length < 8) return 1;

  const mixed = /[a-zA-Z]/.test(password) && /\d/.test(password);

  return mixed || password.length >= 12 ? 3 : 2;
}
