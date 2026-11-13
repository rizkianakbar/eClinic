import { Panel } from '@/components/ui/panel';
import { placeholders, Skeleton, SkeletonButton, SkeletonLine } from '@/components/ui/skeleton';
import { QueueDeskSkeleton } from '@/features/queue/queue-skeleton';
import { JOURNEY } from '@/features/visits/visits.lib';
import { STATION_COLORS } from '@/features/visits/visits-journey-line';
import type { Role } from '@/lib/auth';
import { cn } from '@/lib/utils';
import { HomeAdminShortcuts } from './home-admin';
import { METHODS } from './home-cashier';

/*
 * Beranda while it loads: each role's desk drawn in its real frames (panels with their real titles, rows of the
 * real height), so nothing moves when the numbers and names arrive.
 */

/** HomeClinicToday's frame: open/closed and hours, then who is practising. */
export function HomeClinicTodaySkeleton() {
  return (
    <div className="flex items-stretch divide-x rounded-xl border bg-card shadow-[0_1px_2px_rgb(20_32_29/0.04)]">
      <div className="flex shrink-0 flex-col justify-center gap-0.5 px-4 py-2.5">
        <SkeletonLine className="w-24" />
        <SkeletonLine size="xs" className="w-20" />
      </div>
      <div className="flex min-w-0 items-center gap-3 px-4 py-2.5">
        <span className="hidden -space-x-1.5 sm:flex">
          {placeholders(3).map((key) => (
            <Skeleton key={key} className="size-8 rounded-full ring-2 ring-card" />
          ))}
        </span>
        <span className="flex min-w-0 flex-col">
          <SkeletonLine className="w-28" />
          <SkeletonLine size="xs" className="w-32" />
        </span>
      </div>
    </div>
  );
}

/** A patient row on a desk (HomeDeskRow): number tile, name, context, and the right side. */
export function HomeDeskRowSkeleton(props: { aside?: boolean }) {
  return (
    <li className="flex items-center gap-3 border-b px-4 py-3 last:border-0">
      <Skeleton className="size-10 shrink-0 rounded-lg" />
      <span className="flex min-w-0 flex-1 flex-col">
        <SkeletonLine className="w-40" />
        <SkeletonLine className="w-56" />
      </span>
      {props.aside !== false && <SkeletonLine className="w-14" />}
    </li>
  );
}

type HomeDeskSkeletonProps = {
  role: Role;
};

/** The desk under the greeting, per role (front desk, pharmacist and cashier land on their station instead). */
export function HomeDeskSkeleton(props: HomeDeskSkeletonProps) {
  switch (props.role) {
    case 'doctor':
      return <QueueDeskSkeleton />;
    case 'nurse':
      return <NurseSkeleton />;
    case 'admin':
      return <AdminSkeleton />;
    case 'owner':
      return <OwnerSkeleton />;
    default:
      return null;
  }
}

function OwnerSkeleton() {
  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Panel
          title="Tren 14 hari"
          link={{ href: '/reports', label: 'Laporan' }}
          variant="bare"
          className="lg:col-span-2">
          <div className="flex flex-1 flex-col overflow-hidden rounded-xl border bg-card shadow-[0_1px_2px_rgb(20_32_29/0.04)]">
            <div className="grid grid-cols-2 border-b">
              {['Pendapatan hari ini', 'Pasien hari ini'].map((label, index) => (
                <div
                  key={label}
                  className={cn(
                    'relative flex min-w-0 flex-col items-start gap-1 border-r px-3 py-3 last:border-r-0 sm:px-5 sm:py-4',
                    index === 0 && 'after:absolute after:inset-x-0 after:-bottom-px after:h-0.5 after:bg-primary',
                  )}>
                  <span
                    className={cn(
                      'text-[0.8125rem] font-medium',
                      index === 0 ? 'text-foreground' : 'text-muted-foreground',
                    )}>
                    {label}
                  </span>
                  <SkeletonLine size="numeral-3xl" className="w-36" />
                  <SkeletonLine size="xs" className="w-40" />
                </div>
              ))}
            </div>
            <div className="flex flex-1 flex-col px-5 pt-5 pb-4">
              <div className="relative flex flex-1 items-end gap-1.5 pl-16" style={{ minHeight: '11rem' }}>
                {[38, 52, 30, 64, 45, 70, 58, 34, 49, 61, 42, 75, 55, 66].map((height, index) => (
                  <span
                    // biome-ignore lint/suspicious/noArrayIndexKey: fixed placeholder bars.
                    key={index}
                    aria-hidden
                    className="flex-1 animate-pulse rounded-t-[3px] bg-foreground/7"
                    style={{ height: `${height}%` }}
                  />
                ))}
              </div>
              <div className="mt-2 h-4 pl-16" />
            </div>
          </div>
        </Panel>
        <Panel title="Pasien sekarang" link={{ href: '/queue', label: 'Antrean' }} className="h-full">
          <div className="flex h-full flex-col">
            <ul className="flex flex-1 flex-col justify-around gap-3 p-5">
              {JOURNEY.map((station) => (
                <li key={station.status} className="flex flex-col gap-1.5 text-sm">
                  <span className="flex items-center justify-between gap-3">
                    <span className="flex items-center gap-2">
                      <span className={cn('size-2 rounded-full', STATION_COLORS[station.status].line)} aria-hidden />
                      {station.label}
                    </span>
                    <Skeleton className="h-3 w-4 rounded" />
                  </span>
                  <span className="h-1.5 rounded-full bg-muted" />
                </li>
              ))}
            </ul>
            <p className="flex items-center justify-between gap-3 border-t bg-muted/30 px-5 py-3 text-[0.8125rem]">
              <SkeletonLine className="w-36" />
              <SkeletonLine className="w-12" />
            </p>
          </div>
        </Panel>
      </div>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Panel title="Belum dibayar" dot="bg-line-cashier" link={{ href: '/cashier', label: 'Kasir' }}>
          <ul>
            {placeholders(3).map((key) => (
              <HomeDeskRowSkeleton key={key} />
            ))}
          </ul>
        </Panel>
        <Panel title="Stok perlu dipesan" link={{ href: '/inventory?filter=low', label: 'Stok obat' }}>
          <ul>
            {placeholders(4).map((key) => (
              <li key={key} className="flex items-center gap-4 border-b px-4 py-3 last:border-0">
                <span className="min-w-0 flex-1">
                  <SkeletonLine className="w-40" />
                </span>
                <Skeleton className="hidden h-1.5 w-24 rounded-full sm:block" />
                <SkeletonLine className="w-20" />
                <span className="size-3.5" />
              </li>
            ))}
          </ul>
        </Panel>
      </div>
    </div>
  );
}

function NurseSkeleton() {
  return (
    <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
      <Panel title="Perlu tanda vital" dot="bg-line-waiting" link={{ href: '/queue', label: 'Antrean' }}>
        <ul>
          {placeholders(3).map((key) => (
            <li key={key} className="flex items-center gap-3 border-b px-4 py-3 last:border-0">
              <Skeleton className="size-10 shrink-0 rounded-lg" />
              <span className="flex min-w-0 flex-1 flex-col">
                <SkeletonLine className="w-40" />
                <SkeletonLine className="w-48" />
              </span>
              <SkeletonLine className="w-12" />
              <SkeletonButton className="w-32" />
            </li>
          ))}
        </ul>
      </Panel>
      <Panel title="Sudah dicatat">
        <ul>
          {placeholders(3).map((key) => (
            <li key={key} className="flex items-center gap-3 border-b px-4 py-2.5 last:border-0">
              <Skeleton className="size-4 rounded-full" />
              <span className="min-w-0 flex-1">
                <SkeletonLine className="w-32" />
              </span>
              <SkeletonLine className="w-10" />
            </li>
          ))}
        </ul>
      </Panel>
    </div>
  );
}

function AdminSkeleton() {
  return (
    <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
      <Panel title="Aktivitas terbaru" link={{ href: '/settings/activity', label: 'Log aktivitas' }}>
        <ul>
          {placeholders(8).map((key) => (
            <li key={key} className="flex items-start gap-3 border-b px-4 py-3 last:border-0">
              <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-muted" aria-hidden />
              <span className="min-w-0 flex-1">
                <SkeletonLine className="w-64" />
              </span>
              <SkeletonLine className="w-28" />
            </li>
          ))}
        </ul>
      </Panel>
      <HomeAdminShortcuts />
    </div>
  );
}

/** Resep masuk (the pharmacist's station) while it loads. */
export function HomePharmacySkeleton() {
  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-2 divide-x divide-y overflow-hidden rounded-xl border bg-card shadow-[0_1px_2px_rgb(20_32_29/0.04)] lg:grid-cols-4 lg:divide-y-0">
        {['Resep menunggu', 'Diserahkan hari ini', 'Stok menipis', 'Kedaluwarsa ≤ 3 bulan'].map((label) => (
          <div key={label} className="flex min-w-0 flex-col gap-0.5 px-5 py-4">
            <span className="text-xs font-medium text-muted-foreground">{label}</span>
            <SkeletonLine size="numeral-2xl" className="w-10" />
            <SkeletonLine size="xs" className="w-28" />
          </div>
        ))}
      </div>
      <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="flex min-w-0 flex-col gap-4">
          <section className="overflow-hidden rounded-2xl border bg-card shadow-[0_1px_2px_rgb(20_32_29/0.04)]">
            <div className="flex flex-wrap items-center gap-x-6 gap-y-4 p-5">
              <Skeleton className="size-16 shrink-0 rounded-2xl" />
              <div className="flex min-w-0 flex-[1_1_16rem] flex-col">
                <SkeletonLine className="w-28" />
                <span className="flex h-7 items-center">
                  <Skeleton className="h-5 w-52 max-w-full rounded" />
                </span>
                <SkeletonLine className="w-64" />
              </div>
              <div className="flex items-center gap-3">
                <SkeletonLine className="w-12" />
                <SkeletonButton size="lg" className="w-40" />
              </div>
            </div>
            <ol className="grid grid-cols-1 gap-px border-t bg-border sm:grid-cols-2">
              {placeholders(4).map((key) => (
                <li key={key} className="flex items-center gap-3 bg-card px-5 py-2.5">
                  <Skeleton className="size-7 shrink-0 rounded-md" />
                  <span className="min-w-0 flex-1">
                    <SkeletonLine className="w-32" />
                  </span>
                  <SkeletonLine className="w-12" />
                </li>
              ))}
            </ol>
          </section>
          <Panel title="Antre berikutnya" dot="bg-line-pharmacy">
            <ol className="divide-y">
              {placeholders(2).map((key) => (
                <li key={key} className="flex items-start gap-3 px-4 py-3">
                  <Skeleton className="size-10 shrink-0 rounded-lg" />
                  <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                    <SkeletonLine className="w-40" />
                    <span className="flex gap-1">
                      {placeholders(3).map((chip) => (
                        <Skeleton key={chip} className="h-6 w-24 rounded-md" />
                      ))}
                    </span>
                  </div>
                </li>
              ))}
            </ol>
          </Panel>
        </div>
        <div className="flex flex-col gap-6">
          <Panel title="Stok perlu dipesan" link={{ href: '/inventory?filter=low', label: 'Stok' }}>
            <ul className="divide-y">
              {placeholders(4).map((key) => (
                <li key={key} className="flex flex-col gap-1.5 px-4 py-2.5">
                  <span className="flex items-center justify-between gap-3">
                    <SkeletonLine className="w-32" />
                    <SkeletonLine className="w-24" />
                  </span>
                  <span className="h-1 rounded-full bg-muted" />
                </li>
              ))}
            </ul>
          </Panel>
          <Panel title="Diserahkan hari ini">
            <ul className="divide-y">
              {placeholders(3).map((key) => (
                <li key={key} className="flex items-center gap-3 px-4 py-2.5">
                  <SkeletonLine className="w-10" />
                  <span className="min-w-0 flex-1">
                    <SkeletonLine className="w-32" />
                    <SkeletonLine size="xs" className="w-16" />
                  </span>
                  <span className="size-8" />
                </li>
              ))}
            </ul>
          </Panel>
        </div>
      </div>
    </div>
  );
}

/** Kasir (the cashier's station) while it loads. */
export function HomeCashierSkeleton() {
  return (
    <div className="flex flex-col gap-8">
      <section className="flex flex-col gap-2.5">
        <h2 className="flex items-center gap-2 text-sm font-semibold">
          <span className="size-2 rounded-full bg-line-cashier" aria-hidden />
          Menunggu pembayaran
          <Skeleton className="h-5 w-6 rounded-md" />
        </h2>
        <ul className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
          {placeholders(3).map((key) => (
            <li
              key={key}
              className="flex h-full flex-col gap-4 rounded-xl border bg-card p-4 shadow-[0_1px_2px_rgb(20_32_29/0.04)]">
              <div className="flex items-start gap-3">
                <Skeleton className="size-11 shrink-0 rounded-xl" />
                <span className="flex min-w-0 flex-1 flex-col">
                  <SkeletonLine size="base" className="w-36" />
                  <SkeletonLine className="w-44" />
                </span>
                <SkeletonLine className="w-12" />
              </div>
              <div className="mt-auto flex items-end justify-between gap-3 border-t pt-3">
                <span className="flex flex-col">
                  <SkeletonLine size="xs" className="w-12" />
                  <SkeletonLine size="numeral-xl" className="w-24" />
                </span>
                <SkeletonButton className="w-40" />
              </div>
            </li>
          ))}
        </ul>
      </section>
      <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <section className="flex min-w-0 flex-col gap-2.5">
          <h2 className="flex items-center gap-2 text-sm font-semibold">
            Transaksi hari ini
            <Skeleton className="h-5 w-6 rounded-md" />
          </h2>
          <div className="overflow-hidden rounded-xl border bg-card shadow-[0_1px_2px_rgb(20_32_29/0.04)]">
            <div className="hidden grid-cols-[3rem_minmax(0,1.4fr)_minmax(0,1fr)_7rem_7.5rem_2rem] gap-3 border-b bg-muted/40 px-4 py-2 text-xs font-medium text-muted-foreground md:grid">
              <span>Jam</span>
              <span>Pasien</span>
              <span>No. tagihan</span>
              <span>Metode</span>
              <span className="text-right">Jumlah</span>
              <span />
            </div>
            <ul>
              {placeholders(4).map((key) => (
                <li
                  key={key}
                  className="grid grid-cols-[3rem_minmax(0,1fr)_auto_2rem] items-center gap-3 border-b px-4 py-2.5 last:border-0 md:grid-cols-[3rem_minmax(0,1.4fr)_minmax(0,1fr)_7rem_7.5rem_2rem]">
                  <SkeletonLine className="w-10" />
                  <span className="min-w-0">
                    <SkeletonLine className="w-36" />
                    <SkeletonLine size="xs" className="w-20" />
                  </span>
                  <span className="hidden md:block">
                    <SkeletonLine className="w-28" />
                  </span>
                  <span className="hidden md:block">
                    <Skeleton className="h-6 w-16 rounded-md" />
                  </span>
                  <span className="flex justify-end">
                    <SkeletonLine className="w-20" />
                  </span>
                  <span className="size-8" />
                </li>
              ))}
            </ul>
          </div>
        </section>
        <aside className="flex flex-col gap-2.5 lg:sticky lg:top-20">
          <h2 className="text-sm font-semibold">Metode pembayaran</h2>
          <div className="overflow-hidden rounded-xl border bg-card shadow-[0_1px_2px_rgb(20_32_29/0.04)]">
            <div className="flex flex-col gap-3 p-4">
              <div className="h-2.5 rounded-full bg-muted" aria-hidden />
              <ul className="flex flex-col gap-2.5">
                {METHODS.map((method) => (
                  <li key={method.key} className="flex items-center gap-2.5 text-sm">
                    <span className={cn('size-2.5 rounded-sm', method.tone)} aria-hidden />
                    <method.icon className="size-4 text-muted-foreground" aria-hidden />
                    <span className="flex-1">{method.label}</span>
                    <SkeletonLine size="xs" className="w-5" />
                    <span className="flex w-24 justify-end">
                      <SkeletonLine className="w-16" />
                    </span>
                  </li>
                ))}
              </ul>
            </div>
            <dl className="grid grid-cols-2 gap-px border-t bg-border">
              {['Rata-rata per tagihan', 'Diskon diberikan'].map((label) => (
                <div key={label} className="flex flex-col gap-0.5 bg-card px-4 py-3">
                  <span className="text-xs text-muted-foreground">{label}</span>
                  <SkeletonLine className="w-20" />
                </div>
              ))}
            </dl>
          </div>
        </aside>
      </div>
    </div>
  );
}
