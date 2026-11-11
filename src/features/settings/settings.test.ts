import { describe, expect, it } from "vitest";
import {
  assignableRoles,
  masterDataErrorMessage,
  poliSchema,
  staffAuthErrorMessage,
  staffCreateSchema,
  staffSchema,
} from "./settings.lib";

describe("staffCreateSchema", () => {
  const valid = {
    full_name: " dr. Budi Santoso ",
    email: " Dokter@Klinik.COM ",
    password: "rahasia123",
    role: "doctor" as const,
    nik: "",
    sip_number: " 503/SIP/2026 ",
  };

  it("trims, lowercases the email and turns blanks into null", () => {
    expect(staffCreateSchema.parse(valid)).toEqual({
      full_name: "dr. Budi Santoso",
      email: "dokter@klinik.com",
      password: "rahasia123",
      role: "doctor",
      nik: null,
      sip_number: "503/SIP/2026",
    });
  });

  it("requires a password of at least 8 characters", () => {
    const result = staffCreateSchema.safeParse({ ...valid, password: "1234567" });
    expect(result.error?.issues[0]?.message).toBe("Kata sandi minimal 8 karakter.");
  });

  it("rejects an unknown role", () => {
    const result = staffCreateSchema.safeParse({ ...valid, role: "" });
    expect(result.error?.issues[0]?.message).toBe("Pilih peran.");
  });

  it("rejects a NIK that is not 16 digits", () => {
    const result = staffSchema.safeParse({ ...valid, nik: "123" });
    expect(result.error?.issues[0]?.message).toBe("NIK harus 16 digit angka.");
  });

  it("accepts its own output, so the action can re-check parsed form values", () => {
    const parsed = staffSchema.parse(valid);
    expect(staffSchema.parse(parsed)).toEqual(parsed);
  });
});

describe("assignableRoles", () => {
  it("lets only an owner assign the owner role", () => {
    expect(assignableRoles("owner")).toContain("owner");
    expect(assignableRoles("admin")).not.toContain("owner");
    expect(assignableRoles("admin")).toContain("doctor");
  });
});

describe("poliSchema", () => {
  it("requires a name and makes the BPJS code optional", () => {
    expect(poliSchema.parse({ name: " Poli Umum ", bpjs_poli_code: "" })).toEqual({
      name: "Poli Umum",
      bpjs_poli_code: null,
    });
    expect(poliSchema.safeParse({ name: "", bpjs_poli_code: "" }).error?.issues[0]?.message).toBe(
      "Nama poli wajib diisi.",
    );
  });
});

describe("error messages", () => {
  it("explains a duplicate email", () => {
    expect(staffAuthErrorMessage({ code: "email_exists" })).toMatch(/sudah dipakai/);
  });

  it("uses the caller's duplicate message for unique violations", () => {
    expect(masterDataErrorMessage({ code: "23505" }, "Nama poli ini sudah ada.")).toBe("Nama poli ini sudah ada.");
    expect(masterDataErrorMessage({ code: "42501" }, "")).toMatch(/tidak punya akses/);
  });
});
