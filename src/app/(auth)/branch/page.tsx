import { HeartPulseIcon } from 'lucide-react';
import { getTranslations } from 'next-intl/server';
import { SignOutButton } from '@/features/auth/auth-sign-out-button';
import { BranchesPicker } from '@/features/branches/branches-picker';
import { pageTitle } from '@/i18n/metadata';
import { requireAccount } from '@/lib/auth';

export const generateMetadata = pageTitle('branches.picker.title');

/**
 * Where a person who works at several branches starts every sign-in, and where "Ganti cabang" leads. Nothing
 * of a branch is visible until one is chosen (no active branch = no access).
 */
export default async function BranchPage() {
  const { account, currentId } = await requireAccount();
  const t = await getTranslations('branches.picker');

  return (
    <main className="flex min-h-dvh items-start justify-center bg-background px-4 pt-[max(4rem,env(safe-area-inset-top))] pb-10 sm:items-center sm:pt-0">
      <div className="flex w-full max-w-md flex-col gap-7">
        <div className="flex items-center gap-2.5">
          <span className="flex size-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <HeartPulseIcon className="size-5" aria-hidden />
          </span>
          <span className="font-semibold">{account.organizationName}</span>
        </div>
        <div className="flex flex-col gap-1.5">
          <h1 className="text-[1.75rem] leading-tight font-semibold tracking-tight">{t('title')}</h1>
          <p className="text-sm text-muted-foreground">{t('lead', { name: account.fullName })}</p>
        </div>
        {account.branches.length > 0 ? (
          <BranchesPicker branches={account.branches} currentId={currentId} />
        ) : (
          <p className="rounded-xl border border-dashed px-4 py-6 text-sm text-muted-foreground">{t('none')}</p>
        )}
        <div className="border-t pt-5">
          <SignOutButton />
        </div>
      </div>
    </main>
  );
}
