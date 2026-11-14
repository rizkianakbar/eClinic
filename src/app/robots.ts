import type { MetadataRoute } from 'next';

// A staff-only app: only the login page may be indexed. Everything else is patient data behind sign-in.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: '*', allow: '/login', disallow: '/' },
  };
}
