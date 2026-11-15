import type { Metadata } from 'next';
import { getLocale, getTranslations } from 'next-intl/server';
import { SiteLanding } from '@/features/site/site';
import { SiteFooter, SiteHeader } from '@/features/site/site-chrome';
import { jsonLd, pageSeo, SITE_ORIGIN } from '@/features/site/site-seo';
import { JOURNEY } from '@/features/visits/visits.constants';
import { isLocale } from '@/i18n/locales';

export async function generateMetadata(): Promise<Metadata> {
  const [t, locale] = await Promise.all([getTranslations('site.meta'), getLocale()]);

  return {
    ...pageSeo({
      title: t('title'),
      description: t('description'),
      path: '/',
      locale: isLocale(locale) ? locale : 'id',
      imageAlt: t('ogAlt'),
    }),
    // The home title stands alone (no "· e-clinic" suffix twice).
    title: { absolute: t('title') },
  };
}

export default async function SiteHomePage() {
  const t = await getTranslations();
  const locale = await getLocale();
  const home = SITE_ORIGIN.toString();
  const id = (fragment: string) => `${home}#${fragment}`;

  // One graph, linked by @id: who makes it, the site, the product, and this page. No Offer (no public pricing yet)
  // and no FAQPage (Google retired FAQ rich results): only what the page states and can stand behind.
  const graph = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Organization',
        '@id': id('organization'),
        name: 'e-clinic',
        url: home,
        logo: { '@type': 'ImageObject', url: new URL('/icon.svg', home).toString() },
      },
      {
        '@type': 'WebSite',
        '@id': id('website'),
        url: home,
        name: 'e-clinic',
        inLanguage: ['id-ID', 'en'],
        publisher: { '@id': id('organization') },
      },
      {
        '@type': 'SoftwareApplication',
        '@id': id('software'),
        name: 'e-clinic',
        url: home,
        applicationCategory: 'BusinessApplication',
        operatingSystem: 'Web browser',
        inLanguage: ['id-ID', 'en'],
        description: t('site.meta.description'),
        // The five desks of a visit, as the page describes them.
        featureList: JOURNEY.map((station) => t(`site.journey.stations.${station.status}.title`)),
        publisher: { '@id': id('organization') },
      },
      {
        '@type': 'WebPage',
        '@id': id('webpage'),
        url: home,
        name: t('site.meta.title'),
        description: t('site.meta.description'),
        inLanguage: locale === 'en' ? 'en' : 'id-ID',
        isPartOf: { '@id': id('website') },
        about: { '@id': id('software') },
        primaryImageOfPage: { '@type': 'ImageObject', url: new URL('/opengraph-image', home).toString() },
      },
    ],
  };

  return (
    <>
      {/* biome-ignore lint/security/noDangerouslySetInnerHtml: JSON-LD must be raw script text (Next.js's documented way); jsonLd() escapes "<", so no value can close the tag. */}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(graph) }} />
      <SiteHeader />
      <main className="flex-1">
        <SiteLanding />
      </main>
      <SiteFooter />
    </>
  );
}
