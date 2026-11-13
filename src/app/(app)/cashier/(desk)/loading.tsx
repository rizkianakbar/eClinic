import { LiveIndicator } from '@/components/ui/live-indicator';
import { SkeletonPage, SkeletonStats } from '@/components/ui/skeleton';
import { HomeCashierSkeleton } from '@/features/home/home-skeleton';
import { formatDate, todayInJakarta } from '@/lib/dates';

export default function Loading() {
  return (
    <SkeletonPage route label="Memuat kasir">
      <header className="flex flex-wrap items-end justify-between gap-x-6 gap-y-4">
        <div className="flex flex-col gap-0.5">
          <h1 className="text-[1.5rem] leading-tight font-semibold tracking-tight">Kasir</h1>
          <p className="inline-flex flex-wrap items-center gap-x-2 text-sm text-muted-foreground">
            {formatDate(todayInJakarta())}
            <LiveIndicator />
          </p>
        </div>
        <SkeletonStats
          items={[
            { label: 'Diterima hari ini', hint: 'umum' },
            { label: 'Tagihan lunas', hint: 'umum' },
            { label: 'BPJS selesai', hint: 'kunjungan' },
            { label: 'Menunggu', hint: 'pasien' },
          ]}
        />
      </header>
      <HomeCashierSkeleton />
    </SkeletonPage>
  );
}
