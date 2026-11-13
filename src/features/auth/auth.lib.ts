import { z } from "zod";

export const signInSchema = z.object({
  email: z
    .string()
    .trim()
    .toLowerCase()
    .min(1, "Email wajib diisi.")
    .pipe(z.email("Format email tidak valid, contoh: nama@klinik.com.")),
  password: z.string().min(1, "Kata sandi wajib diisi."),
});

export type SignInInput = z.input<typeof signInSchema>;
export type SignInValues = z.output<typeof signInSchema>;

export const changePasswordSchema = z
  .object({
    current_password: z.string().min(1, "Isi kata sandi saat ini."),
    password: z.string().min(8, "Kata sandi baru minimal 8 karakter.").max(72, "Kata sandi maksimal 72 karakter."),
    confirm: z.string(),
  })
  .refine((value) => value.password === value.confirm, {
    message: "Konfirmasi tidak sama dengan kata sandi baru.",
    path: ["confirm"],
  })
  .refine((value) => value.password !== value.current_password, {
    message: "Kata sandi baru harus berbeda dari yang sekarang.",
    path: ["password"],
  });

export type ChangePasswordValues = z.output<typeof changePasswordSchema>;

/** Maps a Supabase Auth error on password change to an actionable message. */
export function changePasswordErrorMessage(error: { code?: string }) {
  if (error.code === "invalid_credentials") return "Kata sandi saat ini salah. Periksa lalu coba lagi.";
  if (error.code === "weak_password") return "Kata sandi baru terlalu lemah. Gunakan campuran huruf dan angka.";
  if (error.code === "same_password") return "Kata sandi baru harus berbeda dari yang sekarang.";
  return "Kata sandi gagal diganti. Coba lagi, atau hubungi admin jika terus terjadi.";
}
