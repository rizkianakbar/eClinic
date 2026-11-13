import { SkeletonLine, SkeletonPage } from '@/components/ui/skeleton';
import { EXAM_VIEWER_ROLES } from '@/features/exam/exam.constants';
import { ExamSkeleton } from '@/features/exam/exam-skeleton';
import { VisitsJourneyPosition } from '@/features/visits/visits-journey-line';
import { getSession } from '@/lib/auth';

const FACTS = ['Tanggal', 'Didaftarkan', 'Poli', 'Dokter', 'Nomor antrean', 'Pembayaran'];

export default async function Loading() {
  const session = await getSession();

  // Clinical roles are sent on to the exam page: show its outline instead.
  if (session && (EXAM_VIEWER_ROLES as readonly string[]).includes(session.role)) {
    return (
      <SkeletonPage route label="Memuat pemeriksaan">
        <ExamSkeleton />
      </SkeletonPage>
    );
  }

  return (
    <SkeletonPage route label="Memuat kunjungan">
      <div className="flex flex-wrap items-end justify-between gap-x-10 gap-y-5">
        <header className="flex flex-col gap-2">
          <span className="flex h-5 items-center">
            <SkeletonLine className="w-32" />
          </span>
          <div className="flex flex-col gap-1">
            <SkeletonLine size="title" className="w-64" />
            <SkeletonLine className="w-48" />
          </div>
        </header>
        <VisitsJourneyPosition status={null} className="w-full max-w-md" />
      </div>
      <dl className="grid grid-cols-1 gap-x-6 gap-y-4 rounded-xl border bg-card p-5 shadow-[0_1px_2px_rgb(20_32_29/0.04)] sm:grid-cols-2 lg:grid-cols-3">
        {FACTS.map((label) => (
          <div key={label}>
            <dt className="text-xs font-medium text-muted-foreground">{label}</dt>
            <dd className="mt-0.5">
              <SkeletonLine className="w-28" />
            </dd>
          </div>
        ))}
      </dl>
      <p className="text-sm text-muted-foreground">
        Catatan medis (SOAP, diagnosis, resep) hanya dapat dibuka oleh dokter, perawat, dan pemilik klinik.
      </p>
    </SkeletonPage>
  );
}
