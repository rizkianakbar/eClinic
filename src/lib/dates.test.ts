import { describe, expect, it } from "vitest";
import { formatDate, formatDateTime, isoWeekday, toJakartaDate } from "./dates";

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
