import { SkeletonPage } from '@/components/ui/skeleton';
import { BillingInvoiceSkeleton, VisitHeaderSkeleton } from '@/features/billing/billing-skeleton';

export default function Loading() {
  return (
    <SkeletonPage route label="Memuat tagihan">
      <VisitHeaderSkeleton back={{ href: '/cashier', label: 'Kasir' }} />
      <BillingInvoiceSkeleton />
    </SkeletonPage>
  );
}
