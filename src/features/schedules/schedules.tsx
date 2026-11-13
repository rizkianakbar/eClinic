import { CalendarPlusIcon } from 'lucide-react';
import Link from 'next/link';
import { EmptyState } from '@/components/ui/empty-state';
import type { listSchedules } from './schedules.service';
import { SchedulesDialog } from './schedules-dialog';
import { SchedulesWeek } from './schedules-week';

type Option = { id: string; name: string };

type SchedulesProps = {
  schedules: Awaited<ReturnType<typeof listSchedules>>;
  /** ISO weekday of today in Jakarta (1 = Monday), to mark today's column. */
  today: number;
  doctors: Option[];
  polis: Option[];
};

export function Schedules(props: SchedulesProps) {
  const { doctors, polis } = props;

  if (doctors.length === 0 || polis.length === 0) {
    return (
      <p className="rounded-lg border p-4 text-sm text-muted-foreground">
        Jadwal butuh minimal satu dokter aktif dan satu poli aktif.{' '}
        {doctors.length === 0 && (
          <Link href="/settings/staff" className="underline">
            Tambah akun dokter
          </Link>
        )}
        {doctors.length === 0 && polis.length === 0 && ' dan '}
        {polis.length === 0 && (
          <Link href="/settings/polis" className="underline">
            tambah poli
          </Link>
        )}{' '}
        terlebih dahulu.
      </p>
    );
  }

  const active = props.schedules.filter((schedule) => schedule.is_active);
  const quota = active.reduce((sum, schedule) => sum + schedule.quota, 0);
  const openDays = new Set(active.map((schedule) => schedule.day_of_week)).size;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-base font-semibold">Jadwal dokter</h2>
          <p className="text-sm text-muted-foreground">
            {active.length} sesi aktif, buka {openDays} hari seminggu, kuota {quota} pasien per minggu. Kuota = pasien
            maksimal per sesi.
          </p>
        </div>
        <SchedulesDialog mode="create" doctors={doctors} polis={polis} />
      </div>

      {props.schedules.length === 0 ? (
        <EmptyState
          icon={CalendarPlusIcon}
          title="Belum ada jadwal dokter"
          description="Tambahkan jadwal agar pasien bisa didaftarkan."
        />
      ) : (
        <SchedulesWeek schedules={props.schedules} today={props.today} doctors={doctors} polis={polis} />
      )}
    </div>
  );
}
