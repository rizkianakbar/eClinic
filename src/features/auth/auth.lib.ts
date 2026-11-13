import { z } from 'zod';

export const signInSchema = z.object({
  email: z.string().trim().toLowerCase().min(1, 'auth.errors.emailRequired').pipe(z.email('auth.errors.emailInvalid')),
  password: z.string().min(1, 'auth.errors.passwordRequired'),
});

export type SignInInput = z.input<typeof signInSchema>;
export type SignInValues = z.output<typeof signInSchema>;

export const changePasswordSchema = z
  .object({
    current_password: z.string().min(1, 'auth.errors.currentRequired'),
    password: z.string().min(8, 'auth.errors.newMin').max(72, 'auth.errors.newMax'),
    confirm: z.string(),
  })
  .refine((value) => value.password === value.confirm, {
    message: 'auth.errors.confirmMismatch',
    path: ['confirm'],
  })
  .refine((value) => value.password !== value.current_password, {
    message: 'auth.errors.sameAsCurrent',
    path: ['password'],
  });

export type ChangePasswordValues = z.output<typeof changePasswordSchema>;

/** Maps a Supabase Auth error on password change to an actionable message (key). */
export function changePasswordErrorMessage(error: { code?: string }) {
  if (error.code === 'invalid_credentials') return 'auth.errors.currentWrong';
  if (error.code === 'weak_password') return 'auth.errors.weak';
  if (error.code === 'same_password') return 'auth.errors.sameAsCurrent';

  return 'auth.errors.changeFailed';
}
