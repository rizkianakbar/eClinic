import { getTranslations } from 'next-intl/server';
import { SkeletonPage } from '@/components/ui/skeleton';
import { SettingsMasterListSkeleton } from '@/features/settings/settings-skeleton';

export default async function Loading() {
  const t = await getTranslations();

  return (
    <SkeletonPage route label={t('settings.loading.polis')}>
      <SettingsMasterListSkeleton
        intro={<p className="text-sm text-muted-foreground">{t('settings.polis.intro')}</p>}
        create={t('settings.poliForm.add')}
        rows={4}
        columns={[
          { label: t('settings.polis.colName'), bar: 'w-32' },
          { label: t('settings.polis.colBpjs'), bar: 'w-14' },
          { label: t('settings.polis.colConsultation'), bar: 'w-40' },
          { label: t('settings.polis.colStatus'), bar: 'w-14' },
          { label: t('settings.polis.colActions'), className: 'text-right', bar: 'w-32' },
        ]}
      />
    </SkeletonPage>
  );
}
