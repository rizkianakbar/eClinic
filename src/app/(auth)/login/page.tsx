import { ChevronDownIcon, HeartPulseIcon } from 'lucide-react';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { listTestAccounts } from '@/features/auth/auth.service';
import { AuthDemoPicker } from '@/features/auth/auth-demo-picker';
import { LoginForm } from '@/features/auth/auth-login-form';
import { getOrganizationBySlug } from '@/features/tenants/tenants.service';
import { JOURNEY } from '@/features/visits/visits.constants';
import { getHostTenant } from '@/lib/auth';
import { createAdminClient } from '@/lib/supabase/admin';
import { DEMO_SLUG, siteUrl } from '@/lib/tenant';
import { cn } from '@/lib/utils';

export async function generateMetadata(): Promise<Metadata> {
  // A clinic's own address stays out of search: indexing every tenant's login would publish the customer list.
  return { title: (await getTranslations('auth.login'))('title'), robots: { index: false, follow: false } };
}

const STATION_DOTS = ['#d4952b', '#3a7bd5', '#7a5bd1', '#22936f', '#8fa29d'];

export default async function LoginPage(props: PageProps<'/login'>) {
  const { reason } = await props.searchParams;

  const tenant = await getHostTenant();
  const admin = createAdminClient();
  const clinic = tenant.kind === 'clinic' ? await getOrganizationBySlug(admin, tenant.slug) : null;

  // A subdomain no organization has claimed.
  if (!clinic) notFound();

  const testAccounts = await listTestAccounts(admin, clinic.id, clinic.slug);
  // The demo clinic with its one-click accounts: the page invites a visitor to try a desk first.
  const demo = testAccounts.length > 0;

  const t = await getTranslations();

  return (
    <main className="grid grid-cols-1 min-h-dvh bg-background lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
      <section className="relative hidden flex-col justify-between overflow-hidden bg-[radial-gradient(120%_80%_at_0%_0%,#1d5c4c_0%,#0f2f28_55%,#0b221d_100%)] p-12 text-white lg:flex">
        <a href={siteUrl()} className="flex items-center gap-2.5 self-start">
          <span className="flex size-9 items-center justify-center rounded-lg bg-white/10 ring-1 ring-white/15">
            <HeartPulseIcon className="size-5" aria-hidden />
          </span>
          <span className="font-semibold">eClinic</span>
        </a>

        <div className="flex max-w-md flex-col gap-10">
          <p className="text-[2rem] leading-[1.15] font-semibold tracking-tight">{t('auth.login.tagline')}</p>
          {/* The patient journey, the idea the whole app is built around. */}
          <ol className="grid grid-cols-5" aria-hidden>
            {JOURNEY.map((station, index) => (
              <li key={station.status} className="relative flex flex-col items-center gap-2.5 text-center">
                {index < JOURNEY.length - 1 && (
                  <span
                    className="absolute top-1.5 left-1/2 h-0.5 w-full -translate-y-1/2"
                    style={{ background: STATION_DOTS[index] }}
                  />
                )}
                <span
                  className="relative size-3 rounded-full ring-4 ring-[#0f2f28]"
                  style={{ background: STATION_DOTS[index] }}
                />
                <span className="text-xs text-white/70">{t(`journey.${station.status}.short`)}</span>
              </li>
            ))}
          </ol>
        </div>

        <p className="text-sm text-white/55">{t('auth.login.modules')}</p>
      </section>

      <section className="flex items-start justify-center px-6 pt-[max(3rem,env(safe-area-inset-top))] pb-10 sm:px-10 lg:items-center">
        <div className={cn('flex w-full flex-col gap-7', demo ? 'max-w-md' : 'max-w-sm')}>
          <div className="flex items-center gap-2.5 lg:hidden">
            <span className="flex size-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <HeartPulseIcon className="size-5" aria-hidden />
            </span>
            <span className="font-semibold">eClinic</span>
          </div>
          <div className="flex flex-col gap-1.5">
            <p className="text-sm font-medium text-primary">{demo ? t('auth.demo.eyebrow') : clinic.name}</p>
            <h1 className="text-[1.75rem] leading-tight font-semibold tracking-tight">
              {demo ? t('auth.demo.title') : t('auth.login.title')}
            </h1>
            <p className="text-sm text-muted-foreground">{demo ? t('auth.demo.lead') : t('auth.login.subtitle')}</p>
          </div>
          {reason === 'link' && (
            <p
              role="status"
              className="rounded-lg border border-status-waiting/20 bg-status-waiting-soft px-3.5 py-3 text-sm text-status-waiting">
              {t('auth.login.linkExpired')}
            </p>
          )}
          {reason === 'idle' && (
            <p
              role="status"
              className="rounded-lg border border-status-waiting/20 bg-status-waiting-soft px-3.5 py-3 text-sm text-status-waiting">
              {t('auth.login.idle')}
            </p>
          )}
          {demo ? (
            <>
              <AuthDemoPicker accounts={testAccounts} />
              {/* Staff of the demo still sign in with email; for a visitor it is the second choice. */}
              <details className="disclose group rounded-xl border bg-card">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 text-sm font-medium [&::-webkit-details-marker]:hidden">
                  {t('auth.demo.withEmail')}
                  <ChevronDownIcon
                    className="size-4 text-muted-foreground transition-transform group-open:rotate-180"
                    aria-hidden
                  />
                </summary>
                <div className="flex flex-col gap-4 border-t px-4 pt-4 pb-4">
                  <LoginForm />
                </div>
              </details>
            </>
          ) : (
            <>
              <LoginForm />
              <p className="text-[0.8125rem] text-muted-foreground">{t('auth.login.forgot')}</p>
            </>
          )}
          <p className="border-t pt-5 text-[0.8125rem] text-muted-foreground">
            {clinic.slug === DEMO_SLUG ? t('auth.login.demoNote') : t('auth.login.otherClinic')}{' '}
            <a
              href={siteUrl(clinic.slug === DEMO_SLUG ? '/signup' : '/login')}
              className="font-medium text-primary hover:underline">
              {clinic.slug === DEMO_SLUG ? t('auth.login.demoCta') : t('auth.login.otherClinicCta')}
            </a>
          </p>
        </div>
      </section>
    </main>
  );
}
