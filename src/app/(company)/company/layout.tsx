import { CompanyShell } from '@/features/company/company-shell';
import { requireCompanyOwner } from '@/lib/auth';

/** The company scope: owner only, no branch needed (Vercel's team pages above its projects). */
export default async function CompanyLayout(props: LayoutProps<'/company'>) {
  const { account } = await requireCompanyOwner();

  return <CompanyShell account={account}>{props.children}</CompanyShell>;
}
