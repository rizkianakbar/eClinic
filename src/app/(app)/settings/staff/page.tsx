import type { Metadata } from "next";
import { listStaff } from "@/features/settings/settings.service";
import { SettingsStaff } from "@/features/settings/settings-staff";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Staf" };

export default async function StaffPage() {
  const session = await requireRole("owner", "admin");
  const staff = await listStaff(await createClient());
  return <SettingsStaff session={session} staff={staff} />;
}
