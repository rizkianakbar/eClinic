import { SkeletonPage } from '@/components/ui/skeleton';
import { SettingsMasterListSkeleton } from '@/features/settings/settings-skeleton';

export default function Loading() {
  return (
    <SkeletonPage route label="Memuat poli">
      <SettingsMasterListSkeleton
        intro={<p className="text-sm text-muted-foreground">Poli dipakai untuk antrean, jadwal dokter, dan laporan.</p>}
        create="Tambah poli"
        rows={4}
        columns={[
          { label: 'Nama', bar: 'w-32' },
          { label: 'Kode BPJS', bar: 'w-14' },
          { label: 'Tarif konsultasi', bar: 'w-40' },
          { label: 'Status', bar: 'w-14' },
          { label: 'Aksi', className: 'text-right', bar: 'w-32' },
        ]}
      />
    </SkeletonPage>
  );
}
