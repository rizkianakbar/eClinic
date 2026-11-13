import { z } from "zod";
import { addMonths } from "@/lib/dates";
import { rupiahField } from "@/lib/money";

const optionalText = (max: number, message: string) =>
  z
    .string()
    .nullish()
    .transform((value) => (value ?? "").trim())
    .refine((value) => value.length <= max, message)
    .transform((value) => value || null);

/** Suggestions for the unit field; any short text is allowed. */
export const MEDICINE_UNITS = [
  "tablet",
  "kaplet",
  "kapsul",
  "botol",
  "sachet",
  "tube",
  "ampul",
  "vial",
  "strip",
  "ml",
  "pcs",
] as const;

export const medicineSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Nama obat wajib diisi.")
    .max(200, "Nama obat terlalu panjang, maksimal 200 karakter."),
  unit: z
    .string()
    .trim()
    .toLowerCase()
    .min(1, "Satuan wajib diisi, contoh: tablet.")
    .max(30, "Satuan terlalu panjang, maksimal 30 karakter."),
  price: rupiahField("Harga jual"),
  kfa_code: z
    .string()
    .nullish()
    .transform((value) => (value ?? "").trim())
    .refine((value) => value === "" || /^[0-9A-Za-z]{1,20}$/.test(value), "Kode KFA hanya huruf/angka, maksimal 20.")
    .transform((value) => value || null),
  min_stock: z.coerce
    .number<string | number>({ error: "Stok minimum wajib diisi angka." })
    .int("Stok minimum harus bilangan bulat.")
    .min(0, "Stok minimum tidak boleh negatif."),
});

export type MedicineInput = z.input<typeof medicineSchema>;
export type MedicineValues = z.output<typeof medicineSchema>;

export const supplierSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Nama supplier wajib diisi.")
    .max(200, "Nama supplier terlalu panjang, maksimal 200 karakter."),
  phone: optionalText(30, "Nomor telepon terlalu panjang."),
  address: optionalText(500, "Alamat terlalu panjang, maksimal 500 karakter."),
});

export type SupplierInput = z.input<typeof supplierSchema>;
export type SupplierValues = z.output<typeof supplierSchema>;

export const MEDICINES_PAGE_SIZE = 25;

/** Page number from the URL, 1-based and never below 1. */
export function parsePage(value: string | string[] | undefined) {
  const page = Number(Array.isArray(value) ? value[0] : value);
  return Number.isInteger(page) && page > 1 ? page : 1;
}

// Stock --------------------------------------------------------------------------

/** Batches expiring within this many months are flagged (clinic decision). */
export const NEAR_EXPIRY_MONTHS = 3;

/** Last expiry date (inclusive) that counts as near expiry, from a Jakarta "today". */
export function nearExpiryCutoff(today: string) {
  return addMonths(today, NEAR_EXPIRY_MONTHS);
}

export type StockLevel = "empty" | "low" | "ok";

export function stockLevel(stock: { qty_on_hand: number; min_stock: number }): StockLevel {
  if (stock.qty_on_hand <= 0) return "empty";
  return stock.qty_on_hand <= stock.min_stock ? "low" : "ok";
}

export const STOCK_FILTERS = ["all", "low", "expiring"] as const;
export type StockFilter = (typeof STOCK_FILTERS)[number];

export function parseStockFilter(value: string | string[] | undefined): StockFilter {
  const filter = Array.isArray(value) ? value[0] : value;
  return STOCK_FILTERS.includes(filter as StockFilter) ? (filter as StockFilter) : "all";
}

// Purchases ----------------------------------------------------------------------

const pickedMedicine = z
  .object({ id: z.uuid(), name: z.string(), unit: z.string() })
  .nullable()
  .refine((medicine) => medicine !== null, "Pilih obat.");

/** Purchase form; output is the payload for receive_purchase(). Dates are checked against Jakarta "today". */
export function purchaseFormSchema(today: string) {
  return z.object({
    supplier_id: z.uuid("Pilih supplier."),
    invoice_no: optionalText(50, "Nomor faktur maksimal 50 karakter."),
    purchase_date: z
      .string()
      .min(1, "Tanggal pembelian wajib diisi.")
      .pipe(z.iso.date("Tanggal pembelian tidak valid."))
      .refine((value) => value <= today, "Tanggal pembelian tidak boleh di masa depan."),
    note: optionalText(500, "Catatan maksimal 500 karakter."),
    items: z
      .array(
        z.object({
          medicine: pickedMedicine,
          batch_no: z.string().trim().min(1, "No. batch wajib diisi.").max(50, "No. batch maksimal 50 karakter."),
          expiry_date: z
            .string()
            .min(1, "Tanggal kedaluwarsa wajib diisi.")
            .pipe(z.iso.date("Tanggal kedaluwarsa tidak valid."))
            .refine((value) => value > today, "Obat sudah kedaluwarsa. Jangan terima batch ini."),
          qty: z.coerce
            .number<string | number>({ error: "Jumlah wajib diisi angka." })
            .int("Jumlah harus bilangan bulat.")
            .min(1, "Jumlah minimal 1.")
            .max(100000, "Jumlah terlalu besar."),
          unit_cost: rupiahField("Harga beli"),
        }),
      )
      .min(1, "Tambahkan minimal satu obat.")
      .max(100, "Maksimal 100 baris per pembelian."),
  });
}

export type PurchaseFormInput = z.input<ReturnType<typeof purchaseFormSchema>>;
export type PurchaseFormValues = z.output<ReturnType<typeof purchaseFormSchema>>;

/** Payload for receive_purchase(): medicine objects become ids. */
export function toPurchasePayload(values: PurchaseFormValues) {
  return {
    supplier_id: values.supplier_id,
    invoice_no: values.invoice_no,
    purchase_date: values.purchase_date,
    note: values.note,
    items: values.items.map(({ medicine, ...item }) => ({ ...item, medicine_id: medicine!.id })),
  };
}

export type PurchasePayload = ReturnType<typeof toPurchasePayload>;

export function purchaseTotal(items: readonly { qty: number; unit_cost: number }[]) {
  return items.reduce((total, item) => total + item.qty * item.unit_cost, 0);
}

// Stock opname -------------------------------------------------------------------

/** One row per batch; rows left blank are not part of the opname. */
export const opnameFormSchema = z
  .object({
    note: optionalText(500, "Catatan maksimal 500 karakter."),
    rows: z.array(
      z.object({
        batch_id: z.uuid(),
        system_qty: z.number().int(),
        counted: z.string().trim(),
        reason: z.string().trim().max(200, "Alasan maksimal 200 karakter."),
      }),
    ),
  })
  .superRefine((value, context) => {
    let counted = 0;
    value.rows.forEach((row, index) => {
      if (row.counted === "") return;
      counted += 1;
      if (!/^\d+$/.test(row.counted)) {
        context.addIssue({ code: "custom", message: "Isi jumlah dengan bilangan bulat.", path: ["rows", index, "counted"] });
      } else if (Number(row.counted) !== row.system_qty && row.reason === "") {
        context.addIssue({ code: "custom", message: "Isi alasan selisih.", path: ["rows", index, "reason"] });
      }
    });
    if (counted === 0) context.addIssue({ code: "custom", message: "Isi jumlah fisik minimal satu batch.", path: ["rows"] });
  })
  .transform((value) => ({
    note: value.note,
    items: value.rows
      .filter((row) => row.counted !== "")
      .map((row) => ({ batch_id: row.batch_id, counted_qty: Number(row.counted), reason: row.reason || null })),
  }));

export type OpnameFormInput = z.input<typeof opnameFormSchema>;
export type OpnameValues = z.output<typeof opnameFormSchema>;

/** What the action receives (the form's output), re-validated on the server. */
export const opnamePayloadSchema = z.object({
  note: z.string().max(500).nullable(),
  items: z
    .array(z.object({ batch_id: z.uuid(), counted_qty: z.number().int().min(0), reason: z.string().max(200).nullable() }))
    .min(1, "Isi jumlah fisik minimal satu batch.")
    .max(2000),
});

const STOCK_ERRORS: Record<string, string> = {
  not_allowed: "Anda tidak punya akses untuk mengubah stok.",
  supplier_inactive: "Supplier tidak aktif. Pilih supplier lain atau aktifkan di Pengaturan.",
  purchase_date_invalid: "Tanggal pembelian tidak boleh di masa depan.",
  items_invalid: "Ada baris pembelian yang belum lengkap. Periksa jumlah, harga, dan no. batch.",
  medicine_inactive: "Ada obat yang tidak aktif. Hapus barisnya atau aktifkan obat di Pengaturan.",
  expiry_past: "Ada batch yang sudah kedaluwarsa. Jangan terima batch tersebut.",
};

export function stockErrorMessage(error: { code?: string; message?: string }) {
  if (error.code === "P0001" && error.message && STOCK_ERRORS[error.message]) return STOCK_ERRORS[error.message];
  return "Data stok gagal disimpan; stok tidak berubah. Coba lagi, atau hubungi admin jika terus terjadi.";
}
