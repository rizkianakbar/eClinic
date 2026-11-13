'use client';

import { LogOutIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useSignOut } from './auth.hooks';

export function SignOutButton() {
  const signOut = useSignOut();

  return (
    <Button variant="destructive-outline" disabled={signOut.isPending} onClick={() => signOut.mutate()}>
      <LogOutIcon />
      {signOut.isPending ? 'Keluar…' : 'Keluar dari akun ini'}
    </Button>
  );
}
