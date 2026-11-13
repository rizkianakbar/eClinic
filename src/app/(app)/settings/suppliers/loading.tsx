import { SkeletonPage } from '@/components/ui/skeleton';
import { SettingsMasterListSkeleton } from '@/features/settings/settings-skeleton';

export default function Loading() {
  return (
    <SkeletonPage route label="Memuat supplier">
      <SettingsMasterListSkeleton
        intro={<p className="text-sm text-muted-foreground">Supplier dipakai saat mencatat pembelian obat.</p>}
        importable
        create="Tambah supplier"
        rows={4}
        columns={[
          { label: 'Nama', bar: 'w-40' },
          { label: 'Telepon', className: 'hidden md:table-cell', bar: 'w-28' },
          { label: 'Alamat', className: 'hidden md:table-cell', bar: 'w-48' },
          { label: 'Status', className: 'hidden md:table-cell', bar: 'w-14' },
          { label: 'Aksi', className: 'text-right', bar: 'w-32' },
        ]}
      />
    </SkeletonPage>
  );
}
