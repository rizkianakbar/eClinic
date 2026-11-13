import { Schedules } from '@/features/schedules/schedules';
import { listDoctors, listSchedules } from '@/features/schedules/schedules.service';
import { listPolis } from '@/features/settings/settings.service';
import { pageTitle } from '@/i18n/metadata';
import { requireRole } from '@/lib/auth';
import { isoWeekday, todayInJakarta } from '@/lib/dates';
import { createClient } from '@/lib/supabase/server';

export const generateMetadata = pageTitle('settings.tabs.schedules');

export default async function SchedulesPage() {
  await requireRole('owner', 'admin');

  const supabase = await createClient();

  const [schedules, doctors, polis] = await Promise.all([
    listSchedules(supabase),
    listDoctors(supabase),
    listPolis(supabase, { activeOnly: true }),
  ]);

  return (
    <Schedules
      schedules={schedules}
      today={isoWeekday(todayInJakarta())}
      doctors={doctors.map((doctor) => ({ id: doctor.id, name: doctor.full_name }))}
      polis={polis.map((poli) => ({ id: poli.id, name: poli.name }))}
    />
  );
}
