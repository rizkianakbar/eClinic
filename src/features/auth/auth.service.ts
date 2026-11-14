import "server-only";
import type { Role } from "@/lib/auth";
import type { createAdminClient } from "@/lib/supabase/admin";
import type { SupabaseClient } from "@/lib/supabase/server";
import {
  type ChangePasswordValues,
  changePasswordErrorMessage,
} from "./auth.lib";

type Result = { ok: true; data: undefined } | { ok: false; error: string };

/** Confirms the current password, then sets the new one for the signed-in user. */
export async function changeOwnPassword(
  supabase: SupabaseClient,
  values: ChangePasswordValues,
): Promise<Result> {
  const { data: user } = await supabase.auth.getUser();
  const email = user.user?.email;

  if (!email) return { ok: false, error: "auth.errors.sessionEnded" };

  const check = await supabase.auth.signInWithPassword({
    email,
    password: values.current_password,
  });

  if (check.error)
    return {
      ok: false,
      error: changePasswordErrorMessage({
        code: check.error.code ?? "invalid_credentials",
      }),
    };

  const { error } = await supabase.auth.updateUser({
    password: values.password,
  });

  if (error)
    return {
      ok: false,
      error: changePasswordErrorMessage({ code: error.code }),
    };

  return { ok: true, data: undefined };
}

/** The signed-in user's own profile, for Akun saya. */
export async function getOwnProfile(supabase: SupabaseClient, userId: string) {
  const { data, error } = await supabase
    .from("profiles")
    .select("email, nik, sip_number, created_at")
    .eq("id", userId)
    .maybeSingle();

  if (error) throw new Error(`getOwnProfile failed: ${error.code}`);

  return data;
}

// Quick login for test accounts (development, or a demo deployment) ---------------

/** Test staff created by scripts/seed-test-data.ts. Never real accounts. */
export const TEST_ACCOUNT_SUFFIX = ".uji@klinik.test";
const TEST_ACCOUNT_PASSWORD = "UjiKlinik#2026";

/** One-click test logins: always in `next dev`; in a production build only when `DEMO_LOGIN=true`. */
export function devLoginEnabled() {
  return (
    process.env.NODE_ENV === "development" || process.env.DEMO_LOGIN === "true"
  );
}

const ROLE_ORDER: Role[] = [
  "owner",
  "admin",
  "front_desk",
  "nurse",
  "doctor",
  "pharmacist",
  "cashier",
];

/** Active test staff for the login page's quick buttons (no passwords leave the server). */
export async function listTestAccounts(
  admin: ReturnType<typeof createAdminClient>,
) {
  if (!devLoginEnabled()) return [];

  const { data, error } = await admin
    .from("profiles")
    .select("email, full_name, role")
    .eq("is_active", true)
    .like("email", `%${TEST_ACCOUNT_SUFFIX}`);

  if (error) return [];

  return data
    .flatMap((row) =>
      row.email
        ? [{ email: row.email, fullName: row.full_name, role: row.role }]
        : [],
    )
    .sort(
      (a, b) =>
        ROLE_ORDER.indexOf(a.role) - ROLE_ORDER.indexOf(b.role) ||
        a.fullName.localeCompare(b.fullName),
    );
}

/** The sign-in values for a test account, or null when quick login is off or for any other email. */
export function testAccountCredentials(email: string) {
  if (!devLoginEnabled() || !email.endsWith(TEST_ACCOUNT_SUFFIX)) return null;

  return { email, password: TEST_ACCOUNT_PASSWORD };
}
