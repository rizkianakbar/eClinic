'use client';

import { ArrowRightIcon, LoaderCircleIcon } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { useSwitchBranch } from '@/features/branches/branches.hooks';
import type { SetupStep } from '@/features/onboarding/onboarding.lib';
import { OnboardingProgress, StepMarker } from '@/features/onboarding/onboarding-checklist';
import { cn } from '@/lib/utils';

type CompanySetupProps = {
  companyName: string;
  /** The company's own steps (shared catalogue). */
  company: readonly SetupStep[];
  /** Each open branch and its steps. */
  branches: { id: string; name: string; steps: readonly SetupStep[] }[];
};

/**
 * The company's setup at a glance: its own steps once, then every branch that is not ready yet. The catalogue is
 * edited inside a branch, so a company step opens the first branch at that settings page; a branch row opens the
 * branch, whose Beranda lists its own steps. Renders nothing once everything is ready.
 */
export function CompanySetup(props: CompanySetupProps) {
  const t = useTranslations('onboarding');
  const all = [...props.company, ...props.branches.flatMap((branch) => branch.steps)];
  const done = all.filter((step) => step.done).length;
  const pending = props.branches.filter((branch) => branch.steps.some((step) => !step.done));
  const nextCompany = props.company.find((step) => !step.done);
  const firstBranchId = props.branches[0]?.id;

  if (done === all.length) return null;

  return (
    <section
      aria-labelledby="company-setup-title"
      className="overflow-hidden rounded-xl border bg-card shadow-[0_1px_2px_rgb(20_32_29/0.04)]">
      <header className="flex flex-wrap items-end justify-between gap-x-6 gap-y-3 border-b p-5">
        <div className="flex max-w-xl flex-col gap-1">
          <h2 id="company-setup-title" className="text-lg font-semibold tracking-tight">
            {t('title', { clinic: props.companyName })}
          </h2>
          <p className="text-sm text-muted-foreground">{t('companyLead')}</p>
        </div>
        <OnboardingProgress done={done} total={all.length} />
      </header>

      {nextCompany && firstBranchId && (
        <div className="border-b">
          <p className="flex flex-wrap items-baseline gap-x-2 bg-muted/40 px-5 py-2 text-xs">
            <span className="font-semibold text-foreground">{t('companyGroup', { company: props.companyName })}</span>
            <span className="text-muted-foreground">{t('companyGroupHint')}</span>
          </p>
          <ol className="divide-y">
            {props.company.map((step, index) => (
              <li
                key={step.key}
                className={cn(
                  'flex flex-wrap items-center gap-x-4 gap-y-3 px-5 py-4',
                  step === nextCompany && 'bg-secondary/40',
                )}>
                <StepMarker number={index + 1} done={step.done} isNext={step === nextCompany} />
                <div className="flex min-w-0 flex-1 basis-56 flex-col gap-0.5">
                  <p
                    className={cn(
                      'text-sm font-medium',
                      step.done && 'text-muted-foreground line-through decoration-muted-foreground/40',
                    )}>
                    {t(`steps.${step.key}.title`)}
                  </p>
                  {!step.done && (
                    <p className="text-[0.8125rem] text-muted-foreground">{t(`steps.${step.key}.body`)}</p>
                  )}
                </div>
                {!step.done && (
                  <OpenInBranch
                    clinicId={firstBranchId}
                    next={step.href}
                    label={t(`steps.${step.key}.cta`)}
                    primary={step === nextCompany}
                  />
                )}
              </li>
            ))}
          </ol>
        </div>
      )}

      {pending.length > 0 && (
        <div>
          <p className="bg-muted/40 px-5 py-2 text-xs font-semibold">{t('branchesGroup')}</p>
          <ul className="divide-y">
            {pending.map((branch) => {
              const ready = branch.steps.filter((step) => step.done).length;
              const missing = branch.steps.filter((step) => !step.done).map((step) => t(`steps.${step.key}.title`));

              return (
                <li key={branch.id} className="flex flex-wrap items-center gap-x-4 gap-y-3 px-5 py-4">
                  <div className="flex min-w-0 flex-1 basis-64 flex-col gap-1.5">
                    <p className="flex items-baseline justify-between gap-3 text-sm">
                      <span className="truncate font-medium">{branch.name}</span>
                      <span className="tabular shrink-0 text-xs text-muted-foreground">
                        {t('branchReady', { done: ready, total: branch.steps.length })}
                      </span>
                    </p>
                    <span className="flex gap-1" aria-hidden>
                      {branch.steps.map((step) => (
                        <span
                          key={step.key}
                          className={cn('h-1 flex-1 rounded-full', step.done ? 'bg-primary' : 'bg-muted')}
                        />
                      ))}
                    </span>
                    <p className="text-[0.8125rem] text-muted-foreground">
                      {t('missing', { steps: missing.join(', ') })}
                    </p>
                  </div>
                  <OpenInBranch
                    clinicId={branch.id}
                    next="/dashboard"
                    label={t('setUpBranch')}
                    primary={!nextCompany}
                  />
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </section>
  );
}

/** Enters a branch and opens `next` there (a full reload: the branch's live data starts fresh). */
function OpenInBranch(props: { clinicId: string; next: string; label: string; primary: boolean }) {
  const open = useSwitchBranch(props.next);
  const busy = open.isPending || open.isSuccess;

  return (
    <Button
      size="sm"
      variant={props.primary ? 'default' : 'outline'}
      disabled={busy}
      onClick={() => open.mutate(props.clinicId)}
      className="group ml-11 sm:ml-0">
      {props.label}
      {busy ? (
        <LoaderCircleIcon className="animate-spin" aria-hidden />
      ) : (
        <ArrowRightIcon className="transition-transform group-hover:translate-x-0.5" aria-hidden />
      )}
    </Button>
  );
}
