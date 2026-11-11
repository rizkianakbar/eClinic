import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { SettingsActiveToggle } from "@/features/settings/settings-active-toggle";
import { setScheduleActiveAction } from "./schedules.actions";
import { DAY_LABELS } from "./schedules.constants";
import { toHourMinute } from "./schedules.lib";
import type { listSchedules } from "./schedules.service";
import { SchedulesDialog } from "./schedules-dialog";

type Option = { id: string; name: string };

type SchedulesProps = {
  schedules: Awaited<ReturnType<typeof listSchedules>>;
  doctors: Option[];
  polis: Option[];
};

export function Schedules(props: SchedulesProps) {
  const { doctors, polis } = props;

  if (doctors.length === 0 || polis.length === 0) {
    return (
      <p className="rounded-lg border p-4 text-sm text-muted-foreground">
        Jadwal butuh minimal satu dokter aktif dan satu poli aktif.{" "}
        {doctors.length === 0 && (
          <Link href="/settings/staff" className="underline">
            Tambah akun dokter
          </Link>
        )}
        {doctors.length === 0 && polis.length === 0 && " dan "}
        {polis.length === 0 && (
          <Link href="/settings/polis" className="underline">
            tambah poli
          </Link>
        )}{" "}
        terlebih dahulu.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-muted-foreground">
          Jadwal praktik mingguan. Kuota membatasi jumlah pasien yang bisa didaftarkan per sesi per hari.
        </p>
        <SchedulesDialog mode="create" doctors={doctors} polis={polis} />
      </div>

      {props.schedules.length === 0 ? (
        <p className="rounded-lg border p-4 text-sm text-muted-foreground">Belum ada jadwal dokter.</p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Hari</TableHead>
              <TableHead>Jam</TableHead>
              <TableHead>Dokter</TableHead>
              <TableHead>Poli</TableHead>
              <TableHead>Kuota</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {props.schedules.map((schedule) => (
              <TableRow key={schedule.id} className={schedule.is_active ? undefined : "text-muted-foreground"}>
                <TableCell className="font-medium">{DAY_LABELS[schedule.day_of_week]}</TableCell>
                <TableCell>
                  {toHourMinute(schedule.start_time)}–{toHourMinute(schedule.end_time)}
                </TableCell>
                <TableCell>{schedule.doctor?.full_name ?? "-"}</TableCell>
                <TableCell>{schedule.poli?.name ?? "-"}</TableCell>
                <TableCell>{schedule.quota}</TableCell>
                <TableCell>
                  <Badge variant={schedule.is_active ? "secondary" : "outline"}>
                    {schedule.is_active ? "Aktif" : "Nonaktif"}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-1">
                    <SchedulesDialog mode="edit" schedule={schedule} doctors={doctors} polis={polis} />
                    <SettingsActiveToggle
                      id={schedule.id}
                      isActive={schedule.is_active}
                      action={setScheduleActiveAction}
                      name={`jadwal ${DAY_LABELS[schedule.day_of_week]} ${toHourMinute(schedule.start_time)}`}
                      consequence="Jadwal ini tidak dipakai untuk pendaftaran kunjungan baru."
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
