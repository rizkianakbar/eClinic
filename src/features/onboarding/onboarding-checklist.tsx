import { ArrowRightIcon, CheckIcon } from 'lucide-react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { SetupStep } from './onboarding.lib';

type OnboardingChecklistProps = {
  companyName: string;
  branchName: string;
  /** Done once for the company (shared by every branch). */
  company: readonly SetupStep[];
  /** Done at this branch. */
  branch: readonly SetupStep[];
};

/**
 * A branch's first job on Beranda: what to set up before its first patient. The company's part (the shared
 * catalogue) is done once, so a second branch finds it ticked; the branch's part is its own. One obvious next
 * action (the first open step); every step stays reachable. Renders nothing once all are done.
 */
export function OnboardingChecklist(props: OnboardingChecklistProps) {
  const t = useTranslations('onboarding');
  const steps = [...props.company, ...props.branch];
  const done = steps.filter((step) => step.done).length;
  const next = steps.find((step) => !step.done);

  if (!next) return null;

  return (
    <section
      aria-labelledby="onboarding-title"
      className="overflow-hidden rounded-xl border bg-card shadow-[0_1px_2px_rgb(20_32_29/0.04)]">
      <header className="flex flex-wrap items-end justify-between gap-x-6 gap-y-3 border-b p-5">
        <div className="flex max-w-xl flex-col gap-1">
          <h2 id="onboarding-title" className="text-lg font-semibold tracking-tight">
            {t('title', { clinic: props.branchName })}
          </h2>
          <p className="text-sm text-muted-foreground">{t('lead')}</p>
        </div>
        <OnboardingProgress done={done} total={steps.length} />
      </header>

      <StepGroup
        title={t('companyGroup', { company: props.companyName })}
        hint={t('companyGroupHint')}
        steps={props.company}
        next={next}
        offset={0}
      />
      <StepGroup
        title={t('branchGroup', { branch: props.branchName })}
        steps={props.branch}
        next={next}
        offset={props.company.length}
      />
    </section>
  );
}

export function OnboardingProgress(props: { done: number; total: number }) {
  const t = useTranslations('onboarding');
  const label = t('progress', { done: props.done, total: props.total });

  return (
    <div className="flex w-full flex-col gap-1.5 sm:w-48">
      <p className="tabular text-xs font-medium text-muted-foreground sm:text-right">{label}</p>
      <div
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={props.total}
        aria-valuenow={props.done}
        aria-label={label}
        className="h-1.5 overflow-hidden rounded-full bg-muted">
        <div
          className="h-full rounded-full bg-primary transition-[width] duration-500 ease-out"
          style={{ width: `${(props.done / props.total) * 100}%` }}
        />
      </div>
    </div>
  );
}

type StepGroupProps = {
  title: string;
  hint?: string;
  steps: readonly SetupStep[];
  next: SetupStep;
  /** Numbering continues across groups. */
  offset: number;
};

function StepGroup(props: StepGroupProps) {
  const t = useTranslations('onboarding');

  return (
    <div className="border-b last:border-b-0">
      <p className="flex flex-wrap items-baseline gap-x-2 bg-muted/40 px-5 py-2 text-xs">
        <span className="font-semibold text-foreground">{props.title}</span>
        {props.hint && <span className="text-muted-foreground">{props.hint}</span>}
      </p>
      <ol className="divide-y">
        {props.steps.map((step, index) => {
          const isNext = step === props.next;

          return (
            <li
              key={step.key}
              className={cn('flex flex-wrap items-center gap-x-4 gap-y-3 px-5 py-4', isNext && 'bg-secondary/40')}>
              <StepMarker number={props.offset + index + 1} done={step.done} isNext={isNext} />
              <div className="flex min-w-0 flex-1 basis-56 flex-col gap-0.5">
                <p
                  className={cn(
                    'text-sm font-medium',
                    step.done && 'text-muted-foreground line-through decoration-muted-foreground/40',
                  )}>
                  {t(`steps.${step.key}.title`)}
                </p>
                {!step.done && <p className="text-[0.8125rem] text-muted-foreground">{t(`steps.${step.key}.body`)}</p>}
              </div>
              {!step.done && (
                <Link
                  href={step.href}
                  className={cn(
                    buttonVariants({ variant: isNext ? 'default' : 'outline', size: 'sm' }),
                    'group ml-11 sm:ml-0',
                  )}>
                  {t(`steps.${step.key}.cta`)}
                  <ArrowRightIcon className="transition-transform group-hover:translate-x-0.5" aria-hidden />
                </Link>
              )}
            </li>
          );
        })}
      </ol>
    </div>
  );
}

export function StepMarker(props: { number: number; done: boolean; isNext: boolean }) {
  const t = useTranslations('onboarding');

  return (
    <span
      className={cn(
        'tabular flex size-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold',
        props.done
          ? 'bg-primary text-primary-foreground'
          : props.isNext
            ? 'border-2 border-primary text-primary'
            : 'border border-input text-muted-foreground',
      )}>
      {props.done ? <CheckIcon className="size-3.5" aria-label={t('done')} /> : props.number}
    </span>
  );
}
