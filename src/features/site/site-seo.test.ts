import { describe, expect, it } from 'vitest';
import { jsonLd, pageSeo, SITE_ORIGIN } from './site-seo';

describe('jsonLd', () => {
  it('cannot close the script tag it sits in', () => {
    const out = jsonLd({ name: '</script><script>alert(1)</script>', note: '<!-- x -->' });

    expect(out).not.toContain('<');
    expect(JSON.parse(out)).toEqual({ name: '</script><script>alert(1)</script>', note: '<!-- x -->' });
  });
});

describe('pageSeo', () => {
  const seo = pageSeo({ title: 'Daftar', description: 'Buat akun.', path: '/signup', locale: 'id', imageAlt: 'alt' });

  it('points canonical and Open Graph at the absolute page URL', () => {
    const url = new URL('/signup', SITE_ORIGIN).toString();

    expect(seo.alternates?.canonical).toBe(url);
    expect(seo.openGraph).toMatchObject({ url, locale: 'id_ID', alternateLocale: ['en_US'] });
  });

  it('names the preview image (a page openGraph replaces the file-based one)', () => {
    expect(seo.openGraph?.images).toEqual([expect.objectContaining({ url: '/opengraph-image', alt: 'alt' })]);
    expect(seo.twitter).toMatchObject({ card: 'summary_large_image' });
  });
});
