import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { formatRupiah } from '@/lib/money';
import { setPoliActiveAction } from './settings.actions';
import type { listConsultationServices, listPolis } from './settings.service';
import { SettingsActiveToggle } from './settings-active-toggle';
import { SettingsPoliDialog } from './settings-poli-dialog';

type SettingsPolisProps = {
  polis: Awaited<ReturnType<typeof listPolis>>;
  consultationServices: Awaited<ReturnType<typeof listConsultationServices>>;
};

export function SettingsPolis(props: SettingsPolisProps) {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-muted-foreground">Poli dipakai untuk antrean, jadwal dokter, dan laporan.</p>
        <SettingsPoliDialog mode="create" consultationServices={props.consultationServices} />
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
              <TableHead>Tarif konsultasi</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {props.polis.map((poli) => (
              <TableRow key={poli.id} className={poli.is_active ? undefined : 'text-muted-foreground'}>
                <TableCell className="font-medium">{poli.name}</TableCell>
                <TableCell>{poli.bpjs_poli_code ?? '-'}</TableCell>
                <TableCell>
                  {poli.consultation ? `${poli.consultation.name} · ${formatRupiah(poli.consultation.price)}` : '-'}
                </TableCell>
                <TableCell>
                  <Badge variant={poli.is_active ? 'secondary' : 'outline'}>
                    {poli.is_active ? 'Aktif' : 'Nonaktif'}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex flex-col items-end gap-1 sm:flex-row sm:justify-end">
                    <SettingsPoliDialog mode="edit" poli={poli} consultationServices={props.consultationServices} />
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
