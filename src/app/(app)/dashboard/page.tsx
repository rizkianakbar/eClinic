import type { Metadata } from "next";
import { ROLE_LABELS } from "@/features/auth/auth.constants";
import { requireRole } from "@/lib/auth";
import { formatDate } from "@/lib/dates";

export const metadata: Metadata = { title: "Beranda" };

export default async function DashboardPage() {
  const session = await requireRole();

  return (
    <div className="flex flex-col gap-1">
      <h1 className="text-2xl font-semibold">Selamat datang, {session.fullName}</h1>
      <p className="text-muted-foreground">
        {ROLE_LABELS[session.role]} · {formatDate(new Date())}
      </p>
    </div>
  );
}
