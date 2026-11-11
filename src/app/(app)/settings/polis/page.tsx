import type { Metadata } from "next";
import { listPolis } from "@/features/settings/settings.service";
import { SettingsPolis } from "@/features/settings/settings-polis";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Poli" };

export default async function PolisPage() {
  await requireRole("owner", "admin");
  const polis = await listPolis(await createClient());
  return <SettingsPolis polis={polis} />;
}
