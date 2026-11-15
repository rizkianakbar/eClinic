import type { MetadataRoute } from 'next';
import { getHostTenant } from '@/lib/auth';
import { siteUrl } from '@/lib/tenant';

// The marketing site (root domain) is meant to be found; its sign-in plumbing is not. A clinic's subdomain is
// staff-only: crawlers may fetch the login page (only to read its noindex), never anything behind it.
export default async function robots(): Promise<MetadataRoute.Robots> {
  const tenant = await getHostTenant();

  if (tenant.kind === 'site') {
    return {
      rules: { userAgent: '*', allow: '/', disallow: ['/auth/', '/api/'] },
      sitemap: siteUrl('/sitemap.xml'),
    };
  }

  return { rules: { userAgent: '*', allow: '/login', disallow: '/' } };
}
