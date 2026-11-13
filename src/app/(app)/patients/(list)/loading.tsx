import { HistoryIcon, UsersIcon } from 'lucide-react';
import { SegmentedSkeleton } from '@/components/ui/segmented-skeleton';
import { SkeletonPage } from '@/components/ui/skeleton';
import {
  PatientsCompositionSkeleton,
  PatientsListSkeleton,
  PatientsTotalsSkeleton,
} from '@/features/patients/patients-skeleton';

export default function Loading() {
  return (
    <SkeletonPage route label="Memuat pasien">
      <header className="flex flex-wrap items-end justify-between gap-x-6 gap-y-4">
        <div className="flex flex-col gap-0.5">
          <h1 className="text-[1.5rem] leading-tight font-semibold tracking-tight">Pasien</h1>
          <p className="text-sm text-muted-foreground">
            Semua pasien yang pernah terdaftar. Buka satu untuk melihat data dan riwayatnya.
          </p>
        </div>
        <PatientsTotalsSkeleton />
      </header>
      <SegmentedSkeleton
        options={[
          <>
            <UsersIcon aria-hidden />
            Daftar pasien
          </>,
          <>
            <HistoryIcon aria-hidden />
            Riwayat kunjungan
          </>,
        ]}
      />
      <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <PatientsListSkeleton />
        <PatientsCompositionSkeleton />
      </div>
    </SkeletonPage>
  );
}
