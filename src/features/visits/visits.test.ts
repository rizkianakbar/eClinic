import { describe, expect, it } from "vitest";
import { createVisitSchema, firstOpenSession, visitErrorMessage, type PracticeSession } from "./visits.lib";

const session = (id: string, taken: number, quota = 2): PracticeSession => ({
  id,
  poliName: "Poli Umum",
  doctorName: "dr. Budi",
  startTime: "08:00:00",
  endTime: "12:00:00",
  quota,
  taken,
});

describe("createVisitSchema", () => {
  it("requires a schedule and a known payer", () => {
    const result = createVisitSchema.safeParse({
      patient_id: "6f1c1a52-1f7e-4c55-9d0a-0b8f6f3e2a11",
      schedule_id: "",
      payer_type: "asuransi",
    });
    const messages = result.error?.issues.map((issue) => issue.message);
    expect(messages).toEqual(expect.arrayContaining(["Pilih jadwal dokter.", "Pilih jenis pembayaran."]));
  });
});

describe("firstOpenSession", () => {
  it("skips full sessions", () => {
    expect(firstOpenSession([session("a", 2), session("b", 1)])?.id).toBe("b");
    expect(firstOpenSession([session("a", 2)])).toBeUndefined();
  });
});

describe("visitErrorMessage", () => {
  it("maps database rule keys to actionable messages", () => {
    expect(visitErrorMessage({ code: "P0001", message: "quota_full" })).toMatch(/Kuota dokter/);
    expect(visitErrorMessage({ code: "P0001", message: "bpjs_number_missing" })).toMatch(/nomor BPJS/);
  });

  it("explains a same-day duplicate", () => {
    expect(visitErrorMessage({ code: "23505" })).toMatch(/sudah terdaftar di poli ini hari ini/);
  });

  it("falls back for unknown errors", () => {
    expect(visitErrorMessage({ code: "P0001", message: "something_else" })).toMatch(/gagal didaftarkan/);
  });
});
