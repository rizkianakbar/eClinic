import { HandCoinsIcon } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { ROLE_LABELS } from '@/features/auth/auth.constants';
import { initials } from '@/features/patients/patients.lib';
import type { Role } from '@/lib/auth';
import { formatRupiah } from '@/lib/money';
import type { getDoctorFees } from './reports.service';
import { ReportsKpis } from './reports-kpis';

const isRole = (role: string): role is Role => Object.hasOwn(ROLE_LABELS, role);

type ReportsDoctorFeesProps = {
  fees: Awaited<ReturnType<typeof getDoctorFees>>;
};

/** Jasa medis per doctor/nurse from the fee stored on each paid invoice line (umum and BPJS). */
export function ReportsDoctorFees(props: ReportsDoctorFeesProps) {
  const t = useTranslations();

  if (props.fees.length === 0) {
    return (
      <div className="flex flex-col items-center gap-1 rounded-xl border border-dashed px-6 py-12 text-center">
        <HandCoinsIcon className="mb-1 size-6 text-muted-foreground" aria-hidden />
        <p className="text-sm font-medium">{t('reports.fees.empty')}</p>
        <p className="text-[0.8125rem] text-muted-foreground">{t('reports.fees.emptyHint')}</p>
      </div>
    );
  }

  const rows = [...props.fees].sort((a, b) => b.fee - a.fee);
  const total = rows.reduce((sum, row) => sum + row.fee, 0);
  const billed = rows.reduce((sum, row) => sum + row.billed, 0);
  const top = Math.max(1, rows[0].fee);

  return (
    <div className="flex flex-col gap-6">
      <ReportsKpis
        items={[
          { label: t('reports.fees.total'), value: formatRupiah(total), hint: t('reports.fees.totalHint') },
          { label: t('reports.fees.billed'), value: formatRupiah(billed), hint: t('reports.fees.billedHint') },
          {
            label: t('reports.fees.share'),
            value: `${billed > 0 ? Math.round((total / billed) * 100) : 0}%`,
            hint: t('reports.fees.shareHint'),
          },
        ]}
      />

      <section className="flex flex-col gap-2.5">
        <h3 className="text-sm font-semibold">{t('reports.fees.perPerson')}</h3>
        <ul className="overflow-hidden rounded-xl border bg-card shadow-[0_1px_2px_rgb(20_32_29/0.04)]">
          {rows.map((row) => (
            <li
              key={row.recipient_id}
              className="grid grid-cols-[2.5rem_minmax(0,1fr)_auto] items-center gap-x-4 gap-y-2 border-b px-5 py-4 last:border-0 md:grid-cols-[2.5rem_minmax(0,14rem)_minmax(0,1fr)_8rem_9rem]">
              <span className="flex size-10 items-center justify-center rounded-full bg-secondary text-xs font-semibold text-secondary-foreground">
                {initials(row.recipient_name)}
              </span>
              <span className="min-w-0">
                <span className="block truncate text-sm font-medium">{row.recipient_name}</span>
                <span className="block text-xs text-muted-foreground">
                  {isRole(row.recipient_role) ? t(`roles.${row.recipient_role}`) : row.recipient_role} ·{' '}
                  {t('reports.fees.lines', { count: row.lines })}
                </span>
              </span>
              <span className="col-span-3 row-start-2 flex items-center gap-2 md:col-span-1 md:row-start-auto">
                <span className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
                  <span
                    className="block h-full rounded-full bg-primary/70"
                    style={{ width: `${(row.fee / top) * 100}%` }}
                  />
                </span>
                <span className="tabular w-9 text-right text-xs text-muted-foreground">
                  {Math.round((row.fee / total) * 100)}%
                </span>
              </span>
              <span className="tabular hidden text-right text-[0.8125rem] text-muted-foreground md:block">
                <span className="block text-xs">{t('reports.fees.billedShort')}</span>
                {formatRupiah(row.billed)}
              </span>
              <span className="tabular text-right text-sm font-semibold">{formatRupiah(row.fee)}</span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
