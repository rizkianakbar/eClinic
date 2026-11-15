import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';

// The marketing site (root domain only: the proxy rewrites it here). Unlike the clinic app, it is meant to be found.
export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('site.meta');

  return {
    title: { default: t('title'), template: '%s · e-clinic' },
    description: t('description'),
    robots: { index: true, follow: true },
    openGraph: { title: t('title'), description: t('description') },
    twitter: { title: t('title'), description: t('description') },
  };
}

export default function SiteLayout(props: LayoutProps<'/site'>) {
  return <div className="flex min-h-dvh flex-col bg-background">{props.children}</div>;
}
