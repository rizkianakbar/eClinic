import { type NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { urlOnRequestHost } from '@/lib/tenant';

/**
 * Where requireRole() sends a request without a valid session for this clinic (signed out, deactivated, or
 * another clinic's account): clears this browser's session, then shows the login page.
 */
export async function GET(request: NextRequest) {
  const supabase = await createClient();

  await supabase.auth.signOut({ scope: 'local' });

  return NextResponse.redirect(urlOnRequestHost(request, '/login'));
}
