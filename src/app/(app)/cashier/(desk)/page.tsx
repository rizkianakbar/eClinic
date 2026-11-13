import type { Metadata } from 'next';
import { LiveIndicator } from '@/components/ui/live-indicator';
import { CASHIER_ROLES } from '@/features/billing/billing.constants';
import { paymentBreakdown } from '@/features/home/home.lib';
import { listCashierDesk, listPaidTodayDetail } from '@/features/home/home.service';
import { HomeCashier } from '@/features/home/home-cashier';
import { VisitsLiveRefresh } from '@/features/visits/visits-live-refresh';
import { requireRole } from '@/lib/auth';
import { formatDate, todayInJakarta } from '@/lib/dates';
import { formatRupiah } from '@/lib/money';
import { createClient } from '@/lib/supabase/server';

export const metadata: Metadata = { title: 'Kasir' };

export default async function CashierPage() {
  await requireRole(...CASHIER_ROLES);

  const today = todayInJakarta();
  const supabase = await createClient();
  const [waiting, paid] = await Promise.all([listCashierDesk(supabase), listPaidTodayDetail(supabase, today)]);
  const summary = paymentBreakdown(paid);

  return (
    <>
      <VisitsLiveRefresh visitDate={today} />
      <header className="flex flex-wrap items-end justify-between gap-x-6 gap-y-4">
        <div className="flex flex-col gap-0.5">
          <h1 className="text-[1.5rem] leading-tight font-semibold tracking-tight">Kasir</h1>
          <p className="inline-flex flex-wrap items-center gap-x-2 text-sm text-muted-foreground">
            {formatDate(today)}
            <LiveIndicator />
          </p>
        </div>
        <dl className="grid grid-cols-2 divide-x divide-y rounded-xl border bg-card shadow-[0_1px_2px_rgb(20_32_29/0.04)] sm:flex sm:divide-y-0">
          {[
            { label: 'Diterima hari ini', value: formatRupiah(summary.total), hint: 'umum' },
            { label: 'Tagihan lunas', value: String(summary.umum), hint: 'umum' },
            { label: 'BPJS selesai', value: String(summary.bpjs), hint: 'kunjungan' },
            { label: 'Menunggu', value: String(waiting.length), hint: 'pasien', alert: waiting.length > 0 },
          ].map((stat) => (
            <div key={stat.label} className="flex flex-col gap-0.5 px-4 py-2.5">
              <dt className="text-xs text-muted-foreground">{stat.label}</dt>
              <dd className="flex items-baseline gap-1.5">
                <span className={stat.alert ? 'numeral text-xl text-primary' : 'numeral text-xl'}>{stat.value}</span>
                <span className="text-xs text-muted-foreground">{stat.hint}</span>
              </dd>
            </div>
          ))}
        </dl>
      </header>
      {/* Date.now() here is the server render time for the wait timers (first paint; they tick on the client). */}
      <HomeCashier waiting={waiting} paid={paid} now={Date.now()} />
    </>
  );
}
