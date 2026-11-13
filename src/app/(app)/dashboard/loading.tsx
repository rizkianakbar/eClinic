import { getTranslations } from 'next-intl/server';
import { SkeletonPage } from '@/components/ui/skeleton';
import { HomeHeader } from '@/features/home/home';
import { HomeClinicTodaySkeleton, HomeDeskSkeleton } from '@/features/home/home-skeleton';
import { getSession } from '@/lib/auth';
import { todayInJakarta } from '@/lib/dates';

/** Beranda while it loads: the real greeting (it needs only the session), then this role's desk in outline. */
export default async function Loading() {
  const session = await getSession();

  if (!session) return null;

  const t = await getTranslations('home');

  return (
    <SkeletonPage route label={t('loading')}>
      <HomeHeader session={session} today={todayInJakarta()}>
        {(session.role === 'owner' || session.role === 'admin') && <HomeClinicTodaySkeleton />}
      </HomeHeader>
      <HomeDeskSkeleton role={session.role} />
    </SkeletonPage>
  );
}
