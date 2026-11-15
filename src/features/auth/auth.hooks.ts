import { useMutation } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { unwrap } from '@/lib/query';
import { signIn, signInAsTestAccount, signOut } from './auth.actions';
import type { SignInValues } from './auth.lib';

export function useSignIn() {
  const router = useRouter();

  return useMutation({
    mutationFn: async (values: SignInValues) => unwrap(await signIn(values)),
    onSuccess: ({ next }) => {
      router.replace(next);
      router.refresh();
    },
  });
}

/** Development quick login: one click per test account. */
export function useTestAccountSignIn() {
  const router = useRouter();

  return useMutation({
    mutationFn: async (email: string) => unwrap(await signInAsTestAccount(email)),
    onSuccess: ({ next }) => {
      router.replace(next);
      router.refresh();
    },
  });
}

export function useSignOut() {
  const router = useRouter();

  return useMutation({
    mutationFn: async () => unwrap(await signOut()),
    onSuccess: () => {
      router.replace('/login');
      router.refresh();
    },
  });
}
