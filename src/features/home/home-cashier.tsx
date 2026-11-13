import {
  ArrowRightIcon,
  BanknoteIcon,
  CheckCheckIcon,
  LandmarkIcon,
  PrinterIcon,
  QrCodeIcon,
  ShieldCheckIcon,
} from 'lucide-react';
import Link from 'next/link';
import { useLocale, useTranslations } from 'next-intl';
import { Arrival, ArrivalScope } from '@/components/ui/arrival';
import { Elapsed } from '@/components/ui/elapsed';
import { formatTime } from '@/lib/dates';
import { formatRupiah } from '@/lib/money';
import { cn } from '@/lib/utils';
import { paymentBreakdown } from './home.lib';
import type { listCashierDesk, listPaidTodayDetail } from './home.service';

type HomeCashierProps = {
  waiting: Awaited<ReturnType<typeof listCashierDesk>>;
  paid: Awaited<ReturnType<typeof listPaidTodayDetail>>;
  now: number;
};

/** Payment methods in the order the cashier sees them (names: paymentMethod.<key>). */
export const METHODS = [
  { key: 'cash', icon: BanknoteIcon, tone: 'bg-primary' },
  { key: 'qris', icon: QrCodeIcon, tone: 'bg-[#7a5bd1]' },
  { key: 'transfer', icon: LandmarkIcon, tone: 'bg-[#3a7bd5]' },
] as const;

const METHOD_BY_KEY = Object.fromEntries(METHODS.map((method) => [method.key, method]));

/**
 * The cashier's desk: who still has to pay (big, oldest first), every
 * transaction of the day, and how the money came in.
 */
export function HomeCashier(props: HomeCashierProps) {
  const t = useTranslations();
  const locale = useLocale();
  const today = paymentBreakdown(props.paid);

  const methodTotal = Math.max(
    1,
    Object.values(today.byMethod).reduce((sum, value) => sum + value, 0),
  );

  return (
    <div className="flex flex-col gap-8">
      <section aria-label={t('home.cashier.waiting')} className="flex flex-col gap-2.5">
        <h2 className="flex items-center gap-2 text-sm font-semibold">
          <span
            className={cn(
              'size-2 rounded-full bg-line-cashier',
              props.waiting.length > 0 && 'signal-pulse text-line-cashier',
            )}
            aria-hidden
          />
          {t('home.cashier.waiting')}
          <span className="tabular rounded-md bg-muted px-1.5 text-xs leading-5 font-medium text-muted-foreground">
            {props.waiting.length}
          </span>
        </h2>
        <ArrivalScope>
          {props.waiting.length === 0 ? (
            <div className="flex items-center gap-3 rounded-xl border border-dashed bg-card/60 px-4 py-3.5">
              <span className="flex size-8 items-center justify-center rounded-full bg-secondary text-primary">
                <CheckCheckIcon className="size-4" aria-hidden />
              </span>
              <p className="text-sm">
                <span className="font-medium">{t('home.cashier.allClear')}</span>{' '}
                <span className="text-muted-foreground">{t('home.cashier.allClearHint')}</span>
              </p>
            </div>
          ) : (
            <ul className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
              {props.waiting.map((visit, index) => (
                <Arrival as="li" key={visit.id}>
                  <Link
                    href={`/cashier/${visit.id}`}
                    className={cn(
                      'group flex h-full flex-col gap-4 rounded-xl border bg-card p-4 shadow-[0_1px_2px_rgb(20_32_29/0.04)] transition-[border-color,box-shadow] hover:border-input hover:shadow-[0_8px_24px_-12px_rgb(15_31_27/0.25)]',
                      index === 0 &&
                        'border-primary/30 shadow-[0_0_0_3px_color-mix(in_srgb,var(--primary)_10%,transparent)]',
                    )}>
                    <div className="flex items-start gap-3">
                      <span className="numeral flex size-11 shrink-0 items-center justify-center rounded-xl bg-status-cashier-soft text-xl text-status-cashier">
                        {visit.queue_no}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="flex items-center gap-2">
                          <span className="truncate font-semibold">{visit.patient?.full_name}</span>
                          {visit.payer_type === 'bpjs' && (
                            <span className="shrink-0 rounded bg-bpjs-soft px-1.5 text-[0.6875rem] leading-5 font-semibold text-bpjs">
                              BPJS
                            </span>
                          )}
                        </span>
                        <span className="block truncate text-[0.8125rem] text-muted-foreground">
                          {visit.poli?.name} · {visit.doctor?.full_name}
                        </span>
                      </span>
                      <Elapsed since={visit.updated_at} now={props.now} />
                    </div>
                    <div className="mt-auto flex items-end justify-between gap-3 border-t pt-3">
                      <span>
                        <span className="block text-xs text-muted-foreground">
                          {visit.payer_type === 'bpjs'
                            ? t('home.cashier.bpjsCovered')
                            : visit.billLines
                              ? t('home.cashier.items', { count: visit.billLines })
                              : t('home.cashier.billOnOpen')}
                        </span>
                        <span className="numeral block text-xl">
                          {visit.billTotal !== null ? formatRupiah(visit.billTotal) : '–'}
                        </span>
                      </span>
                      <span className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-sm font-medium text-primary-foreground transition-transform group-active:scale-[0.97]">
                        {visit.payer_type === 'bpjs' ? t('home.cashier.finish') : t('home.cashier.takePayment')}
                        <ArrowRightIcon
                          className="size-4 transition-transform group-hover:translate-x-0.5"
                          aria-hidden
                        />
                      </span>
                    </div>
                  </Link>
                </Arrival>
              ))}
            </ul>
          )}
        </ArrivalScope>
      </section>

      <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <section aria-label={t('home.cashier.today')} className="flex min-w-0 flex-col gap-2.5">
          <h2 className="flex items-center gap-2 text-sm font-semibold">
            {t('home.cashier.today')}
            <span className="tabular rounded-md bg-muted px-1.5 text-xs leading-5 font-medium text-muted-foreground">
              {props.paid.length}
            </span>
          </h2>
          <div className="overflow-hidden rounded-xl border bg-card shadow-[0_1px_2px_rgb(20_32_29/0.04)]">
            {props.paid.length === 0 ? (
              <p className="px-4 py-10 text-center text-sm text-muted-foreground">{t('home.cashier.noneToday')}</p>
            ) : (
              <>
                <div className="hidden grid-cols-[3rem_minmax(0,1.4fr)_minmax(0,1fr)_7rem_7.5rem_2rem] gap-3 border-b bg-muted/40 px-4 py-2 text-xs font-medium text-muted-foreground md:grid">
                  <span>{t('home.cashier.time')}</span>
                  <span>{t('home.cashier.patient')}</span>
                  <span>{t('home.cashier.invoiceNo')}</span>
                  <span>{t('home.cashier.method')}</span>
                  <span className="text-right">{t('home.cashier.amount')}</span>
                  <span />
                </div>
                <ul>
                  {props.paid.map((invoice) => {
                    const method =
                      invoice.payer_type === 'bpjs' ? null : METHOD_BY_KEY[invoice.payments[0]?.method ?? ''];

                    const Icon = method?.icon ?? ShieldCheckIcon;

                    return (
                      <li
                        key={invoice.id}
                        className="grid grid-cols-[3rem_minmax(0,1fr)_auto_2rem] items-center gap-3 border-b px-4 py-2.5 last:border-0 hover:bg-muted/40 md:grid-cols-[3rem_minmax(0,1.4fr)_minmax(0,1fr)_7rem_7.5rem_2rem]">
                        <span className="tabular text-[0.8125rem] text-muted-foreground">
                          {invoice.paid_at ? formatTime(invoice.paid_at, locale) : ''}
                        </span>
                        <Link href={`/cashier/${invoice.visit?.id}`} className="min-w-0 hover:underline">
                          <span className="block truncate text-sm font-medium">
                            {invoice.visit?.patient?.full_name}
                          </span>
                          <span className="block truncate text-xs text-muted-foreground">
                            {invoice.visit?.poli?.name}
                          </span>
                        </Link>
                        <span className="tabular hidden truncate text-[0.8125rem] text-muted-foreground md:block">
                          {invoice.invoice_no}
                        </span>
                        <span className="hidden md:block">
                          <span
                            className={cn(
                              'inline-flex h-6 items-center gap-1.5 rounded-md px-2 text-xs font-medium',
                              method ? 'bg-muted text-foreground' : 'bg-bpjs-soft text-bpjs',
                            )}>
                            <Icon className="size-3.5" aria-hidden />
                            {method ? t(`paymentMethod.${method.key}`) : t('payer.bpjs')}
                          </span>
                        </span>
                        <span className="tabular text-right text-sm font-semibold">
                          {invoice.payer_type === 'bpjs' ? (
                            <span className="font-normal text-muted-foreground">–</span>
                          ) : (
                            formatRupiah(invoice.total)
                          )}
                        </span>
                        <Link
                          href={`/print/receipt/${invoice.id}`}
                          target="_blank"
                          aria-label={t('home.cashier.printReceiptFor', { number: invoice.invoice_no })}
                          title={t('home.cashier.printReceipt')}
                          className="flex size-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground">
                          <PrinterIcon className="size-4" aria-hidden />
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </>
            )}
          </div>
        </section>

        <aside className="flex flex-col gap-2.5 lg:sticky lg:top-20">
          <h2 className="text-sm font-semibold">{t('home.cashier.methods')}</h2>
          <div className="overflow-hidden rounded-xl border bg-card shadow-[0_1px_2px_rgb(20_32_29/0.04)]">
            <div className="flex flex-col gap-3 p-4">
              <div className="flex h-2.5 gap-0.5 overflow-hidden rounded-full bg-muted" aria-hidden>
                {METHODS.map((method) =>
                  today.byMethod[method.key] > 0 ? (
                    <span
                      key={method.key}
                      className={method.tone}
                      style={{ width: `${(today.byMethod[method.key] / methodTotal) * 100}%` }}
                    />
                  ) : null,
                )}
              </div>
              <ul className="flex flex-col gap-2.5">
                {METHODS.map((method) => (
                  <li key={method.key} className="flex items-center gap-2.5 text-sm">
                    <span className={cn('size-2.5 rounded-sm', method.tone)} aria-hidden />
                    <method.icon className="size-4 text-muted-foreground" aria-hidden />
                    <span className="flex-1">{t(`paymentMethod.${method.key}`)}</span>
                    <span className="tabular text-xs text-muted-foreground">{today.countByMethod[method.key]}×</span>
                    <span className="tabular w-24 text-right font-medium">
                      {formatRupiah(today.byMethod[method.key])}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
            <dl className="grid grid-cols-2 gap-px border-t bg-border">
              <div className="flex flex-col gap-0.5 bg-card px-4 py-3">
                <dt className="text-xs text-muted-foreground">{t('home.cashier.average')}</dt>
                <dd className="text-[0.9375rem] font-semibold">
                  {today.umum > 0 ? formatRupiah(Math.round(today.total / today.umum)) : '–'}
                </dd>
              </div>
              <div className="flex flex-col gap-0.5 bg-card px-4 py-3">
                <dt className="text-xs text-muted-foreground">{t('home.cashier.discounts')}</dt>
                <dd className="text-[0.9375rem] font-semibold">{formatRupiah(today.discounts)}</dd>
              </div>
            </dl>
          </div>
        </aside>
      </div>
    </div>
  );
}
