import { ActivityIcon, CheckIcon } from 'lucide-react';
import { Elapsed } from '@/components/ui/elapsed';
import { Panel, PanelEmpty } from '@/components/ui/panel';
import { ExamVitalsDialog } from '@/features/exam/exam-vitals-dialog';
import { formatTime } from '@/lib/dates';
import type { listTodayVisits } from './home.service';

type HomeNurseProps = {
  waiting: Awaited<ReturnType<typeof listTodayVisits>>;
  /** visit id -> latest vitals time */
  vitals: Map<string, string>;
  now: number;
};

/** Triage: who in the waiting room still needs vitals before the doctor sees them. */
export function HomeNurse(props: HomeNurseProps) {
  const todo = props.waiting.filter((visit) => !props.vitals.has(visit.id));
  const done = props.waiting.filter((visit) => props.vitals.has(visit.id));

  return (
    <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
      <Panel
        title="Perlu tanda vital"
        count={todo.length}
        dot="bg-line-waiting"
        link={{ href: '/queue', label: 'Antrean' }}>
        {todo.length === 0 ? (
          <PanelEmpty icon={<ActivityIcon />} title="Semua pasien menunggu sudah dicatat" />
        ) : (
          <ul>
            {todo.map((visit, index) => (
              <li
                key={visit.id}
                className={index === 0 ? 'border-b bg-secondary/40 last:border-0' : 'border-b last:border-0'}>
                <div className="flex items-center gap-3 px-4 py-3">
                  <span className="numeral flex size-10 shrink-0 items-center justify-center rounded-lg bg-status-waiting-soft text-lg text-status-waiting">
                    {visit.queue_no}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold">{visit.patient?.full_name}</span>
                    <span className="block truncate text-[0.8125rem] text-muted-foreground">
                      {visit.poli?.name} · {visit.doctor?.full_name}
                    </span>
                  </span>
                  <Elapsed since={visit.created_at} now={props.now} />
                  <ExamVitalsDialog visitId={visit.id} patientName={visit.patient?.full_name ?? ''} size="default" />
                </div>
              </li>
            ))}
          </ul>
        )}
      </Panel>

      <Panel title="Sudah dicatat" count={done.length}>
        {done.length === 0 ? (
          <PanelEmpty title="Belum ada" />
        ) : (
          <ul>
            {done.map((visit) => (
              <li key={visit.id} className="flex items-center gap-3 border-b px-4 py-2.5 text-sm last:border-0">
                <CheckIcon className="size-4 text-primary" aria-hidden />
                <span className="min-w-0 flex-1 truncate">{visit.patient?.full_name}</span>
                <span className="tabular text-[0.8125rem] text-muted-foreground">
                  {formatTime(props.vitals.get(visit.id)!)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </Panel>
    </div>
  );
}
