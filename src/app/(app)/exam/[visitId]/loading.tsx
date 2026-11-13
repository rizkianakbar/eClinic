import { getTranslations } from 'next-intl/server';
import { SkeletonPage } from '@/components/ui/skeleton';
import { ExamSkeleton } from '@/features/exam/exam-skeleton';

export default async function Loading() {
  const t = await getTranslations('exam');

  return (
    <SkeletonPage route label={t('loading')}>
      <ExamSkeleton />
    </SkeletonPage>
  );
}
