import { getLocale, getTranslations } from 'next-intl/server';
import { LiveIndicator } from '@/components/ui/live-indicator';
import { PageHeader } from '@/components/ui/page-header';
import { listLowStock, listPharmacyDesk } from '@/features/home/home.service';
import { HomePharmacy } from '@/features/home/home-pharmacy';
import { nearExpiryCutoff } from '@/features/inventory/inventory.lib';
import { countStockAlerts } from '@/features/inventory/inventory.service';
import { listDispensedToday } from '@/features/pharmacy/pharmacy.service';
import { VisitsLiveRefresh } from '@/features/visits/visits-live-refresh';
import { pageTitle } from '@/i18n/metadata';
import { requireRole } from '@/lib/auth';
import { formatDate, todayInJakarta } from '@/lib/dates';
import { createClient } from '@/lib/supabase/server';

export const generateMetadata = pageTitle('nav.pharmacy');

export default async function PharmacyPage() {
  await requireRole('pharmacist');

  const today = todayInJakarta();
  const [t, locale] = await Promise.all([getTranslations(), getLocale()]);
  const supabase = await createClient();

  const [waiting, lowStock, dispensed, alerts] = await Promise.all([
    listPharmacyDesk(supabase),
    listLowStock(supabase),
    listDispensedToday(supabase),
    countStockAlerts(supabase, nearExpiryCutoff(today)),
  ]);

  return (
    <>
      <VisitsLiveRefresh visitDate={today} />
      <PageHeader
        title={t('nav.pharmacy')}
        description={
          <span className="inline-flex flex-wrap items-center gap-x-2">
            {formatDate(today, locale)}
            <LiveIndicator />
          </span>
        }
      />
      {/* Date.now() here is the server render time for the wait timers (first paint; they tick on the client). */}
      <HomePharmacy waiting={waiting} lowStock={lowStock} dispensed={dispensed} alerts={alerts} now={Date.now()} />
    </>
  );
}
