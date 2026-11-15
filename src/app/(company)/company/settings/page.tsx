import { getTranslations } from 'next-intl/server';
import { PageHeader } from '@/components/ui/page-header';
import { CompanySettings } from '@/features/company/company-settings';
import { pageTitle } from '@/i18n/metadata';
import { requireCompanyOwner } from '@/lib/auth';
import { clinicHost } from '@/lib/tenant';

export const generateMetadata = pageTitle('nav.companySettings');

export default async function CompanySettingsPage() {
  const { account } = await requireCompanyOwner();
  const t = await getTranslations('company.settings');

  return (
    <>
      <PageHeader title={t('title')} description={t('description')} />
      <CompanySettings name={account.organizationName} address={clinicHost(account.organizationSlug)} />
    </>
  );
}
