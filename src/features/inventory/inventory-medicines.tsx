import { Badge } from '@/components/ui/badge';
import { PageLinks } from '@/components/ui/page-links';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { DataImportDialog } from '@/features/data-import/data-import-dialog';
import { SettingsActiveToggle } from '@/features/settings/settings-active-toggle';
import { formatRupiah } from '@/lib/money';
import { setMedicineActiveAction } from './inventory.actions';
import { MEDICINES_PAGE_SIZE } from './inventory.lib';
import type { listMedicines } from './inventory.service';
import { InventoryMedicineDialog } from './inventory-medicine-dialog';
import { InventorySearch } from './inventory-search';

type InventoryMedicinesProps = Awaited<ReturnType<typeof listMedicines>> & {
  query: string;
  page: number;
};

export function InventoryMedicines(props: InventoryMedicinesProps) {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <InventorySearch query={props.query} placeholder="Cari nama obat" />
        <div className="flex gap-2">
          <DataImportDialog kind="medicines" />
          <InventoryMedicineDialog mode="create" />
        </div>
      </div>

      {props.medicines.length === 0 ? (
        <p className="rounded-lg border p-4 text-sm text-muted-foreground">
          {props.query ? 'Obat tidak ditemukan.' : 'Belum ada obat. Tambahkan obat pertama.'}
        </p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nama</TableHead>
              <TableHead>Satuan</TableHead>
              <TableHead className="text-right">Harga jual</TableHead>
              <TableHead className="text-right">Stok min.</TableHead>
              <TableHead>KFA</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {props.medicines.map((medicine) => (
              <TableRow key={medicine.id} className={medicine.is_active ? undefined : 'text-muted-foreground'}>
                <TableCell className="font-medium">{medicine.name}</TableCell>
                <TableCell>{medicine.unit}</TableCell>
                <TableCell className="text-right">{formatRupiah(medicine.price)}</TableCell>
                <TableCell className="text-right">{medicine.min_stock}</TableCell>
                <TableCell>{medicine.kfa_code ?? '-'}</TableCell>
                <TableCell>
                  <Badge variant={medicine.is_active ? 'secondary' : 'outline'}>
                    {medicine.is_active ? 'Aktif' : 'Nonaktif'}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-1">
                    <InventoryMedicineDialog mode="edit" medicine={medicine} />
                    <SettingsActiveToggle
                      id={medicine.id}
                      isActive={medicine.is_active}
                      action={setMedicineActiveAction}
                      name={medicine.name}
                      consequence="Obat ini tidak bisa diresepkan atau dibeli lagi."
                    />
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      <PageLinks
        page={props.page}
        pageSize={MEDICINES_PAGE_SIZE}
        total={props.total}
        params={props.query ? { q: props.query } : undefined}
        noun="obat"
      />
    </div>
  );
}
