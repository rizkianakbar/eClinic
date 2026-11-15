import { type NextRequest, NextResponse } from 'next/server';
import { startBranchSession } from '@/features/branches/branches.service';
import { getHostTenant } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { urlOnRequestHost } from '@/lib/tenant';

/**
 * Lands a person on their clinic's subdomain signed in. Sessions are per host, so signup and the root login
 * (on the marketing domain) end here with a single-use, short-lived token from `admin.generateLink`; verifying
 * it sets this host's session cookie. A token for another clinic's account is refused.
 */
export async function GET(request: NextRequest) {
  const tokenHash = request.nextUrl.searchParams.get('token_hash');
  const next = request.nextUrl.searchParams.get('next');
  const supabase = await createClient();

  if (!tokenHash) return NextResponse.redirect(urlOnRequestHost(request, '/login'));

  const { data, error } = await supabase.auth.verifyOtp({ type: 'email', token_hash: tokenHash });

  if (error || !data.user) return NextResponse.redirect(urlOnRequestHost(request, '/login?reason=link'));

  const [{ data: profile }, tenant] = await Promise.all([
    supabase
      .from('profiles')
      .select('is_active, organization:organizations(slug)')
      .eq('id', data.user.id)
      .maybeSingle(),
    getHostTenant(),
  ]);

  if (!profile?.is_active || tenant.kind !== 'clinic' || profile.organization?.slug !== tenant.slug) {
    await supabase.auth.signOut({ scope: 'local' });

    return NextResponse.redirect(urlOnRequestHost(request, '/login?reason=link'));
  }

  // Several branches: the picker first. Otherwise only a path on this host: never an open redirect.
  const start = await startBranchSession(supabase, data.user.id);
  const target = start !== '/dashboard' ? start : next?.startsWith('/') && !next.startsWith('//') ? next : '/dashboard';

  return NextResponse.redirect(urlOnRequestHost(request, target));
}
