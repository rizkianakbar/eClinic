import { getTranslations } from 'next-intl/server';
import { PageHeader } from '@/components/ui/page-header';
import { listOrganizationStaff } from '@/features/branches/branches.service';
import { BranchesStaff } from '@/features/branches/branches-staff';
import { pageTitle } from '@/i18n/metadata';
import { requireCompanyOwner } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';

export const generateMetadata = pageTitle('nav.companyStaff');

export default async function CompanyStaffPage() {
  const { account } = await requireCompanyOwner();
  const [t, staff] = await Promise.all([getTranslations('company.staff'), listOrganizationStaff(await createClient())]);

  return (
    <>
      <PageHeader title={t('title')} description={t('description')} />
      <BranchesStaff
        staff={staff.filter((person) => person.is_active)}
        branches={account.branches}
        editableIds={account.branches.map((branch) => branch.id)}
      />
      <p className="text-sm text-muted-foreground">{t('addHint')}</p>
    </>
  );
}
