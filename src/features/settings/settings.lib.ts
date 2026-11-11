import { z } from "zod";
import { ROLE_LABELS } from "@/features/auth/auth.constants";
import type { Role } from "@/lib/auth";

const ROLES = Object.keys(ROLE_LABELS) as [Role, ...Role[]];

/** Accepts a form string or an already-parsed null; blank -> null. */
const optionalText = (max: number, message: string) =>
  z
    .string()
    .nullish()
    .transform((value) => (value ?? "").trim())
    .refine((value) => value.length <= max, message)
    .transform((value) => value || null);

const password = z
  .string()
  .min(8, "Kata sandi minimal 8 karakter.")
  .max(72, "Kata sandi maksimal 72 karakter.");

// Staff ----------------------------------------------------------------------

export const staffSchema = z.object({
  full_name: z
    .string()
    .trim()
    .min(1, "Nama wajib diisi.")
    .max(200, "Nama terlalu panjang, maksimal 200 karakter."),
  role: z.enum(ROLES, { error: "Pilih peran." }),
  nik: z
    .string()
    .nullish()
    .transform((value) => (value ?? "").trim())
    .refine((value) => value === "" || /^\d{16}$/.test(value), "NIK harus 16 digit angka.")
    .transform((value) => value || null),
  sip_number: optionalText(50, "Nomor SIP terlalu panjang, maksimal 50 karakter."),
});

export const staffCreateSchema = staffSchema.extend({
  email: z
    .string()
    .trim()
    .toLowerCase()
    .min(1, "Email wajib diisi.")
    .pipe(z.email("Format email tidak valid, contoh: nama@klinik.com.")),
  password,
});

export const staffPasswordSchema = z.object({ password });

export type StaffInput = z.input<typeof staffSchema>;
export type StaffValues = z.output<typeof staffSchema>;
export type StaffCreateInput = z.input<typeof staffCreateSchema>;
export type StaffCreateValues = z.output<typeof staffCreateSchema>;
export type StaffPasswordValues = z.output<typeof staffPasswordSchema>;

/** Roles the current user may assign. Only an owner creates or edits owners (mirrors RLS). */
export function assignableRoles(actorRole: Role) {
  return ROLES.filter((role) => role !== "owner" || actorRole === "owner");
}

/** Maps Supabase Auth admin errors on create/update to an actionable message. */
export function staffAuthErrorMessage(error: { code?: string }) {
  if (error.code === "email_exists" || error.code === "user_already_exists") {
    return "Email ini sudah dipakai akun lain. Gunakan email lain.";
  }
  if (error.code === "weak_password") {
    return "Kata sandi terlalu lemah. Gunakan minimal 8 karakter campuran huruf dan angka.";
  }
  return "Akun staf gagal disimpan. Coba lagi, atau hubungi admin jika terus terjadi.";
}

// Polis ----------------------------------------------------------------------

export const poliSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Nama poli wajib diisi.")
    .max(100, "Nama poli terlalu panjang, maksimal 100 karakter."),
  bpjs_poli_code: optionalText(10, "Kode poli BPJS maksimal 10 karakter."),
});

export type PoliInput = z.input<typeof poliSchema>;
export type PoliValues = z.output<typeof poliSchema>;

/** Maps a Postgres error on master-data writes to an actionable message. */
export function masterDataErrorMessage(error: { code?: string }, duplicateMessage: string) {
  if (error.code === "23505") return duplicateMessage;
  if (error.code === "42501") return "Anda tidak punya akses untuk perubahan ini. Hubungi pemilik klinik.";
  return "Data gagal disimpan. Coba lagi, atau hubungi admin jika terus terjadi.";
}
