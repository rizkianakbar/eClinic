import { getTranslations } from 'next-intl/server';
import { SkeletonPage } from '@/components/ui/skeleton';
import { SettingsMasterListSkeleton } from '@/features/settings/settings-skeleton';

export default async function Loading() {
  const t = await getTranslations();

  return (
    <SkeletonPage route label={t('settings.loading.services')}>
      <SettingsMasterListSkeleton
        intro={<p className="text-sm text-muted-foreground">{t('billing.services.intro')}</p>}
        importable
        create={t('billing.services.add')}
        columns={[
          { label: t('billing.services.colName'), bar: 'w-44' },
          { label: t('billing.services.type'), className: 'hidden md:table-cell', bar: 'w-20' },
          { label: t('billing.services.price'), className: 'hidden text-right sm:table-cell', bar: 'w-20' },
          { label: t('billing.services.doctorFee'), className: 'hidden text-right md:table-cell', bar: 'w-24' },
          { label: t('billing.services.colStatus'), className: 'hidden md:table-cell', bar: 'w-14' },
          { label: t('billing.services.colActions'), className: 'text-right', bar: 'w-32' },
        ]}
      />
    </SkeletonPage>
  );
}
