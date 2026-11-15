import { createServerClient } from '@supabase/ssr';
import { type NextRequest, NextResponse } from 'next/server';
import { PRINT_HEADER } from '@/i18n/locales';
import { tenantFromHost, urlOnRequestHost } from '@/lib/tenant';

/** The marketing site's pages live under this folder; only the root domain reaches them (by rewrite). */
const SITE_PREFIX = '/site';

const PUBLIC_PATHS = ['/login', '/auth'];

/**
 * Routes by host, then by sign-in state. Root domain → the marketing site (rewritten into /site, no session).
 * A clinic's subdomain → the clinic app: refreshes the Supabase session cookie and redirects optimistically;
 * pages still check the session belongs to this clinic (lib/auth).
 */
export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const tenant = tenantFromHost(request.headers.get('x-forwarded-host') ?? request.headers.get('host'));
  const isSitePath = pathname === SITE_PREFIX || pathname.startsWith(`${SITE_PREFIX}/`);

  // Only the proxy may say a request is a printout (always in Bahasa).
  request.headers.delete(PRINT_HEADER);

  if (tenant.kind === 'site') {
    const url = request.nextUrl.clone();

    url.pathname = isSitePath ? pathname : `${SITE_PREFIX}${pathname === '/' ? '' : pathname}`;

    return NextResponse.rewrite(url, { request });
  }

  // The marketing pages are not part of a clinic's address space.
  if (isSitePath) return NextResponse.rewrite(new URL('/not-found', request.url));

  if (pathname.startsWith('/print/')) request.headers.set(PRINT_HEADER, '1');

  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet, headers) {
          for (const { name, value } of cookiesToSet) request.cookies.set(name, value);
          response = NextResponse.next({ request });
          for (const { name, value, options } of cookiesToSet) response.cookies.set(name, value, options);
          for (const [key, value] of Object.entries(headers)) response.headers.set(key, value);
        },
      },
    },
  );

  // Must run right after creating the client: it refreshes an expired session.
  const { data } = await supabase.auth.getClaims();
  const isSignedIn = Boolean(data?.claims);

  const isPublic = PUBLIC_PATHS.some((path) => pathname === path || pathname.startsWith(`${path}/`));

  if (!isSignedIn && !isPublic) {
    return redirectKeepingCookies(request, response, '/login');
  }

  if (isSignedIn && pathname === '/login') {
    return redirectKeepingCookies(request, response, '/dashboard');
  }

  return response;
}

function redirectKeepingCookies(request: NextRequest, response: NextResponse, pathname: string) {
  const redirect = NextResponse.redirect(urlOnRequestHost(request, pathname));

  for (const cookie of response.cookies.getAll()) redirect.cookies.set(cookie);

  return redirect;
}

export const config = {
  matcher: [
    // Everything except static assets, crawler/link-preview files and /api (Route Handlers authenticate themselves).
    '/((?!_next/static|_next/image|favicon.ico|robots.txt|opengraph-image|api/|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)',
  ],
};
