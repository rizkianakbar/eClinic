"use server";

import { redirect } from "next/navigation";
import type { ActionResult } from "@/lib/query";
import { createClient } from "@/lib/supabase/server";
import { signInSchema, type SignInInput } from "./auth.lib";

export async function signIn(input: SignInInput): Promise<ActionResult> {
  const parsed = signInSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Data login tidak valid.",
    };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error) {
    console.log(error);

    return {
      ok: false,
      error: "Email atau kata sandi salah. Periksa kembali lalu coba lagi.",
    };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("is_active")
    .eq("id", data.user.id)
    .maybeSingle();
  if (!profile?.is_active) {
    await supabase.auth.signOut();
    return { ok: false, error: "Akun Anda tidak aktif. Hubungi admin klinik." };
  }

  redirect("/dashboard");
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
