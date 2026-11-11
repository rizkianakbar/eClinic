"use client";

import { LogOutIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useSignOut } from "./auth.hooks";

export function SignOutButton() {
  const signOut = useSignOut();

  return (
    <Button variant="ghost" size="sm" disabled={signOut.isPending} onClick={() => signOut.mutate()}>
      <LogOutIcon />
      Keluar
    </Button>
  );
}
