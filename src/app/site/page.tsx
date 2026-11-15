import { SiteLanding } from '@/features/site/site';
import { SiteFooter, SiteHeader } from '@/features/site/site-chrome';

export default function SiteHomePage() {
  return (
    <>
      <SiteHeader />
      <main className="flex-1">
        <SiteLanding />
      </main>
      <SiteFooter />
    </>
  );
}
