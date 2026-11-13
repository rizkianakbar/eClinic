import { z } from "zod";
import { todayInJakarta } from "@/lib/dates";

/** Accepts the form's string or an already-parsed null, so the action can re-validate parsed values. */
const optionalString = z
  .string()
  .nullish()
  .transform((value) => value ?? "");

/** Blank -> null, otherwise must match the pattern. */
function optionalDigits(pattern: RegExp, message: string) {
  return optionalString
    .transform((value) => value.trim())
    .refine((value) => value === "" || pattern.test(value), message)
    .transform((value) => value || null);
}

/** "+62 812-3456-7890", "62812...", "0812 3456 7890" -> "081234567890". */
export function normalizePhone(input: string) {
  const digits = input.replace(/\D/g, "");
  return digits.startsWith("62") ? `0${digits.slice(2)}` : digits;
}

export const patientSchema = z.object({
  full_name: z
    .string()
    .trim()
    .min(1, "Nama pasien wajib diisi.")
    .max(200, "Nama terlalu panjang, maksimal 200 karakter."),
  nik: optionalDigits(/^\d{16}$/, "NIK harus 16 digit angka. Kosongkan jika pasien belum punya NIK."),
  bpjs_number: optionalDigits(/^\d{13}$/, "Nomor BPJS harus 13 digit angka. Kosongkan jika bukan peserta BPJS."),
  birth_date: z
    .string()
    .min(1, "Tanggal lahir wajib diisi.")
    .pipe(z.iso.date("Tanggal lahir tidak valid."))
    .refine((value) => value <= todayInJakarta(), "Tanggal lahir tidak boleh di masa depan."),
  sex: z.enum(["male", "female"], { error: "Pilih jenis kelamin." }),
  phone: optionalString
    .transform(normalizePhone)
    .refine(
      (value) => value === "" || /^0\d{8,13}$/.test(value),
      "Nomor HP tidak valid, contoh: 081234567890.",
    )
    .transform((value) => value || null),
  address: optionalString
    .transform((value) => value.trim())
    .refine((value) => value.length <= 500, "Alamat terlalu panjang, maksimal 500 karakter.")
    .transform((value) => value || null),
});

export type PatientInput = z.input<typeof patientSchema>;
export type PatientValues = z.output<typeof patientSchema>;

export type PatientSearch =
  | { kind: "number"; digits: string; phone: string }
  | { kind: "name"; text: string };

/**
 * Interprets the search box. Digits (MRN typed or scanned, NIK, BPJS number, phone)
 * match by number; anything else matches the name. Returns null when too short to search.
 */
export function parsePatientSearch(input: string): PatientSearch | null {
  const text = input.trim();
  if (text.length < 2) return null;
  if (/^[\d\s+-]+$/.test(text)) {
    const digits = text.replace(/\D/g, "");
    return digits.length < 2 ? null : { kind: "number", digits, phone: normalizePhone(text) };
  }
  return { kind: "name", text };
}

/** Mobile "081234567890" -> "0812-3456-7890" for reading aloud; landlines and other shapes stay as stored. */
export function formatPhone(phone: string) {
  return /^08\d{8,12}$/.test(phone) ? `${phone.slice(0, 4)}-${phone.slice(4, 8)}-${phone.slice(8)}` : phone;
}

/** Long ID numbers (NIK 16, BPJS 13 digits) in groups of four: "3276 0101 0101 0001". */
export function formatIdNumber(value: string) {
  return /^\d{10,}$/.test(value) ? value.replace(/(\d{4})(?=\d)/g, "$1 ") : value;
}

/** Escapes LIKE wildcards so user input matches literally. */
export function escapeLike(value: string) {
  return value.replace(/[\\%_]/g, (char) => `\\${char}`);
}

/** Age in whole years on a given Jakarta date ("YYYY-MM-DD"). */
export function ageInYears(birthDate: string, today: string = todayInJakarta()) {
  const [by, bm, bd] = birthDate.split("-").map(Number);
  const [ty, tm, td] = today.split("-").map(Number);
  const hadBirthday = tm > bm || (tm === bm && td >= bd);
  return ty - by - (hadBirthday ? 0 : 1);
}

/** Maps a Postgres error on patient insert/update to a message the front desk can act on. */
export function patientWriteErrorMessage(error: { code?: string; message?: string }) {
  if (error.code === "23505") {
    if (error.message?.includes("patients_clinic_nik_key")) {
      return "NIK ini sudah terdaftar. Cari pasien dengan NIK tersebut, jangan daftarkan ulang.";
    }
    if (error.message?.includes("patients_clinic_bpjs_key")) {
      return "Nomor BPJS ini sudah terdaftar. Cari pasien dengan nomor tersebut, jangan daftarkan ulang.";
    }
  }
  if (error.code === "42501") {
    return "Anda tidak punya akses untuk mengubah data pasien. Hubungi admin klinik.";
  }
  return "Data pasien gagal disimpan. Coba lagi, atau hubungi admin jika terus terjadi.";
}

/** Two letters for an avatar: "dr. Budi Santoso (Uji)" -> "BS". Skips titles like "dr." and "Apt.". */
export function initials(name: string) {
  return name
    .replace(/\(.*?\)/g, "")
    .split(/\s+/)
    .filter((part) => /^[a-z]/i.test(part) && !part.endsWith("."))
    .slice(0, 2)
    .map((part) => part[0]!.toUpperCase())
    .join("");
}

/** Kemenkes life-stage groups, youngest first. */
export const AGE_GROUPS = [
  { key: "balita", label: "Balita", range: "0–5", max: 5 },
  { key: "anak", label: "Anak & remaja", range: "6–17", max: 17 },
  { key: "dewasa", label: "Dewasa", range: "18–44", max: 44 },
  { key: "pralansia", label: "Pra-lansia", range: "45–59", max: 59 },
  { key: "lansia", label: "Lansia", range: "60+", max: Infinity },
] as const;

/**
 * Who the clinic's active patients are, as `patient_demographics()` computes it in the database:
 * sex, life stage (AGE_GROUPS), payer, new this month, whose birthday is today, who joined in the last
 * 7 days (Jakarta dates).
 */
export type PatientStats = {
  total: number;
  male: number;
  female: number;
  bpjs: number;
  newThisMonth: number;
  ages: Record<(typeof AGE_GROUPS)[number]["key"], number>;
  birthdays: { id: string; full_name: string; age: number }[];
  recent: { id: string; full_name: string; sex: string; birth_date: string; bpjs_number: string | null; created_at: string }[];
};
