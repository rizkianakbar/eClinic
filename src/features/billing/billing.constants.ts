export const SERVICE_TYPE_LABELS = {
  consultation: "Konsultasi",
  procedure: "Tindakan",
  other: "Lainnya",
  package: "Paket",
} as const;

export const DOCTOR_FEE_TYPE_LABELS = {
  none: "Tidak ada",
  fixed: "Nominal tetap",
  percent: "Persentase",
} as const;

export const PAYMENT_METHOD_LABELS = {
  cash: "Tunai",
  qris: "QRIS",
  transfer: "Transfer",
} as const;

export const INVOICE_ITEM_TYPE_LABELS: Record<string, string> = {
  consultation: "Konsultasi",
  procedure: "Tindakan",
  medicine: "Obat",
  consumable: "Bahan habis pakai",
  service: "Layanan",
  package: "Paket",
};

/** Cashier pages: cashier plus management. */
export const CASHIER_ROLES = ["cashier", "admin", "owner"] as const;
