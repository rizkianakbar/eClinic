import { SkeletonPage } from '@/components/ui/skeleton';
import { InventorySearchSkeleton } from '@/features/inventory/inventory-search';
import { SettingsMasterListSkeleton } from '@/features/settings/settings-skeleton';

export default function Loading() {
  return (
    <SkeletonPage route label="Memuat obat">
      <SettingsMasterListSkeleton
        intro={<InventorySearchSkeleton placeholder="Cari nama obat" />}
        importable
        create="Tambah obat"
        rows={10}
        columns={[
          { label: 'Nama', bar: 'w-40' },
          { label: 'Satuan', className: 'hidden md:table-cell', bar: 'w-12' },
          { label: 'Harga jual', className: 'hidden text-right md:table-cell', bar: 'w-16' },
          { label: 'Stok min.', className: 'hidden text-right md:table-cell', bar: 'w-8' },
          { label: 'KFA', className: 'hidden md:table-cell', bar: 'w-16' },
          { label: 'Status', className: 'hidden md:table-cell', bar: 'w-14' },
          { label: 'Aksi', className: 'text-right', bar: 'w-32' },
        ]}
      />
    </SkeletonPage>
  );
}
