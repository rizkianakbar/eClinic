import { describe, expect, it } from "vitest";
import {
  createVisitSchema,
  firstOpenSession,
  sessionEnded,
  journeyCounts,
  journeyIndex,
  visitErrorMessage,
  type PracticeSession,
} from "./visits.lib";

const session = (id: string, taken: number, quota = 2, endTime = "12:00:00"): PracticeSession => ({
  id,
  poliName: "Poli Umum",
  doctorName: "dr. Budi",
  startTime: "08:00:00",
  endTime,
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

  it("prefers a session that has not ended yet", () => {
    const sessions = [session("morning", 0, 2, "12:00:00"), session("evening", 0, 2, "21:00:00")];
    expect(firstOpenSession(sessions, "15:30")?.id).toBe("evening");
    expect(firstOpenSession(sessions, "09:00")?.id).toBe("morning");
    expect(firstOpenSession(sessions, "22:00")?.id).toBe("morning");
  });
});

describe("sessionEnded", () => {
  it("compares the end time with now", () => {
    expect(sessionEnded({ endTime: "12:00:00" }, "12:00")).toBe(true);
    expect(sessionEnded({ endTime: "12:00:00" }, "11:59")).toBe(false);
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

describe("journeyCounts", () => {
  it("counts per station, registered as waiting, cancelled ignored", () => {
    expect(
      journeyCounts([
        { status: "registered" },
        { status: "waiting" },
        { status: "in_exam" },
        { status: "done" },
        { status: "cancelled" },
      ]),
    ).toEqual({ waiting: 2, in_exam: 1, to_pharmacy: 0, to_cashier: 0, done: 1 });
  });
});

describe("journeyIndex", () => {
  it("places a visit on the line, registered as waiting", () => {
    expect(journeyIndex("registered")).toBe(0);
    expect(journeyIndex("in_exam")).toBe(1);
    expect(journeyIndex("done")).toBe(4);
    expect(journeyIndex("cancelled")).toBe(-1);
  });
});
