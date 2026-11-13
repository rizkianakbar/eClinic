import { getTranslations } from 'next-intl/server';
import { SkeletonPage } from '@/components/ui/skeleton';
import { BillingInvoiceSkeleton, VisitHeaderSkeleton } from '@/features/billing/billing-skeleton';

export default async function Loading() {
  const t = await getTranslations();

  return (
    <SkeletonPage route label={t('billing.loading')}>
      <VisitHeaderSkeleton back={{ href: '/cashier', label: t('nav.cashier') }} />
      <BillingInvoiceSkeleton />
    </SkeletonPage>
  );
}
