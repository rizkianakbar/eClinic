import { CakeIcon, UserPlusIcon } from "lucide-react";
import Link from "next/link";
import { relativeDay, toJakartaDate } from "@/lib/dates";
import { cn } from "@/lib/utils";
import { AGE_GROUPS, initials, type PatientStats } from "./patients.lib";

type PatientsCompositionProps = {
  stats: PatientStats;
  today: string;
};

const percent = (part: number, total: number) => (total > 0 ? Math.round((part / total) * 100) : 0);

/** Who the clinic's patients are, whose birthday it is, and who is new. */
export function PatientsComposition(props: PatientsCompositionProps) {
  const { stats } = props;
  const largestAge = Math.max(1, ...Object.values(stats.ages));

  return (
    <aside className="flex flex-col gap-6 lg:sticky lg:top-20">
      <section className="flex flex-col gap-2.5">
        <h2 className="text-sm font-semibold">Komposisi pasien</h2>
        <div className="flex flex-col divide-y rounded-xl border bg-card shadow-[0_1px_2px_rgb(20_32_29/0.04)]">
          <Split
            title="Jenis kelamin"
            left={{ label: "Laki-laki", value: stats.male, tone: "bg-[#3a7bd5]" }}
            right={{ label: "Perempuan", value: stats.female, tone: "bg-[#d4588a]" }}
          />
          <Split
            title="Pembayaran"
            left={{ label: "BPJS", value: stats.bpjs, tone: "bg-bpjs" }}
            right={{ label: "Umum", value: stats.total - stats.bpjs, tone: "bg-primary" }}
          />
          <div className="flex flex-col gap-2.5 p-4">
            <p className="text-xs font-medium text-muted-foreground">Kelompok umur</p>
            <ul className="flex flex-col gap-2">
              {AGE_GROUPS.map((group) => {
                const count = stats.ages[group.key];
                return (
                  <li key={group.key} className="grid grid-cols-[8rem_minmax(0,1fr)_2rem] items-center gap-2 text-[0.8125rem]">
                    <span className="truncate">
                      {group.label} <span className="text-xs text-muted-foreground">{group.range}</span>
                    </span>
                    <span className="h-1.5 overflow-hidden rounded-full bg-muted">
                      <span className="block h-full rounded-full bg-primary/70" style={{ width: `${(count / largestAge) * 100}%` }} />
                    </span>
                    <span className="tabular text-right font-medium">{count}</span>
                  </li>
                );
              })}
            </ul>
          </div>
        </div>
      </section>

      <section className="flex flex-col gap-2.5">
        <h2 className="flex items-center gap-2 text-sm font-semibold">
          <CakeIcon className="size-4 text-[#d4588a]" aria-hidden />
          Ulang tahun hari ini
          <span className="tabular rounded-md bg-muted px-1.5 text-xs leading-5 font-medium text-muted-foreground">{stats.birthdays.length}</span>
        </h2>
        <div className="rounded-xl border bg-card shadow-[0_1px_2px_rgb(20_32_29/0.04)]">
          {stats.birthdays.length === 0 ? (
            <p className="px-4 py-4 text-[0.8125rem] text-muted-foreground">Tidak ada pasien yang berulang tahun hari ini.</p>
          ) : (
            <ul>
              {stats.birthdays.map((patient) => (
                <PersonRow key={patient.id} id={patient.id} name={patient.full_name} detail={`${patient.age} tahun hari ini`} />
              ))}
            </ul>
          )}
        </div>
      </section>

      <section className="flex flex-col gap-2.5">
        <h2 className="flex items-center gap-2 text-sm font-semibold">
          <UserPlusIcon className="size-4 text-primary" aria-hidden />
          Pasien baru 7 hari terakhir
        </h2>
        <div className="rounded-xl border bg-card shadow-[0_1px_2px_rgb(20_32_29/0.04)]">
          {stats.recent.length === 0 ? (
            <p className="px-4 py-4 text-[0.8125rem] text-muted-foreground">Belum ada pasien baru minggu ini.</p>
          ) : (
            <ul>
              {stats.recent.map((patient) => (
                <PersonRow
                  key={patient.id}
                  id={patient.id}
                  name={patient.full_name}
                  detail={`Terdaftar ${relativeDay(toJakartaDate(new Date(patient.created_at)), props.today).toLowerCase()}`}
                />
              ))}
            </ul>
          )}
        </div>
      </section>
    </aside>
  );
}

type Part = { label: string; value: number; tone: string };

type SplitProps = {
  title: string;
  left: Part;
  right: Part;
};

/** Two parts of a whole as one bar, with counts and shares under it. */
function Split(props: SplitProps) {
  const total = props.left.value + props.right.value;
  const leftShare = percent(props.left.value, total);
  return (
    <div className="flex flex-col gap-2.5 p-4">
      <p className="text-xs font-medium text-muted-foreground">{props.title}</p>
      <div className="flex h-2 gap-0.5 overflow-hidden rounded-full bg-muted">
        {total > 0 && (
          <>
            <span className={cn("rounded-l-full", props.left.tone)} style={{ width: `${leftShare}%` }} />
            <span className={cn("flex-1 rounded-r-full", props.right.tone)} />
          </>
        )}
      </div>
      <div className="flex justify-between text-[0.8125rem]">
        {[props.left, props.right].map((part) => (
          <span key={part.label} className="flex items-center gap-1.5">
            <span className={cn("size-2 rounded-full", part.tone)} aria-hidden />
            {part.label}
            <span className="tabular font-semibold">{part.value}</span>
            <span className="tabular text-xs text-muted-foreground">{percent(part.value, total)}%</span>
          </span>
        ))}
      </div>
    </div>
  );
}

type PersonRowProps = {
  id: string;
  name: string;
  detail: string;
};

function PersonRow(props: PersonRowProps) {
  return (
    <li className="border-b last:border-0">
      <Link href={`/patients/${props.id}`} className="flex items-center gap-3 px-4 py-2.5 hover:bg-muted/50">
        <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-secondary text-[0.6875rem] font-semibold text-secondary-foreground">
          {initials(props.name)}
        </span>
        <span className="min-w-0">
          <span className="block truncate text-sm font-medium">{props.name}</span>
          <span className="block text-xs text-muted-foreground">{props.detail}</span>
        </span>
      </Link>
    </li>
  );
}
