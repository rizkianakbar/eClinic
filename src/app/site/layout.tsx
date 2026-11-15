import type { Metadata } from 'next';
import { SITE_ORIGIN } from '@/features/site/site-seo';

// The marketing site (root domain only: the proxy rewrites it here). Unlike the clinic app, it is meant to be found:
// each page sets its own canonical, robots and social cards (pageSeo); everything resolves against the site origin.
export const metadata: Metadata = {
  metadataBase: SITE_ORIGIN,
  title: { default: 'eClinic', template: '%s · eClinic' },
  applicationName: 'eClinic',
  creator: 'eClinic',
  publisher: 'eClinic',
  category: 'healthcare software',
};

export default function SiteLayout(props: LayoutProps<'/site'>) {
  return <div className="flex min-h-dvh flex-col bg-background">{props.children}</div>;
}
