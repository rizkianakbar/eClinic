import {
  ChevronLeftIcon,
  FileTextIcon,
  HeartPulseIcon,
  HistoryIcon,
  ListChecksIcon,
  type LucideIcon,
  NotebookPenIcon,
  PillIcon,
  StethoscopeIcon,
  SyringeIcon,
} from 'lucide-react';
import Link from 'next/link';
import type { ReactNode } from 'react';
import { placeholders, Skeleton, SkeletonButton, SkeletonLine } from '@/components/ui/skeleton';
import { VisitsJourneyPosition } from '@/features/visits/visits-journey-line';
import { SOAP_FIELDS } from './exam.constants';
import { ExamSection } from './exam-section';

const VITALS = ['Tekanan darah', 'Nadi', 'Suhu', 'Napas', 'SpO₂', 'Berat', 'Tinggi', 'IMT'];

const CHECKLIST = [
  ['Catatan SOAP', true],
  ['Diagnosis utama', true],
  ['Resep atau tanpa obat', true],
  ['Tindakan', false],
  ['Surat', false],
  ['Tanda tangan', true],
] as const;

/** The exam page while it loads: patient card, the five sections with their real titles, and the side rail. */
export function ExamSkeleton() {
  return (
    <div className="flex flex-col gap-6">
      <Link
        href="/queue"
        className="-mb-2 -ml-1 -my-1.5 inline-flex w-fit items-center gap-0.5 rounded-md px-1 py-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground">
        <ChevronLeftIcon className="size-4" aria-hidden />
        Antrean
      </Link>
      <header className="flex flex-wrap items-center justify-between gap-x-10 gap-y-5 rounded-2xl border bg-card px-5 py-4 shadow-[0_1px_2px_rgb(20_32_29/0.04)]">
        <div className="flex min-w-0 items-center gap-4">
          <Skeleton className="size-14 shrink-0 rounded-full" />
          <div className="flex min-w-0 flex-col">
            <span className="flex h-7 items-center gap-2">
              <Skeleton className="h-5 w-52 rounded" />
              <Skeleton className="h-5 w-12 rounded-md" />
            </span>
            <span className="mt-0.5">
              <SkeletonLine className="w-80" />
            </span>
          </div>
        </div>
        <VisitsJourneyPosition status={null} className="w-full max-w-md" />
      </header>

      <div className="grid grid-cols-1 items-start gap-6 xl:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="flex min-w-0 flex-col gap-4">
          <ExamSection
            id="soap"
            icon={NotebookPenIcon}
            title="Catatan SOAP"
            description="Wajib diisi sebelum tanda tangan. Ctrl+S menyimpan draf."
            flush>
            {SOAP_FIELDS.map((field) => (
              <div key={field.name} className="grid grid-cols-[2.75rem_minmax(0,1fr)] border-b last:border-0">
                <div className="flex justify-center border-r bg-muted/40 pt-3">
                  <span className="numeral text-[1.125rem] text-primary" aria-hidden>
                    {field.letter}
                  </span>
                </div>
                <div className="flex min-w-0 flex-col px-3 pt-2.5 pb-2">
                  <span className="flex items-baseline gap-2 text-xs">
                    <span className="font-semibold text-foreground">{field.label}</span>
                    <span className="text-muted-foreground">{field.hint}</span>
                  </span>
                  <div className="flex min-h-14 flex-col gap-1.5 py-2">
                    <Skeleton className="h-3 w-3/4 rounded" />
                  </div>
                </div>
              </div>
            ))}
          </ExamSection>
          <ExamSection
            id="diagnosis"
            icon={StethoscopeIcon}
            title="Diagnosis"
            description="ICD-10. Tandai satu sebagai diagnosis utama.">
            <Skeleton className="h-9 rounded-lg" />
          </ExamSection>
          <ExamSection
            id="resep"
            icon={PillIcon}
            title="Resep"
            description='Wajib: tambahkan obat, atau pilih "Tidak perlu obat" dengan alasannya.'>
            <div className="flex flex-col gap-2">
              <Skeleton className="h-9 rounded-lg" />
              <SkeletonButton size="sm" className="w-36" />
            </div>
          </ExamSection>
          <ExamSection
            id="tindakan"
            icon={SyringeIcon}
            title="Tindakan dan bahan habis pakai"
            description="Opsional. Masuk tagihan otomatis; bahan diambil dari stok saat tanda tangan.">
            <Skeleton className="h-9 rounded-lg" />
          </ExamSection>
          <ExamSection
            id="surat"
            icon={FileTextIcon}
            title="Surat"
            description="Surat sakit dan rujukan, dicetak dengan kop klinik.">
            <div className="flex gap-2">
              <SkeletonButton size="sm" className="w-28" />
              <SkeletonButton size="sm" className="w-32" />
            </div>
          </ExamSection>
        </div>

        <aside className="flex flex-col gap-4 xl:sticky xl:top-19">
          <RailCardSkeleton title="Tanda vital" icon={HeartPulseIcon}>
            <div className="flex flex-col gap-3">
              <dl className="grid grid-cols-2 gap-2">
                {VITALS.map((label) => (
                  <div key={label} className="flex flex-col gap-1 rounded-lg border bg-muted/40 px-3 py-2">
                    <dt className="text-xs font-medium text-muted-foreground">{label}</dt>
                    <dd className="flex h-6 items-center">
                      <Skeleton className="h-4 w-14 rounded" />
                    </dd>
                  </div>
                ))}
              </dl>
              <SkeletonLine className="w-36" />
            </div>
          </RailCardSkeleton>
          <RailCardSkeleton title="Kelengkapan" icon={ListChecksIcon}>
            <ol className="flex flex-col gap-0.5">
              {CHECKLIST.map(([label, required]) => (
                <li key={label} className="flex items-center gap-2.5 rounded-lg px-2 py-1.5 text-sm">
                  <span
                    className={
                      required
                        ? 'size-5 rounded-full border-2 border-input'
                        : 'size-5 rounded-full border-2 border-dashed border-input'
                    }
                    aria-hidden
                  />
                  <span className="flex-1 text-muted-foreground">{label}</span>
                  {!required && <span className="text-xs text-muted-foreground/70">opsional</span>}
                </li>
              ))}
            </ol>
          </RailCardSkeleton>
          <RailCardSkeleton title="Kunjungan sebelumnya" icon={HistoryIcon}>
            <ExamHistorySkeleton />
          </RailCardSkeleton>
        </aside>
      </div>
    </div>
  );
}

/** The previous-visits timeline in the rail (ExamHistory), while it streams in. */
export function ExamHistorySkeleton() {
  return (
    <ol className="relative flex flex-col gap-5 border-l pl-5">
      {placeholders(2).map((key) => (
        <li key={key} className="relative">
          <span
            className="absolute top-1.5 -left-6.75 size-2.5 rounded-full border-2 border-card bg-input"
            aria-hidden
          />
          <SkeletonLine className="w-28" />
          <span className="mb-2 block">
            <SkeletonLine className="w-40" />
          </span>
          <div className="flex flex-col gap-1.5 rounded-lg bg-muted/50 p-3">
            <SkeletonLine className="w-44" />
            <SkeletonLine className="w-36" />
          </div>
        </li>
      ))}
    </ol>
  );
}

type RailCardSkeletonProps = {
  title: string;
  icon: LucideIcon;
  children: ReactNode;
};

function RailCardSkeleton(props: RailCardSkeletonProps) {
  const Icon = props.icon;

  return (
    <section className="rounded-2xl border bg-card p-4 shadow-[0_1px_2px_rgb(20_32_29/0.04)]">
      <header className="mb-3 flex min-h-7 items-center justify-between gap-2">
        <h2 className="flex items-center gap-2 text-sm font-semibold">
          <Icon className="size-4 text-primary" aria-hidden />
          {props.title}
        </h2>
      </header>
      {props.children}
    </section>
  );
}
