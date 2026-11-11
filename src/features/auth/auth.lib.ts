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
