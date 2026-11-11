import { describe, expect, it } from "vitest";
import { signInSchema } from "./auth.lib";

describe("signInSchema", () => {
  it("trims and lowercases the email", () => {
    const result = signInSchema.parse({ email: "  Dokter@Klinik.Test ", password: "secret" });
    expect(result.email).toBe("dokter@klinik.test");
  });

  it("requires both fields with Indonesian messages", () => {
    const result = signInSchema.safeParse({ email: "", password: "" });
    expect(result.success).toBe(false);
    const messages = result.error?.issues.map((issue) => issue.message);
    expect(messages).toContain("Email wajib diisi.");
    expect(messages).toContain("Kata sandi wajib diisi.");
  });

  it("rejects an invalid email", () => {
    const result = signInSchema.safeParse({ email: "bukan-email", password: "x" });
    expect(result.error?.issues[0]?.message).toMatch(/Format email tidak valid/);
  });
});
