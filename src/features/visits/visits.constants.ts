import type { Database } from "@/lib/supabase/database.types";

export const VISIT_STATUS_LABELS: Record<Database["public"]["Enums"]["visit_status"], string> = {
  registered: "Terdaftar",
  waiting: "Menunggu",
  in_exam: "Diperiksa",
  to_pharmacy: "Di farmasi",
  to_cashier: "Di kasir",
  done: "Selesai",
  cancelled: "Batal",
};

export const PAYER_LABELS = {
  umum: "Umum",
  bpjs: "BPJS",
} as const;
