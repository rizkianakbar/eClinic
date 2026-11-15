import { listStaff } from '@/features/settings/settings.service';
import { SettingsStaff } from '@/features/settings/settings-staff';
import { pageTitle } from '@/i18n/metadata';
import { type Role, requireRole } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';

export const generateMetadata = pageTitle('settings.tabs.staff');

const ROLES = new Set<string>(['admin', 'front_desk', 'nurse', 'doctor', 'pharmacist', 'cashier']);

export default async function StaffPage(props: PageProps<'/settings/staff'>) {
  const session = await requireRole('owner', 'admin');
  const [staff, searchParams] = await Promise.all([listStaff(await createClient()), props.searchParams]);
  const wanted = typeof searchParams.new === 'string' ? searchParams.new : undefined;

  return (
    <SettingsStaff
      session={session}
      staff={staff}
      create={{ open: Boolean(wanted), role: wanted && ROLES.has(wanted) ? (wanted as Role) : undefined }}
    />
  );
}
