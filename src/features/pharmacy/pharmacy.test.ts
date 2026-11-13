import { describe, expect, it } from "vitest";
import { buildDrugLabels, dispenseSchema, pharmacyErrorMessage, planFefo, shortItems, toDispenseLines } from "./pharmacy.lib";

const ITEM_A = "6f1c1a52-1f7e-4c55-9d0a-0b8f6f3e2a11";
const ITEM_B = "0c6a3f2e-7d4b-4c1e-8a59-3b2d1e0f9c77";

describe("shortItems", () => {
  it("allocates stock in prescription order across items of the same medicine", () => {
    const items = [
      { id: "a", medicineId: "A", qty: 10 },
      { id: "b1", medicineId: "B", qty: 5 },
      { id: "b2", medicineId: "B", qty: 1 },
    ];
    expect([...shortItems(items, new Map([["A", 25], ["B", 2]]))]).toEqual(["b1"]);
    expect([...shortItems(items, new Map([["A", 25], ["B", 6]]))]).toEqual([]);
    expect([...shortItems(items, new Map())]).toEqual(["a", "b1", "b2"]);
  });
});

describe("dispenseSchema", () => {
  it("returns only the not-given items, with trimmed reasons", () => {
    expect(
      dispenseSchema.parse({
        items: [
          { prescription_item_id: ITEM_A, not_given: false, reason: "" },
          { prescription_item_id: ITEM_B, not_given: true, reason: " beli di luar " },
        ],
      }),
    ).toEqual({ not_given: [{ prescription_item_id: ITEM_B, reason: "beli di luar" }] });
  });

  it("requires a reason for each not-given item", () => {
    const result = dispenseSchema.safeParse({ items: [{ prescription_item_id: ITEM_A, not_given: true, reason: " " }] });
    expect(result.error?.issues[0]).toMatchObject({ message: "Isi alasan obat tidak diberikan.", path: ["items", 0, "reason"] });
  });
});

describe("pharmacyErrorMessage", () => {
  it("names the medicine that is short", () => {
    expect(pharmacyErrorMessage({ code: "P0001", message: "insufficient_stock", details: "Amoxicillin 500 mg" })).toMatch(
      /Stok Amoxicillin 500 mg tidak cukup/,
    );
  });
});

describe("buildDrugLabels", () => {
  const prescription = {
    items: [
      { id: "a", qty: 10, signa: "3 x 1 sesudah makan", medicine: { name: "Paracetamol 500 mg", unit: "tablet" } },
      { id: "b", qty: 5, signa: "1 x 1", medicine: { name: "Cetirizine", unit: "tablet" } },
    ],
    compounds: [{ form: "puyer", quantity: 10, signa: "3 x 1 puyer", ingredients: [{ id: "c1" }, { id: "c2" }] }],
  };

  it("labels given items and racikan, skipping what was not given", () => {
    expect(buildDrugLabels(prescription, new Set(["a", "c2"]))).toEqual([
      { title: "Paracetamol 500 mg", amount: "10 tablet", signa: "3 x 1 sesudah makan" },
      { title: "Racikan puyer", amount: "10 puyer", signa: "3 x 1 puyer" },
    ]);
  });
});

describe("toDispenseLines", () => {
  const med = (id: string) => ({ id, name: `Obat ${id}`, unit: "tablet" });
  const prescription = {
    items: [{ id: "regular", qty: 5, signa: "1 x 1", created_at: "2026-11-12T02:00:00Z", medicine: med("B") }],
    compounds: [
      {
        id: "c",
        form: "puyer",
        quantity: 10,
        signa: "3 x 1",
        // Added before the regular item, so the database dispenses it first.
        ingredients: [{ id: "ingredient", qty: 1, signa: null, created_at: "2026-11-12T01:00:00Z", medicine: med("B") }],
      },
    ],
  };

  it("flags shortage in the database's dispensing order", () => {
    const lines = toDispenseLines(prescription, new Map([["B", 2]]));
    expect(lines.map((line) => [line.id, line.short])).toEqual([
      ["regular", true],
      ["ingredient", false],
    ]);
    expect(lines[1].group).toBe("Racikan puyer · 10 puyer · 3 x 1");
  });
});

describe("planFefo", () => {
  const batch = (id: string, medicine: string, expiry: string, qty: number, created = "2026-01-01T00:00:00Z") => ({
    id,
    medicine_id: medicine,
    batch_no: id.toUpperCase(),
    expiry_date: expiry,
    qty_on_hand: qty,
    created_at: created,
  });

  it("takes the earliest expiry first and spills into the next batch", () => {
    const plan = planFefo(
      [
        { id: "first", medicineId: "A", qty: 8 },
        { id: "second", medicineId: "A", qty: 5 },
      ],
      [batch("late", "A", "2027-06-01", 20), batch("early", "A", "2027-01-01", 10)],
    );
    expect(plan.get("first")).toEqual([{ batchNo: "EARLY", expiry: "2027-01-01", qty: 8 }]);
    expect(plan.get("second")).toEqual([
      { batchNo: "EARLY", expiry: "2027-01-01", qty: 2 },
      { batchNo: "LATE", expiry: "2027-06-01", qty: 3 },
    ]);
  });

  it("leaves a short item without picks and does not consume stock for it", () => {
    const plan = planFefo(
      [
        { id: "big", medicineId: "A", qty: 50 },
        { id: "small", medicineId: "A", qty: 4 },
      ],
      [batch("b1", "A", "2027-01-01", 10)],
    );
    expect(plan.get("big")).toEqual([]);
    expect(plan.get("small")).toEqual([{ batchNo: "B1", expiry: "2027-01-01", qty: 4 }]);
  });

  it("breaks equal expiry by the older batch, like the database", () => {
    const plan = planFefo(
      [{ id: "x", medicineId: "A", qty: 1 }],
      [batch("newer", "A", "2027-01-01", 5, "2026-05-01T00:00:00Z"), batch("older", "A", "2027-01-01", 5, "2026-02-01T00:00:00Z")],
    );
    expect(plan.get("x")?.[0].batchNo).toBe("OLDER");
  });
});
