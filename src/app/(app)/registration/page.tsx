import { getLocale, getTranslations } from 'next-intl/server';
import { LiveIndicator } from '@/components/ui/live-indicator';
import { jakartaClock } from '@/features/home/home.lib';
import { listTodayVisits } from '@/features/home/home.service';
import { HomeClinicToday } from '@/features/home/home-clinic-today';
import { PATIENT_EDITOR_ROLES } from '@/features/patients/patients.constants';
import { listTodaySessions } from '@/features/visits/visits.service';
import { VisitsLiveRefresh } from '@/features/visits/visits-live-refresh';
import { VisitsRegistrationDesk } from '@/features/visits/visits-registration-desk';
import { VisitsSessionsPanel } from '@/features/visits/visits-sessions-panel';
import { VisitsTodayList } from '@/features/visits/visits-today-list';
import { pageTitle } from '@/i18n/metadata';
import { requireRole } from '@/lib/auth';
import { formatDate, todayInJakarta } from '@/lib/dates';
import { createClient } from '@/lib/supabase/server';

export const generateMetadata = pageTitle('nav.registration');

export default async function RegistrationPage() {
  const session = await requireRole(...PATIENT_EDITOR_ROLES);
  const today = todayInJakarta();
  const [t, locale] = await Promise.all([getTranslations(), getLocale()]);
  const now = jakartaClock(new Date());
  const supabase = await createClient();
  const [visits, sessions] = await Promise.all([listTodayVisits(supabase, today), listTodaySessions(supabase)]);

  // Latest active visit per patient today, to warn before registering twice.
  const registeredToday: Record<
    string,
    { queueNo: number; poliName: string; status: (typeof visits)[number]['status'] }
  > = {};

  for (const visit of visits) {
    if (visit.status === 'cancelled') continue;

    registeredToday[visit.patient_id] = {
      queueNo: visit.queue_no,
      poliName: visit.poli?.name ?? '',
      status: visit.status,
    };
  }

  return (
    <>
      <VisitsLiveRefresh visitDate={today} />
      <header className="flex flex-wrap items-end justify-between gap-x-6 gap-y-4">
        <div className="flex flex-col gap-0.5">
          <h1 className="text-[1.5rem] leading-tight font-semibold tracking-tight">{t('nav.registration')}</h1>
          <p className="inline-flex flex-wrap items-center gap-x-2 text-sm text-muted-foreground">
            {formatDate(today, locale)}
            <LiveIndicator />
          </p>
        </div>
        <HomeClinicToday
          sessions={sessions}
          now={now}
          href={session.role === 'owner' || session.role === 'admin' ? '/settings/schedules' : undefined}
        />
      </header>

      <VisitsRegistrationDesk
        sessions={sessions}
        now={now}
        canManageSchedules={session.role === 'owner' || session.role === 'admin'}
        registeredToday={registeredToday}
        idle={<VisitsSessionsPanel sessions={sessions} now={now} />}>
        <VisitsTodayList visits={visits} />
      </VisitsRegistrationDesk>
    </>
  );
}
