import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { formatDate, formatDateTime } from '@/lib/dates';
import { cn } from '@/lib/utils';
import type { getStockOpname } from './inventory.service';

type InventoryOpnameProps = {
  opname: NonNullable<Awaited<ReturnType<typeof getStockOpname>>>;
};

/** A posted stock opname (read-only). */
export function InventoryOpname(props: InventoryOpnameProps) {
  const { opname } = props;

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h2 className="text-[1.125rem] font-semibold tracking-tight">Stok opname {formatDate(opname.opname_date)}</h2>
        <p className="text-sm text-muted-foreground">
          {opname.poster?.full_name} · {formatDateTime(opname.created_at)}
          {opname.note && ` · ${opname.note}`}
        </p>
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Obat</TableHead>
            <TableHead>Batch</TableHead>
            <TableHead className="text-right">Sistem</TableHead>
            <TableHead className="text-right">Fisik</TableHead>
            <TableHead className="text-right">Selisih</TableHead>
            <TableHead>Alasan</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {opname.items.map((item) => (
            <TableRow key={item.id}>
              <TableCell>{item.medicine?.name}</TableCell>
              <TableCell className="tabular">
                {item.batch?.batch_no}
                {item.batch && (
                  <span className="ml-1 font-sans text-xs text-muted-foreground">
                    ED {formatDate(item.batch.expiry_date)}
                  </span>
                )}
              </TableCell>
              <TableCell className="text-right">{item.system_qty}</TableCell>
              <TableCell className="text-right">{item.counted_qty}</TableCell>
              <TableCell className={cn('text-right', item.difference !== 0 && 'font-medium text-destructive')}>
                {item.difference > 0 ? `+${item.difference}` : item.difference}
              </TableCell>
              <TableCell>{item.reason ?? '-'}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
