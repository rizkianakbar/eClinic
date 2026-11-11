import type { ReactNode } from "react";
import { ROLE_LABELS } from "@/features/auth/auth.constants";
import { SignOutButton } from "@/features/auth/auth-sign-out-button";
import type { Session } from "@/lib/auth";
import { navItemsFor } from "./app-shell.lib";
import { AppShellNav } from "./app-shell-nav";

type AppShellProps = {
  session: Session;
  children: ReactNode;
};

export function AppShell(props: AppShellProps) {
  const { session } = props;

  return (
    <div className="flex min-h-svh flex-col md:flex-row">
      <aside className="flex flex-col gap-4 border-b bg-muted/40 p-4 md:w-60 md:border-r md:border-b-0">
        <p className="text-lg font-semibold">e-clinic</p>
        <AppShellNav items={navItemsFor(session.role)} />
        <div className="mt-auto flex items-center justify-between gap-2 md:flex-col md:items-start">
          <div className="min-w-0 text-sm">
            <p className="truncate font-medium">{session.fullName}</p>
            <p className="text-muted-foreground">{ROLE_LABELS[session.role]}</p>
          </div>
          <SignOutButton />
        </div>
      </aside>
      <main className="flex-1 p-4 md:p-8">{props.children}</main>
    </div>
  );
}
