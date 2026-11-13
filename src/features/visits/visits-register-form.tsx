'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { CalendarXIcon, ChevronRightIcon, CornerDownLeftIcon } from 'lucide-react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { Button, buttonVariants } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { segmentedGroup, segmentedRadioItem } from '@/components/ui/segmented';
import { initials } from '@/features/patients/patients.lib';
import { toHourMinute } from '@/features/schedules/schedules.lib';
import { useMessage } from '@/i18n/message';
import { useActionMutation } from '@/lib/query';
import { cn } from '@/lib/utils';
import { createVisitAction } from './visits.actions';
import {
  type CreateVisitInput,
  type CreateVisitValues,
  createVisitSchema,
  firstOpenSession,
  type PracticeSession,
  sessionEnded,
} from './visits.lib';

export type RegisteredVisit = {
  id: string;
  queueNo: number;
  session: PracticeSession;
  payer: 'umum' | 'bpjs';
};

type VisitsRegisterFormProps = {
  patientId: string;
  hasBpjsNumber: boolean;
  sessions: PracticeSession[];
  canManageSchedules: boolean;
  /** Jakarta time "HH:MM": preselects a session that is still running. */
  now?: string;
  /** "panel": one session per row, for the narrow registration panel. */
  layout?: 'page' | 'panel';
  /** Called after the visit is created (the desk shows the queue ticket). */
  onRegistered?: (visit: RegisteredVisit) => void;
};

/** Keyboard-first: the submit button has focus, so Enter registers the default session. */
export function VisitsRegisterForm(props: VisitsRegisterFormProps) {
  const t = useTranslations();
  const message = useMessage();
  const register = useActionMutation(createVisitAction);

  const form = useForm<CreateVisitInput, unknown, CreateVisitValues>({
    resolver: zodResolver(createVisitSchema),
    defaultValues: {
      patient_id: props.patientId,
      schedule_id: firstOpenSession(props.sessions, props.now)?.id ?? '',
      payer_type: 'umum',
    },
  });

  const { errors } = form.formState;
  const panel = props.layout === 'panel';

  function renderSession(session: PracticeSession) {
    const full = session.taken >= session.quota;
    const ended = props.now ? sessionEnded(session, props.now) : false;

    const fill = Math.min(100, Math.round((session.taken / Math.max(session.quota, 1)) * 100));

    return (
      <label
        key={session.id}
        className={cn(
          'flex cursor-pointer items-center gap-3 rounded-xl border bg-card p-3 text-sm transition-[border-color,box-shadow] has-checked:border-primary has-checked:shadow-[0_0_0_1px_var(--primary)] has-focus-visible:ring-3 has-focus-visible:ring-primary/20',
          full && 'cursor-not-allowed opacity-55',
          ended && !full && 'bg-muted/40',
        )}>
        <input
          type="radio"
          value={session.id}
          disabled={full}
          className="peer sr-only"
          {...form.register('schedule_id')}
        />
        <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-secondary text-xs font-semibold text-secondary-foreground">
          {initials(session.doctorName)}
        </span>
        <span className="flex min-w-0 flex-1 flex-col gap-1.5">
          <span>
            <span className="block truncate font-medium">{session.doctorName}</span>
            <span className="block truncate text-[0.8125rem] text-muted-foreground">
              {session.poliName} · {toHourMinute(session.startTime)}–{toHourMinute(session.endTime)}
              {ended && t('visits.sessions.hoursOver')}
            </span>
          </span>
          <span className="flex items-center gap-2">
            <span className="h-1 flex-1 overflow-hidden rounded-full bg-muted">
              <span
                className={cn('block h-full rounded-full', full ? 'bg-destructive' : 'bg-primary')}
                style={{ width: `${fill}%` }}
              />
            </span>
            <span className={cn('tabular text-xs text-muted-foreground', full && 'font-medium text-destructive')}>
              {full ? t('visits.sessions.full') : t('visits.sessions.left', { count: session.quota - session.taken })}
            </span>
          </span>
        </span>
        <span
          aria-hidden
          className="flex size-5 shrink-0 items-center justify-center rounded-full border-2 border-input transition-colors peer-checked:border-[6px] peer-checked:border-primary"
        />
      </label>
    );
  }

  if (props.sessions.length === 0) {
    return (
      <EmptyState
        icon={CalendarXIcon}
        title={t('visits.sessions.none')}
        description={
          props.canManageSchedules ? t('visits.sessions.noneHint.manage') : t('visits.sessions.noneHint.ask')
        }
        action={
          props.canManageSchedules && (
            <Link href="/settings/schedules" className={buttonVariants({ variant: 'outline', size: 'sm' })}>
              {t('visits.sessions.manage')}
            </Link>
          )
        }
      />
    );
  }

  return (
    <form
      noValidate
      className="flex flex-col gap-5"
      onSubmit={form.handleSubmit((values) => {
        const session = props.sessions.find((item) => item.id === values.schedule_id)!;

        register.mutate(values, {
          onSuccess: (visit) => {
            if (props.onRegistered)
              props.onRegistered({
                ...visit,
                session,
                payer: values.payer_type,
              });
            else toast.success(t('visits.register.registered', { poli: session.poliName, number: visit.queueNo }));
          },
        });
      })}>
      <fieldset className="flex flex-col gap-2">
        <legend className="mb-2 text-sm font-medium">{t('visits.register.doctor')}</legend>
        {(() => {
          // Sessions whose hours are over fold away, so the doctors still practising come first.
          const ended = props.now ? props.sessions.filter((session) => sessionEnded(session, props.now!)) : [];

          const current = props.sessions.filter((session) => !ended.includes(session));

          const grid = cn('grid gap-2', !panel && 'sm:grid-cols-2');

          if (current.length === 0) return <div className={grid}>{props.sessions.map(renderSession)}</div>;

          return (
            <>
              <div className={grid}>{current.map(renderSession)}</div>
              {ended.length > 0 && (
                <details className="group">
                  <summary className="flex w-fit cursor-pointer list-none items-center gap-1 py-1 text-[0.8125rem] font-medium text-muted-foreground hover:text-foreground">
                    <ChevronRightIcon className="size-3.5 transition-transform group-open:rotate-90" aria-hidden />
                    {t('visits.register.endedGroup', { count: ended.length })}
                  </summary>
                  <div className={cn(grid, 'mt-2')}>{ended.map(renderSession)}</div>
                </details>
              )}
            </>
          );
        })()}
        {errors.schedule_id && (
          <p className="text-[0.8125rem] text-destructive">{message(errors.schedule_id.message ?? '')}</p>
        )}
      </fieldset>

      <fieldset className="flex flex-col gap-2">
        <legend className="mb-2 text-sm font-medium">{t('visits.register.payment')}</legend>
        <div className={cn(segmentedGroup, panel && 'grid w-full grid-cols-2')}>
          {(['umum', 'bpjs'] as const).map((payer) => (
            <label key={payer} className={cn(segmentedRadioItem, 'px-5')}>
              <input
                type="radio"
                value={payer}
                disabled={payer === 'bpjs' && !props.hasBpjsNumber}
                className="sr-only"
                {...form.register('payer_type')}
              />
              {t(`payer.${payer}`)}
            </label>
          ))}
        </div>
        {!props.hasBpjsNumber && (
          <p className="text-[0.8125rem] text-muted-foreground">{t('visits.register.bpjsHint')}</p>
        )}
      </fieldset>

      <Button type="submit" size="lg" autoFocus disabled={register.isPending} className={panel ? 'w-full' : 'w-fit'}>
        {register.isPending ? t('visits.register.submitting') : t('visits.register.submit')}
        <kbd className="ml-1 flex items-center gap-0.5 rounded bg-white/15 px-1.5 font-sans text-[0.6875rem] font-medium">
          <CornerDownLeftIcon className="size-3" aria-hidden />
          Enter
        </kbd>
      </Button>
    </form>
  );
}
