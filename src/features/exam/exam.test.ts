import { describe, expect, it } from "vitest";
import {
  vitalItems,
  amendmentSchema,
  bodyMassIndex,
  examErrorMessage,
  parseIcd10Search,
  referralLetterSchema,
  restUntil,
  sickLetterSchema,
  soapSchema,
  vitalsSchema,
} from "./exam.lib";

const blankVitals = {
  systolic: "",
  diastolic: "",
  pulse: "",
  temperature: "",
  respiratory_rate: "",
  spo2: "",
  weight: "",
  height: "",
};

describe("vitalsSchema", () => {
  it("parses numbers, accepts a decimal comma and keeps blanks as null", () => {
    expect(vitalsSchema.parse({ ...blankVitals, systolic: "120", diastolic: "80", temperature: "36,7" })).toEqual({
      systolic: 120,
      diastolic: 80,
      pulse: null,
      temperature: 36.7,
      respiratory_rate: null,
      spo2: null,
      weight: null,
      height: null,
    });
  });

  it("requires at least one measurement", () => {
    expect(vitalsSchema.safeParse(blankVitals).error?.issues[0]?.message).toBe("Isi minimal satu tanda vital.");
  });

  it("requires both blood pressure values", () => {
    const result = vitalsSchema.safeParse({ ...blankVitals, systolic: "120" });
    expect(result.error?.issues[0]?.message).toBe("Tekanan darah perlu sistolik dan diastolik.");
  });

  it("checks ranges and whole numbers", () => {
    expect(vitalsSchema.safeParse({ ...blankVitals, spo2: "101" }).error?.issues[0]?.message).toBe(
      "SpO2 harus antara 50 dan 100.",
    );
    expect(vitalsSchema.safeParse({ ...blankVitals, pulse: "80.5" }).error?.issues[0]?.message).toBe(
      "Nadi harus bilangan bulat.",
    );
  });

  it("accepts its own output, so the action can re-check parsed values", () => {
    const parsed = vitalsSchema.parse({ ...blankVitals, weight: "60.5" });
    expect(vitalsSchema.parse(parsed)).toEqual(parsed);
  });
});

describe("soapSchema and amendmentSchema", () => {
  it("trims and turns blanks into null", () => {
    expect(soapSchema.parse({ subjective: " batuk ", objective: "", assessment: null, plan: undefined })).toEqual({
      subjective: "batuk",
      objective: null,
      assessment: null,
      plan: null,
    });
  });

  it("requires some text in an amendment", () => {
    expect(amendmentSchema.safeParse({ subjective: " ", objective: "", assessment: "", plan: "" }).success).toBe(false);
  });
});

describe("bodyMassIndex", () => {
  it("computes BMI to one decimal", () => {
    expect(bodyMassIndex(70, 175)).toBe(22.9);
    expect(bodyMassIndex(70, null)).toBeNull();
  });
});

describe("parseIcd10Search", () => {
  it("treats a letter followed by a digit as a code prefix", () => {
    expect(parseIcd10Search("j06")).toEqual({ kind: "code", code: "J06" });
  });

  it("searches names otherwise and strips filter syntax", () => {
    expect(parseIcd10Search("demam (berdarah)")).toEqual({ kind: "name", text: "demam  berdarah" });
    expect(parseIcd10Search("a")).toBeNull();
  });
});

describe("examErrorMessage", () => {
  it("maps guard keys", () => {
    expect(examErrorMessage({ code: "P0001", message: "record_locked" })).toMatch(/amandemen/);
    expect(examErrorMessage({ code: "23505" })).toBe("Diagnosis ini sudah dipilih.");
  });
});

describe("letters", () => {
  it("validates a sick letter from today", () => {
    const schema = sickLetterSchema("2026-11-12");
    expect(schema.parse({ rest_from: "2026-11-12", rest_days: "3", show_diagnosis: false })).toEqual({
      rest_from: "2026-11-12",
      rest_days: 3,
      show_diagnosis: false,
    });
    expect(schema.safeParse({ rest_from: "2026-11-11", rest_days: "1", show_diagnosis: false }).error?.issues[0]?.message).toMatch(
      /sebelum hari ini/,
    );
    expect(schema.safeParse({ rest_from: "2026-11-12", rest_days: "31", show_diagnosis: false }).error?.issues[0]?.message).toBe(
      "Maksimal 30 hari.",
    );
  });

  it("computes the last day of rest", () => {
    expect(restUntil("2026-11-30", 3)).toBe("2026-12-02");
    expect(restUntil("2026-11-12", 1)).toBe("2026-11-12");
  });

  it("requires destination and reason for a referral", () => {
    const messages = referralLetterSchema
      .safeParse({ destination: "", specialty: "", reason: "", clinical_summary: "", therapy: "" })
      .error?.issues.map((issue) => issue.message);
    expect(messages).toEqual(expect.arrayContaining(["Faskes tujuan wajib diisi.", "Alasan rujukan wajib diisi."]));
  });
});

describe("vitalItems", () => {
  const blank = {
    systolic: null,
    diastolic: null,
    pulse: null,
    temperature: null,
    respiratory_rate: null,
    spo2: null,
    weight: null,
    height: null,
  };

  it("flags readings outside adult reference ranges", () => {
    const items = vitalItems({ ...blank, systolic: 150, diastolic: 95, pulse: 72, temperature: 38.2, spo2: 93 });
    const flag = (key: string) => items.find((item) => item.key === key)?.flag;
    expect(flag("bp")).toBe("high");
    expect(flag("pulse")).toBeNull();
    expect(flag("temp")).toBe("high");
    expect(items.find((item) => item.key === "temp")?.value).toBe("38,2");
    expect(flag("spo2")).toBe("low");
  });

  it("skips missing values and derives BMI", () => {
    const items = vitalItems({ ...blank, weight: 70, height: 170 });
    expect(items.map((item) => item.key)).toEqual(["weight", "height", "bmi"]);
    expect(items[2]).toMatchObject({ value: "24,2", flag: null });
  });
});
