'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { CheckIcon, EyeIcon, EyeOffIcon, HeartPulseIcon, LoaderCircleIcon, LockIcon, XIcon } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { type ReactNode, useRef, useState } from 'react';
import { type Control, useForm, useWatch } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { FormField } from '@/components/ui/form-field';
import { Input } from '@/components/ui/input';
import { JOURNEY } from '@/features/visits/visits.lib';
import { STATION_COLORS } from '@/features/visits/visits-journey-line';
import { ROOT_DOMAIN, suggestSlug } from '@/lib/tenant';
import { cn } from '@/lib/utils';
import { useSignUp, useSlugAvailability } from './tenants.hooks';
import { passwordStrength, type SignupInput, type SignupValues, signupSchema } from './tenants.lib';

type TenantsSignupFormProps = {
  /** Above the form: logo (phones), language, "sign in instead". */
  header: ReactNode;
};

/**
 * Signup as two numbered steps (the company, then its owner) beside a dark panel that shows, live, what is being
 * created: the address, the company with its first branch and room for more, and what the owner lands on.
 */
export function TenantsSignupForm(props: TenantsSignupFormProps) {
  const t = useTranslations('tenants.signup');
  const locale = useLocale();
  // Bot checks: when the form appeared, and a field only bots fill (hidden from people and screen readers).
  const [startedAt] = useState(() => Date.now());
  const website = useRef<HTMLInputElement>(null);
  const signUp = useSignUp(() => ({ website: website.current?.value ?? '', startedAt }));
  // Until the person edits the subdomain, it follows the company name.
  const [slugEdited, setSlugEdited] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const form = useForm<SignupInput, unknown, SignupValues>({
    resolver: zodResolver(signupSchema),
    defaultValues: {
      company_name: '',
      branch_name: t('branchNameDefault'),
      slug: '',
      full_name: '',
      email: '',
      password: '',
      locale,
    },
  });

  const { errors } = form.formState;
  const [slug = '', password = ''] = useWatch({ control: form.control, name: ['slug', 'password'] });
  const availability = useSlugAvailability(slug);
  const verdict = availability.settled ? availability.data : undefined;
  const taken = verdict?.status === 'taken';
  // Said while typing: taken, or a problem typing more will not fix ("too short" waits for submit).
  const liveError = taken
    ? 'tenants.errors.slugTaken'
    : verdict?.status === 'invalid' && !verdict.error.endsWith('.short')
      ? verdict.error
      : undefined;
  const busy = signUp.isPending || signUp.isSuccess;

  const companyName = form.register('company_name', {
    onChange: (event) => {
      if (!slugEdited)
        form.setValue('slug', suggestSlug(event.target.value), { shouldValidate: form.formState.isSubmitted });
    },
  });

  return (
    <div className="relative isolate min-h-dvh overflow-x-clip px-4 pt-[env(safe-area-inset-top)] pb-16 sm:px-6">
      {/* The landing's light: this is the marketing site, not a clinic's staff login. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 -top-48 -z-10 h-160 bg-[radial-gradient(45%_50%_at_50%_45%,rgb(23_115_92/0.16),transparent_70%)]"
      />
      <div className="mx-auto flex w-full max-w-6xl flex-col">
        {props.header}

        <div className="mx-auto flex max-w-2xl flex-col items-center gap-5 pt-8 text-center sm:pt-14">
          <h1 className="text-[2.25rem] leading-[1.05] font-semibold tracking-[-0.035em] text-balance sm:text-[3.25rem]">
            {t('title')}
          </h1>
          <p className="max-w-xl text-[1.0625rem] leading-relaxed text-pretty text-muted-foreground">{t('lead')}</p>
          <AddressChip slug={slug} availability={availability} />
        </div>

        <div className="mt-12 grid grid-cols-1 items-start gap-10 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)] lg:gap-12">
          <form
            noValidate
            className="flex flex-col gap-6 lg:order-first"
            onSubmit={form.handleSubmit((values) => {
              if (taken) return form.setError('slug', { message: 'tenants.errors.slugTaken' });

              signUp.mutate(values);
            })}>
            <input
              ref={website}
              type="text"
              name="website"
              tabIndex={-1}
              autoComplete="off"
              aria-hidden
              className="absolute -left-[9999px] size-px opacity-0"
            />

            <Step number={1} title={t('company')} hint={t('companyStepHint')}>
              <FormField
                label={t('companyName')}
                htmlFor="company_name"
                error={errors.company_name?.message}
                hint={t('companyNameHint')}>
                <Input
                  id="company_name"
                  autoFocus
                  autoComplete="organization"
                  placeholder={t('clinicNamePlaceholder')}
                  className="h-11"
                  aria-invalid={Boolean(errors.company_name)}
                  {...companyName}
                />
              </FormField>

              <FormField
                label={t('slug')}
                htmlFor="slug"
                error={errors.slug?.message ?? liveError}
                hint={t('slugHint')}>
                <div
                  className={cn(
                    'flex h-11 items-center overflow-hidden rounded-lg border border-input bg-card shadow-[0_1px_2px_rgb(20_32_29/0.04)] transition-[border-color,box-shadow] duration-150 focus-within:border-primary/60 focus-within:ring-3 focus-within:ring-primary/12',
                    (errors.slug || liveError) && 'border-destructive ring-3 ring-destructive/12',
                  )}>
                  <span className="hidden pl-3 text-sm text-muted-foreground sm:block">https://</span>
                  <input
                    id="slug"
                    autoCapitalize="none"
                    autoCorrect="off"
                    spellCheck={false}
                    placeholder="sentosa-medika"
                    aria-invalid={Boolean(errors.slug ?? liveError)}
                    aria-describedby="slug-status"
                    className="h-full min-w-0 flex-1 bg-transparent pl-3 text-base font-medium outline-none placeholder:font-normal placeholder:text-muted-foreground/70 sm:pl-0.5 sm:text-sm"
                    {...form.register('slug', {
                      onChange: (event) => {
                        setSlugEdited(true);
                        form.setValue('slug', event.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''));
                      },
                    })}
                  />
                  <span className="shrink-0 pr-2 text-sm text-muted-foreground">.{ROOT_DOMAIN}</span>
                  <SlugStatus slug={slug} availability={availability} />
                </div>
              </FormField>

              <FormField
                label={t('branchName')}
                htmlFor="branch_name"
                error={errors.branch_name?.message}
                hint={t('branchNameHint')}>
                <Input
                  id="branch_name"
                  placeholder={t('branchNamePlaceholder')}
                  className="h-11"
                  aria-invalid={Boolean(errors.branch_name)}
                  {...form.register('branch_name')}
                />
              </FormField>
            </Step>

            <Step number={2} title={t('you')} hint={t('youStepHint')}>
              <FormField
                label={t('fullName')}
                htmlFor="full_name"
                error={errors.full_name?.message}
                hint={t('fullNameHint')}>
                <Input
                  id="full_name"
                  autoComplete="name"
                  className="h-11"
                  aria-invalid={Boolean(errors.full_name)}
                  {...form.register('full_name')}
                />
              </FormField>
              <FormField label={t('email')} htmlFor="email" error={errors.email?.message} hint={t('emailHint')}>
                <Input
                  id="email"
                  type="email"
                  inputMode="email"
                  autoCapitalize="none"
                  autoCorrect="off"
                  autoComplete="email"
                  className="h-11"
                  aria-invalid={Boolean(errors.email)}
                  {...form.register('email')}
                />
              </FormField>
              <FormField label={t('password')} htmlFor="password" error={errors.password?.message}>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="new-password"
                    className="h-11 pr-11"
                    aria-invalid={Boolean(errors.password)}
                    aria-describedby="password-strength"
                    {...form.register('password')}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((shown) => !shown)}
                    aria-label={showPassword ? t('hidePassword') : t('showPassword')}
                    className="absolute inset-y-0 right-0 flex w-11 items-center justify-center text-muted-foreground transition-colors hover:text-foreground">
                    {showPassword ? (
                      <EyeOffIcon className="size-4" aria-hidden />
                    ) : (
                      <EyeIcon className="size-4" aria-hidden />
                    )}
                  </button>
                </div>
                <PasswordStrength password={password} />
              </FormField>
            </Step>

            <div className="flex flex-col gap-3">
              {/* Busy until the clinic's page loads: success navigates to another host. */}
              <Button type="submit" size="lg" disabled={busy} className="h-12 text-base">
                {busy ? (
                  <>
                    <LoaderCircleIcon className="animate-spin" aria-hidden />
                    {t('creating')}
                  </>
                ) : (
                  t('submit')
                )}
              </Button>
              <p className="text-center text-xs leading-relaxed text-muted-foreground">{t('terms')}</p>
            </div>
          </form>

          <SignupPreview control={form.control} />
        </div>
      </div>
    </div>
  );
}

type StepProps = {
  number: number;
  title: string;
  hint: string;
  children: ReactNode;
};

/** One of the two steps: a numbered card, because signing up is a sequence (the company, then you). */
function Step(props: StepProps) {
  return (
    <fieldset className="flex flex-col gap-5 rounded-2xl border bg-card p-5 shadow-[0_1px_2px_rgb(20_32_29/0.04)] sm:p-6">
      <legend className="sr-only">{props.title}</legend>
      <div aria-hidden className="flex items-center gap-3">
        <span className="tabular flex size-7 items-center justify-center rounded-full bg-foreground text-xs font-semibold text-background">
          {props.number}
        </span>
        <span className="flex flex-col">
          <span className="font-semibold leading-tight">{props.title}</span>
          <span className="text-[0.8125rem] text-muted-foreground">{props.hint}</span>
        </span>
      </div>
      {props.children}
    </fieldset>
  );
}

/** Three bars under the password: length, then letters and digits mixed, then a long one. */
function PasswordStrength(props: { password: string }) {
  const t = useTranslations('tenants.signup.strength');
  const score = passwordStrength(props.password);
  const label = (['empty', 'weak', 'fair', 'strong'] as const)[score];

  return (
    <div id="password-strength" className="flex items-center gap-3" aria-live="polite">
      <span className="flex flex-1 gap-1" aria-hidden>
        {[1, 2, 3].map((level) => (
          <span
            key={level}
            className={cn(
              'h-1 flex-1 rounded-full transition-colors duration-200',
              score >= level
                ? score === 1
                  ? 'bg-destructive'
                  : score === 2
                    ? 'bg-warning'
                    : 'bg-primary'
                : 'bg-muted',
            )}
          />
        ))}
      </span>
      <span className="w-28 text-right text-xs text-muted-foreground">{t(label)}</span>
    </div>
  );
}

type SlugStatusProps = {
  slug: string;
  availability: ReturnType<typeof useSlugAvailability>;
};

/** Inside the address field, on the right: checking, available, or taken. */
function SlugStatus(props: SlugStatusProps) {
  const t = useTranslations('tenants.signup');
  const { availability } = props;
  const status = availability.settled ? availability.data?.status : undefined;

  if (!props.slug) return null;

  return (
    <span
      id="slug-status"
      role="status"
      className="flex h-full shrink-0 items-center gap-1 border-l px-2.5 text-xs font-medium">
      {!availability.settled || availability.isFetching ? (
        <>
          <LoaderCircleIcon className="size-3.5 animate-spin text-muted-foreground" aria-hidden />
          <span className="sr-only">{t('checking')}</span>
        </>
      ) : status === 'available' ? (
        <span className="flex items-center gap-1 text-success">
          <CheckIcon className="size-3.5" aria-hidden />
          <span className="hidden sm:inline">{t('available')}</span>
        </span>
      ) : (
        <span className="flex items-center gap-1 text-destructive">
          <XIcon className="size-3.5" aria-hidden />
          <span className="sr-only">{status === 'taken' ? t('taken') : t('checking')}</span>
        </span>
      )}
    </span>
  );
}

/** "Cabang Depok" → "D": the branch badge, as in the header's switcher. */
function initialsOf(name: string) {
  return (
    name
      .replace(/^(klinik|cabang)\s+/i, '')
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((word) => word[0]?.toUpperCase())
      .join('') || '·'
  );
}

/** Under the title: the clinic's own web address, live, with its availability. The thing they are claiming. */
function AddressChip(props: { slug: string; availability: ReturnType<typeof useSlugAvailability> }) {
  const t = useTranslations('tenants.signup');
  const status = props.availability.settled ? props.availability.data?.status : undefined;
  const dot = !props.slug
    ? 'bg-input'
    : status === 'available'
      ? 'bg-primary'
      : status === 'taken' || status === 'invalid'
        ? 'bg-destructive'
        : 'bg-input animate-pulse';

  return (
    <div className="flex max-w-full items-center gap-2.5 rounded-full border bg-card/80 py-2 pr-4 pl-3 text-sm shadow-[0_1px_2px_rgb(20_32_29/0.05),0_12px_32px_-20px_rgb(15_47_40/0.35)] backdrop-blur">
      <span className={cn('size-2 shrink-0 rounded-full transition-colors', dot)} aria-hidden />
      <LockIcon className="size-3.5 shrink-0 text-muted-foreground" aria-hidden />
      <span className="truncate text-muted-foreground">
        https://<span className="font-semibold text-foreground">{props.slug || t('addressPlaceholder')}</span>.
        {ROOT_DOMAIN}
      </span>
    </div>
  );
}

/**
 * Beside the form (wide screens): the clinic they are creating, as it will look. The app's header breadcrumb, the
 * owner's greeting, and the company over its first branch with room for the next; then what matters to an owner.
 */
function SignupPreview(props: { control: Control<SignupInput, unknown, SignupValues> }) {
  const t = useTranslations('tenants.signup');
  const [companyName, branchName, fullName] = useWatch({
    control: props.control,
    name: ['company_name', 'branch_name', 'full_name'],
  });
  const company = companyName?.trim() || t('preview.company');
  const branch = branchName?.trim() || t('preview.branch');
  const firstName = (fullName ?? '').trim().split(/\s+/).slice(0, 2).join(' ');

  return (
    <aside aria-label={t('preview.label')} className="hidden lg:sticky lg:top-8 lg:flex lg:flex-col lg:gap-6">
      <div
        aria-hidden
        className="overflow-hidden rounded-2xl border bg-card shadow-[0_1px_2px_rgb(20_32_29/0.04),0_24px_48px_-28px_rgb(15_47_40/0.4)]">
        <div className="flex items-center gap-1.5 border-b px-4 py-3 text-sm">
          <span className="flex size-6 items-center justify-center rounded-md bg-primary text-primary-foreground">
            <HeartPulseIcon className="size-3.5" />
          </span>
          <span className="mx-1 text-input">/</span>
          <span className="truncate text-muted-foreground">{company}</span>
          <span className="text-input">/</span>
          <span className="flex size-5 shrink-0 items-center justify-center rounded-md bg-primary text-[0.5625rem] font-semibold text-primary-foreground">
            {initialsOf(branch)}
          </span>
          <span className="truncate font-semibold">{branch}</span>
        </div>
        <div className="flex flex-col gap-4 bg-background p-5">
          <p className="text-lg font-semibold tracking-tight">
            {t('preview.greeting', { name: firstName || t('preview.you') })}
          </p>
          <div className="flex flex-col gap-2 text-sm">
            <div className="flex items-center gap-2.5 rounded-lg bg-foreground px-3 py-2 text-background">
              <span className="size-2 rounded-full bg-primary" />
              <span className="truncate font-medium">{company}</span>
            </div>
            <div className="ml-4 flex flex-col gap-2 border-l border-input pl-4">
              <div className="flex items-center gap-2.5 rounded-lg border bg-card px-3 py-2">
                <span className="flex gap-0.5">
                  {JOURNEY.map((station) => (
                    <span
                      key={station.status}
                      className={cn('size-1.5 rounded-full', STATION_COLORS[station.status].line)}
                    />
                  ))}
                </span>
                <span className="truncate font-medium">{branch}</span>
                <span className="ml-auto shrink-0 text-xs text-primary">{t('preview.yours')}</span>
              </div>
              <div className="rounded-lg border border-dashed border-input px-3 py-2 text-muted-foreground">
                + {t('preview.nextBranch')}
              </div>
            </div>
          </div>
        </div>
      </div>

      <ul className="flex flex-col gap-3 px-1 text-sm text-muted-foreground">
        {(['browser', 'data', 'branches'] as const).map((key) => (
          <li key={key} className="flex items-start gap-2.5">
            <CheckIcon className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />
            {t(`preview.facts.${key}`)}
          </li>
        ))}
      </ul>
    </aside>
  );
}
