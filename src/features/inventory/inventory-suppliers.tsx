import { DataImportDialog } from "@/features/data-import/data-import-dialog";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { SettingsActiveToggle } from "@/features/settings/settings-active-toggle";
import { setSupplierActiveAction } from "./inventory.actions";
import type { listSuppliers } from "./inventory.service";
import { InventorySupplierDialog } from "./inventory-supplier-dialog";

type InventorySuppliersProps = {
  suppliers: Awaited<ReturnType<typeof listSuppliers>>;
};

export function InventorySuppliers(props: InventorySuppliersProps) {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-muted-foreground">Supplier dipakai saat mencatat pembelian obat.</p>
        <div className="flex gap-2">
          <DataImportDialog kind="suppliers" />
          <InventorySupplierDialog mode="create" />
        </div>
      </div>
      {props.suppliers.length === 0 ? (
        <p className="rounded-lg border p-4 text-sm text-muted-foreground">Belum ada supplier.</p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nama</TableHead>
              <TableHead>Telepon</TableHead>
              <TableHead>Alamat</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {props.suppliers.map((supplier) => (
              <TableRow key={supplier.id} className={supplier.is_active ? undefined : "text-muted-foreground"}>
                <TableCell className="font-medium">{supplier.name}</TableCell>
                <TableCell>{supplier.phone ?? "-"}</TableCell>
                <TableCell className="max-w-xs truncate">{supplier.address ?? "-"}</TableCell>
                <TableCell>
                  <Badge variant={supplier.is_active ? "secondary" : "outline"}>
                    {supplier.is_active ? "Aktif" : "Nonaktif"}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-1">
                    <InventorySupplierDialog mode="edit" supplier={supplier} />
                    <SettingsActiveToggle
                      id={supplier.id}
                      isActive={supplier.is_active}
                      action={setSupplierActiveAction}
                      name={supplier.name}
                      consequence="Supplier ini tidak bisa dipilih untuk pembelian baru."
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
