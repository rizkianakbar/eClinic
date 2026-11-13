import { describe, expect, it } from "vitest";
import {
  medicineSchema,
  nearExpiryCutoff,
  opnameFormSchema,
  parsePage,
  parseStockFilter,
  purchaseFormSchema,
  purchaseTotal,
  stockLevel,
  supplierSchema,
  toPurchasePayload,
} from "./inventory.lib";

describe("medicineSchema", () => {
  it("normalizes the input", () => {
    expect(
      medicineSchema.parse({ name: " Paracetamol 500 mg ", unit: "Tablet", price: "Rp 500", kfa_code: "", min_stock: "100" }),
    ).toEqual({ name: "Paracetamol 500 mg", unit: "tablet", price: 500, kfa_code: null, min_stock: 100 });
  });

  it("requires name, unit and a price", () => {
    const result = medicineSchema.safeParse({ name: "", unit: "", price: "", kfa_code: "", min_stock: "0" });
    const messages = result.error?.issues.map((issue) => issue.message);
    expect(messages).toEqual(
      expect.arrayContaining([
        "Nama obat wajib diisi.",
        "Satuan wajib diisi, contoh: tablet.",
        "Harga jual wajib diisi dengan angka, contoh: 15000.",
      ]),
    );
  });

  it("accepts its own output, so the action can re-check parsed values", () => {
    const parsed = medicineSchema.parse({ name: "A", unit: "ml", price: 1000, kfa_code: "93000123", min_stock: 0 });
    expect(medicineSchema.parse(parsed)).toEqual(parsed);
  });
});

describe("supplierSchema", () => {
  it("turns blanks into null", () => {
    expect(supplierSchema.parse({ name: "PT A", phone: " ", address: "" })).toEqual({
      name: "PT A",
      phone: null,
      address: null,
    });
  });
});

describe("parsePage", () => {
  it("defaults to page 1 for missing or invalid values", () => {
    expect(parsePage(undefined)).toBe(1);
    expect(parsePage("0")).toBe(1);
    expect(parsePage("abc")).toBe(1);
    expect(parsePage("3")).toBe(3);
  });
});

describe("stock helpers", () => {
  it("flags near expiry 3 months ahead", () => {
    expect(nearExpiryCutoff("2026-11-12")).toBe("2027-02-12");
  });

  it("classifies stock levels", () => {
    expect(stockLevel({ qty_on_hand: 0, min_stock: 10 })).toBe("empty");
    expect(stockLevel({ qty_on_hand: 10, min_stock: 10 })).toBe("low");
    expect(stockLevel({ qty_on_hand: 11, min_stock: 10 })).toBe("ok");
  });

  it("parses the stock filter", () => {
    expect(parseStockFilter("low")).toBe("low");
    expect(parseStockFilter("nope")).toBe("all");
  });
});

describe("purchaseFormSchema", () => {
  const schema = purchaseFormSchema("2026-11-12");
  const med = { id: "6f1c1a52-1f7e-4c55-9d0a-0b8f6f3e2a11", name: "Paracetamol", unit: "tablet" };
  const valid = {
    supplier_id: "0c6a3f2e-7d4b-4c1e-8a59-3b2d1e0f9c77",
    invoice_no: " F-001 ",
    purchase_date: "2026-11-12",
    note: "",
    items: [{ medicine: med, batch_no: " A1 ", expiry_date: "2028-01-31", qty: "100", unit_cost: "Rp 200" }],
  };

  it("builds the receive_purchase payload", () => {
    const payload = toPurchasePayload(schema.parse(valid));
    expect(payload).toEqual({
      supplier_id: valid.supplier_id,
      invoice_no: "F-001",
      purchase_date: "2026-11-12",
      note: null,
      items: [{ medicine_id: med.id, batch_no: "A1", expiry_date: "2028-01-31", qty: 100, unit_cost: 200 }],
    });
    expect(purchaseTotal(payload.items)).toBe(20000);
  });

  it("refuses expired batches and future purchase dates", () => {
    const expired = schema.safeParse({ ...valid, items: [{ ...valid.items[0], expiry_date: "2026-11-12" }] });
    expect(expired.error?.issues[0]?.message).toBe("Obat sudah kedaluwarsa. Jangan terima batch ini.");
    const future = schema.safeParse({ ...valid, purchase_date: "2026-11-13" });
    expect(future.error?.issues[0]?.message).toBe("Tanggal pembelian tidak boleh di masa depan.");
  });

  it("requires at least one line", () => {
    expect(schema.safeParse({ ...valid, items: [] }).error?.issues[0]?.message).toBe("Tambahkan minimal satu obat.");
  });
});

describe("opnameFormSchema", () => {
  const B1 = "6f1c1a52-1f7e-4c55-9d0a-0b8f6f3e2a11";
  const B2 = "0c6a3f2e-7d4b-4c1e-8a59-3b2d1e0f9c77";

  it("keeps only counted rows and needs a reason for a difference", () => {
    expect(
      opnameFormSchema.parse({
        note: "",
        rows: [
          { batch_id: B1, system_qty: 50, counted: "48", reason: "Rusak" },
          { batch_id: B2, system_qty: 10, counted: "", reason: "" },
        ],
      }),
    ).toEqual({ note: null, items: [{ batch_id: B1, counted_qty: 48, reason: "Rusak" }] });

    const missing = opnameFormSchema.safeParse({ note: "", rows: [{ batch_id: B1, system_qty: 50, counted: "48", reason: "" }] });
    expect(missing.error?.issues[0]).toMatchObject({ message: "Isi alasan selisih.", path: ["rows", 0, "reason"] });
  });

  it("requires at least one counted batch", () => {
    expect(
      opnameFormSchema.safeParse({ note: "", rows: [{ batch_id: B1, system_qty: 5, counted: "", reason: "" }] }).error?.issues[0]
        ?.message,
    ).toBe("Isi jumlah fisik minimal satu batch.");
  });
});
