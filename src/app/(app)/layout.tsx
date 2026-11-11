import { AppShell } from "@/features/app-shell/app-shell";
import { requireRole } from "@/lib/auth";

export default async function AuthenticatedLayout(props: LayoutProps<"/">) {
  const session = await requireRole();
  return <AppShell session={session}>{props.children}</AppShell>;
}
