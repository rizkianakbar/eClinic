import { PageHeader } from '@/components/ui/page-header';
import { SettingsTabs } from '@/features/settings/settings-tabs';
import { requireRole } from '@/lib/auth';

export default async function SettingsLayout(props: LayoutProps<'/settings'>) {
  await requireRole('owner', 'admin');

  return (
    <>
      <PageHeader
        title="Pengaturan"
        description="Data klinik, staf, tarif, dan daftar master yang dipakai sehari-hari."
      />
      <div className="grid grid-cols-[minmax(0,1fr)] items-start gap-6 lg:grid-cols-[12rem_minmax(0,1fr)] lg:gap-10">
        {/* Clears the sticky tab row (h-13 + border) so the menu stays whole while long pages scroll. */}
        <div className="lg:sticky lg:top-19 lg:-m-1 lg:max-h-[calc(100dvh-6rem)] lg:overflow-y-auto lg:p-1">
          <SettingsTabs />
        </div>
        <div className="flex min-w-0 flex-col gap-6">{props.children}</div>
      </div>
    </>
  );
}
