'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useSignIn } from './auth.hooks';
import { type SignInInput, type SignInValues, signInSchema } from './auth.lib';

export function LoginForm() {
  const signIn = useSignIn();

  const form = useForm<SignInInput, unknown, SignInValues>({
    resolver: zodResolver(signInSchema),
    defaultValues: { email: '', password: '' },
  });

  const { errors } = form.formState;

  return (
    <form noValidate className="flex flex-col gap-5" onSubmit={form.handleSubmit((values) => signIn.mutate(values))}>
      <div className="flex flex-col gap-2">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          type="email"
          inputMode="email"
          autoCapitalize="none"
          autoCorrect="off"
          autoComplete="username"
          autoFocus
          className="h-10"
          aria-invalid={Boolean(errors.email)}
          {...form.register('email')}
        />
        {errors.email && <p className="text-sm text-destructive">{errors.email.message}</p>}
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="password">Kata sandi</Label>
        <Input
          id="password"
          type="password"
          autoComplete="current-password"
          className="h-10"
          aria-invalid={Boolean(errors.password)}
          {...form.register('password')}
        />
        {errors.password && <p className="text-sm text-destructive">{errors.password.message}</p>}
      </div>

      <Button type="submit" size="lg" disabled={signIn.isPending}>
        {signIn.isPending ? 'Memeriksa...' : 'Masuk'}
      </Button>
    </form>
  );
}
