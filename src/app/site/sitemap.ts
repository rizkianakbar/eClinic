import type { MetadataRoute } from 'next';
import { siteUrl } from '@/lib/tenant';

// Served at /sitemap.xml on the root domain (the proxy rewrites it here). Only the pages meant to be found: the
// root login is noindex, and clinic subdomains are staff-only.
export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: siteUrl('/'), changeFrequency: 'weekly', priority: 1 },
    { url: siteUrl('/signup'), changeFrequency: 'monthly', priority: 0.8 },
  ];
}
