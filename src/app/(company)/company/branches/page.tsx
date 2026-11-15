import { getTranslations } from 'next-intl/server';
import { PageHeader } from '@/components/ui/page-header';
import { listOrganizationBranches } from '@/features/branches/branches.service';
import { BranchesCreateDialog } from '@/features/branches/branches-create-dialog';
import { CompanyBranches } from '@/features/company/company-branches';
import { pageTitle } from '@/i18n/metadata';
import { requireCompanyOwner } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';

export const generateMetadata = pageTitle('nav.companyBranches');

export default async function CompanyBranchesPage(props: PageProps<'/company/branches'>) {
  const { currentId } = await requireCompanyOwner();
  const [t, branches, searchParams] = await Promise.all([
    getTranslations('company.branches'),
    listOrganizationBranches(await createClient()),
    props.searchParams,
  ]);

  return (
    <>
      <PageHeader
        title={t('title')}
        description={t('description')}
        actions={<BranchesCreateDialog defaultOpen={searchParams.new === '1'} />}
      />
      <CompanyBranches branches={branches} currentId={currentId} />
    </>
  );
}
