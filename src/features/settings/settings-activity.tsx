import { ChevronRightIcon, HistoryIcon } from 'lucide-react';
import { PageLinks } from '@/components/ui/page-links';
import { PanelEmpty } from '@/components/ui/panel';
import { initials } from '@/features/patients/patients.lib';
import type { DateRange } from '@/features/reports/reports.lib';
import { formatDate, formatTime, relativeDay, toJakartaDate } from '@/lib/dates';
import { cn } from '@/lib/utils';
import { AUDIT_FIELD_LABELS, AUDIT_PAGE_SIZE, AUDIT_TABLE_LABELS } from './settings.constants';
import { type AuditChange, auditSubject, changedFields, groupAuditLogs } from './settings.lib';
import type { listAuditLogs } from './settings.service';

type Log = Awaited<ReturnType<typeof listAuditLogs>>['logs'][number];

type SettingsActivityProps = Awaited<ReturnType<typeof listAuditLogs>> & {
  range: DateRange;
  params: Record<string, string>;
  page: number;
  today: string;
};

const VERB: Record<string, string> = { insert: 'menambah', update: 'mengubah', delete: 'menghapus' };
const DOT: Record<string, string> = { insert: 'bg-primary', update: 'bg-sky-500', delete: 'bg-destructive' };

function tableLabel(table: string) {
  return AUDIT_TABLE_LABELS[table] ?? table;
}

function Changes(props: { changes: AuditChange[] }) {
  return (
    <ul className="flex flex-wrap gap-1.5">
      {props.changes.map((change) => (
        <li
          key={change.field}
          className="inline-flex max-w-full items-center gap-1.5 rounded-md bg-muted/70 px-2 py-0.5 text-xs">
          <span className="font-medium">{change.label}</span>
          {change.ref ? (
            <span className="text-muted-foreground">{change.from === 'kosong' ? 'diisi' : 'diganti'}</span>
          ) : (
            <span className="min-w-0 truncate">
              <span className="text-muted-foreground line-through decoration-black/25">{change.from}</span>
              <span className="mx-1 text-muted-foreground">→</span>
              {change.to}
            </span>
          )}
        </li>
      ))}
    </ul>
  );
}

function Actor(props: { name: string; system: boolean }) {
  return (
    <span
      className={cn(
        'flex size-7 shrink-0 items-center justify-center rounded-full text-[0.625rem] font-semibold',
        props.system ? 'bg-muted text-muted-foreground' : 'bg-secondary text-secondary-foreground',
      )}
      aria-hidden>
      {props.system ? 'S' : initials(props.name)}
    </span>
  );
}

/** One entry: a single change, or a run of the same change folded into one line. */
function Entry(props: { logs: Log[] }) {
  const [head] = props.logs;
  const count = props.logs.length;
  const changes = head.action === 'update' ? changedFields(head.before, head.after, AUDIT_FIELD_LABELS) : [];
  const subject = auditSubject(head.before, head.after);
  const noop = head.action === 'update' && changes.length === 0;

  const sentence = (
    <p className="text-sm leading-6">
      <span className="font-medium">{head.actorName}</span>{' '}
      <span className="text-muted-foreground">{VERB[head.action] ?? head.action}</span>{' '}
      {count > 1 ? (
        <span className="font-medium">
          {count} {tableLabel(head.table_name).toLowerCase()}
        </span>
      ) : (
        <>
          <span className="font-medium">{tableLabel(head.table_name).toLowerCase()}</span>
          {subject && <span className="text-foreground"> {subject}</span>}
        </>
      )}
    </p>
  );

  return (
    <li
      className={cn(
        'grid grid-cols-[3rem_1.75rem_minmax(0,1fr)] gap-x-3 px-4 py-3',
        noop && count === 1 && 'opacity-65',
      )}>
      <time dateTime={head.created_at} className="tabular pt-0.5 text-[0.8125rem] text-muted-foreground">
        {formatTime(head.created_at)}
      </time>
      <span className="relative">
        <Actor name={head.actorName} system={!head.actor_id} />
        <span
          className={cn('absolute -right-0.5 -bottom-0.5 size-2.5 rounded-full ring-2 ring-card', DOT[head.action])}
          aria-hidden
        />
      </span>
      <div className="flex min-w-0 flex-col gap-1.5">
        {count === 1 ? (
          <>
            {sentence}
            {changes.length > 0 && <Changes changes={changes} />}
            {noop && <p className="text-xs text-muted-foreground">Tanpa perubahan isi</p>}
          </>
        ) : (
          <details className="disclose group">
            <summary className="flex cursor-pointer list-none items-start gap-1 [&::-webkit-details-marker]:hidden">
              {sentence}
              <span className="mt-1 ml-1 inline-flex shrink-0 items-center gap-0.5 text-xs font-medium text-muted-foreground group-hover:text-foreground">
                <ChevronRightIcon className="size-3.5 transition-transform group-open:rotate-90" aria-hidden />
                Rincian
              </span>
            </summary>
            <ul className="mt-2 flex flex-col divide-y rounded-lg border">
              {props.logs.map((log) => {
                const itemChanges =
                  log.action === 'update' ? changedFields(log.before, log.after, AUDIT_FIELD_LABELS) : [];

                return (
                  <li key={log.id} className="flex flex-col gap-1 px-3 py-2">
                    <span className="flex items-baseline justify-between gap-3 text-[0.8125rem]">
                      <span className="truncate">
                        {auditSubject(log.before, log.after) ?? `#${log.record_id.slice(0, 8)}`}
                      </span>
                      <span className="tabular shrink-0 text-xs text-muted-foreground">
                        {formatTime(log.created_at)}
                      </span>
                    </span>
                    {itemChanges.length > 0 && <Changes changes={itemChanges} />}
                    {log.action === 'update' && itemChanges.length === 0 && (
                      <span className="text-xs text-muted-foreground">Tanpa perubahan isi</span>
                    )}
                  </li>
                );
              })}
            </ul>
          </details>
        )}
      </div>
    </li>
  );
}

/**
 * Who changed what, when, as a feed grouped by day. Bursts (an import, a
 * package edit) fold into one entry; the day headers stay in view while
 * scrolling. Clinical records are not here: they lock on signing and keep amendments.
 */
export function SettingsActivity(props: SettingsActivityProps) {
  const days = new Map<string, Log[]>();

  for (const log of props.logs) {
    const day = toJakartaDate(new Date(log.created_at));

    days.set(day, [...(days.get(day) ?? []), log]);
  }

  const first = (props.page - 1) * AUDIT_PAGE_SIZE + 1;

  if (props.logs.length === 0) {
    return (
      <div className="rounded-xl border bg-card">
        <PanelEmpty
          icon={<HistoryIcon />}
          title="Tidak ada aktivitas"
          description="Coba perlebar periode atau hapus saringan."
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <p className="text-[0.8125rem] text-muted-foreground">
        Aktivitas{' '}
        <span className="tabular font-medium text-foreground">
          {first.toLocaleString('id-ID')}–{(first + props.logs.length - 1).toLocaleString('id-ID')}
        </span>{' '}
        dari <span className="tabular font-medium text-foreground">{props.total.toLocaleString('id-ID')}</span>, terbaru
        di atas.
      </p>
      {[...days].map(([day, logs]) => (
        <section key={day} className="rounded-xl border bg-card shadow-[0_1px_2px_rgb(20_32_29/0.04)]">
          <header className="sticky top-[3.3rem] z-10 flex items-center justify-between gap-3 rounded-t-xl border-b bg-card/95 px-4 py-2.5 backdrop-blur">
            <h2 className="text-sm font-semibold">
              {relativeDay(day, props.today) === 'Hari ini' || relativeDay(day, props.today) === 'Kemarin'
                ? `${relativeDay(day, props.today)}, ${formatDate(day)}`
                : formatDate(day)}
            </h2>
            <span className="tabular text-xs text-muted-foreground">{logs.length} aktivitas</span>
          </header>
          <ol className="divide-y">
            {groupAuditLogs(logs).map((group) => (
              <Entry key={group[0].id} logs={group} />
            ))}
          </ol>
        </section>
      ))}
      <PageLinks
        page={props.page}
        pageSize={AUDIT_PAGE_SIZE}
        total={props.total}
        params={props.params}
        noun="aktivitas"
      />
    </div>
  );
}
