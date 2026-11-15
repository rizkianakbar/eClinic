import type { Metadata } from 'next';
import { siteUrl } from '@/lib/tenant';

/** The marketing site's absolute origin: canonical URLs, Open Graph and JSON-LD all resolve against it. */
export const SITE_ORIGIN = new URL(siteUrl('/'));

export const OG_LOCALE = { id: 'id_ID', en: 'en_US' } as const;

/** The link preview (src/app/opengraph-image.tsx), 1200×630. */
const OG_IMAGE = { url: '/opengraph-image', width: 1200, height: 630, type: 'image/png' };

type PageSeo = {
  title: string;
  description: string;
  /** Path on the marketing site, e.g. '/signup'. */
  path: string;
  locale: 'id' | 'en';
  /** What the link preview shows, for screen readers in chat apps and social feeds. */
  imageAlt: string;
};

/**
 * One page's metadata: canonical, robots, Open Graph and Twitter in step. Pages render in the visitor's language at
 * one URL (no per-language URLs), so there is no hreflang: the canonical is the URL itself. The preview image is
 * named explicitly: a page's own `openGraph` replaces the file-based one instead of merging with it.
 */
export function pageSeo(page: PageSeo): Metadata {
  const url = new URL(page.path, SITE_ORIGIN).toString();
  const image = { ...OG_IMAGE, alt: page.imageAlt };

  return {
    title: page.title,
    description: page.description,
    alternates: { canonical: url },
    robots: {
      index: true,
      follow: true,
      googleBot: { index: true, follow: true, 'max-image-preview': 'large', 'max-snippet': -1 },
    },
    openGraph: {
      type: 'website',
      url,
      siteName: 'e-clinic',
      title: page.title,
      description: page.description,
      locale: OG_LOCALE[page.locale],
      alternateLocale: [OG_LOCALE[page.locale === 'id' ? 'en' : 'id']],
      images: [image],
    },
    twitter: { card: 'summary_large_image', title: page.title, description: page.description, images: [image] },
  };
}

/** Escapes JSON for an inline <script type="application/ld+json"> (no "</script>" or HTML comment can break out). */
export function jsonLd(data: unknown) {
  return JSON.stringify(data).replace(/</g, '\\u003c');
}
