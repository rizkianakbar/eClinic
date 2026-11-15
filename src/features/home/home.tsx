import { ChartNoAxesColumnIcon } from 'lucide-react';
import Link from 'next/link';
import { useLocale, useTranslations } from 'next-intl';
import { type ReactNode, Suspense } from 'react';
import { buttonVariants } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { branchSetupSteps, companySetupSteps } from '@/features/onboarding/onboarding.lib';
import { getBranchFacts, getCompanyFacts } from '@/features/onboarding/onboarding.service';
import { OnboardingChecklist } from '@/features/onboarding/onboarding-checklist';
import { QueueDesk } from '@/features/queue/queue-desk';
import { getOwnerDashboard } from '@/features/reports/reports.service';
import { listAuditLogs } from '@/features/settings/settings.service';
import { listTodaySessions } from '@/features/visits/visits.service';
import { INTL_LOCALE } from '@/i18n/locales';
import type { Session } from '@/lib/auth';
import { addDays, addMonths } from '@/lib/dates';
import type { SupabaseClient } from '@/lib/supabase/server';
import { dailySeries, dailyVisitCounts, greeting, jakartaClock, jakartaHour } from './home.lib';
import { getOwnerTrend, listCashierDesk, listLowStock, listTodayVisits, listTodayVitals } from './home.service';
import { HomeAdmin } from './home-admin';
import { HomeClinicToday } from './home-clinic-today';
import { HomeNurse } from './home-nurse';
import { HomeOwner } from './home-owner';
import { HomeClinicTodaySkeleton, HomeDeskSkeleton } from './home-skeleton';

type HomeProps = {
  session: Session;
  supabase: SupabaseClient;
  today: string;
};

/** Beranda is each role's workstation: what is waiting for me, then today's context. */
export function Home(props: HomeProps) {
  const managing = props.session.role === 'owner' || props.session.role === 'admin';
  const now = new Date();

  return (
    <>
      <HomeHeader session={props.session} today={props.today}>
        {/* Each part streams on its own: the greeting paints at once, the rest fills in as its data arrives. */}
        {managing && (
          <Suspense fallback={<HomeClinicTodaySkeleton />}>
            <ClinicToday supabase={props.supabase} now={jakartaClock(now)} />
          </Suspense>
        )}
      </HomeHeader>
      {/* A new clinic's setup list; established clinics render nothing here, so no placeholder either. */}
      {managing && (
        <Suspense fallback={null}>
          <Setup supabase={props.supabase} session={props.session} />
        </Suspense>
      )}
      <Suspense fallback={<HomeDeskSkeleton role={props.session.role} />}>
        <RoleDesk {...props} />
      </Suspense>
    </>
  );
}

type HomeHeaderProps = {
  session: Session;
  today: string;
  /** Right side: today's clinic hours (owner, admin). */
  children?: ReactNode;
};

/** The date and greeting: needs only the session, so the loading screen draws it for real. */
export function HomeHeader(props: HomeHeaderProps) {
  const t = useTranslations('home');
  const locale = useLocale();
  const firstName = props.session.fullName.replace(/\s*\(.*\)$/, '');

  const fullDate = new Intl.DateTimeFormat(INTL_LOCALE[locale], {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  });

  return (
    <header className="flex flex-wrap items-end justify-between gap-x-6 gap-y-4">
      <div className="flex flex-col gap-0.5">
        <p className="text-sm text-muted-foreground">{fullDate.format(new Date(props.today))}</p>
        <h1 className="text-[1.5rem] leading-tight font-semibold tracking-tight">
          {t('greetingName', { greeting: t(`greeting.${greeting(jakartaHour(new Date()))}`), name: firstName })}
        </h1>
      </div>
      {props.children}
    </header>
  );
}

async function Setup(props: { supabase: SupabaseClient; session: Session }) {
  const [company, branch] = await Promise.all([
    getCompanyFacts(props.supabase),
    getBranchFacts(props.supabase, props.session.clinicId),
  ]);

  return (
    <OnboardingChecklist
      companyName={props.session.organizationName}
      branchName={props.session.clinicName}
      company={companySetupSteps(company)}
      branch={branchSetupSteps(branch)}
    />
  );
}

async function ClinicToday(props: { supabase: SupabaseClient; now: string }) {
  return (
    <HomeClinicToday sessions={await listTodaySessions(props.supabase)} now={props.now} href="/settings/schedules" />
  );
}

async function RoleDesk(props: HomeProps) {
  const { session, supabase, today } = props;
  // Server render time: the first paint of the wait timers (then they tick on the client).
  const now = Date.now();

  switch (session.role) {
    case 'cashier':
    case 'pharmacist':
    case 'front_desk':
      return null; // their home is their station page (see STATION_HOME)
    case 'doctor': {
      const sessions = (await listTodaySessions(supabase)).filter((item) => item.doctorId === session.userId);

      return (
        <QueueDesk
          actor={{ role: session.role, userId: session.userId }}
          visitDate={today}
          sessions={sessions}
          now={now}
        />
      );
    }
    case 'nurse': {
      const visits = await listTodayVisits(supabase, today);
      const waiting = visits.filter((visit) => visit.status === 'waiting' || visit.status === 'registered');

      const vitals = await listTodayVitals(
        supabase,
        waiting.map((visit) => visit.id),
      );

      return <HomeNurse waiting={waiting} vitals={vitals} now={now} />;
    }
    case 'admin': {
      const activity = await listAuditLogs(supabase, {
        range: { from: addMonths(today, -1), to: today },
        table: null,
        page: 1,
      });

      return <HomeAdmin activity={activity.logs.slice(0, 10)} />;
    }
    case 'owner': {
      const days = Array.from({ length: 14 }, (_, index) => addDays(today, index - 13));

      const [dashboard, unpaid, lowStock, trend] = await Promise.all([
        getOwnerDashboard(supabase, today),
        listCashierDesk(supabase),
        listLowStock(supabase),
        getOwnerTrend(supabase, today, days),
      ]);

      // No visit in two weeks and none today (a new clinic): an empty state that says what fills it, not flat charts.
      if (trend.visits.length === 0 && dashboard.patients === 0 && trend.revenue.length === 0) {
        return <HomeOwnerFirstDay />;
      }

      return (
        <HomeOwner
          dashboard={dashboard}
          unpaid={unpaid}
          lowStock={lowStock}
          revenue={dailySeries(trend.revenue, days)}
          patients={dailyVisitCounts(trend.visits, days)}
          now={now}
        />
      );
    }
  }
}

/** The owner's Beranda before the first patient: what will appear here, and the one action that starts it. */
function HomeOwnerFirstDay() {
  const t = useTranslations('home.firstDay');

  return (
    <EmptyState
      icon={ChartNoAxesColumnIcon}
      title={t('title')}
      description={t('body')}
      action={
        <Link href="/registration" className={buttonVariants({ variant: 'outline' })}>
          {t('cta')}
        </Link>
      }
    />
  );
}
