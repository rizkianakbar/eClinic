import { type ReactNode, Suspense } from 'react';
import { QueueDesk } from '@/features/queue/queue-desk';
import { getOwnerDashboard } from '@/features/reports/reports.service';
import { listAuditLogs } from '@/features/settings/settings.service';
import { listTodaySessions } from '@/features/visits/visits.service';
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
const fullDate = new Intl.DateTimeFormat('id-ID', {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
  year: 'numeric',
  timeZone: 'UTC',
});

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
  const firstName = props.session.fullName.replace(/\s*\(.*\)$/, '');

  return (
    <header className="flex flex-wrap items-end justify-between gap-x-6 gap-y-4">
      <div className="flex flex-col gap-0.5">
        <p className="text-sm text-muted-foreground">{fullDate.format(new Date(props.today))}</p>
        <h1 className="text-[1.5rem] leading-tight font-semibold tracking-tight">
          {greeting(jakartaHour(new Date()))}, {firstName}
        </h1>
      </div>
      {props.children}
    </header>
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
