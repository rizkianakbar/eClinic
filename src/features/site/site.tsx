import Image, { type StaticImageData } from 'next/image';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import type { ReactNode } from 'react';
import { buttonVariants } from '@/components/ui/button';
import { JOURNEY, type JourneyStatus } from '@/features/visits/visits.lib';
import { STATION_COLORS } from '@/features/visits/visits-journey-line';
import { ROOT_DOMAIN } from '@/lib/tenant';
import { cn } from '@/lib/utils';
import cashierShot from '../../../public/landing/cashier.png';
import dispenseShot from '../../../public/landing/dispense.png';
import examShot from '../../../public/landing/exam.png';
import ownerShot from '../../../public/landing/owner-phone.png';
import queueShot from '../../../public/landing/queue.png';
import { ACCESS, ACCESS_ROLES } from './site.lib';
import { DEMO_URL } from './site-chrome';
import { SiteHeroVisual } from './site-hero-visual';
import { SiteJourneyBoard } from './site-journey-board';

/**
 * The marketing home page. It sells the product by showing it: a live queue board, then one visit through the
 * five stations with the real screen of each (captured from the demo clinic), then who may see what.
 */
export function SiteLanding() {
  return (
    <>
      <Hero />
      <Journey />
      <Branches />
      <Access />
      <Data />
      <Faq />
      <Closing />
    </>
  );
}

type SectionHeadingProps = {
  title: string;
  lead?: string;
};

function SectionHeading(props: SectionHeadingProps) {
  return (
    <header className="flex max-w-2xl flex-col gap-4">
      <h2 className="text-[2rem] leading-[1.1] font-semibold tracking-[-0.02em] text-balance sm:text-[2.5rem]">
        {props.title}
      </h2>
      {props.lead && <p className="text-[1.0625rem] leading-relaxed text-pretty text-muted-foreground">{props.lead}</p>}
    </header>
  );
}

function Ctas() {
  const t = useTranslations('site.hero');

  return (
    <div className="flex flex-wrap items-center gap-3">
      <Link href="/signup" className={buttonVariants({ size: 'lg' })}>
        {t('primary')}
      </Link>
      <a href={DEMO_URL} className={buttonVariants({ variant: 'outline', size: 'lg' })}>
        {t('secondary')}
      </a>
    </div>
  );
}

// Hero -----------------------------------------------------------------------------------------

function Hero() {
  const t = useTranslations('site.hero');

  return (
    // overflow-x-clip: the product shot bleeds past the right edge without ever widening the page.
    <section className="relative isolate overflow-x-clip px-4 pt-14 pb-20 sm:px-6 sm:pt-16 sm:pb-28">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 -top-40 -z-10 h-[46rem] bg-[radial-gradient(40%_45%_at_72%_40%,rgb(23_115_92/0.14),transparent_70%)]"
      />
      <div className="mx-auto flex max-w-6xl flex-col gap-16 lg:gap-20">
        <div className="grid grid-cols-1 items-center gap-14 lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)] lg:gap-10">
          <div className="flex flex-col gap-7">
            <h1 className="text-[2.5rem] leading-[1.04] font-semibold tracking-[-0.035em] text-balance sm:text-[3.25rem] lg:text-[3.5rem]">
              {t('title')}
            </h1>
            <p className="max-w-xl text-[1.0625rem] leading-relaxed text-pretty text-muted-foreground sm:text-lg">
              {t('lead')}
            </p>
            <div className="flex flex-col gap-4">
              <Ctas />
              <p className="max-w-md text-sm leading-relaxed text-muted-foreground">{t('demoNote')}</p>
            </div>
          </div>
          <SiteHeroVisual />
        </div>

        <div className="flex flex-col gap-4">
          <p className="text-sm font-medium text-muted-foreground">{t('boardIntro')}</p>
          <SiteJourneyBoard />
        </div>
      </div>
    </section>
  );
}

// One visit, five desks ------------------------------------------------------------------------------

const SCREENS: Record<JourneyStatus, StaticImageData> = {
  waiting: queueShot,
  in_exam: examShot,
  to_pharmacy: dispenseShot,
  to_cashier: cashierShot,
  done: ownerShot,
};

function Journey() {
  const t = useTranslations();

  return (
    <section id="alur" className="scroll-mt-20 border-t bg-card px-4 py-20 sm:px-6 sm:py-28">
      <div className="mx-auto flex max-w-6xl flex-col gap-16">
        <SectionHeading title={t('site.journey.title')} lead={t('site.journey.lead')} />
        <ol className="flex flex-col">
          {JOURNEY.map((station, index) => (
            <Station key={station.status} status={station.status} last={index === JOURNEY.length - 1} />
          ))}
        </ol>
      </div>
    </section>
  );
}

type StationProps = {
  status: JourneyStatus;
  last: boolean;
};

/** One desk of the visit: its place on the journey line, what happens there, and the real screen. */
function Station(props: StationProps) {
  const t = useTranslations();
  const color = STATION_COLORS[props.status];
  const key = `site.journey.stations.${props.status}` as const;
  const phone = props.status === 'done';

  return (
    <li className="relative grid grid-cols-[1.25rem_minmax(0,1fr)] gap-x-5 pb-16 last:pb-0 sm:gap-x-8 lg:grid-cols-[1.25rem_minmax(0,5fr)_minmax(0,7fr)] lg:gap-x-12 lg:pb-24">
      {/* The journey line: each station's colour runs down to the next station, as on the visit pages. */}
      <span aria-hidden className="relative row-span-2 flex justify-center lg:row-span-1">
        <span className={cn('relative z-10 mt-1 size-3.5 rounded-full ring-4 ring-card', color.line)} />
        {!props.last && (
          <span className={cn('absolute top-2 -bottom-16 w-0.75 rounded-full lg:-bottom-24', color.line)} />
        )}
      </span>

      <div className="flex max-w-md flex-col gap-4 pb-8 lg:pb-0">
        <p className={cn('text-sm font-semibold', color.text)}>{t(`journey.${props.status}.label`)}</p>
        <h3 className="text-[1.5rem] leading-tight font-semibold tracking-[-0.015em] text-balance">
          {t(`${key}.title`)}
        </h3>
        <p className="leading-relaxed text-pretty text-muted-foreground">{t(`${key}.body`)}</p>
        <dl className="flex flex-wrap gap-x-2 text-sm">
          <dt className="text-muted-foreground">{t('site.journey.who')}</dt>
          <dd className="font-medium">{t(`${key}.who`)}</dd>
        </dl>
      </div>

      <figure className={cn('col-start-2 lg:col-start-3', phone && 'flex justify-center lg:justify-start')}>
        {phone ? (
          // A phone: the dark bezel is padding around the screen, so it never covers the screenshot.
          <div className="w-72 rounded-[2.5rem] bg-foreground p-2.5 shadow-[0_24px_48px_-24px_rgb(15_47_40/0.45)]">
            <Image
              src={SCREENS[props.status]}
              alt={t(`${key}.alt`)}
              sizes="268px"
              className="h-auto w-full rounded-[1.875rem]"
            />
          </div>
        ) : (
          <Image
            src={SCREENS[props.status]}
            alt={t(`${key}.alt`)}
            sizes="(min-width: 1152px) 640px, (min-width: 1024px) 56vw, calc(100vw - 5rem)"
            className="h-auto w-full rounded-xl border bg-card shadow-[0_1px_2px_rgb(20_32_29/0.04),0_20px_40px_-24px_rgb(15_47_40/0.28)]"
          />
        )}
      </figure>
    </li>
  );
}

// One company, many branches ------------------------------------------------------------------

/** Sample branches for the diagram (fictional), each with its own queue right now. */
const SAMPLE_BRANCHES = [
  { name: 'Cabang Depok', counts: { waiting: 4, in_exam: 1, to_pharmacy: 2, to_cashier: 1, done: 18 } },
  { name: 'Cabang Bogor', counts: { waiting: 2, in_exam: 1, to_pharmacy: 0, to_cashier: 1, done: 9 } },
] as const;

const SHARED = ['patients', 'staff', 'catalog', 'overview'] as const;
const OWN = ['queue', 'stock', 'cashier', 'schedule'] as const;

function Branches() {
  const t = useTranslations();

  return (
    <section id="cabang" className="scroll-mt-20 border-t px-4 py-20 sm:px-6 sm:py-28">
      <div className="mx-auto flex max-w-6xl flex-col gap-14">
        <SectionHeading title={t('site.branches.title')} lead={t('site.branches.lead')} />

        {/* The company above its branches, as the owner sees it in the app. */}
        <div aria-hidden className="flex flex-col items-center">
          <div className="flex items-center gap-3 rounded-xl bg-foreground px-5 py-3.5 text-background shadow-[0_16px_32px_-20px_rgb(15_47_40/0.6)]">
            <span className="flex size-8 items-center justify-center rounded-lg bg-primary text-[0.6875rem] font-semibold text-primary-foreground">
              SM
            </span>
            <span className="flex flex-col">
              <span className="text-sm font-semibold">Sentosa Medika Group</span>
              <span className="text-xs text-background/60">{t('site.branches.company')}</span>
            </span>
          </div>
          <span className="h-8 w-px bg-input" />
          <div className="relative grid w-full grid-cols-1 gap-4 sm:grid-cols-3">
            <span className="absolute inset-x-[16.6%] top-0 hidden border-t border-input sm:block" />
            {SAMPLE_BRANCHES.map((branch) => (
              <div key={branch.name} className="flex flex-col items-center">
                <span className="hidden h-6 w-px bg-input sm:block" />
                <div className="flex w-full flex-col gap-3 rounded-xl border bg-card p-4 shadow-[0_1px_2px_rgb(20_32_29/0.04)]">
                  <span className="flex items-center gap-2 text-sm font-semibold">
                    <span className="flex size-5 items-center justify-center rounded-md bg-muted text-[0.5625rem] font-semibold text-foreground/70">
                      {branch.name.split(' ')[1]?.[0]}
                    </span>
                    {branch.name}
                  </span>
                  <span className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
                    {JOURNEY.map((station) => (
                      <span key={station.status} className="flex items-center gap-1.5">
                        <span className={cn('size-1.5 rounded-full', STATION_COLORS[station.status].line)} />
                        <span className="tabular font-semibold text-foreground">{branch.counts[station.status]}</span>
                      </span>
                    ))}
                  </span>
                  <span className="text-xs text-muted-foreground">{t('site.branches.ownQueue')}</span>
                </div>
              </div>
            ))}
            <div className="flex flex-col items-center">
              <span className="hidden h-6 w-px bg-input sm:block" />
              <div className="flex h-full min-h-28 w-full flex-col items-center justify-center gap-1 rounded-xl border border-dashed border-input p-4 text-center text-sm text-muted-foreground">
                <span className="text-lg leading-none">+</span>
                {t('site.branches.next')}
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-10 md:grid-cols-2">
          <BranchList
            title={t('site.branches.sharedTitle')}
            items={SHARED.map((key) => t(`site.branches.shared.${key}`))}
          />
          <BranchList title={t('site.branches.ownTitle')} items={OWN.map((key) => t(`site.branches.own.${key}`))} />
        </div>
      </div>
    </section>
  );
}

function BranchList(props: { title: string; items: string[] }) {
  return (
    <div className="flex flex-col gap-4">
      <h3 className="font-semibold">{props.title}</h3>
      <ul className="flex flex-col divide-y border-y">
        {props.items.map((item) => (
          <li key={item} className="py-3 leading-relaxed text-muted-foreground">
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}

// Who sees what ------------------------------------------------------------------------------------

function Access() {
  const t = useTranslations();

  return (
    <section id="akses" className="scroll-mt-20 border-t px-4 py-20 sm:px-6 sm:py-28">
      <div className="mx-auto flex max-w-6xl flex-col gap-12">
        <SectionHeading title={t('site.access.title')} lead={t('site.access.lead')} />
        <div className="relative overflow-x-auto rounded-xl border bg-card">
          <table className="w-full min-w-176 border-collapse text-sm">
            <caption className="sr-only">{t('site.access.caption')}</caption>
            <thead>
              <tr className="border-b">
                <th scope="col" className="px-5 py-3.5 text-left font-medium text-muted-foreground">
                  {t('site.access.action')}
                </th>
                {ACCESS_ROLES.map((role) => (
                  <th key={role} scope="col" className="px-3 py-3.5 text-center font-medium">
                    {t(`roles.${role}`)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y">
              {ACCESS.map((row) => (
                <tr key={row.key}>
                  <th scope="row" className="px-5 py-3.5 text-left font-normal">
                    {t(`site.access.rows.${row.key}`)}
                  </th>
                  {ACCESS_ROLES.map((role) => {
                    const allowed = (row.roles as readonly string[]).includes(role);

                    return (
                      <td key={role} className="px-3 py-3.5 text-center">
                        <span
                          aria-hidden
                          className={cn(
                            'inline-block size-2.5 rounded-full',
                            allowed ? 'bg-primary' : 'border border-input',
                          )}
                        />
                        <span className="sr-only">{allowed ? t('site.access.allowed') : t('site.access.denied')}</span>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}

// Data -----------------------------------------------------------------------------------------

const DATA_ITEMS = ['export', 'backup', 'audit', 'idle', 'integrations', 'browser'] as const;

function Data() {
  const t = useTranslations('site.data');

  return (
    <section id="data" className="scroll-mt-20 border-t bg-card px-4 py-20 sm:px-6 sm:py-28">
      <div className="mx-auto grid max-w-6xl grid-cols-1 gap-12 lg:grid-cols-[minmax(0,4fr)_minmax(0,8fr)]">
        <SectionHeading title={t('title')} />
        <dl className="grid grid-cols-1 gap-x-12 gap-y-9 sm:grid-cols-2">
          {DATA_ITEMS.map((item) => (
            <div key={item} className="flex flex-col gap-1.5">
              <dt className="font-semibold">{t(`items.${item}.term`)}</dt>
              <dd className="leading-relaxed text-muted-foreground">{t(`items.${item}.body`)}</dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}

// FAQ --------------------------------------------------------------------------------------------

const FAQ = ['setup', 'branches', 'migrate', 'offline', 'domain'] as const;

function Faq() {
  const t = useTranslations('site.faq');

  return (
    <section id="faq" className="scroll-mt-20 border-t px-4 py-20 sm:px-6 sm:py-28">
      <div className="mx-auto grid max-w-6xl grid-cols-1 gap-12 lg:grid-cols-[minmax(0,4fr)_minmax(0,8fr)]">
        <SectionHeading title={t('title')} />
        <div className="divide-y border-y">
          {FAQ.map((key) => (
            <Question key={key} question={t(`items.${key}.q`)}>
              {t(`items.${key}.a`, { domain: ROOT_DOMAIN })}
            </Question>
          ))}
        </div>
      </div>
    </section>
  );
}

function Question(props: { question: string; children: ReactNode }) {
  return (
    <details className="disclose group">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-6 py-5 font-medium [&::-webkit-details-marker]:hidden">
        {props.question}
        <span
          aria-hidden
          className="relative size-3 shrink-0 text-muted-foreground before:absolute before:inset-x-0 before:top-1/2 before:h-px before:-translate-y-1/2 before:bg-current after:absolute after:inset-y-0 after:left-1/2 after:w-px after:-translate-x-1/2 after:bg-current after:transition-transform after:duration-200 group-open:after:scale-y-0"
        />
      </summary>
      <p className="max-w-2xl pb-6 leading-relaxed text-muted-foreground">{props.children}</p>
    </details>
  );
}

// Close ----------------------------------------------------------------------------------------

function Closing() {
  const t = useTranslations('site.closing');

  return (
    <section className="border-t bg-card px-4 py-20 sm:px-6 sm:py-28">
      <div className="mx-auto flex max-w-6xl flex-col gap-8">
        <SectionHeading title={t('title')} lead={t('lead')} />
        <Ctas />
      </div>
    </section>
  );
}
