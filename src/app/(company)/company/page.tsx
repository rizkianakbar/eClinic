import { getTranslations } from 'next-intl/server';
import { PageHeader } from '@/components/ui/page-header';
import { getOrganizationOverview, listOrganizationBranches } from '@/features/branches/branches.service';
import { CompanyOverview } from '@/features/company/company-overview';
import { CompanySetup } from '@/features/company/company-setup';
import { branchSetupSteps, companySetupSteps } from '@/features/onboarding/onboarding.lib';
import { getCompanyFacts } from '@/features/onboarding/onboarding.service';
import { pageTitle } from '@/i18n/metadata';
import { requireCompanyOwner } from '@/lib/auth';
import { todayInJakarta } from '@/lib/dates';
import { createClient } from '@/lib/supabase/server';

export const generateMetadata = pageTitle('nav.companyOverview');

/** Two weeks, as the owner's Beranda. */
const TREND_DAYS = 14;

export default async function CompanyOverviewPage() {
  const { account } = await requireCompanyOwner();
  const supabase = await createClient();
  const [t, branches, catalog, setup] = await Promise.all([
    getTranslations('company.overview'),
    getOrganizationOverview(supabase, todayInJakarta(), TREND_DAYS),
    getCompanyFacts(supabase),
    listOrganizationBranches(supabase),
  ]);

  return (
    <>
      <PageHeader title={account.organizationName} description={t('description', { count: branches.length })} />
      <CompanySetup
        companyName={account.organizationName}
        company={companySetupSteps(catalog)}
        branches={setup
          .filter((branch) => branch.is_active)
          .map((branch) => ({
            id: branch.id,
            name: branch.name,
            steps: branchSetupSteps({
              hasAddress: Boolean(branch.address?.trim()),
              hasPhone: Boolean(branch.phone?.trim()),
              doctors: branch.doctors,
              schedules: branch.schedules,
              team: branch.team,
            }),
          }))}
      />
      <CompanyOverview branches={branches} />
    </>
  );
}
