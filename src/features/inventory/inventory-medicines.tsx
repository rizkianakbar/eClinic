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
              <TableHead className="hidden md:table-cell">Satuan</TableHead>
              <TableHead className="hidden text-right md:table-cell">Harga jual</TableHead>
              <TableHead className="hidden text-right md:table-cell">Stok min.</TableHead>
              <TableHead className="hidden md:table-cell">KFA</TableHead>
              <TableHead className="hidden md:table-cell">Status</TableHead>
              <TableHead className="text-right">Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {props.medicines.map((medicine) => (
              <TableRow key={medicine.id} className={medicine.is_active ? undefined : 'text-muted-foreground'}>
                <TableCell>
                  <span className="font-medium">{medicine.name}</span>
                  {/* Phones and small tablets: the details fold into one line under the name. */}
                  <span className="tabular block text-[0.8125rem] text-muted-foreground md:hidden">
                    {formatRupiah(medicine.price)} / {medicine.unit} · min {medicine.min_stock}
                    {medicine.kfa_code && ` · KFA ${medicine.kfa_code}`}
                    {!medicine.is_active && ' · nonaktif'}
                  </span>
                </TableCell>
                <TableCell className="hidden md:table-cell">{medicine.unit}</TableCell>
                <TableCell className="hidden text-right md:table-cell">{formatRupiah(medicine.price)}</TableCell>
                <TableCell className="hidden text-right md:table-cell">{medicine.min_stock}</TableCell>
                <TableCell className="hidden md:table-cell">{medicine.kfa_code ?? '-'}</TableCell>
                <TableCell className="hidden md:table-cell">
                  <Badge variant={medicine.is_active ? 'secondary' : 'outline'}>
                    {medicine.is_active ? 'Aktif' : 'Nonaktif'}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex flex-col items-end gap-1 sm:flex-row sm:justify-end">
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
