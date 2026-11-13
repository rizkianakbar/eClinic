import Link from "next/link";
import { ClipboardCheckIcon, PlusIcon } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatDateTime } from "@/lib/dates";
import type { listStockOpnames } from "./inventory.service";

type InventoryOpnamesProps = {
  opnames: Awaited<ReturnType<typeof listStockOpnames>>;
};

export function InventoryOpnames(props: InventoryOpnamesProps) {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-muted-foreground">Hitung stok fisik; selisih langsung menyesuaikan stok dan tercatat di kartu stok.</p>
        <Link href="/inventory/opname/new" className={buttonVariants()}>
          <PlusIcon />
          Mulai stok opname
        </Link>
      </div>
      {props.opnames.length === 0 ? (
        <EmptyState
          icon={ClipboardCheckIcon}
          title="Belum pernah stok opname"
          description="Hitung obat di rak, masukkan jumlahnya per batch. Selisih dengan catatan sistem langsung disesuaikan dan tercatat di kartu stok. Disarankan sebulan sekali."
          action={
            <Link href="/inventory/opname/new" className={buttonVariants({ variant: "outline", size: "sm" })}>
              Mulai stok opname pertama
            </Link>
          }
        />
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Waktu</TableHead>
              <TableHead>Oleh</TableHead>
              <TableHead className="text-right">Batch dihitung</TableHead>
              <TableHead className="text-right">Selisih</TableHead>
              <TableHead>Catatan</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {props.opnames.map((opname) => (
              <TableRow key={opname.id} className="relative">
                <TableCell>
                  <Link href={`/inventory/opname/${opname.id}`} className="font-medium after:absolute after:inset-0 hover:underline">
                    {formatDateTime(opname.created_at)}
                  </Link>
                </TableCell>
                <TableCell>{opname.poster?.full_name}</TableCell>
                <TableCell className="tabular text-right">{opname.items.length}</TableCell>
                <TableCell className="text-right">
                  {(() => {
                    const differences = opname.items.filter((item) => item.difference !== 0).length;
                    return differences === 0 ? (
                      <span className="rounded-md bg-secondary px-1.5 text-xs leading-5 font-medium text-secondary-foreground">Cocok semua</span>
                    ) : (
                      <span className="tabular rounded-md bg-status-waiting-soft px-1.5 text-xs leading-5 font-medium text-status-waiting">
                        {differences} selisih
                      </span>
                    );
                  })()}
                </TableCell>
                <TableCell className="max-w-xs truncate">{opname.note ?? "-"}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
