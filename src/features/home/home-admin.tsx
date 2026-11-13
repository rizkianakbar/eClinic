import {
  CalendarClockIcon,
  ListTreeIcon,
  PillIcon,
  SettingsIcon,
  StethoscopeIcon,
  TagIcon,
  UsersIcon,
} from 'lucide-react';
import Link from 'next/link';
import { Panel, PanelEmpty } from '@/components/ui/panel';
import { AUDIT_TABLE_LABELS } from '@/features/settings/settings.constants';
import type { listAuditLogs } from '@/features/settings/settings.service';
import { formatDateTime } from '@/lib/dates';

type HomeAdminProps = {
  activity: Awaited<ReturnType<typeof listAuditLogs>>['logs'];
};

const VERBS: Record<string, string> = { insert: 'menambah', update: 'mengubah', delete: 'menghapus' };

const SHORTCUTS = [
  { href: '/settings/staff', label: 'Staf', hint: 'Tambah, nonaktifkan, atur ulang sandi', icon: UsersIcon },
  { href: '/settings/schedules', label: 'Jadwal dokter', hint: 'Hari, jam praktik, kuota', icon: CalendarClockIcon },
  { href: '/settings/polis', label: 'Poli', hint: 'Poli dan biaya konsultasi', icon: StethoscopeIcon },
  { href: '/settings/services', label: 'Tarif layanan', hint: 'Tindakan dan paket', icon: TagIcon },
  { href: '/settings/medicines', label: 'Obat', hint: 'Daftar obat dan harga', icon: PillIcon },
  { href: '/settings/icd10', label: 'ICD-10', hint: 'Daftar diagnosis', icon: ListTreeIcon },
  { href: '/settings/clinic', label: 'Profil klinik', hint: 'Logo, alamat, kop surat', icon: SettingsIcon },
] as const;

/** The admin's desk: what changed recently, and the settings they touch most. */
export function HomeAdmin(props: HomeAdminProps) {
  return (
    <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
      <Panel title="Aktivitas terbaru" link={{ href: '/settings/activity', label: 'Log aktivitas' }}>
        {props.activity.length === 0 ? (
          <PanelEmpty title="Belum ada perubahan minggu ini" />
        ) : (
          <ul>
            {props.activity.map((log) => (
              <li key={log.id} className="flex items-start gap-3 border-b px-4 py-3 text-sm last:border-0">
                <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-primary/60" aria-hidden />
                <span className="min-w-0 flex-1">
                  <span className="font-medium">{log.actorName}</span>{' '}
                  <span className="text-muted-foreground">{VERBS[log.action] ?? log.action}</span>{' '}
                  {(AUDIT_TABLE_LABELS[log.table_name] ?? log.table_name).toLowerCase()}
                </span>
                <span className="tabular shrink-0 text-[0.8125rem] text-muted-foreground">
                  {formatDateTime(log.created_at)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </Panel>

      <Panel title="Pengaturan">
        <ul>
          {SHORTCUTS.map((shortcut) => (
            <li key={shortcut.href} className="border-b last:border-0">
              <Link href={shortcut.href} className="flex items-center gap-3 px-4 py-2.5 hover:bg-muted/50">
                <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-secondary text-secondary-foreground">
                  <shortcut.icon className="size-4" aria-hidden />
                </span>
                <span className="min-w-0">
                  <span className="block text-sm font-medium">{shortcut.label}</span>
                  <span className="block truncate text-[0.8125rem] text-muted-foreground">{shortcut.hint}</span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </Panel>
    </div>
  );
}
