import type { MetadataRoute } from 'next';
import { getHostTenant } from '@/lib/auth';

// The marketing site (root domain) is meant to be found. A clinic's subdomain is staff-only: only its login page
// may be indexed; everything else is patient data behind sign-in.
export default async function robots(): Promise<MetadataRoute.Robots> {
  const tenant = await getHostTenant();

  if (tenant.kind === 'site') return { rules: { userAgent: '*', allow: '/' } };

  return { rules: { userAgent: '*', allow: '/login', disallow: '/' } };
}
