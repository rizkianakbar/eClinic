import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { setPoliActiveAction } from "./settings.actions";
import type { listPolis } from "./settings.service";
import { SettingsActiveToggle } from "./settings-active-toggle";
import { SettingsPoliDialog } from "./settings-poli-dialog";

type SettingsPolisProps = {
  polis: Awaited<ReturnType<typeof listPolis>>;
};

export function SettingsPolis(props: SettingsPolisProps) {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-muted-foreground">Poli dipakai untuk antrean, jadwal dokter, dan laporan.</p>
        <SettingsPoliDialog mode="create" />
      </div>

      {props.polis.length === 0 ? (
        <p className="rounded-lg border p-4 text-sm text-muted-foreground">
          Belum ada poli. Tambahkan poli pertama, contoh: Poli Umum.
        </p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nama</TableHead>
              <TableHead>Kode BPJS</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {props.polis.map((poli) => (
              <TableRow key={poli.id} className={poli.is_active ? undefined : "text-muted-foreground"}>
                <TableCell className="font-medium">{poli.name}</TableCell>
                <TableCell>{poli.bpjs_poli_code ?? "-"}</TableCell>
                <TableCell>
                  <Badge variant={poli.is_active ? "secondary" : "outline"}>
                    {poli.is_active ? "Aktif" : "Nonaktif"}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-1">
                    <SettingsPoliDialog mode="edit" poli={poli} />
                    <SettingsActiveToggle
                      id={poli.id}
                      isActive={poli.is_active}
                      action={setPoliActiveAction}
                      name={poli.name}
                      consequence="Poli ini tidak bisa dipilih untuk kunjungan dan jadwal baru."
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
