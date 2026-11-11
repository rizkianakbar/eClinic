import type { Metadata } from "next";
import { listDoctors, listSchedules } from "@/features/schedules/schedules.service";
import { Schedules } from "@/features/schedules/schedules";
import { listPolis } from "@/features/settings/settings.service";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Jadwal dokter" };

export default async function SchedulesPage() {
  await requireRole("owner", "admin");
  const supabase = await createClient();
  const [schedules, doctors, polis] = await Promise.all([
    listSchedules(supabase),
    listDoctors(supabase),
    listPolis(supabase, { activeOnly: true }),
  ]);

  return (
    <Schedules
      schedules={schedules}
      doctors={doctors.map((doctor) => ({ id: doctor.id, name: doctor.full_name }))}
      polis={polis.map((poli) => ({ id: poli.id, name: poli.name }))}
    />
  );
}
