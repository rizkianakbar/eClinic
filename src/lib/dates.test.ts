import { describe, expect, it } from "vitest";
import { addMonths, formatDate, formatDateTime, formatTime, isoWeekday, toJakartaDate, addDays, daysBetween, relativeDay } from "./dates";

describe("toJakartaDate", () => {
  it("uses the Jakarta calendar day, not UTC", () => {
    // 2026-11-11 18:30 UTC is 2026-11-12 01:30 in Jakarta (UTC+7).
    expect(toJakartaDate(new Date("2026-11-11T18:30:00Z"))).toBe("2026-11-12");
    // 2026-11-12 16:59 UTC is still 23:59 on the 12th in Jakarta.
    expect(toJakartaDate(new Date("2026-11-12T16:59:00Z"))).toBe("2026-11-12");
  });
});

describe("formatDate", () => {
  it("formats in Indonesian", () => {
    expect(formatDate("2026-11-11T18:30:00Z")).toBe("12 November 2026");
  });
});

describe("formatDateTime", () => {
  it("shows Jakarta local time", () => {
    expect(formatDateTime("2026-11-12T02:30:00Z")).toBe("12 Nov 2026, 09.30");
  });
});

describe("isoWeekday", () => {
  it("numbers Monday 1 through Sunday 7", () => {
    expect(isoWeekday("2026-11-09")).toBe(1);
    expect(isoWeekday("2026-11-12")).toBe(4);
    expect(isoWeekday("2026-11-15")).toBe(7);
  });
});

describe("formatTime", () => {
  it("shows Jakarta clock time", () => {
    expect(formatTime("2026-11-12T02:30:00Z")).toBe("09.30");
  });
});

describe("addMonths", () => {
  it("adds calendar months and clamps to the month end", () => {
    expect(addMonths("2026-11-12", 3)).toBe("2027-02-12");
    expect(addMonths("2026-11-30", 3)).toBe("2027-02-28");
    expect(addMonths("2028-01-31", 1)).toBe("2028-02-29");
  });
});

describe("addDays", () => {
  it("crosses month and year boundaries", () => {
    expect(addDays("2026-11-12", -13)).toBe("2026-10-30");
    expect(addDays("2026-12-31", 1)).toBe("2027-01-01");
  });
});

describe("relativeDay", () => {
  it("speaks in days, weeks, months, years", () => {
    expect(daysBetween("2026-11-01", "2026-11-12")).toBe(11);
    expect(relativeDay("2026-11-12", "2026-11-12")).toBe("Hari ini");
    expect(relativeDay("2026-11-11", "2026-11-12")).toBe("Kemarin");
    expect(relativeDay("2026-11-07", "2026-11-12")).toBe("5 hari lalu");
    expect(relativeDay("2026-10-22", "2026-11-12")).toBe("3 minggu lalu");
    expect(relativeDay("2026-08-12", "2026-11-12")).toBe("3 bulan lalu");
    expect(relativeDay("2024-11-12", "2026-11-12")).toBe("2 tahun lalu");
  });
});
