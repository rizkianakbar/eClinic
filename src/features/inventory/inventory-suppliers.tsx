import { useTranslations } from 'next-intl';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { DataImportDialog } from '@/features/data-import/data-import-dialog';
import { formatPhone } from '@/features/patients/patients.lib';
import { SettingsActiveToggle } from '@/features/settings/settings-active-toggle';
import { setSupplierActiveAction } from './inventory.actions';
import type { listSuppliers } from './inventory.service';
import { InventorySupplierDialog } from './inventory-supplier-dialog';

type InventorySuppliersProps = {
  suppliers: Awaited<ReturnType<typeof listSuppliers>>;
};

export function InventorySuppliers(props: InventorySuppliersProps) {
  const t = useTranslations('inventory.suppliers');
  const tc = useTranslations('common');

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-muted-foreground">{t('intro')}</p>
        <div className="flex gap-2">
          <DataImportDialog kind="suppliers" />
          <InventorySupplierDialog mode="create" />
        </div>
      </div>
      {props.suppliers.length === 0 ? (
        <p className="rounded-lg border p-4 text-sm text-muted-foreground">{t('empty')}</p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t('colName')}</TableHead>
              <TableHead className="hidden md:table-cell">{t('colPhone')}</TableHead>
              <TableHead className="hidden md:table-cell">{t('colAddress')}</TableHead>
              <TableHead className="hidden md:table-cell">{t('colStatus')}</TableHead>
              <TableHead className="text-right">{t('colActions')}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {props.suppliers.map((supplier) => (
              <TableRow key={supplier.id} className={supplier.is_active ? undefined : 'text-muted-foreground'}>
                <TableCell className="max-w-0 md:max-w-none">
                  <span className="block truncate font-medium">{supplier.name}</span>
                  {/* Phones and small tablets: contact and status fold under the name. */}
                  <span className="block truncate text-[0.8125rem] text-muted-foreground md:hidden">
                    {[
                      supplier.phone && formatPhone(supplier.phone),
                      supplier.address,
                      !supplier.is_active && t('inactiveShort'),
                    ]
                      .filter(Boolean)
                      .join(' · ') || t('noContact')}
                  </span>
                </TableCell>
                <TableCell className="tabular hidden md:table-cell">
                  {supplier.phone ? formatPhone(supplier.phone) : '-'}
                </TableCell>
                <TableCell className="hidden max-w-xs truncate md:table-cell">{supplier.address ?? '-'}</TableCell>
                <TableCell className="hidden md:table-cell">
                  <Badge variant={supplier.is_active ? 'secondary' : 'outline'}>
                    {supplier.is_active ? tc('active') : tc('inactive')}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex flex-col items-end gap-1 sm:flex-row sm:justify-end">
                    <InventorySupplierDialog mode="edit" supplier={supplier} />
                    <SettingsActiveToggle
                      id={supplier.id}
                      isActive={supplier.is_active}
                      action={setSupplierActiveAction}
                      name={supplier.name}
                      consequence={t('deactivateConsequence')}
                    />
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
