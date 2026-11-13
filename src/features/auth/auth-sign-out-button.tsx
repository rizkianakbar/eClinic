'use client';

import { LogOutIcon } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { useSignOut } from './auth.hooks';

export function SignOutButton() {
  const t = useTranslations('auth');
  const signOut = useSignOut();

  return (
    <Button variant="destructive-outline" disabled={signOut.isPending} onClick={() => signOut.mutate()}>
      <LogOutIcon />
      {signOut.isPending ? t('signingOut') : t('signOut')}
    </Button>
  );
}
