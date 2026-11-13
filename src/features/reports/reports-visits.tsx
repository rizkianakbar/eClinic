import { UsersIcon } from 'lucide-react';
import { initials } from '@/features/patients/patients.lib';
import type { getVisitReport } from './reports.service';
import { ReportsKpis } from './reports-kpis';

type ReportsVisitsProps = {
  rows: Awaited<ReturnType<typeof getVisitReport>>;
  /** Number of days in the period, for the daily average. */
  days: number;
};

const percent = (part: number, total: number) => (total > 0 ? Math.round((part / total) * 100) : 0);

/** Visits per poli and doctor; "baru" = the patient's first non-cancelled visit ever. */
export function ReportsVisits(props: ReportsVisitsProps) {
  if (props.rows.length === 0) {
    return (
      <div className="flex flex-col items-center gap-1 rounded-xl border border-dashed px-6 py-12 text-center">
        <UsersIcon className="mb-1 size-6 text-muted-foreground" aria-hidden />
        <p className="text-sm font-medium">Tidak ada kunjungan pada periode ini</p>
      </div>
    );
  }

  const total = props.rows.reduce(
    (sum, row) => ({
      visits: sum.visits + row.visits,
      fresh: sum.fresh + row.new_patients,
      back: sum.back + row.returning_patients,
    }),
    { visits: 0, fresh: 0, back: 0 },
  );

  const rows = [...props.rows].sort((a, b) => b.visits - a.visits);
  const top = Math.max(1, rows[0].visits);

  return (
    <div className="flex flex-col gap-6">
      <ReportsKpis
        items={[
          { label: 'Kunjungan', value: String(total.visits), hint: 'Tidak termasuk yang batal' },
          {
            label: 'Pasien baru',
            value: String(total.fresh),
            hint: `${percent(total.fresh, total.visits)}% dari kunjungan`,
          },
          {
            label: 'Pasien lama',
            value: String(total.back),
            hint: `${percent(total.back, total.visits)}% kembali berobat`,
          },
          {
            label: 'Rata-rata per hari',
            value: (total.visits / Math.max(1, props.days)).toLocaleString('id-ID', { maximumFractionDigits: 1 }),
            hint: `${props.days} hari`,
          },
        ]}
      />

      <section className="flex flex-col gap-2.5">
        <div className="flex flex-wrap items-baseline justify-between gap-3">
          <h3 className="text-sm font-semibold">Per dokter dan poli</h3>
          <span className="flex items-center gap-4 text-xs text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <span className="size-2.5 rounded-sm bg-primary" aria-hidden />
              Baru
            </span>
            <span className="flex items-center gap-1.5">
              <span className="size-2.5 rounded-sm bg-primary/30" aria-hidden />
              Lama
            </span>
          </span>
        </div>
        <ul className="overflow-hidden rounded-xl border bg-card shadow-[0_1px_2px_rgb(20_32_29/0.04)]">
          {rows.map((row) => (
            <li
              key={`${row.poli_name}-${row.doctor_name}`}
              className="grid grid-cols-[2.5rem_minmax(0,1fr)_auto] items-center gap-x-4 gap-y-2 border-b px-5 py-4 last:border-0 md:grid-cols-[2.5rem_minmax(0,14rem)_minmax(0,1fr)_7rem]">
              <span className="flex size-10 items-center justify-center rounded-full bg-secondary text-xs font-semibold text-secondary-foreground">
                {initials(row.doctor_name)}
              </span>
              <span className="min-w-0">
                <span className="block truncate text-sm font-medium">{row.doctor_name}</span>
                <span className="block truncate text-xs text-muted-foreground">{row.poli_name}</span>
              </span>
              <span className="col-span-3 row-start-2 md:col-span-1 md:row-start-auto">
                <span
                  className="flex h-2.5 overflow-hidden rounded-full bg-muted"
                  style={{ width: `${(row.visits / top) * 100}%` }}>
                  <span
                    className="bg-primary"
                    style={{ width: `${percent(row.new_patients, row.visits)}%` }}
                    title={`${row.new_patients} baru`}
                  />
                  <span className="flex-1 bg-primary/30" title={`${row.returning_patients} lama`} />
                </span>
              </span>
              <span className="text-right">
                <span className="numeral block text-lg">{row.visits}</span>
                <span className="tabular block text-xs text-muted-foreground">
                  {row.new_patients} baru · {row.returning_patients} lama
                </span>
              </span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
