'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import {
  CheckIcon,
  CircleIcon,
  EyeIcon,
  EyeOffIcon,
  HeartPulseIcon,
  LoaderCircleIcon,
  LockIcon,
  XIcon,
} from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { useRef, useState } from 'react';
import { type Control, useForm, useWatch } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { FormField } from '@/components/ui/form-field';
import { Input } from '@/components/ui/input';
import { ROOT_DOMAIN, suggestSlug } from '@/lib/tenant';
import { cn } from '@/lib/utils';
import { useSignUp, useSlugAvailability } from './tenants.hooks';
import { type SignupInput, type SignupValues, signupSchema } from './tenants.lib';

/** The setup checklist the owner lands on (onboarding), previewed while they sign up. */
const PREVIEW_STEPS = ['polis', 'medicines', 'profile', 'doctors', 'schedules', 'team'] as const;

/** Signup: the clinic (name, subdomain) and its owner, beside a live preview of the clinic they are creating. */
export function TenantsSignupForm() {
  const t = useTranslations('tenants.signup');
  const locale = useLocale();
  // Bot checks: when the form appeared, and a field only bots fill (hidden from people and screen readers).
  const [startedAt] = useState(() => Date.now());
  const website = useRef<HTMLInputElement>(null);
  const signUp = useSignUp(() => ({ website: website.current?.value ?? '', startedAt }));
  // Until the person edits the subdomain, it follows the clinic name.
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
  const slug = useWatch({ control: form.control, name: 'slug' }) ?? '';
  const availability = useSlugAvailability(slug);
  const verdict = availability.settled ? availability.data : undefined;
  const taken = verdict?.status === 'taken';
  // Said while typing: taken, or a problem typing more will not fix ("too short" waits for submit).
  const liveError = taken
    ? 'tenants.errors.slugTaken'
    : verdict?.status === 'invalid' && !verdict.error.endsWith('.short')
      ? verdict.error
      : undefined;

  const companyName = form.register('company_name', {
    onChange: (event) => {
      if (!slugEdited)
        form.setValue('slug', suggestSlug(event.target.value), { shouldValidate: form.formState.isSubmitted });
    },
  });

  return (
    <div className="grid grid-cols-1 gap-12 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:gap-16">
      <form
        noValidate
        className="flex flex-col gap-8"
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
        <fieldset className="flex flex-col gap-5">
          <legend className="mb-4 text-[1.0625rem] font-semibold">{t('company')}</legend>
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
              className="h-10"
              aria-invalid={Boolean(errors.company_name)}
              {...companyName}
            />
          </FormField>

          <FormField
            label={t('branchName')}
            htmlFor="branch_name"
            error={errors.branch_name?.message}
            hint={t('branchNameHint')}>
            <Input
              id="branch_name"
              placeholder={t('branchNamePlaceholder')}
              className="h-10"
              aria-invalid={Boolean(errors.branch_name)}
              {...form.register('branch_name')}
            />
          </FormField>

          <FormField label={t('slug')} htmlFor="slug" error={errors.slug?.message ?? liveError} hint={t('slugHint')}>
            <div
              className={cn(
                'flex h-10 items-center overflow-hidden rounded-lg border border-input bg-card shadow-[0_1px_2px_rgb(20_32_29/0.04)] transition-[border-color,box-shadow] duration-150 focus-within:border-primary/60 focus-within:ring-3 focus-within:ring-primary/12',
                (errors.slug || liveError) && 'border-destructive ring-3 ring-destructive/12',
              )}>
              <input
                id="slug"
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
                placeholder="sehat-sentosa"
                aria-invalid={Boolean(errors.slug ?? liveError)}
                aria-describedby="slug-status"
                className="h-full min-w-0 flex-1 bg-transparent pl-3 text-base outline-none placeholder:text-muted-foreground/70 sm:text-sm"
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
        </fieldset>

        <fieldset className="flex flex-col gap-5">
          <legend className="mb-4 text-[1.0625rem] font-semibold">{t('you')}</legend>
          <FormField
            label={t('fullName')}
            htmlFor="full_name"
            error={errors.full_name?.message}
            hint={t('fullNameHint')}>
            <Input
              id="full_name"
              autoComplete="name"
              className="h-10"
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
              className="h-10"
              aria-invalid={Boolean(errors.email)}
              {...form.register('email')}
            />
          </FormField>
          <FormField label={t('password')} htmlFor="password" error={errors.password?.message} hint={t('passwordHint')}>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="new-password"
                className="h-10 pr-10"
                aria-invalid={Boolean(errors.password)}
                {...form.register('password')}
              />
              <button
                type="button"
                onClick={() => setShowPassword((shown) => !shown)}
                aria-label={showPassword ? t('hidePassword') : t('showPassword')}
                className="absolute inset-y-0 right-0 flex w-10 items-center justify-center text-muted-foreground transition-colors hover:text-foreground">
                {showPassword ? (
                  <EyeOffIcon className="size-4" aria-hidden />
                ) : (
                  <EyeIcon className="size-4" aria-hidden />
                )}
              </button>
            </div>
          </FormField>
        </fieldset>

        <div className="flex flex-col gap-3">
          {/* Busy until the clinic's page loads: success navigates to another host. */}
          <Button type="submit" size="lg" disabled={signUp.isPending || signUp.isSuccess}>
            {signUp.isPending || signUp.isSuccess ? (
              <>
                <LoaderCircleIcon className="animate-spin" aria-hidden />
                {t('creating')}
              </>
            ) : (
              t('submit')
            )}
          </Button>
          <p className="text-xs text-muted-foreground">{t('terms')}</p>
        </div>
      </form>

      <SignupPreview control={form.control} />
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
      ) : status === 'taken' ? (
        <span className="flex items-center gap-1 text-destructive">
          <XIcon className="size-3.5" aria-hidden />
          <span className="sr-only">{t('taken')}</span>
        </span>
      ) : (
        <XIcon className="size-3.5 text-destructive" aria-hidden />
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

/** The owner's first screen in miniature: their address, their clinic's name, the checklist waiting for them. */
function SignupPreview(props: { control: Control<SignupInput, unknown, SignupValues> }) {
  const t = useTranslations();
  const [companyName, branchName, slug, fullName] = useWatch({
    control: props.control,
    name: ['company_name', 'branch_name', 'slug', 'full_name'],
  });
  const firstName = (fullName ?? '').trim().split(/\s+/).slice(0, 2).join(' ');

  return (
    <aside aria-label={t('tenants.signup.preview.label')} className="hidden flex-col gap-4 lg:flex">
      <div className="sticky top-24 flex flex-col gap-4">
        <div
          aria-hidden
          className="overflow-hidden rounded-2xl border bg-card shadow-[0_1px_2px_rgb(20_32_29/0.04),0_24px_48px_-24px_rgb(15_47_40/0.25)]">
          {/* Browser bar with the clinic's own address. */}
          <div className="flex items-center gap-3 border-b bg-muted/60 px-4 py-2.5">
            <span className="flex gap-1.5">
              <span className="size-2.5 rounded-full bg-foreground/10" />
              <span className="size-2.5 rounded-full bg-foreground/10" />
              <span className="size-2.5 rounded-full bg-foreground/10" />
            </span>
            <span className="flex min-w-0 flex-1 items-center gap-1.5 rounded-md bg-card px-2.5 py-1 text-xs text-muted-foreground">
              <LockIcon className="size-3 shrink-0" />
              <span className="truncate">
                <span className="font-medium text-foreground">{slug || 'sehat-sentosa'}</span>.{ROOT_DOMAIN}
              </span>
            </span>
          </div>
          {/* The app's header bar. */}
          <div className="flex items-center gap-2.5 border-b px-4 py-3">
            <span className="flex size-7 items-center justify-center rounded-md bg-primary text-primary-foreground">
              <HeartPulseIcon className="size-4" />
            </span>
            {/* The real header's breadcrumb: the company, then the branch with its badge. */}
            <span className="flex min-w-0 items-center gap-1.5 text-sm">
              <span className="truncate text-muted-foreground">
                {companyName?.trim() || t('tenants.signup.preview.company')}
              </span>
              <span className="text-input">/</span>
              <span className="flex size-5 shrink-0 items-center justify-center rounded-md bg-primary text-[0.5625rem] font-semibold text-primary-foreground">
                {initialsOf(branchName ?? '')}
              </span>
              <span className="truncate font-semibold">{branchName?.trim() || t('tenants.signup.preview.branch')}</span>
            </span>
            <span className="ml-auto rounded-md bg-muted px-1.5 text-xs leading-5 font-medium text-muted-foreground">
              {t('tenants.signup.preview.owner')}
            </span>
          </div>
          <div className="flex flex-col gap-4 bg-background p-5">
            <p className="text-lg font-semibold tracking-tight">
              {t('tenants.signup.preview.greeting', { name: firstName || t('tenants.signup.preview.you') })}
            </p>
            <div className="flex flex-col overflow-hidden rounded-xl border bg-card">
              <p className="border-b px-4 py-2.5 text-xs font-semibold">{t('tenants.signup.preview.checklist')}</p>
              <ul className="divide-y">
                {PREVIEW_STEPS.map((step) => (
                  <li key={step} className="flex items-center gap-3 px-4 py-2.5 text-sm">
                    <CircleIcon className="size-4 shrink-0 text-muted-foreground/50" />
                    {t(`onboarding.steps.${step}.title`)}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
        <p className="text-center text-sm text-muted-foreground">{t('tenants.signup.preview.caption')}</p>
      </div>
    </aside>
  );
}
