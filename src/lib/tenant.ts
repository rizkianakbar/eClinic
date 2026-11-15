/**
 * Tenancy by host name. The marketing site lives on the root domain; each clinic on `<slug>.<root domain>`.
 * Pure (no Next.js imports): the proxy, the server and tests share it.
 */

/**
 * e.g. `clinic.rzknkbr.xyz` in production (the landing; clinics at `<slug>.clinic.rzknkbr.xyz`), `localhost:3000` in
 * development (`*.localhost` resolves without setup). Moving to a dedicated domain is this one setting.
 */
export const ROOT_DOMAIN = (process.env.NEXT_PUBLIC_ROOT_DOMAIN ?? 'localhost:3000').toLowerCase();

/** The public demo clinic (`demo.<root domain>`), with one-click test accounts. */
export const DEMO_SLUG = 'demo';

/** Never available to a clinic: infrastructure names, our own pages, and names that invite phishing. */
export const RESERVED_SLUGS = new Set([
  'www',
  'app',
  'api',
  'admin',
  'auth',
  'login',
  'signup',
  'daftar',
  'masuk',
  'mail',
  'email',
  'smtp',
  'ftp',
  'cdn',
  'static',
  'assets',
  'docs',
  'help',
  'support',
  'status',
  'blog',
  'billing',
  'dashboard',
  'clinic',
  'klinik',
  'test',
  'staging',
  'dev',
  'internal',
  'root',
  'system',
  'satusehat',
  'bpjs',
  'kemenkes',
  DEMO_SLUG,
]);

export type HostTenant = { kind: 'site' } | { kind: 'clinic'; slug: string };

/**
 * Which part of the product a host serves: the root domain (and www) is the marketing site, a subdomain is that
 * clinic. Any other host (a Vercel preview URL; later, a clinic's own domain) serves the demo clinic for now.
 */
export function tenantFromHost(host: string | null | undefined, rootDomain = ROOT_DOMAIN): HostTenant {
  const name = (host ?? '').trim().toLowerCase();

  if (!name || name === rootDomain || name === `www.${rootDomain}`) return { kind: 'site' };

  if (name.endsWith(`.${rootDomain}`)) {
    return { kind: 'clinic', slug: name.slice(0, -rootDomain.length - 1) };
  }

  return { kind: 'clinic', slug: DEMO_SLUG };
}

/** Lowercase letters, digits and single hyphens, 3–32 long, no hyphen at either end (one DNS label). */
const SLUG_PATTERN = /^[a-z0-9][a-z0-9-]{1,30}[a-z0-9]$/;

export type SlugProblem = 'short' | 'long' | 'format' | 'reserved';

/** Why a subdomain cannot be used, or null when it can (whether it is taken is the database's call). */
export function slugProblem(slug: string): SlugProblem | null {
  if (slug.length < 3) return 'short';
  if (slug.length > 32) return 'long';
  if (!SLUG_PATTERN.test(slug) || slug.includes('--')) return 'format';
  if (RESERVED_SLUGS.has(slug)) return 'reserved';

  return null;
}

/** Words that describe the kind of business, not which one. */
const GENERIC_WORDS = new Set(['klinik', 'pratama', 'clinic', 'group', 'grup', 'pt', 'cv', 'tbk']);

/** A subdomain suggestion from a company name: "Klinik Sehat Sentosa" → "sehat-sentosa", "PT Sentosa Medika Group" → "sentosa-medika". */
export function suggestSlug(clinicName: string) {
  const words = clinicName
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .split(' ')
    .filter(Boolean);

  // "Klinik Pratama", "Group", "PT" say nothing on a company's own address; keep them when nothing else is left.
  const meaningful = words.filter((word) => !GENERIC_WORDS.has(word));
  const slug = (meaningful.length > 0 ? meaningful : words).join('-').slice(0, 32).replace(/-+$/, '');

  return slug;
}

/** Plain HTTP only in local development (`localhost` and its subdomains). */
export function protocolFor(rootDomain = ROOT_DOMAIN) {
  return rootDomain.startsWith('localhost') || rootDomain.startsWith('127.') ? 'http' : 'https';
}

/** The full address of a clinic's app, e.g. `https://sehat.rzknkbr.xyz/dashboard`. */
export function clinicUrl(slug: string, path = '/', rootDomain = ROOT_DOMAIN) {
  return `${protocolFor(rootDomain)}://${slug}.${rootDomain}${path}`;
}

/** The marketing site's address, e.g. `https://rzknkbr.xyz/signup`. */
export function siteUrl(path = '/', rootDomain = ROOT_DOMAIN) {
  return `${protocolFor(rootDomain)}://${rootDomain}${path}`;
}

/** The clinic's host as people read it, without the protocol: `sehat.rzknkbr.xyz`. */
export function clinicHost(slug: string, rootDomain = ROOT_DOMAIN) {
  return `${slug}.${rootDomain}`;
}

/**
 * An absolute URL for `path` on the host the browser asked for. `request.url` can name the server's own host
 * (`localhost` in development) instead of the clinic's subdomain, so redirects are built from the Host header.
 */
export function urlOnRequestHost(request: { url: string; headers: Headers }, path: string) {
  const base = new URL(request.url);
  const host = request.headers.get('x-forwarded-host') ?? request.headers.get('host');
  const protocol = request.headers.get('x-forwarded-proto');

  if (host) base.host = host;
  if (protocol) base.protocol = `${protocol}:`;

  return new URL(path, base);
}
