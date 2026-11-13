import { BoxesIcon, CircleCheckIcon, PrinterIcon, XCircleIcon } from 'lucide-react';
import Link from 'next/link';
import { useLocale, useTranslations } from 'next-intl';
import { buttonVariants } from '@/components/ui/button';
import { formatDate, formatDateTime } from '@/lib/dates';
import { cn } from '@/lib/utils';
import type { DrugLabel } from './pharmacy.lib';
import type { getDispensation } from './pharmacy.service';
import type { DispenseLine } from './pharmacy-dispense-form';

type PharmacyDispensedProps = {
  visitId: string;
  lines: Pick<DispenseLine, 'id' | 'compound' | 'name' | 'qty' | 'unit' | 'signa'>[];
  dispensation: NonNullable<Awaited<ReturnType<typeof getDispensation>>>;
  labels: DrugLabel[];
  patientName: string;
};

/** After dispensing: who handed it over, the labels to print (previewed), and what came from which batch. */
export function PharmacyDispensed(props: PharmacyDispensedProps) {
  const { dispensation } = props;
  const t = useTranslations();
  const locale = useLocale();

  const givenCount = props.lines.filter((line) =>
    dispensation.items.some((item) => item.prescription_item_id === line.id && item.status === 'given'),
  ).length;

  return (
    <div className="grid grid-cols-1 items-start gap-6 xl:grid-cols-[minmax(0,1fr)_22rem]">
      <div className="flex min-w-0 flex-col gap-4">
        <section className="flex flex-wrap items-center gap-4 rounded-2xl border border-primary/25 bg-secondary/50 px-5 py-4">
          <span className="flex size-10 items-center justify-center rounded-full bg-primary text-primary-foreground">
            <CircleCheckIcon className="size-5" aria-hidden />
          </span>
          <div className="min-w-0 flex-1">
            <p className="font-semibold">{t('pharmacy.done.title')}</p>
            <p className="text-sm text-muted-foreground">
              {t('pharmacy.done.by', {
                given: givenCount,
                total: props.lines.length,
                name: dispensation.dispenser?.full_name ?? '',
                when: formatDateTime(dispensation.dispensed_at, locale),
              })}
            </p>
          </div>
          <Link href={`/print/drug-labels/${props.visitId}`} target="_blank" className={buttonVariants({ size: 'lg' })}>
            <PrinterIcon />
            {t('pharmacy.done.print', { count: props.labels.length })}
          </Link>
        </section>

        <section className="overflow-hidden rounded-2xl border bg-card shadow-[0_1px_2px_rgb(20_32_29/0.04)]">
          <header className="border-b px-4 py-3">
            <h2 className="text-[0.9375rem] font-semibold">{t('pharmacy.done.details')}</h2>
            <p className="text-xs text-muted-foreground">{t('pharmacy.done.detailsHint')}</p>
          </header>
          <ol className="divide-y">
            {props.lines.map((line) => {
              const rows = dispensation.items.filter((item) => item.prescription_item_id === line.id);
              const notGiven = rows.find((item) => item.status === 'not_given');

              return (
                <li key={line.id} className={cn('flex items-start gap-3 px-4 py-3', notGiven && 'bg-muted/40')}>
                  {notGiven ? (
                    <XCircleIcon className="mt-0.5 size-4 shrink-0 text-status-cancelled" aria-hidden />
                  ) : (
                    <CircleCheckIcon className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />
                  )}
                  <div className="min-w-0 flex-1">
                    {line.compound && (
                      <p className="text-xs font-medium text-muted-foreground">
                        {t('pharmacy.compoundGroup', {
                          form: t(`compoundForm.${line.compound.form as 'puyer' | 'kapsul'}`),
                        })}{' '}
                        · {line.compound.quantity} · {line.compound.signa}
                      </p>
                    )}
                    <p className={cn('text-sm font-medium', notGiven && 'text-muted-foreground line-through')}>
                      {line.name}{' '}
                      <span className="tabular font-normal text-muted-foreground">
                        {line.qty} {line.unit}
                      </span>
                    </p>
                    {notGiven ? (
                      <p className="text-[0.8125rem] text-status-cancelled">
                        {t('pharmacy.done.notGiven', { reason: notGiven.not_given_reason ?? '' })}
                      </p>
                    ) : (
                      <p className="flex flex-wrap gap-x-3 text-[0.8125rem] text-muted-foreground">
                        {rows.map((item) => (
                          <span key={item.id} className="inline-flex items-center gap-1">
                            <BoxesIcon className="size-3.5" aria-hidden />
                            {t('pharmacy.form.batch')}{' '}
                            <span className="tabular font-medium text-foreground">{item.batch?.batch_no}</span>
                            <span className="tabular">
                              {t('pharmacy.form.expiry', {
                                date: item.batch ? formatDate(item.batch.expiry_date, locale) : '-',
                              })}
                            </span>
                            <span className="tabular">× {item.qty}</span>
                          </span>
                        ))}
                      </p>
                    )}
                  </div>
                </li>
              );
            })}
          </ol>
        </section>
      </div>

      <aside className="flex flex-col gap-3 xl:sticky xl:top-19">
        <h2 className="text-sm font-semibold">{t('pharmacy.done.preview')}</h2>
        {locale === 'en' && <p className="-mt-2 text-xs text-muted-foreground">{t('pharmacy.done.previewNote')}</p>}
        {props.labels.length === 0 ? (
          <p className="rounded-xl border border-dashed px-4 py-6 text-center text-sm text-muted-foreground">
            {t('pharmacy.done.noneGiven')}
          </p>
        ) : (
          <div className="flex flex-col gap-2">
            {props.labels.map((label) => (
              <div
                key={label.id}
                className="rounded-lg border border-dashed border-black/25 bg-white px-3 py-2.5 font-mono text-[0.75rem] leading-snug text-black">
                <p className="truncate text-[0.6875rem] text-black/60">{props.patientName}</p>
                <p className="font-bold">{label.title}</p>
                <p>{label.amount}</p>
                <p className="mt-1 border-t border-dashed border-black/20 pt-1 text-center text-[0.875rem] font-bold">
                  {label.signa}
                </p>
              </div>
            ))}
          </div>
        )}
      </aside>
    </div>
  );
}
