import { describe, expect, it } from "vitest";
import { formatRupiah, parseRupiah } from "./money";

describe("formatRupiah", () => {
  it("formats with Indonesian thousand separators and no decimals", () => {
    expect(formatRupiah(150000)).toBe("Rp 150.000");
    expect(formatRupiah(0)).toBe("Rp 0");
    expect(formatRupiah(1250000000)).toBe("Rp 1.250.000.000");
  });

  it("formats negative amounts", () => {
    expect(formatRupiah(-5000)).toBe("-Rp 5.000");
  });

  it("rejects non-integers", () => {
    expect(() => formatRupiah(1.5)).toThrow(RangeError);
  });
});

describe("parseRupiah", () => {
  it("parses formatted and plain input", () => {
    expect(parseRupiah("Rp 150.000")).toBe(150000);
    expect(parseRupiah("150000")).toBe(150000);
    expect(parseRupiah("-5.000")).toBe(-5000);
  });

  it("returns null for empty or invalid input", () => {
    expect(parseRupiah("")).toBeNull();
    expect(parseRupiah("abc")).toBeNull();
  });
});
