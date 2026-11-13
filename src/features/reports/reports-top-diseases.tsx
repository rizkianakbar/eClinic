import { ActivityIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import type { getTopDiseases } from "./reports.service";

type ReportsTopDiseasesProps = {
  rows: Awaited<ReturnType<typeof getTopDiseases>>;
};

/** Primary diagnoses of non-cancelled visits, most frequent first. */
export function ReportsTopDiseases(props: ReportsTopDiseasesProps) {
  if (props.rows.length === 0) {
    return (
      <div className="flex flex-col items-center gap-1 rounded-xl border border-dashed px-6 py-12 text-center">
        <ActivityIcon className="mb-1 size-6 text-muted-foreground" aria-hidden />
        <p className="text-sm font-medium">Belum ada diagnosis utama pada periode ini</p>
        <p className="text-[0.8125rem] text-muted-foreground">Diagnosis tercatat saat dokter menandatangani rekam medis.</p>
      </div>
    );
  }
  const total = props.rows.reduce((sum, row) => sum + row.cases, 0);
  const top = Math.max(1, props.rows[0].cases);

  return (
    <section className="flex flex-col gap-2.5">
      <div className="flex items-baseline justify-between gap-3">
        <h3 className="text-sm font-semibold">Diagnosis utama terbanyak</h3>
        <span className="text-xs text-muted-foreground">
          <span className="tabular font-semibold text-foreground">{total}</span> kasus dari 10 besar
        </span>
      </div>
      <ol className="overflow-hidden rounded-xl border bg-card shadow-[0_1px_2px_rgb(20_32_29/0.04)]">
        {props.rows.map((row, index) => (
          <li
            key={row.icd10_code}
            className="grid grid-cols-[2rem_minmax(0,1fr)_auto] items-center gap-x-4 gap-y-2 border-b px-5 py-3.5 last:border-0 md:grid-cols-[2rem_minmax(0,22rem)_minmax(0,1fr)_6rem]"
          >
            <span
              className={cn(
                "numeral flex size-8 items-center justify-center rounded-lg text-sm",
                index < 3 ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground",
              )}
            >
              {index + 1}
            </span>
            <span className="flex min-w-0 items-baseline gap-2">
              <span className="tabular shrink-0 rounded-md bg-muted px-1.5 text-xs leading-5 font-semibold">{row.icd10_code}</span>
              <span className="truncate text-sm font-medium" title={row.name}>
                {row.name}
              </span>
            </span>
            <span className="col-span-3 row-start-2 h-2 overflow-hidden rounded-full bg-muted md:col-span-1 md:row-start-auto">
              <span className="block h-full rounded-full bg-primary/70" style={{ width: `${(row.cases / top) * 100}%` }} />
            </span>
            <span className="text-right">
              <span className="numeral text-lg">{row.cases}</span>
              <span className="tabular ml-1 text-xs text-muted-foreground">{Math.round((row.cases / total) * 100)}%</span>
            </span>
          </li>
        ))}
      </ol>
    </section>
  );
}
