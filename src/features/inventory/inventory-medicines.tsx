import { useTranslations } from 'next-intl';
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
  const t = useTranslations('inventory');
  const tc = useTranslations('common');

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <InventorySearch query={props.query} placeholder={t('searchMedicine')} />
        <div className="flex gap-2">
          <DataImportDialog kind="medicines" />
          <InventoryMedicineDialog mode="create" />
        </div>
      </div>

      {props.medicines.length === 0 ? (
        <p className="rounded-lg border p-4 text-sm text-muted-foreground">
          {props.query ? t('medicines.notFound') : t('medicines.empty')}
        </p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t('medicines.colName')}</TableHead>
              <TableHead className="hidden md:table-cell">{t('medicines.colUnit')}</TableHead>
              <TableHead className="hidden text-right md:table-cell">{t('medicines.colPrice')}</TableHead>
              <TableHead className="hidden text-right md:table-cell">{t('medicines.colMin')}</TableHead>
              <TableHead className="hidden md:table-cell">{t('medicines.colKfa')}</TableHead>
              <TableHead className="hidden md:table-cell">{t('medicines.colStatus')}</TableHead>
              <TableHead className="text-right">{t('medicines.colActions')}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {props.medicines.map((medicine) => (
              <TableRow key={medicine.id} className={medicine.is_active ? undefined : 'text-muted-foreground'}>
                <TableCell>
                  <span className="font-medium">{medicine.name}</span>
                  {/* Phones and small tablets: the details fold into one line under the name. */}
                  <span className="tabular block text-[0.8125rem] text-muted-foreground md:hidden">
                    {formatRupiah(medicine.price)} / {medicine.unit} ·{' '}
                    {t('medicines.minShort', { min: medicine.min_stock })}
                    {medicine.kfa_code && ` · ${t('medicines.kfaShort', { code: medicine.kfa_code })}`}
                    {!medicine.is_active && ` · ${t('medicines.inactiveShort')}`}
                  </span>
                </TableCell>
                <TableCell className="hidden md:table-cell">{medicine.unit}</TableCell>
                <TableCell className="hidden text-right md:table-cell">{formatRupiah(medicine.price)}</TableCell>
                <TableCell className="hidden text-right md:table-cell">{medicine.min_stock}</TableCell>
                <TableCell className="hidden md:table-cell">{medicine.kfa_code ?? '-'}</TableCell>
                <TableCell className="hidden md:table-cell">
                  <Badge variant={medicine.is_active ? 'secondary' : 'outline'}>
                    {medicine.is_active ? tc('active') : tc('inactive')}
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
                      consequence={t('medicines.deactivateConsequence')}
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
        countLabel={t('medicineCount', { count: props.total })}
      />
    </div>
  );
}
