import { describe, expect, it } from "vitest";
import {
  cashSuggestions,
  groupInvoiceItems,
  billingErrorMessage,
  discountSchema,
  doctorFeeAmount,
  packageItemsSchema,
  paymentSchema,
  serviceSchema,
  voidSchema,
} from "./billing.lib";

const base = { name: " Konsultasi umum ", type: "consultation", price: "Rp 50.000" };

describe("serviceSchema", () => {
  it("parses the tariff and a percentage fee", () => {
    expect(serviceSchema.parse({ ...base, doctor_fee_type: "percent", doctor_fee_value: "40" })).toEqual({
      name: "Konsultasi umum",
      type: "consultation",
      price: 50000,
      doctor_fee_type: "percent",
      doctor_fee_value: 40,
    });
  });

  it("clears the value when there is no fee", () => {
    expect(serviceSchema.parse({ ...base, doctor_fee_type: "none", doctor_fee_value: "999" }).doctor_fee_value).toBe(0);
  });

  it("rejects a fixed fee above the tariff and a percentage over 100", () => {
    expect(
      serviceSchema.safeParse({ ...base, doctor_fee_type: "fixed", doctor_fee_value: "60.000" }).error?.issues[0]?.message,
    ).toBe("Jasa dokter tidak boleh melebihi tarif.");
    expect(
      serviceSchema.safeParse({ ...base, doctor_fee_type: "percent", doctor_fee_value: "101" }).error?.issues[0]?.message,
    ).toBe("Persentase jasa dokter harus 0 sampai 100.");
  });

  it("accepts its own output, so the action can re-check parsed values", () => {
    const parsed = serviceSchema.parse({ ...base, doctor_fee_type: "fixed", doctor_fee_value: "20000" });
    expect(serviceSchema.parse(parsed)).toEqual(parsed);
  });
});

describe("doctorFeeAmount", () => {
  it("applies the rule in integer rupiah", () => {
    expect(doctorFeeAmount({ price: 50000, doctor_fee_type: "percent", doctor_fee_value: 40 })).toBe(20000);
    expect(doctorFeeAmount({ price: 33333, doctor_fee_type: "percent", doctor_fee_value: 10 })).toBe(3333);
    expect(doctorFeeAmount({ price: 150000, doctor_fee_type: "fixed", doctor_fee_value: 50000 })).toBe(50000);
    expect(doctorFeeAmount({ price: 150000, doctor_fee_type: "none", doctor_fee_value: 0 })).toBe(0);
  });
});

describe("discountSchema", () => {
  it("requires a reason for a non-zero discount", () => {
    expect(discountSchema.parse({ amount: "Rp 5.000", reason: " Pembulatan " })).toEqual({ amount: 5000, reason: "Pembulatan" });
    expect(discountSchema.safeParse({ amount: "5000", reason: "" }).error?.issues[0]?.message).toBe(
      "Alasan diskon wajib diisi.",
    );
    expect(discountSchema.parse({ amount: "0", reason: "" })).toEqual({ amount: 0, reason: "" });
  });
});

describe("paymentSchema", () => {
  const schema = paymentSchema(150000);

  it("accepts enough cash and clears cash for other methods", () => {
    expect(schema.parse({ method: "cash", cash_received: "Rp 200.000", reference: "" })).toEqual({
      method: "cash",
      cash_received: 200000,
      reference: null,
    });
    expect(schema.parse({ method: "qris", cash_received: "999", reference: " QR-1 " })).toEqual({
      method: "qris",
      cash_received: null,
      reference: "QR-1",
    });
  });

  it("refuses cash below the total", () => {
    expect(schema.safeParse({ method: "cash", cash_received: "100000", reference: "" }).error?.issues[0]?.message).toBe(
      "Uang diterima kurang dari total tagihan.",
    );
  });
});

describe("billingErrorMessage", () => {
  it("explains why a system line cannot be removed", () => {
    expect(billingErrorMessage({ code: "P0001", message: "item_not_removable" })).toMatch(/diskon dengan alasan/);
  });
});

describe("packageItemsSchema", () => {
  const LAB = "6f1c1a52-1f7e-4c55-9d0a-0b8f6f3e2a11";

  it("needs at least one service and no duplicates", () => {
    expect(packageItemsSchema.parse({ items: [{ service_id: LAB, qty: "2" }] })).toEqual({
      items: [{ service_id: LAB, qty: 2 }],
    });
    expect(packageItemsSchema.safeParse({ items: [] }).error?.issues[0]?.message).toBe(
      "Tambahkan minimal satu layanan ke paket.",
    );
    expect(
      packageItemsSchema.safeParse({ items: [{ service_id: LAB, qty: 1 }, { service_id: LAB, qty: 1 }] }).error?.issues[0]
        ?.message,
    ).toBe("Layanan tidak boleh dobel.");
  });
});

describe("voidSchema", () => {
  it("requires a reason", () => {
    expect(voidSchema.safeParse({ reason: " " }).error?.issues[0]?.message).toBe("Alasan pembatalan wajib diisi.");
  });
});

describe("cashSuggestions", () => {
  it("offers exact money, then common notes", () => {
    expect(cashSuggestions(87_500)).toEqual([87_500, 90_000, 100_000]);
    expect(cashSuggestions(123_000)).toEqual([123_000, 125_000, 130_000, 150_000]);
    expect(cashSuggestions(100_000)).toEqual([100_000]);
    expect(cashSuggestions(0)).toEqual([]);
  });
});

describe("groupInvoiceItems", () => {
  it("groups lines by visit stage and totals each section", () => {
    const groups = groupInvoiceItems([
      { item_type: "medicine", amount: 8_000 },
      { item_type: "consultation", amount: 75_000 },
      { item_type: "procedure", amount: 200_000 },
      { item_type: "service", amount: 10_000 },
    ]);
    expect(groups.map((group) => [group.key, group.items.length, group.total])).toEqual([
      ["exam", 2, 275_000],
      ["medicine", 1, 8_000],
      ["service", 1, 10_000],
    ]);
  });
});
