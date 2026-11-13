import { SkeletonPage } from '@/components/ui/skeleton';
import { SettingsMasterListSkeleton } from '@/features/settings/settings-skeleton';

export default function Loading() {
  return (
    <SkeletonPage route label="Memuat tarif layanan">
      <SettingsMasterListSkeleton
        intro={
          <p className="text-sm text-muted-foreground">
            Tarif konsultasi dan tindakan. Jasa dokter dipakai untuk laporan jasa medis.
          </p>
        }
        importable
        create="Tambah layanan"
        columns={[
          { label: 'Nama', bar: 'w-44' },
          { label: 'Jenis', className: 'hidden md:table-cell', bar: 'w-20' },
          { label: 'Tarif', className: 'hidden text-right sm:table-cell', bar: 'w-20' },
          { label: 'Jasa dokter', className: 'hidden text-right md:table-cell', bar: 'w-24' },
          { label: 'Status', className: 'hidden md:table-cell', bar: 'w-14' },
          { label: 'Aksi', className: 'text-right', bar: 'w-32' },
        ]}
      />
    </SkeletonPage>
  );
}
